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

const SHOW_DEBUG = true;
const base_oauth_url = "https://id.twitch.tv/oauth2/";
const client_id = "33bst72zxflxxz5o3xrhntafqimhbh"; // make sure to use your own client ID

/**
 * Handler for the API revocation request
 * @param {string} token The token to revoke
 * @returns {Promise<{success: boolean, message?: string}>} The promise from the request
 */
async function revokeToken(token) {
  let result;
  const req = await fetch(
    `${base_oauth_url}revoke?client_id=${client_id}&token=${token}`,
    {
      method: "POST",
      mode: "cors",
    }
  ).then(async (r) => {
    let res = {
      success: r.ok,
      message: null,
    };

    if (!r.ok) {
      if (r.body) {
        const body = await r.json();
        res.message = body.message;
      } else {
        res.message = "unknown error";
      }
    }

    result = res;
  });

  return result;
}

/**
 * Set up localforage and determine how many keys are in the local store
 * @returns {boolean} If localforage is set up
 */
function getForageState() {
  if (typeof localforage === "undefined") {
    console.error(
      "Unable to set up SadgeClipper storage: localforage is not supported by the browser (returns undefined)."
    );
    return false;
  }

  localforage.config({
    name: "SadgeClipper",
    description: "Keystore for SadgeClipper data",
    version: 2,
  });

  return localforage.length().then((l) => {
    return l > 0;
  });
}

document.addEventListener(
  "DOMContentLoaded",
  /**
   * On document load, we:
   * 1. Define localForage and test it works
   * 2. Find the access token
   * 3. Revoke (if necessary) and redirect to index
   */
  async function () {
    const isSetUp = await getForageState();

    if (!isSetUp) return;

    const localKeys = await localforage.keys();

    if (!("accessToken" in localKeys)) {
      console.error(
        "couldn't find an access token in local storage, assuming user is logged out..."
      );
      SHOW_DEBUG && console.debug(localKeys, "accessToken" in localKeys, localKeys.includes("accessToken"));
      location.href = "index.html";
      return;
    }

    const access_token = await localforage.getItem("accessToken");
    const res = await revokeToken(access_token);
    const { success, message } = res;

    if (success) {
      console.debug(
        "successfully revoked token, clearing from localStorage..."
      );
      localforage.setItem("accessToken", "").catch((err) => {
        console.log(err);
      });
      location.href = "index.html";
      return;
    } else {
      document.getElementById("status").innerHTML =
        "Unable to log you out. Please try again.";
      console.error(`Couldn't revoke token: ${message}`);
      return;
    }
  }
);
