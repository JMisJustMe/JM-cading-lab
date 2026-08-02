#!/usr/bin/env python3
"""Generate one identity-bound Android/Gradle carrier for every sovereign body."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any

import full_stack_factory as stack

SCHEMA = "jm.everybody.android-gradle-factory/0.1"
AGP_VERSION = "8.7.3"
GRADLE_VERSION = "8.10.2"
COMPILE_SDK = 36
MIN_SDK = 24
TARGET_SDK = 36


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def package_part(body_id: str) -> str:
    part = re.sub(r"[^a-z0-9_]+", "_", body_id.lower()).strip("_")
    if not part:
        raise ValueError(f"invalid body id {body_id!r}")
    if part[0].isdigit():
        part = f"body_{part}"
    return part


def java_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def settings_gradle(body: dict[str, Any]) -> str:
    return f'''pluginManagement {{
    repositories {{ google(); mavenCentral(); gradlePluginPortal() }}
}}
dependencyResolutionManagement {{
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {{ google(); mavenCentral() }}
}}
rootProject.name = "JM-{body["id"]}-Android"
include(":app")
'''


def root_gradle() -> str:
    return f'''plugins {{
    id("com.android.application") version "{AGP_VERSION}" apply false
}}
'''


def app_gradle(namespace: str, body: dict[str, Any]) -> str:
    return f'''plugins {{
    id("com.android.application")
}}

android {{
    namespace = "{namespace}"
    compileSdk = {COMPILE_SDK}

    defaultConfig {{
        applicationId = "{namespace}"
        minSdk = {MIN_SDK}
        targetSdk = {TARGET_SDK}
        versionCode = 1
        versionName = "0.1-{body["id"]}"
    }}

    buildTypes {{
        release {{
            isMinifyEnabled = false
        }}
    }}

    compileOptions {{
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }}
}}
'''


def manifest(namespace: str, name: str) -> str:
    escaped_name = (
        name.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    return f'''<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:label="{escaped_name}"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity
            android:name="{namespace}.MainActivity"
            android:exported="true"
            android:configChanges="keyboardHidden|orientation|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
'''


def activity_java(namespace: str, current: dict[str, Any]) -> str:
    body = current["body"]
    return f'''package {namespace};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {{
    public static final String JM_BODY_ID = {java_string(body["id"])};
    public static final String JM_BODY_NAME = {java_string(body["name"])};
    public static final String JM_BODY_LAW = {java_string(body["law"])};
    public static final String JM_IDENTITY_SHA256 = {java_string(current["identity_sha256"])};

    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }}

    @Override
    public void onBackPressed() {{
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }}
}}
'''


def index_html(current: dict[str, Any]) -> str:
    body_json = json.dumps(current["body"], ensure_ascii=False).replace("</", "<\\/")
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{current["body"]["name"]}</title>
<style>html,body{{margin:0;min-height:100%;background:#080b12;color:#f6f8ff;font-family:system-ui}}main{{padding:24px;max-width:760px;margin:auto}}code{{color:#6fe7ff}}.card{{border:1px solid #2d3b59;background:#121a2a;border-radius:18px;padding:18px}}button{{padding:12px 16px;border:0;border-radius:12px;font-weight:800}}pre{{white-space:pre-wrap;color:#aebbd3}}</style></head>
<body><main><div class="card"><small>JM SOVEREIGN ANDROID CARRIER</small><h1>{current["body"]["name"]}</h1><code>{current["body"]["id"]}</code><pre>{current["body"]["law"]}</pre><button id="run">Run body proof</button><p id="trace">READY</p></div></main>
<script>const BODY={body_json};document.querySelector('#run').onclick=()=>{{const receipt={{body_id:BODY.id,law:BODY.law,state:'ANDROID_CARRIER_CONTACT',trace:new Date().toISOString()}};document.querySelector('#trace').textContent=JSON.stringify(receipt,null,2);}};</script></body></html>
'''


def jmgradle_route(current: dict[str, Any], namespace: str) -> dict[str, Any]:
    body = current["body"]
    return {
        "schema": "jm.gradle.body-route/0.1",
        "body_id": body["id"],
        "body_name": body["name"],
        "identity_sha256": current["identity_sha256"],
        "namespace": namespace,
        "agp": AGP_VERSION,
        "gradle": GRADLE_VERSION,
        "sdk": {"compile": COMPILE_SDK, "min": MIN_SDK, "target": TARGET_SDK},
        "tasks": [
            "doctor",
            "verifyBodyIdentity",
            "compileBodySource",
            "lowerBodyIR",
            "emitAndroidCarrier",
            "assembleDebug",
            "verifyApkIdentity",
            "writeBuildReceipt",
            "packageZion",
        ],
        "shared_donor": "JM Android Forge / JMGradle",
        "source_authority": body["id"],
        "automatic_install": False,
        "claim_boundary": "Generated Gradle project and identity carrier are proven here. APK build, signing, installation and physical-device runtime require their own receipts.",
    }


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_json(path: Path, value: Any) -> None:
    write(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n")


def generate_body(out: Path, current: dict[str, Any]) -> dict[str, Any]:
    body = current["body"]
    part = package_part(body["id"])
    namespace = f"com.jmisjustme.body.{part}"
    root = out / "bodies" / body["id"] / "android-gradle"
    java_dir = root / "app" / "src" / "main" / "java" / Path(*namespace.split("."))
    assets = root / "app" / "src" / "main" / "assets"

    route = jmgradle_route(current, namespace)
    body_asset = {
        "schema": "jm.android.body-identity/0.1",
        "body": body,
        "family": current["family"],
        "identity_sha256": current["identity_sha256"],
        "law_sha256": current["law_sha256"],
        "namespace": namespace,
    }

    write(root / "settings.gradle.kts", settings_gradle(body))
    write(root / "build.gradle.kts", root_gradle())
    write(root / "gradle.properties", "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\n")
    write(root / "gradle" / "wrapper" / "gradle-wrapper.properties", f"distributionUrl=https\\://services.gradle.org/distributions/gradle-{GRADLE_VERSION}-bin.zip\n")
    write(root / "app" / "build.gradle.kts", app_gradle(namespace, body))
    write(root / "app" / "src" / "main" / "AndroidManifest.xml", manifest(namespace, body["name"]))
    write(java_dir / "MainActivity.java", activity_java(namespace, current))
    write(assets / "index.html", index_html(current))
    write_json(assets / "body.json", body_asset)
    write_json(root / "jmgradle.route.json", route)
    write(
        root / "BUILD_BOUNDARY.md",
        "# Android/Gradle body carrier\n\n"
        f"Body: `{body['id']}`  \nNamespace: `{namespace}`\n\n"
        "This project preserves body identity through a separate Gradle namespace and Android carrier. "
        "The wrapper properties are present, but the binary Gradle wrapper JAR is deliberately not fabricated. "
        "Use Gradle 8.10.2 or graft the verified wrapper from JM Android Forge. "
        "A generated project is not an APK/device Ding.\n",
    )

    return {
        "body_id": body["id"],
        "namespace": namespace,
        "identity_sha256": current["identity_sha256"],
        "project_sha256": tree_digest(root),
        "route_sha256": sha(stable_json(route)),
    }


def tree_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()


def generate(repo: Path, out: Path) -> dict[str, Any]:
    bodies = stack.load_bodies(repo)
    receipts = [generate_body(out, stack.profile(body)) for body in bodies]
    namespaces = [item["namespace"] for item in receipts]
    if len(receipts) != 100 or len(set(namespaces)) != 100:
        raise SystemExit("Android/Gradle body parity count or namespace uniqueness failed")
    receipt = {
        "schema": SCHEMA,
        "status": "ANDROID_GRADLE_CARRIERS_GENERATED",
        "body_count": len(receipts),
        "unique_namespaces": len(set(namespaces)),
        "agp": AGP_VERSION,
        "gradle": GRADLE_VERSION,
        "sdk": {"compile": COMPILE_SDK, "min": MIN_SDK, "target": TARGET_SDK},
        "projects": receipts,
        "claim_boundary": "100 identity-bound Gradle project carriers generated. APK, signing, installation and physical device proof remain separate gates.",
    }
    write_json(out / "ANDROID_GRADLE_RECEIPT.json", receipt)
    return receipt


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[4])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()
    if args.clean and args.out.exists():
        shutil.rmtree(args.out)
    args.out.mkdir(parents=True, exist_ok=True)
    receipt = generate(args.repo_root.resolve(), args.out.resolve())
    print(json.dumps(receipt, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
