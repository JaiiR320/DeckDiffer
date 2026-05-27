import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createOpencodeClient } from "@opencode-ai/sdk";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { auth } from "#/lib/auth";

const TAGGER_CACHE_DIR_CANDIDATES = [
  resolve(process.cwd(), "data/tagger"),
  resolve(process.cwd(), "../../data/tagger"),
];
const DEFAULT_OPENCODE_BASE_URL = "http://localhost:4096";
const OPENCODE_TIMEOUT_MS = 30000;
const ART_INTENT_WORDS = new Set([
  "art",
  "artwork",
  "illustration",
  "image",
  "picture",
  "depict",
  "depicts",
  "shown",
  "visual",
]);
const CARD_INTENT_WORDS = new Set([
  "card",
  "cards",
  "spell",
  "spells",
  "commander",
  "edh",
  "removal",
  "draw",
  "ramp",
  "counterspell",
  "boardwipe",
]);
const TAG_SYNONYMS: Record<string, string[]> = {
  answer: ["removal"],
  answers: ["removal"],
  destroy: ["removal", "removal-destroy"],
  draw: ["draw", "pure-draw", "burst-draw", "draw-engine"],
  kill: ["removal", "spot-removal", "removal-destroy"],
  kills: ["removal", "spot-removal", "removal-destroy"],
  mana: ["ramp"],
  ramp: ["ramp", "land-ramp"],
  squirrel: ["squirrel"],
  squirrels: ["squirrel"],
  token: ["token", "creature-token"],
  tokens: ["token", "creature-token"],
  treasure: ["treasure", "treasures"],
  treasures: ["treasure", "treasures"],
  wipe: ["sweeper"],
  wipes: ["sweeper"],
};

const generatedQueryInputSchema = z.object({
  prompt: z.string().trim().min(1),
});

const generatedQuerySchema = z.object({
  query: z.string().trim().min(1),
  selectedTags: z.array(
    z.object({
      slug: z.string().trim().min(1),
      operator: z.enum(["art", "otag"]),
      reason: z.string().trim().min(1),
    }),
  ),
  explanation: z.string().trim().min(1),
  warnings: z.array(z.string()).default([]),
});

const tagSearchPlanSchema = z.object({
  searches: z
    .array(
      z.object({
        text: z.string().trim().min(1),
        namespace: z.enum(["artwork", "card", "any"]),
        reason: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type TagRecord = {
  id: string;
  name: string;
  slug: string;
  namespace: string;
  type: string;
  description: string | null;
  taggingCount: number;
  status: string;
  category: boolean;
  hasExemplaryTagging: boolean;
  createdAt: string;
  queryOperator: "art" | "otag" | null;
};

export type TaggerManifest = {
  fetchedAt: string;
  pageCount: number;
  tagCount: number;
  source: string;
  pageDelayMs: number;
};

export type GeneratedScryfallQuery = z.infer<typeof generatedQuerySchema> & {
  candidates: TagRecord[];
};

type TagSearchPlan = z.infer<typeof tagSearchPlanSchema>;

let cachedTags: TagRecord[] | null = null;
let cachedManifest: TaggerManifest | null = null;

async function requireUserId() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

async function readJsonFile<T>(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function getTaggerCacheDir() {
  const directories = await Promise.all(
    TAGGER_CACHE_DIR_CANDIDATES.map(async (directory) => {
      try {
        await Promise.all([
          access(resolve(directory, "tags.json")),
          access(resolve(directory, "manifest.json")),
        ]);
        return directory;
      } catch {
        return null;
      }
    }),
  );

  for (const directory of directories) {
    if (directory) {
      return directory;
    }
  }

  throw new Error(
    `Could not find local Tagger cache. Checked: ${TAGGER_CACHE_DIR_CANDIDATES.join(", ")}`,
  );
}

async function loadLocalTaggerCache() {
  if (cachedTags && cachedManifest) {
    return { tags: cachedTags, manifest: cachedManifest };
  }

  try {
    const cacheDir = await getTaggerCacheDir();
    const [tags, manifest] = await Promise.all([
      readJsonFile<TagRecord[]>(resolve(cacheDir, "tags.json")),
      readJsonFile<TaggerManifest>(resolve(cacheDir, "manifest.json")),
    ]);
    cachedTags = tags;
    cachedManifest = manifest;
    return { tags, manifest };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not load local Tagger cache. Run pnpm tagger:fetch first. ${error.message}`
        : "Could not load local Tagger cache. Run pnpm tagger:fetch first.",
    );
  }
}

function normalizeText(value: string) {
  return value.toLowerCase();
}

function tokenize(value: string) {
  const baseTokens = normalizeText(value)
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  const tokens = new Set<string>();
  for (const token of baseTokens) {
    tokens.add(token);
    for (const synonym of TAG_SYNONYMS[token] ?? []) tokens.add(synonym);
    if (token.endsWith("ies") && token.length > 4) tokens.add(`${token.slice(0, -3)}y`);
    if (token.endsWith("es") && token.length > 4) tokens.add(token.slice(0, -2));
    if (token.endsWith("s") && token.length > 3) tokens.add(token.slice(0, -1));
  }

  return [...tokens];
}

function getPromptIntent(tokens: string[]) {
  const tokenSet = new Set(tokens);
  return {
    wantsArt: [...ART_INTENT_WORDS].some((word) => tokenSet.has(word)),
    wantsCard: [...CARD_INTENT_WORDS].some((word) => tokenSet.has(word)),
  };
}

function scoreTag(
  tag: TagRecord,
  prompt: string,
  tokens: string[],
  intent: ReturnType<typeof getPromptIntent>,
) {
  const name = normalizeText(tag.name);
  const slug = normalizeText(tag.slug);
  const description = normalizeText(tag.description ?? "");
  const normalizedPrompt = normalizeText(prompt);
  const searchableText = `${slug} ${name} ${description}`;
  let score = 0;

  if (name === normalizedPrompt || slug === normalizedPrompt) score += 100;
  if (normalizedPrompt.includes(name) || normalizedPrompt.includes(slug)) score += 55;

  for (const token of tokens) {
    if (slug === token || name === token) score += 70;
    else if (slug.startsWith(token) || name.startsWith(token)) score += 35;
    else if (searchableText.indexOf(token) !== -1) score += 18;
    else if (description.includes(token)) score += 8;
  }

  if (tag.queryOperator) score += 10;
  if (intent.wantsArt && tag.queryOperator === "art") score += 30;
  if (intent.wantsCard && tag.queryOperator === "otag") score += 30;
  if (intent.wantsArt && tag.queryOperator === "otag" && !intent.wantsCard) score -= 15;
  if (intent.wantsCard && tag.queryOperator === "art" && !intent.wantsArt) score -= 15;
  if (tag.category) score -= 5;
  score += Math.log10(tag.taggingCount + 1);

  return score;
}

function findCandidates(tags: TagRecord[], prompt: string, limit = 30) {
  const tokens = tokenize(prompt).slice(0, 16);
  if (tokens.length === 0) return [] as TagRecord[];
  const intent = getPromptIntent(tokens);

  const scoredTags = tags.flatMap((tag) => {
    const score = scoreTag(tag, prompt, tokens, intent);
    return score > 0 ? [{ tag, score }] : [];
  });

  return scoredTags
    .sort((a, b) => b.score - a.score || b.tag.taggingCount - a.tag.taggingCount)
    .slice(0, limit)
    .map((item) => item.tag);
}

function dedupeTags(tags: TagRecord[]) {
  const tagById = new Map<string, TagRecord>();
  for (const tag of tags) tagById.set(tag.id, tag);
  return [...tagById.values()];
}

function findCandidatesForSearchPlan(tags: TagRecord[], plan: TagSearchPlan, limit = 50) {
  const candidates = plan.searches.flatMap((search) => {
    const namespace = search.namespace === "any" ? "all" : search.namespace;
    return findCandidates(
      tags.filter((tag) => namespace === "all" || tag.namespace === namespace),
      search.text,
      Math.max(15, Math.ceil(limit / plan.searches.length)),
    );
  });

  return dedupeTags(candidates)
    .filter((tag) => tag.queryOperator)
    .sort((a, b) => b.taggingCount - a.taggingCount)
    .slice(0, limit);
}

function getOpenCodeClient() {
  return createOpencodeClient({
    baseUrl: process.env.OPENCODE_BASE_URL?.trim() || DEFAULT_OPENCODE_BASE_URL,
    throwOnError: true,
    fetch: async (request) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OPENCODE_TIMEOUT_MS);
      try {
        return await fetch(request, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

async function assertOpenCodeReady() {
  const baseUrl = process.env.OPENCODE_BASE_URL?.trim() || DEFAULT_OPENCODE_BASE_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/global/health`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`OpenCode health check failed: ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `OpenCode server is not reachable at ${baseUrl}. ${error.message}`
        : `OpenCode server is not reachable at ${baseUrl}.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getOpenCodeModel() {
  const configuredModel = process.env.OPENCODE_SEARCH_MODEL?.trim();
  if (!configuredModel) return undefined;

  const [providerID, ...modelParts] = configuredModel.replace(/^opencode\//, "").split("/");
  const modelID = modelParts.join("/");
  return providerID && modelID ? { providerID, modelID } : undefined;
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  return trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? trimmed;
}

function parseGeneratedQuery(text: string) {
  return generatedQuerySchema.parse(JSON.parse(extractJsonObject(text)));
}

function parseTagSearchPlan(text: string) {
  return tagSearchPlanSchema.parse(JSON.parse(extractJsonObject(text)));
}

async function promptOpenCodeJson(system: string, payload: unknown) {
  await assertOpenCodeReady();
  const client = getOpenCodeClient();
  const session = await client.session.create({
    body: { title: "DeckDiff Scryfall Search" },
  });

  if (!session.data) throw new Error("OpenCode did not create a session.");

  const model = getOpenCodeModel();
  const response = await client.session.prompt({
    path: { id: session.data.id },
    body: {
      ...(model ? { model } : {}),
      system,
      tools: {},
      parts: [{ type: "text", text: JSON.stringify(payload) }],
    },
  });

  if (!response.data) throw new Error("OpenCode returned an empty response.");

  const text = response.data.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();

  if (!text) throw new Error("OpenCode returned an empty response.");
  return text;
}

async function getAgentTagSearchPlan(prompt: string) {
  const responseText = await promptOpenCodeJson(
    `You find Scryfall Tagger glossary search terms from natural language.
Return JSON only with this exact shape:
{
  "searches": [{ "text": string, "namespace": "artwork" | "card" | "any", "reason": string }]
}

Rules:
- You are not generating the final Scryfall query yet.
- Produce concise search terms likely to match Tagger tag names, slugs, or descriptions.
- Use namespace "artwork" for visual/art requests.
- Use namespace "card" for gameplay/function requests.
- Use namespace "any" only if the request is ambiguous.
- Include synonyms when useful: removal, spot removal, sweeper, draw, ramp, token, treasure, graveyard.
- Return 2 to 8 searches.
- Return valid JSON only.`,
    { request: prompt },
  );

  return parseTagSearchPlan(responseText);
}

function validateGeneratedQuery(
  generated: z.infer<typeof generatedQuerySchema>,
  candidates: TagRecord[],
) {
  const queryableCandidateBySlug = new Map<string, TagRecord>();
  for (const candidate of candidates) {
    if (candidate.queryOperator === "art" || candidate.queryOperator === "otag") {
      queryableCandidateBySlug.set(candidate.slug, candidate);
    }
  }

  const queryParts = new Set<string>();
  for (const part of generated.query.split(/[\s()]+/)) {
    if (part) queryParts.add(part);
  }

  for (const selectedTag of generated.selectedTags) {
    const candidate = queryableCandidateBySlug.get(selectedTag.slug);
    if (!candidate) {
      throw new Error(`Model selected unknown or non-queryable tag: ${selectedTag.slug}`);
    }

    if (candidate.queryOperator !== selectedTag.operator) {
      throw new Error(`Model used ${selectedTag.operator} for ${selectedTag.slug}.`);
    }

    const expectedClause = `${selectedTag.operator}:${selectedTag.slug}`;
    if (!queryParts.has(expectedClause)) {
      throw new Error(`Generated query is missing selected tag clause ${expectedClause}.`);
    }
  }
}

export const generateScryfallQuery = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => generatedQueryInputSchema.parse(data))
  .handler(async ({ data }) => {
    const [, cache, plan] = await Promise.all([
      requireUserId(),
      loadLocalTaggerCache(),
      getAgentTagSearchPlan(data.prompt),
    ]);
    const { tags } = cache;
    const candidates = findCandidatesForSearchPlan(tags, plan, 50);

    if (candidates.length === 0) {
      throw new Error("No queryable candidate tags found.");
    }

    const responseText = await promptOpenCodeJson(
      `You generate Scryfall card search queries from natural language.
Return JSON only with this exact shape:
{
  "query": string,
  "selectedTags": [{ "slug": string, "operator": "art" | "otag", "reason": string }],
  "explanation": string,
  "warnings": string[]
}

Rules:
- Use only candidate tags provided by the user message.
- Do not invent tag slugs.
- Use artwork tags as art:<slug>.
- Use card/function tags as otag:<slug>.
- Do not use print tags or tags with null operators.
- If the request asks about what appears in art, strongly prefer art tags.
- If the request asks about what a card does, strongly prefer otag tags.
- Use one to four tag clauses unless the user clearly asks for many concepts.
- You may add normal Scryfall syntax such as legal:commander, type filters, colors, or mana value if directly requested.
- Prefer a concise query the user can paste into Scryfall.
- If tags are weak matches, still produce the best query and explain uncertainty in warnings.`,
      {
        request: data.prompt,
        tagSearchPlan: plan,
        candidates: candidates.map((tag) => ({
          name: tag.name,
          slug: tag.slug,
          namespace: tag.namespace,
          description: tag.description,
          taggingCount: tag.taggingCount,
          operator: tag.queryOperator,
        })),
      },
    );

    const generated = parseGeneratedQuery(responseText);
    validateGeneratedQuery(generated, candidates);

    return {
      ...generated,
      candidates,
    } satisfies GeneratedScryfallQuery;
  });
