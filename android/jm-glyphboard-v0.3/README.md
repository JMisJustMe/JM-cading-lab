# JM GLYPHBOARD v0.3 — Native Android IME Contact Gate

This is the first native Android keyboard carrier descended from the recovered `JM_GLYPHBOARD_OneBody_v0_2.html` source authority.

## What moved forward

- Real `InputMethodService`, not a WebView pretending to be a system keyboard.
- 17 recovered registry entries across symbols, JM glyphs, routes, expressions and commands.
- VIS / JM-PUA / fallback-text face modes.
- Favourites and recents stored locally.
- Local TraceStore receipts for commit attempts and HOLD states.
- Confirmation-gated commands do not trigger external effects; a long press inserts inert fallback text only.
- Launcher activity gives the owner a direct enable → choose → test route.
- No Internet permission.

## Honest boundary

This body is a **native-contact candidate**, not a physical Ding. Search, import/export, rich variant selection and recipient-aware semantic command execution remain open parity work. The owner phone must still prove install, enable, selection, typing into another app, persistence and return.

## Source authority

`app/src/main/assets/JM_GLYPHBOARD_OneBody_v0_2.html`

SHA-256: `8e75f92451e7382cd2c2656fb349353b5ba1ea27c21b95dc590963e5cfbee568`
