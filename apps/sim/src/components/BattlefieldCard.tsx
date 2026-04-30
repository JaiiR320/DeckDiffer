import { memo } from "react";
import type { CSSProperties } from "react";
import type { GameObject } from "@deckdiff/schemas";
import type { CardPosition } from "../sim.js";
import { useSimUiStore } from "../simUiStore.js";
import { Card } from "./Card.js";

const zeroPosition = { x: 0, y: 0 };

export const BattlefieldCard = memo(function BattlefieldCard({
  object,
  position,
  zIndex,
  onToggleTapped,
}: {
  object: GameObject;
  position: CardPosition;
  zIndex: number;
  onToggleTapped: (objectId: string) => void;
}) {
  const isDragging = useSimUiStore((state) => state.draggedObjectId === object.objectId);
  const isMovingWithGroup = useSimUiStore(
    (state) =>
      state.draggedObjectId !== null &&
      state.draggedObjectId !== object.objectId &&
      state.selectedObjectIds.includes(state.draggedObjectId) &&
      state.selectedObjectIds.includes(object.objectId),
  );
  const dragOffset = useSimUiStore((state) => {
    if (
      state.draggedObjectId === null ||
      state.draggedObjectId === object.objectId ||
      !state.selectedObjectIds.includes(state.draggedObjectId) ||
      !state.selectedObjectIds.includes(object.objectId)
    ) {
      return zeroPosition;
    }

    return state.dragOffset;
  });
  const style = {
    left: position.x,
    top: position.y,
    transform: isMovingWithGroup ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
    zIndex: isDragging || isMovingWithGroup ? 999 : zIndex,
  } as CSSProperties;

  return (
    <div className="battlefield-card" style={style}>
      <Card object={object} onToggleTapped={onToggleTapped} />
    </div>
  );
});
