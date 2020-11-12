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
    if(!document.getElementById('usernames').value.length) return;

    setValueSafely("search", document.getElementById("usernames").value);

    let clips = await getClipsForUsernames();
    clips = [].concat.apply([], clips);

    $("#clips").empty();
    (clips || []).forEach(c => {
        $("#clips").append(`<li><img src="${c.thumbnail_url}" alt="Thumbnail of a clip of ${c.broadcaster_name}'s stream" /><p><a href="${c.url}">${c.title}</a></p></li>`);
    });
}

function setValueSafely(key, value) {
    return localStorage.setItem(key, value);
}

function getValueSafely(key) {
    const safeKey = key.replace(/\W/g, '');
    return localStorage.getItem(safeKey);
}

function setupStorage() {
    setValueSafely("search", "");
    setValueSafely("accessToken", "");
}

function setValues() {
    if(getValueSafely("search") && getValueSafely("search").length) {
        document.getElementById('usernames').value = getValueSafely("search");
    }
    bearer_token = getValueSafely("accessToken");

    let loginButton = document.getElementById("logged-out");
    
    if(!bearer_token || !bearer_token.length) {
        loginButton.href = `https://id.twitch.tv/oauth2/authorize?client_id=${client_id}&redirect_uri=${base_url}oauth-callback.html&response_type=token&scope=user%3Aread%3Aemail&force_verify=true`;
        $("#searchbar").hide();
    } else {
        $(loginButton).hide();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    if(!localStorage.length) {
        setupStorage();
    } else {
        setValues();
    }
});