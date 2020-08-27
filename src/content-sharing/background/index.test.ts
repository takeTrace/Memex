import expect from 'expect'
import sinon from 'sinon'

import {
    backgroundIntegrationTestSuite,
    backgroundIntegrationTest,
    BackgroundIntegrationTestSetup,
} from 'src/tests/integration-tests'
import { TEST_USER } from '@worldbrain/memex-common/lib/authentication/dev'
import * as data from './index.test.data'
import { normalizeUrl } from '@worldbrain/memex-url-utils'
import { annotation } from 'src/annotations/background/storage.test.data'

export const INTEGRATION_TESTS = backgroundIntegrationTestSuite(
    'Content sharing',
    [
        backgroundIntegrationTest(
            'should share a new list with its entries',
            { skipConflictTests: true },
            () => {
                let localListId: number
                let remoteListId: string

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                const localListEntries = await setup.storageManager.operation(
                                    'findObjects',
                                    'pageListEntries',
                                    {
                                        sort: [['createdAt', 'desc']],
                                    },
                                )

                                const listShareResult = await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )
                                remoteListId = listShareResult.remoteListId

                                const serverStorage = await setup.getServerStorage()
                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedList',
                                        {},
                                    ),
                                ).toEqual([
                                    {
                                        id: expect.anything(),
                                        creator: TEST_USER.id,
                                        createdWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        title: 'My shared list',
                                        description: null,
                                    },
                                ])
                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedListEntry',
                                        { sort: [['createdWhen', 'desc']] },
                                    ),
                                ).toEqual([
                                    {
                                        id: expect.anything(),
                                        creator: TEST_USER.id,
                                        sharedList: parseInt(
                                            listShareResult.remoteListId,
                                            10,
                                        ),
                                        createdWhen: localListEntries[0].createdAt.getTime(),
                                        updatedWhen: expect.any(Number),
                                        originalUrl: 'https://www.eggs.com/foo',
                                        normalizedUrl: 'eggs.com/foo',
                                        entryTitle: 'Eggs.com title',
                                    },
                                    {
                                        id: expect.anything(),
                                        creator: TEST_USER.id,
                                        sharedList: parseInt(
                                            listShareResult.remoteListId,
                                            10,
                                        ),
                                        createdWhen: localListEntries[1].createdAt.getTime(),
                                        updatedWhen: expect.any(Number),
                                        originalUrl: 'https://www.spam.com/foo',
                                        normalizedUrl: 'spam.com/foo',
                                        entryTitle: 'Spam.com title',
                                    },
                                ])
                            },
                            postCheck: async ({ setup }) => {
                                const listMetadata = await setup.storageManager.operation(
                                    'findObjects',
                                    'sharedListMetadata',
                                    {},
                                )
                                expect(listMetadata).toEqual([
                                    {
                                        localId: localListId,
                                        remoteId: remoteListId,
                                    },
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should share new entries to an already shared list',
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )

                                // Add new entry
                                await setup.backgroundModules.search.searchIndex.addPage(
                                    {
                                        pageDoc: {
                                            url: 'https://www.fish.com/cheese',
                                            content: {
                                                title: 'Fish.com title',
                                            },
                                        },
                                        visits: [],
                                        rejectNoContent: false,
                                    },
                                )
                                await setup.backgroundModules.customLists.insertPageToList(
                                    {
                                        id: localListId,
                                        url: 'https://www.fish.com/cheese',
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedListEntry',
                                        {},
                                    ),
                                ).toEqual([
                                    expect.objectContaining({
                                        normalizedUrl: 'eggs.com/foo',
                                        entryTitle: 'Eggs.com title',
                                    }),
                                    expect.objectContaining({
                                        normalizedUrl: 'spam.com/foo',
                                        entryTitle: 'Spam.com title',
                                    }),
                                    expect.objectContaining({
                                        normalizedUrl: 'fish.com/cheese',
                                        entryTitle: 'Fish.com title',
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should sync the title when changing the title of an already shared list',
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                const initialTitle = 'My shared list'
                                localListId = await setup.backgroundModules.customLists.createCustomList(
                                    {
                                        name: initialTitle,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )

                                const updatedTitle =
                                    'My shared list (updated title)'
                                await setup.backgroundModules.customLists.updateList(
                                    {
                                        id: localListId,
                                        oldName: initialTitle,
                                        newName: updatedTitle,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedList',
                                        {},
                                    ),
                                ).toEqual([
                                    {
                                        id: expect.anything(),
                                        creator: TEST_USER.id,
                                        createdWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        title: updatedTitle,
                                        description: null,
                                    },
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should delete list entries of an already shared list',
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )

                                await setup.backgroundModules.customLists.removePageFromList(
                                    {
                                        id: localListId,
                                        url: 'https://www.spam.com/foo',
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedListEntry',
                                        {},
                                    ),
                                ).toEqual([
                                    expect.objectContaining({
                                        entryTitle: 'Eggs.com title',
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            `should schedule a retry when we cannot upload list entries`,
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                const setTimeout = sinon.fake()
                                setup.backgroundModules.contentSharing._setTimeout = setTimeout as any

                                const serverStorage = await setup.getServerStorage()
                                const sharingStorage =
                                    serverStorage.storageModules.contentSharing

                                sinon.replace(
                                    sharingStorage,
                                    'createListEntries',
                                    async () => {
                                        throw Error(
                                            `There's a monkey in your WiFi`,
                                        )
                                    },
                                )
                                try {
                                    await expect(
                                        setup.backgroundModules.contentSharing.shareListEntries(
                                            { listId: localListId },
                                        ),
                                    ).rejects.toThrow(
                                        `There's a monkey in your WiFi`,
                                    )
                                } finally {
                                    sinon.restore()
                                }
                                expect(setTimeout.calledOnce).toBe(true)
                                await setTimeout.firstCall.args[0]()

                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedListEntry',
                                        {},
                                    ),
                                ).toEqual([
                                    expect.objectContaining({
                                        entryTitle: 'Eggs.com title',
                                    }),
                                    expect.objectContaining({
                                        entryTitle: 'Spam.com title',
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            `should schedule a retry when we cannot upload changes`,
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )

                                const setTimeout = sinon.fake()
                                setup.backgroundModules.contentSharing._setTimeout = setTimeout as any

                                const serverStorage = await setup.getServerStorage()
                                const sharingStorage =
                                    serverStorage.storageModules.contentSharing

                                sinon.replace(
                                    sharingStorage,
                                    'removeListEntries',
                                    async () => {
                                        throw Error(
                                            `There's a monkey in your WiFi`,
                                        )
                                    },
                                )
                                try {
                                    await expect(
                                        setup.backgroundModules.customLists.removePageFromList(
                                            {
                                                id: localListId,
                                                url: 'https://www.spam.com/foo',
                                            },
                                        ),
                                    ).rejects.toThrow(
                                        `There's a monkey in your WiFi`,
                                    )
                                } finally {
                                    sinon.restore()
                                }
                                expect(setTimeout.calledOnce).toBe(true)
                                await setTimeout.firstCall.args[0]()

                                await setup.backgroundModules.contentSharing.waitForSync()

                                expect(
                                    await serverStorage.storageManager.operation(
                                        'findObjects',
                                        'sharedListEntry',
                                        {},
                                    ),
                                ).toEqual([
                                    expect.objectContaining({
                                        entryTitle: 'Eggs.com title',
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should share newly shared annotations in an already shared list',
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )
                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const sharedAnnotationMetadata = await setup.storageManager.operation(
                                    'findObjects',
                                    'sharedAnnotationMetadata',
                                    {},
                                )
                                expect(sharedAnnotationMetadata).toEqual([
                                    {
                                        localId: annotationUrl,
                                        remoteId: expect.anything(),
                                    },
                                ])
                                const remoteAnnotationIds = await setup.backgroundModules.contentSharing.storage.getRemoteAnnotationIds(
                                    {
                                        localIds: [annotationUrl],
                                    },
                                )
                                expect(remoteAnnotationIds).toEqual({
                                    [annotationUrl]:
                                        sharedAnnotationMetadata[0].remoteId,
                                })

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                    )
                                const sharedAnnotations = await getShared(
                                    'sharedAnnotation',
                                )
                                expect(sharedAnnotations).toEqual([
                                    {
                                        id:
                                            parseInt(
                                                remoteAnnotationIds[
                                                    annotationUrl
                                                ] as string,
                                                10,
                                            ) ||
                                            remoteAnnotationIds[annotationUrl],
                                        creator: TEST_USER.id,
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        createdWhen: expect.any(Number),
                                        uploadedWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        comment: data.ANNOTATION_1_DATA.comment,
                                        body: data.ANNOTATION_1_DATA.body,
                                        selector: JSON.stringify(
                                            data.ANNOTATION_1_DATA.selector,
                                        ),
                                    },
                                ])
                                const sharedAnnotationListEntries = await getShared(
                                    'sharedAnnotationListEntry',
                                )
                                expect(sharedAnnotationListEntries).toEqual([
                                    {
                                        id: expect.anything(),
                                        creator: TEST_USER.id,
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        createdWhen: expect.any(Number),
                                        uploadedWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        sharedList: expect.any(Number),
                                        sharedAnnotation:
                                            parseInt(
                                                remoteAnnotationIds[
                                                    annotationUrl
                                                ] as string,
                                                10,
                                            ) ||
                                            remoteAnnotationIds[annotationUrl],
                                    },
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should share already shared annotations adding a page to another shared list',
            { skipConflictTests: true },
            () => {
                let firstLocalListId: number
                let secondLocalListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                firstLocalListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                secondLocalListId = await setup.backgroundModules.customLists.createCustomList(
                                    {
                                        name: 'Second list',
                                    },
                                )
                                for (const localListId of [
                                    firstLocalListId,
                                    secondLocalListId,
                                ]) {
                                    await setup.backgroundModules.contentSharing.shareList(
                                        { listId: localListId },
                                    )
                                    await setup.backgroundModules.contentSharing.shareListEntries(
                                        { listId: localListId },
                                    )
                                }
                                const remoteListIds = await Promise.all(
                                    [firstLocalListId, secondLocalListId].map(
                                        (localId) =>
                                            setup.backgroundModules.contentSharing.storage.getRemoteListId(
                                                {
                                                    localId,
                                                },
                                            ),
                                    ),
                                )

                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const remoteAnnotationIds = await setup.backgroundModules.contentSharing.storage.getRemoteAnnotationIds(
                                    {
                                        localIds: [annotationUrl],
                                    },
                                )
                                await setup.backgroundModules.customLists.insertPageToList(
                                    {
                                        id: secondLocalListId,
                                        ...data.ENTRY_1_DATA,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                        { order: [['id', 'asc']] },
                                    )
                                const sharedAnnotations = await getShared(
                                    'sharedAnnotation',
                                )
                                expect(sharedAnnotations).toEqual([
                                    {
                                        id:
                                            parseInt(
                                                remoteAnnotationIds[
                                                    annotationUrl
                                                ] as string,
                                                10,
                                            ) ||
                                            remoteAnnotationIds[annotationUrl],
                                        creator: TEST_USER.id,
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        createdWhen: expect.any(Number),
                                        uploadedWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        comment: data.ANNOTATION_1_DATA.comment,
                                        body: data.ANNOTATION_1_DATA.body,
                                        selector: JSON.stringify(
                                            data.ANNOTATION_1_DATA.selector,
                                        ),
                                    },
                                ])
                                const sharedAnnotationListEntries = await getShared(
                                    'sharedAnnotationListEntry',
                                )
                                const sharedAnnotationId =
                                    parseInt(
                                        remoteAnnotationIds[
                                            annotationUrl
                                        ] as string,
                                        10,
                                    ) || remoteAnnotationIds[annotationUrl]
                                expect(sharedAnnotationListEntries).toEqual([
                                    expect.objectContaining({
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        sharedList: parseInt(
                                            remoteListIds[0],
                                            10,
                                        ),
                                        sharedAnnotation: sharedAnnotationId,
                                    }),
                                    expect.objectContaining({
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        sharedList: parseInt(
                                            remoteListIds[1],
                                            10,
                                        ),
                                        sharedAnnotation: sharedAnnotationId,
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should update the body of a shared annotation',
            { skipConflictTests: true },
            () => {
                let localListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: localListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: localListId },
                                )
                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                await setup.backgroundModules.directLinking.editAnnotation(
                                    null,
                                    annotationUrl,
                                    'Updated comment',
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                    )
                                const sharedAnnotations = await getShared(
                                    'sharedAnnotation',
                                )
                                expect(sharedAnnotations).toEqual([
                                    expect.objectContaining({
                                        comment: 'Updated comment',
                                        body: data.ANNOTATION_1_DATA.body,
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should share already shared annotations when sharing a list containing already shared pages',
            { skipConflictTests: true },
            () => {
                let firstLocalListId: number
                let secondLocalListId: number

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                firstLocalListId = await data.createContentSharingTestList(
                                    setup,
                                )
                                secondLocalListId = await setup.backgroundModules.customLists.createCustomList(
                                    {
                                        name: 'Second list',
                                    },
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: firstLocalListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: firstLocalListId },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                await setup.backgroundModules.customLists.insertPageToList(
                                    {
                                        id: secondLocalListId,
                                        ...data.ENTRY_1_DATA,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.shareList(
                                    { listId: secondLocalListId },
                                )
                                await setup.backgroundModules.contentSharing.shareListEntries(
                                    { listId: secondLocalListId },
                                )

                                await setup.backgroundModules.contentSharing.waitForSync()
                                const remoteListIds = await Promise.all(
                                    [firstLocalListId, secondLocalListId].map(
                                        (localId) =>
                                            setup.backgroundModules.contentSharing.storage.getRemoteListId(
                                                {
                                                    localId,
                                                },
                                            ),
                                    ),
                                )
                                const remoteAnnotationIds = await setup.backgroundModules.contentSharing.storage.getRemoteAnnotationIds(
                                    {
                                        localIds: [annotationUrl],
                                    },
                                )

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                        { order: [['id', 'asc']] },
                                    )
                                const sharedAnnotations = await getShared(
                                    'sharedAnnotation',
                                )
                                expect(sharedAnnotations).toEqual([
                                    {
                                        id:
                                            parseInt(
                                                remoteAnnotationIds[
                                                    annotationUrl
                                                ] as string,
                                                10,
                                            ) ||
                                            remoteAnnotationIds[annotationUrl],
                                        creator: TEST_USER.id,
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        createdWhen: expect.any(Number),
                                        uploadedWhen: expect.any(Number),
                                        updatedWhen: expect.any(Number),
                                        comment: data.ANNOTATION_1_DATA.comment,
                                        body: data.ANNOTATION_1_DATA.body,
                                        selector: JSON.stringify(
                                            data.ANNOTATION_1_DATA.selector,
                                        ),
                                    },
                                ])
                                const sharedAnnotationListEntries = await getShared(
                                    'sharedAnnotationListEntry',
                                )
                                const sharedAnnotationId =
                                    parseInt(
                                        remoteAnnotationIds[
                                            annotationUrl
                                        ] as string,
                                        10,
                                    ) || remoteAnnotationIds[annotationUrl]
                                expect(sharedAnnotationListEntries).toEqual([
                                    expect.objectContaining({
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        sharedList: parseInt(
                                            remoteListIds[0],
                                            10,
                                        ),
                                        sharedAnnotation: sharedAnnotationId,
                                    }),
                                    expect.objectContaining({
                                        normalizedPageUrl: normalizeUrl(
                                            data.ANNOTATION_1_DATA.pageUrl,
                                        ),
                                        sharedList: parseInt(
                                            remoteListIds[1],
                                            10,
                                        ),
                                        sharedAnnotation: sharedAnnotationId,
                                    }),
                                ])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should correctly unshare an annotation',
            { skipConflictTests: true },
            () => {
                let localListIds: number[]

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListIds = [
                                    await data.createContentSharingTestList(
                                        setup,
                                    ),
                                    await data.createContentSharingTestList(
                                        setup,
                                        { dontIndexPages: true },
                                    ),
                                ]
                                for (const localListId of localListIds) {
                                    await setup.backgroundModules.contentSharing.shareList(
                                        { listId: localListId },
                                    )
                                    await setup.backgroundModules.contentSharing.shareListEntries(
                                        { listId: localListId },
                                    )
                                }
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                        { order: [['id', 'asc']] },
                                    )
                                expect(
                                    await getShared('sharedAnnotation'),
                                ).toEqual([
                                    expect.objectContaining({
                                        body: data.ANNOTATION_1_DATA.body,
                                    }),
                                ])
                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([
                                    expect.objectContaining({}),
                                    expect.objectContaining({}),
                                ])

                                await setup.backgroundModules.contentSharing.unshareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )

                                expect(
                                    await setup.storageManager.operation(
                                        'findObjects',
                                        'sharedAnnotationMetadata',
                                        {},
                                    ),
                                ).toEqual([])
                                expect(
                                    await getShared('sharedAnnotation'),
                                ).toEqual([])
                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should correctly unshare annotations when removing a page from a shared list',
            { skipConflictTests: true },
            () => {
                let localListIds: number[]

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListIds = [
                                    await data.createContentSharingTestList(
                                        setup,
                                    ),
                                    await data.createContentSharingTestList(
                                        setup,
                                        { dontIndexPages: true },
                                    ),
                                ]
                                for (const localListId of localListIds) {
                                    await setup.backgroundModules.contentSharing.shareList(
                                        { listId: localListId },
                                    )
                                    await setup.backgroundModules.contentSharing.shareListEntries(
                                        { listId: localListId },
                                    )
                                }
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                        { order: [['id', 'asc']] },
                                    )
                                expect(
                                    await getShared('sharedAnnotation'),
                                ).toEqual([
                                    expect.objectContaining({
                                        body: data.ANNOTATION_1_DATA.body,
                                    }),
                                ])
                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([
                                    expect.objectContaining({}),
                                    expect.objectContaining({}),
                                ])

                                await setup.backgroundModules.customLists.removePageFromList(
                                    {
                                        id: localListIds[0],
                                        url: data.PAGE_1_DATA.pageDoc.url,
                                    },
                                )

                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([expect.objectContaining({})])

                                await setup.backgroundModules.customLists.removePageFromList(
                                    {
                                        id: localListIds[1],
                                        url: data.PAGE_1_DATA.pageDoc.url,
                                    },
                                )

                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([])
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should correctly unshare annotation and remove list entries when removed locally',
            { skipConflictTests: true },
            () => {
                let localListIds: number[]

                return {
                    setup: async ({ setup }) => {
                        setup.backgroundModules.contentSharing.shouldProcessSyncChanges = false
                    },
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                setup.authService.setUser(TEST_USER)

                                localListIds = [
                                    await data.createContentSharingTestList(
                                        setup,
                                    ),
                                    await data.createContentSharingTestList(
                                        setup,
                                        { dontIndexPages: true },
                                    ),
                                ]
                                for (const localListId of localListIds) {
                                    await setup.backgroundModules.contentSharing.shareList(
                                        { listId: localListId },
                                    )
                                    await setup.backgroundModules.contentSharing.shareListEntries(
                                        { listId: localListId },
                                    )
                                }
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    {} as any,
                                    data.ANNOTATION_1_DATA,
                                    { skipPageIndexing: true },
                                )
                                await setup.backgroundModules.contentSharing.shareAnnotation(
                                    {
                                        annotationUrl,
                                    },
                                )
                                await setup.backgroundModules.contentSharing.waitForSync()

                                const serverStorage = await setup.getServerStorage()
                                const getShared = (collection: string) =>
                                    serverStorage.storageManager.operation(
                                        'findObjects',
                                        collection,
                                        {},
                                        { order: [['id', 'asc']] },
                                    )
                                expect(
                                    await getShared('sharedAnnotation'),
                                ).toEqual([
                                    expect.objectContaining({
                                        body: data.ANNOTATION_1_DATA.body,
                                    }),
                                ])
                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([
                                    expect.objectContaining({}),
                                    expect.objectContaining({}),
                                ])

                                await setup.backgroundModules.directLinking.deleteAnnotation(
                                    null,
                                    annotationUrl,
                                )

                                // expect(
                                //     await setup.storageManager.operation(
                                //         'findObjects',
                                //         'sharedAnnotationMetadata',
                                //         {},
                                //     ),
                                // ).toEqual([])
                                expect(
                                    await getShared('sharedAnnotation'),
                                ).toEqual([])
                                expect(
                                    await getShared(
                                        'sharedAnnotationListEntry',
                                    ),
                                ).toEqual([])
                            },
                        },
                    ],
                }
            },
        ),
    ],
)
