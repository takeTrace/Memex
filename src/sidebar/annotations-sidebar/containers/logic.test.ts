// tslint:disable:forin
import mapValues from 'lodash/mapValues'

import { SidebarContainerLogic, createEditFormsForAnnotations } from './logic'
import {
    makeSingleDeviceUILogicTestFactory,
    UILogicTestDevice,
} from 'src/tests/ui-logic-tests'
import * as DATA from './logic.test.data'
import { createAnnotationsCache } from 'src/annotations/annotations-cache'
import * as sharingTestData from 'src/content-sharing/background/index.test.data'
import { TEST_USER } from '@worldbrain/memex-common/lib/authentication/dev'

function insertBackgroundFunctionTab(remoteFunctions, tab: any) {
    return mapValues(remoteFunctions, (f) => {
        return (...args: any[]) => {
            return f({ tab }, ...args)
        }
    })
}

const setupLogicHelper = async ({
    device,
    pageUrl = DATA.CURRENT_TAB_URL_1,
    focusCreateForm = () => undefined,
}: {
    device: UILogicTestDevice
    pageUrl?: string
    focusCreateForm?: () => void
}) => {
    const { backgroundModules } = device

    const annotationsBG = insertBackgroundFunctionTab(
        device.backgroundModules.directLinking.remoteFunctions,
        {},
    ) as any

    const annotationsCache = createAnnotationsCache(
        {
            tags: device.backgroundModules.tags.remoteFunctions,
            annotations: annotationsBG,
        },
        { skipPageIndexing: true },
    )

    const sidebarLogic = new SidebarContainerLogic({
        pageUrl,
        auth: backgroundModules.auth.remoteFunctions,
        tags: backgroundModules.tags.remoteFunctions,
        customLists: backgroundModules.customLists.remoteFunctions,
        contentSharing: backgroundModules.contentSharing.remoteFunctions,
        annotations: annotationsBG,
        annotationsCache,
        initialState: 'hidden',
        searchResultLimit: 10,
        focusCreateForm,
    })

    const sidebar = device.createElement(sidebarLogic)
    await sidebar.init()
    return { sidebar, sidebarLogic }
}

describe('SidebarContainerLogic', () => {
    const it = makeSingleDeviceUILogicTestFactory({
        includePostSyncProcessor: true,
    })

    describe('page annotation results', () => {
        const context = 'pageAnnotations'

        it("should be able to edit an annotation's comment", async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })
            const editedComment = DATA.ANNOT_1.comment + ' new stuff'

            sidebar.processMutation({
                annotations: { $set: [DATA.ANNOT_1] },
                editForms: {
                    $set: createEditFormsForAnnotations([DATA.ANNOT_1]),
                },
            })

            const annotation = sidebar.state.annotations[0]
            expect(annotation.comment).toEqual(DATA.ANNOT_1.comment)

            await sidebar.processEvent('setAnnotationEditMode', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(
                sidebar.state.annotationModes[context][DATA.ANNOT_1.url],
            ).toEqual('edit')

            await sidebar.processEvent('changeEditCommentText', {
                annotationUrl: DATA.ANNOT_1.url,
                comment: editedComment,
            })
            await sidebar.processEvent('editAnnotation', {
                annotationUrl: DATA.ANNOT_1.url,
                context,
            })
            expect(
                sidebar.state.annotationModes[context][annotation.url],
            ).toEqual('default')
            expect(sidebar.state.annotations[0].comment).toEqual(editedComment)
            expect(sidebar.state.annotations[0].tags).toEqual([])
            expect(sidebar.state.annotations[0].lastEdited).not.toEqual(
                annotation.lastEdited,
            )
        })

        it("should be able to edit an annotation's comment and tags", async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })
            const editedComment = DATA.ANNOT_1.comment + ' new stuff'

            sidebar.processMutation({
                annotations: { $set: [DATA.ANNOT_1] },
                editForms: {
                    $set: createEditFormsForAnnotations([DATA.ANNOT_1]),
                },
            })

            const annotation = sidebar.state.annotations[0]
            expect(annotation.comment).toEqual(DATA.ANNOT_1.comment)

            await sidebar.processEvent('setAnnotationEditMode', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(
                sidebar.state.annotationModes[context][DATA.ANNOT_1.url],
            ).toEqual('edit')

            await sidebar.processEvent('changeEditCommentText', {
                annotationUrl: DATA.ANNOT_1.url,
                comment: editedComment,
            })
            await sidebar.processEvent('updateTagsForEdit', {
                annotationUrl: DATA.ANNOT_1.url,
                added: DATA.TAG_1,
            })
            await sidebar.processEvent('updateTagsForEdit', {
                annotationUrl: DATA.ANNOT_1.url,
                added: DATA.TAG_2,
            })
            await sidebar.processEvent('editAnnotation', {
                annotationUrl: DATA.ANNOT_1.url,
                context,
            })
            expect(
                sidebar.state.annotationModes[context][annotation.url],
            ).toEqual('default')
            expect(sidebar.state.annotations[0].comment).toEqual(editedComment)
            expect(sidebar.state.annotations[0].tags).toEqual([
                DATA.TAG_1,
                DATA.TAG_2,
            ])
            expect(sidebar.state.annotations[0].lastEdited).not.toEqual(
                annotation.lastEdited,
            )
        })

        it('should be able to interrupt an edit, preserving comment and tag inputs', async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })
            const editedComment = DATA.ANNOT_1.comment + ' new stuff'

            sidebar.processMutation({
                annotations: { $set: [DATA.ANNOT_1] },
                editForms: {
                    $set: createEditFormsForAnnotations([DATA.ANNOT_1]),
                },
            })

            const annotation = sidebar.state.annotations[0]
            expect(annotation.comment).toEqual(DATA.ANNOT_1.comment)

            await sidebar.processEvent('setAnnotationEditMode', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(
                sidebar.state.annotationModes[context][DATA.ANNOT_1.url],
            ).toEqual('edit')

            await sidebar.processEvent('changeEditCommentText', {
                annotationUrl: DATA.ANNOT_1.url,
                comment: editedComment,
            })
            await sidebar.processEvent('updateTagsForEdit', {
                annotationUrl: DATA.ANNOT_1.url,
                added: DATA.TAG_1,
            })
            await sidebar.processEvent('updateTagsForEdit', {
                annotationUrl: DATA.ANNOT_1.url,
                added: DATA.TAG_2,
            })

            expect(sidebar.state.editForms[annotation.url]).toEqual({
                tags: [DATA.TAG_1, DATA.TAG_2],
                commentText: editedComment,
                isTagInputActive: false,
                isBookmarked: false,
                showPreview: false,
            })
            await sidebar.processEvent('switchAnnotationMode', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
                mode: 'default',
            })
            expect(sidebar.state.editForms[annotation.url]).toEqual({
                tags: [DATA.TAG_1, DATA.TAG_2],
                commentText: editedComment,
                isTagInputActive: false,
                isBookmarked: false,
                showPreview: false,
            })
        })

        it('should be able to delete an annotation', async ({ device }) => {
            const { sidebar } = await setupLogicHelper({ device })

            sidebar.processMutation({
                annotations: { $set: [DATA.ANNOT_1] },
                editForms: {
                    $set: createEditFormsForAnnotations([DATA.ANNOT_1]),
                },
            })

            await sidebar.processEvent('deleteAnnotation', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(sidebar.state.annotations.length).toBe(0)
        })

        it("should be able to toggle an annotation's bookmark status", async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })

            sidebar.processMutation({
                annotations: { $set: [DATA.ANNOT_1] },
                editForms: {
                    $set: createEditFormsForAnnotations([DATA.ANNOT_1]),
                },
            })

            expect(sidebar.state.annotations[0].isBookmarked).toBe(undefined)
            await sidebar.processEvent('toggleAnnotationBookmark', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(sidebar.state.annotations[0].isBookmarked).toBe(true)
            await sidebar.processEvent('toggleAnnotationBookmark', {
                context,
                annotationUrl: DATA.ANNOT_1.url,
            })
            expect(sidebar.state.annotations[0].isBookmarked).toBe(false)
        })

        it('should be able to go to an annotation highlight on the page', async () => {})

        it('should be able to change annotation sharing access', async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.annotationSharingAccess).toEqual(
                'feature-disabled',
            )

            await sidebar.processEvent('receiveSharingAccessChange', {
                sharingAccess: 'sharing-allowed',
            })
            expect(sidebar.state.annotationSharingAccess).toEqual(
                'sharing-allowed',
            )

            await sidebar.processEvent('receiveSharingAccessChange', {
                sharingAccess: 'feature-disabled',
            })
            expect(sidebar.state.annotationSharingAccess).toEqual(
                'feature-disabled',
            )
        })

        it('should be able to toggle sidebar lock', async ({ device }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.isLocked).toBe(false)
            await sidebar.processEvent('lock', null)
            expect(sidebar.state.isLocked).toBe(true)
            await sidebar.processEvent('unlock', null)
            expect(sidebar.state.isLocked).toBe(false)
        })
    })

    // TODO: Figure out why we're passing in all the comment data that's already available in state
    describe('new comment box', () => {
        it('should be able to cancel writing a new comment', async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.commentBox.commentText).toEqual('')
            await sidebar.processEvent('changeNewPageCommentText', {
                comment: DATA.COMMENT_1,
            })
            expect(sidebar.state.commentBox.commentText).toEqual(DATA.COMMENT_1)

            await sidebar.processEvent('cancelNewPageComment', null)
            expect(sidebar.state.commentBox.commentText).toEqual('')
        })

        it('should be able to save a new comment', async ({ device }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.commentBox.commentText).toEqual('')
            await sidebar.processEvent('changeNewPageCommentText', {
                comment: DATA.COMMENT_1,
            })
            expect(sidebar.state.commentBox.commentText).toEqual(DATA.COMMENT_1)

            await sidebar.processEvent('saveNewPageComment', null)
            expect(sidebar.state.annotations.length).toBe(1)
            expect(sidebar.state.annotations).toEqual([
                expect.objectContaining({
                    comment: DATA.COMMENT_1,
                    tags: [],
                }),
            ])
            expect(sidebar.state.commentBox.commentText).toEqual('')
        })

        it('should be able to save a new comment with tags', async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.commentBox.commentText).toEqual('')
            await sidebar.processEvent('changeNewPageCommentText', {
                comment: DATA.COMMENT_1,
            })
            expect(sidebar.state.commentBox.commentText).toEqual(DATA.COMMENT_1)

            expect(sidebar.state.commentBox.tags).toEqual([])
            await sidebar.processEvent('updateNewPageCommentTags', {
                tags: [DATA.TAG_1, DATA.TAG_2],
            })
            expect(sidebar.state.commentBox.tags).toEqual([
                DATA.TAG_1,
                DATA.TAG_2,
            ])
            await sidebar.processEvent('updateNewPageCommentTags', {
                tags: [DATA.TAG_2],
            })
            expect(sidebar.state.commentBox.tags).toEqual([DATA.TAG_2])

            await sidebar.processEvent('saveNewPageComment', null)
            expect(sidebar.state.annotations).toEqual([
                expect.objectContaining({
                    comment: DATA.COMMENT_1,
                    tags: [DATA.TAG_2],
                }),
            ])
            expect(sidebar.state.commentBox.tags).toEqual([])
            expect(sidebar.state.commentBox.isBookmarked).toBe(false)
            expect(sidebar.state.commentBox.commentText).toEqual('')
        })

        it('should be able to hydrate new comment box with state', async ({
            device,
        }) => {
            const { sidebar } = await setupLogicHelper({ device })

            expect(sidebar.state.commentBox.commentText).toEqual('')
            expect(sidebar.state.commentBox.tags).toEqual([])
            expect(sidebar.state.showCommentBox).toBe(false)

            await sidebar.processEvent('addNewPageComment', {
                comment: DATA.COMMENT_1,
            })
            expect(sidebar.state.showCommentBox).toBe(true)
            expect(sidebar.state.commentBox.commentText).toEqual(DATA.COMMENT_1)
            expect(sidebar.state.commentBox.tags).toEqual([])

            await sidebar.processEvent('cancelNewPageComment', null)
            expect(sidebar.state.commentBox.commentText).toEqual('')
            expect(sidebar.state.commentBox.tags).toEqual([])
            expect(sidebar.state.showCommentBox).toBe(false)

            await sidebar.processEvent('addNewPageComment', {
                tags: [DATA.TAG_1, DATA.TAG_2],
            })
            expect(sidebar.state.showCommentBox).toBe(true)
            expect(sidebar.state.commentBox.commentText).toEqual('')
            expect(sidebar.state.commentBox.tags).toEqual([
                DATA.TAG_1,
                DATA.TAG_2,
            ])

            await sidebar.processEvent('cancelNewPageComment', null)

            await sidebar.processEvent('addNewPageComment', {
                comment: DATA.COMMENT_1,
                tags: [DATA.TAG_1, DATA.TAG_2],
            })
            expect(sidebar.state.showCommentBox).toBe(true)
            expect(sidebar.state.commentBox.commentText).toEqual(DATA.COMMENT_1)
            expect(sidebar.state.commentBox.tags).toEqual([
                DATA.TAG_1,
                DATA.TAG_2,
            ])
        })

        it('should be able to set focus on comment box', async ({ device }) => {
            let isCreateFormFocused = false
            const { sidebar } = await setupLogicHelper({
                device,
                focusCreateForm: () => {
                    isCreateFormFocused = true
                },
            })

            expect(isCreateFormFocused).toBe(false)
            await sidebar.processEvent('addNewPageComment', {
                comment: DATA.COMMENT_1,
            })
            expect(isCreateFormFocused).toBe(true)
        })
    })

    it('should be able to set active annotation copy paster', async ({
        device,
    }) => {
        const { sidebar } = await setupLogicHelper({ device })
        const id1 = 'test1'
        const id2 = 'test2'

        expect(sidebar.state.activeCopyPasterAnnotationId).toBeUndefined()
        sidebar.processEvent('setCopyPasterAnnotationId', { id: id1 })
        expect(sidebar.state.activeCopyPasterAnnotationId).toEqual(id1)
        sidebar.processEvent('setCopyPasterAnnotationId', { id: id2 })
        expect(sidebar.state.activeCopyPasterAnnotationId).toEqual(id2)
        sidebar.processEvent('resetCopyPasterAnnotationId', null)
        expect(sidebar.state.activeCopyPasterAnnotationId).toBeUndefined()
    })

    it('should be able to set active annotation share menu', async ({
        device,
    }) => {
        const { sidebar } = await setupLogicHelper({ device })
        const id1 = 'test1'
        const id2 = 'test2'

        expect(sidebar.state.activeShareMenuNoteId).toBeUndefined()
        sidebar.processEvent('setShareMenuNoteId', { id: id1 })
        expect(sidebar.state.activeShareMenuNoteId).toEqual(id1)
        sidebar.processEvent('setShareMenuNoteId', { id: id2 })
        expect(sidebar.state.activeShareMenuNoteId).toEqual(id2)
        sidebar.processEvent('resetShareMenuNoteId', null)
        expect(sidebar.state.activeShareMenuNoteId).toBeUndefined()
    })

    it('should be able to update annotation sharing info', async ({
        device,
    }) => {
        const { sidebar } = await setupLogicHelper({ device })
        const id1 = 'test1'
        const id2 = 'test2'

        expect(sidebar.state.annotationSharingInfo).toEqual({})
        sidebar.processEvent('updateAnnotationShareInfo', {
            annotationUrl: id1,
            info: { status: 'not-yet-shared', taskState: 'pristine' },
        })
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [id1]: { status: 'not-yet-shared', taskState: 'pristine' },
        })
        sidebar.processEvent('updateAnnotationShareInfo', {
            annotationUrl: id1,
            info: { status: 'shared', taskState: 'success' },
        })
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [id1]: { status: 'shared', taskState: 'success' },
        })
        sidebar.processEvent('updateAnnotationShareInfo', {
            annotationUrl: id1,
            info: { status: 'unshared' },
        })
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [id1]: { status: 'unshared', taskState: 'success' },
        })
        sidebar.processEvent('updateAnnotationShareInfo', {
            annotationUrl: id2,
            info: { status: 'shared', taskState: 'error' },
        })
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [id1]: { status: 'unshared', taskState: 'success' },
            [id2]: { status: 'shared', taskState: 'error' },
        })
        sidebar.processEvent('updateAnnotationShareInfo', {
            annotationUrl: id2,
            info: { taskState: 'success' },
        })
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [id1]: { status: 'unshared', taskState: 'success' },
            [id2]: { status: 'shared', taskState: 'success' },
        })
    })

    it('should share annotations, simulating sidebar share process', async ({
        device,
    }) => {
        const { contentSharing, directLinking } = device.backgroundModules
        await device.authService.setUser(TEST_USER)

        const localListId = await sharingTestData.createContentSharingTestList(
            device,
        )
        await contentSharing.shareList({
            listId: localListId,
        })
        await contentSharing.shareListEntries({
            listId: localListId,
        })
        const pageUrl = sharingTestData.PAGE_1_DATA.pageDoc.url
        const annotationUrl = await directLinking.createAnnotation(
            {} as any,
            {
                pageUrl,
                title: 'Page title',
                body: 'Annot body',
                comment: 'Annot comment',
                selector: {
                    descriptor: { content: { foo: 5 }, strategy: 'eedwdwq' },
                    quote: 'dawadawd',
                },
            },
            { skipPageIndexing: true },
        )

        const { sidebar } = await setupLogicHelper({ device, pageUrl })

        await sidebar.processEvent('receiveSharingAccessChange', {
            sharingAccess: 'sharing-allowed',
        })
        expect(sidebar.state.annotationSharingAccess).toEqual('sharing-allowed')
        expect(sidebar.state.annotations).toEqual([
            expect.objectContaining({ url: annotationUrl }),
        ])

        // Triggers share menu opening
        await sidebar.processEvent('shareAnnotation', {
            context: 'pageAnnotations',
            annotationUrl,
        })
        expect(sidebar.state.activeShareMenuNoteId).toEqual(annotationUrl)

        // BG calls that run automatically upon share menu opening
        await contentSharing.shareAnnotation({ annotationUrl })
        await contentSharing.shareAnnotationsToLists({
            annotationUrls: [annotationUrl],
            queueInteraction: 'skip-queue',
        })

        await contentSharing.waitForSync()
        const serverStorage = await device.getServerStorage()
        expect(
            await serverStorage.storageManager
                .collection('sharedAnnotation')
                .findObjects({}),
        ).toEqual([
            expect.objectContaining({
                body: 'Annot body',
                comment: 'Annot comment',
                selector: JSON.stringify({
                    descriptor: { content: { foo: 5 }, strategy: 'eedwdwq' },
                    quote: 'dawadawd',
                }),
            }),
        ])
    })

    it('should detect shared annotations on initialization', async ({
        device,
    }) => {
        const { contentSharing, directLinking } = device.backgroundModules
        await device.authService.setUser(TEST_USER)

        // Set up some shared data independent of the sidebar logic
        const localListId = await sharingTestData.createContentSharingTestList(
            device,
        )
        await contentSharing.shareList({
            listId: localListId,
        })
        await contentSharing.shareListEntries({
            listId: localListId,
        })
        const pageUrl = sharingTestData.PAGE_1_DATA.pageDoc.url

        // This annotation will be shared
        const annotationUrl1 = await directLinking.createAnnotation(
            {} as any,
            {
                pageUrl,
                title: 'Page title',
                body: 'Annot body',
                comment: 'Annot comment',
                selector: {
                    descriptor: { content: { foo: 5 }, strategy: 'eedwdwq' },
                    quote: 'dawadawd',
                },
            },
            { skipPageIndexing: true },
        )
        // This annotation won't be shared
        const annotationUrl2 = await directLinking.createAnnotation(
            {} as any,
            {
                pageUrl,
                title: 'Page title',
                body: 'Annot body 2',
                comment: 'Annot comment 2',
                selector: {
                    descriptor: { content: { foo: 5 }, strategy: 'eedwdwq' },
                    quote: 'dawadawd 2',
                },
            },
            { skipPageIndexing: true },
        )

        await contentSharing.shareAnnotation({ annotationUrl: annotationUrl1 })
        await contentSharing.waitForSync()

        const { sidebar, sidebarLogic } = await setupLogicHelper({
            device,
            pageUrl,
        })

        expect(sidebar.state.annotations).toEqual([
            expect.objectContaining({ url: annotationUrl2 }),
            expect.objectContaining({ url: annotationUrl1 }),
        ])
        await sidebarLogic._detectSharedAnnotations([
            annotationUrl1,
            annotationUrl2,
        ])

        // Only the shared annot should show up in sharing info
        expect(sidebar.state.annotationSharingInfo).toEqual({
            [annotationUrl1]: {
                status: 'shared',
                taskState: 'pristine',
            },
        })
    })
})
