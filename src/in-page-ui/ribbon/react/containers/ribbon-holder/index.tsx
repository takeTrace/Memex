import * as React from 'react'
import cx from 'classnames'
import {
    RibbonHolderDependencies,
    RibbonHolderState,
    RibbonHolderLogic,
    RibbonHolderEvents,
} from './logic'
import { StatefulUIElement } from 'src/util/ui-logic'
import RibbonContainer from '../ribbon'
import { InPageUIEvents } from 'src/in-page-ui/shared-state/types'
const styles = require('./styles.css')

const RIBBON_HIDE_TIMEOUT = 700

export interface RibbonHolderProps extends RibbonHolderDependencies {}

export default class RibbonHolder extends StatefulUIElement<
    RibbonHolderProps,
    RibbonHolderState,
    RibbonHolderEvents
> {
    shouldHide = false
    isAnyPopupOpen = false
    hideTimeout?: ReturnType<typeof setTimeout>
    ref: HTMLElement

    constructor(props) {
        super(props, new RibbonHolderLogic(props))
    }

    componentDidMount() {
        super.componentDidMount()
        this.props.inPageUI.events.on(
            'stateChanged',
            this.handleInPageUIStateChange,
        )
    }

    componentWillUnmount() {
        clearTimeout(this.hideTimeout)
        super.componentWillUnmount()
        this.removeEventListeners()
        this.props.inPageUI.events.removeListener(
            'stateChanged',
            this.handleInPageUIStateChange,
        )
    }

    private setAutoHide = (shouldAutoHide: boolean) => {
        this.isAnyPopupOpen = !shouldAutoHide

        if (shouldAutoHide) {
            this.hideRibbonWithTimeout()
        }
    }

    handleInPageUIStateChange: InPageUIEvents['stateChanged'] = ({
        changes,
    }) => {
        if ('ribbon' in changes) {
            if (changes.ribbon) {
                this.showRibbon()
            } else {
                this.hideRibbon()
            }
        }
    }

    handleRef = (ref: HTMLDivElement) => {
        if (ref) {
            this.ref = ref
            this.addEventListeners()
        }
    }

    addEventListeners() {
        this.ref.addEventListener('mouseenter', this.handleMouseEnter)
        this.ref.addEventListener('mouseleave', this.hideRibbonWithTimeout)
    }

    removeEventListeners() {
        this.ref.removeEventListener('mouseenter', this.handleMouseEnter)
        this.ref.removeEventListener('mouseleave', this.hideRibbonWithTimeout)
    }

    handleMouseEnter = () => {
        this.shouldHide = false
        this.props.inPageUI.showRibbon()
    }

    showRibbon = () => {
        this.processEvent('show', null)
    }

    hideRibbonWithTimeout = () => {
        this.shouldHide = true
        if (this.hideTimeout) {
            return
        }

        this.hideTimeout = setTimeout(() => {
            delete this.hideTimeout
            if (this.shouldHide && !this.isAnyPopupOpen) {
                this.props.inPageUI.hideRibbon()
            }
        }, RIBBON_HIDE_TIMEOUT)
    }

    hideRibbon = () => {
        this.processEvent('hide', null)
    }

    render() {
        return (
            <div
                ref={this.handleRef}
                className={cx(styles.holder, {
                    [styles.withSidebar]: this.state.isSidebarOpen,
                })}
            >
                <RibbonContainer
                    {...this.props.containerDependencies}
                    state={this.state.state}
                    inPageUI={this.props.inPageUI}
                    isSidebarOpen={this.state.isSidebarOpen}
                    openSidebar={() => this.props.inPageUI.showSidebar()}
                    closeSidebar={() => this.props.inPageUI.hideSidebar()}
                    setRibbonShouldAutoHide={this.setAutoHide}
                />
            </div>
        )
    }
}
