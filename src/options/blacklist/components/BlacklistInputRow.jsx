import React from 'react'
import PropTypes from 'prop-types'

import styles from './BlacklistInputRow.css'

const BlacklistInputRow = ({
    value,
    isClearBtnDisabled,
    isSaveBtnDisabled,
    onAdd,
    onInputChange,
    onInputClear,
    inputRef,
}) => (
    <form className={styles.newSiteInputRow}>
        <input
            value={value}
            className={styles.input}
            type="text"
            placeholder="Enter any text or domain or path to ignore matching URLs"
            onChange={onInputChange}
            ref={inputRef}
        />

        <div className={styles.inputButtons}>
            <button
                onClick={onAdd}
                type="submit"
                className={styles.blacklistButton}
                disabled={isSaveBtnDisabled}
            >
                Block
            </button>
        </div>
    </form>
)

export const propTypes = (BlacklistInputRow.propTypes = {
    // State
    value: PropTypes.string.isRequired,
    isClearBtnDisabled: PropTypes.bool.isRequired,
    isSaveBtnDisabled: PropTypes.bool.isRequired,

    // Event handlers
    onAdd: PropTypes.func.isRequired,
    onInputChange: PropTypes.func.isRequired,
    onInputClear: PropTypes.func.isRequired,

    // Misc
    inputRef: PropTypes.func.isRequired,
})

export default BlacklistInputRow
