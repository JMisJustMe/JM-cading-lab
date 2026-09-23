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

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
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
