package io.github.junyyyong.taptotalk;

/** Remaining WebView overlap in CSS pixels, after any native padding. */
final class GameInsets {
    static float[] remaining(int rootWidth, int rootHeight, int x, int y,
            int webWidth, int webHeight, int top, int right, int bottom, int left, float density) {
        return new float[] {
            Math.max(0, top - y) / density,
            Math.max(0, x + webWidth - (rootWidth - right)) / density,
            Math.max(0, y + webHeight - (rootHeight - bottom)) / density,
            Math.max(0, left - x) / density
        };
    }
}
