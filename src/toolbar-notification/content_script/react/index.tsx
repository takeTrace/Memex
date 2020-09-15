import React from 'react'
import ReactDOM from 'react-dom'
// import retargetEvents from 'react-shadow-dom-retarget-events'
import ToolbarNotification from './container'

export function setupUIContainer(
    target,
    {
        type,
        shadow,
        onCloseRequested,
        extraProps,
    }: {
        type: string
        shadow: HTMLElement
        onCloseRequested: () => void
        extraProps: any
    },
) {
    // retargetEvents(shadow)
    return new Promise(async (resolve) => {
        ReactDOM.render(
            <ToolbarNotification
                type={type}
                onCloseRequested={onCloseRequested}
                {...extraProps}
            />,
            target,
        )
        resolve()
    })
}

export function destroyUIContainer(target) {
    ReactDOM.unmountComponentAtNode(target)
}
