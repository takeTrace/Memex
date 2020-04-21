import { AuthService } from '@worldbrain/memex-common/lib/authentication/types'
import { TEST_USER } from '@worldbrain/memex-common/lib/authentication/dev'
import { MemoryAuthService } from '@worldbrain/memex-common/lib/authentication/memory'
import { WorldbrainAuthService } from '@worldbrain/memex-common/lib/authentication/worldbrain'
import { SubscriptionsService } from '@worldbrain/memex-common/lib/subscriptions/types'
import { MemorySubscriptionsService } from '@worldbrain/memex-common/lib/subscriptions/memory'
import { WorldbrainSubscriptionsService } from '@worldbrain/memex-common/lib/subscriptions/worldbrain'
import { getFirebase } from 'src/util/firebase-app-initialized'

export type DevAuthState =
    | ''
    | 'staging'
    | 'user_signed_out'
    | 'user_signed_in'
    | 'user_subscribed'
    | 'user_subscription_expired'

export function createAuthDependencies(options?: {
    devAuthState?: DevAuthState
}): {
    authService: AuthService
    subscriptionService: SubscriptionsService
} {
    const devAuthState = (options && options.devAuthState) || ''
    if (devAuthState === '' || devAuthState === 'staging') {
        return {
            authService: new WorldbrainAuthService(getFirebase()),
            subscriptionService: new WorldbrainSubscriptionsService(
                getFirebase(),
            ),
        }
    }

    if (devAuthState === 'user_signed_out') {
        return {
            authService: new MemoryAuthService(),
            subscriptionService: new MemorySubscriptionsService(),
        }
    }

    if (devAuthState === 'user_signed_in') {
        const authService = new MemoryAuthService()
        authService.setUser(TEST_USER)
        return {
            authService,
            subscriptionService: new MemorySubscriptionsService(),
        }
    }

    if (devAuthState === 'user_subscribed') {
        // todo: (ch): allow testing of different plans
        const authService = new MemoryAuthService()
        authService.setUser(TEST_USER)
        return {
            authService,
            subscriptionService: new MemorySubscriptionsService({
                expiry: Date.now() + 1000 * 60 * 60 * 24,
            }),
        }
    }

    if (devAuthState === 'user_subscription_expired') {
        // todo: (ch): allow testing of different plans
        const authService = new MemoryAuthService()
        authService.setUser(TEST_USER)
        return {
            authService,
            subscriptionService: new MemorySubscriptionsService({
                expiry: Date.now() - 1000 * 60 * 60,
            }),
        }
    }

    throw new Error(
        `Tried to set up auth dependies with unknow DEV_AUTH_STATE: ${devAuthState}`,
    )
}
