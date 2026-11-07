# ICU.Live Shield

**English** · [Español](README.es.md)

Extension for Chrome, Edge, Opera and Firefox that lets a YouTube channel owner show their **exact subscriber count** on
ICU.Live, instead of the rounded number YouTube shows publicly. A channel that uses it, and whose number matches the
public one, gets the 🛡️ shield on the ICU.Live monitor.

## ICU.Live

- [icu.live](https://icu.live) — the ICU.Live project.
- [Monitor](https://monitor.icu.live) — real-time audience of the channels, where the 🛡️ shield is shown.
- [User manual](https://monitor.icu.live/manual/#escudo) — the shield and the padlock, explained (in Spanish).
- [Privacy policy](https://icu.live/shield-privacy.html?lang=en) — what the extension reads, sends and stores.
- [ICU.Live panel → Shield](https://icu.live/admin/shield.php) — where the channel owner generates the linking code
  (requires an ICU.Live user).

## What it does

- It only works on **YouTube Studio** (`studio.youtube.com`), in the channel owner's browser.
- It makes no requests of its own to YouTube: it reads the response YouTube Studio already receives when it shows the
  subscriber count and takes **only** two values: the subscriber total and the channel ID (`UC…`).
- When the number changes, it sends it to `https://cdn.icu.live/shield/`; if it does not change, it sends a heartbeat
  once a minute. If ICU.Live does not respond, the value is discarded.
- It reads no other data from the channel or the Google account, and no other pages. It never asks for keys or
  passwords.

## How to link it

1. In the ICU.Live panel, under **Shield**, the channel owner generates a linking code (it expires after 15 minutes).
2. They paste it into the extension, or open the QR link in the browser where the extension is installed.
3. ICU.Live only accepts YouTube Studio counts from the linked channel.

## Icon LED

Only while YouTube Studio is being viewed; on any other site the icon has no LED and **Send / Stop sending** cannot be
used.

- **Red:** linked and sending; the last count was accepted.
- **Blinking amber and gray:** YouTube Studio is open outside *Analytics → Real-time subscriber count*; nothing is sent
  that way.
- **Steady amber:** connecting, after tapping **Send**; it turns red once ICU.Live accepts the value.
- **Gray:** not linked, the last send failed, or **Stop sending** is on.

## Keeping the tab awake

While the tab is on the subscriber count and the extension is sending, the extension asks the browser not to discard
it and holds a *Web Lock* so it is not frozen. If it falls asleep anyway, ICU.Live turns the shield off after 3 minutes
without data.

## How to pause it

The **Stop sending** button stops sending the count without unlinking the extension; **Send** resumes it.

## How to unlink it

With the extension's **Unlink** button, from the ICU.Live panel, or by uninstalling the extension.

## Languages

52 languages in `_locales/` (those of the Chrome, Edge, Opera and Firefox stores). It uses the browser language; the
window's language menu lets you choose another one (for example, a foreigner on a browser set to Spanish).

## Files

| File | What it does |
|---|---|
| `manifest.json`, `manifest.firefox.json` | Chromium and Firefox. Permissions: `storage` (keep the link), `alarms` (keep the LED blinking) and `https://cdn.icu.live/shield/*` (send the count). |
| `inject.js` | Inside YouTube Studio: takes the subscriber total from Studio's response. |
| `bridge.js` | Passes that number to the extension and keeps the tab awake. |
| `bg.js` | Keeps the link and sends the count to ICU.Live. |
| `link-page.js` | Links the extension from the QR link. |
| `popup.html`, `popup.js` | Extension window: link, status, pause, language and unlink. |
| `i18n.js`, `_locales/` | Texts in each language. |
| `build.ps1` | Builds the store packages (not part of the extension). |

## Packages

`manifest.json` is for Chrome, Edge and Opera (Chromium). Firefox uses `manifest.firefox.json`.
`powershell -ExecutionPolicy Bypass -File build.ps1` builds one zip for each in `dist/`, ready to upload to its store.

## License

The source code is published so anyone can review what it does. All rights reserved: see [LICENSE](LICENSE).
Suggestions are welcome as *issues*.
