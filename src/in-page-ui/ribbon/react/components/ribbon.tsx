import React, { Component, KeyboardEventHandler } from 'react'
import cx from 'classnames'
import qs from 'query-string'

import extractQueryFilters from 'src/util/nlp-time-filter'
import CommentBox from 'src/in-page-ui/components/comment-box/comment-box'
import { Tooltip, ButtonTooltip } from 'src/common-ui/components/'
import {
    shortcuts,
    ShortcutElData,
} from 'src/options/settings/keyboard-shortcuts'
import * as getKeyboardShortcutsState from 'src/in-page-ui/keyboard-shortcuts/content_script/detection'
import {
    KeyboardShortcuts,
    Shortcut,
} from 'src/in-page-ui/keyboard-shortcuts/types'
import SearchBox from './search-box'
import ExtraButtonsPanel from './extra-buttons-panel'
import { HighlightInteractionInterface } from 'src/highlighting/types'
import { RibbonSubcomponentProps } from './types'
import TagPicker from 'src/tags/ui/TagPicker'
import CollectionPicker from 'src/custom-lists/ui/CollectionPicker'

const styles = require('./ribbon.css')

export interface Props extends RibbonSubcomponentProps {
    getRemoteFunction: (name: string) => (...args: any[]) => Promise<any>
    setRef?: (el: HTMLElement) => void
    tabId: number
    isExpanded: boolean
    isRibbonEnabled: boolean
    shortcutsData?: ShortcutElData[]
    showExtraButtons: boolean
    toggleShowExtraButtons: () => void
    handleRibbonToggle: () => void
    handleRemoveRibbon: () => void
    getUrl: () => string
    highlighter: Pick<HighlightInteractionInterface, 'removeHighlights'>
    hideOnMouseLeave?: boolean
}

interface State {
    shortcutsReady: boolean
}

export default class Ribbon extends Component<Props, State> {
    static defaultProps = { shortcutsData: shortcuts }

    private keyboardShortcuts: KeyboardShortcuts
    private shortcutsData: Map<string, ShortcutElData>
    private openOverviewTabRPC
    private openOptionsTabRPC

    state: State = { shortcutsReady: false }

    constructor(props: Props) {
        super(props)
        this.shortcutsData = new Map(
            props.shortcutsData.map((s) => [s.name, s]) as [
                string,
                ShortcutElData,
            ][],
        )
        this.openOverviewTabRPC = this.props.getRemoteFunction(
            'openOverviewTab',
        )
        this.openOptionsTabRPC = this.props.getRemoteFunction('openOptionsTab')
    }

    async componentDidMount() {
        this.keyboardShortcuts = await getKeyboardShortcutsState.getKeyboardShortcutsState()
        this.setState(() => ({ shortcutsReady: true }))
    }

    private handleSearchEnterPress: KeyboardEventHandler<HTMLInputElement> = (
        event,
    ) => {
        const queryFilters = extractQueryFilters(this.props.search.searchValue)
        const queryParams = qs.stringify(queryFilters)

        this.openOverviewTabRPC(queryParams)
        this.props.search.setShowSearchBox(false)
        this.props.search.setSearchValue('')
    }

    private handleCommentIconBtnClick = () => {
        if (this.props.sidebar.isSidebarOpen) {
            this.props.sidebar.setShowSidebarCommentBox(true)
            return
        }
        this.props.commentBox.setShowCommentBox(
            !this.props.commentBox.showCommentBox,
        )
    }

    private getTooltipText(name: string): string {
        const elData = this.shortcutsData.get(name)
        const short: Shortcut = this.keyboardShortcuts[name]

        if (!elData) {
            return ''
        }

        let source = elData.tooltip

        if (['createBookmark', 'toggleSidebar'].includes(name)) {
            source = this.props.bookmark.isBookmarked
                ? elData.toggleOff
                : elData.toggleOn
        }

        return short.shortcut && short.enabled
            ? `${source} (${short.shortcut})`
            : source
    }

    private hideTagPicker = () => this.props.tagging.setShowTagsPicker(false)
    private hideListPicker = () => this.props.lists.setShowListsPicker(false)

    private renderTagsManager() {
        return (
            <TagPicker
                onUpdateEntrySelection={this.props.tagging.updateTags}
                queryEntries={this.props.tagging.queryTagSuggestions}
                actOnAllTabs={this.props.tagging.tagAllTabs}
                initialSelectedEntries={
                    this.props.tagging.fetchInitialTagSelections
                }
                loadDefaultSuggestions={
                    this.props.tagging.fetchInitialTagSuggestions
                }
                onEscapeKeyDown={this.hideTagPicker}
                onClickOutside={this.hideTagPicker}
            />
        )
    }

    private renderCollectionsManager() {
        return (
            <CollectionPicker
                onUpdateEntrySelection={this.props.lists.updateLists}
                queryEntries={this.props.lists.queryListSuggestions}
                actOnAllTabs={this.props.lists.listAllTabs}
                initialSelectedEntries={
                    this.props.lists.fetchInitialListSelections
                }
                loadDefaultSuggestions={
                    this.props.lists.fetchInitialListSuggestions
                }
                onEscapeKeyDown={this.hideListPicker}
                onClickOutside={this.hideListPicker}
            />
        )
    }

    private renderExtraButtons() {
        if (!this.props.showExtraButtons) {
            return
        }

        return (
            <ExtraButtonsPanel
                closePanel={() => this.props.toggleShowExtraButtons()}
            >
                <div
                    onClick={() => {
                        this.props.handleRibbonToggle()
                        this.props.sidebar.closeSidebar()
                    }}
                    className={styles.extraButtonRow}
                >
                    <div
                        className={cx(
                            styles.button,
                            styles.ribbonIcon,
                            styles.extraButtons,
                            {
                                [styles.ribbonOn]: this.props.isRibbonEnabled,
                                [styles.ribbonOff]: !this.props.isRibbonEnabled,
                            },
                        )}
                    />
                    {this.props.isRibbonEnabled ? (
                        <div className={styles.extraButtonsText}>
                            Disable Sidebar
                        </div>
                    ) : (
                        <div className={styles.extraButtonsText}>
                            Enable Sidebar
                        </div>
                    )}
                </div>

                <div
                    onClick={this.props.highlights.handleHighlightsToggle}
                    className={styles.extraButtonRow}
                >
                    <div
                        className={cx(
                            styles.button,
                            styles.ribbonIcon,
                            styles.extraButtons,
                            {
                                [styles.highlightsOn]: this.props.highlights
                                    .areHighlightsEnabled,
                                [styles.highlightsOff]: !this.props.highlights
                                    .areHighlightsEnabled,
                            },
                        )}
                    />
                    {this.props.highlights.areHighlightsEnabled ? (
                        <div className={styles.extraButtonsText}>
                            Hide Highlights
                        </div>
                    ) : (
                        <div className={styles.extraButtonsText}>
                            Show Highlights
                        </div>
                    )}
                </div>

                <div
                    onClick={this.props.tooltip.handleTooltipToggle}
                    className={styles.extraButtonRow}
                >
                    <div
                        className={cx(
                            styles.extraButtons,
                            styles.button,
                            styles.ribbonIcon,
                            {
                                [styles.tooltipOn]: this.props.tooltip
                                    .isTooltipEnabled,
                                [styles.tooltipOff]: !this.props.tooltip
                                    .isTooltipEnabled,
                            },
                        )}
                    />
                    {this.props.tooltip.isTooltipEnabled ? (
                        <div className={styles.extraButtonsText}>
                            Hide Highlighter
                        </div>
                    ) : (
                        <div className={styles.extraButtonsText}>
                            Show Highlighter
                        </div>
                    )}
                </div>

                <div
                    onClick={() => this.props.pausing.handlePauseToggle()}
                    className={styles.extraButtonRow}
                >
                    <div
                        className={cx(styles.button, styles.extraButtons, {
                            [styles.playIcon]: this.props.pausing.isPaused,
                            [styles.pauseIcon]: !this.props.pausing.isPaused,
                        })}
                    />
                    {this.props.pausing.isPaused ? (
                        <div className={styles.extraButtonsText}>
                            Continue indexing
                        </div>
                    ) : (
                        <div className={styles.extraButtonsText}>
                            Pause Indexing
                        </div>
                    )}
                </div>

                <div
                    onClick={() => this.openOptionsTabRPC('settings')}
                    className={styles.extraButtonRow}
                >
                    <div
                        className={cx(
                            styles.button,
                            styles.settings,
                            styles.extraButtons,
                        )}
                    />
                    <div className={styles.extraButtonsText}>Open Settings</div>
                </div>
            </ExtraButtonsPanel>
        )
    }

    render() {
        if (!this.state.shortcutsReady) {
            return false
        }

        return (
            <div
                className={cx(styles.ribbon, {
                    [styles.ribbonExpanded]: this.props.isExpanded,
                    [styles.ribbonSidebarOpen]: this.props.sidebar
                        .isSidebarOpen,
                })}
            >
                <div
                    ref={this.props.setRef}
                    className={cx(styles.innerRibbon, {
                        [styles.innerRibbonExpanded]: this.props.isExpanded,
                        [styles.innerRibbonSidebarOpen]: this.props.sidebar
                            .isSidebarOpen,
                    })}
                >
                    {(this.props.isExpanded ||
                        this.props.sidebar.isSidebarOpen) && (
                        <React.Fragment>
                            <div className={styles.generalActions}>
                                <ButtonTooltip
                                    tooltipText={'Close Toolbar Once.'}
                                    position="left"
                                >
                                    <button
                                        className={cx(
                                            styles.button,
                                            styles.cancel,
                                        )}
                                        onClick={() =>
                                            this.props.handleRemoveRibbon()
                                        }
                                    />
                                </ButtonTooltip>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'toggleSidebar',
                                    )}
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.arrow]: !this.props.sidebar
                                                .isSidebarOpen,
                                            [styles.arrowReverse]: this.props
                                                .sidebar.isSidebarOpen,
                                        })}
                                        onClick={() =>
                                            !this.props.sidebar.isSidebarOpen
                                                ? this.props.sidebar.openSidebar(
                                                      {},
                                                  )
                                                : this.props.sidebar.closeSidebar()
                                        }
                                    />
                                </ButtonTooltip>
                                <ButtonTooltip
                                    tooltipText="Open Memex Dashboard"
                                    position="left"
                                >
                                    <div
                                        onClick={() =>
                                            this.openOverviewTabRPC()
                                        }
                                        className={cx(
                                            styles.button,
                                            styles.search,
                                        )}
                                    />
                                </ButtonTooltip>
                                {/*<ButtonTooltip
                                    tooltipText={'Search Memex via Dashboard'}
                                    position="left"
                                >
                                    <div
                                        className={cx(
                                            styles.button,
                                            styles.search,
                                        )}
                                        onClick={() => {
                                            this.props.search.setShowSearchBox(
                                                !this.props.search
                                                    .showSearchBox,
                                            )
                                        }}
                                    />
                                    {this.props.search.showSearchBox && (
                                        <Tooltip
                                            position="left"
                                            itemClass={styles.tooltipLeft}
                                            toolTipType="searchBar"
                                        >
                                            <SearchBox
                                                {...this.props.search}
                                                onSearchEnterPress={
                                                    this.handleSearchEnterPress
                                                }
                                                onOutsideClick={() =>
                                                    this.props.search.setShowSearchBox(
                                                        false,
                                                    )
                                                }
                                            />
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>*/}
                            </div>
                            <div className={styles.horizontalLine} />
                            <div className={styles.pageActions}>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'createBookmark',
                                    )}
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.bookmark]: this.props
                                                .bookmark.isBookmarked,
                                            [styles.notBookmark]: !this.props
                                                .bookmark.isBookmarked,
                                        })}
                                        onClick={() =>
                                            this.props.bookmark.toggleBookmark()
                                        }
                                    />
                                </ButtonTooltip>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'addComment',
                                    )}
                                    position="left"
                                >
                                    <div
                                        className={cx(
                                            styles.button,
                                            styles.comments, {
                                                [styles.saveIcon]: this.props.commentBox.isCommentSaved
                                            }
                                        )}
                                        onClick={this.handleCommentIconBtnClick}
                                    />
                                    {this.props.commentBox.showCommentBox && (
                                        <Tooltip position="left">
                                            {
                                                <CommentBox
                                                    env="inpage"
                                                    closeComments={() =>
                                                        this.props.commentBox.setShowCommentBox(
                                                            false,
                                                        )
                                                    }
                                                    saveComment={
                                                        this.props.commentBox
                                                            .saveComment
                                                    }
                                                    form={{
                                                        env: 'inpage',
                                                        ...this.props
                                                            .commentBox,
                                                        toggleTagPicker: this
                                                            .props.commentBox
                                                            .toggleCommentBoxTagPicker,
                                                        toggleBookmark: this
                                                            .props.commentBox
                                                            .toggleCommentBoxBookmark,
                                                        updateTags: this.props
                                                            .commentBox
                                                            .updateCommentTags,
                                                    }}
                                                />
                                            }
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                                <ButtonTooltip
                                    tooltipText={this.getTooltipText('addTag')}
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.tagFull]: this.props.tagging
                                                .pageHasTags,
                                            [styles.tag]: !this.props.tagging
                                                .pageHasTags,
                                        })}
                                        onClick={() =>
                                            this.props.tagging.setShowTagsPicker(
                                                !this.props.tagging
                                                    .showTagsPicker,
                                            )
                                        }
                                    />
                                    {this.props.tagging.showTagsPicker && (
                                        <Tooltip position="left">
                                            {this.renderTagsManager()}
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>

                                <ButtonTooltip
                                    tooltipText={this.getTooltipText(
                                        'addToCollection',
                                    )}
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.collectionsFull]: this.props
                                                .lists.pageBelongsToList,
                                            [styles.collections]: !this.props
                                                .lists.pageBelongsToList,
                                        })}
                                        onClick={() =>
                                            this.props.lists.setShowListsPicker(
                                                !this.props.lists
                                                    .showListsPicker,
                                            )
                                        }
                                    />
                                    {this.props.lists.showListsPicker && (
                                        <Tooltip position="left">
                                            {this.renderCollectionsManager()}
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                                <ButtonTooltip
                                    tooltipText="More Settings"
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.playIcon]: this.props
                                                .pausing.isPaused,
                                            [styles.showMore]: !this.props
                                                .pausing.isPaused,
                                        })}
                                        onClick={() =>
                                            this.props.toggleShowExtraButtons()
                                        }
                                    />
                                    {this.props.showExtraButtons && (
                                        <Tooltip position="leftSmallWidth">
                                            {this.renderExtraButtons()}
                                        </Tooltip>
                                    )}
                                </ButtonTooltip>
                            </div>
                            {/*
                            <div className={styles.settingsActions}>
                                <ButtonTooltip
                                    tooltipText="Disable this Toolbar (You can still use keyboard shortcuts)"
                                    position="left"
                                >
                                    <div
                                        className={cx(
                                            styles.button,
                                            styles.ribbonIcon,
                                            {
                                                [styles.ribbonOn]: this.props
                                                    .isRibbonEnabled,
                                                [styles.ribbonOff]: !this.props
                                                    .isRibbonEnabled,
                                            },
                                        )}
                                        onClick={() => {
                                            this.props.handleRibbonToggle()
                                            this.props.sidebar.closeSidebar()
                                        }}
                                    />
                                </ButtonTooltip>

                                <ButtonTooltip
                                    tooltipText="Toggle highlights"
                                    position="left"
                                >
                                    <div
                                        onClick={
                                            this.props.highlights
                                                .handleHighlightsToggle
                                        }
                                        className={cx(
                                            styles.button,
                                            styles.ribbonIcon,
                                            {
                                                [styles.highlightsOn]: this
                                                    .props.highlights
                                                    .areHighlightsEnabled,
                                                [styles.highlightsOff]: !this
                                                    .props.highlights
                                                    .areHighlightsEnabled,
                                            },
                                        )}
                                    />
                                </ButtonTooltip>

                                <ButtonTooltip
                                    tooltipText="Toggle tooltip"
                                    position="left"
                                >
                                    <div
                                        onClick={
                                            this.props.tooltip
                                                .handleTooltipToggle
                                        }
                                        className={cx(
                                            styles.button,
                                            styles.ribbonIcon,
                                            {
                                                [styles.tooltipOn]: this.props
                                                    .tooltip.isTooltipEnabled,
                                                [styles.tooltipOff]: !this.props
                                                    .tooltip.isTooltipEnabled,
                                            },
                                        )}
                                    />
                                </ButtonTooltip>

                                <ButtonTooltip
                                    tooltipText="Pause indexing"
                                    position="left"
                                >
                                    <div
                                        className={cx(styles.button, {
                                            [styles.playIcon]: this.props
                                                .pausing.isPaused,
                                            [styles.pauseIcon]: !this.props
                                                .pausing.isPaused,
                                        })}
                                        onClick={() =>
                                            this.props.pausing.handlePauseToggle()
                                        }
                                    />
                                </ButtonTooltip>

                                <ButtonTooltip
                                    tooltipText="Settings"
                                    position="left"
                                >
                                    <div
                                        className={cx(
                                            styles.button,
                                            styles.settings,
                                        )}
                                        onClick={() =>
                                            this.openOptionsTabRPC('settings')
                                        }
                                    />
                                </ButtonTooltip> */}
                            {/* </div> */}
                        </React.Fragment>
                    )}
                </div>
            </div>
        )
    }
}
