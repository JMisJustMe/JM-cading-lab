#!/usr/bin/env python3
from pathlib import Path
from hashlib import sha256
import base64,lzma,sys
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
