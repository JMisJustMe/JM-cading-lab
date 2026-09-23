plugins { id("com.android.application") }

android {
    namespace = "com.jmisjustme.rimroute"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jmisjustme.rimroute"
        minSdk = 26
        targetSdk = 36
        versionCode = 82
        versionName = "0.8.2"
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
    testImplementation("junit:junit:4.13.2")
}
