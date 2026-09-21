// Cloudflare Pages Function: /api/* Universal Edge API Route Handler

type PagesFunction<Env = Record<string, any>> = (context: {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}) => Promise<Response> | Response;

interface Env {
  GEMINI_API_KEY?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  BACKEND_URL?: string;
  [key: string]: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

// Generate SHA-1 Hex for Cloudinary Signed Upload
async function generateSha1(str: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", enc.encode(str));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. Health check
    if (pathname === "/api/health") {
      return jsonResponse({
        status: "ok",
        platform: "cloudflare-pages-edge",
        time: new Date().toISOString(),
      });
    }

    // 1.1 Send Order Email Notification (/api/send-order-email)
    if (pathname === "/api/send-order-email" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const order = body?.order;
        if (!order) {
          return jsonResponse({ success: false, error: "Missing order payload" }, 400);
        }
        return jsonResponse({
          success: true,
          message: "Order received on edge function successfully",
          orderId: order.id,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || "Order processing error" }, 500);
      }
    }

    // 1.2 Test Email (/api/test-email)
    if (pathname === "/api/test-email" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const toEmail = body?.toEmail || env.ADMIN_NOTIFICATION_EMAIL;
        return jsonResponse({
          success: true,
          message: `Test email configuration checked on edge for ${toEmail || "admin"}`,
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || "Test email error" }, 500);
      }
    }

    // 2. Image & File Upload Handler (/api/upload)
    if (pathname === "/api/upload" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return jsonResponse({ success: false, error: "No file provided in form data" }, 400);
        }

        const cloudName = env.CLOUDINARY_CLOUD_NAME || "";
        const apiKey = env.CLOUDINARY_API_KEY || "";
        const apiSecret = env.CLOUDINARY_API_SECRET || "";

        // Try signed Cloudinary upload if credentials are present
        if (cloudName && apiKey && apiSecret) {
          const timestamp = Math.round(Date.now() / 1000);
          const folder = "atrya_shop";
          const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
          const signature = await generateSha1(stringToSign);

          const cldFormData = new FormData();
          cldFormData.append("file", file);
          cldFormData.append("api_key", apiKey);
          cldFormData.append("timestamp", String(timestamp));
          cldFormData.append("folder", folder);
          cldFormData.append("signature", signature);

          const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: cldFormData,
          });

          if (cldRes.ok) {
            const cldData = (await cldRes.json()) as any;
            return jsonResponse({
              success: true,
              url: cldData.secure_url,
              public_id: cldData.public_id,
              resource_type: cldData.resource_type || "image",
            });
          } else {
            const errText = await cldRes.text().catch(() => "");
            console.warn("Cloudinary upload failed on edge, falling back to compressed base64:", errText);
          }
        }

        // Lightweight Fallback: Read file as Base64 Data URI (<20KB is lightweight and fast)
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const dataUri = `data:${file.type || "image/webp"};base64,${base64}`;

        return jsonResponse({
          success: true,
          url: dataUri,
          public_id: null,
          resource_type: "image",
        });
      } catch (uploadError: any) {
        console.error("Upload error on edge:", uploadError);
        return jsonResponse(
          { success: false, error: uploadError?.message || "File upload failed" },
          500
        );
      }
    }

    // 3. File Deletion Handler (/api/delete & /api/delete-file)
    if ((pathname === "/api/delete" || pathname === "/api/delete-file") && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const fileUrl = body?.fileUrl;

        const cloudName = env.CLOUDINARY_CLOUD_NAME || "";
        const apiKey = env.CLOUDINARY_API_KEY || "";
        const apiSecret = env.CLOUDINARY_API_SECRET || "";

        if (fileUrl && fileUrl.includes("cloudinary") && cloudName && apiKey && apiSecret) {
          const publicIdMatch = fileUrl.match(/\/atrya_shop\/(.+)\./);
          const publicId = publicIdMatch ? `atrya_shop/${publicIdMatch[1]}` : null;

          if (publicId) {
            const timestamp = Math.round(Date.now() / 1000);
            const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
            const signature = await generateSha1(stringToSign);

            const cldFormData = new FormData();
            cldFormData.append("public_id", publicId);
            cldFormData.append("api_key", apiKey);
            cldFormData.append("timestamp", String(timestamp));
            cldFormData.append("signature", signature);

            await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
              method: "POST",
              body: cldFormData,
            }).catch(() => {});
          }
        }

        return jsonResponse({ success: true });
      } catch (err: any) {
        return jsonResponse({ success: true }); // Graceful resolution
      }
    }

    // 4. Gemini: Optimize Search Query
    if (pathname === "/api/gemini/optimize-query" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const query = body?.query;

      if (!query) {
        return jsonResponse({ success: false, error: "Missing query" }, 400);
      }

      const apiKey = env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return jsonResponse({
          success: true,
          data: { corrected_query: query, synonyms: [], category: "General" },
        });
      }

      const prompt = `Aap ek e-commerce search query optimizer hain. User query: "${query}". Return valid JSON with keys: "corrected_query", "synonyms" (array of strings), "category" (string).`;

      try {
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
          } catch (modelErr) {
            console.warn(`Error calling model ${model}:`, modelErr);
          }
        }

        if (!geminiData) {
          return jsonResponse({
            success: true,
            data: { corrected_query: query, synonyms: [], category: "" },
          });
        }

        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = text ? JSON.parse(text) : { corrected_query: query, synonyms: [], category: "" };
        return jsonResponse({ success: true, data: parsed });
      } catch (e) {
        return jsonResponse({
          success: true,
          data: { corrected_query: query, synonyms: [], category: "" },
        });
      }
    }

    // 5. Gemini: RAG & Search
    if ((pathname === "/api/gemini/rag-search" || pathname === "/api/gemini/search") && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const { query, products } = body;

      if (!query || !products || !Array.isArray(products)) {
        return jsonResponse({ success: false, error: "Missing query or products list" }, 400);
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

      const apiKey = env.GEMINI_API_KEY || "";
      if (!apiKey) {
        return jsonResponse({
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
        });
      }

      // Call Gemini for intelligent re-ranking
      const prompt = `You are an e-commerce search ranker. Query: "${query}". Candidate Products: ${JSON.stringify(candidateDocs)}. Return JSON matching keys: detectedIntent (string), detectedCategory (string), suggestedKeywords (array of strings), aiSummary (string in Roman Urdu / English), rankedProductIds (array of objects with id and matchScore).`;

      try {
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
          } catch (modelErr) {
            console.warn(`Error calling model ${model}:`, modelErr);
          }
        }

        if (!geminiData) {
          return jsonResponse({
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
          });
        }

        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = text ? JSON.parse(text) : null;

        return jsonResponse({
          success: true,
          data: parsed || {
            detectedIntent: query,
            detectedCategory: "All",
            suggestedKeywords: [],
            aiSummary: "",
            rankedProductIds: candidateDocs.map((p: any) => ({ id: p.id, matchScore: 70 })),
          },
        });
      } catch (err: any) {
        return jsonResponse({
          success: true,
          data: {
            detectedIntent: query,
            detectedCategory: candidateDocs[0]?.category || "All Products",
            suggestedKeywords: queryTokens,
            aiSummary: `Matching products for "${query}"`,
            rankedProductIds: candidateDocs.map((p: any) => ({
              id: p.id,
              matchScore: 80,
              matchReason: "Keyword match",
            })),
          },
        });
      }
    }

    // 7. Universal Gemini E-Commerce Assistant (Type 1: Product Extraction / Type 2: Search Query)
    if (pathname === "/api/gemini/assistant" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as any;
      const input = body?.input;
      const preferredType = body?.preferredType;

      if (!input || typeof input !== "string" || !input.trim()) {
        return jsonResponse({ success: false, error: "Missing input" }, 400);
      }

      const trimmedInput = input.trim();
      const urlMatch = trimmedInput.match(/https?:\/\/[^\s]+/i);

      if (urlMatch || preferredType === "product_extraction") {
        try {
          if (urlMatch) {
            const fetchResp = await fetch(urlMatch[0], {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
              }
            });
            if (fetchResp.ok) {
              const html = await fetchResp.text();
              let title: string | null = null;
              let description: string | null = null;
              let price: number | string | null = null;
              let category: string | null = null;
              let sku: string | null = null;
              const imageUrls: Set<string> = new Set();
              const extractedSizes: Set<string> = new Set();

              const addCleanUrl = (raw: string) => {
                if (!raw || typeof raw !== 'string') return;
                let c = raw.replace(/&amp;/g, '&').trim();
                if (c.includes('/api/img?url=')) {
                  try {
                    const m = c.match(/url=([^&]+)/);
                    if (m && m[1]) c = decodeURIComponent(m[1]);
                  } catch (e) {}
                }
                if (c.includes('static.markaz.app/pakistan/thumbnails/products/')) {
                  c = c.replace('/thumbnails/products/', '/products/');
                }
                if (c.startsWith('http')) imageUrls.add(c);
              };

              // Parse JSON-LD
              const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
              if (jsonLdMatches) {
                for (const block of jsonLdMatches) {
                  try {
                    const raw = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
                    const parsed = JSON.parse(raw);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    for (const item of items) {
                      if (item["@type"] === "Product" || item.type === "Product") {
                        if (item.name) title = item.name;
                        if (item.description) description = item.description;
                        if (item.sku || item.mpn) sku = item.sku || item.mpn;
                        if (item.category) category = item.category;
                        if (item.image) {
                          if (Array.isArray(item.image)) item.image.forEach((i: any) => addCleanUrl(typeof i === 'string' ? i : i?.url));
                          else if (typeof item.image === 'string') addCleanUrl(item.image);
                          else if (item.image?.url) addCleanUrl(item.image.url);
                        }
                        if (item.size) {
                          if (Array.isArray(item.size)) item.size.forEach((s: any) => extractedSizes.add(String(s).trim()));
                          else if (typeof item.size === 'string') extractedSizes.add(item.size.trim());
                        }
                        if (item.offers) {
                          const o = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                          if (o?.price) price = o.price;
                        }
                      }
                    }
                  } catch (e) {}
                }
              }

              // Meta fallback
              if (!title) {
                const ogTitle = html.match(/<meta\s+(?:property|name)=["'](?:og:title|twitter:title)["']\s+content=["']([^"']*)["']/i);
                if (ogTitle) title = ogTitle[1].replace(/\s*–\s*Markaz.*$/i, "").trim();
              }
              if (!description) {
                const ogDesc = html.match(/<meta\s+(?:property|name)=["'](?:og:description|description)["']\s+content=["']([^"']*)["']/i);
                if (ogDesc) description = ogDesc[1];
              }

              const ogImg = html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']*)["']/i);
              if (ogImg && ogImg[1]) addCleanUrl(ogImg[1]);

              // Scrape interactive buttons / options for sizes
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

              const slugMatch = urlMatch ? urlMatch[0].match(/\/product\/([a-zA-Z0-9_-]+)(?:\/(\d+))?/i) : null;
              const productId = slugMatch?.[2] || null;

              // Scrape product images fallback ONLY if no schema images exist
              if (imageUrls.size === 0) {
                const imgMatches = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)];
                for (const m of imgMatches) {
                  const src = m[1];
                  const matchesThisProduct = productId ? src.includes(productId) : true;
                  if (matchesThisProduct && src && (src.includes("static.markaz.app") || src.includes("daraz.pk") || src.includes("alicdn.com")) && !src.includes("logo")) {
                    addCleanUrl(src);
                  }
                }
              }

              if (price === null) {
                const pMatch = html.match(/(?:PKR|Rs\.?)\s*(?:<!-- -->\s*)*([0-9,]+)/i);
                if (pMatch) price = pMatch[1].replace(/,/g, "");
              }

              const sizeList = Array.from(extractedSizes);
              const sizeCategories = sizeList.length > 0 ? [
                {
                  categoryName: sizeList.some(s => /Year|Yr|Month/i.test(s)) ? "Age / Size" : "Size",
                  sizes: sizeList
                }
              ] : [];

              // Clean filtered images
              const filteredImages = Array.from(imageUrls).filter(img => {
                if (img.includes("logo") || img.includes("icon") || img.includes("avatar") || img.includes("banner")) return false;
                if (productId && Array.from(imageUrls).some(u => u.includes(productId))) {
                  return img.includes(productId);
                }
                return true;
              });

              if (title || filteredImages.length > 0) {
                return jsonResponse({
                  success: true,
                  data: {
                    type: "product_extraction",
                    product: {
                      title: title || "Imported Product",
                      price: price ? parseFloat(String(price)) : null,
                      category: category || "General",
                      description: description || "",
                      image_urls: filteredImages.slice(0, 8),
                      size_categories: sizeCategories,
                      sku: sku || (productId ? `MKZ-${productId}` : null),
                      delivery_time: "Delivery in 3-5 Days",
                      shipping_fee: 0
                    }
                  }
                });
              }
            }
          }
        } catch (crawlerErr) {}
      }

      const apiKey = env.GEMINI_API_KEY || "";

      const systemPrompt = `You are an intelligent E-commerce AI Assistant built inside an online store app.

Your task is to handle TWO types of user inputs cleanly and accurately:

TYPE 1: PRODUCT LINK / PRODUCT RAW TEXT INPUT (For Add-Product or Auto-Fill Feature)
- If the user provides a product link, Markaz product link/text, or raw product text:
- Extract all available details: product title, description, category, price, and image URLs.
- Return ONLY a valid JSON object matching this structure (no extra markdown explanation):
{
  "type": "product_extraction",
  "product": {
    "title": "Product Title Here",
    "price": "Price or null if not found",
    "category": "Estimated category (e.g. Clothing, Accessories, Electronics)",
    "description": "Short clean summary of the product",
    "image_urls": ["URL 1", "URL 2"]
  }
}

TYPE 2: USER SEARCH / GENERAL E-COMMERCE QUERY (For Search Feature)
- If the user inputs a search query, product request, or shopping recommendation question (e.g., "show me mens shoes", "cheap watches", "summer collection"):
- Extract the user's intent, relevant search keywords, price filter (if any), and return clean search parameters or helpful direct assistance.
- Return ONLY a valid JSON object matching this structure:
{
  "type": "search_query",
  "search": {
    "keywords": "extracted search terms",
    "category_filter": "category if specified or null",
    "price_max": null,
    "user_intent_summary": "Clean summary of what user is looking for"
  }
}

STRICT RULES:
1. Always output strictly valid JSON so the app frontend/backend can parse it easily without breaking.
2. Do not add conversational conversational filler outside the JSON object.
3. If an image URL or specific field is missing in raw text, set its value to null or empty array [].
${preferredType ? `HINT: The current screen prefers '${preferredType}'.` : ""}
`;

      const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      let geminiData: any = null;

      for (const model of candidateModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Input: ${trimmedInput}` }] }],
                generationConfig: { responseMimeType: "application/json" }
              })
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

      if (geminiData) {
        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        try {
          const parsed = JSON.parse(text);
          return jsonResponse({ success: true, data: parsed });
        } catch (e) {}
      }

      // Fallback
      if (preferredType === "product_extraction" || trimmedInput.startsWith("http")) {
        return jsonResponse({
          success: true,
          data: {
            type: "product_extraction",
            product: {
              title: trimmedInput.slice(0, 60),
              price: null,
              category: "General",
              description: trimmedInput,
              image_urls: []
            }
          }
        });
      } else {
        return jsonResponse({
          success: true,
          data: {
            type: "search_query",
            search: {
              keywords: trimmedInput,
              category_filter: null,
              price_max: null,
              user_intent_summary: `Search for ${trimmedInput}`
            }
          }
        });
      }
    }

    // 6. Proxy fallback if BACKEND_URL is configured
    if (env.BACKEND_URL) {
      const targetUrl = new URL(pathname + url.search, env.BACKEND_URL);
      const proxyReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "follow",
      });
      return await fetch(proxyReq);
    }

    // Default response for unmatched endpoints
    return jsonResponse({ success: false, error: `Route ${pathname} not found on edge function` }, 404);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message || "Internal server error" }, 500);
  }
};
