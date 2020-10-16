import expect from 'expect'
import update from 'immutability-helper'

import * as DATA from 'src/readwise-integration/background/index.test.data'
import {
    backgroundIntegrationTestSuite,
    backgroundIntegrationTest,
} from 'src/tests/integration-tests'
import { injectFakeTabs } from 'src/tab-management/background/index.tests'
import { READWISE_API_URL } from './constants'
import fetchMock from 'fetch-mock'

export const INTEGRATION_TESTS = backgroundIntegrationTestSuite(
    'Readwise Annotations',
    [
        backgroundIntegrationTest(
            'should instantiate ReadwiseBackground, run ReadwiseBackground.setup, and find no key',
            () => {
                return {
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                expect(
                                    await setup.backgroundModules.readwise.getAPIKey(),
                                ).toBeUndefined()
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest('should retrieve a saved API key', () => {
            return {
                steps: [
                    {
                        execute: async ({ setup }) => {
                            await setup.browserLocalStorage.set({
                                'readwise.apiKey': 'my key',
                            })
                            expect(
                                await setup.backgroundModules.readwise.getAPIKey(),
                            ).toEqual('my key')
                        },
                    },
                ],
            }
        }),
        backgroundIntegrationTest(
            'should store and retrieve the api key',
            () => {
                return {
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                await setup.backgroundModules.readwise.setAPIKey(
                                    {
                                        validatedKey: 'my key',
                                    },
                                )
                                expect(
                                    await setup.browserLocalStorage.get(
                                        'readwise.apiKey',
                                    ),
                                ).toEqual({
                                    'readwise.apiKey': 'my key',
                                })
                                expect(
                                    await setup.backgroundModules.readwise.getAPIKey(),
                                ).toEqual('my key')
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest('should validate the api key', () => {
            return {
                steps: [
                    {
                        execute: async ({ setup }) => {
                            setup.fetch.getOnce(READWISE_API_URL, {
                                status: 204,
                            })
                            expect(
                                await setup.backgroundModules.readwise.validateAPIKey(
                                    {
                                        key: 'good key',
                                    },
                                ),
                            ).toEqual({ success: true })

                            setup.fetch.getOnce(
                                READWISE_API_URL,
                                {
                                    status: 403,
                                },
                                { overwriteRoutes: true },
                            )
                            expect(
                                await setup.backgroundModules.readwise.validateAPIKey(
                                    {
                                        key: 'bad key',
                                    },
                                ),
                            ).toEqual({ success: false })

                            expectFetchCalls(setup.fetch.calls(), [
                                {
                                    url: READWISE_API_URL,
                                    headers: {
                                        Authorization: 'Token good key',
                                        'Content-Type': 'application/json',
                                    },
                                    method: 'GET',
                                },
                                {
                                    url: READWISE_API_URL,
                                    headers: {
                                        Authorization: 'Token bad key',
                                        'Content-Type': 'application/json',
                                    },
                                    method: 'GET',
                                },
                            ])
                        },
                    },
                ],
            }
        }),
        backgroundIntegrationTest(
            'should upload highlights to readwise when creating annotations',
            { skipConflictTests: true },
            () => {
                return {
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                await setup.backgroundModules.readwise.setAPIKey(
                                    {
                                        validatedKey: 'my key',
                                    },
                                )

                                injectFakeTabs({
                                    tabManagement:
                                        setup.backgroundModules.tabManagement,
                                    tabsAPI: setup.browserAPIs.tabs,
                                    tabs: [DATA.TEST_TAB_1, DATA.TEST_TAB_2],
                                    includeTitle: true,
                                })
                                setup.fetch.post(READWISE_API_URL, {
                                    status: 200,
                                })
                                const firstAnnotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    { tab: DATA.TEST_TAB_1 },
                                    DATA.ANNOT_1,
                                )
                                const secondAnnotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    { tab: DATA.TEST_TAB_2 },
                                    DATA.ANNOT_2,
                                )
                                await setup.backgroundModules.readwise.actionQueue.waitForSync()

                                expectFetchCalls(
                                    parseJsonFetchCalls(setup.fetch.calls()),
                                    [
                                        {
                                            url: READWISE_API_URL,
                                            ...DATA.UPLOAD_REQUEST({
                                                token: 'my key',
                                                highlights: [
                                                    DATA.UPLOADED_HIGHLIGHT_1(
                                                        firstAnnotationUrl,
                                                    ),
                                                ],
                                            }),
                                        },
                                        {
                                            url: READWISE_API_URL,
                                            ...DATA.UPLOAD_REQUEST({
                                                token: 'my key',
                                                highlights: [
                                                    DATA.UPLOADED_HIGHLIGHT_2(
                                                        secondAnnotationUrl,
                                                    ),
                                                ],
                                            }),
                                        },
                                    ],
                                )
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should sync annotation updates to Readwise',
            () => {
                return {
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                await setup.backgroundModules.readwise.setAPIKey(
                                    {
                                        validatedKey: 'my key',
                                    },
                                )

                                injectFakeTabs({
                                    tabManagement:
                                        setup.backgroundModules.tabManagement,
                                    tabsAPI: setup.browserAPIs.tabs,
                                    tabs: [DATA.TEST_TAB_1, DATA.TEST_TAB_2],
                                    includeTitle: true,
                                })
                                setup.fetch.post(READWISE_API_URL, {
                                    status: 200,
                                })
                                const annotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    { tab: DATA.TEST_TAB_1 },
                                    DATA.ANNOT_1,
                                )
                                await setup.backgroundModules.readwise.actionQueue.waitForSync()
                                setup.fetch.resetHistory()

                                await setup.backgroundModules.directLinking.editAnnotation(
                                    null,
                                    annotationUrl,
                                    'updated comment',
                                )
                                await setup.backgroundModules.readwise.actionQueue.waitForSync()

                                expectFetchCalls(
                                    parseJsonFetchCalls(setup.fetch.calls()),
                                    [
                                        {
                                            url: READWISE_API_URL,
                                            ...DATA.UPLOAD_REQUEST({
                                                token: 'my key',
                                                highlights: [
                                                    {
                                                        ...DATA.UPLOADED_HIGHLIGHT_1(
                                                            annotationUrl,
                                                        ),
                                                        note: 'updated comment',
                                                    },
                                                ],
                                            }),
                                        },
                                    ],
                                )
                            },
                        },
                    ],
                }
            },
        ),
        backgroundIntegrationTest(
            'should sync existing annotations to Readwise',
            () => {
                return {
                    steps: [
                        {
                            execute: async ({ setup }) => {
                                injectFakeTabs({
                                    tabManagement:
                                        setup.backgroundModules.tabManagement,
                                    tabsAPI: setup.browserAPIs.tabs,
                                    tabs: [DATA.TEST_TAB_1, DATA.TEST_TAB_2],
                                    includeTitle: true,
                                })
                                setup.fetch.post(READWISE_API_URL, {
                                    status: 200,
                                })
                                const firstAnnotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    { tab: DATA.TEST_TAB_1 },
                                    DATA.ANNOT_1,
                                )
                                const secondAnnotationUrl = await setup.backgroundModules.directLinking.createAnnotation(
                                    { tab: DATA.TEST_TAB_2 },
                                    DATA.ANNOT_2,
                                )
                                await setup.backgroundModules.readwise.setAPIKey(
                                    {
                                        validatedKey: 'my key',
                                    },
                                )
                                setup.backgroundModules.readwise.uploadBatchSize = 1
                                await setup.backgroundModules.readwise.uploadAllAnnotations(
                                    {
                                        queueInteraction: 'queue-and-return',
                                    },
                                )
                                await setup.backgroundModules.readwise.actionQueue.waitForSync()
                                await setup.backgroundModules.readwise.actionQueue.waitForSync()

                                expectFetchCalls(
                                    parseJsonFetchCalls(setup.fetch.calls()),
                                    [
                                        {
                                            url: READWISE_API_URL,
                                            ...DATA.UPLOAD_REQUEST({
                                                token: 'my key',
                                                highlights: [
                                                    DATA.UPLOADED_HIGHLIGHT_1(
                                                        firstAnnotationUrl,
                                                    ),
                                                ],
                                            }),
                                        },
                                        {
                                            url: READWISE_API_URL,
                                            ...DATA.UPLOAD_REQUEST({
                                                token: 'my key',
                                                highlights: [
                                                    DATA.UPLOADED_HIGHLIGHT_2(
                                                        secondAnnotationUrl,
                                                    ),
                                                ],
                                            }),
                                        },
                                    ],
                                )
                            },
                        },
                    ],
                }
            },
        ),
    ],
)

function parseJsonFetchCalls(calls: fetchMock.MockCall[]) {
    return calls.map((call) =>
        update(call, {
            1: {
                body: {
                    $apply: (body) => JSON.parse(body as string),
                },
            },
        }),
    )
}

// Needed because these calls are not plain objects
function expectFetchCalls(
    calls: fetchMock.MockCall[],
    expected: Array<{
        url: string
        method: string
        headers: { [key: string]: string }
        body?: any
    }>,
) {
    expect(
        calls.map(([url, data]) => ({
            url,
            method: data.method,
            headers: data.headers,
            body: data.body,
        })),
    ).toEqual(expected)
}
