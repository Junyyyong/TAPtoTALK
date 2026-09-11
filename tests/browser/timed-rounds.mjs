// Run against Vite; clock jumps are test-only and never shipped.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
const [url = "http://127.0.0.1:4194", output = "/private/tmp/talk-timed-tests", only] = process.argv.slice(2);
mkdirSync(output, { recursive: true });
async function check(mode) {
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const el = id => document.getElementById(id);
  const { ALPHABET_STAGES } = await import("/src/content/prompts.ts");
  const { SYLLABLE_STAGES } = await import("/src/content/learningJourney.ts");
  const { requiredBoardSymbols } = await import("/src/core/hangul/target.ts");
  const now = performance.now.bind(performance); let offset = 0;
  Object.defineProperty(performance, "now", { value: () => now() + offset });
  el("mode-" + mode).click(); el("btn-alphabet-start").click();
  const tap = value => {
    const b = [...document.querySelectorAll("#letter-board button:not(:disabled)")].find(b => b.getAttribute("aria-label") === (value === "ㆍ" ? "Cheonjiin dot" : value) && !/(rotate|flip|--shape|stem)/.test(b.className));
    assert(b, "Missing " + value); b.click();
  };
  const dance = async () => {
    await wait(100);
    el("cheer-clip").dispatchEvent(new Event("ended"));
    assert(el("cheer").classList.contains("cheer-hold"), "No tap hold");
    el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(el("cheer").classList.contains("hidden"), "No continuation");
  };
  if (mode !== "word") {
    offset += 120000; await wait(40);
    assert(el("run-clock").textContent === "PRACTICE", "Tutorial timed out");
    el("btn-pause").click(); el("btn-resume").click();
    const lessons = mode === "alphabet" ? ALPHABET_STAGES : SYLLABLE_STAGES;
    for (let i = 0; i < lessons.length; i++) {
      lessons[i].sequence.forEach(tap);
      const boundary = i + 1 === lessons.length || lessons[i + 1].boardSide !== lessons[i].boardSide;
      if (boundary) {
        assert(el("cheer-word").textContent === "GREAT!", "Missing tutorial celebration");
        assert(el("cheer-card").classList.contains("hidden"), "Tutorial shows score");
        assert([...document.querySelectorAll("#letter-board button")].every(b => b.disabled), "Background enabled");
        offset += 120000;
        await dance();
      } else await wait(430);
    }
    assert(el("target-label").textContent === "ROUND 1 · 8×8", "Main game not started");
    assert(/^(01:00|00:59)/.test(el("run-clock").textContent), "Tutorial time leaked");
    // Complete one target, then time out with another target unfinished.
    const current = mode === "alphabet"
      ? [...document.querySelectorAll(".alphabet-target-jamo")].map(n => n.getAttribute("aria-label"))
      : requiredBoardSymbols(el("target-text").textContent);
    current.forEach(tap); await wait(430);
  } else {
    requiredBoardSymbols(el("target-text").querySelector(".target-korean").textContent).forEach(tap);
    await wait(430);
  }
  el("btn-pause").click();
  const paused = el("run-clock").textContent;
  offset += 120000; await wait(40);
  assert(el("run-clock").textContent === paused, "Pause consumed time");
  el("btn-resume").click();
  assert(el("cheer").classList.contains("hidden"), "Pause caused timeout");
  offset += 60000; await wait(40);
  assert(el("cheer-headline").textContent === "TIME’S UP!", "No timeout");
  const expected = { alphabet: 100, syllable: 75, word: 150 }[mode];
  assert(Number(el("cheer-score").textContent) === expected, "Wrong completed-item score");
  assert(el("cheer-word").textContent === "GOOD TRY", "Wrong grade");
  assert([...document.querySelectorAll("#letter-board button")].every(b => b.disabled), "Result accepts input");
  el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  assert(!el("cheer").classList.contains("hidden"), "Skipped result card");
  await wait(2100); await dance();
  assert(/^(01:00|00:59)/.test(el("run-clock").textContent), "Round not reset");
  // Zero completed targets must give Not Bad. Simulate blocked media as well.
  HTMLMediaElement.prototype.play = () => Promise.reject(Error("Test blocked"));
  offset += 60000; await wait(40);
  assert(el("cheer-score").textContent === "0" && el("cheer-word").textContent === "NOT BAD", "Zero score");
  await wait(2100);
  assert(el("cheer").classList.contains("cheer-hold"), "Media failure blocked continuation");
}
for (const mode of only ? [only] : ["alphabet", "syllable", "word"]) {
  const run = spawnSync(process.execPath, ["docs/research/tools/capture-mobile.mjs", url, output + "/" + mode + ".png", "(" + check.toString() + ")(" + JSON.stringify(mode) + ")"], { stdio: "inherit" });
  if (run.status !== 0) process.exit(run.status || 1);
  console.log("PASS " + mode);
}
