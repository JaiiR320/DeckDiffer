import { CollisionPriority } from "@dnd-kit/abstract";
import { useDroppable } from "@dnd-kit/react";
import type { ReactNode } from "react";
import type { CardCategory } from "../../../lib/decklist";
import { laneId } from "./stackIds";

type CategoryLaneProps = {
  laneIndex: number;
  categories: CardCategory[];
  hasPreview: boolean;
  onLaneRef: (element: HTMLDivElement | null) => void;
  onRemoveLane?: (laneIndex: number) => void;
  children: ReactNode;
};

export function CategoryLane({
  laneIndex,
  categories,
  hasPreview,
  onLaneRef,
  onRemoveLane,
  children,
}: CategoryLaneProps) {
  const { ref } = useDroppable({
    id: laneId(laneIndex),
    type: "lane",
    accept: "category",
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div
      ref={(element) => {
        ref(element);
        onLaneRef(element);
      }}
      className="flex min-h-80 min-w-0 flex-col gap-3 p-1"
    >
      {categories.length === 0 && !hasPreview ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl bg-zinc-900/25 px-4 text-center text-sm font-semibold text-zinc-600">
          <span>Empty lane</span>
          {onRemoveLane ? (
            <button
              type="button"
              onClick={() => onRemoveLane(laneIndex)}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
            >
              Remove lane
            </button>
          ) : null}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
