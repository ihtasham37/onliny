// Cloudflare Pages Function: /api/gemini/rag-search
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
      return new Response(JSON.stringify({ success: false, error: "Missing query or products list" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawQuery = String(query).toLowerCase().trim();
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    // Local retrieval scoring on edge
    const candidateDocs = products
      .map((p: any) => {
        const customId = (p.customId || "").toLowerCase();
        const id = (p.id || "").toLowerCase();
        const name = (p.name || "").toLowerCase();
        const category = (p.category || "").toLowerCase();
        const description = (p.description || "").toLowerCase();

        let initialScore = 0;
        if (customId === rawQuery || id === rawQuery) initialScore += 1000;
        else if (customId.includes(rawQuery) || id.includes(rawQuery)) initialScore += 500;

        queryTokens.forEach((token: string) => {
          if (name.includes(token)) initialScore += 100;
          if (category.includes(token)) initialScore += 80;
          if (description.includes(token)) initialScore += 20;
        });

        return {
          id: p.id,
          customId: p.customId || "",
          name: p.name || "",
          category: p.category || "",
          price: p.price || 0,
          description: p.description ? p.description.substring(0, 150) : "",
          shopName: p.shopName || "Official Store",
          initialScore,
        };
      })
      .sort((a: any, b: any) => b.initialScore - a.initialScore)
      .slice(0, 30);

    const apiKey = env.GEMINI_API_KEY || "AIzaSyDlLGz_GjqXXlQ7o8333ZqDgSmdcxKO_HA";
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: candidateDocs[0]?.category || "All Products",
            suggestedKeywords: queryTokens,
            aiSummary: `Found ${candidateDocs.length} matching products for "${query}".`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: Math.min(100, Math.round(p.initialScore / 10)),
              matchReason: "Catalog match",
            })),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are an e-commerce search ranker. Query: "${query}". Candidate Products: ${JSON.stringify(candidateDocs)}. Return JSON matching keys: detectedIntent (string), detectedCategory (string), suggestedKeywords (array of strings), aiSummary (string in Roman Urdu / English), rankedProductIds (array of objects with id and matchScore).`;

    const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
    let geminiData: any = null;

    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          geminiData = await geminiRes.json();
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
            detectedIntent: query,
            detectedCategory: candidateDocs[0]?.category || "All Products",
            suggestedKeywords: queryTokens,
            aiSummary: `Matching products for "${query}"`,
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
    const parsed = text ? JSON.parse(text) : null;

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed || {
          detectedIntent: query,
          detectedCategory: "All",
          suggestedKeywords: [],
          aiSummary: "",
          rankedProductIds: candidateDocs.map((p: any) => ({ id: p.id, matchScore: 70 })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          detectedIntent: "search",
          detectedCategory: "All",
          suggestedKeywords: [],
          aiSummary: "",
          rankedProductIds: [],
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
