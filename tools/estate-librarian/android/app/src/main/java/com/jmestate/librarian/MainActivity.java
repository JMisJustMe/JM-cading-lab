package com.jmestate.librarian;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int REQ_FILE_CHOOSER = 1001;
    private static final int REQ_FOLDER_TREE = 1002;
    private static final int REQ_SAVE_TEXT = 1003;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingSaveText;
    private String pendingSaveMime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new EstateBridge(), "JMAndroid");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(intent, REQ_FILE_CHOOSER);
                } catch (Exception ex) {
                    Intent fallback = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    fallback.addCategory(Intent.CATEGORY_OPENABLE);
                    fallback.setType("*/*");
                    fallback.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(fallback, REQ_FILE_CHOOSER);
                }
                return true;
            }
        });
        webView.loadUrl("file:///android_asset/index.html");
    }

    public final class EstateBridge {
        @JavascriptInterface
        public void chooseFolder() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                        | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                        | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                startActivityForResult(intent, REQ_FOLDER_TREE);
            });
        }

        @JavascriptInterface
        public void saveText(String filename, String mime, String content) {
            pendingSaveText = content;
            pendingSaveMime = mime;
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType((mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
                intent.putExtra(Intent.EXTRA_TITLE, filename);
                startActivityForResult(intent, REQ_SAVE_TEXT);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE_CHOOSER) {
            if (filePathCallback == null) return;
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
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
            return;
        }

        if (requestCode == REQ_FOLDER_TREE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri tree = data.getData();
            try {
                getContentResolver().takePersistableUriPermission(tree, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (Exception ignored) { }
            new Thread(() -> scanTreeAndReturn(tree)).start();
            return;
        }

        if (requestCode == REQ_SAVE_TEXT && resultCode == RESULT_OK && data != null && data.getData() != null) {
            Uri target = data.getData();
            String content = pendingSaveText == null ? "" : pendingSaveText;
            new Thread(() -> {
                try (OutputStream out = getContentResolver().openOutputStream(target, "w")) {
                    if (out != null) out.write(content.getBytes(StandardCharsets.UTF_8));
                } catch (Exception ignored) { }
            }).start();
            pendingSaveText = null;
            pendingSaveMime = null;
        }
    }

    private void scanTreeAndReturn(Uri treeUri) {
        JSONArray rows = new JSONArray();
        try {
            String rootId = DocumentsContract.getTreeDocumentId(treeUri);
            walkDocumentTree(treeUri, rootId, "", rows);
        } catch (Exception ex) {
            try {
                JSONObject error = new JSONObject();
                error.put("name", "FOLDER_SCAN_ERROR.txt");
                error.put("path", "FOLDER_SCAN_ERROR.txt");
                error.put("size", 0);
                error.put("type", "text/plain");
                error.put("hash", "HASH_FAILED");
                error.put("lastModified", 0);
                rows.put(error);
            } catch (Exception ignored) { }
        }
        String payload = JSONObject.quote(rows.toString());
        runOnUiThread(() -> webView.evaluateJavascript("window.JMReceiveNativeFolder(" + payload + ")", null));
    }

    private void walkDocumentTree(Uri treeUri, String documentId, String prefix, JSONArray rows) throws Exception {
        Uri childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(treeUri, documentId);
        ContentResolver resolver = getContentResolver();
        String[] projection = {
                DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                DocumentsContract.Document.COLUMN_MIME_TYPE,
                DocumentsContract.Document.COLUMN_SIZE,
                DocumentsContract.Document.COLUMN_LAST_MODIFIED
        };
        try (Cursor cursor = resolver.query(childrenUri, projection, null, null, null)) {
            if (cursor == null) return;
            while (cursor.moveToNext()) {
                String childId = cursor.getString(0);
                String name = cursor.getString(1);
                String mime = cursor.getString(2);
                long size = cursor.isNull(3) ? 0 : cursor.getLong(3);
                long modified = cursor.isNull(4) ? 0 : cursor.getLong(4);
                String path = prefix.isEmpty() ? name : prefix + "/" + name;
                if (DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)) {
                    walkDocumentTree(treeUri, childId, path, rows);
                } else {
                    Uri fileUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, childId);
                    JSONObject row = new JSONObject();
                    row.put("name", name);
                    row.put("path", path);
                    row.put("size", size);
                    row.put("type", mime == null ? "" : mime);
                    row.put("hash", sha256(fileUri));
                    row.put("lastModified", modified);
                    rows.put(row);
                }
            }
        }
    }

    private String sha256(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return "HASH_FAILED";
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[1024 * 128];
            int read;
            while ((read = in.read(buffer)) > 0) digest.update(buffer, 0, read);
            StringBuilder hex = new StringBuilder();
            for (byte b : digest.digest()) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception ex) {
            return "HASH_FAILED";
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
