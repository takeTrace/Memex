import * as React from 'react'
import ReactDOM from 'react-dom'
import onClickOutside from 'react-onclickoutside'

import {
    SidebarContainerOptions,
    SidebarContainerState,
    SidebarContainerLogic,
    SidebarContainerEvents,
} from './logic'
import { StatefulUIElement } from 'src/util/ui-logic'
import Sidebar from '../../components/sidebar'
import { Anchor } from 'src/highlighting/types'
import {
    InPageUIEvents,
    SidebarActionOptions,
} from 'src/in-page-ui/shared-state/types'
import { acts as resultsActs } from 'src/overview/results'

export interface SidebarContainerProps extends SidebarContainerOptions {
    /** If defined, overrides the default outside click behavior. */
    onClickOutside?: React.MouseEventHandler
    setRef?: (logic: SidebarContainer) => void
}

export class SidebarContainer extends StatefulUIElement<
    SidebarContainerProps,
    SidebarContainerState,
    SidebarContainerEvents
> {
    constructor(props) {
        super(props, new SidebarContainerLogic(props))

        if (this.props.setRef) {
            this.props.setRef(this)
        }
    }

    componentDidMount() {
        super.componentDidMount()
        this.props.inPageUI.events.on(
            'stateChanged',
            this.handleInPageUIStateChange,
        )
        this.props.inPageUI.events.on(
            'sidebarAction',
            this.handleExternalAction,
        )
    }

    componentWillUnmount() {
        super.componentWillUnmount()
        this.props.inPageUI.events.removeListener(
            'stateChanged',
            this.handleInPageUIStateChange,
        )
        this.props.inPageUI.events.removeListener(
            'sidebarAction',
            this.handleExternalAction,
        )
    }

    private getDocument(): Document {
        const containerNode = ReactDOM.findDOMNode(this)
        return containerNode.getRootNode() as Document
    }

    private ensureAnnotationIsVisible(url: string) {
        const annotationBoxNode = this.getDocument().getElementById(url)

        if (!annotationBoxNode) {
            return
        }

        annotationBoxNode.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
        })
    }

    private activateAnnotation(url: string) {
        this.processEvent('setActiveAnnotationUrl', url)
        this.ensureAnnotationIsVisible(url)
    }

    handleClickOutside = (e) => {
        if (this.props.onClickOutside) {
            return this.props.onClickOutside(e)
        }

        // Do not close the sidebar if clicked on a highlight in the page
        if (e.target?.dataset?.annotation) {
            return
        }

        if (this.state.state === 'visible') {
            this.hideSidebar()
        }
    }

    handleInPageUIStateChange: InPageUIEvents['stateChanged'] = ({
        changes,
    }) => {
        if ('sidebar' in changes) {
            if (changes.sidebar) {
                this.showSidebar()
            } else {
                this.hideSidebar()
            }
        }
    }

    showSidebar = () => {
        this.processEvent('show', null)
    }

    hideSidebar = () => {
        this.processEvent('hide', null)
        this.props.inPageUI.hideRibbon()
        this.props.inPageUI.hideSidebar()
    }

    handleExternalAction = (event: SidebarActionOptions) => {
        if (event.action === 'annotate' || event.action === 'comment') {
            this.processEvent('addNewPageComment', null)
            if (event.anchor) {
                this.processEvent('setNewPageCommentAnchor', {
                    anchor: event.anchor,
                })
            }
        }
        if (event.action === 'show_annotation') {
            this.activateAnnotation(event.annotationUrl)
        }
        this.forceUpdate()
    }

    render() {
        const createAnnotationEventHandlers = (
            context: 'pageAnnotations' | 'searchResults',
        ) => {
            return {
                handleAnnotationTagClick: (annotationUrl, tag) => {},
                handleAnnotationModeSwitch: (annotationUrl, mode) =>
                    this.processEvent('switchAnnotationMode', {
                        context,
                        annotationUrl,
                        mode,
                    }),
                handleGoToAnnotation: (annotationUrl) =>
                    this.processEvent('goToAnnotationInPage', {
                        context,
                        annotationUrl,
                    }),
                handleMouseEnter: (annotationUrl) =>
                    this.processEvent('annotationMouseEnter', {
                        context,
                        annotationUrl,
                    }),
                handleMouseLeave: (annotationUrl) =>
                    this.processEvent('annotationMouseLeave', {
                        context,
                        annotationUrl,
                    }),
                handleEditAnnotation: (
                    url: string,
                    comment: string,
                    tags: string[],
                ) =>
                    this.processEvent('editAnnotation', {
                        context,
                        annotationUrl: url,
                        comment,
                        tags,
                    }),
                handleDeleteAnnotation: (annotationUrl) =>
                    this.processEvent('deleteAnnotation', {
                        context,
                        annotationUrl,
                    }),
                handleBookmarkToggle: (annotationUrl) =>
                    this.processEvent('toggleAnnotationBookmark', {
                        context,
                        annotationUrl,
                    }),
            }
        }

        const tagsEventProps = {
            fetchInitialTagSuggestions: () =>
                this.props.tags.fetchInitialTagSuggestions(),
            queryTagSuggestions: (query: string) =>
                this.props.tags.searchForTagSuggestions({ query }),
        }
        return (
            <Sidebar
                loadState={this.state.loadState}
                searchLoadState={this.state.primarySearchState}
                env={this.props.env}
                pageAnnotations={{
                    env: this.props.env,
                    highlighter: this.props.highlighter,
                    needsWaypoint:
                        this.state.showAnnotsForPage == null &&
                        this.state.primarySearchState !== 'running' &&
                        !this.state.noResults,
                    annotations: this.state.annotations,
                    annotationModes: this.state.annotationModes.pageAnnotations,
                    activeAnnotationUrl: this.state.activeAnnotationUrl,
                    hoverAnnotationUrl: this.state.hoverAnnotationUrl
                        .pageAnnotations,
                    appendLoader: false,
                    annotationEventHandlers: createAnnotationEventHandlers(
                        'pageAnnotations',
                    ),
                    handleScrollPagination: () => {
                        this.processEvent('paginateSearch', null)
                    },
                    showCongratsMessage: this.state.showCongratsMessage,
                    tagsEventProps,
                }}
                highlighter={this.props.highlighter}
                isOpen={this.state.state === 'visible'}
                showCommentBox={this.state.showCommentBox}
                searchValue={this.state.searchValue}
                pageInfo={{
                    page: this.state.showAnnotsForPage,
                    resetPage: () =>
                        this.processEvent('resetPageAnnotationsView', null),
                }}
                pageType={this.state.pageType}
                showFiltersSidebar={this.state.showFiltersSidebar}
                showSocialSearch={false}
                closeSidebar={this.hideSidebar}
                handleAddPageCommentBtnClick={() =>
                    this.processEvent('addNewPageComment', null)
                }
                onQueryEnter={(searchQuery) =>
                    this.processEvent('enterSearchQuery', { searchQuery })
                }
                onQueryChange={(searchQuery) => {
                    this.processEvent('changeSearchQuery', { searchQuery })
                }}
                onShowFiltersSidebarChange={() => {}}
                onOpenSettings={() => {}}
                clearAllFilters={() => {}}
                // Subcomponents
                commentBox={{
                    ...this.state.commentBox,
                    env: this.props.env,
                    isSocialPost: false,
                    form: {
                        env: this.props.env,
                        ...this.state.commentBox.form,
                        handleCommentTextChange: (comment: string) =>
                            this.processEvent('changePageCommentText', {
                                comment,
                            }),
                        cancelComment: () =>
                            this.processEvent('cancelNewPageComment', null),
                        toggleBookmark: () =>
                            this.processEvent(
                                'toggleNewPageCommentBookmark',
                                null,
                            ),
                        toggleTagPicker: () =>
                            this.processEvent(
                                'toggleNewPageCommentTagPicker',
                                null,
                            ),
                        updateTags: (args) =>
                            this.processEvent('updateTagsForNewComment', args),
                        ...tagsEventProps,
                    },
                    saveComment: (
                        anchor: Anchor,
                        commentText: string,
                        tags: string[],
                        bookmarked: boolean,
                    ) =>
                        this.processEvent('saveNewPageComment', {
                            anchor,
                            commentText,
                            tags,
                            bookmarked,
                        }),
                    closeComments: () => {
                        // .log('close comments')
                    },
                    // this.processEvent('closeComments', null),
                }}
                resultsContainer={{
                    isBetaEnabled: false,
                    needsWaypoint:
                        this.state.primarySearchState !== 'running' &&
                        this.state.secondarySearchState !== 'running' &&
                        !this.state.noResults,
                    noResults:
                        this.state.searchResultSkip === 0 &&
                        this.state.noResults,
                    isBadTerm: this.state.isBadTerm,
                    areAnnotationsExpanded: this.state.allAnnotationsExpanded,
                    shouldShowCount: this.state.shouldShowCount,
                    isInvalidSearch: this.state.isInvalidSearch,
                    totalResultCount: this.state.totalResultCount,
                    toggleAreAnnotationsExpanded: (
                        e: React.SyntheticEvent,
                    ) => {},

                    isPaginating: this.state.secondarySearchState !== 'success',
                    isNewSearchLoading:
                        this.state.primarySearchState !== 'success',
                    isListFilterActive: this.state.isListFilterActive,
                    isTermsSearch: this.state.searchValue.length > 0,
                    resultsByUrl: this.state.resultsByUrl,
                    resultsClusteredByDay:
                        this.state.searchType === 'notes' &&
                        this.state.pageType === 'all',
                    annotsByDay: this.state.annotsByDay,
                    isSocialSearch: this.state.isSocialSearch,
                    highlighter: this.props.highlighter,
                    annotationModes: this.state.annotationModes.searchResults,
                    annotationEventHandlers: createAnnotationEventHandlers(
                        'searchResults',
                    ),
                    pageDeleteProps: {
                        pageUrlToDelete: this.state.deletePageConfirm
                            .pageUrlToDelete,
                        handleDeletePage: () =>
                            this.processEvent('deletePage', null),
                        handleDeletePageModalClose: () =>
                            this.processEvent('closeDeletePageModal', null),
                    },
                    resetUrlDragged: () => {},
                    resetActiveTagIndex: () => {},
                    setUrlDragged: (url: string) => {},
                    updateTags: (url: string) => (args) =>
                        this.processEvent('updateTagsForResult', {
                            url,
                            ...args,
                        }),
                    updateLists: (url: string) => (args) =>
                        this.processEvent('updateListsForPageResult', {
                            url,
                            ...args,
                        }),
                    handlePillClick: (tag: string) => () => {
                        // console.log('handlePillClick')
                    },
                    handleTagBtnClick: (result) => {
                        this.processEvent('togglePageTagPicker', {
                            pageUrl: result.url,
                        })
                    },
                    handleListBtnClick: (result) => {
                        this.processEvent('togglePageListPicker', {
                            pageUrl: result.url,
                        })
                    },
                    handleCommentBtnClick: (result) => {
                        this.processEvent('togglePageAnnotationsView', {
                            pageUrl: result.url,
                            pageTitle: result.title,
                        })
                    },
                    handleCrossRibbonClick: () => {
                        // console.log('handleCrossRibbonClick')
                    },
                    handleScrollPagination: () => {
                        this.processEvent('paginateSearch', null)
                    },
                    handleToggleBm: (result) => {
                        this.processEvent('togglePageBookmark', {
                            pageUrl: result.url,
                        })
                    },
                    handleTrashBtnClick: (result) => {
                        this.processEvent('showPageDeleteConfirm', {
                            pageUrl: result.url,
                        })
                    },
                    ...tagsEventProps,
                    fetchInitialListSuggestions: () =>
                        this.props.customLists.fetchInitialListSuggestions(),
                    queryListSuggestions: (query: string) =>
                        this.props.customLists.searchForListSuggestions({
                            query,
                        }),
                }}
                searchTypeSwitch={{
                    showAnnotationsForOtherPage:
                        this.state.showAnnotsForPage != null,
                    allAnnotationsExpanded: this.state.allAnnotationsExpanded,
                    resultsSearchType: this.state.searchType,
                    searchType: this.state.searchType,
                    pageType: this.state.pageType,
                    pageCount: this.state.pageCount,
                    annotCount: this.state.annotCount,
                    handleAllAnnotationsFoldToggle: () =>
                        this.processEvent('toggleAllAnnotationsFold', null),
                    handleSwitch: (changes) =>
                        this.processEvent('switchSearch', { changes }),
                    setAnnotationsExpanded: (value: boolean) =>
                        this.processEvent('setAnnotationsExpanded', { value }),
                    handlePageTypeToggle: () =>
                        this.processEvent('togglePageType', null),
                    isOverview: this.props.env === 'overview',
                    handleAddPageCommentBtnClick: () =>
                        this.processEvent('addNewPageComment', null),
                    showSocialSearch: false,
                }}
                filtersSidebar={{
                    env: this.props.env,
                    showClearFiltersBtn: this.state.showClearFiltersBtn,
                    isSocialSearch: this.state.isSocialSearch,
                    clearAllFilters: () =>
                        this.processEvent('clearAllFilters', null),
                    fetchSuggestedTags: () =>
                        this.processEvent('fetchSuggestedTags', null),
                    fetchSuggestedDomains: () => () =>
                        this.processEvent('fetchSuggestedDomains', null),
                    fetchSuggestedUsers: () => {},
                    fetchSuggestedHashtags: () => {},
                    resetFilterPopups: () =>
                        this.processEvent('resetFiterPopups', null),
                    toggleShowFilters: () =>
                        this.processEvent('toggleShowFilters', null),
                }}
                topBar={{
                    env: this.props.env,
                    searchValue: this.state.searchValue,
                    showClearFiltersBtn: this.state.showClearFiltersBtn,
                    disableAddCommentBtn: this.state.showCommentBox,
                }}
            />
        )
    }
}

export default onClickOutside<typeof SidebarContainer, SidebarContainerProps>(
    SidebarContainer,
)
