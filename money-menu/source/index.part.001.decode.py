from base64 import b64decode
from pathlib import Path

source = Path(__file__).with_name('index.part.001.fix')
target = Path(__file__).with_name('index.part.001')
target.write_bytes(b64decode(source.read_text(encoding='ascii').strip()))
