import java.security.MessageDigest
import java.util.Base64
import java.util.zip.ZipInputStream

plugins { id("com.android.application") }

val frozenParentKeeperSha256 = "0ec929d0c4f0c281878af091263c45b8db4b5b71edb40e911364c43d15336f38"
val frozenParentPackageSha256 = "15282c9707401df3cff7da48caad1818d5cd2ff9c07ecc716c45da14c0834093"
val frozenParentPrefix = "JM_ESTATE_LIVE_REGISTRY_APP_v0.2/"

fun sha256(bytes: ByteArray): String =
    MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

android {
    namespace = "com.jmisjustme.estateregistry"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jmisjustme.estateregistry"
        minSdk = 23
        targetSdk = 36
        versionCode = 300
        versionName = "0.3"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        create("proof") {
            storeFile = rootProject.file("proof-upload.jks")
            storePassword = "jm-proof-only"
            keyAlias = "jm-proof"
            keyPassword = "jm-proof-only"
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("proof")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:core:1.6.1")
}

val materializeFrozenRegistry by tasks.registering {
    val sourceB64 = rootProject.layout.projectDirectory.file("frozen-parent/JM_ESTATE_LIVE_REGISTRY_APP_v0.2_PACKAGE.zip.b64")
    val outputDir = layout.buildDirectory.dir("generated/registryAssets/registry")
    inputs.file(sourceB64)
    outputs.dir(outputDir)

    doLast {
        val packageBytes = Base64.getMimeDecoder().decode(sourceB64.asFile.readText())
        check(sha256(packageBytes) == frozenParentPackageSha256) {
            "Frozen v0.2 package SHA-256 mismatch"
        }

        val outRoot = outputDir.get().asFile
        outRoot.deleteRecursively()
        outRoot.mkdirs()

        ZipInputStream(packageBytes.inputStream()).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                val name = entry.name.replace('\\', '/')
                if (name.startsWith(frozenParentPrefix)) {
                    val relative = name.removePrefix(frozenParentPrefix)
                    if (relative.isNotEmpty()) {
                        check(!relative.startsWith("/") && !relative.contains("../") && relative != "..") {
                            "Unsafe frozen-parent package path: $relative"
                        }
                        val target = outRoot.resolve(relative).canonicalFile
                        check(target.path.startsWith(outRoot.canonicalPath + java.io.File.separator)) {
                            "Frozen-parent package path escaped generated asset room: $relative"
                        }
                        if (entry.isDirectory) {
                            target.mkdirs()
                        } else {
                            target.parentFile?.mkdirs()
                            target.outputStream().use { out -> zip.copyTo(out) }
                        }
                    }
                }
                zip.closeEntry()
                entry = zip.nextEntry
            }
        }

        val keeper = outRoot.resolve("index.html")
        check(keeper.isFile) { "Frozen v0.2 keeper index.html missing after materialization" }
        check(sha256(keeper.readBytes()) == frozenParentKeeperSha256) {
            "Frozen v0.2 keeper byte identity mismatch after materialization"
        }
        check(outRoot.resolve("JM_ESTATE_LIVE_REGISTRY_APP_v0.2.html").isFile) {
            "Named frozen v0.2 keeper missing after materialization"
        }
        println("Exact frozen v0.2 package materialized · keeper $frozenParentKeeperSha256")
    }
}

android.sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/registryAssets"))
tasks.named("preBuild").configure { dependsOn(materializeFrozenRegistry) }
