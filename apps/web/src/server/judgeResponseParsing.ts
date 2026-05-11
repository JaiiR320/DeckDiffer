import { z } from "zod";

export type JudgeBackendResponse = {
  answer?: unknown;
  response?: unknown;
  message?: unknown;
  output?: unknown;
  citations?: unknown;
  assumptions?: unknown;
  needsClarification?: unknown;
};

const judgeModelResponseSchema = z.object({
  answer: z.string().trim().min(1),
  citations: z
    .array(
      z.object({
        rule: z.string().trim().min(1),
        excerpt: z.string().trim().min(1),
      }),
    )
    .default([]),
  assumptions: z.array(z.string().trim().min(1)).default([]),
  needsClarification: z.boolean().default(false),
});

export function parseJudgeModelResponse(text: string) {
  const candidates = [text];
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1]);
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = judgeModelResponseSchema.safeParse(JSON.parse(candidate));
      if (parsed.success) {
        return parsed.data satisfies JudgeBackendResponse;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Judge model returned an invalid response format.");
}

export function getJudgeResponseText(payload: JudgeBackendResponse) {
  const possibleText = [payload.answer, payload.response, payload.message, payload.output].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (!possibleText) {
    return null;
  }

  const sections = [possibleText.trim()];
  const citations: string[] = [];

  if (Array.isArray(payload.citations)) {
    for (const citation of payload.citations) {
      if (!citation || typeof citation !== "object") {
        continue;
      }

          const rule = typeof citation.rule === "string" ? citation.rule.trim() : "";
          const excerpt = typeof citation.excerpt === "string" ? citation.excerpt.trim() : "";
          if (!rule && !excerpt) {
        continue;
          }

      citations.push(rule ? `${rule}: ${excerpt}`.trim() : excerpt);
    }
  }

  if (citations.length > 0) {
    sections.push(`Citations:\n${citations.map((citation) => `- ${citation}`).join("\n")}`);
  }

  const assumptions: string[] = [];

  if (Array.isArray(payload.assumptions)) {
    for (const assumption of payload.assumptions) {
      if (typeof assumption === "string" && assumption.trim().length > 0) {
        assumptions.push(assumption.trim());
      }
    }
  }

  if (assumptions.length > 0) {
    sections.push(`Assumptions:\n${assumptions.map((assumption) => `- ${assumption}`).join("\n")}`);
  }

  if (payload.needsClarification === true) {
    sections.push("Needs clarification.");
  }

  return sections.join("\n\n");
}
