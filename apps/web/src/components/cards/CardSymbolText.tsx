type CardTextToken =
  | { key: string; type: "text"; value: string }
  | { key: string; type: "symbol"; value: string };

const CARD_SYMBOL_PATTERN = /(\{[^}]+\})/;
const CARD_SYMBOL_GLOBAL_PATTERN = new RegExp(CARD_SYMBOL_PATTERN, "g");

export function splitCardSymbolText(text: string): CardTextToken[] {
  const tokens: CardTextToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(CARD_SYMBOL_GLOBAL_PATTERN)) {
    const symbol = match[0];
    const symbolIndex = match.index ?? cursor;

    if (symbolIndex > cursor) {
      tokens.push({ key: `text-${cursor}`, type: "text", value: text.slice(cursor, symbolIndex) });
    }

    tokens.push({ key: `symbol-${symbolIndex}`, type: "symbol", value: symbol });
    cursor = symbolIndex + symbol.length;
  }

  if (cursor < text.length) {
    tokens.push({ key: `text-${cursor}`, type: "text", value: text.slice(cursor) });
  }

  return tokens;
}
