import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), "screenshots");
const before = JSON.parse(fs.readFileSync(path.join(directory, "before-measurements.json")));
const after = JSON.parse(fs.readFileSync(path.join(directory, "after-measurements.json")));
assert.equal(before.measurements.length, 16);
assert.equal(after.measurements.length, 16);
assert.deepEqual(before.errors, []);
assert.deepEqual(after.errors, []);
assert.deepEqual(before.otherGames, after.otherGames, "Alphabet and Syllable geometry/glyphs must be unchanged");
for (const [index, current] of after.measurements.entries()) {
  const previous = before.measurements[index];
  for (const field of ["platform", "width", "height", "target", "grid", "tileWidth", "tileHeight", "boardWidth", "boardHeight", "logicalWidth", "logicalHeight", "symbols", "glyphScales"]) {
    assert.deepEqual(current[field], previous[field], "Unchanged board field: " + field);
  }
  assert(current.glyphToTile <= .571);
  if (current.width === 390 && current.height === 844) assert.equal(current.glyphDisplayWidth, previous.glyphDisplayWidth, "Reference glyph size must be preserved");
}
for (const screenshot of [...before.screenshots, ...after.screenshots]) {
  const bytes = fs.readFileSync(path.join(directory, screenshot.file));
  assert.equal(bytes.readUInt32BE(16), screenshot.pngWidth);
  assert.equal(bytes.readUInt32BE(20), screenshot.pngHeight);
}
const summary = { actualDevice: false, comparedConditions: 16, renderedConditions: 32, runtimeErrors: 0,
  reference390x844: "UNCHANGED", boardGeometryAndContents: "UNCHANGED", symbolScaleFactors: "UNCHANGED",
  alphabetAndSyllableReference: "UNCHANGED", liveResizeCoordinateTapAndDelete: after.interactionChecks,
  screenshots: [...before.screenshots, ...after.screenshots],
  measurements: after.measurements.map((m, i) => ({ platform: m.platform, width: m.width, height: m.height, tilePx: m.tileWidth,
    beforeGlyphPx: before.measurements[i].glyphDisplayWidth, afterGlyphPx: m.glyphDisplayWidth,
    beforeRatio: before.measurements[i].glyphToTile, afterRatio: m.glyphToTile })) };
fs.writeFileSync(path.join(path.dirname(directory), "comparison.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
