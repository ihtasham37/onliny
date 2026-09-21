// Cloudflare Pages Function: /api/gemini/assistant
interface Env {
  GEMINI_API_KEY?: string;
  [key: string]: any;
}

interface EventContext<T> {
  request: Request;
  env: T;
  params: any;
  next: () => Promise<Response>;
}

function cleanAndParseJson(text: string | null | undefined) {
  if (!text) return null;
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(clean);
  } catch (err) {
    const match = clean.match(/[\{\[\s\S]*[\}\]]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (e) { return null; }
    }
    return null;
  }
}

export const onRequest = async (context: EventContext<Env>): Promise<Response> => {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const { input, preferredType } = body;

    if (!input || typeof input !== "string" || !input.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing input parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedInput = input.trim();
    const apiKey = env.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") || "";

    const systemPrompt = `You are an intelligent E-commerce AI Assistant built inside an online store app.

Your task is to handle user queries cleanly and accurately:
- If the user inputs a search query or product request:
- Extract user's intent, relevant search keywords, category filter (if any), and return clean search parameters.
- Return ONLY a valid JSON object matching this structure:
{
  "type": "search_query",
  "search": {
    "keywords": "extracted search terms",
    "category_filter": "category if specified or null",
    "price_max": null,
    "user_intent_summary": "Clean summary of what user is looking for"
  }
}
HINT: The current screen prefers '${preferredType || "search_query"}'.`;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            type: "search_query",
            search: {
              keywords: trimmedInput,
              category_filter: null,
              price_max: null,
              user_intent_summary: `Showing products for ${trimmedInput}`,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"];
    let geminiData: any = null;

    for (const model of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Input: ${trimmedInput}` }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (res.ok) {
          geminiData = await res.json();
          if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
            break;
          }
        }
      } catch (callErr) {
        console.warn(`Error calling Gemini model ${model}:`, callErr);
      }
    }

    if (!geminiData) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            type: "search_query",
            search: {
              keywords: trimmedInput,
              category_filter: null,
              price_max: null,
              user_intent_summary: `Showing results for ${trimmedInput}`,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = cleanAndParseJson(text);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed || {
          type: "search_query",
          search: {
            keywords: trimmedInput,
            category_filter: null,
            price_max: null,
            user_intent_summary: `Showing items for ${trimmedInput}`,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Assistant error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
