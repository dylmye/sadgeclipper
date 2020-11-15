let bearer_token = "";
let client_id = '33bst72zxflxxz5o3xrhntafqimhbh';
let base_url = encodeURIComponent("https://dylmye.me/sadgeclipper/");
let base_helix_url = "https://api.twitch.tv/helix/";

function getOptions() {
    return {
        method: 'GET',
        headers: new Headers({
            'Client-ID': client_id,
            'Authorization': `Bearer ${bearer_token}`
        }),
        mode: 'cors',
    };
}

async function getBroadcasterIds() {
    let endpoint = new URL(`${base_helix_url}users`);
    (getValueSafely("search")).split(',').forEach(username => {
        endpoint.searchParams.append('login', username);
    });

    const fetcher = await fetch(endpoint, getOptions());
    const res = await fetcher.json();
    if (res.error) console.error(res.message);
    return res.data.map(x => x.id);
}

async function getClipsForBroadcasterId(broadcasterId, from, to) {
    let endpoint = new URL(`${base_helix_url}clips`);
    endpoint.searchParams.append('broadcaster_id', broadcasterId);
    endpoint.searchParams.append('first', 10);
    endpoint.searchParams.append('started_at', from);
    endpoint.searchParams.append('ended_at', to);
    
    const fetcher = await fetch(endpoint, getOptions());
    const res = await fetcher.json();
    if (res.error) console.error(res.message);
    return res.data;
}

async function getClipsForUsernames() {
    const ids = await getBroadcasterIds();

    const now = dayjs().toISOString();
    const sevenDaysAgo = dayjs().subtract(7, 'days').toISOString();

    const clips = await Promise.all(ids.map(async i => await getClipsForBroadcasterId(i, sevenDaysAgo, now)));
    return clips;
}

function onClickSearch() {
    search();
}

async function search() {
    if(!$("#usernames").value.length) return;
    timeago.cancel();

    setValueSafely("search", $("#usernames").value);

    let clips = await getClipsForUsernames();
    clips = [].concat.apply([], clips);

    $("#clips").empty();
    (clips || []).forEach(c => {
        $("#clips").append(`<li class="clip"><a href="${c.url}"><img src="${c.thumbnail_url}" alt="Thumbnail of a clip of ${c.broadcaster_name}'s stream" class="clip-thumb" /></a><div class="clip-description"><p><a href="${c.url}">${c.title}</a></p><p>Clipped by ${c.creator_name} &bullet; Clipped <span class="renderable-date" datetime="${c.created_at}" title="${c.created_at}">${c.created_at}</span></p></div></li>`);
    });

    timeago.render(document.querySelectorAll('.renderable-date'));
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

function determineVisibility() {
    bearer_token = getValueSafely("accessToken");

    let loginButton = $("#logged-out");
    
    if(!bearer_token || !bearer_token.length) {
        loginButton.href = `https://id.twitch.tv/oauth2/authorize?client_id=${client_id}&redirect_uri=${base_url}oauth-callback.html&response_type=token&scope=user%3Aread%3Aemail&force_verify=true`;
        $("#searchbar").hide();
    } else {
        $(loginButton).hide();
    }
}

function setupStorage() {
    setValueSafely("search", "");
    setValueSafely("accessToken", "");
}

function setValues() {
    if(getValueSafely("search") && getValueSafely("search").length) {
        $("#usernames").value = getValueSafely("search");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if(!localStorage.length) {
        setupStorage();
    } else {
        setValues();
    }
    determineVisibility();
});