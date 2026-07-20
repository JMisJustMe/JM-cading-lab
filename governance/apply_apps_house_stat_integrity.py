from __future__ import annotations

from collections import Counter
import json
import re
from pathlib import Path

path = Path('apps/index.html')
text = path.read_text(encoding='utf-8')
match = re.search(r'const APPS=(\[.*?\]);\s*(?:const APP_STAT_COUNTS=\{.*?\};\s*)?const LABELS=', text, re.S)
if not match:
    raise SystemExit('Apps registry not found')
rows = json.loads(match.group(1))
counts = Counter(row[3] for row in rows)
room_count = len(rows)
full_count = counts['full_current'] + counts['full_alt']
routed_count = counts['routed']
recovery_count = counts['registered']
prep_count = counts['prep']

replacements = [
    (
        r'<div class="stat"><b>\d+</b><span>registered (?:app|non-game) rooms</span></div>',
        f'<div class="stat"><b>{room_count}</b><span>registered non-game rooms</span></div>',
    ),
    (
        r'<div class="stat"><b>\d+</b><span>(?:full owner|full \+ preserved) bodies</span></div>',
        f'<div class="stat"><b>{full_count}</b><span>full + preserved bodies</span></div>',
    ),
    (
        r'<div class="stat"><b>\d+</b><span>routed organs</span></div>',
        f'<div class="stat"><b>{routed_count}</b><span>routed organs</span></div>',
    ),
    (
        r'<div class="stat"><b>\d+ \+ \d+</b><span>(?:source-needed|package-retrieval) \+ preparation</span></div>',
        f'<div class="stat"><b>{recovery_count} + {prep_count}</b><span>package-retrieval + preparation</span></div>',
    ),
]
for pattern, replacement in replacements:
    text, changed = re.subn(pattern, replacement, text, count=1)
    if changed != 1:
        raise SystemExit(f'Stat marker failed: {pattern}')

text = re.sub(
    r'Whole-Estate public door · \d+(?: non-game)? rooms · RouteOS flagship bridged',
    f'Whole-Estate public door · {room_count} non-game rooms · RouteOS flagship bridged',
    text,
    count=1,
)
text = re.sub(
    r'const FILTERS=\[\["all","All \d+"\]',
    f'const FILTERS=[["all","All {room_count}"]',
    text,
    count=1,
)

receipt = {
    'room_count': room_count,
    'full_plus_preserved': full_count,
    'routed': routed_count,
    'source_needed': recovery_count,
    'preparation': prep_count,
}
if 'const APP_STAT_COUNTS=' in text:
    text = re.sub(r'const APP_STAT_COUNTS=\{.*?\};', 'const APP_STAT_COUNTS=' + json.dumps(receipt, separators=(',', ':')) + ';', text, count=1)
else:
    text = text.replace('const LABELS=', 'const APP_STAT_COUNTS=' + json.dumps(receipt, separators=(',', ':')) + ';\nconst LABELS=', 1)

path.write_text(text, encoding='utf-8')
print(json.dumps(receipt, indent=2))
