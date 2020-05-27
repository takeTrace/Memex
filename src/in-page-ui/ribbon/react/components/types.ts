import { PickerUpdateHandler } from 'src/common-ui/GenericPicker/types'

export interface RibbonSubcomponentProps {
    highlights: RibbonHighlightsProps
    tooltip: RibbonTooltipProps
    sidebar: RibbonSidebarProps
    commentBox: RibbonCommentBoxProps
    bookmark: RibbonBookmarkProps
    tagging: RibbonTaggingProps
    lists: RibbonListsProps
    search: RibbonSearchProps
    pausing: RibbonPausingProps
}

export interface RibbonHighlightsProps {
    areHighlightsEnabled: boolean
    handleHighlightsToggle: () => void
}

export interface RibbonTooltipProps {
    isTooltipEnabled: boolean
    handleTooltipToggle: () => void
}

export interface RibbonSidebarProps {
    isSidebarOpen: boolean
    openSidebar: (args: any) => void
    closeSidebar: () => void
    setShowSidebarCommentBox: (value: boolean) => void
}

export interface RibbonCommentBoxProps extends CommonTaggingProps {
    commentText: string
    showCommentBox: boolean
    isCommentSaved: boolean
    isCommentBookmarked: boolean
    isTagInputActive: boolean
    showTagsPicker: boolean
    handleCommentTextChange: (comment: string) => void
    saveComment: () => void
    cancelComment: () => void
    toggleCommentBoxBookmark: () => void
    toggleCommentBoxTagPicker: () => void
    setShowCommentBox: (value: boolean) => void
    updateCommentTags: PickerUpdateHandler
}

export interface RibbonBookmarkProps {
    isBookmarked: boolean
    toggleBookmark: () => void
}

export interface RibbonTaggingProps extends CommonTaggingProps {
    showTagsPicker: boolean
    updateTags: PickerUpdateHandler
    tagAllTabs: (value: string) => Promise<void>
    setShowTagsPicker: (value: boolean) => void
    fetchInitialTagSelections: () => Promise<string[]>
}

export interface CommonTaggingProps {
    tags: string[]
    queryTagSuggestions: (query: string) => Promise<string[]>
    fetchInitialTagSuggestions: () => Promise<string[]>
}

export interface ListEntryArgs {
    listId: number
    pageUrl: string
}

export interface RibbonListsProps {
    showListsPicker: boolean
    updateLists: PickerUpdateHandler
    listAllTabs: (value: string) => Promise<void>
    setShowListsPicker: (value: boolean) => void
    queryListSuggestions: (query: string) => Promise<string[]>
    fetchInitialListSuggestions: () => Promise<string[]>
    fetchInitialListSelections: () => Promise<string[]>
}

export interface RibbonSearchProps {
    showSearchBox: boolean
    searchValue: string
    setShowSearchBox: (value: boolean) => void
    setSearchValue: (value: string) => void
}

export interface RibbonPausingProps {
    isPaused: boolean
    handlePauseToggle: () => void
}
