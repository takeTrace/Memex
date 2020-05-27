export { resolvablePromise } from './resolvable'
export type { Resolvable } from './resolvable'

export async function sleepPromise(miliseconds: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, miliseconds))
}
