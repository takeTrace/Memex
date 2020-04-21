import {
    SearchParams,
    FilteredIDs,
    TermsIndexName,
    PageResultsMap,
    DBGet,
} from '..'
import { DexieUtilsPlugin, GetPksProps } from '../plugins/dexie-utils'

const some = require('lodash/some')

export interface TermResults {
    content: string[]
    title: string[]
    url: string[]
}

/**
 * Performs a query for a single term on a given multi-index.
 */
const termQuery = (term: string, excluded: string[], getDb: DBGet) => async (
    index: TermsIndexName,
) => {
    const db = await getDb()

    const opts: GetPksProps = {
        collection: 'pages',
        fieldName: index,
        opName: 'equals',
        opValue: term,
    }

    if (excluded.length) {
        // Adding a `.filter/.and` clause slows down a query a lot
        opts.filter = page => {
            const uniqueTerms = new Set([
                ...page.terms,
                ...page.titleTerms,
                ...page.urlTerms,
            ])

            return !some(excluded, t => uniqueTerms.has(t))
        }
    }

    return db.operation(DexieUtilsPlugin.GET_PKS_OP, opts)
}

/**
 * Performs a query for a single term on a all terms indexes.
 */
const lookupTerm = (excluded: string[], getDb: DBGet) =>
    async function(term: string): Promise<TermResults> {
        const queryIndex = termQuery(term, excluded, getDb)

        const content = await queryIndex('terms')
        const title = await queryIndex('titleTerms')
        const url = await queryIndex('urlTerms')

        return { content, title, url }
    }

/**
 * Handles scoring results for a given term according to which index the results where found in.
 */
const scoreTermResults = (filteredUrls: FilteredIDs) =>
    function(result: TermResults): PageResultsMap {
        const urlScoreMap: PageResultsMap = new Map()

        const add = (multiplier: number) => (url: string) => {
            const existing = urlScoreMap.get(url)

            if (
                filteredUrls.isAllowed(url) &&
                (!existing || existing < multiplier)
            ) {
                urlScoreMap.set(url, multiplier)
            }
        }

        // For each index's matched URLs add them to the Map, but only if they're higher than
        //  the existing entry, or nothing exists for given URL yet
        result.content.forEach(add(1))
        result.url.forEach(add(1.1))
        result.title.forEach(add(1.2))
        return urlScoreMap
    }

const intersectTermResults = (a: PageResultsMap, b: PageResultsMap) =>
    new Map([...a].filter(([url]) => b.has(url)))

export const textSearch = (getDb: DBGet) => async (
    { terms, termsExclude }: Partial<SearchParams>,
    filteredUrls: FilteredIDs,
): Promise<PageResultsMap> => {
    // For each term create an object of with props of matched URL arrays for each index: content, title, and url
    const termResults = await Promise.all(
        [...terms].map(lookupTerm(termsExclude, getDb)),
    )

    // Creates a Map of URLs to score multipliers, based on if they were found in title, URL, or content terms,
    //  These are intersected between results for separate words
    return termResults
        .map(scoreTermResults(filteredUrls))
        .reduce(intersectTermResults)
}
