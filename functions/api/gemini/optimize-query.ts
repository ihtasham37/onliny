// Cloudflare Pages Function: /api/gemini/optimize-query
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
    const query = body?.query;

    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { corrected_query: query, synonyms: [], category: "General" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Aap ek e-commerce search query optimizer hain. User query: "${query}". Return valid JSON with keys: "corrected_query", "synonyms" (array of strings), "category" (string).`;

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
              generationConfig: {
                responseMimeType: "application/json",
              },
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
          data: { corrected_query: query, synonyms: [], category: "" },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = text ? JSON.parse(text) : { corrected_query: query, synonyms: [], category: "" };

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: true,
        data: { corrected_query: "", synonyms: [], category: "" },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
