// Real source rendering; use a separate archived checkout for the "before" run.
// node tests/browser/vocabulary-glyphs.mjs ROOT OUTPUT_DIR before|after
// PLAYWRIGHT_MODULE and CHROME_EXECUTABLE may point to existing local tools.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const [root, output, revision = "after"] = process.argv.slice(2);
assert(root && output, "Supply the source root and capture output directory");
const { createServer } = await import(pathToFileURL(path.join(root, "node_modules/vite/dist/node/index.js")));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const cache = fs.mkdtempSync(path.join(os.tmpdir(), "talk-glyph-capture-"));
fs.mkdirSync(output, { recursive: true });
const server = await createServer({ root, configFile: false, cacheDir: cache, logLevel: "error", server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: ["--mute-audio"] });
const report = { revision, root, actualDevice: false, seed: 1234, screenshotScale: 2, errors: [], measurements: [], otherGames: [], screenshots: [], interactionChecks: [] };

try {
  for (const platform of ["web", "android-simulation"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await context.addInitScript(platform => {
      if (platform === "android-simulation") window.CapacitorCustomPlatform = { name: "android" };
      let seed = 1234;
      Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
      const prefs = JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false, tutorialDone: true });
      for (const prefix of ["", "CapacitorStorage."]) localStorage.setItem(prefix + "taptotalk.preferences.v1", prefs);
      document.addEventListener("DOMContentLoaded", () => {
        for (const edge of ["top", "right", "bottom", "left"]) document.documentElement.style.setProperty("--android-game-inset-" + edge, "0px");
      }, { once: true });
    }, platform);
    // Test hooks only in browser responses; neither checkout is edited.
    await context.route("**/src/main.ts", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("new TalkApp();", "window.testApp=new TalkApp();") });
    });
    await context.route("**/src/config/app.ts", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("studioSplashMs: 3_000, productSplashMs: 4_000", "studioSplashMs: 0, productSplashMs: 0") });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on("pageerror", error => report.errors.push(error.message));
    const openGame = async mode => {
      await page.goto("http://127.0.0.1:" + server.httpServer.address().port);
      await page.locator("#mode-" + mode).waitFor({ state: "visible" });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#mode-" + mode).click();
      await page.locator("#btn-alphabet-start").click();
      await page.evaluate(() => window.testApp.stopClock());
    };
    await openGame("word");
    for (const [width, height] of [[390,844],[390,740],[390,640],[390,600],[430,600],[800,600],[1280,800],[1280,600]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      const measurement = await page.evaluate(() => {
        const tile = document.querySelector('.letter-tile[aria-label="ㄱ"]');
        const glyph = tile.querySelector(".uploaded-glyph"), rect = tile.getBoundingClientRect(), gr = glyph.getBoundingClientRect();
        const board = tile.parentElement;
        return { target: window.testApp.wordTarget.word, grid: board.dataset.gridSize,
          tileWidth: rect.width, tileHeight: rect.height, glyphDisplayWidth: gr.width, glyphDisplayHeight: gr.height,
          glyphFontPx: parseFloat(getComputedStyle(glyph).fontSize), glyphToTile: gr.width / rect.width,
          boardWidth: board.getBoundingClientRect().width, boardHeight: board.getBoundingClientRect().height,
          logicalWidth: document.querySelector("#app").clientWidth, logicalHeight: document.querySelector("#app").clientHeight,
          symbols: [...board.querySelectorAll("button")].map(b => b.getAttribute("aria-label")),
          glyphScales: [...board.querySelectorAll(".uploaded-glyph")].map(g => ({ className: g.className, transform: getComputedStyle(g).transform, scale: getComputedStyle(g).scale })) };
      });
      assert.equal(measurement.grid, "8");
      assert(Math.abs(measurement.tileWidth - measurement.tileHeight) < .1, "Tile must remain square");
      if (revision === "after") assert(measurement.glyphToTile <= .571, "Glyph must scale down with its actual tile");
      report.measurements.push({ platform, width, height, ...measurement });
      if ((width === 390 && [844,600].includes(height)) || (platform === "web" && width === 1280)) {
        const file = `${revision}-${platform}-${width}x${height}.png`;
        await page.screenshot({ path: path.join(output, file), animations: "disabled" });
        report.screenshots.push({ file, cssWidth: width, cssHeight: height, pngWidth: width * 2, pngHeight: height * 2 });
      }
    }
    // A coordinate tap after live resizing must still hit the correct block.
    await page.setViewportSize({ width: 390, height: 640 });
    await page.waitForTimeout(150);
    const value = await page.evaluate(async () => (await import("/src/core/hangul/target.ts")).requiredBoardSymbols(window.testApp.wordTarget.word)[0]);
    const label = value === "ㆍ" ? "Cheonjiin dot" : value;
    const selected = page.locator(`#letter-board button[aria-label="${label}"]:not(:disabled)`).first();
    const tileId = await selected.getAttribute("data-tile-id");
    const button = page.locator(`#letter-board button[data-tile-id="${tileId}"]`);
    const rect = await button.boundingBox();
    await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
    assert(await button.isDisabled(), "Correct coordinate tap should consume the selected tile");
    await page.locator("#btn-backspace").click();
    assert.equal(await page.locator(".composed-input").textContent(), "", "Delete must undo the input");
    report.interactionChecks.push({ platform, liveResize: "PASS", coordinateTap: "PASS", delete: "PASS" });
    for (const mode of ["alphabet", "syllable"]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await openGame(mode);
      report.otherGames.push({ platform, mode, ...await page.evaluate(() => {
        const tile = document.querySelector(".letter-tile"), glyph = tile.querySelector(".uploaded-glyph");
        return { tileWidth: tile.getBoundingClientRect().width, glyphWidth: glyph.getBoundingClientRect().width, glyphFontPx: parseFloat(getComputedStyle(glyph).fontSize) };
      }) });
    }
    await context.close();
  }
  assert.equal(report.errors.length, 0, "No runtime errors");
  if (revision === "after") {
    const wide = report.measurements.filter(m => m.platform === "web" && m.width === 1280);
    assert(wide[1].tileWidth < wide[0].tileWidth && wide[1].glyphDisplayWidth < wide[0].glyphDisplayWidth, "Shorter boards must have smaller glyphs");
  }
  console.log(JSON.stringify({ revision, conditions: report.measurements.length, errors: report.errors, interactionChecks: report.interactionChecks, measurements: report.measurements.map(({symbols,glyphScales,...m})=>m) }, null, 2));
} finally {
  fs.writeFileSync(path.join(output, `${revision}-measurements.json`), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await server.close();
}
