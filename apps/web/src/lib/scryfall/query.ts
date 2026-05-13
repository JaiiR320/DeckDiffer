export function normalizeCardQuery(query: string) {
  return query
    .replace(/\s*\/\/\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCollectionLookupName(name: string) {
  const normalizedName = normalizeCardQuery(name);
  return normalizedName.includes("//")
    ? (normalizedName.split("//")[0]?.trim() ?? normalizedName)
    : normalizedName;
}
