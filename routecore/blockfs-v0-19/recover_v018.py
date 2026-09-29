#!/usr/bin/env python3
from pathlib import Path
import base64,gzip,hashlib,json,shutil,subprocess,sys,zipfile
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[1]
OUT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else (REPO/'routecore-v19')
WORK=OUT/'work'; PIECES=OUT/'pieces'
shutil.rmtree(OUT,ignore_errors=True);WORK.mkdir(parents=True);PIECES.mkdir(parents=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def norm(path):return b''.join(Path(path).read_bytes().split())
def check(label,data,expected):
    got=sha(data)
    if got!=expected:raise SystemExit(f'{label} sha {got} != {expected}')
def patch_bytes(data,name):
    p=OUT/name;p.write_bytes(data);subprocess.run(['patch','-p1'],cwd=WORK,input=data,check=True)
def run_build(proof,total,label):
    shutil.rmtree(WORK/'build',ignore_errors=True);shutil.rmtree(WORK/'runtime',ignore_errors=True);shutil.rmtree(WORK/'__pycache__',ignore_errors=True);(WORK/'build').mkdir();(WORK/'runtime').mkdir()
    subprocess.run([sys.executable,'build.py'],cwd=WORK,stdout=(OUT/f'{label}-build.stdout').open('w'),check=True)
    p=json.loads((WORK/proof).read_text());assert p['status']=='PASS' and p['passed']==total and p['total']==total and p['checks']['deterministic_rebuild'] is True,p
    print(label,'PASS',p['passed'],'/',p['total'])
pieces=[
('routecore/ata-pio-v0-13/fix/00a.b64','40cedefd86fee512975cd9a474dfbcb1158c60dcd9279a2629ef515bc2dde6e3'),
('routecore/ata-pio-v0-13/fix/00b.b64','2b8d98c6d83b92030c362691de098d1e84d401842313e7b938741189a689c109'),
('routecore/ata-pio-v0-13/fix/00c.b64','d496e03cff56993eaf6b43274b7a5f87285cf20f60015c8fcc3b4793dd3762ef'),
('routecore/ata-pio-v0-13/package/part01.b64','8f67a481669e7b318d95fb5ffa7adf979455284d1daa6005cd4196d8adb59f81'),
('routecore/ata-pio-v0-13/fix/02a1.b64','c691001c43be82c9946e39351b93b246f15771072e5873247b5a920a73a6b51b'),
('routecore/ata-pio-v0-13/fix/02a2.b64','8aaf2ea4bd507d788f3a49dbf147b72b86d8ebd28260e0b9830179332cb326b7'),
('routecore/ata-pio-v0-13/fix/02b.b64','caad037e7adb9dd78f3dcf4f98af4791da4b0d0fc9e409f24b3230ddd0ca9bda'),
('routecore/ata-pio-v0-13/fix/02c.b64','03734fce7a853ee943cebf6a143f9508f25c75a24dbc57c74150d2083c0dee40'),
('routecore/ata-pio-v0-13/fix/03a.b64','cf20a5243d6c549754f2ca9052420833e773e329b08cd1ad0146433fe3392b66'),
('routecore/ata-pio-v0-13/fix/03b.b64','dc292926b605dacba198b4f0ccb201d5b42d7abc2a5684228e8f1c4e5c014c6f'),
('routecore/ata-pio-v0-13/fix/03c.b64','acf96fdc659ea359d0d432a34d96a75e8648f99913f49a71b14f6cf22df2a25f'),
('routecore/ata-pio-v0-13/package/part04.b64','496aa4c9fa5afbf7055399d84178b43301afae28f94f485b957a2cccaef120e8'),
('routecore/ata-pio-v0-13/package/part05.b64','73043cca8284d8f8e94c832d776667ed45f27388754640a5e799a75033278bf7')]
b64=b''
for rel,expected in pieces:
    q=norm(REPO/rel);check(rel,q,expected);b64+=q
check('v013 b64',b64,'613232f9c88cdcdd833941011c2183a48353c40831e75e749c841ae726b2d59a')
z=base64.b64decode(b64);check('v013 zip',z,'2ee8e512520030359083e9bf60585f404001adac226d7621e167a5a259116c55');(OUT/'v013.zip').write_bytes(z)
with zipfile.ZipFile(OUT/'v013.zip') as f:f.extractall(WORK)
shutil.copy2(WORK/'INSPECT_ATA_DISK.py',WORK/'INSPECT_AHCI_DISK.py')
for rel,name in [('routecore/ahci-v0-14/v014.patch.gz.b64','v014.patch'),('routecore/ahci-v0-14/q35fix.patch.gz.b64','q35fix.patch')]:patch_bytes(gzip.decompress(base64.b64decode(norm(REPO/rel))),name)
subprocess.run([sys.executable,str(REPO/'routecore/virtio-blk-v0-15/make_v015.py'),str(WORK)],check=True)
raw=gzip.decompress(base64.b64decode(norm(REPO/'routecore/blockfs-v0-16/v016.patch.gz.b64')));check('v016 patch',raw,'4a73b2e9414dd799939747959ae72154d73c2a9085bd74de7226e57e181af92c');patch_bytes(raw,'v016.patch');run_build('JM_ROUTECORE_NATIVE64_BLOCKFS_v0_16_PROOF.json',237,'v016')
b17=b''.join(norm(REPO/f'routecore/blockfs-v0-17/package/part{n:02}.b64') for n in range(1,5));check('v017 b64',b17,'04ebec2c8f835afdc2841c94b4d69002852e38b6975d6935ff7afcc5ca12a7c7');raw=gzip.decompress(base64.b64decode(b17));check('v017 patch',raw,'9411d3f234084bbf2ec6fe50b170ae0d372634cec563cd779201777097134d58');patch_bytes(raw,'v017.patch');run_build('JM_ROUTECORE_NATIVE64_BLOCKFS_v0_17_PROOF.json',245,'v017')
b18=b''.join(norm(REPO/f'routecore/blockfs-v0-18/package/part{n:02}.b64') for n in range(1,5));check('v018 b64',b18,'0a8ef7c5d3e7bd5181f52cd776302e64ace57f32ccbd6c2b5ca7df7a0047d738');raw=gzip.decompress(base64.b64decode(b18));check('v018 patch',raw,'d809a6436f992cef9f34cd35167c3d4896eef9bf6421d4e1c471f822b16c2826');patch_bytes(raw,'v018.patch');run_build('JM_ROUTECORE_NATIVE64_BLOCKFS_v0_18_PROOF.json',265,'v018')
shutil.rmtree(WORK/'build',ignore_errors=True);shutil.rmtree(WORK/'runtime',ignore_errors=True);shutil.rmtree(WORK/'__pycache__',ignore_errors=True)
print('RECOVERED EXACT PROVED v0.18 SOURCE BODY')
