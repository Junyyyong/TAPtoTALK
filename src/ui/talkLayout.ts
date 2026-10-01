/** Native title fallback: retain reference type sizes, scroll only if needed. */
export function trackTalkTitleLayout(enabled: boolean): void {
  if (!enabled) return;
  const screen = document.getElementById("screen-title")!;
  const logo = screen.querySelector<HTMLElement>(".brand-block")!;
  const modes = screen.querySelector<HTMLElement>(".mode-list")!;
  const footer = screen.querySelector<HTMLElement>(".title-links")!;
  const prompt = document.getElementById("music-prompt")!;
  let frame = 0;
  let hidden = screen.classList.contains("hidden");
  const measure = (): void => {
    frame = 0;
    if (!screen.getClientRects().length) return;
    const scroll = screen.scrollTop;
    screen.classList.remove("is-space-limited");
    const css = getComputedStyle(screen);
    const scale = screen.getBoundingClientRect().height / (parseFloat(css.height) || 1);
    const bottom = screen.getBoundingClientRect().bottom - (parseFloat(css.paddingBottom) || 0) * scale;
    const overlap = logo.getBoundingClientRect().bottom > modes.getBoundingClientRect().top;
    screen.classList.toggle("is-space-limited", overlap || footer.getBoundingClientRect().bottom > bottom + .5);
    screen.scrollTop = scroll;
  };
  const schedule = (): void => { if (!frame) frame = requestAnimationFrame(measure); };
  const observer = new ResizeObserver(schedule);
  observer.observe(screen);
  observer.observe(logo);
  observer.observe(footer);
  new MutationObserver(() => {
    const next = screen.classList.contains("hidden");
    if (hidden !== next) { hidden = next; schedule(); }
  }).observe(screen, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(schedule).observe(prompt, { attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("resize", schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  void document.fonts.ready.then(schedule);
  schedule();
}
