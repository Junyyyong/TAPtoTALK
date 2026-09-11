import { spawnSync } from "node:child_process";
const [url, output, variant = "after"] = process.argv.slice(2);
async function check(variant) {
  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const { requiredBoardSymbols } = await import("/src/core/hangul/target.ts");
  const target = () => el("target-text").querySelector(".target-korean").textContent;
  const text = () => el("typed-text").querySelector(".composed-input").textContent;
  const tap = v => {
    const b = [...document.querySelectorAll("#letter-board button:not(:disabled)")].find(b => b.getAttribute("aria-label") === (v === "ㆍ" ? "Cheonjiin dot" : v) && !/(rotate|flip|--shape|stem)/.test(b.className));
    assert(b, "Missing " + v); b.click();
  };
  el("mode-word").click(); el("btn-alphabet-start").click();
  for (let i = 0; i < 33; i++) {
    const word = target();
    if (word === "학교") {
      // The same raw taps: previously auto-corrected, now explicitly ambiguous.
      requiredBoardSymbols(word).forEach(tap);
      if (variant === "before") { await wait(450); return; }
      assert(text() === "하꾜", "Direct input was auto-corrected");
      await wait(450); assert(target() === word, "Wrong spelling accepted");
      if (variant === "after") return;
      for (let n = 0; n < requiredBoardSymbols(word).length; n++) el("btn-backspace").click();
      requiredBoardSymbols("학").forEach(tap);
      el("btn-space").click(); assert(text() === "학 ", "Space missing");
      el("btn-backspace").click(); assert(text() === "학", "Space did not delete");
      requiredBoardSymbols("교").forEach(tap);
      assert(text() === "학교", "Committed syllable recombined");
      await wait(450); assert(target() !== word, "Committed word failed");
      return;
    }
    for (const [index, c] of [...word].entries()) {
      requiredBoardSymbols(c).forEach(tap);
      if (index < word.length - 1) { el("btn-space").click(); el("btn-backspace").click(); }
    }
    await wait(450);
  }
  throw Error("School not reached");
}
const r = spawnSync(process.execPath, ["docs/research/tools/capture-mobile.mjs", url, output, "(" + check.toString() + ")(" + JSON.stringify(variant) + ")"], { stdio: "inherit" });
process.exit(r.status || 0);
