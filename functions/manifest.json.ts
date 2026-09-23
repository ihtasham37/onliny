// Cloudflare Pages Function: /manifest.json
import rawCatalog from "../data/staticCatalog.json";

interface Env {
  [key: string]: any;
}

export const onRequestGet = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request } = context;
  const url = new URL(request.url);

  const queryVendor = url.searchParams.get("vendor") || url.searchParams.get("v");
  const queryCategory = url.searchParams.get("category") || url.searchParams.get("cat");
  const queryName = url.searchParams.get("name");
  const queryLogo = url.searchParams.get("logo");

  const catalogSettings = (rawCatalog as any)?.settings || {};
  const savedAppName = (catalogSettings.appName || "Onliny").trim();
  const savedLogo = catalogSettings.logoUrl || "";

  const effectiveName = queryName || (queryVendor ? "Vendor Store" : (queryCategory ? "Category Store" : savedAppName));
  const shortName = effectiveName.length > 12 ? effectiveName.slice(0, 12).trim() : effectiveName;
  const effectiveLogo = queryLogo || savedLogo;

  const icon192 = effectiveLogo || "/pwa-192x192.png";
  const icon512 = effectiveLogo || "/pwa-512x512.png";

  const manifest = {
    id: "/",
    name: `${effectiveName} - Online Shopping Pakistan`,
    short_name: shortName,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#be185d",
    description: `${effectiveName} - Official online shopping destination for fashion and fast cash on delivery.`,
    prefer_related_applications: false,
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: icon192.includes("webp") ? "image/webp" : "image/png",
        purpose: "any"
      },
      {
        src: icon512,
        sizes: "512x512",
        type: icon512.includes("webp") ? "image/webp" : "image/png",
        purpose: "any"
      },
      {
        src: icon512,
        sizes: "512x512",
        type: icon512.includes("webp") ? "image/webp" : "image/png",
        purpose: "maskable"
      }
    ],
    screenshots: [
      {
        src: icon512,
        sizes: "512x512",
        type: icon512.includes("webp") ? "image/webp" : "image/png",
        form_factor: "narrow",
        label: `${effectiveName} Store`
      }
    ]
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=60, must-revalidate",
      "Access-Control-Allow-Origin": "*"
    }
  });
};
