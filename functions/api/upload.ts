// Cloudflare Pages Function: /api/upload
interface Env {
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudName = env.CLOUDINARY_CLOUD_NAME || "daafqfrqh";
    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET || "atrya_preset";

    const cldFormData = new FormData();
    cldFormData.append("file", file);
    cldFormData.append("upload_preset", uploadPreset);
    cldFormData.append("folder", "atrya_shop");

    const cldRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: cldFormData,
      }
    );

    if (cldRes.ok) {
      const cldData = (await cldRes.json()) as any;
      if (cldData && cldData.secure_url) {
        return new Response(JSON.stringify({ url: cldData.secure_url }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: Convert to Data URI so user never fails
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mimeType = file.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64}`;

    return new Response(JSON.stringify({ url: dataUri }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Upload error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};
