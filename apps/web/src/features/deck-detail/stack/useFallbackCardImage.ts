import { useEffect, useState } from "react";
import { getCardPreview } from "#/lib/scryfall";
import type { EditorRow } from "../editor/types";

export function useFallbackCardImage(row: EditorRow) {
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (row.imageUrl) {
      return;
    }

    let isCancelled = false;
    getCardPreview({
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
    }).then((preview) => {
      if (!isCancelled) {
        setFallbackImageUrl(preview?.imageUrl ?? null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [row.collectorNumber, row.imageUrl, row.name, row.setCode]);

  return row.imageUrl ?? fallbackImageUrl;
}
