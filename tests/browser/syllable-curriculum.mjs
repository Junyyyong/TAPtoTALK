import { spawnSync } from "node:child_process";
const [url, output, stop = "애"] = process.argv.slice(2);
async function visit(stop) {
  const el = id => document.getElementById(id);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const { SYLLABLE_STAGES } = await import("/src/content/learningJourney.ts");
  el("mode-syllable").click(); el("btn-alphabet-start").click();
  for (let i = 0; i < SYLLABLE_STAGES.length; i++) {
    const stage = SYLLABLE_STAGES[i];
    if (stage.target === stop) return;
    for (const value of stage.sequence) {
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
