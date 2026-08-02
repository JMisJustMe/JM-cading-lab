#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
import android_gradle_factory as factory  # noqa: E402

REQUIRED_FILES = (
    "settings.gradle.kts",
    "build.gradle.kts",
    "gradle.properties",
    "gradle/wrapper/gradle-wrapper.properties",
    "app/build.gradle.kts",
    "app/src/main/AndroidManifest.xml",
    "app/src/main/assets/index.html",
    "app/src/main/assets/body.json",
    "jmgradle.route.json",
    "BUILD_BOUNDARY.md",
)

JM_TASKS = [
    "doctor",
    "verifyBodyIdentity",
    "compileBodySource",
    "lowerBodyIR",
    "emitAndroidCarrier",
    "assembleDebug",
    "verifyApkIdentity",
    "writeBuildReceipt",
    "packageZion",
]


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def make_android_stubs(root: Path) -> Path:
    source = root / "stub-source"
    classes = root / "stub-classes"
    write(source / "android/app/Activity.java", """package android.app;
import android.os.Bundle;
public class Activity {
  protected void onCreate(Bundle state) {}
  public void setContentView(Object view) {}
  public void onBackPressed() {}
}
""")
    write(source / "android/os/Bundle.java", "package android.os; public class Bundle {}\n")
    write(source / "android/webkit/WebSettings.java", """package android.webkit;
public class WebSettings {
  public void setJavaScriptEnabled(boolean value) {}
  public void setDomStorageEnabled(boolean value) {}
  public void setAllowFileAccess(boolean value) {}
  public void setAllowContentAccess(boolean value) {}
}
""")
    write(source / "android/webkit/WebView.java", """package android.webkit;
import android.app.Activity;
public class WebView {
  public WebView(Activity activity) {}
  public WebSettings getSettings() { return new WebSettings(); }
  public void setWebViewClient(WebViewClient value) {}
  public void setWebChromeClient(WebChromeClient value) {}
  public void loadUrl(String value) {}
  public boolean canGoBack() { return false; }
  public void goBack() {}
}
""")
    write(source / "android/webkit/WebViewClient.java", "package android.webkit; public class WebViewClient {}\n")
    write(source / "android/webkit/WebChromeClient.java", "package android.webkit; public class WebChromeClient {}\n")
    classes.mkdir(parents=True)
    subprocess.run(
        ["javac", "-source", "17", "-target", "17", "-d", str(classes), *[str(p) for p in sorted(source.rglob("*.java"))]],
        check=True,
        capture_output=True,
        text=True,
    )
    return classes


def main() -> int:
    javac = shutil.which("javac")
    if not javac:
        raise SystemExit("javac is required for Android carrier syntax proof")

    with tempfile.TemporaryDirectory(prefix="jm-android-gradle-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-android-gradle-b-") as second_temp:
        first = Path(first_temp) / "generated"
        second = Path(second_temp) / "generated"
        receipt = factory.generate(ROOT, first)
        factory.generate(ROOT, second)

        assert receipt["status"] == "ANDROID_GRADLE_TASKED_CARRIERS_GENERATED"
        assert receipt["body_count"] == 100
        assert receipt["unique_namespaces"] == 100
        assert receipt["jmgradle_tasks_per_body"] == 9
        assert receipt["jmgradle_task_routes"] == 900
        assert factory.tree_digest(first) == factory.tree_digest(second)

        project_roots = sorted(first.glob("bodies/*/android-gradle"))
        assert len(project_roots) == 100
        namespaces: set[str] = set()
        java_files: list[str] = []

        for root in project_roots:
            body_id = root.parent.name
            for relative in REQUIRED_FILES:
                assert (root / relative).is_file(), (body_id, relative)

            route = json.loads((root / "jmgradle.route.json").read_text(encoding="utf-8"))
            asset = json.loads((root / "app/src/main/assets/body.json").read_text(encoding="utf-8"))
            assert route["body_id"] == body_id
            assert route["source_authority"] == body_id
            assert route["automatic_install"] is False
            assert route["agp"] == "8.7.3"
            assert route["gradle"] == "8.10.2"
            assert route["tasks"] == JM_TASKS
            assert route["task_implementation"] == "app/build.gradle.kts"
            assert route["prebuild_identity_gate"] is True
            namespace = route["namespace"]
            assert namespace not in namespaces
            namespaces.add(namespace)
            assert asset["body"]["id"] == body_id
            assert asset["namespace"] == namespace

            app_gradle = (root / "app/build.gradle.kts").read_text(encoding="utf-8")
            manifest = (root / "app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
            settings = (root / "settings.gradle.kts").read_text(encoding="utf-8")
            wrapper = (root / "gradle/wrapper/gradle-wrapper.properties").read_text(encoding="utf-8")
            assert f'applicationId = "{namespace}"' in app_gradle
            assert f'namespace = "{namespace}"' in app_gradle
            assert f'android:name="{namespace}.MainActivity"' in manifest
            assert f'rootProject.name = "JM-{body_id}-Android"' in settings
            assert "gradle-8.10.2-bin.zip" in wrapper
            assert 'tasks.named("preBuild")' in app_gradle
            assert 'dependsOn("assembleDebug")' in app_gradle
            assert 'tasks.register<Zip>("packageZion")' in app_gradle
            for task in JM_TASKS:
                if task in {"assembleDebug", "packageZion"}:
                    continue
                assert f'tasks.register("{task}")' in app_gradle, (body_id, task)
            assert "adb install" not in app_gradle.lower()
            assert '"automatic_install":false' in app_gradle

            matches = list((root / "app/src/main/java").rglob("MainActivity.java"))
            assert len(matches) == 1
            java = matches[0].read_text(encoding="utf-8")
            assert f"package {namespace};" in java
            assert f'JM_BODY_ID = "{body_id}"' in java
            java_files.append(str(matches[0]))

        assert len(namespaces) == 100
        stub_classes = make_android_stubs(Path(first_temp) / "android-stubs")
        compiled = Path(first_temp) / "compiled-carriers"
        compiled.mkdir()
        subprocess.run(
            [javac, "-source", "17", "-target", "17", "-cp", str(stub_classes), "-d", str(compiled), *java_files],
            check=True,
            capture_output=True,
            text=True,
        )

        class_files = list(compiled.rglob("MainActivity.class"))
        assert len(class_files) == 100
        print("JM CROWN32 ANDROID/GRADLE: 100 PROJECTS + 100 NAMESPACES + 900 JMGRADLE TASK ROUTES + 100 JAVA CARRIERS PASS")
        print(f"TREE_SHA256={factory.tree_digest(first)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
