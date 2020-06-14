import Mousetrap from 'mousetrap'
import { getKeyboardShortcutsState } from 'src/in-page-ui/keyboard-shortcuts/content_script/detection'
import { userSelectedText } from 'src/in-page-ui/tooltip/content_script/interactions'
import { createAndCopyDirectLink } from 'src/direct-linking/content_script/interactions'
import { InPageUIInterface } from 'src/in-page-ui/shared-state/types'
import { KeyboardShortcuts } from '../types'
import AnnotationsManager from 'src/annotations/annotations-manager'
import { AnnotationFunctions } from 'src/in-page-ui/tooltip/types'

type HandleInterface = {
    [key in keyof KeyboardShortcuts]: () => void
}

export interface KeyboardShortcutsDependencies extends AnnotationFunctions {
    inPageUI: InPageUIInterface
}

export async function initKeyboardShortcuts(
    dependencies: KeyboardShortcutsDependencies,
) {
    const { shortcutsEnabled, ...shortcuts } = await getKeyboardShortcutsState()
    if (shortcutsEnabled) {
        const handlers = getShortcutHandlers(dependencies)
        for (const [shortcutName, shortcutValue] of Object.entries(shortcuts)) {
            if (shortcutValue) {
                Mousetrap.bind(
                    shortcutValue.shortcut,
                    prepareShortcutHandler(handlers[shortcutName]),
                )
            }
        }
    }
}

function prepareShortcutHandler(handler: () => void) {
    return function (event) {
        event.preventDefault()
        event.stopPropagation()
        return handler()
    }
}

function getShortcutHandlers({
    inPageUI,
    ...annotationFunctions
}: KeyboardShortcutsDependencies): HandleInterface {
    return {
        addComment: () => inPageUI.showRibbon({ action: 'comment' }),
        addTag: () => inPageUI.showRibbon({ action: 'tag' }),
        addToCollection: () => inPageUI.showRibbon({ action: 'list' }),
        createBookmark: () => inPageUI.showRibbon({ action: 'bookmark' }),
        toggleSidebar: () => {
            inPageUI.toggleSidebar()
        },
        toggleHighlights: () => inPageUI.toggleHighlights(),
        createHighlight: annotationFunctions.createHighlight,
        createAnnotation: annotationFunctions.createAnnotation,
        link: async () => {
            if (userSelectedText()) {
                await createAndCopyDirectLink()
            }
        },
    }
}
