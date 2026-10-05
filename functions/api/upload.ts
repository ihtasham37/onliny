// Cloudflare Pages Function: /api/upload
interface Env {
  R2_BUCKET?: any;
  IMAGES_BUCKET?: any;
  BUCKET?: any;
  R2_PUBLIC_URL?: string;
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
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

export const onRequest = async (context: EventContext<Env>): Promise<Response> => {
  const { request, env } = context;

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Method 1: Cloudflare R2 Bucket Binding (Direct Edge Storage)
    const r2 = env.R2_BUCKET || env.IMAGES_BUCKET || env.BUCKET;
    if (r2 && typeof r2.put === "function") {
      const ext = file.name ? file.name.split(".").pop() || "jpg" : "jpg";
      const key = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      await r2.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type || "image/jpeg",
        },
      });

      const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
      const finalUrl = publicBase ? `${publicBase}/${key}` : `/${key}`;

      return new Response(
        JSON.stringify({
          success: true,
          url: finalUrl,
          public_id: key,
          resource_type: file.type?.startsWith("video") ? "video" : "image",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Method 2: Resilient Base64 Data URI Fallback (Instant & lightweight on edge)
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mimeType = file.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64}`;

    return new Response(
      JSON.stringify({
        success: true,
        url: dataUri,
        public_id: null,
        resource_type: mimeType.startsWith("video") ? "video" : "image",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Upload error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
