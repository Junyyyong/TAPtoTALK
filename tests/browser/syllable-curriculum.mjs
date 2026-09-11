import { spawnSync } from "node:child_process";
const [url, output, stop = "sixth"] = process.argv.slice(2);
async function visit(stop) {
  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const content = await import("/src/content/learningJourney.ts");
  const { requiredBoardSymbols } = await import("/src/core/hangul/target.ts");
  const count = content.createSyllablePractice ? 30 : content.SYLLABLE_STAGES.length;
  el("mode-syllable").click(); el("btn-alphabet-start").click();
  for (let i = 0; i < count; i++) {
    const target = (el("target-text").querySelector(".target-korean") ?? el("target-text")).textContent;
    if (target === stop || (stop === "sixth" && i === 5) || (stop === "finals" && i === 25)) return;
    for (const value of requiredBoardSymbols(target)) {
      const button = [...document.querySelectorAll("#letter-board button:not(:disabled)")].find(b => b.getAttribute("aria-label") === (value === "ㆍ" ? "Cheonjiin dot" : value) && !/(rotate|flip|--shape|stem)/.test(b.className));
      if (!button) throw Error("Missing " + value);
      button.click();
    }
    await wait(430);
    if (!el("cheer").classList.contains("hidden")) {
      el("cheer-clip").dispatchEvent(new Event("ended"));
      el("cheer").dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    }
  }
  if (stop !== "main") throw Error("Lesson not found");
  if (!el("target-label").textContent.includes("ROUND 1")) throw Error("Main round missing");
}
const r = spawnSync(process.execPath, ["docs/research/tools/capture-mobile.mjs", url, output, "(" + visit.toString() + ")(" + JSON.stringify(stop) + ")"], { stdio: "inherit" });
process.exit(r.status || 0);
