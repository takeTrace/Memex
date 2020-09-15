import React from 'react'

// import Checkbox from './Checkbox'
import { Checkbox } from 'src/common-ui/components'
import * as utils from 'src/in-page-ui/tooltip/utils'
import * as tooltipConstants from 'src/in-page-ui/tooltip/constants'

import styles from './settings.css'

class Tooltip extends React.Component {
    state = {
        tooltip: tooltipConstants.TOOLTIP_DEFAULT_OPTION,
        position: tooltipConstants.POSITION_DEFAULT_OPTION,
    }

    async componentDidMount() {
        const tooltip = await utils.getTooltipState()
        const position = await utils.getPositionState()
        this.setState({
            tooltip,
            position,
        })
    }

    toggleTooltip = async () => {
        const tooltip = !this.state.tooltip
        await utils.setTooltipState(tooltip)
        this.setState({ tooltip })
    }

    togglePosition = async (e) => {
        const position = e.target.value
        await utils.setPositionState(position)
        this.setState({ position })
    }

    render() {
        return (
            <div className={styles.section}>
                <div className={styles.sectionTitle}>
                    Highlights & Annotations
                </div>
                <div className={styles.infoText}>
                    Show Tooltip when highlighting text. <br/>You can also use keyboard
                    shortcuts.
                </div>
                <Checkbox
                    id="show-memex-link"
                    isChecked={this.state.tooltip}
                    handleChange={this.toggleTooltip}
                >
                    Show Tooltip
                </Checkbox>
                {/*

                //needs to be fixed. setting removed until then

                <div className={styles.extraSettings}>
                    Position tooltip below
                    <select
                        className={styles.dropdown}
                        value={this.state.position}
                        onChange={this.togglePosition}
                        disabled={!this.state.tooltip}
                    >
                        <option value="mouse">mouse pointer</option>
                        <option value="text">selected text</option>
                    </select>
                </div>
                */}
            </div>
        )
    }
}

export default Tooltip
