/**
 * SadgeClipper
 * JS Twitch Clip Dashboard
 * @author dylmye
 * (c) 2020- dylan myers under ISC license
 * 
 * Depends on: cash (by Fabio Spampinato), dayjs (by iamkun), timeago.js (by Hust.cc)
 */

// globals
let bearer_token = "";
let client_id = "33bst72zxflxxz5o3xrhntafqimhbh"; // make sure to use your own client ID
let raw_base_url = "https://dylmye.me/sadgeclipper/";
let base_url = encodeURIComponent(raw_base_url); // used in oauth callback
let base_helix_url = "https://api.twitch.tv/helix/"; // change to sandbox api if needed
let base_oauth_url = "https://id.twitch.tv/oauth2/";
const LOGIN_URL = `${base_oauth_url}authorize?client_id=${client_id}&redirect_uri=${base_url}oauth-callback.html&response_type=token&scope=user%3Aread%3Aemail&force_verify=true`;
const LOGOUT_URL = `${raw_base_url}logout.html`;

// helpers
/** API Action endpoints from https://dev.twitch.tv/docs/api/reference */
const ACTIONS = {
    USERS: 'users',
    CLIPS: 'clips',
    // keep any not in use commented out to make minified file smaller
    // CHANNELS: 'channels',
    // STREAMS: 'streams',
    // GAMES: 'games',
    // SUBS: 'subscriptions',
    // VIDEOS: 'videos',
    // COMMERCIAL: 'channels/commercial',
    // ANALYTICS_EXTENSION: 'analytics/extensions',
    // ANALYTICS_GAME: 'analytics/games',
    // BITS_LEADERBOARD: 'bits/leaderboard',
    // CHEERMOTES: 'bits/cheermotes',
    // EXT_TXNS: 'extensions/transactions',
    // POINT_REWARDS: 'channel_points/custom_rewards',
    // POINT_REWARDS_REDEMPTIONS: 'channel_points/custom_rewards/redemptions',
    // GRANT_DROP: 'entitlements/upload',
    // DROP_CODES: 'entitlements/codes',
    // ENTITLED_DROPS: 'entitlements/drops',
    // DIRECTORY: 'games/top',
    // SCAM_TRAIN: 'hypetrain/events',
    // MODS: 'moderation/moderators',
    // MOD_MSG_AUTOMOD_CHECK: 'moderation/enforcements/status',
    // MOD_BAN_EVENTS: 'moderation/banned/events',
    // MOD_BANS: 'moderation/banned',
    // MOD_EVENTS: 'moderation/moderators/events',
    // SEARCH_CATS: 'search/categories',
    // SEARCH_CHANNELS: 'search/channels',
    // KEY: 'streams/key',
    // STREAM_MARKERS: 'streams/markers',
    // STREAM_TAGS: 'streams/tags',
    // ALL_STREAM_TAGS: 'tags/streams',
    // FOLLOWS: 'users/follows',
    // USER_EXTENSIONS: 'users/extensions',
    // INSTALLED_EXTENSIONS: 'users/extensions/list',
    // WEBHOOKS: 'webhooks/subscriptions',
};

/**
 * Creates a URL object for the API action
 * @param {string} action - should be from `ACTIONS` array
 * @returns {URL} url object for action
 */
function apiUrl(action) {
    return new URL(`${base_helix_url}${action}`);
}

/**
 * Returns the fetch options obj (RequestInit).
 * Has to be a function because otherwise the
 * bearer token doesn't update.
 * @param {string} method - HTTP method type to use. default: GET
 * @returns {RequestInit} options object
 */
function getOptions(method = "GET") {
    return {
        method,
        headers: new Headers({
            'Client-ID': client_id,
            'Authorization': `Bearer ${bearer_token}`
        }),
        mode: 'cors',
    };
}

/**
 * Sets an object of params on a URL object that is then returned
 * @param {URL} url - the URL object to append search params to
 * @param {*} params - the object of key->values to add as params
 * @returns {URL} updated URL
 */
function setUrlSearchParams(url, params) {
    Object().keys(params).forEach(k => {
        url.searchParams.set(k, params[k]);
    });

    return url;
}

/** Setting rules:
 *  * Key must only contain letters a-z, A-Z
 *  * Value must not contain = < > or &
 */
function setValueSafely(key, value) {
    const safeKey = key.replace(/[^A-Za-z]/g, '');
    const safeVal = value.replace(/[=<>&]/g, '');
    return localStorage.setItem(safeKey, safeVal);
}

/** Getting rules:
 *  * Key must only contain letters a-z, A-Z
 *  * Value must not contain = < > or &
 */
function getValueSafely(key) {
    const safeKey = key.replace(/[^A-Za-z]/g, '');
    const val = localStorage.getItem(safeKey);
    const safeVal = val?.length && val.replace(/[=<>&]/g, '');
    return safeVal;
}

/**
 * Returns the filled HTML template for a given clip
 * @param {*} c - the clip to create HTML for
 * @returns {string} the HTMl for given clip
 */
function generateClipHtml(c) {
    return `
<li class="clip">
    <a href="${c.url}">
        <img src="${c.thumbnail_url}" alt="Thumbnail of a clip of ${c.broadcaster_name}'s stream" class="clip-thumb" />
    </a>
    <div class="clip-description">
        <p><a href="${c.url}">${c.title}</a></p>
        <p>
            Clipped by ${c.creator_name} &bullet; Clipped <span class="renderable-date" datetime="${c.created_at}" title="${c.created_at}">${c.created_at}</span>
        </p>
    </div>
</li>`;
}

// action code
/**
 * Returns an array of broadcaster IDs related to provided
 * usernames.
 * @returns {string[]} array of broadcaster IDs
 */
async function getBroadcasterIds() {
    let endpoint = apiUrl(ACTIONS.USERS);
    (getValueSafely("search")).split(',').forEach(username => {
        endpoint.searchParams.append('login', username);
    });

    const fetcher = await fetch(endpoint, getOptions());
    const res = await fetcher.json();
    if (res.error) console.error(res.message);
    return res.data.map(x => x.id);
}

/**
 * Retrieve clips for a specified broadcaster
 * @param {string | number} broadcasterId - the broadcaster to search for
 * @param {string} from - date filter start
 * @param {string} to - date filter end
 * @returns {any[]} clips for requested streamer with filters applied 
 */
async function getClipsForBroadcasterId(broadcasterId, from, to) {
    let endpoint = apiUrl(ACTIONS.CLIPS);
    endpoint = setUrlSearchParams(endpoint, {
        broadcaster_id: broadcasterId,
        first: 10,
        started_at: from,
        ended_at: to,
    });
    
    const fetcher = await fetch(endpoint, getOptions());
    const res = await fetcher.json();
    if (res.error) console.error(res.message);
    return res.data;
}

/**
 * Get clips for provided usernames
 * @returns {any[]} array of clips for all users
 */
async function getClipsForUsernames() {
    const ids = await getBroadcasterIds();

    const now = dayjs().toISOString();
    const sevenDaysAgo = dayjs().subtract(7, 'days').toISOString();

    const clips = await Promise.all(ids.map(async i => await getClipsForBroadcasterId(i, sevenDaysAgo, now)));
    return clips;
}

/**
 * Sync wrapper for search() so we can use it in DOM
 */
function onClickSearch() {
    search();
}

/**
 * Onclick action for search button. Calls API actions and creates DOM content for clips.
 */
async function search() {
    if(!document.getElementById('usernames').value.length) return;
    timeago.cancel();

    setValueSafely("search", document.getElementById("usernames").value);

    let clips = await getClipsForUsernames();
    clips = [].concat.apply([], clips);

    $("#clips").empty();
    (clips || []).forEach(c => {
        $("#clips").append(generateClipHtml(c));
    });

    timeago.render(document.querySelectorAll('.renderable-date'));
}

// initalisation
/**
 * Create the local storage variables.
 * Throws an error if localStorage API is unavailable.
 * @returns {boolean} whether localStorage was set up successfully
 */
function setupStorage() {
    if (typeof localStorage === "undefined") {
        console.error("Unable to set up SadgeClipper storage: localStorage is not supported by the browser (returns undefined).");
        return false;
    }
    try {
        setValueSafely("search", "");
        setValueSafely("accessToken", "");
        console.log("SadgeClipper sucessfully set up for the first time.");
        return true;
    } catch (e) {
        console.error("Unable to set up SadgeClipper storage:", e);
        return false;
    }
}

/**
 * Set bearer token and filters in DOM from localStorage
 */
function setValues() {
    if(getValueSafely("accessToken") && getValueSafely("accessToken").length) {
        bearer_token = getValueSafely("accessToken");
    }

    if(getValueSafely("search") && getValueSafely("search").length) {
        document.getElementById('usernames').value = getValueSafely("search");
    }
}

/**
 * Determine whether to show or hide the login and search elements in DOM.
 */
function determineVisibility() {
    let loginButton = document.getElementById("logged-out");
    let logoutButton = document.getElementById("log-out");
    let loggedOutMessage = document.getElementById("empty-logged-out");
    
    if(!bearer_token || !bearer_token.length) {
        loginButton.href = LOGIN_URL;
        $("#searchbar").hide();
    } else {
        $(loginButton).hide();
        $(loggedOutMessage).hide();
        logoutButton.href = LOGOUT_URL;
        $(logoutButton).show();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    $('html').addClass ( 'dom-loaded' );
    if(!localStorage.length) {
        const successful = setupStorage();
        if (!successful) return;
    } else {
        setValues();
    }
    determineVisibility();
});