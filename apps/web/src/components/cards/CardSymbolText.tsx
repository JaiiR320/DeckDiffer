import { useEffect, useReducer } from "react";
import { getCardSymbols, type CardSymbol } from "../../lib/scryfall";

type CardSymbolTextProps = {
  text: string;
  className?: string;
  symbolClassName?: string;
  as?: "span" | "div";
};

type CardTextToken = { key: string; type: "text"; value: string } | { key: string; type: "symbol"; value: string };

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

export function CardSymbolText({
  text,
  className,
  symbolClassName,
  as = "span",
}: CardSymbolTextProps) {
  const [symbols, setSymbols] = useReducer(
    (_current: Map<string, CardSymbol> | null, nextSymbols: Map<string, CardSymbol> | null) =>
      nextSymbols,
    null,
  );
  const hasSymbols = text.includes("{");

  useEffect(() => {
    if (!hasSymbols) {
      return;
    }

    let isCancelled = false;

    getCardSymbols()
      .then((nextSymbols) => {
        if (!isCancelled) {
          setSymbols(nextSymbols);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [hasSymbols]);

  const Component = as;
  const tokens = splitCardSymbolText(text);

  return (
    <Component className={className}>
      {tokens.map((token) => {
        if (token.type === "text") {
          return <span key={token.key}>{token.value}</span>;
        }

        const symbol = symbols?.get(token.value);

        if (!symbol) {
          return <span key={token.key}>{token.value}</span>;
        }

        return (
          <img
            key={token.key}
            src={symbol.svgUri}
            alt={symbol.english}
            title={symbol.english}
            className={symbolClassName}
          />
        );
      })}
    </Component>
  );
}
