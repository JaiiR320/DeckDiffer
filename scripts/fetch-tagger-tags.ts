import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TAGGER_HOME_URL = "https://tagger.scryfall.com/";
const TAGGER_GRAPHQL_URL = "https://tagger.scryfall.com/graphql";
const OUTPUT_DIR = "data/tagger";
const RAW_PAGE_DIR = join(OUTPUT_DIR, "raw/pages");
const PAGE_DELAY_MS = Number(process.env.TAGGER_PAGE_DELAY_MS ?? 1500);

type TaggerTag = {
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
};

type TaggerPage = {
  page: number;
  perPage: number;
  results: TaggerTag[];
  total: number;
};

type TaggerGraphqlResponse = {
  data?: {
    tags?: TaggerPage;
  };
  errors?: Array<{ message?: string }>;
};

type TagRecord = {
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

function getCsrfToken(html: string) {
  return html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i)?.[1] ?? null;
}

function getSetCookies(headers: Headers) {
  const cookieHeaders = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  if (cookieHeaders?.length) {
    return cookieHeaders;
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function getCookieHeader(headers: Headers) {
  return getSetCookies(headers)
    .flatMap((cookie) => {
      const value = cookie.split(";")[0]?.trim();
      return value ? [value] : [];
    })
    .join("; ");
}

function getQueryOperator(namespace: string) {
  if (namespace === "artwork") return "art";
  if (namespace === "card") return "otag";
  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toTagRecord(tag: TaggerTag): TagRecord {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    namespace: tag.namespace,
    type: tag.type,
    description: tag.description,
    taggingCount: tag.taggingCount ?? 0,
    status: tag.status,
    category: tag.category,
    hasExemplaryTagging: tag.hasExemplaryTagging,
    createdAt: tag.createdAt,
    queryOperator: getQueryOperator(tag.namespace),
  };
}

async function getTaggerSession() {
  const response = await fetch(TAGGER_HOME_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "DeckDiff/0.1 (local Tagger cache script)",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not load Tagger home page: ${response.status}`);
  }

  const html = await response.text();
  const csrfToken = getCsrfToken(html);
  if (!csrfToken) {
    throw new Error("Could not find Tagger CSRF token.");
  }

  return {
    csrfToken,
    cookieHeader: getCookieHeader(response.headers),
  };
}

async function fetchTaggerPage(page: number, csrfToken: string, cookieHeader: string) {
  const response = await fetch(TAGGER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "DeckDiff/0.1 (local Tagger cache script)",
      "x-csrf-token": csrfToken,
      origin: TAGGER_HOME_URL.slice(0, -1),
      referer: TAGGER_HOME_URL,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({
      query: `
        query SearchTags($input: TagSearchInput!) {
          tags(input: $input) {
            page
            perPage
            results {
              ...TagAttrs
              taggingCount
            }
            total
          }
        }

        fragment TagAttrs on Tag {
          category
          createdAt
          creatorId
          id
          name
          namespace
          pendingRevisions
          slug
          status
          type
          hasExemplaryTagging
          description
        }
      `,
      variables: {
        input: {
          name: null,
          page,
        },
      },
      operationName: "SearchTags",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tagger GraphQL request failed on page ${page}: ${response.status}`);
  }

  const payload = (await response.json()) as TaggerGraphqlResponse;
  if (payload.errors?.length) {
    throw new Error(
      payload.errors.flatMap((error) => (error.message ? [error.message] : [])).join("; "),
    );
  }

  if (!payload.data?.tags) {
    throw new Error(`Tagger response did not include tags on page ${page}.`);
  }

  return {
    payload,
    page: payload.data.tags,
  };
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  await mkdir(RAW_PAGE_DIR, { recursive: true });

  const fetchedAt = new Date().toISOString();
  const { csrfToken, cookieHeader } = await getTaggerSession();
  const tagsById = new Map<string, TagRecord>();
  let page = 1;
  let pageCount = 0;

  while (true) {
    const { payload, page: tagPage } = await fetchTaggerPage(page, csrfToken, cookieHeader);
    const pageNumber = String(page).padStart(3, "0");
    await writeJson(join(RAW_PAGE_DIR, `page-${pageNumber}.json`), payload);

    for (const tag of tagPage.results) {
      tagsById.set(tag.id, toTagRecord(tag));
    }

    pageCount += 1;
    console.log(`Fetched page ${tagPage.page}; cached ${tagsById.size}/${tagPage.total} tags.`);

    if (tagPage.page * tagPage.perPage >= tagPage.total || tagPage.results.length === 0) {
      break;
    }

    page += 1;
    await delay(PAGE_DELAY_MS);
  }

  const tags = [...tagsById.values()].sort((a, b) => b.taggingCount - a.taggingCount);
  await writeJson(join(OUTPUT_DIR, "tags.json"), tags);
  await writeJson(join(OUTPUT_DIR, "manifest.json"), {
    fetchedAt,
    pageCount,
    tagCount: tags.length,
    source: TAGGER_GRAPHQL_URL,
    pageDelayMs: PAGE_DELAY_MS,
  });

  console.log(`Wrote ${tags.length} tags to ${join(OUTPUT_DIR, "tags.json")}.`);
}

await main();
