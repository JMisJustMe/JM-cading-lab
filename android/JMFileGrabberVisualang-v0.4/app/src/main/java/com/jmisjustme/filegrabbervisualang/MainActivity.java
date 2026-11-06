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
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl());
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return serve(Uri.parse(url));
        }
        private WebResourceResponse serve(Uri uri) {
            try {
                String url = uri.toString();
                if (APP_URL.equals(url) || "https://jm.app/".equals(url)) {
                    return new WebResourceResponse("text/html", "UTF-8", getAssets().open("index.html"));
                }
                if (url.startsWith(VAULT_PREFIX)) {
                    String id = uri.getLastPathSegment();
                    JSONObject meta = findMeta(id);
                    if (meta == null) return notFound();
                    File file = new File(vaultDir, meta.getString("stored"));
                    if (!file.isFile()) return notFound();
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-store");
                    headers.put("Access-Control-Allow-Origin", "https://jm.app");
                    return new WebResourceResponse(meta.optString("mime", "application/octet-stream"), null, 200, "OK", headers, new FileInputStream(file));
                }
            } catch (Exception ignored) { }
            return null;
        }
        private WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream("Not found".getBytes()));
        }
    }

    public final class NativeBridge {
        @JavascriptInterface public void pickFiles() { runOnUiThread(MainActivity.this::launchFiles); }
        @JavascriptInterface public void pickFolder() { runOnUiThread(MainActivity.this::launchFolder); }
        @JavascriptInterface public void restoreVault() { io.execute(() -> sendItems("restore", readMeta())); }
        @JavascriptInterface public void clearVault() { io.execute(MainActivity.this::clearVaultInternal); }
        @JavascriptInterface public void getStatus() {
            JSONObject payload = new JSONObject();
            try {
                payload.put("event", "status"); payload.put("ready", true);
                payload.put("label", "NATIVE READY · " + readMeta().length() + " VAULTED");
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
                    receipt.put("native_vault_count", items.length());
                    receipt.put("native_vault_bytes", bytes);
                    receipt.put("folder_picker", true);
                    receipt.put("cross_restart_private_vault", true);
                    receipt.put("ancestor_overwrite", false);
                    receipt.put("items", items);
                    receipt.put("boundary", "Receipt proves wrapper state reported by this installed app. Installation/device proof still requires the resulting APK to be installed and exercised by the user.");
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
        startActivityForResult(intent, P