package com.jmisjustme.estatesteward;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;

public final class MainActivity extends Activity {
    private static final int PICK_FILES = 4209;
    private static final int MOUNT_BODY = 4210;
    private static final String OLD_DOWNLOAD = "const download=(name,text,type='application/json')=>{const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)};";
    private static final String NATIVE_DOWNLOAD = "const download=(name,text,type='application/json')=>{if(window.JMNative&&typeof window.JMNative.saveText==='function'){try{const r=JSON.parse(window.JMNative.saveText(String(name),String(text),String(type)));if(r&&r.ok){if(typeof toast==='function')toast('Native saved: '+r.name,'good');return r}}catch(e){console.warn('Native export fallback',e)}}const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)};";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private final ArrayList<JSONObject> exports = new ArrayList<>();
    private SharedPreferences prefs;
    private File mountedBody;

    private static int dp(Activity a, int n) { return Math.round(n * a.getResources().getDisplayMetrics().density); }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(7, 19, 31));
        getWindow().setNavigationBarColor(Color.rgb(7, 19, 31));
        prefs = getSharedPreferences("native_exports", MODE_PRIVATE);
        mountedBody = new File(new File(getFilesDir(), "steward-body"), "index.html");
        loadExports();

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(7, 19, 31));

        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(this, 10), dp(this, 5), dp(this, 8), dp(this, 5));
        bar.setBackgroundColor(Color.rgb(10, 27, 42));

        TextView title = new TextView(this);
        title.setText("JM Steward · v0.9B Native Border");
        title.setTextColor(Color.WHITE);
        title.setTextSize(14);
        title.setSingleLine();
        bar.addView(title, new LinearLayout.LayoutParams(0, dp(this, 44), 1));

        Button body = new Button(this);
        body.setText("Body");
        body.setAllCaps(false);
        body.setOnClickListener(v -> chooseBody());
        bar.addView(body, new LinearLayout.LayoutParams(dp(this, 78), dp(this, 44)));

        Button shelf = new Button(this);
        shelf.setText("Receipts");
        shelf.setAllCaps(false);
        shelf.setOnClickListener(v -> showShelf());
        bar.addView(shelf, new LinearLayout.LayoutParams(dp(this, 104), dp(this, 44)));
        root.addView(bar);

        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "JMNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("file".equals(scheme) || "about".equals(scheme)) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception e) { Toast.makeText(MainActivity.this, "No app can open this route", Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, PICK_FILES);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
            }
        });
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        loadMountedBodyOrWelcome();
    }

    private void chooseBody() {
        startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE).setType("text/html"), MOUNT_BODY);
    }

    private void loadMountedBodyOrWelcome() {
        if (mountedBody.isFile() && mountedBody.length() > 0) {
            web.loadUrl(Uri.fromFile(mountedBody).toString());
            return;
        }
        String html = "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
                + "<style>body{margin:0;background:#07131f;color:#eef6ff;font:17px system-ui;padding:28px}.box{max-width:680px;margin:auto;background:#102438;border:1px solid #31516c;border-radius:24px;padding:24px}button{background:#6eddba;border:0;border-radius:16px;padding:15px 18px;font-weight:800;font-size:17px}code{color:#9ce8d0}</style>"
                + "<div class=box><h1>JM Estate Storage Steward</h1><h2>v0.9B · Native Border</h2>"
                + "<p>Mount the exact v0.9A Steward HTML once. The original stays untouched; this app keeps a private native-enabled working copy.</p>"
                + "<button onclick='JMNative.openBodyPicker()'>Mount Steward HTML</button>"
                + "<p>Exports remain in <code>Downloads/JM Estate Storage Steward</code>.</p></div>";
        web.loadDataWithBaseURL("about:blank", html, "text/html", "UTF-8", null);
    }

    private void mountBody(Uri source) {
        try {
            File parent = mountedBody.getParentFile();
            if (parent == null || (!parent.exists() && !parent.mkdirs())) throw new IOException("Private body shelf unavailable");
            File staged = new File(parent, "index.html.staged");
            try (InputStream input = getContentResolver().openInputStream(source); OutputStream output = new FileOutputStream(staged)) {
                if (input == null) throw new IOException("Selected body could not be read");
                byte[] buffer = new byte[32768];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            }
            if (staged.length() < 64 || staged.length() > 16_000_000) throw new IOException("Selected body is empty, incomplete, or unexpectedly large");
            String html = new String(Files.readAllBytes(staged.toPath()), StandardCharsets.UTF_8);
            String head = html.substring(0, Math.min(html.length(), 4096)).toLowerCase(Locale.ROOT);
            if (!head.contains("<html") && !head.contains("<!doctype") && !head.contains("<head")) throw new IOException("Selected file does not look like HTML");
            if (!html.contains(OLD_DOWNLOAD)) throw new IOException("Exact v0.9A export hook not found; select the supplied v0.9A body");
            html = html.replace(OLD_DOWNLOAD, NATIVE_DOWNLOAD);
            Files.write(staged.toPath(), html.getBytes(StandardCharsets.UTF_8));
            if (!new String(Files.readAllBytes(staged.toPath()), StandardCharsets.UTF_8).contains("JMNative.saveText")) throw new IOException("Native export patch did not verify");
            if (mountedBody.exists() && !mountedBody.delete()) throw new IOException("Previous private copy could not be replaced");
            if (!staged.renameTo(mountedBody)) throw new IOException("Private body mount could not be committed");
            prefs.edit().putString("mounted_source", source.toString()).putLong("mounted_at", System.currentTimeMillis()).apply();
            Toast.makeText(this, "Steward mounted · native export route verified", Toast.LENGTH_LONG).show();
            loadMountedBodyOrWelcome();
        } catch (Exception e) {
            Toast.makeText(this, "Mount failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private final class Bridge {
        @JavascriptInterface public String saveText(String requested, String text, String mime) {
            JSONObject result = new JSONObject();
            Uri uri = null;
            try {
                String name = sanitize(requested);
                String contentType = (mime == null || mime.trim().isEmpty()) ? "application/json" : mime;
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, name);
                values.put(MediaStore.Downloads.MIME_TYPE, contentType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/JM Estate Storage Steward");
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("Downloads route unavailable");
                try (OutputStream output = getContentResolver().openOutputStream(uri)) {
                    if (output == null) throw new IOException("Destination unavailable");
                    output.write((text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                getContentResolver().update(uri, values, null, null);
                JSONObject row = new JSONObject().put("name", name).put("uri", uri.toString())
                        .put("mime", contentType).put("savedAt", System.currentTimeMillis());
                exports.add(0, row);
                saveExports();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Saved permanently: " + name, Toast.LENGTH_SHORT).show());
                return result.put("ok", true).put("name", name).put("uri", uri.toString())
                        .put("shelf", "Downloads/JM Estate Storage Steward").toString();
            } catch (Exception e) {
                if (uri != null) try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) { }
                try { return result.put("ok", false).put("error", String.valueOf(e.getMessage())).toString(); }
                catch (Exception ignored) { return "{\"ok\":false}"; }
            }
        }
        @JavascriptInterface public void openReceiptShelf() { runOnUiThread(() -> showShelf()); }
        @JavascriptInterface public void openBodyPicker() { runOnUiThread(() -> chooseBody()); }
        @JavascriptInterface public int receiptCount() { return exports.size(); }
        @JavascriptInterface public boolean bodyMounted() { return mountedBody.isFile() && mountedBody.length() > 0; }
    }

    private static String sanitize(String value) {
        String name = value == null ? "JM_STEWARD_RECEIPT.json" : value.trim()
                .replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").replaceAll("\\s+", "_");
        while (name.startsWith(".")) name = name.substring(1);
        if (name.isEmpty()) name = "JM_STEWARD_RECEIPT.json";
        return name.length() > 120 ? name.substring(name.length() - 120) : name;
    }

    private void loadExports() {
        exports.clear();
        try {
            JSONArray rows = new JSONArray(prefs.getString("rows", "[]"));
            for (int i = 0; i < rows.length(); i++) exports.add(rows.getJSONObject(i));
        } catch (Exception ignored) { }
    }

    private void saveExports() {
        JSONArray rows = new JSONArray();
        for (JSONObject row : exports) rows.put(row);
        prefs.edit().putString("rows", rows.toString()).apply();
    }

    private void showShelf() {
        if (exports.isEmpty()) {
            new AlertDialog.Builder(this).setTitle("Native receipt shelf")
                    .setMessage("No native exports yet. Exports remain in Downloads/JM Estate Storage Steward.")
                    .setPositiveButton("OK", null).show();
            return;
        }
        String[] names = new String[exports.size()];
        for (int i = 0; i < names.length; i++) names[i] = exports.get(i).optString("name");
        new AlertDialog.Builder(this).setTitle("Native receipt shelf · " + names.length)
                .setItems(names, (dialog, which) -> openExport(exports.get(which)))
                .setNegativeButton("Close", null).show();
    }

    private void openExport(JSONObject row) {
        try {
            Uri uri = Uri.parse(row.getString("uri"));
            startActivity(new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, row.optString("mime", "application/octet-stream"))
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch (Exception e) {
            Toast.makeText(this, "Receipt route unavailable; file remains in Downloads", Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == MOUNT_BODY) {
            if (result == RESULT_OK && data != null && data.getData() != null) mountBody(data.getData());
            return;
        }
        if (request == PICK_FILES && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(result, data) : null);
            fileCallback = null;
        }
    }

    @Override public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    @Override protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("JMNative"); web.destroy(); }
        super.onDestroy();
    }
}
