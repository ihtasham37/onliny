// Cloudflare Pages Function: /api/gemini/search
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
    const { query, products } = body;

    if (!query || !products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing query or products list" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = env.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") || "";
    const cleanQuery = String(query).toLowerCase().trim();

    const candidateDocs = products.slice(0, 30);

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: "All Products",
            suggestedKeywords: [query],
            aiSummary: `Showing matching products for "${query}".`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: 85,
              matchReason: "Catalog match",
            })),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are an e-commerce search ranker. Query: "${query}". Candidate Products: ${JSON.stringify(candidateDocs)}. Return JSON with detectedIntent, detectedCategory, suggestedKeywords, aiSummary, rankedProductIds (array of objects with id and matchScore).`;

    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
    ];
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
              contents: [{ parts: [{ text: prompt }] }],
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
      } catch (e) {}
    }

    if (!geminiData) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: "All Products",
            suggestedKeywords: [query],
            aiSummary: `Showing matching items for "${query}".`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: 80,
              matchReason: "Catalog match",
            })),
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
          detectedIntent: query,
          detectedCategory: "All Products",
          suggestedKeywords: [query],
          aiSummary: `Showing items for "${query}"`,
          rankedProductIds: candidateDocs.map((p: any) => ({
            id: p.id,
            matchScore: 80,
            matchReason: "Catalog match",
          })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Search error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
