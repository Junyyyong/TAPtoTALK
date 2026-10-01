package io.github.junyyyong.taptotalk;

import static org.junit.Assert.assertArrayEquals;
import org.junit.Test;

public class GameInsetsTest {
    @Test public void edgeToEdgeExcludesSystemBars() {
        assertArrayEquals(new float[]{24,0,48,0}, GameInsets.remaining(1080,2340,0,0,1080,2340,72,0,144,0,3), .001f);
    }
    @Test public void nativePaddingIsNotExcludedTwice() {
        assertArrayEquals(new float[]{0,0,0,0}, GameInsets.remaining(1080,2340,0,72,1080,2124,72,0,144,0,3), .001f);
    }
    @Test public void partialPaddingAndCutoutsUseOnlyRemainingOverlap() {
        assertArrayEquals(new float[]{12,10,24,4}, GameInsets.remaining(1080,2340,12,36,1068,2232,72,30,144,24,3), .001f);
    }
    @Test public void densityChangesKeepSamePhysicalSafeArea() {
        for (float density : new float[]{2,2.4f,3,3.6f,4}) {
            float[] result = GameInsets.remaining(1080,2340,0,0,1080,2340,72,0,144,0,density);
            assertArrayEquals(new float[]{72,0,144,0}, new float[]{result[0]*density,result[1]*density,result[2]*density,result[3]*density}, .001f);
        }
    }
}
