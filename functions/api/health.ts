// Cloudflare Pages Function: /api/health

type PagesFunction<Env = Record<string, any>> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response> | Response;

interface Env {
  [key: string]: any;
}

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      status: "ok",
      platform: "cloudflare-pages",
      timestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    }
  );
};
