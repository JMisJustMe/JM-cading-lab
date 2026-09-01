from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
lines=[]
for p in sorted(root.rglob('*')):
    if p.is_file() and '.git' not in p.parts and p.name!='SHA256SUMS.txt' and p.suffix!='.zip':
        lines.append(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root)}")
(root/'SHA256SUMS.txt').write_text('\n'.join(lines)+'\n')
print(f'Wrote {len(lines)} checksums')
