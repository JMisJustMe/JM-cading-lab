package com.jmisjustme.estateregistry;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String LOCAL_ORIGIN = "https://registry.jm.local/";
    private static final String PARENT_BODY = "JM Estate Live Registry App v0.2 — Native Circulation";
    private static final String PARENT_SHA256 = "0ec929d0c4f0c281878af091263c45b8db4b5b71edb40e911364c43d15336f38";
    private WebView web;

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
        web.setWebChromeClient(new WebChromeClient());
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
            .setMessage(
                "Surface: native Android carrier\n" +
                "Package: com.jmisjustme.estateregistry\n" +
                "Origin: " + LOCAL_ORIGIN + "\n\n" +
                "Frozen parent:\n" + PARENT_BODY + "\n" + PARENT_SHA256 + "\n\n" +
                "The APK hosts the Registry; it does not replace or merge the frozen parent. Browser storage belongs to this stable app origin."
            )
            .setPositiveButton("OK", null)
            .show();
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception e) { Toast.makeText(this, "No external route available.", Toast.LENGTH_SHORT).show(); }
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
