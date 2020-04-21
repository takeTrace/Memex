export const URL_PATTERN = /([(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi

export const TWEET_DATE_FORMAT = 'h:mm A - D MMM YYYY'

export const POSTS_COLL = 'socialPosts'
export const USERS_COLL = 'socialUsers'
export const TAGS_COLL = 'socialTags'
export const BMS_COLL = 'socialBookmarks'
export const LIST_ENTRIES_COLL = 'socialPostListEntries'

export const TWEET_URL_MATCH_PATTERN = /^twitter\.com\/(.+)\/status\/(.+)$/
export const POST_URL_ID_PATTERN = /^socialPosts:\d+$/
export const POST_URL_ID_MATCH_PATTERN = /^socialPosts:(\d+)$/
