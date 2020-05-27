import mapValues from 'lodash/mapValues'
import { storiesOf } from '@storybook/react'
import React from 'react'
import { setupBackgroundIntegrationTest } from 'src/tests/background-integration-tests'
import AnnotationsManager from 'src/annotations/annotations-manager'
import SidebarContainer from 'src/in-page-ui/sidebar/react/containers/sidebar'
import { WithDependencies } from '../utils'
import { InPageUI } from 'src/in-page-ui/shared-state'
import { SidebarEnv } from 'src/in-page-ui/sidebar/react/types'
import RibbonHolder from 'src/in-page-ui/ribbon/react/containers/ribbon-holder'

const stories = storiesOf('In-page UI', module)

async function createDependencies() {
    const background = await setupBackgroundIntegrationTest()
    window['background'] = background

    await background.backgroundModules.directLinking.annotationStorage.createAnnotation(
        {
            pageTitle: 'Foo title',
            pageUrl: 'foo.com',
            url: 'foo.com#4r234523453',
            body: 'Annotation body',
            comment: 'Annotation comment',
            createdWhen: new Date(),
        },
    )
    await background.backgroundModules.pages.addPage({
        bookmark: Date.now(),
        visits: [Date.now() - 1000 * 60 * 5],
        pageDoc: {
            url: 'http://foo.com',
            content: {
                title: 'Foo title',
                fullText: 'Foo page text',
            },
        },
        rejectNoContent: true,
    })

    const annotationsManager = new AnnotationsManager()
    annotationsManager._getAllAnnotationsByUrlRPC =
        background.backgroundModules.directLinking.getAllAnnotationsByUrl

    const highlighter = {
        removeHighlights: async () => {},
        removeTempHighlights: async () => {},
        removeAnnotationHighlights: async () => {},
        renderHighlights: async () => {},
        renderHighlight: async () => {},
        scrollToHighlight: async () => {},
        highlightAndScroll: async () => {},
    } as any

    const annotations = mapValues(
        background.backgroundModules.directLinking.remoteFunctions,
        (f) => {
            return (...args: any[]) => {
                return f({ tab: currentTab }, ...args)
            }
        },
    )

    const currentTab = {
        id: 654,
        url: 'https://www.foo.com',
        title: 'Foo.com: Home',
    }

    const inPageUI = new InPageUI({
        loadComponent: async () => {},
        annotations,
        highlighter,
        pageUrl: currentTab.url,
    })

    const commonProps = {
        env: 'inpage' as SidebarEnv,
        currentTab,
        inPageUI,
        highlighter,
        annotationsManager,
        searchResultLimit: 10,
        getRemoteFunction: () => async () => {},
        getSidebarEnabled: async () => true,
        setSidebarEnabled: async () => {},
        normalizeUrl: (url) => url,
        search: background.backgroundModules.search.remoteFunctions.search,
        bookmarks:
            background.backgroundModules.search.remoteFunctions.bookmarks,
        tags: background.backgroundModules.tags.remoteFunctions,
        customLists: background.backgroundModules.customLists.remoteFunctions,
        activityLogger:
            background.backgroundModules.activityLogger.remoteFunctions,
        annotations,
        tooltip: {
            getState: async () => true,
            setState: async () => undefined,
        },
        highlights: {
            getState: async () => true,
            setState: async () => undefined,
        },
    }

    return {
        background,
        annotationsManager,
        highlighter,
        inPageUI,
        commonProps,
    }
}

stories.add('Ribbon & Sidebar', () => (
    <WithDependencies setup={createDependencies}>
        {({ commonProps, inPageUI }) => (
            <React.Fragment>
                <RibbonHolder
                    inPageUI={inPageUI}
                    containerDependencies={commonProps}
                />
                <SidebarContainer {...commonProps} />
            </React.Fragment>
        )}
    </WithDependencies>
))

stories.add('Ribbon', () => (
    <WithDependencies
        setup={async () => {
            const deps = await createDependencies()
            await deps.inPageUI.showRibbon()
            return deps
        }}
    >
        {({ commonProps, inPageUI }) => (
            <RibbonHolder
                inPageUI={inPageUI}
                containerDependencies={commonProps}
            />
        )}
    </WithDependencies>
))

stories.add('Sidebar - Page Annotations', () => (
    <WithDependencies
        setup={async () => {
            const deps = await createDependencies()
            await deps.inPageUI.showSidebar()
            return deps
        }}
    >
        {({ commonProps }) => <SidebarContainer {...commonProps} />}
    </WithDependencies>
))

stories.add('Sidebar - All Annotations', () => (
    <WithDependencies
        setup={async () => {
            const deps = await createDependencies()
            await deps.inPageUI.showSidebar()
            return deps
        }}
    >
        {({ commonProps }) => (
            <SidebarContainer
                {...commonProps}
                ref={(sidebar) => {
                    ;(sidebar as any).processEvent('switchSearch', {
                        changes: {
                            searchType: 'notes',
                            pageType: 'all',
                            resultsSearchType: 'notes',
                        },
                    })
                }}
            />
        )}
    </WithDependencies>
))

stories.add('Sidebar - Page Search', () => (
    <WithDependencies
        setup={async () => {
            const deps = await createDependencies()
            await deps.inPageUI.showSidebar()
            return deps
        }}
    >
        {({ commonProps }) => (
            <SidebarContainer
                {...commonProps}
                ref={(sidebar) => {
                    ;(sidebar as any).processEvent('switchSearch', {
                        changes: {
                            searchType: 'page',
                            pageType: 'all',
                            resultsSearchType: 'page',
                        },
                    })
                }}
            />
        )}
    </WithDependencies>
))
