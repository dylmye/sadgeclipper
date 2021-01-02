# SadgeClipper
## A useful clips and highlights dashboard powered by Twitch API 

SadgeClipper is a simple, static dashboard that uses the Twitch API to get clips from the last week. 

This is in beta - see [the roadmap](https://github.com/dylmye/sadgeclipper/projects/1) for future plans. 

If you have any feedback or ideas please tweet me [@dylan_mye](https://twitter.com/dylan_mye) or create an issue [here](https://github.com/dylmye/sadgeclipper/issues/new) (requires a GitHub account).

[**Demo here**](https://dylmye.me/sadgeclipper/)

## Setup

There's no extra modules to install or anything - this project uses cdnjs to load scripts.

To adapt the project for your own use/domain, set up a app with Twitch [here](https://dev.twitch.tv/console/apps) and replace [the following variables](https://github.com/dylmye/sadgeclipper/blob/master/script.js#L17-L18) in script.js:

```js
let client_id = "<your-client-id-here>";
let raw_base_url = "https://<domain and path to sadgeclipper instance here>/";
```

Make sure `raw_base_url` has a slash at the end. You should set that value + `oauth-callback.html` as an OAuth Redirect URL (1). You can get the client ID value from (2).

![screenshot of the Twitch Manage App page. The textbox underneath 'Oauth Redirect URLs' is highlighted as number 1. The textbox underneath 'Client ID' is highlighted as number 2.](https://user-images.githubusercontent.com/7024578/103461477-96d39500-4d16-11eb-8f1d-35d974e18733.png)

You can read about the Twitch API [here](https://dev.twitch.tv/docs/api#introduction) and read the reference docs [here](https://dev.twitch.tv/docs/api/reference).

## Licenses

SadgeClipper is licensed under the [ISC](https://github.com/dylmye/sadgeclipper/blob/master/LICENSE) - you must include the copyright notice in any copies as well as a copy of that license file.

SadgeClipper depends on the following software:
* [Cash](https://github.com/fabiospampinato/cash) by Fabio Spampinato, Ken Wheeler and contributors, licensed under [MIT](https://github.com/fabiospampinato/cash/blob/master/LICENSE.md). Portions copyright 2014-2020 Ken Wheeler, 2020-present Fabio Spampinato.
* [Dayjs](https://github.com/iamkun/dayjs) by iamkun and contributors, licensed under [MIT](https://github.com/iamkun/dayjs/blob/dev/LICENSE). Portions copyright 2018-present, iamkun.
* [timeago.js](https://github.com/hustcc/timeago.js/) by Hust.cc and contributors, licensed under [MIT](https://github.com/hustcc/timeago.js/blob/master/LICENSE). Portions copyright 2016 Hust.cc.
* [localForage](https://github.com/localForage/localForage) by Matthew Riley MacPherson, Thodoris Greasidis and contributors, licensed under [Apache 2.0](https://github.com/localForage/localForage/blob/master/LICENSE). Portions copyright 2014 Mozilla.
