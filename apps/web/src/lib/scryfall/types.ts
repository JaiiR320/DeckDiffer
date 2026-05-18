import type { getCardCategory } from "../decklist";

export type ScryfallCard = {
  name: string;
  oracle_id: string | null;
  id: string;
  type_line: string;
  cmc?: number;
  set: string;
  set_name?: string;
  collector_number: string;
  released_at?: string;
  mana_cost?: string;
  oracle_text?: string;
  produced_mana?: string[];
  edhrec_rank?: number | null;
  prices?: {
    usd?: string | null;
  };
  image_uris?: {
    small?: string;
    normal?: string;
  };
  card_faces?: Array<{
    name?: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    image_uris?: {
      small?: string;
      normal?: string;
    };
  }>;
};

export type ScryfallCollectionResponse = {
  data: ScryfallCard[];
  not_found?: Array<{ name?: string }>;
};

export type ScryfallSearchResponse = {
  data: ScryfallCard[];
};

export type ScryfallAutocompleteResponse = {
  data: string[];
};

export type ScryfallRuling = {
  object: "ruling";
  oracle_id: string;
  source: "wotc" | "scryfall";
  published_at: string;
  comment: string;
};

export type ScryfallListResponse<T> = {
  object: "list";
  has_more: boolean;
  next_page?: string | null;
  warnings?: string[] | null;
  data: T[];
};

export type ScryfallJudgeCard = Record<string, unknown> & {
  object?: unknown;
  id?: unknown;
  name: string;
  layout?: unknown;
  mana_cost?: unknown;
  cmc?: unknown;
  type_line?: unknown;
  oracle_text?: unknown;
  colors?: unknown;
  card_faces?: unknown;
  color_identity?: unknown;
  keywords?: unknown;
  legalities?: unknown;
  rulings_uri?: string;
};

type JudgeCardFace = {
  object: string | null;
  name: string | null;
  mana_cost: string | null;
  type_line: string | null;
  oracle_text: string | null;
  colors: string[] | null;
  color_indicator: string[] | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  defense: string | null;
};

export type JudgeCardContext = {
  object: string | null;
  id: string | null;
  name: string;
  layout: string | null;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  oracle_text: string | null;
  colors: string[] | null;
  card_faces: JudgeCardFace[] | null;
  color_identity: string[] | null;
  keywords: string[] | null;
  legalities: Record<string, string> | null;
  rulings: ScryfallRuling[];
};

export type UnresolvedJudgeCardReference = {
  name: string;
  suggestions: string[];
};

type ScryfallSymbol = {
  symbol: string;
  english: string;
  svg_uri: string;
};

export type ScryfallSymbologyResponse = {
  data: ScryfallSymbol[];
};

export type ScryfallErrorResponse = {
  object: "error";
  details: string;
};

export type SearchCardResult = {
  oracleId: string;
  name: string;
  typeLine: string;
  category: ReturnType<typeof getCardCategory>;
  categoryId: string;
  manaCost?: string;
  manaValue: number;
  producedMana?: string[];
  setCode?: string;
  collectorNumber?: string;
  smallImageUrl?: string;
  imageUrl?: string;
  faces?: CardPreviewFace[];
  priceUsd?: number;
  edhrecRank?: number | null;
};

export type CardPreviewLookup = {
  name: string;
  setCode?: string;
  collectorNumber?: string;
};

export type CardPreviewFace = {
  name: string;
  typeLine: string;
  manaCost?: string;
  oracleText?: string;
  smallImageUrl: string;
  imageUrl: string;
};

export type CardPreviewResult = {
  name: string;
  typeLine: string;
  manaCost?: string;
  oracleText?: string;
  setCode?: string;
  collectorNumber?: string;
  producedMana?: string[];
  manaValue?: number;
  smallImageUrl: string;
  imageUrl: string;
  priceUsd?: number;
  edhrecRank?: number | null;
  faces?: CardPreviewFace[];
};

export type CardPrintingOption = {
  scryfallId: string;
  oracleId: string;
  name: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  releasedAt: string;
  manaCost?: string;
  producedMana?: string[];
  priceUsd?: number;
  edhrecRank?: number | null;
  smallImageUrl?: string;
  imageUrl?: string;
  faces?: CardPreviewFace[];
};

export type CardSymbol = {
  symbol: string;
  english: string;
  svgUri: string;
};
