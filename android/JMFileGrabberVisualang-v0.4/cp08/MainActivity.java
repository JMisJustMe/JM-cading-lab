package com.jmisjustme.filegrabbervisualang;

import android.app.Activity;
import android.os.Bundle;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.graphics.Insets;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int PICK_FILES = 3241;
    private static final int PICK_FOLDER = 3242;
    private static final int MAX_FILES = 500;
    private static final long MAX_TOTAL_BYTES = 512L * 1024L * 1024L;
    private static final String APP_URL = "https://jm.app/index.html";
    private static final String VAULT_PREFIX = "https://jm.vault/body/";

    private WebView web;
    private ValueCallback<Uri[]> pendingWebChooser;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private File vaultDir;
    private SharedPreferences prefs;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        vaultDir = new File(getFilesDir(), "jm_native_vault");
        if (!vaultDir.exists()) vaultDir.mkdirs();
        prefs = getSharedPreferences("jm_native_vault", MODE_PRIVATE);

        web = new WebView(this);
        web.setLayoutParams(new ViewGroup.LayoutParams(-1, -1));
        web.setBackgroundColor(android.graphics.Color.rgb(3,5,10));
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new NativeBridge(), "JMNative");
        web.setWebViewClient(new LocalClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingWebChooser != null) pendingWebChooser.onReceiveValue(null);
                pendingWebChooser = callback;
                launchFiles();
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(APP_URL);
    }

    private final class LocalClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            // A JavascriptInterface cannot identify its calling origin: never navigate this WebView away from the asset.
            return request.isForMainFrame() && !NativeVaultTruth.isAppUrl(request.getUrl().toString());
        }
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return !NativeVaultTruth.isAppUrl(url);
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl());
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return serve(Uri.parse(url));
        }
        private WebResourceResponse serve(Uri uri) {
            try {
                String url = uri.toString();
                if (NativeVaultTruth.isAppUrl(url)) {
                    return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                }
                if (NativeVaultTruth.isVaultUrl(url)) {
                    String id = uri.getLastPathSegment();
                    JSONObject meta = findMeta(id);
                    if (meta == null || !NativeVaultTruth.verify(vaultDir, meta.optString("stored"), id, meta.optLong("size", -1))) return notFound();
                    File file = new File(vaultDir, meta.getString("stored"));
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store");
                    headers.put("Access-Control-Allow-Origin", "https://jm.app");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(meta.optString("mime", "application/octet-stream"), null, 200, "OK", headers, new FileInputStream(file));
                }
            } catch (Exception ignored) { }
            // Never fall back to network for an unknown URL: this WebView owns a privileged native bridge.
            return notFound();
        }
        private WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream("Not found".getBytes()));
        }
    }

    public final class NativeBridge {
        @JavascriptInterface public void pickFiles() { runOnUiThread(MainActivity.this::launchFiles); }
        @JavascriptInterface public void pickFolder() { runOnUiThread(MainActivity.this::launchFolder); }
        @JavascriptInterface public void restoreVault() { io.execute(MainActivity.this::restoreVerifiedVault); }
        @JavascriptInterface public void clearVault() { io.execute(MainActivity.this::clearVaultInternal); }
        @JavascriptInterface public void getStatus() {
            JSONObject payload = new JSONObject();
            try {
                payload.put("event", "status"); payload.put("ready", true);
                payload.put("label", "NATIVE READY · " + readMeta().length() + " LEDGER ROWS · VERIFY RESTORE");
                payload.put("boundary", "Files are copied into the app-private vault. Provider originals remain untouched.");
            } catch (Exception ignored) { }
            send(payload);
        }
        @JavascriptInterface public void exportReceipt() {
            io.execute(() -> {
                JSONObject receipt = new JSONObject();
                try {
                    JSONArray items = readMeta();
                    long bytes = 0; for (int i=0;i<items.length();i++) bytes += items.getJSONObject(i).optLong("size",0);
                    receipt.put("schema", "JM.FileGrabberVisualang.NativeReceipt/0.4");
                    receipt.put("generated_at", System.currentTimeMillis());
                    receipt.put("ledger_rows", items.length());
                    receipt.put("ledger_reported_bytes_UNVERIFIED", bytes);
                    receipt.put("folder_picker", true);
                    VaultResult audited = auditVault();
                    receipt.put("cross_restart_private_vault", "VERIFIED_THIS_RUN");
                    long verifiedBytes = 0;
                    for (int i=0;i<audited.valid.length();i++) verifiedBytes += audited.valid.getJSONObject(i).optLong("size",0);
                    receipt.put("verified_items", audited.valid.length());
                    receipt.put("verified_bytes", verifiedBytes);
                    receipt.put("recovery_holds", audited.holds);
                    receipt.put("ancestor_overwrite", false);
                    JSONArray publicItems = new JSONArray();
                    for (int i=0;i<audited.valid.length();i++) publicItems.put(publicMeta(audited.valid.getJSONObject(i)));
                    receipt.put("items", publicItems);
                    receipt.put("boundary", "Receipt proves wrapper state reported by this installed app. Native visual magic does not replace exact-byte, vault or device proof.");
                    JSONObject payload = new JSONObject(); payload.put("event","receipt"); payload.put("receipt",receipt); send(payload);
                } catch (Exception e) { sendError(e); }
            });
        }
    }

    private void launchFiles() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(intent, PICK_FILES);
    }
    private void launchFolder() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(intent, PICK_FOLDER);
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILES && pendingWebChooser != null) {
            Uri[] webResult = extractUris(result, data);
            pendingWebChooser.onReceiveValue(webResult);
            pendingWebChooser = null;
            if (result == RESULT_OK && data != null) processFileIntent(data);
            return;
        }
        if (result != RESULT_OK || data == null) return;
        if (request == PICK_FILES) processFileIntent(data);
        if (request == PICK_FOLDER && data.getData() != null) processTree(data.getData(), data.getFlags());
    }

    private Uri[] extractUris(int result, Intent data) {
        if (result != RESULT_OK || data == null) return null;
        ClipData clip = data.getClipData();
        if (clip != null) {
            Uri[] out = new Uri[clip.getItemCount()];
            for (int i=0;i<clip.getItemCount();i++) out[i] = clip.getItemAt(i).getUri();
            return out;
        }
        return data.getData() == null ? null : new Uri[]{data.getData()};
    }

    private void processFileIntent(Intent data) {
        List<Uri> uris = new ArrayList<>();
        if (data.getClipData() != null) for (int i=0;i<data.getClipData().getItemCount();i++) uris.add(data.getClipData().getItemAt(i).getUri());
        else if (data.getData() != null) uris.add(data.getData());
        int flags = data.getFlags();
        for (Uri uri : uris) persist(uri, flags);
        io.execute(() -> importUris(uris, "files"));
    }

    private void processTree(Uri tree, int flags) {
        persist(tree, flags);
        io.execute(() -> {
            try {
                List<Uri> uris = new ArrayList<>();
                collectTree(tree, DocumentsContract.getTreeDocumentId(tree), uris);
                importUris(uris, "files");
            } catch (Exception e) { sendError(e); }
        });
    }

    private void collectTree(Uri tree, String parentId, List<Uri> out) throws Exception {
        if (out.size() >= MAX_FILES) return;
        Uri children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, parentId);
        String[] columns = {DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_MIME_TYPE};
        try (Cursor cursor = getContentResolver().query(children, columns, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext() && out.size() < MAX_FILES) {
                String id = cursor.getString(0); String mime = cursor.getString(1);
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) collectTree(tree, id, out);
                else out.add(DocumentsContract.buildDocumentUriUsingTree(tree, id));
            }
        }
    }

    private void persist(Uri uri, int flags) {
        try {
            int take = flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            getContentResolver().takePersistableUriPermission(uri, take & Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) { }
    }

    private void importUris(List<Uri> uris, String event) {
        try {
            JSONArray meta = readMeta();
            long total = 0; for (int i=0;i<meta.length();i++) total += meta.getJSONObject(i).optLong("size",0);
            JSONArray added = new JSONArray();
            for (Uri uri : uris) {
                if (meta.length() >= MAX_FILES || total >= MAX_TOTAL_BYTES) break;
                JSONObject item = copyIntoVault(uri, total);
                if (item == null) continue;
                JSONObject existing = findMeta(item.getString("id"), meta);
                if (existing == null) { meta.put(item); total += item.optLong("size",0); }
                else item = existing;
                added.put(publicMeta(item));
            }
            writeMeta(meta);
            JSONObject payload = new JSONObject(); payload.put("event",event); payload.put("items",added); send(payload);
        } catch (Exception e) { sendError(e); }
    }

    private JSONObject copyIntoVault(Uri uri, long currentTotal) throws Exception {
        ContentResolver resolver = getContentResolver();
        String name = queryName(uri); String mime = resolver.getType(uri);
        if (mime == null) mime = mimeFromName(name);
        File temp = new File(vaultDir, "incoming_" + UUID.randomUUID());
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        long size = 0;
        try {
            try (InputStream in = resolver.openInputStream(uri)) {
                if (in == null) return null;
                try (FileOutputStream output = new FileOutputStream(temp)) {
                    byte[] buffer = new byte[64 * 1024]; int read;
                    while ((read = in.read(buffer)) != -1) {
                        if (currentTotal + size + read > MAX_TOTAL_BYTES) throw new IllegalStateException("Native intake exceeded the 512 MB private-vault guard.");
                        digest.update(buffer,0,read); output.write(buffer,0,read); size += read;
                    }
                    output.getFD().sync();
                }
            }
            String sha = hex(digest.digest()); String id = sha;
            JSONObject existing = findMeta(id);
            if (existing != null && NativeVaultTruth.verify(vaultDir, existing.optString("stored"), sha, existing.optLong("size",-1))) return existing;
            String safe = name == null ? "body.bin" : name.replaceAll("[^A-Za-z0-9._-]", "_");
            if (safe.isEmpty()) safe = "body.bin";
            if (safe.length() > 100) safe = safe.substring(safe.length()-100);
            File target = new File(vaultDir, sha + "_" + safe);
            if (!temp.renameTo(target)) {
                try (FileInputStream input=new FileInputStream(temp);FileOutputStream output=new FileOutputStream(target)) {
                    byte[] b=new byte[65536];int n;while((n=input.read(b))!=-1)output.write(b,0,n);
                    output.getFD().sync();
                }
            }
            if (!NativeVaultTruth.verify(vaultDir, target.getName(), sha, size)) {
                target.delete(); throw new IllegalStateException("Native vault write did not verify.");
            }
            JSONObject item = new JSONObject();
            item.put("id",id); item.put("name",name); item.put("mime",mime); item.put("size",size); item.put("sha256",sha);
            item.put("stored",target.getName()); item.put("lastModified",System.currentTimeMillis()); item.put("sourceUri",uri.toString());
            return item;
        } finally { if (temp.exists()) temp.delete(); }
    }

    private String queryName(Uri uri) {
        try (Cursor c=getContentResolver().query(uri,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)) {
            if(c!=null&&c.moveToFirst()) return c.getString(0);
        } catch(Exception ignored) { }
        String last=uri.getLastPathSegment(); return last==null?"body.bin":last;
    }
    private String mimeFromName(String name) {
        String ext=MimeTypeMap.getFileExtensionFromUrl(name); String mime=MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.toLowerCase(Locale.ROOT));
        return mime==null?"application/octet-stream":mime;
    }

    private JSONArray readMeta() {
        try { return new JSONArray(prefs.getString("items", "[]")); } catch(Exception e) { return new JSONArray(); }
    }
    private void writeMeta(JSONArray items) { prefs.edit().putString("items",items.toString()).apply(); }
    private JSONObject findMeta(String id) { return findMeta(id,readMeta()); }
    private JSONObject findMeta(String id, JSONArray list) {
        try { for(int i=0;i<list.length();i++){JSONObject x=list.getJSONObject(i);if(id.equals(x.optString("id")))return x;} } catch(Exception ignored) { }
        return null;
    }
    private JSONObject publicMeta(JSONObject item) throws Exception {
        JSONObject out=new JSONObject();
        for(String key:new String[]{"id","name","mime","size","sha256","lastModified"}) out.put(key,item.opt(key));
        out.put("url",VAULT_PREFIX+item.getString("id")); return out;
    }
    private static final class VaultResult {
        final JSONArray valid = new JSONArray();
        final JSONArray holds = new JSONArray();
    }
    private VaultResult auditVault() {
        VaultResult result = new VaultResult();
        JSONArray rows = readMeta();
        for (int i=0;i<rows.length();i++) {
            JSONObject row = rows.optJSONObject(i);
            String id = row == null ? "" : row.optString("id", "");
            boolean verified = row != null && id.equals(row.optString("sha256", ""))
                && NativeVaultTruth.verify(vaultDir, row.optString("stored", ""), id, row.optLong("size", -1));
            if (verified) result.valid.put(row);
            else {
                JSONObject hold = new JSONObject();
                try { hold.put("id", id); hold.put("index", i); hold.put("status", "HOLD_UNVERIFIED_BYTES"); } catch (Exception ignored) { }
                result.holds.put(hold);
            }
        }
        return result;
    }
    private void restoreVerifiedVault() {
        try {
            VaultResult audited = auditVault();
            JSONArray items = new JSONArray();
            for (int i=0;i<audited.valid.length();i++) items.put(publicMeta(audited.valid.getJSONObject(i)));
            JSONObject payload = new JSONObject();
            payload.put("event", "restore"); payload.put("items", items);
            payload.put("verification", "SHA256_EXACT_BYTES_THIS_RUN"); payload.put("holds", audited.holds);
            send(payload);
            // Held rows remain in the ledger for explicit owner-led recovery; no silent purge.
        } catch (Exception e) { sendError(e); }
    }

    private void sendItems(String event, JSONArray stored) {
        try { JSONArray items=new JSONArray(); for(int i=0;i<stored.length();i++)items.put(publicMeta(stored.getJSONObject(i))); JSONObject payload=new JSONObject();payload.put("event",event);payload.put("items",items);send(payload); } catch(Exception e){sendError(e);}
    }
    private void clearVaultInternal() {
        File[] files=vaultDir.listFiles(); if(files!=null)for(File f:files)f.delete(); writeMeta(new JSONArray());
        try{JSONObject p=new JSONObject();p.put("event","cleared");send(p);}catch(Exception ignored){}
    }
    private void sendError(Exception e) { try { JSONObject p=new JSONObject();p.put("event","error");p.put("message",e.getMessage()==null?e.getClass().getSimpleName():e.getMessage());send(p); } catch(Exception ignored){} }
    private void send(JSONObject payload) { String quoted=JSONObject.quote(payload.toString()); web.post(() -> web.evaluateJavascript("window.JMNativeReceive("+quoted+")",null)); }
    private static String hex(byte[] bytes) { StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(Locale.ROOT,"%02x",b));return out.toString(); }

    @Override public void onBackPressed() { if(web.canGoBack())web.goBack();else super.onBackPressed(); }
    @Override protected void onDestroy(){ io.shutdownNow(); if(web!=null)web.destroy(); super.onDestroy(); }
}
