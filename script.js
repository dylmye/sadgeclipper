/**
 * SadgeClipper
 * JS Twitch Clip Dashboard
 * @author dylmye
 * (c) 2020- dylan myers under ISC license
 * 
 * Depends on: cash (by Fabio Spampinato), dayjs (by iamkun),
 * timeago.js (by Hust.cc), micromodal (by Indrashish Ghosh)
 * and localforge (by Matthew R MacPherson & Thodoris Greasidis)
 */

const SHOW_DEBUG = false;

// globals
let bearer_token = "";
let client_id = "33bst72zxflxxz5o3xrhntafqimhbh"; // make sure to use your own client ID
let raw_base_url = "https://dylmye.me/sadgeclipper/";
let base_url = encodeURIComponent(raw_base_url); // used in oauth callback
let base_helix_url = "https://api.twitch.tv/helix/"; // change to sandbox api if needed
let base_oauth_url = "https://id.twitch.tv/oauth2/";
const LOGIN_URL = `${base_oauth_url}authorize?client_id=${client_id}&redirect_uri=${base_url}oauth-callback.html&response_type=token&scope=user%3Aread%3Aemail&force_verify=true`;
const LOGOUT_URL = `${raw_base_url}logout.html`;

/** API Action endpoints from https://dev.twitch.tv/docs/api/reference */
const ACTIONS = {
    USERS: "users",
    CLIPS: "clips",
    // keep any not in use commented out to make minified file smaller
    // CHANNELS: "channels",
    // STREAMS: "streams",
    // GAMES: "games",
    // SUBS: "subscriptions",
    // VIDEOS: "videos",
    // COMMERCIAL: "channels/commercial",
    // ANALYTICS_EXTENSION: "analytics/extensions",
    // ANALYTICS_GAME: "analytics/games",
    // BITS_LEADERBOARD: "bits/leaderboard",
    // CHEERMOTES: "bits/cheermotes",
    // EXT_TXNS: "extensions/transactions",
    // POINT_REWARDS: "channel_points/custom_rewards",
    // POINT_REWARDS_REDEMPTIONS: "channel_points/custom_rewards/redemptions",
    // GRANT_DROP: "entitlements/upload",
    // DROP_CODES: "entitlements/codes",
    // ENTITLED_DROPS: "entitlements/drops",
    // DIRECTORY: "games/top",
    // SCAM_TRAIN: "hypetrain/events",
    // MODS: "moderation/moderators",
    // MOD_MSG_AUTOMOD_CHECK: "moderation/enforcements/status",
    // MOD_BAN_EVENTS: "moderation/banned/events",
    // MOD_BANS: "moderation/banned",
    // MOD_EVENTS: "moderation/moderators/events",
    // SEARCH_CATS: "search/categories",
    // SEARCH_CHANNELS: "search/channels",
    // KEY: "streams/key",
    // STREAM_MARKERS: "streams/markers",
    // STREAM_TAGS: "streams/tags",
    // ALL_STREAM_TAGS: "tags/streams",
    // FOLLOWS: "users/follows",
    // USER_EXTENSIONS: "users/extensions",
    // INSTALLED_EXTENSIONS: "users/extensions/list",
    // WEBHOOKS: "webhooks/subscriptions",
};

/** Sort options for Clips action */
const SORT_CLIPS = {
    byStreamerDesc: "Streamer (A-Z)",
    byStreamerAsc: "Streamer (Z-A)",
    chronologicalDesc: "Day Clipped (latest first)",
    chronologicalAsc: "Day Clipped (earliest first)",
};

/** Pagination sizes for Get Clips action, max: 100 */
const CLIPS_PAGE_SIZES = [
    5,
    10,
    20,
    50,
    100
];

/** Number of days to search for with Get Clips action */
const CLIPS_DAY_OPTIONS = [
    5,
    7,
    14,
    30
];

/** Max pagination size for Get Clips action */
const MAX_CLIPS_PAGE_SIZE = 100;

/** Default option settings */
const DEFAULT_SETTINGS = {
    settingsVersion: 1.0,
    previewsOpenEmbeds: false,
    usePrettyTimestamps: true,
    defaultSort: "chronologicalDesc",
    pageSizePerStreamer: 10,
    daysToSearch: 7,
    showDownloadButton: false,
};

const SETTING_TYPES = {
    BINARY_RADIO: "binary_radio",
    SIMPLE_DROPDOWN: "simple_dropdown",
    DROPDOWN: "dropdown",
}

/** Human-friendly text for settings. False = don't show */
const SETTING_LABELS = {
    settingsVersion: false,
    previewsOpenEmbeds: {
        text: "Click thumbnail to play embed?",
        type: SETTING_TYPES.BINARY_RADIO,
    },
    usePrettyTimestamps: {
        text: "Show dates relative to today?",
        type: SETTING_TYPES.BINARY_RADIO,
    },
    defaultSort: {
        text: "Sort clips by",
        type: SETTING_TYPES.DROPDOWN,
        options: SORT_CLIPS
    },
    pageSizePerStreamer: {
        text: "How many clips to show per streamer (max)",
        type: SETTING_TYPES.SIMPLE_DROPDOWN,
        options: CLIPS_PAGE_SIZES
    },
    daysToSearch: {
        text: "How many days to search",
        type: SETTING_TYPES.SIMPLE_DROPDOWN,
        options: CLIPS_DAY_OPTIONS
    },
    showDownloadButton: false,
};

// helpers
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
            "Client-ID": client_id,
            "Authorization": `Bearer ${bearer_token}`
        }),
        mode: "cors",
    };
}

/**
 * Sets an object of params on a URL object that is then returned
 * @param {URL} url - the URL object to append search params to
 * @param {*} params - the object of key->values to add as params
 * @returns {URL} updated URL
 */
function setUrlSearchParams(url, params) {
    Object.keys(params).forEach(k => {
        url.searchParams.set(k, params[k]);
    });

    return url;
}

/** Setting rules:
 *  * Key must only contain letters a-z, A-Z
 *  * Value must not contain = < > or &
 */
function setValueSafely(key, value, debug = SHOW_DEBUG) {
    const safeKey = key.replace(/[^A-Za-z]/g, '');
    const safeVal = typeof value === "string" ? value.replace(/[=<>&]/g, '') : value;
    if (debug) console.debug(`Setting value for key ${key}:`, value);
    return localforage.setItem(safeKey, safeVal, err => {
        if (err) console.error(`Unable to set value '${value}' (formatted to '${safeVal}') for key '${safeKey}': ${err}`);
    });
}

/** Getting rules:
 *  * Key must only contain letters a-z, A-Z
 *  * Value must not contain = < > or &
 */
async function getValueSafely(key, debug = SHOW_DEBUG) {
    const safeKey = key.replace(/[^A-Za-z]/g, '');
    const value = await localforage.getItem(safeKey, (err, val) => {
        if (debug) console.debug(`the value of '${key}' is`, val);
        if (err) console.error(`Unable to get value for key ${key} (formatted to ${safeKey}): ${err}`);
    });

    return value;
}

/**
 * Get all key-value pairs from store
 * @param {boolean} debug
 */
async function getStore(debug = SHOW_DEBUG) {
    const store = {};
    await localforage.iterate((v, k) => {
        store[k] = v;
    });
    if (debug) console.debug("the store contents are:", store);
    return store;
}

/**
 * Get a setting by its key.
 * @param {string} key The settings key to retrieve
 * @returns {string | number | boolean} the settings value 
 */
async function getSetting(key) {
    const settings = await getValueSafely("settings");
    if (!settings) {
        console.error("Couldn't load settings object as it hasn't been initalised");
        return null;
    }
    if(!(key in settings)) {
        console.error(`Couldn't find setting: ${key}`);
        return null;
    };
    return settings[key];
}

/**
 * Update the Settings object with current settings as backups
 * @param {*} newSettings The settings object to replace the current one with
 */
async function updateSettings(newSettings) {
    let newObj = {};

    const current = await getValueSafely("settings");

    Object.keys(DEFAULT_SETTINGS).forEach(k => {
        if(k === "settingsVersion") {
            // always update to the latest version as we disregard
            // any old keys
            newObj.settingsVersion = DEFAULT_SETTINGS.settingsVersion;
        } else if(!(k in newSettings)) {
            // set default value
            if (k in current) {
                newObj[k] = current[k];
            } else {
                newObj[k] = DEFAULT_SETTINGS[k];
            }
        } else {
            // set our updated thing
            newObj[k] = newSettings[k];
        }
    });

    setValueSafely("settings", newObj);
}

/**
 * Returns the filled HTML template for a given clip
 * @param {*} c - the clip to create HTML for
 * @param {*} settings - settings object
 * @returns {string} the HTMl for given clip
 */
function generateClipHtml(c, { previewsOpenEmbeds }) {
    return `
<li class="clip" id="clip-${c.id}">
    <a href="${!!previewsOpenEmbeds ? c.url : '#'}">
        <img src="${c.thumbnail_url}" alt="Thumbnail of a clip of ${c.broadcaster_name}'s stream" class="clip-thumb"${!previewsOpenEmbeds ? `onClick="openEmbed('${c.id}')"` : ''} />
    </a>
    <div class="clip-description">
        <p><a href="${c.url}">${c.title}</a></p>
        <p>
            Clipped by ${c.creator_name} &bullet; Clipped <span class="renderable-date" datetime="${c.created_at}" title="${c.created_at}">${c.created_at}</span>
        </p>
    </div>
</li>`;
}

function openEmbed(clipId) {
    $(`#clip-${clipId} img.clip-thumb`).replaceWith(`<iframe src="https://clips.twitch.tv/embed?clip=${clipId}&parent=dylmye.me" frameborder="0" allowfullscreen="true" scrolling="no" height="100%" width="100%"></iframe>`);
}

// action code
/**
 * Returns an array of broadcaster IDs related to provided
 * usernames.
 * @returns {string[]} array of broadcaster IDs
 */
async function getBroadcasterIds() {
    let endpoint = apiUrl(ACTIONS.USERS);
    const searchVal = await getValueSafely("search");

    if (!searchVal || !searchVal.length) {
        console.warning("Search value is empty; nothing to search for");
    }

    searchVal.split(',').forEach(username => {
        endpoint.searchParams.append("login", username);
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
        "broadcaster_id": broadcasterId,
        "first": 10,
        "started_at": from,
        "ended_at": to,
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
    const sevenDaysAgo = dayjs().subtract(7, "days").toISOString();

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
    $("#loader").show();
    if(!$("#usernames").val().length) return;
    timeago.cancel();

    await setValueSafely("search", $("#usernames").val());

    const store = await getStore();

    let clips = await getClipsForUsernames();
    clips = [].concat.apply([], clips);

    $("#clips").empty();
    (clips || []).forEach(c => {
        $("#clips").append(generateClipHtml(c, store.settings));
    });

    timeago.render(document.querySelectorAll(".renderable-date"));
    $("#loader").hide();
}

// settings modal

function renderSetting(key, value) {
    const labelObj = SETTING_LABELS[key];
    const label = typeof labelObj === "object" ? labelObj.text : null;
    if(label === null) return;
    let formattedVal;
    switch (labelObj.type) {
        case (SETTING_TYPES.BINARY_RADIO): {
            formattedVal = `<div>
    <label><input type="radio" name="${key}" value="true"${value ? " checked" :""}>Yes</label>
    <label><input type="radio" name="${key}" value="false"${!value ? " checked" :""}>No</label>
</div>`;
            break;
        }
        case (SETTING_TYPES.SIMPLE_DROPDOWN): {
            const options = labelObj.options.map(o => `<option${value === o ? " selected" : ""}>${o}</option$>`);
            formattedVal = `<select name="${key}">${options.join("\n")}\n</select>`;
            break;
        }
        case (SETTING_TYPES.DROPDOWN): {
            const options = Object.entries(labelObj.options).map(o => `<option value="${o[0]}"${value === o[0] ? " selected" : ""}>${o[1]}</option>`);
            formattedVal = `<select name="${key}">${options.join("\n")}\n</select>`;
            break;
        }
        default: {
            formattedVal = "no!";
            break;
        }
    }

    return `<div class="setting-row">
    <span class="setting-label">${label}</span>
    <span>${formattedVal}</span>
</div>
`;
}

/**
 * Populates the modal content
 */
async function onSettingsModalOpened() {
    $("#modal-settings-content").empty();
    const settings = await getValueSafely("settings");
    let settingElems = "";

    for (const [key, value] of Object.entries(settings)) {
        const row = renderSetting(key, value);
        if(typeof row === "undefined") continue;
        settingElems = settingElems + row;
    }

    $("#modal-settings-content").append(settingElems);
}

/**
 * Saves the form content in local storage
 */
function onSaveSettings() {
    const form = new FormData(document.getElementById("modal-settings-form"));
    const updatedFields = form.entries();
    let extractedFields = {};

    updateSettings(extractedFields);
    MicroModal.close("modal-settings");
}

/**
 * Empties the modal content
 */
function onSettingsModalClosed() {
    $("#modal-settings-content").empty();
    $("#modal-settings-content").append("<p>Loading settings...</p>");
}

// initalisation
/**
 * Set up localforage and determine how many keys are in the local store
 * @returns {boolean} If localforage is set up
 */
function getForageState() {
    if (typeof localforage === "undefined") {
        console.error("Unable to set up SadgeClipper storage: localforage is not supported by the browser (returns undefined).");
        return false;
    }

    localforage.config({
        name: "SadgeClipper",
        description: "Keystore for SadgeClipper data",
        version: 2,
    });

    return localforage.length().then(l => {
        return l > 0;
    })
}

/**
 * Create the local storage variables.
 * Throws an error if localforage failed.
 * @returns {boolean} whether localforage was set up successfully
 */
function setupStorage() {
    try {
        setValueSafely("search", "");
        setValueSafely("accessToken", "");
        setValueSafely("settings", DEFAULT_SETTINGS);
        console.debug("SadgeClipper sucessfully set up for the first time.");
        return true;
    } catch (e) {
        console.error("Unable to set up SadgeClipper storage:", e);
        return false;
    }
}

/**
 * Set bearer token and filters in DOM from localforage
 */
async function setValues() {
    const store = await getStore();

    if(store.accessToken && store.accessToken.length) {
        bearer_token = store.accessToken;
    }

    if(store.search && store.search.length) {
        $("#usernames").val(store.search);
    }

    if(!store.settings) {
        setValueSafely("settings", DEFAULT_SETTINGS);
    }
}

/**
 * Determine whether to show or hide the login and search elements in DOM.
 */
async function determineVisibility() {
    let loginButton = $("#logged-out");
    let logoutButton = $("#log-out");
    let loggedOutMessage = $("#empty-logged-out");
    
    if(!bearer_token || !bearer_token.length) {
        loginButton.attr("href", LOGIN_URL);
        $("#searchbar").hide();
    } else {
        loginButton.hide();
        loggedOutMessage.hide();
        logoutButton.attr("href", LOGOUT_URL);
        logoutButton.show();
    }
}

// setup on pageload
document.addEventListener("DOMContentLoaded", async () => {
    $("html").addClass("dom-loaded");

    let isSetUp = await getForageState();

    if(!isSetUp) {
        const successful = setupStorage();
        if (!successful) return;
    } else {
        await setValues();
    }

    determineVisibility();

    MicroModal.init({
        onShow: onSettingsModalOpened,
        onClose: onSettingsModalClosed,
        openClass: 'is-open',
        disableScroll: true,
        disableFocus: false,
        awaitOpenAnimation: false,
        awaitCloseAnimation: false,
        debugMode: false
    });

    $("#loader").hide();
});