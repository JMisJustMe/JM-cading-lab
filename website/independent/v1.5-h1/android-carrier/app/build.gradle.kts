plugins { id("com.android.application") }
android {
    namespace = "com.jmisjustme.livingestate"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.jmisjustme.livingestate"
        minSdk = 23
        targetSdk = 36
        versionCode = 1501
        versionName = "1.5-H1"
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
