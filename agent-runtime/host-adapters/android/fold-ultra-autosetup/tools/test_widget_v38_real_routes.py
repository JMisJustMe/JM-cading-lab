from pathlib import Path
p=Path(__file__).resolve().parents[1]/'app/src/main/java/com/jmisjustme/foldultra'
s=(p/'ProjectShelf.java').read_text(encoding='utf-8')
w=(p/'JMHomeWidget.java').read_text(encoding='utf-8')
assert 'entry("jm-lyric-home","JM Lyric Home","MUSIC","https://jmisjustme-estate.pages.dev/lyrics/")' in s
assert 'entry("jm-buildcad","JM BuildCAD","BUILD","")' in s
assert 'UNLINKED / Open Shelf' in w
assert 'OPEN VERIFIED PUBLIC ROUTE' in w
print('PASS v3.8 verified lyric route, unlinked BuildCAD preserved, explicit widget status')