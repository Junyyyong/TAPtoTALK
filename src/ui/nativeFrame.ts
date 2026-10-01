/** Normalize Android density, not device aspect ratio. Web keeps its layout. */
export const NATIVE_FRAME = { width: 390, height: 844, minHeight: 640 } as const;
export interface FrameInsets { top: number; right: number; bottom: number; left: number }

export function fitNativeFrame(width: number, height: number, insets: FrameInsets) {
  const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const left = safe(insets.left), top = safe(insets.top);
  const availableWidth = Math.max(0, safe(width) - left - safe(insets.right));
  const availableHeight = Math.max(0, safe(height) - top - safe(insets.bottom));
  const scale = Math.min(availableWidth / NATIVE_FRAME.width, availableHeight / NATIVE_FRAME.minHeight);
  return {
    scale,
    x: left,
    y: top,
    width: scale > 0 ? availableWidth / scale : NATIVE_FRAME.width,
    height: scale > 0 ? availableHeight / scale : NATIVE_FRAME.minHeight,
    insets: {
      top: scale > 0 ? top / scale : 0,
      right: scale > 0 ? safe(insets.right) / scale : 0,
      bottom: scale > 0 ? safe(insets.bottom) / scale : 0,
      left: scale > 0 ? left / scale : 0,
    },
  };
}

/** A measured zero is authoritative when native padding already excludes a bar. */
export function remainingFrameInset(measured: string, fallback: string): number {
  const value = parseFloat(measured);
  return Number.isFinite(value) ? Math.max(0, value) : Math.max(0, parseFloat(fallback) || 0);
}

export function trackNativeFrame(enabled: boolean): void {
  if (!enabled || !CSS.supports("container-type", "size")) return;
  const app = document.getElementById("app")!;
  app.classList.add("is-native-frame");
  document.body.classList.add("native-frame-active");
  let frame = 0;
  const measure = (): void => {
    frame = 0;
    const viewport = window.visualViewport;
    if (viewport && viewport.scale > 1.01) return;
    const css = getComputedStyle(document.documentElement);
    const inset = (side: string) => remainingFrameInset(
      css.getPropertyValue(`--android-game-inset-${side}`), css.getPropertyValue(`--safe-${side}`),
    );
    const fit = fitNativeFrame(viewport?.width ?? innerWidth, viewport?.height ?? innerHeight, {
      top: inset("top"), right: inset("right"), bottom: inset("bottom"), left: inset("left"),
    });
    // Body values also fit top-layer legal dialogs and independent save notices.
    // Mutating body rather than the observed root avoids observer feedback loops.
    document.body.style.setProperty("--frame-scale", String(fit.scale));
    document.body.style.setProperty("--frame-left", `${fit.x}px`);
    document.body.style.setProperty("--frame-top", `${fit.y}px`);
    document.body.style.setProperty("--frame-width", `${fit.width}px`);
    document.body.style.setProperty("--frame-height", `${fit.height}px`);
    for (const [edge, value] of Object.entries(fit.insets)) {
      document.body.style.setProperty(`--frame-safe-${edge}`, `${value}px`);
    }
    document.body.style.setProperty("--frame-full-width", `${fit.width + fit.insets.left + fit.insets.right}px`);
    document.body.style.setProperty("--frame-full-height", `${fit.height + fit.insets.top + fit.insets.bottom}px`);
    app.style.setProperty("--app-h", `${fit.height}px`);
    app.style.setProperty("--layout-vw", `${fit.width / 100}px`);
    app.style.setProperty("--layout-vh", `${fit.height / 100}px`);
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  new ResizeObserver(schedule).observe(document.body);
  window.addEventListener("resize", schedule);
  window.addEventListener("pageshow", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  measure();
}
