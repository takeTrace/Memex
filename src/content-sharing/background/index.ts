import chunk from 'lodash/chunk'
import fromPairs from 'lodash/fromPairs'
import StorageManager from '@worldbrain/storex'
import {
    AddSharedListEntriesAction,
    ContentSharingInterface,
    ContentSharingEvents,
    ContentSharingAction,
} from './types'
import { ContentSharingStorage, ContentSharingClientStorage } from './storage'
import CustomListStorage from 'src/custom-lists/background/storage'
import { AuthBackground } from 'src/authentication/background'
import { StorageOperationEvent } from '@worldbrain/storex-middleware-change-watcher/lib/types'
import { PageListEntry } from 'src/custom-lists/background/types'
import createResolvable, { Resolvable } from '@josephg/resolvable'
import { normalizeUrl } from '@worldbrain/memex-url-utils'
import { Analytics } from 'src/analytics/types'
import AnnotationStorage from 'src/annotations/background/storage'
import { Annotation } from 'src/annotations/types'
import {
    remoteEventEmitter,
    RemoteEventEmitter,
} from 'src/util/webextensionRPC'

// interface ListPush {
//     actionsPending: number
//     promise: Resolvable<void> | null
// }

export default class ContentSharingBackground {
    remoteEmitter: RemoteEventEmitter<ContentSharingEvents>
    remoteFunctions: ContentSharingInterface
    storage: ContentSharingClientStorage
    shouldProcessSyncChanges = true

    _hasPendingActions = false
    _pendingActionsRetry?: Resolvable<void>
    _executingPendingActions?: Resolvable<{ result: 'success' | 'error' }>
    private readonly ACTION_RETRY_INTERVAL = 1000 * 60 * 5

    // _listPushes: {
    //     [localListId: number]: ListPush
    // } = {}

    constructor(
        private options: {
            storageManager: StorageManager
            customLists: CustomListStorage
            annotationStorage: AnnotationStorage
            auth: AuthBackground
            analytics: Analytics
            getContentSharing: () => Promise<ContentSharingStorage>
        },
    ) {
        this.storage = new ContentSharingClientStorage({
            storageManager: options.storageManager,
        })

        this.remoteEmitter = remoteEventEmitter('contentSharing', {
            broadcastToTabs: true,
        })

        this.remoteFunctions = {
            shareList: this.shareList,
            shareListEntries: this.shareListEntries,
            shareAnnotation: this.shareAnnotation,
            unshareAnnotation: this.unshareAnnotation,
            getRemoteListId: async (options) => {
                return this.storage.getRemoteListId({
                    localId: options.localListId,
                })
            },
            getRemoteAnnotationIds: async (options) => {
                return this.storage.getRemoteAnnotationIds({
                    localIds: options.annotationUrls,
                })
            },
            areListsShared: async (options) => {
                return this.storage.areListsShared({
                    localIds: options.localListIds,
                })
            },
            waitForSync: this.waitForSync,
        }
    }

    async setup() {
        try {
            await this.executePendingActions()
        } catch (e) {
            // Log the error, but don't stop the entire extension setup
            // when we can't reach the sharing back-end
            console.error(e)
        }
    }
    _setTimeout = (f: () => void, miliseconds: number) =>
        setTimeout(f, miliseconds)

    shareList: ContentSharingInterface['shareList'] = async (options) => {
        const localList = await this.options.customLists.fetchListById(
            options.listId,
        )
        if (!localList) {
            throw new Error(
                `Tried to share non-existing list: ID ${options.listId}`,
            )
        }
        const userId = (await this.options.auth.authService.getCurrentUser())
            ?.id
        if (!userId) {
            throw new Error(`Tried to share list without being authenticated`)
        }

        const contentSharing = await this.options.getContentSharing()
        const listReference = await contentSharing.createSharedList({
            listData: {
                title: localList.name,
            },
            userReference: {
                type: 'user-reference',
                id: userId,
            },
            localListId: options.listId,
        })
        await this.storage.storeListId({
            localId: options.listId,
            remoteId: contentSharing.getSharedListLinkID(listReference),
        })

        this.options.analytics.trackEvent({
            category: 'ContentSharing',
            action: 'shareList',
        })

        return {
            remoteListId: contentSharing.getSharedListLinkID(listReference),
        }
    }

    shareListEntries: ContentSharingInterface['shareListEntries'] = async (
        options,
    ) => {
        const userId = (await this.options.auth.authService.getCurrentUser())
            ?.id
        if (!userId) {
            throw new Error(`Tried to share list without being authenticated`)
        }
        const remoteListId = await this.storage.getRemoteListId({
            localId: options.listId,
        })
        if (!remoteListId) {
            throw new Error(
                `Tried to share list entries of list that isn't shared yet`,
            )
        }
        const pages = await this.options.customLists.fetchListPagesById({
            listId: options.listId,
        })
        const normalizedPageUrls = pages.map((entry) => entry.pageUrl)
        const pageTitles = await this.storage.getPageTitles({
            normalizedPageUrls,
        })

        const chunkSize = 100
        for (const entryChunk of chunk(pages, chunkSize)) {
            const data: AddSharedListEntriesAction['data'] = entryChunk.map(
                (entry) => ({
                    createdWhen: entry.createdAt?.getTime() ?? '$now',
                    entryTitle: pageTitles[entry.pageUrl],
                    normalizedUrl: entry.pageUrl,
                    originalUrl: entry.fullUrl,
                }),
            )
            await this.scheduleAction({
                type: 'add-shared-list-entries',
                localListId: options.listId,
                remoteListId,
                data,
            })
        }

        const annotationEntries = await this.options.annotationStorage.listAnnotationsByPageUrls(
            { pageUrls: normalizedPageUrls },
        )
        await this._scheduleAddAnnotationEntries({
            annotationEntries,
            remoteListIds: [remoteListId],
        })
    }

    shareAnnotation: ContentSharingInterface['shareAnnotation'] = async (
        options,
    ) => {
        const annotation = await this.options.annotationStorage.getAnnotationByPk(
            options.annotationUrl,
        )
        const listIds = await this.options.customLists.fetchListIdsByUrl(
            annotation.pageUrl,
        )
        const areListsShared = await this.storage.areListsShared({
            localIds: listIds,
        })
        const sharedListIds = Object.entries(areListsShared)
            .filter(([, shared]) => shared)
            .map(([listId]) => parseInt(listId, 10))
        await this.scheduleAction({
            type: 'share-annotations',
            localListIds: sharedListIds,
            data: {
                [annotation.pageUrl]: [
                    {
                        localId: annotation.url,
                        createdWhen: annotation.createdWhen?.getTime?.(),
                        body: annotation.body ?? null,
                        comment: annotation.comment ?? null,
                        selector: annotation.selector
                            ? JSON.stringify(annotation.selector)
                            : null,
                    },
                ],
            },
        })
    }

    unshareAnnotation: ContentSharingInterface['unshareAnnotation'] = async (
        options,
    ) => {
        const remoteAnnotationId = (
            await this.storage.getRemoteAnnotationIds({
                localIds: [options.annotationUrl],
            })
        )[options.annotationUrl]
        if (!remoteAnnotationId) {
            throw new Error(
                `Tried to unshare an annotation which was not shared`,
            )
        }
        await this.storage.deleteAnnotationMetadata({
            localIds: [options.annotationUrl],
        })
        await this.scheduleAction({
            type: 'unshare-annotations',
            remoteAnnotationIds: [remoteAnnotationId],
        })
    }

    waitForSync: ContentSharingInterface['waitForSync'] = async () => {
        await this._executingPendingActions
    }

    async scheduleAction(action: ContentSharingAction) {
        this._hasPendingActions = true
        await this.storage.queueAction({ action })
        if (!this._pendingActionsRetry) {
            await this.executePendingActions()
        }
    }

    async executePendingActions() {
        if (this._executingPendingActions || !this._hasPendingActions) {
            return
        }

        const executingPendingActions = (this._executingPendingActions = createResolvable())
        if (this._pendingActionsRetry) {
            this._pendingActionsRetry.resolve()
            delete this._pendingActionsRetry
        }

        try {
            while (true) {
                const action = await this.storage.peekAction()
                if (!action) {
                    break
                }

                await this.executeAction(action)
                await this.storage.removeAction({ actionId: action.id })
            }
            this._hasPendingActions = false
            executingPendingActions.resolve({ result: 'success' })
        } catch (e) {
            this._pendingActionsRetry = createResolvable()
            executingPendingActions.resolve({ result: 'error' })
            this._setTimeout(
                () => this.executePendingActions(),
                this.ACTION_RETRY_INTERVAL,
            )
            throw e
        } finally {
            delete this._executingPendingActions
        }
    }

    async executeAction(action: ContentSharingAction) {
        const contentSharing = await this.options.getContentSharing()
        const userId = (await this.options.auth.authService.getCurrentUser())
            ?.id
        if (!userId) {
            throw new Error(
                `Tried to execute sharing action without being authenticated`,
            )
        }

        const userReference = {
            type: 'user-reference' as 'user-reference',
            id: userId,
        }
        if (action.type === 'add-shared-list-entries') {
            await contentSharing.createListEntries({
                listReference: contentSharing.getSharedListReferenceFromLinkID(
                    action.remoteListId,
                ),
                listEntries: action.data,
                userReference,
            })

            this.options.analytics.trackEvent({
                category: 'ContentSharing',
                action: 'shareListEntryBatch',
                value: { size: action.data.length },
            })
        } else if (action.type === 'remove-shared-list-entry') {
            await contentSharing.removeListEntries({
                listReference: contentSharing.getSharedListReferenceFromLinkID(
                    action.remoteListId,
                ),
                normalizedUrl: action.normalizedUrl,
            })

            this.options.analytics.trackEvent({
                category: 'ContentSharing',
                action: 'unshareListEntry',
            })
        } else if (action.type === 'remove-shared-annotation-list-entries') {
            await contentSharing.removeAnnotationsFromLists({
                sharedListReferences: [
                    contentSharing.getSharedListReferenceFromLinkID(
                        action.remoteListId,
                    ),
                ],
                sharedAnnotationReferences: action.remoteAnnotationIds.map(
                    (remoteId) =>
                        contentSharing.getSharedAnnotationReferenceFromLinkID(
                            remoteId,
                        ),
                ),
            })
        } else if (action.type === 'change-shared-list-title') {
            await contentSharing.updateListTitle(
                contentSharing.getSharedListReferenceFromLinkID(
                    action.remoteListId,
                ),
                action.newTitle,
            )
        } else if (action.type === 'share-annotations') {
            const remoteListIds = await Promise.all(
                action.localListIds.map((localId) =>
                    this.storage.getRemoteListId({ localId }),
                ),
            )
            const {
                sharedAnnotationReferences,
            } = await contentSharing.createAnnotations({
                creator: { type: 'user-reference', id: userId },
                listReferences: remoteListIds.map((remoteId) =>
                    contentSharing.getSharedListReferenceFromLinkID(remoteId),
                ),
                annotationsByPage: action.data,
            })

            const remoteIds: { [localId: string]: string } = {}
            for (const [localId, sharedAnnotationReference] of Object.entries(
                sharedAnnotationReferences,
            )) {
                remoteIds[localId] = contentSharing.getSharedAnnotationLinkID(
                    sharedAnnotationReference,
                )
            }
            await this.storage.storeAnnotationIds({ remoteIds })
        } else if (action.type === 'add-annotation-entries') {
            await contentSharing.addAnnotationsToLists({
                creator: userReference,
                sharedListReferences: action.remoteListIds.map((id) =>
                    contentSharing.getSharedListReferenceFromLinkID(id),
                ),
                sharedAnnotations: action.remoteAnnotations.map(
                    (annotation) => ({
                        createdWhen: annotation.createdWhen,
                        normalizedPageUrl: annotation.normalizedPageUrl,
                        reference: contentSharing.getSharedAnnotationReferenceFromLinkID(
                            annotation.remoteId,
                        ),
                    }),
                ),
            })
        } else if (action.type === 'update-annotation-comment') {
            await contentSharing.updateAnnotationComment({
                sharedAnnotationReference: contentSharing.getSharedAnnotationReferenceFromLinkID(
                    action.remoteAnnotationId,
                ),
                updatedComment: action.updatedComment,
            })
        } else if (action.type === 'unshare-annotations') {
            await contentSharing.removeAnnotations({
                sharedAnnotationReferences: action.remoteAnnotationIds.map(
                    (remoteAnnotationId) =>
                        contentSharing.getSharedAnnotationReferenceFromLinkID(
                            remoteAnnotationId,
                        ),
                ),
            })
        }
    }

    async _scheduleAddAnnotationEntries(params: {
        annotationEntries: Annotation[]
        remoteListIds: string[]
    }) {
        const annotationsByPageUrl: {
            [annotationUrl: string]: { pageUrl: string; createdWhen?: Date }
        } = fromPairs(
            params.annotationEntries.map((annotation) => [
                annotation.url,
                annotation,
            ]),
        )
        const remoteIds = await this.storage.getRemoteAnnotationIds({
            localIds: params.annotationEntries.map(
                (annotation) => annotation.url,
            ),
        })
        const remoteAnnotations = Object.entries(remoteIds).map(
            ([localId, remoteId]) => ({
                normalizedPageUrl: annotationsByPageUrl[localId].pageUrl,
                remoteId,
                createdWhen:
                    annotationsByPageUrl[localId].createdWhen?.getTime() ??
                    Date.now(),
            }),
        )

        await this.scheduleAction({
            type: 'add-annotation-entries',
            remoteListIds: params.remoteListIds,
            remoteAnnotations,
        })
    }

    async handlePostStorageChange(
        event: StorageOperationEvent<'post'>,
        options: {
            source: 'sync' | 'local'
        },
    ) {
        if (options.source === 'sync' && !this.shouldProcessSyncChanges) {
            return
        }

        for (const change of event.info.changes) {
            if (change.type === 'create') {
                if (change.collection === 'pageListEntries') {
                    const listEntry = change.values as Pick<
                        PageListEntry,
                        'fullUrl'
                    >
                    const [localListId, pageUrl] = change.pk as [number, string]
                    const remoteListId = await this.storage.getRemoteListId({
                        localId: localListId,
                    })
                    if (!remoteListId) {
                        continue
                    }

                    const pageTitles = await this.storage.getPageTitles({
                        normalizedPageUrls: [pageUrl],
                    })
                    const pageTitle = pageTitles[pageUrl]
                    await this.scheduleAction({
                        type: 'add-shared-list-entries',
                        localListId,
                        remoteListId,
                        data: [
                            {
                                createdWhen: Date.now(),
                                entryTitle: pageTitle,
                                normalizedUrl: pageUrl,
                                originalUrl:
                                    'https://' +
                                    normalizeUrl(listEntry.fullUrl),
                            },
                        ],
                    })

                    const annotationEntries = await this.options.annotationStorage.listAnnotationsByPageUrl(
                        {
                            pageUrl,
                        },
                    )

                    await this._scheduleAddAnnotationEntries({
                        annotationEntries,
                        remoteListIds: [remoteListId],
                    })

                    this.remoteEmitter.emit('pageAddedToSharedList', {
                        pageUrl,
                    })
                }
            } else if (change.type === 'modify') {
                if (change.collection === 'customLists') {
                    for (const pk of change.pks) {
                        const localListId = pk as number
                        const remoteListId = await this.storage.getRemoteListId(
                            {
                                localId: localListId,
                            },
                        )
                        if (!remoteListId) {
                            continue
                        }

                        await this.scheduleAction({
                            type: 'change-shared-list-title',
                            localListId,
                            remoteListId,
                            newTitle: change.updates.name,
                        })
                    }
                } else if (change.collection === 'annotations') {
                    if (!change.updates.comment) {
                        continue
                    }

                    const remoteAnnotationIds = await this.storage.getRemoteAnnotationIds(
                        {
                            localIds: change.pks as string[],
                        },
                    )
                    if (!Object.keys(remoteAnnotationIds).length) {
                        return
                    }
                    for (const [
                        localAnnotationId,
                        remoteAnnotationId,
                    ] of Object.entries(remoteAnnotationIds)) {
                        await this.scheduleAction({
                            type: 'update-annotation-comment',
                            localAnnotationId,
                            remoteAnnotationId: remoteAnnotationId as string,
                            updatedComment: change.updates.comment,
                        })
                    }
                }
            } else if (change.type === 'delete') {
                if (change.collection === 'pageListEntries') {
                    for (const pk of change.pks) {
                        const [localListId, pageUrl] = pk as [number, string]
                        const remoteListId = await this.storage.getRemoteListId(
                            {
                                localId: localListId,
                            },
                        )
                        if (!remoteListId) {
                            continue
                        }

                        await this.scheduleAction({
                            type: 'remove-shared-list-entry',
                            localListId,
                            remoteListId,
                            normalizedUrl: pageUrl,
                        })

                        const annotations = await this.options.annotationStorage.listAnnotationsByPageUrl(
                            { pageUrl },
                        )
                        if (!annotations.length) {
                            continue
                        }

                        const localAnnotationIds = annotations.map(
                            (annot) => annot.url,
                        )

                        const remoteAnnotationIdMap = await this.storage.getRemoteAnnotationIds(
                            { localIds: localAnnotationIds },
                        )

                        await this.scheduleAction({
                            type: 'remove-shared-annotation-list-entries',
                            remoteListId,
                            remoteAnnotationIds: Object.values(
                                remoteAnnotationIdMap,
                            ),
                        })

                        this.remoteEmitter.emit('pageRemovedFromSharedList', {
                            pageUrl,
                        })
                    }
                } else if (change.collection === 'annotations') {
                    const localAnnotationIds = change.pks.map((pk) =>
                        pk.toString(),
                    )
                    const remoteAnnotationIdMap = await this.storage.getRemoteAnnotationIds(
                        { localIds: localAnnotationIds },
                    )
                    if (!Object.keys(remoteAnnotationIdMap).length) {
                        return
                    }

                    await this.scheduleAction({
                        type: 'unshare-annotations',
                        remoteAnnotationIds: Object.values(
                            remoteAnnotationIdMap,
                        ),
                    })
                }
            }
        }
    }
}
