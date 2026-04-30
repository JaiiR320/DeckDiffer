import { DragDropProvider, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/react";
import { Feedback } from "@dnd-kit/dom";
import { applyCommand, createGame } from "@deckdiff/core";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useCallback, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { GameObject, GameState, ZoneRef } from "@deckdiff/schemas";
import { BattlefieldCard } from "./components/BattlefieldCard.js";
import { Card } from "./components/Card.js";
import { DropZone } from "./components/DropZone.js";
import { HandZone } from "./components/HandZone.js";
import { PileZone } from "./components/PileZone.js";
import { SelectionMarquee } from "./components/SelectionMarquee.js";
import type { CardPosition, DropTarget, Rectangle, SelectionBox, SimZone } from "./sim.js";
import { cardTargetPrefix, toRectangle } from "./sim.js";
import { useSimUiStore } from "./simUiStore.js";

type PositionMap = Record<string, CardPosition>;

type ObjectLocation = {
  object: GameObject;
  zone: DropTarget;
};

const gridSize = 24;
const cardWidth = 120;
const cardHeight = 168;
const zoneTrayHeight = 252;
const battlefieldPadding = 8;

const pileZones = ["library", "graveyard", "exile", "command"] as const;

function snap(value: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function snapPosition(position: CardPosition): CardPosition {
  return { x: snap(position.x), y: snap(position.y) };
}

function isWithinBattlefield(position: CardPosition): boolean {
  return (
    position.x >= battlefieldPadding &&
    position.y >= battlefieldPadding &&
    position.x + cardWidth <= window.innerWidth - battlefieldPadding &&
    position.y + cardHeight <= window.innerHeight - zoneTrayHeight - battlefieldPadding
  );
}

function cardRectangle(position: CardPosition): Rectangle {
  return {
    left: position.x,
    top: position.y,
    right: position.x + cardWidth,
    bottom: position.y + cardHeight,
  };
}

function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

function getActionObjectIds({
  selectedObjectIds,
  hoveredObjectId,
  fallbackObjectId,
}: {
  selectedObjectIds: string[];
  hoveredObjectId: string | null;
  fallbackObjectId?: string;
}): string[] {
  if (selectedObjectIds.length > 0) return selectedObjectIds;
  if (fallbackObjectId) return [fallbackObjectId];
  if (hoveredObjectId) return [hoveredObjectId];
  return [];
}

function createSeedGame(): GameState {
  return createGame({
    players: [
      {
        id: "p1",
        name: "Player",
        library: ["Brainstorm", "Ponder", "Counterspell", "Island"],
        hand: ["Swords to Plowshares", "Mystic Remora", "Arcane Signet"],
        battlefield: [
          "Sol Ring",
          "Island",
          "Command Tower",
          "Llanowar Elves",
          "Lightning Greaves",
          "Rhystic Study",
        ],
        graveyard: ["Opt"],
        exile: ["Path to Exile"],
        command: ["Atraxa, Praetors' Voice"],
      },
    ],
  });
}

function defaultPositions(objects: GameObject[]): PositionMap {
  return Object.fromEntries(
    objects.map((object, index) => [
      object.objectId,
      {
        x: 56 + (index % 4) * 164,
        y: 72 + Math.floor(index / 4) * 224,
      },
    ]),
  );
}

function parseCardTargetId(targetId: unknown): string | null {
  if (typeof targetId !== "string" || !targetId.startsWith(cardTargetPrefix)) return null;
  return targetId.slice(cardTargetPrefix.length);
}

function parseDropTarget(targetId: unknown, playerId: string): DropTarget | null {
  if (typeof targetId !== "string" || !targetId.startsWith("zone:")) return null;
  const zone = targetId.slice("zone:".length) as SimZone;
  if (zone === "hand" || zone === "library" || zone === "graveyard") return { zone, playerId };
  if (zone === "battlefield" || zone === "exile" || zone === "command" || zone === "stack") {
    return { zone };
  }
  return null;
}

function toZoneRef(target: DropTarget): ZoneRef {
  return target.playerId ? { zone: target.zone, playerId: target.playerId } : { zone: target.zone };
}

function sameTarget(a: DropTarget, b: DropTarget): boolean {
  return a.zone === b.zone && a.playerId === b.playerId;
}

function findObject(state: GameState, objectId: string): ObjectLocation | null {
  for (const player of state.players) {
    for (const zone of ["library", "hand", "graveyard"] as const) {
      const object = player.zones[zone].objects.find(
        (candidate) => candidate.objectId === objectId,
      );
      if (object) return { object, zone: { zone, playerId: player.id } };
    }
  }

  for (const zone of ["battlefield", "exile", "command", "stack"] as const) {
    const object = state.zones[zone].objects.find((candidate) => candidate.objectId === objectId);
    if (object) return { object, zone: { zone } };
  }

  return null;
}

function zoneObjects(state: GameState, playerId: string, zone: SimZone): GameObject[] {
  if (zone === "library" || zone === "hand" || zone === "graveyard") {
    return state.players.find((player) => player.id === playerId)?.zones[zone].objects ?? [];
  }

  return state.zones[zone].objects;
}

function topCard(objects: GameObject[]): GameObject | undefined {
  return objects.at(-1);
}

function getBattlefieldRect(): DOMRect | undefined {
  return document.querySelector<HTMLElement>(".battlefield")?.getBoundingClientRect();
}

function moveIdsBefore(ids: string[], movedIds: string[], targetId: string): string[] {
  const movedIdSet = new Set(movedIds);
  if (movedIdSet.has(targetId)) return ids;

  const remainingIds = ids.filter((id) => !movedIdSet.has(id));
  const targetIndex = remainingIds.indexOf(targetId);
  if (targetIndex < 0) return ids;

  return [
    ...remainingIds.slice(0, targetIndex),
    ...ids.filter((id) => movedIdSet.has(id)),
    ...remainingIds.slice(targetIndex),
  ];
}

export function App() {
  const [game, setGame] = useState(createSeedGame);
  const player = game.players[0]!;
  const battlefieldObjects = game.zones.battlefield.objects;
  const [positions, setPositions] = useState(() => defaultPositions(battlefieldObjects));
  const [cardOrder] = useState(() => battlefieldObjects.map((object) => object.objectId));
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const zIndexByObjectId = useMemo(
    () => new Map(cardOrder.map((objectId, index) => [objectId, index + 1])),
    [cardOrder],
  );

  const toggleActionCardsTapped = useCallback((fallbackObjectId?: string) => {
    const { selectedObjectIds, hoveredObjectId } = useSimUiStore.getState();
    const objectIds = getActionObjectIds({
      selectedObjectIds,
      hoveredObjectId,
      fallbackObjectId,
    });

    setGame((currentGame) => {
      let nextGame = currentGame;

      for (const objectId of objectIds) {
        const found = findObject(nextGame, objectId);
        if (!found || found.zone.zone !== "battlefield") continue;

        nextGame = applyCommand(nextGame, {
          type: "object.setStatus",
          objectId,
          status: { tapped: !found.object.status.tapped },
        }).state;
      }

      return nextGame;
    });
  }, []);

  useHotkey(
    "T",
    () => {
      if (useSimUiStore.getState().draggedObjectId !== null) return;
      toggleActionCardsTapped();
    },
    { preventDefault: true },
  );

  function handleBattlefieldMove(objectId: string, delta: CardPosition) {
    const { selectedObjectIds } = useSimUiStore.getState();
    setPositions((currentPositions) => {
      const movedObjectIds = selectedObjectIds.includes(objectId) ? selectedObjectIds : [objectId];
      const nextPositions = Object.fromEntries(
        movedObjectIds.map((movedObjectId) => {
          const current = currentPositions[movedObjectId] ?? { x: 0, y: 0 };
          return [movedObjectId, snapPosition({ x: current.x + delta.x, y: current.y + delta.y })];
        }),
      ) as PositionMap;

      if (Object.values(nextPositions).some((position) => !isWithinBattlefield(position))) {
        return currentPositions;
      }

      return {
        ...currentPositions,
        ...nextPositions,
      };
    });
  }

  function handleHandReorder(objectId: string, targetObjectId: string, playerId: string) {
    const { selectedObjectIds } = useSimUiStore.getState();
    const handObjectIds = player.zones.hand.objects.map((object) => object.objectId);
    const movedObjectIds = selectedObjectIds.includes(objectId)
      ? selectedObjectIds.filter((selectedObjectId) => handObjectIds.includes(selectedObjectId))
      : [objectId];
    if (movedObjectIds.length === 0) return;

    const nextObjectIds = moveIdsBefore(handObjectIds, movedObjectIds, targetObjectId);
    if (nextObjectIds === handObjectIds) return;

    setGame(
      applyCommand(game, {
        type: "zone.reorder",
        zone: { zone: "hand", playerId },
        objectIds: nextObjectIds,
      }).state,
    );
  }

  function handleZoneMove(
    objectId: string,
    target: DropTarget,
    dropPosition: CardPosition,
    insertIndex?: number,
  ) {
    const { selectedObjectIds, setHoveredObjectId, setSelectedObjectIds } =
      useSimUiStore.getState();
    const movedObjectIds = selectedObjectIds.includes(objectId) ? selectedObjectIds : [objectId];
    if (target.zone === "battlefield") {
      const nextPositions = movedObjectIds.map((_, index) =>
        snapPosition({
          x: dropPosition.x + index * gridSize,
          y: dropPosition.y + index * gridSize,
        }),
      );
      if (nextPositions.some((position) => !isWithinBattlefield(position))) return;
    }

    let nextGame = game;

    for (const [index, movedObjectId] of movedObjectIds.entries()) {
      if (!findObject(nextGame, movedObjectId)) continue;
      nextGame = applyCommand(nextGame, {
        type: "object.move",
        objectId: movedObjectId,
        to: toZoneRef(target),
        insertIndex: insertIndex === undefined ? undefined : insertIndex + index,
      }).state;
    }

    setGame(nextGame);

    setSelectedObjectIds([]);
    setHoveredObjectId(null);

    if (target.zone !== "battlefield") {
      setPositions((currentPositions) => {
        const nextPositions = { ...currentPositions };
        for (const movedObjectId of movedObjectIds) delete nextPositions[movedObjectId];
        return nextPositions;
      });
      return;
    }

    setPositions((currentPositions) => {
      const nextPositions = { ...currentPositions };
      const missingObjects = nextGame.zones.battlefield.objects.filter(
        (object) => nextPositions[object.objectId] === undefined,
      );
      for (const movedObjectId of movedObjectIds) delete nextPositions[movedObjectId];
      missingObjects.forEach((object, index) => {
        nextPositions[object.objectId] = snapPosition({
          x: dropPosition.x + index * gridSize,
          y: dropPosition.y + index * gridSize,
        });
      });
      return nextPositions;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const objectId = event.operation.source?.id;
    if (event.canceled || typeof objectId !== "string") {
      clearDragState();
      return;
    }

    const found = findObject(game, objectId);
    if (!found) {
      clearDragState();
      return;
    }

    const { x, y } = event.operation.transform;
    const sourceElement = event.operation.source?.element;
    const targetElement = event.operation.target?.element;
    const sourceRect = sourceElement?.getBoundingClientRect();
    const targetRect = targetElement?.getBoundingClientRect();
    const battlefieldRect = getBattlefieldRect();
    const battlefieldDropPosition = sourceRect
      ? snapPosition({
          x: sourceRect.left - (battlefieldRect?.left ?? 0),
          y: sourceRect.top - (battlefieldRect?.top ?? 0),
        })
      : { x: 24, y: 24 };
    const zoneDropPosition = sourceRect
      ? snapPosition({
          x: sourceRect.left - (targetRect?.left ?? 0),
          y: sourceRect.top - (targetRect?.top ?? 0),
        })
      : { x: 24, y: 24 };
    const targetObjectId = parseCardTargetId(event.operation.target?.id);

    if (targetObjectId) {
      const targetFound = findObject(game, targetObjectId);
      if (targetFound?.zone.zone === "hand" && targetFound.zone.playerId) {
        const targetIndex = player.zones.hand.objects.findIndex(
          (object) => object.objectId === targetObjectId,
        );
        if (found.zone.zone === "hand" && found.zone.playerId === targetFound.zone.playerId) {
          handleHandReorder(objectId, targetObjectId, targetFound.zone.playerId);
        } else {
          handleZoneMove(
            objectId,
            { zone: "hand", playerId: targetFound.zone.playerId },
            battlefieldDropPosition,
            Math.max(0, targetIndex),
          );
        }
        clearDragState();
        return;
      }

      if (targetFound?.zone.zone === "battlefield") {
        if (found.zone.zone === "battlefield") handleBattlefieldMove(objectId, { x, y });
        else handleZoneMove(objectId, { zone: "battlefield" }, battlefieldDropPosition);
        clearDragState();
        return;
      }
    }

    const target = parseDropTarget(event.operation.target?.id, player.id);

    if (!target) {
      if (found.zone.zone === "battlefield") handleBattlefieldMove(objectId, { x, y });
      clearDragState();
      return;
    }

    if (sameTarget(found.zone, target)) {
      if (target.zone === "battlefield") handleBattlefieldMove(objectId, { x, y });
      clearDragState();
      return;
    }

    handleZoneMove(objectId, target, zoneDropPosition);
    clearDragState();
  }

  function clearDragState() {
    useSimUiStore.getState().clearDrag();
  }

  function handleDragMove(event: DragMoveEvent) {
    const objectId = event.operation.source?.id;
    const { selectedObjectIds, setDragOffset } = useSimUiStore.getState();
    if (
      typeof objectId !== "string" ||
      selectedObjectIds.length < 2 ||
      !selectedObjectIds.includes(objectId)
    ) {
      return;
    }

    setDragOffset(event.operation.transform);
  }

  function getBattlefieldPoint(event: PointerEvent<HTMLElement>): CardPosition {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleBattlefieldPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary || event.target !== event.currentTarget) return;

    const point = getBattlefieldPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectionBox({ start: point, current: point });
  }

  function handleBattlefieldPointerMove(event: PointerEvent<HTMLElement>) {
    if (!selectionBox) return;

    const point = getBattlefieldPoint(event);

    setSelectionBox((currentBox) => (currentBox ? { ...currentBox, current: point } : null));
  }

  function handleBattlefieldPointerUp(event: PointerEvent<HTMLElement>) {
    if (!selectionBox) return;

    const box = toRectangle(selectionBox);
    event.currentTarget.releasePointerCapture(event.pointerId);
    setSelectionBox(null);

    if (box.right - box.left < 4 && box.bottom - box.top < 4) {
      useSimUiStore.getState().clearSelection();
      return;
    }

    useSimUiStore
      .getState()
      .setSelectedObjectIds(
        battlefieldObjects
          .filter((object) =>
            intersects(box, cardRectangle(positions[object.objectId] ?? { x: 24, y: 24 })),
          )
          .map((object) => object.objectId),
      );
  }

  return (
    <DragDropProvider
      plugins={(plugins) => [
        ...plugins.filter((plugin) => plugin !== Feedback),
        Feedback.configure({ dropAnimation: null }),
      ]}
      onDragStart={(event) => {
        const objectId = event.operation.source?.id;
        if (typeof objectId !== "string") return;
        useSimUiStore.getState().startDrag(objectId);
      }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <main className="sim-table">
        <DropZone
          target={{ zone: "battlefield" }}
          className="battlefield"
          onPointerDown={handleBattlefieldPointerDown}
          onPointerMove={handleBattlefieldPointerMove}
          onPointerUp={handleBattlefieldPointerUp}
          onPointerCancel={handleBattlefieldPointerUp}
        >
          {selectionBox ? <SelectionMarquee box={selectionBox} /> : null}
          {battlefieldObjects.map((object) => (
            <BattlefieldCard
              key={object.objectId}
              object={object}
              position={positions[object.objectId] ?? { x: 24, y: 24 }}
              zIndex={zIndexByObjectId.get(object.objectId) ?? 1}
              onToggleTapped={toggleActionCardsTapped}
            />
          ))}
        </DropZone>

        <aside className="zone-tray">
          <HandZone
            target={{ zone: "hand", playerId: player.id }}
            count={player.zones.hand.objects.length}
          >
            {player.zones.hand.objects.map((object) => (
              <Card
                key={object.objectId}
                object={object}
                onToggleTapped={toggleActionCardsTapped}
              />
            ))}
          </HandZone>

          {pileZones.map((zone) => {
            const target: DropTarget =
              zone === "library" || zone === "graveyard" ? { zone, playerId: player.id } : { zone };
            const objects = zoneObjects(game, player.id, zone);
            const topObject = topCard(objects);

            return (
              <PileZone key={zone} target={target} label={zone} count={objects.length}>
                {topObject ? (
                  <Card
                    key={topObject.objectId}
                    object={topObject}
                    isFaceDown={zone === "library"}
                    onToggleTapped={toggleActionCardsTapped}
                  />
                ) : null}
              </PileZone>
            );
          })}
        </aside>
      </main>
    </DragDropProvider>
  );
}
