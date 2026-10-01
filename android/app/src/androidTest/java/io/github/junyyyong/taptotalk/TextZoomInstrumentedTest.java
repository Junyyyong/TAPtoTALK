package io.github.junyyyong.taptotalk;

import static org.junit.Assert.assertEquals;

import android.content.res.Configuration;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Run on a dedicated test device, not a user's installed game/profile. */
@RunWith(AndroidJUnit4.class)
public class TextZoomInstrumentedTest {
    @Test
    public void createResumeAndConfigurationKeepTextZoomAt100() {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            scenario.onActivity(activity -> {
                assertEquals(100, activity.getBridge().getWebView().getSettings().getTextZoom());
                activity.getBridge().getWebView().getSettings().setTextZoom(180);
            });
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            scenario.onActivity(activity -> {
                assertEquals(100, activity.getBridge().getWebView().getSettings().getTextZoom());
                int density = activity.getResources().getDisplayMetrics().densityDpi;
                Configuration changed = new Configuration(activity.getResources().getConfiguration());
                changed.fontScale = 2.0f;
                activity.getBridge().getWebView().getSettings().setTextZoom(200);
                activity.onConfigurationChanged(changed);
                assertEquals(100, activity.getBridge().getWebView().getSettings().getTextZoom());
                assertEquals(2.0f, changed.fontScale, 0.001f);
                assertEquals(density, activity.getResources().getDisplayMetrics().densityDpi);
            });
        }
    }
}
