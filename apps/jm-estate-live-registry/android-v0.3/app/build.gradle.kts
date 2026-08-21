plugins { id("com.android.application") }

android {
    namespace = "com.jmisjustme.estateregistry"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jmisjustme.estateregistry"
        minSdk = 23
        targetSdk = 36
        versionCode = 300
        versionName = "0.3"
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

val syncRegistryAssets by tasks.registering(Sync::class) {
    val frozenSource = rootProject.projectDir.parentFile
    from(frozenSource) {
        include("index.html", "style.css", "seed.js", "app.js", "manifest.webmanifest", "sw.js")
    }
    into(layout.buildDirectory.dir("generated/registryAssets/registry"))
}

android.sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/registryAssets"))
tasks.named("preBuild").configure { dependsOn(syncRegistryAssets) }
