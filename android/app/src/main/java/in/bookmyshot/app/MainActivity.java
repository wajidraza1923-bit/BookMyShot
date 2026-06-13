package in.bookmyshot.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private static final long BACK_PRESS_INTERVAL = 2000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Set status bar and nav bar to dark
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0a0806"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0a0806"));
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

        super.onCreate(savedInstanceState);

        // After Capacitor bridge initializes, override WebViewClient to keep ALL navigation inside app
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();

            // Enable all web features needed for BookMyShot
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            settings.setUserAgentString(settings.getUserAgentString() + " BookMyShot-App/1.0");

            // Override WebViewClient to prevent Chrome from opening
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();

                    // Keep bookmyshot.in, Razorpay, and CDN URLs inside the WebView
                    if (url.contains("bookmyshot.in") ||
                        url.contains("razorpay.com") ||
                        url.contains("cloudinary.com") ||
                        url.contains("googleapis.com") ||
                        url.contains("gstatic.com") ||
                        url.contains("jsdelivr.net") ||
                        url.contains("code.run")) {
                        return false; // Load inside WebView
                    }

                    // Only open truly external links (social media, etc.) in browser
                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true; // We handled it externally
                    }

                    return false;
                }

                @Override
                @SuppressWarnings("deprecation")
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url.contains("bookmyshot.in") ||
                        url.contains("razorpay.com") ||
                        url.contains("cloudinary.com") ||
                        url.contains("googleapis.com") ||
                        url.contains("gstatic.com") ||
                        url.contains("jsdelivr.net") ||
                        url.contains("code.run")) {
                        return false;
                    }

                    if (url.startsWith("http://") || url.startsWith("https://")) {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    }

                    return false;
                }
            });
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        if (intent != null && Intent.ACTION_VIEW.equals(intent.getAction())) {
            Uri data = intent.getData();
            if (data != null && "bookmyshot".equals(data.getScheme())) {
                String path = data.getHost() != null ? data.getHost() : "";
                if (data.getPath() != null) path += data.getPath();
                String url = "https://bookmyshot.in/" + path;
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().loadUrl(url);
                }
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            WebView webView = bridge != null ? bridge.getWebView() : null;

            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return true;
            } else {
                long currentTime = System.currentTimeMillis();
                if (currentTime - lastBackPressTime < BACK_PRESS_INTERVAL) {
                    finish();
                    return true;
                }
                lastBackPressTime = currentTime;
                Toast.makeText(this, "Tap again to exit", Toast.LENGTH_SHORT).show();
                return true;
            }
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onResume() {
        super.onResume();
    }
}
