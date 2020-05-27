import * as React from 'react'
import { ClickHandler } from '../../sidebar/react/types'
import { Tooltip } from 'src/common-ui/components'
import cx from 'classnames'
import TextInputControlled from 'src/common-ui/components/TextInputControlled'
import { browser } from 'webextension-polyfill-ts'
import TagPicker from 'src/tags/ui/TagPicker'
import { PickerUpdateHandler } from 'src/common-ui/GenericPicker/types'

const styles = require('./comment-box-form.css')

const tagEmpty = browser.extension.getURL('/img/tag_empty.svg')
const tagFull = browser.extension.getURL('/img/tag_full.svg')
const heartEmpty = browser.extension.getURL('/img/star_empty.svg')
const heartFull = browser.extension.getURL('/img/star_full.svg')

interface OwnProps {
    env?: 'inpage' | 'overview'
    tags: string[]
    commentText: string
    isCommentBookmarked: boolean
    handleCommentTextChange: (comment: string) => void
    saveComment: React.EventHandler<React.SyntheticEvent>
    cancelComment: ClickHandler<HTMLDivElement>
    toggleBookmark: ClickHandler<HTMLDivElement>
    toggleTagPicker: () => void
    queryTagSuggestions: (query: string) => Promise<string[]>
    fetchInitialTagSuggestions: () => Promise<string[]>
    updateTags: PickerUpdateHandler
}

interface CommentBoxFormStateProps {
    isTagInputActive: boolean
    showTagsPicker: boolean
}

export type CommentBoxFormProps = OwnProps & CommentBoxFormStateProps

class CommentBoxForm extends React.Component<CommentBoxFormProps> {
    /** Ref of the tag button element to focus on it when tabbing. */
    private tagBtnRef: HTMLElement
    private saveBtnRef: HTMLDivElement
    private cancelBtnRef: HTMLDivElement
    private bmBtnRef: HTMLDivElement

    async componentDidMount() {
        this.attachEventListeners()
    }

    componentWillUnmount() {
        this.removeEventListeners()
    }

    private attachEventListeners() {
        this.saveBtnRef.addEventListener('click', (e) => this.saveComment(e))
        this.cancelBtnRef.addEventListener('click', this.handleCancelBtnClick)
        this.bmBtnRef.addEventListener('click', this.handleBookmarkBtnClick)
        this.tagBtnRef.addEventListener('click', this.handleTagBtnClick)
    }

    private removeEventListeners() {
        this.saveBtnRef.removeEventListener('click', (e) => this.saveComment(e))
        this.cancelBtnRef.removeEventListener(
            'click',
            this.handleCancelBtnClick,
        )
        this.bmBtnRef.removeEventListener('click', this.handleBookmarkBtnClick)
        this.tagBtnRef.removeEventListener('click', this.handleTagBtnClick)
    }

    private setTagButtonRef = (ref: HTMLElement) => {
        this.tagBtnRef = ref
    }

    private handleTagBtnKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Tab') {
            this.setState({
                showTagsPicker: false,
            })
            this.tagBtnRef.focus()
        }
    }

    private handleTagBtnClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.props.toggleTagPicker()
    }

    private handleCancelBtnClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.props.cancelComment(e)
    }

    private handleBookmarkBtnClick = (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.props.toggleBookmark(e)
    }

    private saveComment = (e) => {
        this.props.saveComment(e)
    }

    setTagInputActive = (isTagInputActive: boolean) => {
        this.setState({ isTagInputActive })
    }

    renderTagsTooltip() {
        if (!this.props.showTagsPicker) {
            return null
        }

        return (
            <Tooltip position="bottomLeft">
                <TagPicker
                    queryEntries={this.props.queryTagSuggestions}
                    onUpdateEntrySelection={this.props.updateTags}
                    loadDefaultSuggestions={
                        this.props.fetchInitialTagSuggestions
                    }
                    onEscapeKeyDown={this.props.toggleTagPicker}
                />
            </Tooltip>
        )
    }

    onEnterSaveHandler = {
        test: (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
        handle: (e) => this.saveComment(e),
    }

    render() {
        return (
            <React.Fragment>
                <TextInputControlled
                    defaultValue={this.props.commentText}
                    onClick={() => {
                        this.setTagInputActive(false)
                        this.setState((state) => ({ showTagsPicker: false }))
                    }}
                    className={styles.textArea}
                    placeholder="Add a private note... (save with cmd/ctrl+enter)"
                    onChange={this.props.handleCommentTextChange}
                    specialHandlers={[this.onEnterSaveHandler]}
                />

                {/* Save and Cancel buttons. */}
                <div className={styles.footer}>
                    <div className={styles.interactions}>
                        <div
                            ref={this.setTagButtonRef}
                            className={styles.interactionsImgContainer}
                        >
                            <img
                                src={tagEmpty}
                                className={cx(styles.button, styles.tag)}
                            />
                        </div>
                        <div
                            ref={(ref) => (this.bmBtnRef = ref)}
                            className={styles.interactionsImgContainer}
                        >
                            {this.props.isCommentBookmarked ? (
                                <img
                                    src={heartFull}
                                    className={cx(
                                        styles.button,
                                        styles.bookmark,
                                    )}
                                />
                            ) : (
                                <img
                                    src={heartEmpty}
                                    className={cx(
                                        styles.button,
                                        styles.notbookmark,
                                    )}
                                />
                            )}
                        </div>
                    </div>
                    <div className={styles.confirmButtons}>
                        <div
                            ref={(ref) => (this.cancelBtnRef = ref)}
                            className={styles.cancelBtn}
                        >
                            Cancel
                        </div>
                        <div
                            className={styles.saveBtn}
                            ref={(ref) => (this.saveBtnRef = ref)}
                        >
                            Save
                        </div>
                    </div>
                </div>
                <span
                    className={styles.tagDropdown}
                    onKeyDown={this.handleTagBtnKeyDown}
                >
                    {this.renderTagsTooltip()}
                </span>
            </React.Fragment>
        )
    }
}

export default CommentBoxForm
