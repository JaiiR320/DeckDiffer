import type { CardCategory, DeckCategory } from "#/lib/decklist";
import type { EditorRow } from "../editor/types";

export type CardGroupView = "categories" | "type" | "manaValue";

export const CARD_GROUP_VIEW_OPTIONS = [
  { value: "categories", label: "Categories" },
  { value: "type", label: "Type" },
  { value: "manaValue", label: "Mana value" },
] satisfies Array<{ value: CardGroupView; label: string }>;

type GeneratedGroup = {
  id: CardCategory;
  name: string;
  rows: EditorRow[];
};

const TYPE_GROUPS = [
  { id: "land", name: "Land", match: "Land" },
  { id: "creature", name: "Creature", match: "Creature" },
  { id: "artifact", name: "Artifact", match: "Artifact" },
  { id: "enchantment", name: "Enchantment", match: "Enchantment" },
  { id: "instant", name: "Instant", match: "Instant" },
  { id: "sorcery", name: "Sorcery", match: "Sorcery" },
  { id: "planeswalker", name: "Planeswalker", match: "Planeswalker" },
  { id: "battle", name: "Battle", match: "Battle" },
] as const;

export function buildGeneratedCardGroups({
  categories,
  groupView,
  rows,
}: {
  categories: DeckCategory[];
  groupView: Exclude<CardGroupView, "categories">;
  rows: EditorRow[];
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const inDeckRows = rows.filter((row) => categoryById.get(row.category)?.includeInDeck !== false);
  const groups = groupView === "manaValue" ? groupByManaValue(inDeckRows) : groupByType(inDeckRows);
  const generatedCategories: DeckCategory[] = groups.map((group) => ({
    id: group.id,
    name: group.name,
    kind: "custom",
  }));
  const groupedRows = Object.fromEntries(groups.map((group) => [group.id, group.rows])) as Record<
    CardCategory,
    EditorRow[]
  >;

  return {
    categories: generatedCategories,
    groupedRows,
    lanes: groups.map((group) => [group.id]),
  };
}

function groupByManaValue(rows: EditorRow[]): GeneratedGroup[] {
  const maxManaValue = rows.reduce(
    (max, row) => Math.max(max, normalizeManaValue(row.manaValue)),
    0,
  );

  return Array.from({ length: maxManaValue + 1 }, (_, manaValue) => {
    const id = generatedGroupId("mana-value", String(manaValue));
    return {
      id,
      name: `MV ${manaValue}`,
      rows: rows.filter((row) => normalizeManaValue(row.manaValue) === manaValue),
    };
  });
}

function groupByType(rows: EditorRow[]): GeneratedGroup[] {
  const rowsByGroup = new Map<CardCategory, EditorRow[]>();

  for (const row of rows) {
    const group = getPrimaryTypeGroup(row.typeLine);
    const id = generatedGroupId("type", group.id);
    const groupRows = rowsByGroup.get(id) ?? [];
    groupRows.push(row);
    rowsByGroup.set(id, groupRows);
  }

  return [
    ...TYPE_GROUPS.map((group) => ({
      id: generatedGroupId("type", group.id),
      name: group.name,
      rows: rowsByGroup.get(generatedGroupId("type", group.id)) ?? [],
    })),
    {
      id: generatedGroupId("type", "other"),
      name: "Other",
      rows: rowsByGroup.get(generatedGroupId("type", "other")) ?? [],
    },
  ].filter((group) => group.rows.length > 0);
}

function getPrimaryTypeGroup(typeLine: string) {
  for (const group of TYPE_GROUPS) {
    if (hasTypeWord(typeLine, group.match)) {
      return group;
    }
  }

  return { id: "other", name: "Other" };
}

function hasTypeWord(typeLine: string, type: string) {
  return new RegExp(`(^|[^A-Za-z])${type}([^A-Za-z]|$)`).test(typeLine);
}

function normalizeManaValue(manaValue: number) {
  return Math.max(0, Math.floor(Number.isFinite(manaValue) ? manaValue : 0));
}

function generatedGroupId(kind: string, value: string) {
  return `__group:${kind}:${value}`;
}
