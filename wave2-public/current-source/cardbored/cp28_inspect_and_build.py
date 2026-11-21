#!/usr/bin/env python3
from pathlib import Path
from hashlib import sha256
import base64,lzma,sys
def safe_write_candidate(output, candidate):
    """Keep owner edits, foreign outputs and symlink targets untouched."""
    payload=candidate.encode('utf8')
    if output.is_symlink():
        raise FileExistsError(f'CP28 HOLD: symlink output not overwritten: {output}')
    if output.exists():
        if not output.is_file() or output.read_bytes()!=payload:
            raise FileExistsError(f'CP28 HOLD: owner-edited output differs; choose --output PATH: {output}')
        return 'EXISTING_IDENTICAL'
    with output.open('xb') as stream:  # exclusive create; never follow a late symlink
        stream.write(payload)
    if output.read_bytes()!=payload:
        raise IOError(f'CP28 HOLD: new output readback mismatch: {output}')
    return 'CREATED_VERIFIED'

folder=Path(__file__).resolve().parent
parts=sorted(folder.glob('cardBORED_v0_5_HOUSE_DECKS_PRESSURE_BOARDS.lzma.b64.part*.txt'))
assert len(parts)==3
data=lzma.decompress(base64.b64decode(''.join(p.read_text().strip() for p in parts)),format=lzma.FORMAT_ALONE)
assert len(data)==53434
assert sha256(data).hexdigest()=='963ccc11699a72d6a6f06d2d84688265cdcd661fcfd8c5892a005405195091cb'
html=data.decode('utf8')
print('CP28 SOURCE PASS',len(data))
if '--inspect' in sys.argv:
 print('CP28_HEAD',html[:6500])
 print('CP28_TAIL',html[-7500:])
 print('CP28_FUNCTIONS',[(i,html[i:i+90]) for i in range(len(html)) if html.startswith('function ',i)][:65])
 print('CP28_INTERACTION_1',html[28600:35000])
 print('CP28_INTERACTION_2',html[39700:43500])
 print('CP28_DOM',html[17000:23800])

if '--build' in sys.argv:
 from cp28_native_patch import transform
 candidate=transform(html)
 assert len(candidate)>len(html), 'CP28 patch lost original source body'
 assert "window.JM_CARDBORED_V05" in candidate, 'v0.5 original missing'
 assert "function combat()" in candidate and "function applyCard(" in candidate, 'native game authority lost'
 output=folder/'CP28_cardBORED_NATIVE_CONTACT.html'
 if '--output' in sys.argv:
  at=sys.argv.index('--output')
  if at+1>=len(sys.argv) or sys.argv[at+1].startswith('--'):
   raise ValueError('CP28 --output requires a destination path')
  output=Path(sys.argv[at+1])
 state=safe_write_candidate(output,candidate)
 print("CP28_BUILT",str(output),len(candidate.encode('utf8')),sha256(candidate.encode('utf8')).hexdigest(),state)
