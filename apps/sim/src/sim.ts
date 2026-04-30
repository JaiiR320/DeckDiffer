export type CardPosition = {
  x: number;
  y: number;
};

export type SelectionBox = {
  start: CardPosition;
  current: CardPosition;
};

export type Rectangle = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type SimZone =
  | "battlefield"
  | "hand"
  | "library"
  | "graveyard"
  | "exile"
  | "command"
  | "stack";

export type DropTarget = {
  zone: SimZone;
  playerId?: string;
};

export const doubleClickMs = 320;
export const battlefieldTargetId = "zone:battlefield";
export const cardTargetPrefix = "card:";

export function zoneTargetId(target: DropTarget): string {
  return target.zone === "battlefield" ? battlefieldTargetId : `zone:${target.zone}`;
}

export function cardTargetId(objectId: string): string {
  return `${cardTargetPrefix}${objectId}`;
}

export function toRectangle(box: SelectionBox): Rectangle {
  return {
    left: Math.min(box.start.x, box.current.x),
    top: Math.min(box.start.y, box.current.y),
    right: Math.max(box.start.x, box.current.x),
    bottom: Math.max(box.start.y, box.current.y),
  };
}
