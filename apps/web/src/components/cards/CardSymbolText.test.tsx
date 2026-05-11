import { describe, expect, it } from "vitest";
import { splitCardSymbolText } from "./CardSymbolText";

describe("splitCardSymbolText", () => {
  it("splits oracle text into text and symbol tokens", () => {
    expect(splitCardSymbolText("{T}: Add {C}. Basic landcycling {1}")).toEqual([
      { key: "symbol-0", type: "symbol", value: "{T}" },
      { key: "text-3", type: "text", value: ": Add " },
      { key: "symbol-9", type: "symbol", value: "{C}" },
      { key: "text-12", type: "text", value: ". Basic landcycling " },
      { key: "symbol-32", type: "symbol", value: "{1}" },
    ]);
  });

  it("returns a single text token when no symbols are present", () => {
    expect(splitCardSymbolText("Draw a card.")).toEqual([
      { key: "text-0", type: "text", value: "Draw a card." },
    ]);
  });
});
