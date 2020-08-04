import StorageManager from '@worldbrain/storex'
import { StorageMiddleware } from '@worldbrain/storex/lib/types/middleware'
import { ChangeWatchMiddleware } from '@worldbrain/storex-middleware-change-watcher'
import { SYNCED_COLLECTIONS } from '@worldbrain/memex-common/lib/sync/constants'
import SyncService from '@worldbrain/memex-common/lib/sync'
import { StorexHubBackground } from 'src/storex-hub/background'
import ContentSharingBackground from 'src/content-sharing/background'

export async function setStorageMiddleware(
    storageManager: StorageManager,
    options: {
        syncService: SyncService
        storexHub?: StorexHubBackground
        contentSharing?: ContentSharingBackground
        modifyMiddleware?: (
            middleware: StorageMiddleware[],
        ) => StorageMiddleware[]
    },
) {
    const modifyMiddleware =
        options.modifyMiddleware ?? ((middleware) => middleware)

    const syncedCollections = new Set(SYNCED_COLLECTIONS)
    const changeWatchMiddleware = new ChangeWatchMiddleware({
        storageManager,
        shouldWatchCollection: (collection) =>
            syncedCollections.has(collection),
        postprocessOperation: async (event) => {
            await Promise.all([
                options.storexHub?.handlePostStorageChange(event),
                options.contentSharing?.handlePostStorageChange(event, {
                    source: 'local',
                }),
            ])
        },
    })
    storageManager.setMiddleware(
        modifyMiddleware([
            // {
            //     process: async (context) => {
            //         const result = await context.next.process({
            //             operation: context.operation,
            //         })
            //         console.groupCollapsed('operation', context.operation[0])
            //         console.log({
            //             operation: context.operation,
            //             result,
            //         })
            //         console.trace()
            //         console.groupEnd()
            //         return result
            //     },
            // },
            changeWatchMiddleware,
            await options.syncService.createSyncLoggingMiddleware(),
        ]),
    )

    const syncChangeWatchMiddleware = new ChangeWatchMiddleware({
        storageManager,
        shouldWatchCollection: (collection) =>
            syncedCollections.has(collection),
        postprocessOperation: async (event) => {
            await Promise.all([
                options.storexHub?.handlePostStorageChange(event),
                options.contentSharing?.handlePostStorageChange(event, {
                    source: 'sync',
                }),
            ])
        },
    })
    options.syncService.executeReconciliationOperation = async (
        operationName: string,
        ...operationArgs: any[]
    ) => {
        return syncChangeWatchMiddleware.process({
            operation: [operationName, ...operationArgs],
            extraData: {},
            next: {
                process: (context) => {
                    return storageManager.backend.operation(
                        context.operation[0],
                        ...context.operation.slice(1),
                    )
                },
            },
        })
    }
}
