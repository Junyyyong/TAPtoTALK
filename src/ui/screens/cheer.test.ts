import { describe, expect, it } from "vitest";
import { poolFor } from "./cheer";

describe("score-based celebration clips", () => {
  it("selects a separately staged clip for each score band", () => {
    expect(poolFor(100).at(0)?.layout).toBe("compact");
    expect(poolFor(350).at(0)?.layout).toBe("standard");
    expect(poolFor(650).at(0)?.layout).toBe("large");
    expect(poolFor(900).at(0)?.layout).toBe("hero");
  });
});
