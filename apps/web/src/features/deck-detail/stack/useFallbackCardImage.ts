import { useEffect, useState } from "react";
import { getCardPreview, type CardPreviewFace } from "#/lib/scryfall";
import type { EditorRow } from "../editor/types";

export function useFallbackCardImage(row: EditorRow) {
  const fallbackKey = [row.name, row.setCode ?? "", row.collectorNumber ?? ""].join("\0");
  const [fallback, setFallback] = useState<{
    key: string;
    imageUrl: string | null;
    faces?: CardPreviewFace[];
  } | null>(null);

  useEffect(() => {
    if (row.imageUrl && row.faces) {
      return;
    }

    let isCancelled = false;
    getCardPreview({
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
    }).then((preview) => {
      if (!isCancelled) {
        setFallback({
          key: fallbackKey,
          imageUrl: preview?.imageUrl ?? null,
          faces: preview?.faces,
        });
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [fallbackKey, row.collectorNumber, row.faces, row.imageUrl, row.name, row.setCode]);

  const currentFallback = fallback?.key === fallbackKey ? fallback : null;

  return {
    imageUrl: row.imageUrl ?? currentFallback?.imageUrl ?? null,
    faces: row.faces ?? currentFallback?.faces,
  };
}
