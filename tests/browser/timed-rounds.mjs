// Browser integration checks. Clock jumps are test-only, never shipped in the game.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const [url = "http://127.0.0.1:4194", output = "/private/tmp/talk-timed-tests", only] = process.argv.slice(2);
mkdirSync(output, { recursive: true });

async function check(scenario) {
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const el = id => document.getElementById(id);
  const { ALPHABET_STAGES } = await import("/src/content/prompts.ts");
  const { SYLLABLE_STAGES } = await import("/src/content/learningJourney.ts");
  const { requiredBoardSymbols } = await import("/src/core/hangul/target.ts");
  const now = performance.now.bind(performance);
  let offset = 0;
  Object.defineProperty(performance, "now", { value: () => now() + offset });
  const mode = scenario === "word" ? "word" : scenario === "syllable" ? "syllable" : "alphabet";
  el(`mode-${mode}`).click(); el("btn-alphabet-start").click();
  const tap = value => {
    const label = value === "ㆍ" ? "Cheonjiin dot" : value;
    const button = [...document.querySelectorAll("#letter-board button:not(:disabled)")].find(b => b.getAttribute("aria-label") === label && !/(rotate|flip|--shape|stem)/.test(b.className));
    assert(button, `Missing ${value}`); button.click();
  };
  const finishDance = async () => {
    // Early taps cannot dismiss the score card.
    el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(!el("cheer").classList.contains("hidden"), "Score skipped");
    await wait(2100);
    assert(el("cheer-card").classList.contains("hidden"), "Score did not last two seconds");
    el("cheer-clip").dispatchEvent(new Event("ended"));
    assert(el("cheer").classList.contains("cheer-hold"), "Must wait for tap");
    const time = el("run-clock").textContent;
    await wait(100);
    assert(el("run-clock").textContent === time, "Result clock running");
    el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(el("cheer").classList.contains("hidden"), "Tap did not continue");
  };
  if (scenario === "media-error") {
    HTMLMediaElement.prototype.play = () => Promise.reject(Error("Test playback blocked"));
    offset += 60000; await wait(50);
    assert(!el("cheer-card").classList.contains("hidden"), "Missing score card");
    el("cheer-clip").dispatchEvent(new Event("error"));
    assert(!el("cheer").classList.contains("hidden"), "Error skipped score card");
    await wait(2100);
    assert(el("cheer").classList.contains("cheer-hold"), "Playback error did not offer tap");
    assert(el("target-label").textContent === "STAGE 1 · 2×2", "Auto advanced on media error");
    return;
  }
  if (scenario === "retry") {
    tap("ㄱ"); await wait(450);
    offset += 10000; await wait(50);
    el("btn-pause").click();
    const paused = el("run-clock").textContent;
    offset += 20000; await wait(50);
    assert(el("run-clock").textContent === paused, "Pause consumed time");
    el("btn-resume").click();
    assert(el("run-clock").textContent.startsWith("00:49"), "Resume counted pause");
    offset += 60000; await wait(50);
    assert(el("cheer-headline").textContent === "TIME’S UP!", "Timeout missing");
    assert(el("cheer-word").textContent === "NOT BAD", "Lowest grade incorrect");
    assert(Number(el("cheer-score").textContent) > 0, "Lost correct progress");
    assert([...document.querySelectorAll("#letter-board button")].every(b => b.disabled), "Background enabled");
    await finishDance();
    assert(el("target-label").textContent === "STAGE 1 · 2×2", "Failed section skipped");
    assert(el("target-text").textContent.includes("ㄱ"), "Retry not reset");
    return;
  }
  if (scenario === "word") {
    for (let i = 0; i < 10; i++) {
      const word = el("target-text").querySelector(".target-korean").textContent;
      requiredBoardSymbols(word).forEach(tap);
      await wait(450);
      assert(el("cheer").classList.contains("hidden"), "Old 10-word bonus still active");
    }
    assert(el("target-label").textContent === "STAGE 1 · 8×8", "Round number changed per word");
    offset += 60000; await wait(50);
    assert(el("cheer-headline").textContent === "TIME’S UP!", "Word timeout missing");
    await finishDance();
    assert(el("target-label").textContent === "STAGE 2 · 8×8", "Word next round missing");
    assert(el("run-clock").textContent.startsWith("01:00"), "Word clock not reset");
    return;
  }
  const stages = mode === "syllable" ? SYLLABLE_STAGES : ALPHABET_STAGES;
  const limit = mode === "syllable" ? 14 : scenario === "endless" ? 27 : 17;
  for (let i = 0; i < limit; i++) {
    stages[i].sequence.forEach(tap);
    const boundary = i + 1 === stages.length || stages[i + 1].boardSide !== stages[i].boardSide;
    if (boundary) {
      assert(el("cheer-headline").textContent === "BONUS!", "No clear bonus at size boundary");
      assert(Number(el("cheer-score").textContent.replaceAll(",", "")) >= 1000, "Clear score too low");
      if (scenario === "bonus") return; // Record the real score card before the dance.
      await finishDance();
    } else await wait(450);
  }
  if (scenario === "endless") {
    assert(el("target-label").textContent === "STAGE 4 · 8×8", "No 8×8 section");
    offset += 60000; await wait(50);
    assert(el("cheer-score").textContent === "0", "Zero work must score zero");
    await finishDance();
    assert(el("target-label").textContent === "STAGE 5 · 8×8", "Endless round did not advance");
  } else assert(el("target-label").textContent === "STAGE 2 · 4×4", "Syllable size transition missing");
}

for (const scenario of only ? [only] : ["bonus", "retry", "word", "syllable", "endless", "media-error"]) {
  const run = spawnSync(process.execPath, ["docs/research/tools/capture-mobile.mjs", url, `${output}/${scenario}.png`, `(${check.toString()})(${JSON.stringify(scenario)})`], { stdio: "inherit" });
  if (run.status !== 0) process.exit(run.status || 1);
  console.log(`PASS ${scenario}`);
}
