import { spawnSync } from "node:child_process";
const [url, output, scenario = "word-after"] = process.argv.slice(2);
async function check(scenario) {
  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const { requiredBoardSymbols } = await import("/src/core/hangul/target.ts");
  const tap = value => {
    const b = [...document.querySelectorAll("#letter-board button:not(:disabled)")].find(b => b.getAttribute("aria-label") === (value === "ㆍ" ? "Cheonjiin dot" : value) && !/(rotate|flip|--shape|stem)/.test(b.className));
    assert(b, "Missing " + value); b.click();
  };
  const syllable = scenario.startsWith("syllable");
  el(syllable ? "mode-syllable" : "mode-word").click(); el("btn-alphabet-start").click();
  if (syllable) {
    for (const target of "가나다라마바사아자차카타파하") {
      requiredBoardSymbols(target).forEach(tap); await wait(430);
    }
    el("cheer-clip").dispatchEvent(new Event("ended"));
    el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    assert(el("target-text").textContent === (scenario.endsWith("before") ? "거" : "아"), "Wrong vowel lesson");
    return;
  }
  for (let i = 0; i < 33; i++) {
    const target = el("target-text").querySelector(".target-korean").textContent;
    if (target === "아뿔사") {
      const taps = requiredBoardSymbols(target);
      taps.slice(0, 8).forEach(tap);
      const text = () => el("typed-text").querySelector(".composed-input").textContent;
      assert(text() === (scenario.endsWith("before") ? "압불" : "아뿔"), "Unexpected partial: " + text());
      if (scenario === "word-complete") {
        // Backspace/retype preserves the boundary and full input advances.
        el("btn-backspace").click(); assert(text() === "아뿌", "Undo failed");
        tap(taps[7]); taps.slice(8).forEach(tap);
        assert(text() === "아뿔사", "Final word failed");
        await wait(430);
        assert(el("target-text").querySelector(".target-korean").textContent !== target, "Word did not advance");
      }
      return;
    }
    requiredBoardSymbols(target).forEach(tap); await wait(430);
  }
  throw Error("Word not encountered");
}
const r = spawnSync(process.execPath, ["docs/research/tools/capture-mobile.mjs", url, output, "(" + check.toString() + ")(" + JSON.stringify(scenario) + ")"], { stdio: "inherit" });
process.exit(r.status || 0);
