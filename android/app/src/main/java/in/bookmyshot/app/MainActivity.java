package in.bookmyshot.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.view.WindowCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.getcapacitor.BridgeActivity;

/**
 * BookMyShot Premium Android App — Main Activity
 * Features: Native loading screen, pull-to-refresh, smooth transitions,
 * in-app navigation, Razorpay support, back button handling.
 */
public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private static final long BACK_PRESS_INTERVAL = 2000;
    private FrameLayout loadingOverlay;
    private SwipeRefreshLayout swipeRefresh;
    private boolean isFirstLoad = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Immersive dark status bar and nav bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0A0A0A"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0A0A0A"));
            getWindow().getDecorView().setSystemUiVisibility(0); // Light icons on dark bg
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
        }

        super.onCreate(savedInstanceState);

        // Get UI references
        loadingOverlay = findViewById(R.id.loadingOverlay);
        swipeRefresh = findViewById(R.id.swipeRefresh);

        // Configure SwipeRefreshLayout (gold accent colors)
        if (swipeRefresh != null) {
            swipeRefresh.setColorSchemeColors(
                android.graphics.Color.parseColor("#D4AF37"),
                android.graphics.Color.parseColor("#E8D5A3"),
                android.graphics.Color.parseColor("#8B7025")
            );
            swipeRefresh.setProgressBackgroundColorSchemeColor(
                android.graphics.Color.parseColor("#1A1A1A")
            );
            swipeRefresh.setOnRefreshListener(() -> {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().reload();
                }
            });
        }

        // Configure WebView for premium experience
        if (bridge != null && bridge.getWebView() != null) {
            setupWebView(bridge.getWebView());
        }
    }

    private void setupWebView(WebView webView) {
        // Web settings for full-featured app
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setUserAgentString(settings.getUserAgentString() + " BookMyShot-App/1.0");

        // Remove scrollbar for native feel
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setBackgroundColor(android.graphics.Color.parseColor("#0A0A0A"));

        // WebViewClient: Keep all navigation inside app + loading states
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                // Don't show loading overlay after first load (use swipe refresh instead)
                if (!isFirstLoad && swipeRefresh != null && !swipeRefresh.isRefreshing()) {
                    // Page is transitioning — handled by CSS
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);

                // Hide loading overlay with smooth fade after first load
                if (isFirstLoad && loadingOverlay != null) {
                    isFirstLoad = false;
                    loadingOverlay.animate()
                        .alpha(0f)
                        .setDuration(400)
                        .setInterpolator(new AccelerateDecelerateInterpolator())
                        .setListener(new AnimatorListenerAdapter() {
                            @Override
                            public void onAnimationEnd(Animator animation) {
                                loadingOverlay.setVisibility(View.GONE);
                            }
                        })
                        .start();
                }

                // Stop pull-to-refresh spinner
                if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                    swipeRefresh.setRefreshing(false);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (swipeRefresh != null) {
                    swipeRefresh.setRefreshing(false);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();

                // Keep all BookMyShot and related domains inside the WebView
                if (url.contains("bookmyshot.in") ||
                    url.contains("razorpay.com") ||
                    url.contains("cloudinary.com") ||
                    url.contains("googleapis.com") ||
                    url.contains("gstatic.com") ||
                    url.contains("jsdelivr.net") ||
                    url.contains("cdnjs.cloudflare.com") ||
                    url.contains("code.run")) {
                    return false; // Load inside WebView
                }

                // Handle UPI payment intents (Razorpay UPI)
                if (url.startsWith("upi://") || url.startsWith("intent://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                        }
                    } catch (Exception e) {
                        // Fallback: ignore
                    }
                    return true;
                }

                // Open truly external links in system browser
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
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
                    url.contains("cdnjs.cloudflare.com") ||
                    url.contains("code.run")) {
                    return false;
                }
                if (url.startsWith("upi://") || url.startsWith("intent://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                        }
                    } catch (Exception e) { }
                    return true;
                }
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                }
                return false;
            }
        });

        // WebChromeClient for progress and full-screen support
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                // Can hook progress bar here if desired
            }
        });

        // Disable pull-to-refresh when user scrolls down (only at top)
        webView.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
            if (swipeRefresh != null) {
                swipeRefresh.setEnabled(scrollY == 0);
            }
        });
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
                Toast.makeText(this, "Tap again to exit BookMyShot", Toast.LENGTH_SHORT).show();
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
