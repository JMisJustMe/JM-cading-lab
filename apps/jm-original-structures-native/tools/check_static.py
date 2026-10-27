import hashlib, re, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
html=(root/'app/src/main/assets/index.html').read_bytes()
assert hashlib.sha256(html).hexdigest()=='9404f44492bad6c0c6ca25b7b6b86927a9ffc43a22565a1fa2dd99dc5c05e522'
manifest=(root/'app/src/main/AndroidManifest.xml').read_text()
activity=(root/'app/src/main/java/me/jmisjustme/originalstructures/MainActivity.java').read_text()
assert 'android.permission.INTERNET' not in manifest
assert 'me.jmisjustme.originalstructures' in activity
assert 'WebViewAssetLoader' in activity
assert 'AtomicFile' in activity
assert 'getFilesDir()' in activity
assert 'sha(bytes)' in activity
assert 'ACTION_CREATE_DOCUMENT' in activity
assert 'onShowFileChooser' in activity
assert 'setAllowFileAccess(false)' in activity
assert 'readSnapshot()' in activity
assert 'normalize(JSON.parse(' in activity
assert not re.search(r'addJavascriptInterface\([^;]*?"[^\"]+"\);',activity,re.S) or 'JMNativeBridge' in activity
print('CP08 static protected source/isolated namespace/native custody checks PASS')