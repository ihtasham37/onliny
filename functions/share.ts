// Cloudflare Pages Function: /share Dynamic OpenGraph Social Preview & Redirection

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
  const { request } = context;
  const url = new URL(request.url);
  const origin = url.origin;

  const type = url.searchParams.get('type') || 'store';
  const id = url.searchParams.get('id') || '';
  const rawTitle = url.searchParams.get('title') || 'Online Store';
  const rawDesc = url.searchParams.get('desc') || 'Discover amazing products, fast delivery, and verified quality.';
  const rawImage = url.searchParams.get('image') || `${origin}/favicon.svg`;
  const rawPrice = url.searchParams.get('price') || '';
  const rawAppName = url.searchParams.get('app') || 'Online Store';

  const fullTitle = rawTitle.includes(rawAppName) ? rawTitle : `${rawTitle} | ${rawAppName}`;
  const displayDesc = rawPrice 
    ? `Price: Rs. ${Number(rawPrice).toLocaleString()} - ${rawDesc}`
    : rawDesc;

  // Determine target in-app route
  let targetPath = '/#/';
  if (type === 'product' && id) {
    targetPath = `/#/product/${encodeURIComponent(id)}`;
  } else if (type === 'category' && id) {
    targetPath = `/#/category/${encodeURIComponent(id)}`;
  }

  const targetUrl = `${origin}${targetPath}`;

  const safeTitle = escapeHtml(fullTitle);
  const safeDesc = escapeHtml(displayDesc);
  const safeImage = escapeHtml(rawImage);
  const safeAppName = escapeHtml(rawAppName);
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeCanonical = escapeHtml(url.href);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'website'}">
  <meta property="og:site_name" content="${safeAppName}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@${safeAppName.replace(/\s+/g, '')}">
  <meta name="twitter:url" content="${safeCanonical}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  
  <!-- Fast Meta Refresh to SPA route -->
  <meta http-equiv="refresh" content="0;url=${safeTargetUrl}">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #fdf2f8;
      color: #881337;
      text-align: center;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 24px;
      border-radius: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      max-width: 400px;
      width: 100%;
    }
    .btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 20px;
      background: #e11d48;
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: bold;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #fecdd3;
      border-top-color: #e11d48;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script>
    // Immediate JavaScript Client Redirect
    window.location.replace("${safeTargetUrl}");
  </script>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2 style="margin: 0 0 8px; font-size: 18px;">${safeTitle}</h2>
    <p style="margin: 0; color: #64748b; font-size: 13px;">Opening store...</p>
    <a href="${safeTargetUrl}" class="btn">Click here if not redirected</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
};
