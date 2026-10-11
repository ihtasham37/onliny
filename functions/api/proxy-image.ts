// Cloudflare Pages Function: /api/proxy-image
// Proxies external images with CORS headers so they can be downloaded, compressed, and saved to Firebase

interface Env {
  [key: string]: any;
}

interface EventContext<T> {
  request: Request;
  env: T;
  params: any;
  next: () => Promise<Response>;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Max-Age": "86400",
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestGet = async (context: EventContext<Env>): Promise<Response> => {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new Response(JSON.stringify({ error: "Invalid protocol" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const imgResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!imgResponse.ok) {
      return new Response(JSON.stringify({ error: `Remote image returned status ${imgResponse.status}` }), {
        status: imgResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    const body = imgResponse.body;

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, s-maxage=604800",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Failed to proxy image" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
