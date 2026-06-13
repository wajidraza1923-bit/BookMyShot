# ═══════════════════════════════════════════════════════════════
# BookMyShot ProGuard Rules (Production)
# ═══════════════════════════════════════════════════════════════

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep Razorpay classes (loaded in WebView)
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Keep our application classes
-keep class in.bookmyshot.app.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugins
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# General Android rules
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Preserve line numbers for crash reporting
-renamesourcefileattribute SourceFile
