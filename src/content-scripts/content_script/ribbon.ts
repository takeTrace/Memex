import { browser } from 'webextension-polyfill-ts'

import { IGNORE_CLICK_OUTSIDE_CLASS } from '../constants'
import { ContentScriptRegistry, RibbonScriptMain } from './types'
import { setupRibbonUI, destroyRibbonUI } from 'src/in-page-ui/ribbon/react'
import { createInPageUI, destroyInPageUI } from 'src/in-page-ui/utils'
import { setSidebarState, getSidebarState } from 'src/sidebar-overlay/utils'
import { runInBackground } from 'src/util/webextensionRPC'
import { ContentScriptsInterface } from '../background/types'

export const main: RibbonScriptMain = async (options) => {
    const cssFile = browser.extension.getURL(`/content_script_ribbon.css`)
    let mount: ReturnType<typeof createInPageUI> | null = null
    const createMount = () => {
        if (!mount) {
            mount = createInPageUI('ribbon', cssFile, [
                IGNORE_CLICK_OUTSIDE_CLASS,
            ])
        }
    }
    createMount()

    options.inPageUI.events.on('componentShouldSetUp', ({ component }) => {
        if (component === 'ribbon') {
            setUp()
        }
    })
    options.inPageUI.events.on('componentShouldDestroy', ({ component }) => {
        if (component === 'ribbon') {
            destroy()
        }
    })

    const setUp = async () => {
        const currentTab = await runInBackground<
            ContentScriptsInterface<'caller'>
        >().getCurrentTab()

        createMount()
        setupRibbonUI(mount.rootElement, {
            containerDependencies: {
                ...options,
                currentTab,
                setSidebarEnabled: setSidebarState,
                getSidebarEnabled: getSidebarState,
            },
            inPageUI: options.inPageUI,
        })
    }

    const destroy = () => {
        if (!mount) {
            return
        }

        destroyInPageUI('ribbon')
        destroyRibbonUI(mount.rootElement, mount.shadowRoot)
    }
}

const registry = window['contentScriptRegistry'] as ContentScriptRegistry
registry.registerRibbonScript(main)
