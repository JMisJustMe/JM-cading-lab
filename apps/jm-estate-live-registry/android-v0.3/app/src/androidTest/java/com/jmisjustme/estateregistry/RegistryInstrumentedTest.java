package com.jmisjustme.estateregistry;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public final class RegistryInstrumentedTest {
    private static final String KEEPER_SHA256 = "0ec929d0c4f0c281878af091263c45b8db4b5b71edb40e911364c43d15336f38";

    @Test public void exactKeeperBootAuditPersistenceImportExportRoundTrip() throws Exception {
        Context target = InstrumentationRegistry.getInstrumentation().getTargetContext();
        Context test = InstrumentationRegistry.getInstrumentation().getContext();

        assertEquals(KEEPER_SHA256, sha256(readAll(target.getAssets().open("registry/index.html"))));

        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView web = webFrom(scenario);
            waitReady(web);
            waitJsTrue(web, "window.__jmAndroidBridge===true", 6000);

            assertTrue(js(web, "document.title").contains("JM Estate Live Registry App v0.2"));
            assertEquals("\"https://registry.jm.local\"", js(web, "location.origin"));
            assertEquals("20", js(web, "records.length"));
            assertEquals("0", js(web, "auditRecords(false).length"));

            String auditRail = js(web, "document.getElementById('auditBtn').click();document.getElementById('nativeRail').textContent");
            assertTrue(auditRail.contains("Native audit PASS"));
            assertTrue(auditRail.contains("20 bodies"));

            assertTrue(js(web, "records[0].next='EMULATOR_PERSISTENCE_PROBE';save();records[0].next")
                .contains("EMULATOR_PERSISTENCE_PROBE"));
            scenario.recreate();
            web = webFrom(scenario);
            waitReady(web);
            waitJsTrue(web, "window.__jmAndroidBridge===true", 6000);
            assertTrue(js(web, "records[0].next").contains("EMULATOR_PERSISTENCE_PROBE"));
            assertEquals("0", js(web, "auditRecords(false).length"));

            Uri exportUri = Uri.parse("content://" + TestJsonProvider.AUTHORITY + "/registry-export.json");
            Uri receiptUri = Uri.parse("content://" + TestJsonProvider.AUTHORITY + "/native-receipt.json");
            Uri importUri = Uri.parse("content://" + TestJsonProvider.AUTHORITY + "/registry-import.json");

            JSONObject importRecord = new JSONObject();
            importRecord.put("id", "emulator-import");
            importRecord.put("name", "Emulator Import Probe");
            importRecord.put("family", "Proof");
            importRecord.put("keeper", "v0.3 test");
            importRecord.put("status", "ACTIVE");
            importRecord.put("parent", "v0.2 frozen");
            importRecord.put("donors", "exact frozen keeper");
            importRecord.put("runtime", "Android WebView");
            importRecord.put("surfaces", "Android");
            importRecord.put("proof", "emulator round-trip");
            importRecord.put("hash", "");
            importRecord.put("location", "test provider");
            importRecord.put("next", "Return to seed after proof.");
            JSONArray importRecords = new JSONArray();
            importRecords.put(importRecord);
            JSONObject importEnvelope = new JSONObject();
            importEnvelope.put("format", "JM_ESTATE_LIVE_REGISTRY");
            importEnvelope.put("version", "0.2");
            importEnvelope.put("records", importRecords);
            try (OutputStream out = test.getContentResolver().openOutputStream(importUri, "wt")) {
                if (out == null) throw new IllegalStateException("Import probe output stream unavailable");
                out.write(importEnvelope.toString().getBytes(StandardCharsets.UTF_8));
            }

            AtomicReference<Throwable> hookError = new AtomicReference<>();
            AtomicInteger saveRequests = new AtomicInteger();
            AtomicInteger openRequests = new AtomicInteger();
            scenario.onActivity(activity -> activity.setDocumentRequestHookForTest((requestCode, intent) -> {
                try {
                    assertEquals("application/json", intent.getType());
                    assertTrue(intent.hasCategory(Intent.CATEGORY_OPENABLE));
                    if (requestCode == MainActivity.SAVE_EXPORT) {
                        assertEquals(Intent.ACTION_CREATE_DOCUMENT, intent.getAction());
                        String title = intent.getStringExtra(Intent.EXTRA_TITLE);
                        assertTrue(title != null && title.endsWith(".json"));
                        int which = saveRequests.incrementAndGet();
                        Uri destination = which == 1 ? exportUri : receiptUri;
                        activity.getWindow().getDecorView().post(() -> activity.onActivityResult(
                            MainActivity.SAVE_EXPORT,
                            Activity.RESULT_OK,
                            new Intent().setData(destination).addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                        ));
                        return true;
                    }
                    if (requestCode == MainActivity.PICK_IMPORT) {
                        assertEquals(Intent.ACTION_OPEN_DOCUMENT, intent.getAction());
                        openRequests.incrementAndGet();
                        activity.getWindow().getDecorView().post(() -> activity.onActivityResult(
                            MainActivity.PICK_IMPORT,
                            Activity.RESULT_OK,
                            new Intent().setData(importUri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        ));
                        return true;
                    }
                    throw new AssertionError("Unexpected document request code: " + requestCode);
                } catch (Throwable t) {
                    hookError.compareAndSet(null, t);
                    return true;
                }
            }));

            js(web, "document.getElementById('exportBtn').click();'export-requested'");
            String exported = waitRead(test, exportUri, 8000);
            assertNoHookError(hookError);
            JSONObject exportedJson = new JSONObject(exported);
            assertEquals("JM_ESTATE_LIVE_REGISTRY", exportedJson.getString("format"));
            assertEquals("0.2", exportedJson.getString("version"));
            assertEquals(20, exportedJson.getJSONArray("records").length());
            assertTrue(exported.contains("EMULATOR_PERSISTENCE_PROBE"));

            js(web, "document.getElementById('receiptBtn').click();'receipt-requested'");
            JSONObject receipt = new JSONObject(waitRead(test, receiptUri, 8000));
            assertNoHookError(hookError);
            assertEquals("jm.native.receipt/1.0", receipt.getString("schema"));
            assertEquals("0.2", receipt.getJSONObject("result").getString("version"));
            assertEquals(0, receipt.getJSONObject("result").getJSONArray("issues").length());

            js(web, "window.confirm=()=>true;document.getElementById('importFile').click();'import-requested'");
            waitJsTrue(web, "records.length===1&&records[0].name==='Emulator Import Probe'", 8000);
            assertNoHookError(hookError);
            assertEquals("0", js(web, "auditRecords(false).length"));
            assertEquals(2, saveRequests.get());
            assertEquals(1, openRequests.get());

            js(web, "localStorage.clear();location.reload();'resetting'");
            waitReady(web);
            waitJsTrue(web, "records.length===20", 8000);
            assertEquals("0", js(web, "auditRecords(false).length"));
        }
    }

    private static void assertNoHookError(AtomicReference<Throwable> hookError) {
        Throwable t = hookError.get();
        if (t != null) throw new AssertionError("Document request hook failed", t);
    }

    private static WebView webFrom(ActivityScenario<MainActivity> scenario) throws Exception {
        AtomicReference<WebView> ref = new AtomicReference<>();
        AtomicReference<Throwable> error = new AtomicReference<>();
        scenario.onActivity(activity -> {
            try {
                Field field = MainActivity.class.getDeclaredField("web");
                field.setAccessible(true);
                ref.set((WebView) field.get(activity));
            } catch (Throwable t) {
                error.set(t);
            }
        });
        if (error.get() != null) throw new AssertionError(error.get());
        return ref.get();
    }

    private static void waitReady(WebView web) throws Exception {
        waitJsTrue(web, "document.readyState==='complete'&&typeof records!=='undefined'", 8000);
    }

    private static void waitJsTrue(WebView web, String expression, long timeoutMs) throws Exception {
        long end = SystemClock.uptimeMillis() + timeoutMs;
        while (SystemClock.uptimeMillis() < end) {
            if ("true".equals(js(web, expression))) return;
            SystemClock.sleep(100);
        }
        throw new AssertionError("Timed out waiting for JS: " + expression + " · last=" + js(web, expression));
    }

    private static String js(WebView web, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(
            () -> web.evaluateJavascript(script, value -> {
                result.set(value);
                latch.countDown();
            })
        );
        if (!latch.await(8, TimeUnit.SECONDS)) throw new AssertionError("JavaScript callback timed out: " + script);
        return result.get();
    }

    private static String waitRead(Context context, Uri uri, long timeoutMs) throws Exception {
        long end = SystemClock.uptimeMillis() + timeoutMs;
        Exception last = null;
        while (SystemClock.uptimeMillis() < end) {
            try {
                byte[] data = readAll(context.getContentResolver().openInputStream(uri));
                if (data.length > 0) return new String(data, StandardCharsets.UTF_8);
            } catch (Exception e) {
                last = e;
            }
            SystemClock.sleep(100);
        }
        throw new AssertionError("Timed out waiting for exported document.", last);
    }

    private static byte[] readAll(InputStream input) throws Exception {
        if (input == null) throw new IllegalStateException("Input stream unavailable");
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toByteArray();
        }
    }

    private static String sha256(byte[] bytes) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
        StringBuilder out = new StringBuilder();
        for (byte b : digest) out.append(String.format("%02x", b));
        return out.toString();
    }
}
