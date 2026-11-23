package com.jmisjustme.rimroute;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.PopupMenu;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.ViewGroup;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public final class MainActivity extends Activity {
    private static final String LOCAL_ORIGIN = "https://rimroute.local/";
    private WebView web;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new LocalClient());

        FrameLayout root = new FrameLayout(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        Button menu = new Button(this);
        menu.setText("⋮");
        menu.setTextSize(20);
        menu.setContentDescription("JM Rim Route app menu");
        menu.setAlpha(0.82f);
        FrameLayout.LayoutParams menuParams = new FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP | Gravity.END);
        menuParams.setMargins(0, dp(4), dp(4), 0);
        root.addView(menu, menuParams);
        menu.setOnClickListener(v -> showMenu(menu));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                this::handleBack
            );
        }
        web.loadUrl(LOCAL_ORIGIN + "index.html");
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showMenu(Button anchor) {
        PopupMenu popup = new PopupMenu(this, anchor);
        popup.getMenu().add("Privacy policy");
        popup.getMenu().add("About this build");
        popup.setOnMenuItemClickListener(item -> {
            String title = String.valueOf(item.getTitle());
            if (title.startsWith("Privacy")) web.loadUrl(LOCAL_ORIGIN + "privacy.html");
            else if (title.startsWith("About")) Toast.makeText(this,
                "JM Rim Route 0.8.2 · API 36 · exact source 86d30d56…46a63", Toast.LENGTH_LONG).show();
            return true;
        });
        popup.show();
    }

    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !"rimroute.local".equalsIgnoreCase(uri.getHost())) return null;
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            while (path.startsWith("/")) path = path.substring(1);
            if (!AssetPolicy.isSafeAssetPath(path)) return response(403, "text/plain", "Blocked");
            try {
                InputStream in = getAssets().open(path);
                return new WebResourceResponse(mimeFor(path), textEncoding(path), 200, "OK", headers(), in);
            } catch (Exception error) {
                return response(404, "text/plain", "Not found");
            }
        }

        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equalsIgnoreCase(uri.getScheme()) && "rimroute.local".equalsIgnoreCase(uri.getHost())) return false;
            if (AssetPolicy.isAllowedExternalScheme(uri.getScheme())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                catch (Exception error) { Toast.makeText(MainActivity.this, "No external route available.", Toast.LENGTH_SHORT).show(); }
            } else {
                Toast.makeText(MainActivity.this, "Blocked unsupported external link.", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
    }

    private Map<String,String> headers() {
        Map<String,String> h = new HashMap<>();
        h.put("Access-Control-Allow-Origin", "https://rimroute.local");
        h.put("Cache-Control", "no-cache");
        return h;
    }

    private WebResourceResponse response(int status, String mime, String body) {
        return new WebResourceResponse(mime, "UTF-8", status,
            status == 200 ? "OK" : status == 404 ? "Not Found" : "Forbidden",
            headers(), new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));
    }

    private String mimeFor(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private String textEncoding(String path) {
        String mime = mimeFor(path);
        return mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") ? "UTF-8" : null;
    }

    private void handleBack() {
        if (web != null && web.canGoBack()) web.goBack(); else finish();
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (Build.VERSION.SDK_INT < 33 && keyCode == KeyEvent.KEYCODE_BACK) {
            handleBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
        super.onDestroy();
    }
}
