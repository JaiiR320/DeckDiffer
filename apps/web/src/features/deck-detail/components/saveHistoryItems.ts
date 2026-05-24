import type { DeckSave } from "#/lib/deck";

export type SaveHistoryItem =
  | { kind: "save"; save: DeckSave }
  | { count: number; id: string; kind: "collapsed" };

export function isAutoSaveLabel(label: string) {
  return /^Save #\d+$/.test(label);
}

export function groupSaveHistoryItems(
  savesNewestFirst: DeckSave[],
  collapseUnnamed: boolean,
): SaveHistoryItem[] {
  if (!collapseUnnamed) {
    return savesNewestFirst.map((save) => ({ kind: "save", save }));
  }

  const items: SaveHistoryItem[] = [];
  let collapsedRun: DeckSave[] = [];

  function flushCollapsedRun() {
    if (collapsedRun.length === 0) return;
    items.push({
      count: collapsedRun.length,
      id: `collapsed-${collapsedRun[0].id}-${collapsedRun.length}`,
      kind: "collapsed",
    });
    collapsedRun = [];
  }

  for (const save of savesNewestFirst) {
    if (isAutoSaveLabel(save.label)) {
      collapsedRun.push(save);
      continue;
    }

    flushCollapsedRun();
    items.push({ kind: "save", save });
  }

  flushCollapsedRun();
  return items;
}
