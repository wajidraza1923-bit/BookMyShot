package in.bookmyshot.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private static final long BACK_PRESS_INTERVAL = 2000;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Set status bar and nav bar to dark (matches app theme)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#0a0806"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#0a0806"));
        }

        // Edge-to-edge display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        // Handle bookmyshot:// deep links from push notifications
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
    }
}
