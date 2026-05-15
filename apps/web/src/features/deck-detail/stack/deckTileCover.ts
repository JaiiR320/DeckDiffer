import type { DeckTileCover } from "#/lib/deck";
import type { EditorRow } from "../editor/types";

export function createDeckTileCover(
  row: EditorRow,
  imageUrl: string,
  name = row.name,
): DeckTileCover {
  return {
    oracleId: row.oracleId,
    setCode: row.setCode,
    collectorNumber: row.collectorNumber,
    name,
    imageUrl,
    source: "manual",
    kind: "single",
  };
}
