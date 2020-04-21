import Storex from '@worldbrain/storex'

import AbstractModel from './abstract-model'

export interface Props {
    /** The URL/page associated with the event. */
    url: string
    /** The time at which the event took place. */
    time: number
}

/**
 * Basic event-related data type blueprint.
 * Each Model representing a some kind of event in time should be extended from this.
 */
abstract class EventModel extends AbstractModel implements Props {
    url: string
    time: number

    constructor(db: Storex, { url, time }: Props) {
        super(db)
        this.url = url
        this.time = typeof time === 'number' ? time : +time
    }

    get data() {
        return {
            url: this.url,
            time: this.time,
        }
    }
}

export default EventModel
