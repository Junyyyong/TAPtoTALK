package io.github.junyyyong.taptotalk;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private static final int GAME_TEXT_ZOOM = 100;
    private String lastGameInsets = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // BridgeActivity creates the WebView during super.onCreate().
        super.onCreate(savedInstanceState);
        applyGameTextZoom();
        if (getBridge() != null && getBridge().getWebView() != null) {
            // Observe Capacitor's layout; do not replace its inset/padding listener.
            getBridge().getWebView().getViewTreeObserver().addOnGlobalLayoutListener(this::publishGameInsets);
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    lastGameInsets = "";
                    publishGameInsets();
                }
            });
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        applyGameTextZoom();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyGameTextZoom();
    }

    private void applyGameTextZoom() {
        if (getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        lastGameInsets = "";
        // Only WebView text scaling changes. Keep OS density/magnification intact.
        webView.getSettings().setTextZoom(GAME_TEXT_ZOOM);
        // Reapply after the view hierarchy finishes a configuration/resume pass.
        webView.post(() -> {
            if (getBridge() != null && getBridge().getWebView() == webView) {
                webView.getSettings().setTextZoom(GAME_TEXT_ZOOM);
                publishGameInsets();
            }
        });
    }

    private void publishGameInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(webView);
        if (windowInsets == null || webView.getWidth() == 0 || webView.getHeight() == 0) return;
        Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        android.view.View root = webView.getRootView();
        int[] webLocation = new int[2], rootLocation = new int[2];
        webView.getLocationInWindow(webLocation);
        root.getLocationInWindow(rootLocation);
        float[] remaining = GameInsets.remaining(root.getWidth(), root.getHeight(),
            webLocation[0] - rootLocation[0], webLocation[1] - rootLocation[1],
            webView.getWidth(), webView.getHeight(), bars.top, bars.right, bars.bottom, bars.left,
            getResources().getDisplayMetrics().density);
        String values = String.format(Locale.US, "%.4f,%.4f,%.4f,%.4f", remaining[0], remaining[1], remaining[2], remaining[3]);
        if (values.equals(lastGameInsets)) return;
        lastGameInsets = values;
        String script = String.format(Locale.US,
            "(function(){var s=document.documentElement.style;" +
            "s.setProperty('--android-game-inset-top','%.4fpx');" +
            "s.setProperty('--android-game-inset-right','%.4fpx');" +
            "s.setProperty('--android-game-inset-bottom','%.4fpx');" +
            "s.setProperty('--android-game-inset-left','%.4fpx');})();",
            remaining[0], remaining[1], remaining[2], remaining[3]);
        webView.evaluateJavascript(script, null);
    }
}
