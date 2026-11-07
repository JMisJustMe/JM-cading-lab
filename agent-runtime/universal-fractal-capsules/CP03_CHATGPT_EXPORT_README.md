# JM UFC CP03 — ChatGPT exported conversation ancestry adapter

**New additive adapter to the existing JM UFC CP02 encryption and custody family, not a new conversation service.** Its purpose is owner-controlled recovery of *a selected chat* from a user-supplied ChatGPT export JSON **mapping tree**, keeping earlier alternative/regenerated message branches as well as the presently selected branch.

## Behavior and scope

- Accept an explicit `conversations.json` JSON array or a single conversation JSON object from a lawful owner-provided export, then select by exact conversation `id`/`conversation_id`. It does not search an account or scrape chats.
- Require `mapping` nodes and `current_node`. Walk `parent` links, preserving each message node's unmodified JSON data and its relationship to the nearest ancestor message. Preserve abandoned/regenerated alternative nodes as separate message items with `current_branch: false`. Preserve `current_branch: true` for nodes on the live ancestry path.
- Embed the complete selected conversation object as canonical JSON, while preserving each message branch separately for expandable navigation. It is **not** a byte-for-byte copy of the entire exported `conversations.json` file: no unrelated conversations, account metadata or credentials are carried into the selected capsule.
- For each `asset_pointer` in a selected message, require an explicit asset map from pointer to a locally available original file under `--assets-root`. Original bytes are copied and hash verified by the unchanged CP02 exporter; ambiguous, missing, symlink-outside-base, path-traversal and oversize sources cause HOLD rather than a fake recovered image.
- Current bounded parser: export JSON max 128 MiB; selected conversation 15 MiB; max 1,000 mapping nodes; each original attachment 12 MiB; final browser capsule remains CP02's 16 MiB ceiling. Larger original works need the existing more capacious CP01 format or a future streaming descendant, not silent truncation.

## Usage

Only after separately preserving the original export and identifying the **exact** target chat ID:

```bash
python jm_ufc_chat_export_adapter.py \
  --export /private/ChatGPT-export/conversations.json \
  --conversation-id ORIGINAL_CONVERSATION_ID \
  --owner-id YOUR_EXISTING_OWNER_UUID \
  --personal-number YOUR_EXISTING_NUMBER \
  --asset-map /private/asset-map.json \
  --assets-root /private/ChatGPT-export/actual-assets \
  --archive /private/encrypted-selected-chat.jmufc
```

Use `JM_UFC_PASSPHRASE` as an environment variable; never put a real passphrase into chat or a command-line argument. `--asset-map` is optional only when the selected conversation contains **no** `asset_pointer` objects. Format:

```json
{
  "file-service://EXAMPLE-IMAGE-POINTER": "original-asset.png"
}
```

The path is relative to `--assets-root`; no network URL downloads occur. The resulting archive and sidecar receipt are CP02 standard and may be verified, restored and stored through existing `jm_ufc_web.py` and `jm_ufc_custody.py`. Optional CP03 signatures may be added with the separate `jm_ufc_authority.py` tool after actual owner-key reconciliation.

## Proof and limitations

- Synthetic branching tests cover current vs alternative replies, parent edges, original image bytes, successful encrypted restore, missing pointer HOLD, invalid conversation ID HOLD, cycle rejection and traversal rejection.
- This parser targets the **mapping-tree export format** and rejects variants it cannot confidently interpret. Flat `messages[]` formats and split/streaming exports are not supported or claimed. Do not assume an exported asset pointer is an accessible original or that a chat is recoverable when its attachment files are absent.
- No real private user's ChatGPT conversation was read or copied in the test. No source-chat sidebar rehydration in the ChatGPT app is claimed. This is a portable reference/custody archive, not an unofficial import into a vendor chat account.

SOURCE BEFORE CROWN · DO NOT REPLACE HISTORICAL CHATS · ORIGINAL MEDIA BYTES OR HOLD.
