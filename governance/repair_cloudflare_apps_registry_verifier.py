from __future__ import annotations

from pathlib import Path

PATH = Path('.github/workflows/deploy-cloudflare-estate-live-preserving.yml')
text = PATH.read_text(encoding='utf-8')

# 1. Derive the Apps count before writing the deployment manifest.
old_manifest = '''          cat > cloudflare-estate/DEPLOY_MANIFEST.json <<'EOF'
          {
            "schema": "JM.CloudflareEstateDeployment/1.4",
            "version": "v1.16.1-theory-mobile-tabs-clearance",
            "project": "jmisjustme-estate",
            "canonical_host": "jmisjustme-estate.pages.dev",
            "source_rail": "JMisJustMe/JM-cading-lab",
            "rooms": ["navigator", "apps", "theory", "lyrics", "recovery"],
            "apps_registry_count": 40,
'''
new_manifest = '''          APP_COUNT="$(python3 - <<'PY'
          import json, re
          from pathlib import Path
          text = Path('cloudflare-estate/apps/index.html').read_text(encoding='utf-8')
          match = re.search(r'const APPS=(\\[.*?\\]);\\s*const APP_STAT_COUNTS=', text, re.S)
          if not match:
              raise SystemExit('Apps registry could not be parsed before manifest creation.')
          print(len(json.loads(match.group(1))))
          PY
          )"

          cat > cloudflare-estate/DEPLOY_MANIFEST.json <<EOF
          {
            "schema": "JM.CloudflareEstateDeployment/1.5",
            "version": "v1.17.0-estate-classification-integrity",
            "project": "jmisjustme-estate",
            "canonical_host": "jmisjustme-estate.pages.dev",
            "source_rail": "JMisJustMe/JM-cading-lab",
            "rooms": ["navigator", "apps", "theory", "lyrics", "recovery"],
            "apps_registry_count": ${APP_COUNT},
'''
if old_manifest in text:
    text = text.replace(old_manifest, new_manifest, 1)
elif '"version": "v1.17.0-estate-classification-integrity"' not in text:
    raise SystemExit('Deployment manifest marker changed unexpectedly.')

# 2. Replace the stale literal count assertion with a registry-derived proof body.
old_verify = '''          grep -q "NON-GAME APPS HOUSE" cloudflare-estate/apps/index.html
          grep -q "40 rooms" cloudflare-estate/apps/index.html
          grep -q "Human Pattern Calibration" cloudflare-estate/theory/index.html
'''
new_verify = '''          grep -q "NON-GAME APPS HOUSE" cloudflare-estate/apps/index.html
          python3 <<'PY'
          from collections import Counter
          import json, re
          from pathlib import Path

          text = Path('cloudflare-estate/apps/index.html').read_text(encoding='utf-8')
          rows_match = re.search(r'const APPS=(\\[.*?\\]);\\s*const APP_STAT_COUNTS=', text, re.S)
          stats_match = re.search(r'const APP_STAT_COUNTS=(\\{.*?\\});', text, re.S)
          if not rows_match or not stats_match:
              raise SystemExit('Deployed Apps registry or embedded count receipt is unreadable.')
          rows = json.loads(rows_match.group(1))
          shown = json.loads(stats_match.group(1))
          counts = Counter(row[3] for row in rows)
          expected = {
              'room_count': len(rows),
              'full_plus_preserved': counts['full_current'] + counts['full_alt'],
              'routed': counts['routed'],
              'source_needed': counts['registered'],
              'preparation': counts['prep'],
          }
          if shown != expected:
              raise SystemExit(f'Apps count receipt mismatch: {shown} != {expected}')
          if any(row[0] == 'RouteOS' for row in rows):
              raise SystemExit('RouteOS has regressed into the literal Non-Game Apps registry.')
          retrieval = {row[0] for row in rows if row[3] == 'registered'}
          if retrieval != {'Portal Engine', 'Latest Body Finder', 'Source-Body Auditor'}:
              raise SystemExit(f'Unexpected exact-package retrieval set: {sorted(retrieval)}')
          required_text = [
              'RouteOS has returned to its sovereign gaming-platform seat',
              'Exact package retrieval',
              'package-retrieval + preparation',
          ]
          missing = [value for value in required_text if value not in text]
          if missing:
              raise SystemExit(f'Apps classification markers missing: {missing}')
          print(f'Apps registry proof PASS: {len(rows)} rooms; {expected}')
          PY
          grep -q "Human Pattern Calibration" cloudflare-estate/theory/index.html
'''
if old_verify in text:
    text = text.replace(old_verify, new_verify, 1)
elif 'Apps registry proof PASS' not in text:
    raise SystemExit('Apps verification marker changed unexpectedly.')

# 3. Make the live proof identify the corrected Apps body, not merely any Apps page.
old_live = '''              && grep -q "NON-GAME APPS HOUSE" "$RUNNER_TEMP/live-apps.html" \\
              && grep -q "Human Pattern Calibration" "$RUNNER_TEMP/live-theory.html" \\
'''
new_live = '''              && grep -q "NON-GAME APPS HOUSE" "$RUNNER_TEMP/live-apps.html" \\
              && grep -q "RouteOS has returned to its sovereign gaming-platform seat" "$RUNNER_TEMP/live-apps.html" \\
              && grep -q "Exact package retrieval" "$RUNNER_TEMP/live-apps.html" \\
              && grep -q "package-retrieval + preparation" "$RUNNER_TEMP/live-apps.html" \\
              && grep -q "Human Pattern Calibration" "$RUNNER_TEMP/live-theory.html" \\
'''
if old_live in text:
    text = text.replace(old_live, new_live, 1)
elif 'package-retrieval + preparation" "$RUNNER_TEMP/live-apps.html"' not in text:
    raise SystemExit('Live Apps proof marker changed unexpectedly.')

# 4. Derive the successful deployment receipt count from the same public registry.
old_receipt = '''          mkdir -p registry
          cat > registry/cloudflare-auto-deploy-receipt.json <<EOF
'''
new_receipt = '''          mkdir -p registry
          APP_COUNT="$(python3 - <<'PY'
          import json, re
          from pathlib import Path
          text = Path('apps/index.html').read_text(encoding='utf-8')
          match = re.search(r'const APPS=(\\[.*?\\]);\\s*const APP_STAT_COUNTS=', text, re.S)
          if not match:
              raise SystemExit('Apps registry could not be parsed before receipt creation.')
          print(len(json.loads(match.group(1))))
          PY
          )"
          cat > registry/cloudflare-auto-deploy-receipt.json <<EOF
'''
if 'APP_COUNT="$(python3 - <<\'PY\'' not in text[text.find('Write successful five-room deployment receipt'):]:
    if old_receipt not in text:
        raise SystemExit('Deployment receipt opening marker changed unexpectedly.')
    text = text.replace(old_receipt, new_receipt, 1)

text = text.replace('"apps_registry_count": 40,', '"apps_registry_count": ${APP_COUNT},')
text = text.replace('"schema": "JM.CloudflareAutoDeployReceipt/1.4",', '"schema": "JM.CloudflareAutoDeployReceipt/1.5",')
text = text.replace(
    'git diff --cached --quiet || git commit -m "Record Theory mobile reader clearance deployment success"',
    'git diff --cached --quiet || git commit -m "Record classification-integrity Cloudflare deployment success"',
)

PATH.write_text(text, encoding='utf-8')
print('Cloudflare Apps deployment verifier now derives its truth from the Apps registry.')
