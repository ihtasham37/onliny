// Cloudflare Pages Function: /api/gemini/assistant
// Handles both: 
// 1. Instant E-Commerce Product URL Scraping & AI Extraction
// 2. Search Query Intent Extraction

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

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
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

async function scrapeAndParseProductUrl(targetUrl: string) {
  try {
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ur;q=0.8",
      },
    });

    if (!resp.ok) {
      return null;
    }

    const html = await resp.text();

    let title: string | null = null;
    let description: string | null = null;
    let price: number | null = null;
    let oldPrice: number | null = null;
    let category: string | null = null;
    let sku: string | null = null;
    let deliveryTime: string = "Delivery in 3-5 Days";
    let shippingFee: number = 0;

    const imageUrls: Set<string> = new Set();
    const extractedSizes: Set<string> = new Set();

    const addCleanUrl = (raw: string) => {
      if (!raw || typeof raw !== "string") return;
      let c = raw.replace(/&amp;/g, "&").trim();
      if (c.includes("/api/img?url=")) {
        try {
          const m = c.match(/url=([^&]+)/);
          if (m && m[1]) c = decodeURIComponent(m[1]);
        } catch (e) {}
      }
      if (c.includes("static.markaz.app/pakistan/thumbnails/products/")) {
        c = c.replace("/thumbnails/products/", "/products/");
      }
      if (c.startsWith("http")) imageUrls.add(c);
    };

    // 1. Parse JSON-LD Schema
    const jsonLdMatches = html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );
    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const raw = block
            .replace(/<script[^>]*>/i, "")
            .replace(/<\/script>/i, "")
            .trim();
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item["@type"] === "Product" || item.type === "Product") {
              if (item.name) title = item.name;
              if (item.description) description = item.description;
              if (item.sku || item.mpn) sku = item.sku || item.mpn;
              if (item.category) category = item.category;
              if (item.image) {
                if (Array.isArray(item.image)) {
                  item.image.forEach((i: any) =>
                    addCleanUrl(typeof i === "string" ? i : i?.url)
                  );
                } else if (typeof item.image === "string") {
                  addCleanUrl(item.image);
                } else if (item.image?.url) {
                  addCleanUrl(item.image.url);
                }
              }
              if (item.size) {
                if (Array.isArray(item.size)) {
                  item.size.forEach((s: any) =>
                    extractedSizes.add(String(s).trim())
                  );
                } else if (typeof item.size === "string") {
                  extractedSizes.add(item.size.trim());
                }
              }
              if (item.offers) {
                const o = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (o?.price) price = parseFloat(String(o.price));
                if (o?.highPrice && !oldPrice) oldPrice = parseFloat(String(o.highPrice));
                if (o?.shippingDetails?.shippingRate?.value) {
                  shippingFee = parseFloat(String(o.shippingDetails.shippingRate.value));
                }
              }
            }

            // BreadcrumbList for category
            if (item["@type"] === "BreadcrumbList" && Array.isArray(item.itemListElement)) {
              const crumbs = item.itemListElement
                .map((el: any) => el.name || el.item?.name)
                .filter(Boolean);
              if (crumbs.length > 2 && !category) {
                category = crumbs.slice(1, -1).join(" > ");
              }
            }
          }
        } catch (ldErr) {}
      }
    }

    // 2. Meta Tags (OpenGraph & Twitter)
    const ogMatches = [
      ...html.matchAll(/<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi),
    ];
    const meta: Record<string, string> = {};
    for (const m of ogMatches) {
      if (m[1] && m[2]) {
        meta[m[1].toLowerCase()] = m[2];
      }
    }

    if (!title) {
      title = meta["og:title"] || meta["twitter:title"] || null;
    }
    if (!description) {
      description =
        meta["og:description"] || meta["twitter:description"] || meta["description"] || null;
    }
    if (meta["og:image"]) addCleanUrl(meta["og:image"]);
    if (meta["twitter:image"]) addCleanUrl(meta["twitter:image"]);

    // 3. Fallback Title from <title> tag
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTag && titleTag[1]) {
        title = titleTag[1].trim();
      }
    }

    if (title) {
      title = title
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s*–\s*Markaz.*$/i, "")
        .replace(/\s*\|\s*Daraz.*$/i, "")
        .replace(/\s*\|\s*Online.*$/i, "")
        .trim();
    }

    // 4. Fallback Price Extraction
    if (price === null) {
      const priceTagMatch =
        html.match(/(?:PKR|Rs\.?)\s*(?:<!-- -->\s*)*([0-9,]+(?:\.[0-9]{2})?)/i) ||
        html.match(/(?:price|amount)["']?\s*:\s*["']?([0-9,]+(?:\.[0-9]{2})?)/i);
      if (priceTagMatch && priceTagMatch[1]) {
        price = parseFloat(priceTagMatch[1].replace(/,/g, ""));
      }
    }

    // 5. Sizes from Button / Option Tags
    const btnMatches = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/gi)];
    for (const bm of btnMatches) {
      const txt = bm[1].trim();
      if (
        /^\d+(?:-\d+)?\s*(?:Years?|Yrs?|Months?|M|Y)$/i.test(txt) ||
        /^(?:XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|Free Size|Standard|Unstitched|Stitched)$/i.test(txt) ||
        /^(?:3[4-9]|4[0-8])$/.test(txt)
      ) {
        extractedSizes.add(txt);
      }
    }

    const optionMatches = [...html.matchAll(/<option[^>]*>([^<]+)<\/option>/gi)];
    for (const om of optionMatches) {
      const txt = om[1].trim();
      if (
        /^\d+(?:-\d+)?\s*(?:Years?|Yrs?|Months?|M|Y)$/i.test(txt) ||
        /^(?:XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|Free Size|Standard|Unstitched|Stitched)$/i.test(txt) ||
        /^(?:3[4-9]|4[0-8])$/.test(txt)
      ) {
        extractedSizes.add(txt);
      }
    }

    // 6. Product ID & SKU Extraction
    const slugMatch = targetUrl.match(/\/product\/([a-zA-Z0-9_-]+)(?:\/(\d+))?/i);
    const productId = slugMatch?.[2] || null;
    if (slugMatch) {
      if (!title && slugMatch[1]) {
        title = slugMatch[1]
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      }
      if (!sku && slugMatch[2]) {
        sku = `MKZ-${slugMatch[2]}`;
      }
    }

    // 7. Fallback Images from <img> tags
    if (imageUrls.size === 0) {
      const imgMatches = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)];
      for (const match of imgMatches) {
        const src = match[1];
        if (src && typeof src === "string") {
          const matchesThisProduct = productId ? src.includes(productId) : true;
          if (
            matchesThisProduct &&
            (src.includes("static.markaz.app/pakistan/products/") ||
              src.includes("static.markaz.app/pakistan/thumbnails/products/") ||
              src.includes("alicdn.com") ||
              src.includes("daraz.pk") ||
              src.includes("/products/") ||
              src.includes("shopify.com")) &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("avatar")
          ) {
            addCleanUrl(src);
          }
        }
      }
    }

    const filteredImages = Array.from(imageUrls).filter((img) => {
      if (
        img.includes("logo") ||
        img.includes("icon") ||
        img.includes("avatar") ||
        img.includes("banner")
      ) {
        return false;
      }
      if (productId && Array.from(imageUrls).some((u) => u.includes(productId))) {
        return img.includes(productId);
      }
      return true;
    });

    const sizeList = Array.from(extractedSizes);
    const sizeCategories =
      sizeList.length > 0
        ? [
            {
              categoryName: sizeList.some((s) => /Year|Yr|Month/i.test(s))
                ? "Age / Size"
                : "Size",
              sizes: sizeList,
            },
          ]
        : [];

    return {
      title: title || "Imported Product",
      price: price || null,
      old_price: oldPrice,
      category: category || "General",
      description:
        description ||
        (title ? `${title}. Cash on delivery available across Pakistan.` : ""),
      image_urls: filteredImages.slice(0, 8),
      size_categories: sizeCategories,
      sku,
      delivery_time: deliveryTime,
      shipping_fee: shippingFee,
    };
  } catch (err: any) {
    console.warn("Edge product scrape notice:", err?.message || err);
    return null;
  }
}

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
    const body = (await request.json().catch(() => ({}))) as any;
    const { input, preferredType } = body;

    if (!input || typeof input !== "string" || !input.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing input parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedInput = input.trim();
    const urlMatch = trimmedInput.match(/https?:\/\/[^\s]+/i);
    const apiKey =
      env.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") || "";

    // CASE 1: Product Extraction from URL or Text (For Add Product via Link)
    if (urlMatch || preferredType === "product_extraction") {
      let productResult: any = null;

      if (urlMatch) {
        productResult = await scrapeAndParseProductUrl(urlMatch[0]);
      }

      if (!productResult) {
        productResult = {
          title: trimmedInput.slice(0, 80),
          price: null,
          category: "General",
          description: trimmedInput,
          image_urls: [],
          size_categories: [],
          delivery_time: "Delivery in 3-5 Days",
          shipping_fee: 0,
        };
      }

      // If Gemini API Key exists, use Gemini to polish & format description
      if (apiKey) {
        const candidateModels = [
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview",
        ];

        const prompt = `You are an expert e-commerce catalog assistant.
Extract and clean product info into valid JSON:
Input: "${trimmedInput}"
Title: "${productResult.title}"
Price: ${productResult.price || "null"}
Category: "${productResult.category}"

Return ONLY valid JSON matching this structure:
{
  "type": "product_extraction",
  "product": {
    "title": "${productResult.title}",
    "price": ${productResult.price || "null"},
    "category": "${productResult.category}",
    "description": "Clean, attractive bullet points for the product description"
  }
}`;

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
              const data: any = await res.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              const parsed = cleanAndParseJson(text);
              if (parsed?.product) {
                if (parsed.product.title) productResult.title = parsed.product.title;
                if (parsed.product.category) productResult.category = parsed.product.category;
                if (parsed.product.description) productResult.description = parsed.product.description;
                if (parsed.product.price && !productResult.price) productResult.price = parsed.product.price;
                break;
              }
            }
          } catch (e) {}
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            type: "product_extraction",
            product: productResult,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CASE 2: Search Query Intent Extraction
    const systemPrompt = `You are an intelligent E-commerce AI Assistant.
Extract user's intent and search parameters from: "${trimmedInput}".
Return ONLY valid JSON matching this schema:
{
  "type": "search_query",
  "search": {
    "keywords": "${trimmedInput}",
    "category_filter": null,
    "price_max": null,
    "user_intent_summary": "Showing products for ${trimmedInput}"
  }
}`;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            type: "search_query",
            search: {
              keywords: trimmedInput,
              category_filter: null,
              price_max: null,
              user_intent_summary: `Showing best matching results for "${trimmedInput}".`,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
              contents: [{ parts: [{ text: systemPrompt }] }],
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

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = cleanAndParseJson(text);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsed || {
          type: "search_query",
          search: {
            keywords: trimmedInput,
            category_filter: null,
            price_max: null,
            user_intent_summary: `Showing products for ${trimmedInput}`,
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Assistant error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
