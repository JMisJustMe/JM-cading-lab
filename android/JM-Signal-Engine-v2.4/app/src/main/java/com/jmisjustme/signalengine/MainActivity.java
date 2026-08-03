package com.jmisjustme.signalengine;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int REQUEST_AUDIO = 3201;
    private static final int REQUEST_FILE = 3202;
    private static final String START_PAGE = "file:///android_asset/www/index.html";
    private static final String VAULT_ASSET = "vault/JM_Signal_Engine_v2.4.0_SOURCE_VAULT.zip";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest pendingWebPermission;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        configureWindow();
        configureAudio();
        configureWebView();
        webView.loadUrl(START_PAGE);
    }

    private void configureWindow() {
        Window window = getWindow();
        window.setStatusBarColor(Color.rgb(2, 11, 19));
        window.setNavigationBarColor(Color.rgb(2, 11, 19));
        window.getDecorView().setSystemUiVisibility(0);
    }

    private void configureAudio() {
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(2, 11, 19));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);

        webView.addJavascriptInterface(new AndroidVaultBridge(), "JMAndroidVault");
        webView.setWebViewClient(new EngineWebViewClient());
        webView.setWebChromeClient(new EngineChromeClient());
        webView.setDownloadListener(new EngineDownloadListener());

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(2, 11, 19));
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
    }

    private final class EngineWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return routeUrl(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return routeUrl(Uri.parse(url));
        }

        private boolean routeUrl(Uri uri) {
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if ("jm".equals(scheme) && "export-vault".equals(uri.getHost())) {
                exportVault();
                return true;
            }
            if ("http".equals(scheme) || "https".equals(scheme)) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    toast("No browser route is available.");
                }
                return true;
            }
            return false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            injectAndroidHandoff();
        }
    }

    private final class EngineChromeClient extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                boolean audioRequested = false;
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        audioRequested = true;
                        break;
                    }
                }
                if (!audioRequested) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    pendingWebPermission = request;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_AUDIO);
                }
            });
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(bestMimeType(params.getAcceptTypes()));
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
            startActivityForResult(Intent.createChooser(intent, "Choose signal/audio source"), REQUEST_FILE);
            return true;
        }
    }

    private final class EngineDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
            if (url != null && (url.startsWith("blob:") || url.startsWith("data:"))) {
                toast("Preparing the engine export…");
                return;
            }
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimeType);
                request.addRequestHeader("User-Agent", userAgent);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeFilename("JM_Signal_Engine_export"));
                ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
            } catch (Exception error) {
                toast("Download route blocked: " + error.getMessage());
            }
        }
    }

    private final class AndroidVaultBridge {
        @JavascriptInterface
        public void saveBase64(String filename, String mime, String payload) {
            runOnUiThread(() -> {
                try {
                    byte[] bytes = Base64.getDecoder().decode(payload == null ? "" : payload);
                    saveToDownloads(safeFilename(filename), safeMime(mime, filename), bytes);
                } catch (Exception error) {
                    toast("Export failed: " + error.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void saveText(String filename, String mime, String text) {
            runOnUiThread(() -> {
                try {
                    saveToDownloads(safeFilename(filename), safeMime(mime, filename),
                            (text == null ? "" : text).getBytes(StandardCharsets.UTF_8));
                } catch (Exception error) {
                    toast("Export failed: " + error.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void exportVault() {
            runOnUiThread(MainActivity.this::exportVault);
        }

        @JavascriptInterface
        public String appIdentity() {
            return "JM Signal Engine Android v2.4.0 | com.jmisjustme.signalengine";
        }
    }

    private void injectAndroidHandoff() {
        String script = "(function(){" +
                "if(window.__JM_ANDROID_HANDOFF__)return;window.__JM_ANDROID_HANDOFF__=true;" +
                "const blobs=new Map(),oldCreate=URL.createObjectURL.bind(URL),oldRevoke=URL.revokeObjectURL.bind(URL);" +
                "URL.createObjectURL=function(b){const u=oldCreate(b);blobs.set(u,b);return u};" +
                "URL.revokeObjectURL=function(u){blobs.delete(u);return oldRevoke(u)};" +
                "document.addEventListener('click',async function(e){const a=e.target&&e.target.closest?e.target.closest('a[download]'):null;if(!a)return;" +
                "const name=a.download||'JM_Signal_Engine_export';const href=a.href||'';" +
                "if(href.startsWith('blob:')&&blobs.has(href)){e.preventDefault();const b=blobs.get(href);const r=new FileReader();" +
                "r.onload=function(){const d=String(r.result||'');JMAndroidVault.saveBase64(name,b.type||'application/octet-stream',d.split(',')[1]||'')};r.readAsDataURL(b);}" +
                "else if(href.startsWith('data:')){e.preventDefault();const comma=href.indexOf(',');const head=href.slice(5,comma);const body=href.slice(comma+1);" +
                "if(head.includes(';base64'))JMAndroidVault.saveBase64(name,head.split(';')[0]||'application/octet-stream',body);" +
                "else JMAndroidVault.saveText(name,head||'text/plain',decodeURIComponent(body));}},true);" +
                "const b=document.createElement('button');b.id='jm-apk-vault';b.textContent='APK VAULT';" +
                "b.setAttribute('aria-label','Export the full JM Signal Engine source vault');" +
                "b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:2147483647;padding:9px 12px;border:1px solid #35f2d0;border-radius:10px;background:#051923e8;color:#bafff3;font:700 11px system-ui;letter-spacing:.08em;box-shadow:0 0 22px #20e5c84d';" +
                "b.onclick=function(){JMAndroidVault.exportVault()};document.body.appendChild(b);" +
                "})();";
        webView.evaluateJavascript(script, null);
    }

    private void exportVault() {
        try (InputStream input = getAssets().open(VAULT_ASSET)) {
            saveToDownloads("JM_Signal_Engine_v2.4.0_SOURCE_VAULT.zip", "application/zip", readAll(input));
        } catch (Exception error) {
            toast("Source vault export failed: " + error.getMessage());
        }
    }

    private void saveToDownloads(String filename, String mime, byte[] bytes) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/JM Signal Engine");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            ContentResolver resolver = getContentResolver();
            Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("Downloads provider rejected the file");
            try (OutputStream output = resolver.openOutputStream(uri)) {
                if (output == null) throw new IOException("Downloads stream unavailable");
                output.write(bytes);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            toast("Saved to Downloads/JM Signal Engine/" + filename);
        } else {
            File directory = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "JM Signal Engine");
            if (!directory.exists() && !directory.mkdirs()) throw new IOException("Could not create export directory");
            File file = new File(directory, filename);
            try (FileOutputStream output = new FileOutputStream(file)) {
                output.write(bytes);
            }
            toast("Saved to " + file.getAbsolutePath());
        }
    }

    private static byte[] readAll(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) >= 0) output.write(buffer, 0, read);
        return output.toByteArray();
    }

    private static String bestMimeType(String[] accepted) {
        if (accepted == null || accepted.length == 0) return "*/*";
        for (String type : accepted) {
            if (type != null && !type.trim().isEmpty()) return type.trim();
        }
        return "*/*";
    }

    private static String safeFilename(String candidate) {
        String name = candidate == null || candidate.trim().isEmpty() ? "JM_Signal_Engine_export" : candidate.trim();
        name = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        return name.length() > 120 ? name.substring(0, 120) : name;
    }

    private static String safeMime(String mime, String filename) {
        if (mime != null && !mime.trim().isEmpty()) return mime.trim();
        String extension = MimeTypeMap.getFileExtensionFromUrl(filename);
        String inferred = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
        return inferred == null ? "application/octet-stream" : inferred;
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQUEST_AUDIO && pendingWebPermission != null) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            } else {
                pendingWebPermission.deny();
                toast("Microphone permission was not granted.");
            }
            pendingWebPermission = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_FILE || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                result = new Uri[count];
                for (int i = 0; i < count; i++) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
