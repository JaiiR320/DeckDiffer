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
  children: ReactNode;
};

export function CategoryLane({
  laneIndex,
  categories,
  hasPreview,
  onLaneRef,
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
        <div className="flex min-h-64 items-center justify-center rounded-xl bg-zinc-900/25 px-4 text-center text-sm font-semibold text-zinc-600">
          Empty lane
        </div>
      ) : (
        children
      )}
    </div>
  );
}
