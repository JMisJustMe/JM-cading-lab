from pathlib import Path
import base64, hashlib, lzma, shutil, zipfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "reconstructed-source"
SKELETON = ROOT / "source-carriage"
WEB = ROOT.parent / "signuances-v1.0.0-web" / "source-carriage"
EXPECTED_ZIP = "e8e76e2adfa3313ae472bc7f0086f9c8a135e394d2e69c51377d859dd82bb539"
EXPECTED_HTML = "fad2ddc3122ca47a7e1d130a0c27980822a1c542ba7ac52ceb2498fec497d631"

zip_bytes = base64.b64decode("".join((SKELETON / f"part-{i:02d}.b64").read_text().strip() for i in range(5)))
assert hashlib.sha256(zip_bytes).hexdigest() == EXPECTED_ZIP
zip_path = ROOT / ".signuances-android-source.zip"
zip_path.write_bytes(zip_bytes)
if OUT.exists(): shutil.rmtree(OUT)
with zipfile.ZipFile(zip_path) as z: z.extractall(OUT)
(OUT / ".github-workflow.yml").unlink(missing_ok=True)

xz_bytes = base64.b64decode("".join((WEB / f"part-{i:02d}.b64").read_text().strip() for i in range(16)))
html = lzma.decompress(xz_bytes)
assert hashlib.sha256(html).hexdigest() == EXPECTED_HTML
asset = OUT / "app/src/main/assets/index.html"
asset.parent.mkdir(parents=True, exist_ok=True)
asset.write_bytes(html)
print(f"ANDROID_SOURCE_RECONSTRUCTED zip={EXPECTED_ZIP} html={EXPECTED_HTML} bytes={len(html)}")
