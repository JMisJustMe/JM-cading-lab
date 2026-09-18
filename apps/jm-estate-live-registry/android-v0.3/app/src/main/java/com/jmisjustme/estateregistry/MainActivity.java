package com.jmisjustme.estateregistry;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    static final int PICK_IMPORT = 3001;
    static final int SAVE_EXPORT = 3002;
    private static final String LOCAL_ORIGIN = "https://registry.jm.local/";
    private static final String PARENT_BODY = "JM Estate Live Registry App v0.2 — Native Circulation";
    private static final String PARENT_SHA256 = "0ec929d0c4f0c281878af091263c45b8db4b5b71edb40e911364c43d15336f38";
    private WebView web;
    private ValueCallback<Uri[]> fileChooser;
    private String pendingExportText;
    private String pendingExportName;
    private DocumentRequestHook documentRequestHook;

    interface DocumentRequestHook {
        boolean onRequest(int requestCode, Intent intent);
    }

    void setDocumentRequestHookForTest(DocumentRequestHook hook) {
        documentRequestHook = hook;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        openRegistry();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void openRegistry() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xff0c0f14);
        web = new WebView(this);
        web.setBackgroundColor(0xff0c0f14);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new AndroidHostBridge(), "JMAndroidHost");
        web.setWebChromeClient(new RegistryChromeClient());
        web.setWebViewClient(new RegistryClient());
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        Button proof = new Button(this);
        proof.setText("ⓘ");
        proof.setTextSize(18);
        proof.setContentDescription("JM Estate Registry Android proof");
        proof.setMinWidth(dp(44));
        proof.setMinHeight(dp(44));
        proof.setPadding(0, 0, 0, 0);
        proof.setBackgroundColor(0xdd141922);
        proof.setTextColor(Color.WHITE);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP | Gravity.END);
        params.setMargins(0, dp(6), dp(6), 0);
        root.addView(proof, params);
        proof.setOnClickListener(v -> showProof());

        setContentView(root);
        web.loadUrl(LOCAL_ORIGIN + "index.html");
    }

    private void showProof() {
        new AlertDialog.Builder(this)
            .setTitle("JM Estate Registry · Android v0.3")
            .setMessage("Surface: native Android carrier\nPackage: com.jmisjustme.estateregistry\nOrigin: " + LOCAL_ORIGIN + "\n\nFrozen parent:\n" + PARENT_BODY + "\n" + PARENT_SHA256 + "\n\nThe APK hosts the Registry; it does not replace or merge the frozen parent. Browser storage belongs to this stable app origin.")
            .setPositiveButton("OK", null)
            .show();
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception e) { Toast.makeText(this, "No external route available.", Toast.LENGTH_SHORT).show(); }
    }

    private boolean launchDocumentRequest(Intent intent, int requestCode) {
        if (documentRequestHook != null && documentRequestHook.onRequest(requestCode, intent)) return true;
        try { startActivityForResult(intent, requestCode); return true; }
        catch (Exception e) { return false; }
    }

    private final class RegistryChromeClient extends WebChromeClient {
        @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileChooser != null) fileChooser.onReceiveValue(null);
            fileChooser = callback;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            if (launchDocumentRequest(intent, PICK_IMPORT)) return true;
            fileChooser.onReceiveValue(null);
            fileChooser = null;
            return false;
        }
    }

    private final class RegistryClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !"registry.jm.local".equalsIgnoreCase(uri.getHost())) return null;
            return localResponse(uri);
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equalsIgnoreCase(uri.getScheme()) && "registry.jm.local".equalsIgnoreCase(uri.getHost())) return false;
            openExternal(uri);
            return true;
        }

        @Override public void onPageFinished(WebView view, String url) {
            if (!url.startsWith(LOCAL_ORIGIN)) return;
            String bridge = "(()=>{if(window.__jmAndroidBridge)return;window.__jmAndroidBridge=true;const oldCreate=URL.createObjectURL.bind(URL);const blobs=new Map();URL.createObjectURL=(b)=>{const u=oldCreate(b);blobs.set(u,b);return u;};const nativeAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){const a=this;if(a.download&&a.href.startsWith('blob:')&&blobs.has(a.href)){blobs.get(a.href).text().then(text=>JMAndroidHost.saveText(a.download||'JM_EXPORT.json',text)).catch(err=>console.error(err));return;}return nativeAnchorClick.call(a);};window.__jmAndroidImportText=(text)=>{try{const parsed=JSON.parse(text);const incoming=Array.isArray(parsed)?parsed:parsed.records;if(!Array.isArray(incoming))throw new Error('No records array');if(confirm(`Import ${incoming.length} records? This replaces the current registry view, not the underlying Estate files.`)){records=incoming;nativeTrace.emit('registry.imported',{count:records.length,digest:nativeDigest(records)});render();return true;}return false;}catch(err){alert('Import failed: '+err.message);return false;}};})();";
            view.evaluateJavascript(bridge, null);
        }
    }

    private final class AndroidHostBridge {
        @JavascriptInterface public void saveText(String name, String text) {
            runOnUiThread(() -> beginExport(name, text));
        }
    }

    private void beginExport(String name, String text) {
        pendingExportName = safeFileName(name);
        pendingExportText = text;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, pendingExportName);
        if (!launchDocumentRequest(intent, SAVE_EXPORT)) {
            pendingExportName = null;
            pendingExportText = null;
            Toast.makeText(this, "No document-save route available.", Toast.LENGTH_SHORT).show();
        }
    }

    private String safeFileName(String name) {
        String cleaned = name == null ? "JM_EXPORT.json" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (cleaned.isEmpty()) cleaned = "JM_EXPORT.json";
        return cleaned;
    }

    private String readUtf8(Uri uri) throws Exception {
        try (InputStream in = getContentResolver().openInputStream(uri); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (in == null) throw new IllegalStateException("Import document could not be opened.");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private void finishFileChooserWithoutUri() {
        if (fileChooser != null) fileChooser.onReceiveValue(null);
        fileChooser = null;
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMPORT) {
            Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
            finishFileChooserWithoutUri();
            if (uri != null) {
                try {
                    String text = readUtf8(uri);
                    web.evaluateJavascript("window.__jmAndroidImportText(" + JSONObject.quote(text) + ")", null);
                } catch (Exception e) {
                    Toast.makeText(this, "Import failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            return;
        }
        if (requestCode == SAVE_EXPORT) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingExportText != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "wt")) {
                    if (out == null) throw new IllegalStateException("Output document could not be opened.");
                    out.write(pendingExportText.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Export saved · " + pendingExportName, Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Export failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
            pendingExportName = null;
            pendingExportText = null;
        }
    }

    private WebResourceResponse localResponse(Uri uri) {
        try {
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            while (path.startsWith("/")) path = path.substring(1);
            if (path.isEmpty()) path = "index.html";
            if (path.contains("..") || path.contains("\\") || path.indexOf('\u0000') >= 0) return response(403, "text/plain", bytes("Blocked"));
            InputStream in = getAssets().open("registry/" + path);
            return response(200, mimeFor(path), in);
        } catch (Exception e) {
            return response(404, "text/plain", bytes("Not found"));
        }
    }

    private ByteArrayInputStream bytes(String text) {
        return new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8));
    }

    private WebResourceResponse response(int status, String mime, InputStream body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        headers.put("X-Content-Type-Options", "nosniff");
        return new WebResourceResponse(mime, "UTF-8", status, status == 200 ? "OK" : status == 403 ? "Forbidden" : "Not Found", headers, body);
    }

    private String mimeFor(String path) {
        String ext = MimeTypeMap.getFileExtensionFromUrl(path.toLowerCase(Locale.ROOT));
        String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        if (mime != null) return mime;
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
