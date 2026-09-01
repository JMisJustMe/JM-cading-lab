package com.jmisjustme.intertaproute;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public final class MainActivity extends Activity {
    private static final int REQUEST_WEB_FILE_CHOOSER = 1401;
    private static final int REQUEST_SAVE_EXPORT = 1402;
    private static final int MAX_EXPORT_BYTES = 128 * 1024 * 1024;
    private static final long MAX_EXPORT_BASE64_CHARS = (((long) MAX_EXPORT_BYTES + 2L) / 3L) * 4L + 8192L;
    private static final String BODY_HOST = "intertap.jm.local";
    private static final String BODY_URL = "https://" + BODY_HOST + "/index.html";

    private WebView webView;
    private ValueCallback<Uri[]> webFileCallback;
    private byte[] pendingExport;
    private String bridgeNonce;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridgeNonce = UUID.randomUUID().toString();
        configureWebView();
        webView.loadUrl(BODY_URL + "?nonce=" + Uri.encode(bridgeNonce));
    }

    private void configureWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(7, 10, 16));
        webView.setFilterTouchesWhenObscured(true);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new JMBridge(), "JMAndroid");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                if (webFileCallback != null) webFileCallback.onReceiveValue(null);
                webFileCallback = filePathCallback;
                final Intent intent;
                try {
                    intent = fileChooserParams.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                } catch (Exception error) {
                    webFileCallback = null;
                    toast("File chooser could not be prepared.");
                    return false;
                }
                try {
                    startActivityForResult(intent, REQUEST_WEB_FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException error) {
                    webFileCallback = null;
                    toast("No file picker is available on this device.");
                    return false;
                }
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (BODY_HOST.equals(uri.getHost()) && ("/".equals(uri.getPath()) || "/index.html".equals(uri.getPath()))) {
                    try {
                        InputStream in = getAssets().open("index.html");
                        WebResourceResponse response = new WebResourceResponse("text/html", "UTF-8", in);
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Referrer-Policy", "no-referrer");
                        headers.put("X-Content-Type-Options", "nosniff");
                        headers.put("Cache-Control", "no-store");
                        response.setResponseHeaders(headers);
                        return response;
                    } catch (IOException error) {
                        return new WebResourceResponse("text/plain", "UTF-8", 500, "Asset error", null,
                                new ByteArrayInputStream("INTERTAP body unavailable".getBytes()));
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                if (request.isForMainFrame()
                        && ("http".equals(scheme) || "https".equals(scheme))
                        && !BODY_HOST.equals(uri.getHost())) {
                    openExternal(uri);
                    return true;
                }
                return false;
            }
        });
    }

    private final class JMBridge {
        private boolean allowed(String nonce) {
            return nonce != null && nonce.equals(bridgeNonce);
        }

        @JavascriptInterface
        public boolean authorised(String nonce) {
            return allowed(nonce);
        }

        @JavascriptInterface
        public void openUrl(String nonce, String raw) {
            if (!allowed(nonce) || raw == null) return;
            final Uri uri;
            try {
                uri = Uri.parse(raw.trim());
            } catch (Exception error) {
                return;
            }
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) return;
            runOnUiThread(() -> openExternal(uri));
        }

        @JavascriptInterface
        public void copyText(String nonce, String text) {
            if (!allowed(nonce)) return;
            runOnUiThread(() -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                clipboard.setPrimaryClip(ClipData.newPlainText("INTERTAP trace", text == null ? "" : text));
            });
        }

        @JavascriptInterface
        public void saveBase64(String nonce, String filename, String base64, String mime) {
            if (!allowed(nonce) || base64 == null) return;
            if ((long) base64.length() > MAX_EXPORT_BASE64_CHARS) {
                runOnUiThread(() -> toast("Export is larger than the 128 MB safety limit."));
                return;
            }
            final byte[] decoded;
            try {
                decoded = Base64.decode(base64, Base64.DEFAULT);
            } catch (IllegalArgumentException error) {
                runOnUiThread(() -> toast("Export data was invalid."));
                return;
            }
            if (decoded.length > MAX_EXPORT_BYTES) {
                runOnUiThread(() -> toast("Export is larger than the 128 MB safety limit."));
                return;
            }
            final String safeName = safeFilename(filename);
            final String safeMime = safeMime(mime);
            runOnUiThread(() -> beginSave(decoded, safeName, safeMime));
        }
    }

    private void beginSave(byte[] data, String filename, String mime) {
        pendingExport = data;
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        try {
            startActivityForResult(intent, REQUEST_SAVE_EXPORT);
        } catch (ActivityNotFoundException error) {
            pendingExport = null;
            toast("No Android save picker is available.");
        }
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            toast("No browser can open this link.");
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_WEB_FILE_CHOOSER) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            if (webFileCallback != null) {
                webFileCallback.onReceiveValue(results);
                webFileCallback = null;
            }
            return;
        }
        if (requestCode == REQUEST_SAVE_EXPORT) {
            byte[] bytes = pendingExport;
            pendingExport = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || bytes == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(data.getData(), "w")) {
                if (out == null) throw new IOException("Save destination could not be opened.");
                out.write(bytes);
                out.flush();
                toast("INTERTAP export saved.");
            } catch (IOException error) {
                toast("Export not saved: " + error.getMessage());
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webFileCallback != null) {
            webFileCallback.onReceiveValue(null);
            webFileCallback = null;
        }
        pendingExport = null;
        if (webView != null) {
            webView.removeJavascriptInterface("JMAndroid");
            webView.destroy();
        }
        super.onDestroy();
    }

    private static String safeFilename(String name) {
        String n = name == null ? "INTERTAP_EXPORT.json" : name.trim();
        n = n.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        if (n.isBlank()) n = "INTERTAP_EXPORT.json";
        return n.length() > 120 ? n.substring(0, 120) : n;
    }

    private static String safeMime(String mime) {
        if (mime == null) return "application/octet-stream";
        String value = mime.trim().toLowerCase(Locale.ROOT);
        if (!value.matches("^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]*$")) {
            return "application/octet-stream";
        }
        return value;
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
