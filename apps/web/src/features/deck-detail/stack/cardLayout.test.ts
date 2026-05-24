import { describe, expect, it } from "vitest";
import { computeCardLayout } from "./cardLayout";

describe("computeCardLayout", () => {
  it("scales stack and overlay measurements from actual card size", () => {
    const layout = computeCardLayout({ width: 300, height: 420 });

    expect(layout.stackPeek).toBeCloseTo(48.3);
    expect(layout.stackHoverGap).toBeCloseTo(10.5);
    expect(layout.stackTopInset).toBeCloseTo(10.5);
    expect(layout.controlTop).toBeCloseTo(134.4);
    expect(layout.controlSize).toBeCloseTo(39);
    expect(layout.badgeFontSize).toBeCloseTo(20.25);
    expect(layout.badgePaddingX).toBeCloseTo(11.25);
    expect(layout.badgePaddingY).toBeCloseTo(3.78);
  });
});
