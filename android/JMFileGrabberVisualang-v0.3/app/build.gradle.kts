plugins { id("com.android.application") }

android {
    namespace = "com.jmisjustme.filegrabbervisualang"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.jmisjustme.filegrabbervisualang"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.3"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}
