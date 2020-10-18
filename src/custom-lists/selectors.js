import { createSelector } from 'reselect'
import { SPECIAL_LIST_NAMES } from '@worldbrain/memex-storage/lib/lists/constants'

import * as selectors from '../search-filters/selectors'

export const customLists = (state) => state.customLists

export const inboxUnreadCount = createSelector(
    customLists,
    (state) => state.inboxUnreadCount,
)
export const allLists = createSelector(customLists, (state) => state.lists)
export const activeListIndex = createSelector(
    customLists,
    (state) => state.activeListIndex,
)

export const getSortedLists = createSelector(allLists, (lists) => {
    const mobileListIndex = lists.findIndex(
        ({ name }) => name === SPECIAL_LIST_NAMES.MOBILE,
    )

    if (mobileListIndex === -1) {
        return [{ name: SPECIAL_LIST_NAMES.MOBILE, id: -1 }, ...lists]
    }

    return lists
})

const isSpecialList = (list) =>
    [SPECIAL_LIST_NAMES.INBOX, SPECIAL_LIST_NAMES.MOBILE].includes(list.name)

export const createdLists = createSelector(getSortedLists, (lists) =>
    lists.filter((list) => !isSpecialList(list)),
)
export const specialLists = createSelector(getSortedLists, (lists) =>
    lists.filter((list) => isSpecialList(list)),
)

export const getUrlsToEdit = createSelector(
    customLists,
    (state) => state.urlsToEdit,
)

export const createdDisplayLists = createSelector(
    createdLists,
    activeListIndex,
    selectors.listIdFilter,
    (lists, listIndex, listFilter) =>
        lists.map((pageDoc, i) => ({
            ...pageDoc,
            isEditing: i === listIndex,
            isFilterIndex: Number(listFilter) === pageDoc.id,
            isMobileList: false,
        })),
)

export const specialDisplayLists = createSelector(
    specialLists,
    selectors.listIdFilter,
    (lists, listFilter) =>
        lists.map((pageDoc) => ({
            ...pageDoc,
            isFilterIndex: Number(listFilter) === pageDoc.id,
            isMobileList: pageDoc.name === SPECIAL_LIST_NAMES.MOBILE,
        })),
)

export const deleteConfirmProps = createSelector(
    customLists,
    (state) => state.deleteConfirmProps,
)

export const isDeleteConfShown = createSelector(
    deleteConfirmProps,
    (state) => state.isShown,
)

export const shareModalProps = createSelector(
    customLists,
    (state) => state.shareModalProps,
)

export const deletingIndex = createSelector(
    deleteConfirmProps,
    (state) => state.deleting,
)

export const deletingID = createSelector(
    deleteConfirmProps,
    (state) => state.id,
)

export const listEditDropdown = createSelector(
    customLists,
    (state) => state.listEditDropdown,
)

export const showAddToList = createSelector(
    customLists,
    (state) => state.showAddToList,
)

export const urlDragged = createSelector(
    customLists,
    (state) => state.urlDragged,
)

export const showCreateListForm = createSelector(
    customLists,
    (state) => state.showCreateListForm,
)

export const showCommonNameWarning = createSelector(
    customLists,
    (state) => state.showCommonNameWarning,
)

export const showCrowdFundingModal = createSelector(
    customLists,
    (state) => state.showCrowdFundingModal,
)

export const activeCollectionName = createSelector(
    selectors.listIdFilter,
    allLists,
    (listFilterId, lists) =>
        listFilterId
            ? lists
                  .filter((list) => list.id === Number(listFilterId))
                  .map((list) => list.name)[0]
            : undefined,
)
