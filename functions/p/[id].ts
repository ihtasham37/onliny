// Cloudflare Pages Function: /p/[id] Ultra-Short Product Link Route

type PagesFunction<Env = Record<string, any>> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response> | Response;

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const onRequest: PagesFunction = async (context) => {
  const { request, params } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const id = Array.isArray(params.id) ? params.id[0] : (params.id || '');

  const safeId = encodeURIComponent(id);
  const targetUrl = `${origin}/#/product/${safeId}`;
  const appName = "onliny";
  const title = `Product | ${appName}`;
  const desc = `Explore this product on ${appName}. High quality, best pricing, and cash on delivery across Pakistan.`;
  const image = `${origin}/favicon.svg`;

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const safeImage = escapeHtml(image);
  const safeAppName = escapeHtml(appName);
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeCanonical = escapeHtml(`${origin}/p/${safeId}`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${safeAppName}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Fast Meta Refresh to in-app route -->
  <meta http-equiv="refresh" content="0;url=${safeTargetUrl}">
  <script>window.location.replace("${safeTargetUrl}");</script>
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff1f2;">
  <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 90%;">
    <h2 style="margin: 0 0 8px; color: #be123c;">${safeTitle}</h2>
    <p style="color: #64748b; font-size: 14px;">Opening...</p>
    <a href="${safeTargetUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #e11d48; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Click if not redirected</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
      'cache-control': 'public, max-age=60, s-maxage=3600',
    },
  });
};
