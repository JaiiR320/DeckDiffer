import type { CardPrintingOption } from "#/lib/scryfall";

export type PrintingSort = "date" | "set" | "price";

export const PRINTING_SORT_OPTIONS = [
  { value: "date", label: "Edition date" },
  { value: "set", label: "Set Name" },
  { value: "price", label: "Price" },
] satisfies Array<{ value: PrintingSort; label: string }>;

export function sortPrintings(printings: CardPrintingOption[], sort: PrintingSort) {
  return printings.slice().sort((left, right) => {
    if (sort === "set") {
      return (
        left.setName.localeCompare(right.setName) ||
        left.collectorNumber.localeCompare(right.collectorNumber)
      );
    }

    if (sort === "price") {
      const leftPrice = left.priceUsd ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.priceUsd ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice || right.releasedAt.localeCompare(left.releasedAt);
    }

    return (
      right.releasedAt.localeCompare(left.releasedAt) || left.setName.localeCompare(right.setName)
    );
  });
}
