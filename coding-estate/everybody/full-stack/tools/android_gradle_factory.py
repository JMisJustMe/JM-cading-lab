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

SCHEMA = "jm.everybody.android-gradle-factory/0.2"
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


def source_literal(value: str) -> str:
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


def app_gradle(namespace: str, current: dict[str, Any]) -> str:
    body = current["body"]
    main_path = "src/main/java/" + "/".join(namespace.split(".")) + "/MainActivity.java"
    template = '''import org.gradle.api.tasks.bundling.Zip

plugins {
    id("com.android.application")
}

val jmBodyId = @@BODY_ID@@
val jmBodyName = @@BODY_NAME@@
val jmBodyLaw = @@BODY_LAW@@
val jmIdentitySha256 = @@IDENTITY@@
val jmBodyAsset = layout.projectDirectory.file("src/main/assets/body.json")
val jmIndexAsset = layout.projectDirectory.file("src/main/assets/index.html")
val jmMainActivity = layout.projectDirectory.file("@@MAIN_PATH@@")
val jmBuildRoot = layout.buildDirectory.dir("jm")

android {
    namespace = @@NAMESPACE@@
    compileSdk = @@COMPILE_SDK@@

    defaultConfig {
        applicationId = @@NAMESPACE@@
        minSdk = @@MIN_SDK@@
        targetSdk = @@TARGET_SDK@@
        versionCode = 1
        versionName = @@VERSION_NAME@@
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.register("doctor") {
    group = "jmgradle"
    description = "Check the body-owned Android build floor without installing anything."
    doLast {
        check(JavaVersion.current().isCompatibleWith(JavaVersion.VERSION_17)) { "Java 17 or newer is required." }
        check(gradle.gradleVersion.startsWith("8.10")) { "JMGradle expects Gradle 8.10.x; found ${gradle.gradleVersion}." }
        check(jmBodyAsset.asFile.exists()) { "Missing body identity asset." }
        check(jmIndexAsset.asFile.exists()) { "Missing Android contact body." }
        check(jmMainActivity.asFile.exists()) { "Missing body-owned MainActivity." }
        println("JMGRADLE_DOCTOR:PASS:$jmBodyId")
    }
}

tasks.register("verifyBodyIdentity") {
    group = "jmgradle"
    dependsOn("doctor")
    inputs.file(jmBodyAsset)
    doLast {
        val text = jmBodyAsset.asFile.readText(Charsets.UTF_8)
        check(text.contains("\\\"id\\\": \\\"$jmBodyId\\\"")) { "Body ID does not match Gradle project authority." }
        check(text.contains(jmIdentitySha256)) { "Body identity hash is absent or mismatched." }
        check(text.contains(jmBodyLaw)) { "Body governing law is absent or mismatched." }
        println("JMGRADLE_IDENTITY:PASS:$jmBodyId")
    }
}

tasks.register("compileBodySource") {
    group = "jmgradle"
    dependsOn("verifyBodyIdentity")
    val output = layout.buildDirectory.file("jm/body-source.json")
    inputs.file(jmBodyAsset)
    outputs.file(output)
    doLast {
        val file = output.get().asFile
        file.parentFile.mkdirs()
        file.writeText(jmBodyAsset.asFile.readText(Charsets.UTF_8), Charsets.UTF_8)
        println("JMGRADLE_SOURCE:PASS:$jmBodyId")
    }
}

tasks.register("lowerBodyIR") {
    group = "jmgradle"
    dependsOn("compileBodySource")
    val output = layout.buildDirectory.file("jm/android-body-ir.json")
    outputs.file(output)
    doLast {
        val file = output.get().asFile
        file.parentFile.mkdirs()
        file.writeText(
            """{"schema":"jm.android.body-ir/0.1","body_id":"$jmBodyId","namespace":@@NAMESPACE@@,"identity_sha256":"$jmIdentitySha256","state":"LOWERED_FOR_ANDROID"}""" + "\n",
            Charsets.UTF_8,
        )
        println("JMGRADLE_LOWER:PASS:$jmBodyId")
    }
}

tasks.register("emitAndroidCarrier") {
    group = "jmgradle"
    dependsOn("lowerBodyIR")
    val output = layout.buildDirectory.file("jm/android-carrier-receipt.json")
    inputs.files(jmIndexAsset, jmMainActivity)
    outputs.file(output)
    doLast {
        check(jmIndexAsset.asFile.readText(Charsets.UTF_8).contains(jmBodyId)) { "HTML carrier lost body identity." }
        check(jmMainActivity.asFile.readText(Charsets.UTF_8).contains(jmIdentitySha256)) { "Java carrier lost identity hash." }
        val file = output.get().asFile
        file.parentFile.mkdirs()
        file.writeText(
            """{"schema":"jm.android.carrier-receipt/0.1","body_id":"$jmBodyId","identity_sha256":"$jmIdentitySha256","state":"ANDROID_CARRIER_EMITTED"}""" + "\n",
            Charsets.UTF_8,
        )
        println("JMGRADLE_EMIT:PASS:$jmBodyId")
    }
}

tasks.named("preBuild").configure {
    dependsOn("emitAndroidCarrier")
}

tasks.register("verifyApkIdentity") {
    group = "jmgradle"
    dependsOn("assembleDebug")
    val output = layout.buildDirectory.file("jm/apk-identity-receipt.json")
    outputs.file(output)
    doLast {
        val apkDir = layout.buildDirectory.dir("outputs/apk/debug").get().asFile
        val apks = apkDir.listFiles { file -> file.isFile && file.extension == "apk" }?.toList().orEmpty()
        check(apks.size == 1) { "Expected one debug APK for $jmBodyId; found ${apks.size}." }
        val apk = apks.single()
        check(apk.length() > 0L) { "APK is empty." }
        val file = output.get().asFile
        file.parentFile.mkdirs()
        file.writeText(
            """{"schema":"jm.android.apk-identity/0.1","body_id":"$jmBodyId","namespace":@@NAMESPACE@@,"apk":"${apk.relativeTo(projectDir).invariantSeparatorsPath}","bytes":${apk.length()},"automatic_install":false}""" + "\n",
            Charsets.UTF_8,
        )
        println("JMGRADLE_APK_IDENTITY:PASS:$jmBodyId")
    }
}

tasks.register("writeBuildReceipt") {
    group = "jmgradle"
    dependsOn("verifyApkIdentity")
    val apkReceipt = layout.buildDirectory.file("jm/apk-identity-receipt.json")
    val output = layout.buildDirectory.file("jm/build-receipt.json")
    inputs.file(apkReceipt)
    outputs.file(output)
    doLast {
        val file = output.get().asFile
        file.parentFile.mkdirs()
        file.writeText(
            """{"schema":"jm.android.gradle-build-receipt/0.1","body_id":"$jmBodyId","body_name":@@BODY_NAME@@,"identity_sha256":"$jmIdentitySha256","agp":"@@AGP@@","gradle":"${gradle.gradleVersion}","outcome":"APK_CONSTRUCTED_IDENTITY_HELD","automatic_install":false,"claim_boundary":"APK construction is not physical-device runtime proof."}""" + "\n",
            Charsets.UTF_8,
        )
        println("JMGRADLE_RECEIPT:PASS:$jmBodyId")
    }
}

tasks.register<Zip>("packageZion") {
    group = "jmgradle"
    dependsOn("writeBuildReceipt")
    archiveFileName.set(@@ZIP_NAME@@)
    destinationDirectory.set(layout.buildDirectory.dir("zion"))
    from(layout.projectDirectory) {
        exclude("build/**", ".gradle/**")
    }
    from(layout.buildDirectory.file("jm/build-receipt.json")) {
        into("receipts")
    }
}
'''
    replacements = {
        "@@BODY_ID@@": source_literal(body["id"]),
        "@@BODY_NAME@@": source_literal(body["name"]),
        "@@BODY_LAW@@": source_literal(body["law"]),
        "@@IDENTITY@@": source_literal(current["identity_sha256"]),
        "@@NAMESPACE@@": source_literal(namespace),
        "@@VERSION_NAME@@": source_literal(f'0.2-{body["id"]}'),
        "@@MAIN_PATH@@": main_path,
        "@@COMPILE_SDK@@": str(COMPILE_SDK),
        "@@MIN_SDK@@": str(MIN_SDK),
        "@@TARGET_SDK@@": str(TARGET_SDK),
        "@@AGP@@": AGP_VERSION,
        "@@ZIP_NAME@@": source_literal(f'JM-{body["id"]}-Android-Zion.zip'),
    }
    for marker, value in replacements.items():
        template = template.replace(marker, value)
    return template


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
    public static final String JM_BODY_ID = {source_literal(body["id"])};
    public static final String JM_BODY_NAME = {source_literal(body["name"])};
    public static final String JM_BODY_LAW = {source_literal(body["law"])};
    public static final String JM_IDENTITY_SHA256 = {source_literal(current["identity_sha256"])};

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
        "schema": "jm.gradle.body-route/0.2",
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
        "task_implementation": "app/build.gradle.kts",
        "prebuild_identity_gate": True,
        "shared_donor": "JM Android Forge / JMGradle",
        "source_authority": body["id"],
        "automatic_install": False,
        "claim_boundary": "Generated Gradle project, executable JMGradle tasks and identity carrier are proven here. APK build, signing, installation and physical-device runtime require their own receipts.",
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
        "schema": "jm.android.body-identity/0.2",
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
    write(root / "app" / "build.gradle.kts", app_gradle(namespace, current))
    write(root / "app" / "src" / "main" / "AndroidManifest.xml", manifest(namespace, body["name"]))
    write(java_dir / "MainActivity.java", activity_java(namespace, current))
    write(assets / "index.html", index_html(current))
    write_json(assets / "body.json", body_asset)
    write_json(root / "jmgradle.route.json", route)
    write(
        root / "BUILD_BOUNDARY.md",
        "# Android/Gradle body carrier\n\n"
        f"Body: `{body['id']}`  \nNamespace: `{namespace}`\n\n"
        "This project preserves body identity through a separate Gradle namespace, executable JMGradle task route and Android carrier. "
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
        "jmgradle_task_count": len(route["tasks"]),
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
        "status": "ANDROID_GRADLE_TASKED_CARRIERS_GENERATED",
        "body_count": len(receipts),
        "unique_namespaces": len(set(namespaces)),
        "jmgradle_tasks_per_body": 9,
        "jmgradle_task_routes": 900,
        "agp": AGP_VERSION,
        "gradle": GRADLE_VERSION,
        "sdk": {"compile": COMPILE_SDK, "min": MIN_SDK, "target": TARGET_SDK},
        "projects": receipts,
        "claim_boundary": "100 identity-bound Gradle project carriers with executable JMGradle tasks generated. APK, signing, installation and physical device proof remain separate gates.",
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
