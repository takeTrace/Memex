import { injectCSS } from 'src/util/content-injection'

export function createInPageUIRoot({
    containerId,
    rootId,
    cssFile,
    rootClassNames,
    containerClassNames,
}: {
    containerId: string
    rootId: string
    cssFile: string
    rootClassNames?: string[]
    containerClassNames?: string[]
}) {
    const container = document.createElement('div')
    container.setAttribute('id', containerId)

    if (containerClassNames != null) {
        container.classList.add(...containerClassNames)
    }

    const { rootElement, shadow } = createShadowRootIfSupported(
        container,
        rootId,
        rootClassNames,
        cssFile,
    )
    document.body.appendChild(container)

    return { rootElement, shadowRoot: shadow }
}

export function destroyRootElement(containerId: string) {
    const container = document.querySelector(`#${containerId}`)
    if (container) {
        container.remove()
    }
}

export function createShadowRootIfSupported(
    container: HTMLElement,
    rootId: string,
    rootClassNames?: string[],
    cssFile?: string,
) {
    const rootElement = document.createElement('div')
    rootElement.setAttribute('id', rootId)

    if (rootClassNames != null) {
        rootElement.classList.add(...rootClassNames)
    }

    let shadow: ShadowRoot | null = null
    if (container.attachShadow) {
        /** 'open' mode to access shadow dom elements from outisde the shadow root.
         * More info: https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#Parameters
         */
        shadow = container.attachShadow({ mode: 'open' })
        shadow.appendChild(rootElement)
        injectCSS(cssFile, shadow)
    } else {
        container.appendChild(rootElement)
        injectCSS(cssFile)
    }

    return { rootElement, shadow }
}
