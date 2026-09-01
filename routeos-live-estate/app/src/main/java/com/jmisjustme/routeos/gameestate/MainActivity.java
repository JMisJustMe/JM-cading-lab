package com.jmisjustme.routeos.gameestate;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String APP_ORIGIN = "https://routeos.local/";
    private static final String APP_URL = APP_ORIGIN + "index.html";
    private static final String ROUTEOS_SCHEME = "jmrouteos";
    private static final String ROUTEOS_HOST = "cartridge";
    private static final String DEFAULT_CARTRIDGE = "library";
    private static final String COMPASS_PACKAGE = "com.jmestate.estatecompass";

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureSystemBars();
        configureWebView();
        setContentView(webView);
        loadFromIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadFromIntent(intent);
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(Color.rgb(5, 8, 13));
        getWindow().setNavigationBarColor(Color.rgb(5, 8, 13));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        }
    }

    private void configureWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5, 8, 13));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            webView.setOnApplyWindowInsetsListener((view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return windowInsets;
            });
        } else {
            webView.setFitsSystemWindows(true);
        }

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new EstateBridge(), "RouteOSEstate");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("routeos.local".equalsIgnoreCase(uri.getHost())) {
                    return openAssetResponse(uri);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null
                        ? ""
                        : uri.getScheme().toLowerCase(Locale.ROOT);

                if (ROUTEOS_SCHEME.equals(scheme)) {
                    loadCartridgeFromUri(uri);
                    return true;
                }

                if (("http".equals(scheme) || "https".equals(scheme))
                        && !"routeos.local".equalsIgnoreCase(uri.getHost())) {
                    openExternal(uri);
                    return true;
                }
                return false;
            }
        });
    }

    private WebResourceResponse openAssetResponse(Uri uri) {
        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            path = "index.html";
        } else if (path.startsWith("/")) {
            path = path.substring(1);
        }

        if (path.contains("..") || !path.matches("[A-Za-z0-9._/-]+")) {
            return null;
        }

        try {
            InputStream stream = getAssets().open(path);
            return new WebResourceResponse(mimeType(path), "UTF-8", stream);
        } catch (IOException error) {
            return null;
        }
    }

    private static String mimeType(String path) {
        String lower = path.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js")) return "application/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    private void loadFromIntent(Intent intent) {
        if (intent != null
                && Intent.ACTION_VIEW.equals(intent.getAction())
                && intent.getData() != null
                && loadCartridgeFromUri(intent.getData())) {
            return;
        }
        loadCartridge(DEFAULT_CARTRIDGE);
    }

    private boolean loadCartridgeFromUri(Uri uri) {
        if (uri == null
                || !ROUTEOS_SCHEME.equalsIgnoreCase(uri.getScheme())
                || !ROUTEOS_HOST.equalsIgnoreCase(uri.getHost())) {
            return false;
        }
        String cartridgeId = uri.getLastPathSegment();
        if (!isValidCartridgeId(cartridgeId)) {
            Toast.makeText(this, "RouteOS cartridge route is invalid.", Toast.LENGTH_LONG).show();
            loadCartridge(DEFAULT_CARTRIDGE);
            return true;
        }
        loadCartridge(cartridgeId);
        return true;
    }

    private void loadCartridge(String cartridgeId) {
        String safeId = isValidCartridgeId(cartridgeId) ? cartridgeId : DEFAULT_CARTRIDGE;
        webView.stopLoading();
        webView.loadUrl(APP_URL + "#" + Uri.encode(safeId));
    }

    private static boolean isValidCartridgeId(String cartridgeId) {
        return cartridgeId != null
                && cartridgeId.matches("[A-Za-z0-9._-]{1,120}");
    }

    private void returnToCompass() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(COMPASS_PACKAGE);
        if (launch == null) {
            Toast.makeText(
                    this,
                    "JM Estate Compass is not installed on this device.",
                    Toast.LENGTH_LONG).show();
            return;
        }
        launch.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(launch);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "No browser can open this link.", Toast.LENGTH_LONG).show();
        }
    }

    private void copyTextNative(String text) {
        if (text == null || text.length() > 16_384) {
            Toast.makeText(this, "That proof value cannot be copied.", Toast.LENGTH_LONG).show();
            return;
        }
        ClipboardManager clipboard =
                (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        clipboard.setPrimaryClip(ClipData.newPlainText("RouteOS proof", text));
        Toast.makeText(this, "Copied.", Toast.LENGTH_SHORT).show();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        webView.evaluateJavascript(
                "(window.RouteOSEstateApp && window.RouteOSEstateApp.nativeBack()) ? 'handled' : 'unhandled'",
                result -> {
                    if (!"\"handled\"".equals(result)) {
                        MainActivity.super.onBackPressed();
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("RouteOSEstate");
            webView.destroy();
        }
        super.onDestroy();
    }

    public final class EstateBridge {
        @JavascriptInterface
        public void returnToCompass() {
            runOnUiThread(MainActivity.this::returnToCompass);
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null) return;
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme();
            if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
                runOnUiThread(() -> MainActivity.this.openExternal(uri));
            }
        }

        @JavascriptInterface
        public void copyText(String text) {
            runOnUiThread(() -> copyTextNative(text));
        }

        @JavascriptInterface
        public void openCartridge(String cartridgeId) {
            runOnUiThread(() -> loadCartridge(cartridgeId));
        }

        @JavascriptInterface
        public String appVersion() {
            return "2.0.0";
        }
    }
}
