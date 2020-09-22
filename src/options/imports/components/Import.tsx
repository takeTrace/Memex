import React from 'react'

import AdvSettings from './AdvSettingsContainer'
import { IMPORT_TYPE } from '../constants'
import LoadingIndicator from 'src/common-ui/components/LoadingIndicator'

const settingsStyle = require('src/options/settings/components/settings.css')
const localStyles = require('./Import.css')

interface Props {
    isLoading: boolean
    loadingMsg?: string
    isStopped: boolean
    shouldRenderEsts: boolean
    shouldRenderProgress: boolean
    allowTypes: any
}

const Warning = ({ children }) => (
    <div className={localStyles.warning}>
        <img src="/img/caution.png" className={localStyles.icon} />{' '}
        <p className={localStyles.warningText}>{children}</p>
    </div>
)

class Import extends React.PureComponent<Props> {
    private renderSettings() {
        if (!this.props.shouldRenderEsts) {
            return
        }

        return (
            <div className={settingsStyle.section}>
                <AdvSettings />
            </div>
        )
    }

    private renderEstimates() {
        if (!this.props.shouldRenderEsts) {
            return
        }

        return (
            <div>
                <div className={settingsStyle.sectionTitle}>
                    Import Bookmarks from other services
                </div>
            </div>
        )
    }

    private renderProgress() {
        if (!this.props.shouldRenderProgress) {
            return
        }

        return (
            <div>
                <div className={settingsStyle.sectionTitle}>
                    Import Progress
                </div>
                <div className={localStyles.stepText}>
                    <Warning>
                        The import may freeze because of a browser setting. Go
                        to{' '}
                        <a
                            className={localStyles.link}
                            target="_blank"
                            href="https://worldbrain.io/import_bug"
                        >
                            <b>worldbrain.io/import_bug</b>
                        </a>{' '}
                        to fix it.
                    </Warning>
                </div>
            </div>
        )
    }

    render() {
        const {
            isLoading,
            loadingMsg,
            isStopped,
            children,
            allowTypes,
        } = this.props

        return (
            <div>
                <div className={settingsStyle.section}>
                    {this.renderEstimates()}
                    {this.renderProgress()}
                    {isStopped && (
                        <div className={settingsStyle.sectionTitle}>
                            Import Report
                        </div>
                    )}
                    <div className={localStyles.mainContainer}>
                        <div className={localStyles.importTableContainer}>
                            {children}
                        </div>
                        {isLoading && !allowTypes[IMPORT_TYPE.OTHERS].length && (
                            <div className={localStyles.loadingBlocker}>
                                <p className={localStyles.loadingMsg}>
                                    {loadingMsg}
                                </p>
                                <LoadingIndicator />
                            </div>
                        )}
                    </div>
                </div>
                {this.renderSettings()}
            </div>
        )
    }
}

export default Import
