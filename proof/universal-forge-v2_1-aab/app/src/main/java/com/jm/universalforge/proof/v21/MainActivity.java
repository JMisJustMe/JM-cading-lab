package com.jm.universalforge.proof.v21;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int SAVE_REQUEST = 0x2110;
    private static final int PERMISSION_REQUEST = 0x2111;
    private static final String CHANNEL_ID = "jm_forge_proof";

    private WebView webView;
    private byte[] pendingBytes;
    private String pendingName;
    private String pendingMime;
    private Uri lastSavedUri;
    private String lastSavedMime;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        createNotificationChannel();
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setGeolocationEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new ForgeChromeClient());
        webView.addJavascriptInterface(this, "JMAndroid");
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @JavascriptInterface
    public String getNativeVersion() {
        return "JM Universal Forge Native Permission Bridge 2.1.0";
    }

    @JavascriptInterface
    public String getPermissionState() {
        try {
            JSONObject out = new JSONObject();
            out.put("schema", "jm.android.permission-state/v2.1");
            out.put("camera", granted(Manifest.permission.CAMERA));
            out.put("microphone", granted(Manifest.permission.RECORD_AUDIO));
            out.put("fineLocation", granted(Manifest.permission.ACCESS_FINE_LOCATION));
            out.put("coarseLocation", granted(Manifest.permission.ACCESS_COARSE_LOCATION));
            out.put("notifications", Build.VERSION.SDK_INT < 33 || granted(Manifest.permission.POST_NOTIFICATIONS));
            LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
            out.put("locationProviderEnabled", lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)));
            out.put("unknownSourcesAllowed", Build.VERSION.SDK_INT < 26 || getPackageManager().canRequestPackageInstalls());
            return out.toString();
        } catch (Exception error) {
            return "{\"status\":\"HOLD_PERMISSION_STATE\"}";
        }
    }

    @JavascriptInterface
    public void requestCapabilities(String capabilityJson) {
        runOnUiThread(() -> {
            try {
                JSONArray requested = new JSONArray(capabilityJson == null ? "[]" : capabilityJson);
                List<String> permissions = new ArrayList<>();
                for (int i = 0; i < requested.length(); i++) {
                    String item = requested.optString(i, "");
                    if ("camera".equals(item)) addIfMissing(permissions, Manifest.permission.CAMERA);
                    if ("microphone".equals(item)) addIfMissing(permissions, Manifest.permission.RECORD_AUDIO);
                    if ("location".equals(item)) {
                        addIfMissing(permissions, Manifest.permission.ACCESS_FINE_LOCATION);
                        addIfMissing(permissions, Manifest.permission.ACCESS_COARSE_LOCATION);
                    }
                    if ("notifications".equals(item) && Build.VERSION.SDK_INT >= 33) {
                        addIfMissing(permissions, Manifest.permission.POST_NOTIFICATIONS);
                    }
                }
                List<String> missing = new ArrayList<>();
                for (String permission : permissions) if (!granted(permission)) missing.add(permission);
                if (missing.isEmpty()) emitPermissionResult("ALREADY_GRANTED");
                else requestPermissions(missing.toArray(new String[0]), PERMISSION_REQUEST);
            } catch (Exception error) {
                emitPermissionResult("HOLD_BAD_CAPABILITY_REQUEST");
            }
        });
    }

    @JavascriptInterface
    public void postProofNotification(String title, String body) {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= 33 && !granted(Manifest.permission.POST_NOTIFICATIONS)) {
                emitNativeContact("NOTIFICATION_HOLD_PERMISSION");
                return;
            }
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager == null) return;
            Intent open = new Intent(this, MainActivity.class);
            PendingIntent pending = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            android.app.Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                    ? new android.app.Notification.Builder(this, CHANNEL_ID)
                    : new android.app.Notification.Builder(this);
            builder.setSmallIcon(android.R.drawable.stat_notify_more)
                    .setContentTitle(title == null ? "JM Universal Forge" : title)
                    .setContentText(body == null ? "Native notification proof" : body)
                    .setContentIntent(pending)
                    .setAutoCancel(true);
            manager.notify(210, builder.build());
            emitNativeContact("NOTIFICATION_POSTED");
        });
    }

    @JavascriptInterface
    public void openInstallPermissionSettings() {
        runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT < 26) return;
            try {
                startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            } catch (Exception error) {
                startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));
            }
        });
    }

    @JavascriptInterface
    public String getDeviceReceipt() {
        try {
            JSONObject out = new JSONObject();
            android.content.pm.PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            out.put("schema", "jm.android.native-store-device-receipt/v2.1");
            out.put("bridgeVersion", getNativeVersion());
            out.put("packageName", getPackageName());
            out.put("sdkInt", Build.VERSION.SDK_INT);
            out.put("androidRelease", Build.VERSION.RELEASE);
            out.put("manufacturer", Build.MANUFACTURER);
            out.put("model", Build.MODEL);
            out.put("primaryAbi", Build.SUPPORTED_ABIS[0]);
            out.put("versionName", info.versionName);
            out.put("versionCode", Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode);
            out.put("permissions", new JSONObject(getPermissionState()));
            return out.toString();
        } catch (Exception error) {
            return "{\"status\":\"HOLD_NATIVE_RECEIPT\"}";
        }
    }

    @JavascriptInterface
    public void saveBase64(String filename, String base64, String mime) {
        pendingBytes = Base64.decode(base64, Base64.DEFAULT);
        pendingName = filename;
        pendingMime = mime;
        runOnUiThread(this::startSavePicker);
    }

    @JavascriptInterface
    public void openLastSavedInstaller() {
        runOnUiThread(() -> {
            boolean ok = false;
            try {
                if (lastSavedUri != null && "application/vnd.android.package-archive".equals(lastSavedMime)) {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(lastSavedUri, "application/vnd.android.package-archive");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                    ok = true;
                }
            } catch (Exception ignored) { ok = false; }
            emitNativeContact(ok ? "INSTALLER_OPENED" : "INSTALLER_HOLD");
        });
    }

    private boolean granted(String permission) {
        return Build.VERSION.SDK_INT < 23 || checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void addIfMissing(List<String> permissions, String permission) {
        if (!permissions.contains(permission)) permissions.add(permission);
    }

    private void startSavePicker() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pendingMime == null ? "application/octet-stream" : pendingMime);
        intent.putExtra(Intent.EXTRA_TITLE, pendingName);
        startActivityForResult(intent, SAVE_REQUEST);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != SAVE_REQUEST) return;
        boolean ok = false;
        try {
            Uri uri = data == null ? null : data.getData();
            if (resultCode == RESULT_OK && uri != null && pendingBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    if (out != null) {
                        out.write(pendingBytes);
                        out.flush();
                        lastSavedUri = uri;
                        lastSavedMime = pendingMime;
                        ok = true;
                    }
                }
            }
        } catch (Exception ignored) { ok = false; }
        emitNativeContact(ok ? "SAVE_PASS" : "SAVE_HOLD");
        pendingBytes = null;
        pendingName = null;
        pendingMime = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST) emitPermissionResult("RESULT");
    }

    private void emitPermissionResult(String stage) {
        String js = "window.JMNativePermissionResult&&window.JMNativePermissionResult(" + JSONObject.quote(stage) + "," + JSONObject.quote(getPermissionState()) + ")";
        if (webView != null) webView.evaluateJavascript(js, null);
    }

    private void emitNativeContact(String status) {
        String js = "window.JMNativeContactResult&&window.JMNativeContactResult(" + JSONObject.quote(status) + ")";
        if (webView != null) webView.evaluateJavascript(js, null);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "JM Forge proof", NotificationManager.IMPORTANCE_DEFAULT));
        }
    }

    private final class ForgeChromeClient extends WebChromeClient {
        @Override
        public void onPermissionRequest(PermissionRequest request) {
            runOnUiThread(() -> {
                List<String> grantedResources = new ArrayList<>();
                for (String resource : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) && granted(Manifest.permission.CAMERA)) grantedResources.add(resource);
                    if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) && granted(Manifest.permission.RECORD_AUDIO)) grantedResources.add(resource);
                }
                if (grantedResources.isEmpty()) request.deny();
                else request.grant(grantedResources.toArray(new String[0]));
            });
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            boolean allow = granted(Manifest.permission.ACCESS_FINE_LOCATION) || granted(Manifest.permission.ACCESS_COARSE_LOCATION);
            callback.invoke(origin, allow, false);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.evaluateJavascript("window.JMNativeResume&&window.JMNativeResume()", null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
