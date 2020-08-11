import { Annotation, AnnotationsManagerInterface } from 'src/annotations/types'
import { SharedInPageUIInterface } from 'src/in-page-ui/shared-state/types'
import {
    AnnotationClickHandler,
    SaveAndRenderHighlightDependencies,
} from 'src/highlighting/ui/highlight-interactions'

export interface Descriptor {
    strategy: string
    content: any
}

export interface Anchor {
    quote: string
    descriptor: Descriptor
}

export type Highlight = Pick<Annotation, 'url' | 'selector'> & {
    temporary?: boolean
}

export interface HighlightInteractionsInterface {
    renderHighlights: (
        highlights: Highlight[],
        openSidebar: AnnotationClickHandler,
    ) => Promise<void>
    renderHighlight: (
        highlight: Highlight,
        openSidebar: AnnotationClickHandler,
        temporary?: boolean,
    ) => Promise<boolean>
    scrollToHighlight: ({ url }: Highlight) => number
    highlightAndScroll: (annotation: Annotation) => number
    attachEventListenersToNewHighlights: (
        highlight: Highlight,
        openSidebar: AnnotationClickHandler,
    ) => void
    removeMediumHighlights: () => void
    removeTempHighlights: () => void
    makeHighlightMedium: ({ url }: Highlight) => void
    makeHighlightDark: ({ url }: Highlight) => void
    removeHighlights: (onlyRemoveDarkHighlights?: boolean) => void
    sortAnnotationsByPosition: (annotations: Annotation[]) => Annotation[]
    _removeHighlight: (highlight: Element) => void
    removeAnnotationHighlights: (url: string) => void
    saveAndRenderHighlight: (
        params: SaveAndRenderHighlightDependencies,
    ) => Promise<void>
    createAnnotationWithSidebar: (params: {
        selection?: Selection
        inPageUI: SharedInPageUIInterface
    }) => Promise<void>
}
