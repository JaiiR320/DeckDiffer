import { parseJudgeModelResponse } from "./judgeResponseParsing";

type ZenResponse = {
  output_text?: unknown;
  output?: Array<{ content?: Array<{ text?: unknown }> }>;
  error?: { message?: unknown };
};

type GeminiZenResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
  error?: { message?: unknown };
};

const JUDGE_SYSTEM_PROMPT = `You are a Magic: The Gathering judge assistant.
Return JSON only with this exact shape:
{
  "answer": string,
  "citations": [{ "rule": string, "excerpt": string }],
  "assumptions": string[],
  "needsClarification": boolean
}

Rules:
- Use the provided card data and rulings as your primary source.
- Answer as clearly and directly as possible.
- If the question depends on missing context, set needsClarification to true and explain what is missing.
- Only include citations when you are confident the cited rule number and excerpt are accurate.
- If you are not confident about a citation, omit it instead of guessing.
- Return valid JSON only. Do not wrap it in markdown fences.`;

function getJudgeModel() {
  const configuredModel = process.env.JUDGE_MODEL?.trim() || "gemini-3.1-pro";
  return configuredModel.replace(/^opencode\//, "");
}

function extractZenResponseText(payload: ZenResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  const outputText = payload.output
    ?.flatMap((item) =>
      (item.content ?? []).flatMap((part) => {
        const text = typeof part.text === "string" ? part.text.trim() : "";
        return text ? [text] : [];
      }),
    )
    .join("\n");

  return outputText?.trim() || null;
}

function extractGeminiResponseText(payload: GeminiZenResponse) {
  const text = payload.candidates
    ?.flatMap((candidate) =>
      (candidate.content?.parts ?? []).flatMap((part) => {
        const text = typeof part.text === "string" ? part.text.trim() : "";
        return text ? [text] : [];
      }),
    )
    .join("\n");

  return text?.trim() || null;
}

export async function requestJudgeModel(apiKey: string, questionPayload: unknown) {
  const model = getJudgeModel();

  if (model.startsWith("gemini-")) {
    const response = await fetch(`https://opencode.ai/zen/v1/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: JUDGE_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: JSON.stringify(questionPayload) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as GeminiZenResponse | null;
      const errorMessage =
        typeof errorBody?.error?.message === "string" && errorBody.error.message.trim().length > 0
          ? errorBody.error.message.trim()
          : `OpenCode API error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const responseText = extractGeminiResponseText((await response.json()) as GeminiZenResponse);
    if (!responseText) {
      throw new Error("OpenCode API returned an empty response.");
    }

    return parseJudgeModelResponse(responseText);
  }

  const response = await fetch("https://opencode.ai/zen/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: JUDGE_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(questionPayload) },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ZenResponse | null;
    const errorMessage =
      typeof errorBody?.error?.message === "string" && errorBody.error.message.trim().length > 0
        ? errorBody.error.message.trim()
        : `OpenCode API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const responseText = extractZenResponseText((await response.json()) as ZenResponse);
  if (!responseText) {
    throw new Error("OpenCode API returned an empty response.");
  }

  return parseJudgeModelResponse(responseText);
}
