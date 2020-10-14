import * as React from 'react'
import {
    RibbonContainerOptions,
    RibbonContainerState,
    RibbonContainerLogic,
    RibbonContainerEvents,
} from './logic'
import { StatefulUIElement } from 'src/util/ui-logic'
import Ribbon from '../../components/ribbon'
import { InPageUIRibbonAction } from 'src/in-page-ui/shared-state/types'
import { AnnotationsSidebarProps } from 'src/sidebar/annotations-sidebar/components/AnnotationsSidebar'

export interface RibbonContainerProps extends RibbonContainerOptions {
    state: 'visible' | 'hidden'
    isSidebarOpen: boolean
    setRef?: (el: HTMLElement) => void
}

export default class RibbonContainer extends StatefulUIElement<
    RibbonContainerProps,
    RibbonContainerState,
    RibbonContainerEvents
> {
    private ribbonRef = React.createRef<Ribbon>()

    constructor(props) {
        super(
            props,
            new RibbonContainerLogic({
                ...props,
                focusCreateForm: () =>
                    this.ribbonRef?.current?.focusCreateForm(),
            }),
        )
    }

    componentDidMount() {
        super.componentDidMount()
        this.props.inPageUI.events.on('ribbonAction', this.handleExternalAction)
    }

    componentWillUnmount() {
        super.componentWillUnmount()
        this.props.inPageUI.events.removeListener(
            'ribbonAction',
            this.handleExternalAction,
        )
    }

    componentDidUpdate(prevProps: RibbonContainerProps) {
        const { currentTab } = this.props

        if (currentTab.url !== prevProps.currentTab.url) {
            this.processEvent('hydrateStateFromDB', { url: currentTab.url })
        }
    }

    private handleSidebarOpen = () => {
        if (this.state.commentBox.showCommentBox) {
            this.processEvent('cancelComment', null)
        }

        this.props.inPageUI.showSidebar({
            action: 'comment',
            annotationData: {
                commentText: this.state.commentBox.commentText,
                tags: this.state.commentBox.tags,
            },
        })
    }

    protected getTagProps(): AnnotationsSidebarProps['annotationTagProps'] {
        return {
            loadDefaultSuggestions: () =>
                this.props.tags.fetchInitialTagSuggestions(),
            queryEntries: (query) =>
                this.props.tags.searchForTagSuggestions({ query }),
        }
    }

    handleExternalAction = (event: { action: InPageUIRibbonAction }) => {
        if (event.action === 'comment') {
            this.processEvent('setShowCommentBox', { value: true })
        } else if (event.action === 'bookmark') {
            this.processEvent('toggleBookmark', null)
            this.props.setRibbonShouldAutoHide(true)
        } else if (event.action === 'list') {
            this.processEvent('setShowListsPicker', { value: true })
        } else if (event.action === 'tag') {
            this.processEvent('setShowTagsPicker', { value: true })
        }
    }

    render() {
        return (
            <Ribbon
                ref={this.ribbonRef}
                setRef={this.props.setRef}
                toggleShowExtraButtons={() => {
                    this.processEvent('toggleShowExtraButtons', null)
                }}
                showExtraButtons={this.state.areExtraButtonsShown}
                isExpanded={this.props.state === 'visible'}
                getRemoteFunction={this.props.getRemoteFunction}
                // annotationsManager={this.props.annotationsManager}
                highlighter={this.props.highlighter}
                isRibbonEnabled={this.state.isRibbonEnabled}
                handleRemoveRibbon={() => this.props.inPageUI.removeRibbon()}
                getUrl={() => this.props.currentTab.url}
                tabId={this.props.currentTab.id}
                handleRibbonToggle={() =>
                    this.processEvent('toggleRibbon', null)
                }
                highlights={{
                    ...this.state.highlights,
                    handleHighlightsToggle: () =>
                        this.processEvent('handleHighlightsToggle', null),
                }}
                tooltip={{
                    ...this.state.tooltip,
                    handleTooltipToggle: () =>
                        this.processEvent('handleTooltipToggle', null),
                }}
                sidebar={{
                    isSidebarOpen: this.props.isSidebarOpen,
                    setShowSidebarCommentBox: () =>
                        this.props.inPageUI.showSidebar({ action: 'comment' }),
                    openSidebar: this.handleSidebarOpen,
                    closeSidebar: () => this.props.inPageUI.hideSidebar(),
                }}
                commentBox={{
                    ...this.state.commentBox,
                    saveComment: () => this.processEvent('saveComment', null),
                    cancelComment: () =>
                        this.processEvent('cancelComment', null),
                    setShowCommentBox: (value) =>
                        this.processEvent('setShowCommentBox', { value }),
                    changeComment: (value) =>
                        this.processEvent('changeComment', { value }),
                    updateCommentBoxTags: (value) =>
                        this.processEvent('updateCommentBoxTags', { value }),
                }}
                bookmark={{
                    ...this.state.bookmark,
                    toggleBookmark: () =>
                        this.processEvent('toggleBookmark', null),
                }}
                tagging={{
                    ...this.state.tagging,
                    setShowTagsPicker: (value) =>
                        this.processEvent('setShowTagsPicker', { value }),
                    tagAllTabs: (value) =>
                        this.processEvent('tagAllTabs', { value }),
                    updateTags: (value) =>
                        this.processEvent('updateTags', { value }),
                    fetchInitialTagSuggestions: () =>
                        this.props.tags.fetchInitialTagSuggestions(),
                    fetchInitialTagSelections: () =>
                        this.props.tags.fetchPageTags({
                            url: this.props.currentTab.url,
                        }),
                    queryTagSuggestions: (query: string) =>
                        this.props.tags.searchForTagSuggestions({ query }),
                }}
                lists={{
                    ...this.state.lists,
                    listAllTabs: (value) =>
                        this.processEvent('listAllTabs', { value }),
                    updateLists: (value) =>
                        this.processEvent('updateLists', { value }),
                    setShowListsPicker: (value: false) =>
                        this.processEvent('setShowListsPicker', {
                            value,
                        }),
                    fetchInitialListSuggestions: () =>
                        this.props.customLists.fetchInitialListSuggestions(),
                    fetchInitialListSelections: () =>
                        this.props.customLists.fetchPageLists({
                            url: this.props.currentTab.url,
                        }),
                    queryListSuggestions: (query: string) =>
                        this.props.customLists.searchForListSuggestions({
                            query,
                        }),
                }}
                search={{
                    ...this.state.search,
                    setShowSearchBox: (value: false) =>
                        this.processEvent('setShowSearchBox', { value }),
                    setSearchValue: (value: string) =>
                        this.processEvent('setSearchValue', { value }),
                }}
                pausing={{
                    ...this.state.pausing,
                    handlePauseToggle: () =>
                        this.processEvent('handlePauseToggle', null),
                }}
            />
        )
    }
}
