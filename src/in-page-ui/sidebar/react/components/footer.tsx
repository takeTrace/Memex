import * as React from 'react'
import { ButtonTooltip } from 'src/common-ui/components/'

const styles = require('./footer.css')

interface Props {
    dialogText?: string
    dialogTextClassName?: any
    actionBtnText: string
    actionBtnClassName: any
    cancelBtnClassName: any
    actionBtnClickHandler: () => void
    cancelBtnClickHandler: () => void
}

/* tslint:disable-next-line variable-name */
const Footer = ({
    dialogText,
    dialogTextClassName,
    actionBtnText,
    actionBtnClassName,
    cancelBtnClassName,
    actionBtnClickHandler,
    cancelBtnClickHandler,
}: Props) => (
    <div className={styles.footer}>
        <div>
            {!!dialogText && (
                <span className={dialogTextClassName || ''}>{dialogText}</span>
            )}
        </div>
        <div className={styles.savecancel}>
            <ButtonTooltip tooltipText={'ctr/cmd + Enter'} position="top">
                <button
                    className={actionBtnClassName}
                    onClick={e => {
                        e.stopPropagation()
                        actionBtnClickHandler()
                    }}
                >
                    {actionBtnText}
                </button>
            </ButtonTooltip>
            <button
                className={cancelBtnClassName}
                onClick={e => {
                    e.stopPropagation()
                    cancelBtnClickHandler()
                }}
            >
                Cancel
            </button>
        </div>
    </div>
)

export default Footer
