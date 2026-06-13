package in.bookmyshot.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private static final long BACK_PRESS_INTERVAL = 2000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Set status bar to dark (matches app theme)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0a0806"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0a0806"));
        }

        // Edge-to-edge display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

        // Keep screen on during payment flows
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        super.onCreate(savedInstanceState);

        // Handle deep link if app was opened via URL
        handleDeepLink(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Uri data = intent.getData();

        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            String url = data.toString();
            // Convert deep link to web URL if needed
            if (url.startsWith("bookmyshot://")) {
                url = url.replace("bookmyshot://", "https://bookmyshot.in/");
            }
            // Navigate the WebView to the deep link URL
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().loadUrl(url);
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            WebView webView = bridge != null ? bridge.getWebView() : null;

            if (webView != null && webView.canGoBack()) {
                // If WebView has history, go back
                webView.goBack();
                return true;
            } else {
                // Double-tap to exit
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
        // Remove keep screen on flag when resuming normally
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
