plugins { id("com.android.application") }

android {
    namespace = "com.jmisjustme.glyphboard"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.jmisjustme.glyphboard"
        minSdk = 23
        targetSdk = 36
        versionCode = 3
        versionName = "0.3.0"
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }

    buildTypes {
        getByName("release") { isMinifyEnabled = false }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}
