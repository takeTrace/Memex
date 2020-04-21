import { createAction } from 'redux-act'

import * as selectors from './selectors'
import { FLOWS, STAGES } from '../onboarding/constants'
import { fetchOnboardingStage, setOnboardingStage } from '../onboarding/utils'
import { TOOLTIPS } from './constants'

import { remoteFunction } from 'src/util/webextensionRPC'
import { EVENT_NAMES } from 'src/analytics/internal/constants'

const processEventRPC = remoteFunction('processEvent')

export const setWhichTooltip = createAction<number>('tooltips/setTooltip')
export const resetWhichTooltip = createAction('tooltip/resetWhichTooltip')
export const setShowTooltip = createAction<boolean>('tooltips/setShowTooltip')

export const initOnboardingTooltips = (index = 0) => dispatch => {
    dispatch(setShowTooltip(true))
    dispatch(processAndSetWhichTooltip(index))
}

export const fetchOnboardingState = () => async dispatch => {
    const onboardingState = await fetchOnboardingStage(FLOWS.powerSearch)
}

export const processAndSetWhichTooltip = (whichTooltip: number) => dispatch => {
    // Fetch tooltip name, generalized to be used with different dispatched actions
    const tooltipName = TOOLTIPS[whichTooltip]
    processEventRPC({
        type: EVENT_NAMES.SET_TOOLTIP,
        details: {
            tooltip: tooltipName,
        },
    })

    dispatch(setWhichTooltip(whichTooltip))
}

export const setTooltip = (tooltip: string) => dispatch => {
    const index = TOOLTIPS.indexOf(tooltip)
    if (index === -1) {
        return
    }
    dispatch(processAndSetWhichTooltip(index))
}
/**
 * Temporarily removes tooltip by setting tooltip to 'none'
 */
export const closeTooltip = () => async dispatch => {
    dispatch(resetWhichTooltip())
    processEventRPC({
        type: EVENT_NAMES.CLOSE_TOOLTIP,
    })
    await setOnboardingStage(FLOWS.powerSearch, STAGES.unvisited)
}

/**
 * Sets whichTooltip to nextTooltip if next tooltip isn't already shown.
 * Also pushes nextTooltip to prevTooltips array.
 */
export const nextTooltip = () => (dispatch, getState) => {
    const whichTooltip = selectors.whichTooltip(getState())

    // Return if whichTooltip is the last tooltip
    if (whichTooltip >= TOOLTIPS.length - 1) {
        return
    }
    // Else dispatch with incremented index
    dispatch(processAndSetWhichTooltip(whichTooltip + 1))
}

/**
 * Sets tooltip to the previous tooltip shown.
 * Does nothing, if there was no previous tooltip shown
 */
export const previousTooltip = () => (dispatch, getState) => {
    const whichTooltip = selectors.whichTooltip(getState())

    // Return if whichTooltip is at beginning or null
    if (whichTooltip <= 0) {
        return
    }
    // Else decrement tooltip
    dispatch(processAndSetWhichTooltip(whichTooltip - 1))
}

/**
 * Resets all tooltip states.
 */
export const resetTooltips = () => dispatch => {
    dispatch(setShowTooltip(false))
    dispatch(resetWhichTooltip())
}
