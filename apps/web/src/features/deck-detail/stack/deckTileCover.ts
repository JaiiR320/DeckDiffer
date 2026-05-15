import type { DeckTileCover } from "#/lib/deck";
import type { EditorRow } from "../editor/types";

export function createDeckTileCover(row: EditorRow, imageUrl: string): DeckTileCover {
  return {
    oracleId: row.oracleId,
    setCode: row.setCode,
    collectorNumber: row.collectorNumber,
    name: row.name,
    imageUrl,
  };
}
