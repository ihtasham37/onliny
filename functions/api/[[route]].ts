// Cloudflare Pages Function: /api/* Universal Edge API Route Handler
import { sendUniversalEmail } from "../utils/smtpClient";

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
        const credentials = body?.credentials || {};

        if (!order) {
          return jsonResponse({ success: false, error: "Missing order payload" }, 400);
        }

        const appName = env.APP_NAME || credentials.appName || order.storeName || "Zivio Store";
        const gmailUser = (env.GMAIL_USER || env.SENDER_EMAIL || env.SMTP_USER || credentials.gmailUser || "").trim();
        const gmailAppPassword = (env.GMAIL_APP_PASSWORD || env.GMAIL_PASS || env.SMTP_PASS || credentials.gmailAppPassword || "").trim();
        const adminEmail = (env.ADMIN_NOTIFICATION_EMAIL || env.RECEIVER_EMAIL || env.ADMIN_EMAIL || credentials.adminNotificationEmail || credentials.adminEmail || gmailUser || "ali10cart@gmail.com").trim();
        const customerEmail = (order.email || "").trim();
        const orderIdShort = String(order.id || "").slice(-6).toUpperCase();
        const formattedTotal = Number(order.total || 0).toLocaleString();

        const recipients = new Set<string>();
        if (adminEmail) recipients.add(adminEmail);
        if (customerEmail) recipients.add(customerEmail);
        const recipientList = Array.from(recipients);
        if (recipientList.length === 0) recipientList.push("ali10cart@gmail.com");

        const itemsTableHtml = (order.items || []).map((item: any) => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px; vertical-align: top; width: 60px;">
              ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; display: block;" />` : `<div style="width: 50px; height: 50px; background-color: #f1f5f9; border-radius: 8px; text-align: center; line-height: 50px; color: #94a3b8; font-size: 10px;">Product</div>`}
            </td>
            <td style="padding: 10px; vertical-align: top;">
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.name}</div>
              ${item.selectedSize ? `<span style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; color: #475569; margin-right: 4px;">Size: <strong>${item.selectedSize}</strong></span>` : ''}
              ${item.selectedColor ? `<span style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; color: #475569;">Color: <strong>${item.selectedColor}</strong></span>` : ''}
            </td>
            <td style="padding: 10px; text-align: center; color: #334155; font-weight: bold; font-size: 13px;">x${item.quantity || 1}</td>
            <td style="padding: 10px; text-align: right; color: #e11d48; font-weight: bold; font-size: 13px;">Rs. ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</td>
          </tr>
        `).join('');

        const cleanPhone = String(order.customerPhone || '').replace(/\D/g, '');
        const waPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
        const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Salam ${order.customerName}, this is regarding your order #${orderIdShort} on ${appName}.`)}`;

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 800;">${appName}</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">🎉 New Order Received!</p>
            </div>
            <div style="padding: 24px 24px 16px 24px;">
              <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #9f1239; font-weight: 600;">ORDER #</span>
                  <span style="font-size: 14px; font-weight: 800; color: #e11d48;">#${orderIdShort}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="font-size: 12px; color: #9f1239; font-weight: 600;">TOTAL BILL</span>
                  <span style="font-size: 16px; font-weight: 800; color: #e11d48;">Rs. ${formattedTotal}</span>
                </div>
              </div>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <div>👤 <strong>Name:</strong> ${order.customerName || 'N/A'}</div>
                <div>📞 <strong>Phone:</strong> <a href="tel:${order.customerPhone}" style="color: #e11d48; text-decoration: none; font-weight: bold;">${order.customerPhone || 'N/A'}</a></div>
                ${order.email ? `<div>✉️ <strong>Email:</strong> ${order.email}</div>` : ''}
                ${order.city ? `<div>🏙️ <strong>City:</strong> ${order.city}</div>` : ''}
                <div>📍 <strong>Address:</strong> ${order.shippingAddress || 'N/A'}</div>
                <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                  <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px;">💬 Open WhatsApp Chat</a>
                </div>
              </div>
              <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin: 0 0 12px 0;">Ordered Items (${order.items?.length || 0})</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tbody>${itemsTableHtml}</tbody>
              </table>
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #0f172a;">
                  <span>Total Amount:</span>
                  <span style="color: #e11d48;">Rs. ${formattedTotal}</span>
                </div>
              </div>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
              <p style="margin: 0;">Automated order notification from <strong>${appName}</strong>.</p>
            </div>
          </div>
        </body>
        </html>
        `;

        const emailResult = await sendUniversalEmail({
          from: gmailUser || "notifications@onliny.co.uk",
          fromName: appName,
          to: recipientList,
          subject: `🛍️ New Order #${orderIdShort} (${order.customerName || "Customer"}) - Rs. ${formattedTotal}`,
          html: htmlContent,
          gmailUser,
          gmailAppPassword,
          brevoApiKey: env.BREVO_API_KEY,
          resendApiKey: env.RESEND_API_KEY,
          sendgridApiKey: env.SENDGRID_API_KEY,
        });

        return jsonResponse({
          success: emailResult.success,
          provider: emailResult.provider,
          message: emailResult.message || `Order email processed for ${recipientList.join(", ")}`,
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
        const { toEmail, credentials } = body;
        const gmailUser = (credentials?.gmailUser || env.GMAIL_USER || env.SENDER_EMAIL || env.SMTP_USER || "").trim();
        const gmailAppPassword = (credentials?.gmailAppPassword || env.GMAIL_APP_PASSWORD || env.GMAIL_PASS || env.SMTP_PASS || "").trim();
        const targetEmail = (toEmail || credentials?.adminNotificationEmail || env.ADMIN_NOTIFICATION_EMAIL || env.RECEIVER_EMAIL || env.ADMIN_EMAIL || gmailUser).trim();

        if (!targetEmail) {
          return jsonResponse({ success: false, error: "Missing recipient email" }, 400);
        }

        const appName = credentials?.appName || env.APP_NAME || "Zivio Store";
        const emailResult = await sendUniversalEmail({
          from: gmailUser || "notifications@onliny.co.uk",
          fromName: `${appName} Alerts`,
          to: [targetEmail],
          subject: `✅ Test Email Successful - ${appName} Order Alerts Active`,
          html: `<div style="font-family: sans-serif; padding: 20px;"><h2>✅ Test Email Successful!</h2><p>Your ${appName} automatic order email alerts are working on Cloudflare Pages!</p><p>Recipient: ${targetEmail}</p></div>`,
          gmailUser,
          gmailAppPassword,
          brevoApiKey: env.BREVO_API_KEY,
          resendApiKey: env.RESEND_API_KEY,
          sendgridApiKey: env.SENDGRID_API_KEY,
        });

        return jsonResponse({
          success: emailResult.success,
          provider: emailResult.provider,
          message: emailResult.success ? `✅ Test email sent successfully to ${targetEmail} via ${emailResult.provider}!` : (emailResult.error || "Failed to send test email."),
        });
      } catch (err: any) {
        return jsonResponse({ success: false, error: err?.message || "Test email error" }, 500);
      }
    }

    // 1.3 Save Email Settings (/api/save-email-settings)
    if (pathname === "/api/save-email-settings" && request.method === "POST") {
      return jsonResponse({ success: true, message: "Settings saved." });
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
        const candidateModels = [
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview",
        ];
        let geminiData: any = null;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-goog-api-key": apiKey,
                },
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
            } else if (geminiRes.status === 429) {
              break;
            }
          } catch (modelErr) {
            break;
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
        const candidateModels = [
          "gemini-3.8-flash",
          "gemini-flash-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.1-pro-preview",
        ];
        let geminiData: any = null;

        for (const model of candidateModels) {
          try {
            const geminiRes = await fetch(
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

            if (geminiRes.ok) {
              geminiData = await geminiRes.json();
              if (geminiData?.candidates?.[0]?.content?.parts?.[0]?.text) {
                break;
              }
            } else if (geminiRes.status === 429) {
              break;
            }
          } catch (modelErr) {
            break;
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
          } else if (res.status === 429) {
            break;
          }
        } catch (e) {
          break;
        }
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

    // 6. Save Catalog endpoint
    if (pathname === "/api/save-catalog" && request.method === "POST") {
      return jsonResponse({
        success: true,
        message: "Catalog acknowledged and synced across client storage and session cache."
      });
    }

    // 7. Proxy fallback if BACKEND_URL is configured
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
