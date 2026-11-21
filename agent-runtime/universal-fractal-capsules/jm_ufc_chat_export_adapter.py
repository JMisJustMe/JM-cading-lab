#!/usr/bin/env python3
"""CP03: parse an explicit exported ChatGPT conversation tree into original-byte UFC.

No platform API access. Preserves every message branch, not only the visible path.
Missing attachment bytes are an explicit HOLD; never treat pointers as originals.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import uuid
from pathlib import Path

from jm_ufc import CapsuleError, canonical, password_from_env, secure_relative, validate_uuid
from jm_ufc_web import export_web

MAX_EXPORT = 128 * 1024 * 1024
MAX_SELECTED = 15 * 1024 * 1024
MAX_ASSET = 12 * 1024 * 1024


def _selected_conversation(source_file, wanted):
    if not isinstance(wanted, str) or not wanted:
        raise CapsuleError('Explicit conversation ID required')
    if not source_file.is_file() or source_file.stat().st_size > MAX_EXPORT:
        raise CapsuleError('Missing/oversized conversation export (128 MiB ceiling)')
    try:
        raw = json.loads(source_file.read_text('utf-8'))
    except (ValueError, UnicodeError) as exc:
        raise CapsuleError('Unreadable ChatGPT JSON export') from exc
    if isinstance(raw, dict):
        all_chats = [raw]
    elif isinstance(raw, list):
        all_chats = raw
    else:
        raise CapsuleError('Expected ChatGPT conversation object or array')
    matches = [x for x in all_chats if isinstance(x, dict) and
               (x.get('id') == wanted or x.get('conversation_id') == wanted)]
    if len(matches) != 1:
        raise CapsuleError('Selected conversation missing or ambiguous; no fallback by title')
    result = matches[0]
    if len(canonical(result)) > MAX_SELECTED:
        raise CapsuleError('Selected conversation too large for browser carrier')
    return result


def _asset_pointers(content):
    """Walk message content without claiming all platform-specific asset encodings."""
    pointers = []
    def visit(node):
        if isinstance(node, dict):
            p = node.get('asset_pointer')
            if isinstance(p, str) and p:
                pointers.append(p)
            for key, value in node.items():
                if key != 'asset_pointer':
                    visit(value)
        elif isinstance(node, list):
            for value in node:
                visit(value)
    visit(content)
    return list(dict.fromkeys(pointers))


def _branch_path(mapping, tip):
    if not isinstance(tip, str) or tip not in mapping:
        raise CapsuleError('Missing/invalid current_node; cannot infer visible branch')
    path = []
    seen = set()
    current = tip
    while current is not None:
        if not isinstance(current, str) or current not in mapping or current in seen:
            raise CapsuleError('Current branch broken or cyclic')
        seen.add(current)
        node = mapping[current]
        if not isinstance(node, dict):
            raise CapsuleError('Invalid export node')
        if node.get('message') is not None:
            path.append(current)
        current = node.get('parent')
    path.reverse()
    return path


def _nearest_message_ancestor(mapping, node_id):
    seen = {node_id}
    cur = mapping[node_id].get('parent')
    while cur is not None:
        if not isinstance(cur, str) or cur not in mapping or cur in seen:
            raise CapsuleError('Missing or cyclic message ancestry')
        seen.add(cur)
        node = mapping[cur]
        if not isinstance(node, dict):
            raise CapsuleError('Bad ancestry record')
        if node.get('message') is not None:
            return cur
        cur = node.get('parent')
    return None


def build_spec(export: Path, conversation_id: str, owner_id: str, number: int,
               stage: Path, assets_root: Path | None = None, asset_map: Path | None = None,
               previous_capsule_id: str | None = None):
    validate_uuid(owner_id, 'owner_id')
    if type(number) is not int or number < 1:
        raise CapsuleError('Explicit positive personal number required')
    if previous_capsule_id is not None:
        validate_uuid(previous_capsule_id, 'previous_capsule_id')
    chat = _selected_conversation(export, conversation_id)
    mapping = chat.get('mapping')
    if not isinstance(mapping, dict) or not mapping or len(mapping) > 1000:
        raise CapsuleError('Expected bounded branching mapping (up to 1000 nodes)')
    live_path = _branch_path(mapping, chat.get('current_node'))
    for k, node in mapping.items():
        if not isinstance(k, str) or not isinstance(node, dict):
            raise CapsuleError('Malformed mapping entry')
        # A missing node-id is normal in some exports; the map key is the stable source ID.
        if node.get('message') is not None:
            message = node['message']
            if not isinstance(message, dict) or not isinstance(message.get('author'), dict) or not isinstance(message['author'].get('role'), str):
                raise CapsuleError('Malformed export message')
            _nearest_message_ancestor(mapping, k)
    if len([1 for x in mapping.values() if x.get('message') is not None]) == 0:
        raise CapsuleError('No actual message bodies')
    assets = {}
    if asset_map:
        if not assets_root or not asset_map.is_file() or asset_map.stat().st_size > 1024*1024:
            raise CapsuleError('Explicit asset-map and root required')
        try:
            assets = json.loads(asset_map.read_text('utf-8'))
        except (ValueError, UnicodeError) as exc:
            raise CapsuleError('Unreadable asset pointer map') from exc
        if not isinstance(assets, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k,v in assets.items()):
            raise CapsuleError('Asset map must be pointer-to-relative-path object')
        assets_root = assets_root.resolve()
    stage.mkdir(parents=True, exist_ok=True)
    root_uuid = uuid.uuid5(uuid.UUID(owner_id), 'chatgpt-conversation:' + conversation_id)
    root_id = str(root_uuid)
    source = stage / 'selected-original-conversation.json'
    source.write_bytes(canonical(chat))
    items = [{
        'id': root_id, 'kind': 'conversation', 'source': source.name,
        'path': 'chat/selected-original-conversation.json', 'parents': [], 'position': 0,
        'metadata': {
            'source_id': conversation_id, 'title': str(chat.get('title', '')),
            'branch_tip': chat.get('current_node'), 'export_schema': 'ChatGPT mapping tree',
            'message_count_including_branches': sum(1 for x in mapping.values() if x.get('message') is not None),
            'visible_branch_message_count': len(live_path),
            'source_preservation': 'Selected conversation object, canonical JSON bytes; not whole export archive'
        }
    }]
    live_set = set(live_path)
    # Nodes on the selected live branch first, then historical/alternative branches.
    with_messages = [x for x in mapping if mapping[x].get('message') is not None]
    ordering = live_path + sorted(x for x in with_messages if x not in live_set)
    id_by_node = {k: str(uuid.uuid5(root_uuid, 'message-node:' + k)) for k in with_messages}
    count_assets = 0
    for order, node_id in enumerate(ordering):
        node = mapping[node_id]
        message = node['message']
        ancestor = _nearest_message_ancestor(mapping, node_id)
        mid = id_by_node[node_id]
        content_file = stage / f'message-{order:05d}.json'
        content_file.write_bytes(canonical({'node_id': node_id, 'node': node}))
        parent = id_by_node[ancestor] if ancestor else root_id
        items.append({
            'id': mid, 'kind': 'message', 'source': content_file.name,
            'path': f'messages/{order:05d}.json',
            'parents': [parent], 'position': len(items),
            'metadata': {'source_node_id': node_id, 'source_parent_node': node.get('parent'),
                         'author_role': message['author']['role'], 'current_branch': node_id in live_set,
                         'full_raw_node_preserved': True}
        })
        for index, pointer in enumerate(_asset_pointers(message.get('content'))):
            if pointer not in assets:
                raise CapsuleError(f'Unresolved attachment pointer in message {node_id}; original bytes missing')
            relative = secure_relative(assets[pointer])
            entry_path = assets_root / relative
            full = entry_path.resolve()
            if entry_path.is_symlink() or not full.is_relative_to(assets_root) or not full.is_file() or full.stat().st_size > MAX_ASSET:
                raise CapsuleError('Missing/unsafe/oversized attachment original')
            name = f'asset-{count_assets:04d}{full.suffix.lower()}'
            count_assets += 1
            staged = stage / name
            shutil.copyfile(full, staged)
            suffix = full.suffix.lower()
            kind = 'image' if suffix in ('.png','.jpg','.jpeg','.gif','.webp') else 'document' if suffix in ('.pdf','.docx','.txt') else 'other'
            items.append({
                'id': str(uuid.uuid5(uuid.UUID(mid), 'attachment-pointer:' + pointer)),
                'kind': kind, 'source': name,
                'path': f'attachments/{order:05d}/{index:03d}-{full.name}',
                'parents': [mid], 'position': len(items),
                'metadata': {'asset_pointer': pointer, 'original_relative_path': str(relative),
                             'message_node_id': node_id, 'attachment_index': index}
            })
    return {
        'owner_id': owner_id, 'personal_number': number, 'creation_kind': 'conversation',
        'previous_capsule_id': previous_capsule_id, 'items': items
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--export', required=True, type=Path, help='Explicit exported JSON with mapping')
    p.add_argument('--conversation-id', required=True)
    p.add_argument('--owner-id', required=True)
    p.add_argument('--personal-number', required=True, type=int)
    p.add_argument('--archive', required=True, type=Path)
    p.add_argument('--assets-root', type=Path)
    p.add_argument('--asset-map', type=Path)
    p.add_argument('--previous-capsule-id')
    a = p.parse_args()
    try:
        secret = password_from_env('JM_UFC_PASSPHRASE')
        with tempfile.TemporaryDirectory(prefix='jm-chatgpt-export-cp03-') as folder:
            stage = Path(folder)
            spec = build_spec(a.export, a.conversation_id, a.owner_id, a.personal_number,
                              stage, a.assets_root, a.asset_map, a.previous_capsule_id)
            sf = stage/'capsule-spec.json'
            sf.write_bytes(canonical(spec))
            receipt = export_web(sf, a.archive, secret)
        print(json.dumps({'capsule_id': receipt['capsule_id'], 'item_count': receipt['item_count'],
                          'archive_sha256': receipt['encrypted_archive_sha256'],
                          'scope': 'One selected ChatGPT export conversation; no provider API access'}, indent=2))
        return 0
    except (CapsuleError, OSError, UnicodeError, ValueError) as exc:
        print('CHATGPT EXPORT HOLD:', exc, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
