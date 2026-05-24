import { describe, expect, it } from "vitest";
import { sortPrintings } from "./printingSort";

const printings = [
  {
    scryfallId: "1",
    oracleId: "oracle-1",
    name: "Bedevil",
    setCode: "RNA",
    setName: "Ravnica Allegiance",
    collectorNumber: "157",
    releasedAt: "2019-01-25",
    priceUsd: undefined,
  },
  {
    scryfallId: "2",
    oracleId: "oracle-1",
    name: "Bedevil",
    setCode: "DMC",
    setName: "Dominaria United Commander",
    collectorNumber: "144",
    releasedAt: "2022-09-09",
    priceUsd: 0.99,
  },
  {
    scryfallId: "3",
    oracleId: "oracle-1",
    name: "Bedevil",
    setCode: "NCC",
    setName: "New Capenna Commander",
    collectorNumber: "331",
    releasedAt: "2022-04-29",
    priceUsd: 0.46,
  },
];

describe("sortPrintings", () => {
  it("sorts by newest edition date", () => {
    expect(sortPrintings(printings, "date").map((printing) => printing.setCode)).toEqual([
      "DMC",
      "NCC",
      "RNA",
    ]);
  });

  it("sorts by price with missing prices last", () => {
    expect(sortPrintings(printings, "price").map((printing) => printing.setCode)).toEqual([
      "NCC",
      "DMC",
      "RNA",
    ]);
  });
});
