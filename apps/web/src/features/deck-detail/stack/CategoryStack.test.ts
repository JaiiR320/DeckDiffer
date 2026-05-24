import { describe, expect, it } from "vitest";
import { compareEdhrecRanks } from "./categoryStackSort";

describe("compareEdhrecRanks", () => {
  it("sorts lower ranks first when ascending", () => {
    expect(compareEdhrecRanks(1, 20, "asc")).toBeLessThan(0);
  });

  it("sorts higher ranks first when descending", () => {
    expect(compareEdhrecRanks(300, 20, "desc")).toBeLessThan(0);
  });

  it("keeps unranked cards last in either direction", () => {
    expect(compareEdhrecRanks(null, 20, "asc")).toBeGreaterThan(0);
    expect(compareEdhrecRanks(undefined, 20, "desc")).toBeGreaterThan(0);
  });
});
