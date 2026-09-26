import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { sendOrderNotificationEmail, sendTestEmail } from "./utils/emailNotification";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Initialize Gemini client (safe check if key exists, but don't crash)
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY environment variable is not set. Gemini search will be disabled.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Simple in-memory response cache & rate-limit cooldown manager
const geminiQueryCache = new Map<string, { timestamp: number; data: any }>();
let geminiRateLimitCooldownUntil = 0;

function getCachedGeminiResponse(cacheKey: string): any | null {
  const cached = geminiQueryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.data;
  }
  return null;
}

function setCachedGeminiResponse(cacheKey: string, data: any) {
  if (geminiQueryCache.size > 500) {
    const oldestKey = geminiQueryCache.keys().next().value;
    if (oldestKey) geminiQueryCache.delete(oldestKey);
  }
  geminiQueryCache.set(cacheKey, { timestamp: Date.now(), data });
}

// Helper function to execute Gemini requests with model fallbacks and 429 rate limit circuit breaker
async function callGeminiWithFallback(ai: GoogleGenAI, params: {
  contents: string;
  config?: any;
}) {
  if (Date.now() < geminiRateLimitCooldownUntil) {
    return null;
  }

  const models = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      const status = err?.status || err?.code || 0;
      const msg = String(err?.message || "");
      if (status === 429 || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
        geminiRateLimitCooldownUntil = Date.now() + 45000;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return null;
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Set up Multer for temporary storage
const uploadDir = (process.env.VERCEL || process.env.NETLIFY) ? "/tmp" : path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const upload = multer({ dest: uploadDir });

// API Route for Cloudinary Upload
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype.split("/")[0]; // 'image' or 'video'

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: fileType === "video" ? "video" : "auto",
      folder: "atrya_shop",
    });

    // Clean up local file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Route for deleting files from Cloudinary
app.post("/api/delete", async (req, res) => {
  try {
    const { fileUrl } = req.body;
    if (!fileUrl) return res.status(400).json({ success: false, error: "No fileUrl provided" });

    const publicIdMatch = fileUrl.match(/\/atrya_shop\/(.+)\./);
    const publicId = publicIdMatch ? `atrya_shop/${publicIdMatch[1]}` : null;

    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Cloudinary Delete Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to get or save secure email settings server-side
const EMAIL_SETTINGS_PATH = path.resolve(process.cwd(), "data", "emailSettings.json");

function getStoredEmailSettings(): {
  gmailUser?: string;
  gmailAppPassword?: string;
  adminNotificationEmail?: string;
  appName?: string;
} {
  try {
    if (fs.existsSync(EMAIL_SETTINGS_PATH)) {
      const raw = fs.readFileSync(EMAIL_SETTINGS_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read emailSettings.json:", e);
  }
  return {};
}

function saveStoredEmailSettings(creds: Record<string, any>) {
  try {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const current = getStoredEmailSettings();
    const updated = {
      ...current,
      ...creds,
      updatedAt: Date.now(),
    };
    fs.writeFileSync(EMAIL_SETTINGS_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.warn("Could not write emailSettings.json:", e);
    return null;
  }
}

// API Route for Admin to Save Email Credentials strictly on Server
app.get("/api/get-email-settings", (req, res) => {
  try {
    const stored = getStoredEmailSettings();
    res.json({
      success: true,
      settings: {
        gmailUser: stored.gmailUser || process.env.GMAIL_USER || '',
        gmailAppPassword: stored.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '',
        adminNotificationEmail: stored.adminNotificationEmail || process.env.ADMIN_NOTIFICATION_EMAIL || '',
        appName: stored.appName || 'onliny'
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || "Failed to get email settings" });
  }
});

app.post("/api/save-email-settings", (req, res) => {
  try {
    const { gmailUser, gmailAppPassword, adminNotificationEmail, appName } = req.body;
    const toSave: any = {};
    if (gmailUser !== undefined) toSave.gmailUser = String(gmailUser).trim();
    if (gmailAppPassword !== undefined) toSave.gmailAppPassword = String(gmailAppPassword).trim();
    if (adminNotificationEmail !== undefined) toSave.adminNotificationEmail = String(adminNotificationEmail).trim();
    if (appName !== undefined) toSave.appName = String(appName).trim() || 'onliny';

    saveStoredEmailSettings(toSave);
    res.json({ success: true, message: "Email settings saved securely on server." });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message || "Failed to save email settings" });
  }
});

// API Route for Automatic Order Email Notification (100% Free via Gmail SMTP)
app.post("/api/send-order-email", async (req, res) => {
  try {
    const { order, credentials } = req.body;
    if (!order) {
      return res.status(400).json({ success: false, error: "Missing order payload" });
    }

    // Merge server-side stored credentials with any provided credentials
    const stored = getStoredEmailSettings();
    const effectiveCredentials = {
      ...stored,
      ...(credentials || {}),
      gmailUser: (credentials?.gmailUser || stored.gmailUser || process.env.GMAIL_USER || '').trim(),
      gmailAppPassword: (credentials?.gmailAppPassword || stored.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '').trim(),
      adminNotificationEmail: (credentials?.adminNotificationEmail || stored.adminNotificationEmail || process.env.ADMIN_NOTIFICATION_EMAIL || '').trim(),
      appName: credentials?.appName || stored.appName || 'onliny',
    };

    const result = await sendOrderNotificationEmail(order, effectiveCredentials);
    res.json(result);
  } catch (error: any) {
    console.error("Order Email Error:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to send order email" });
  }
});

// API Routes for Static JSON Catalog Management (Fast Offline Mode)
app.get("/api/catalog-data", (req, res) => {
  try {
    // Never cache static catalog data response so client devices always get latest snapshot
    res.set({
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    const catalogPath = path.resolve(process.cwd(), "data", "staticCatalog.json");
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      // Ensure sensitive credentials are NEVER leaked to public clients in staticCatalog
      if (parsed?.settings?.gmailAppPassword) {
        delete parsed.settings.gmailAppPassword;
      }
      return res.json({ success: true, data: parsed });
    }
    return res.json({ success: false, error: "Catalog file does not exist yet" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to read catalog file" });
  }
});

app.post("/api/save-catalog", (req, res) => {
  try {
    const { catalog } = req.body;
    if (!catalog) {
      return res.status(400).json({ success: false, error: "No catalog provided" });
    }

    // If catalog payload includes email credentials, save them securely in server config, NOT in public catalog
    if (catalog?.settings?.gmailAppPassword || catalog?.settings?.gmailUser) {
      saveStoredEmailSettings({
        gmailUser: catalog.settings.gmailUser,
        gmailAppPassword: catalog.settings.gmailAppPassword,
        adminNotificationEmail: catalog.settings.adminNotificationEmail,
      });
    }

    // Clone and sanitize catalog so gmailAppPassword is NEVER written into public staticCatalog.json
    const sanitizedCatalog = {
      ...catalog,
      settings: catalog.settings ? { ...catalog.settings } : {},
    };
    if (sanitizedCatalog.settings?.gmailAppPassword) {
      delete sanitizedCatalog.settings.gmailAppPassword;
    }

    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const catalogPath = path.join(dataDir, "staticCatalog.json");
    fs.writeFileSync(catalogPath, JSON.stringify(sanitizedCatalog, null, 2), "utf-8");
    res.json({ success: true, message: "Static catalog file updated successfully on server." });
  } catch (err: any) {
    console.error("Save catalog error:", err);
    res.status(500).json({ success: false, error: err?.message || "Failed to save static catalog file" });
  }
});

// API Route for Testing Email Delivery
app.post("/api/test-email", async (req, res) => {
  try {
    const { toEmail, credentials } = req.body;
    if (!toEmail) {
      return res.status(400).json({ success: false, error: "Missing recipient email" });
    }

    if (credentials?.gmailUser || credentials?.gmailAppPassword) {
      saveStoredEmailSettings(credentials);
    }

    const stored = getStoredEmailSettings();
    const effectiveCredentials = {
      ...stored,
      ...(credentials || {}),
      gmailUser: (credentials?.gmailUser || stored.gmailUser || process.env.GMAIL_USER || '').trim(),
      gmailAppPassword: (credentials?.gmailAppPassword || stored.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '').trim(),
      adminNotificationEmail: (credentials?.adminNotificationEmail || stored.adminNotificationEmail || toEmail).trim(),
      appName: credentials?.appName || stored.appName || 'Zivio Store',
    };

    const result = await sendTestEmail(toEmail, effectiveCredentials);
    res.json(result);
  } catch (error: any) {
    console.error("Test Email Error:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to send test email" });
  }
});

// API Route for Gemini AI Query Optimization
app.post("/api/gemini/optimize-query", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: "Missing query" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ success: true, data: { corrected_query: query, synonyms: [], category: "" } });
    }

    const prompt = `Aap ek e-commerce search query optimizer hain. User jo bhi product search karega, aapka kaam uske spelling mistakes (typos) ko theek karna, search term ke synonyms (milte-julte naam) nikalna, aur product category identify karta hai taake related products bhi show ho sakein.

Aapko hamesha JSON format mein response dena hai jisme yeh keys hon:
1. "corrected_query": Agar spelling galat hai toh uski sahi spelling, warna original query.
2. "synonyms": Related keywords ya milte-julte products ki list.
3. "category": Product kis category se belong karta hai.

Rules:
- Agar user bilkul ajeeb ya irrelevant cheez likhe, toh response empty ya generic rakhein.
- Koi extra text ya explanation nahi deni, sirf pure JSON return karna hai.

Input: "${query}"
Output:`;

    let responseText: string | undefined;
    try {
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              corrected_query: { type: Type.STRING },
              synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING }
            },
            required: ["corrected_query", "synonyms", "category"]
          }
        }
      });
      responseText = response.text;
    } catch (fallbackErr: any) {
      console.warn("Gemini Optimize Query unavailable, using query fallback:", fallbackErr?.message || fallbackErr);
    }

    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        return res.json({ success: true, data: result });
      } catch (e) {}
    }

    res.json({ success: true, data: { corrected_query: query, synonyms: [], category: "" } });
  } catch (error: any) {
    console.error("Gemini Optimize Query Error:", error?.message || error);
    res.json({ success: true, data: { corrected_query: req.body.query || "", synonyms: [], category: "" } });
  }
});

// API Route for Gemini AI Search Suggestions
app.post("/api/gemini/search", async (req, res) => {
  try {
    const { query, products } = req.body;
    if (!query || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: "Missing query or products list" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        data: {
          message: `Showing matching items for "${query}"`,
          productIds: products.slice(0, 20).map((p: any) => p.id)
        }
      });
    }

    const simplifiedProducts = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      description: p.description ? p.description.substring(0, 150) : '',
      shopName: p.shopName || 'Official Store'
    }));

    const productsJson = (() => {
        const cache = new WeakSet();
        return JSON.stringify(simplifiedProducts, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) return;
                cache.add(value);
            }
            return value;
        }, 2);
    })();

    const prompt = `
You are the Official AI shopping assistant for our e-commerce store. 
The customer is searching for: "${query}"

Here is the list of available products in our store:
${productsJson}

Instructions:
1. Analyze the customer query and find the products that match their intent best.
2. Provide a friendly, conversational, helpful response (max 2-3 sentences) in Urdu or English explaining what you found or suggesting options.
3. Extract an array of matching product ids, sorted by relevance. If no products match at all, return an empty array.
`;

    let responseText: string | undefined;
    try {
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              productIds: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["message", "productIds"]
          }
        }
      });
      responseText = response.text;
    } catch (fallbackErr: any) {
      console.warn("Gemini Search unavailable, using fallback matching:", fallbackErr?.message || fallbackErr);
    }

    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        return res.json({ success: true, data: result });
      } catch (e) {}
    }

    res.json({
      success: true,
      data: {
        message: `Showing matching items for "${query}"`,
        productIds: simplifiedProducts.slice(0, 20).map((p: any) => p.id)
      }
    });
  } catch (error: any) {
    console.error("Gemini Search Error:", error?.message || error);
    res.json({
      success: true,
      data: {
        message: `Showing matching items for "${req.body.query || ''}"`,
        productIds: Array.isArray(req.body.products) ? req.body.products.slice(0, 20).map((p: any) => p.id) : []
      }
    });
  }
});

// API Route for RAG (Retrieval-Augmented Generation) AI Search Flow
app.post("/api/gemini/rag-search", async (req, res) => {
  try {
    const { query, products } = req.body;
    if (!query || !products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, error: "Missing query or products list" });
    }

    // RETRIEVAL STAGE: Candidate Document Retrieval & Multi-field Index Scoring
    const rawQuery = String(query).toLowerCase().trim();
    const queryTokens = rawQuery.split(/\s+/).filter(Boolean);

    const candidateDocs = products
      .map((p: any) => {
        const customId = (p.customId || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const description = (p.description || '').toLowerCase();

        let initialScore = 0;
        if (customId === rawQuery || id === rawQuery) initialScore += 1000;
        else if (customId.includes(rawQuery) || id.includes(rawQuery)) initialScore += 500;

        queryTokens.forEach((token) => {
          if (name.includes(token)) initialScore += 100;
          if (category.includes(token)) initialScore += 80;
          if (description.includes(token)) initialScore += 20;
        });

        return {
          id: p.id,
          customId: p.customId || '',
          name: p.name || '',
          category: p.category || '',
          price: p.price || 0,
          description: p.description ? p.description.substring(0, 150) : '',
          shopName: p.shopName || 'Official Store',
          initialScore,
        };
      })
      .sort((a, b) => b.initialScore - a.initialScore)
      .slice(0, 40);

    // Check Cache
    const cacheKey = `rag:${rawQuery}`;
    const cachedResult = getCachedGeminiResponse(cacheKey);
    if (cachedResult) {
      return res.json({ success: true, data: cachedResult });
    }

    const ai = getGeminiClient();
    let responseText: string | undefined;

    if (ai) {
      const retrievedContextJson = JSON.stringify(candidateDocs, null, 2);
      const ragPrompt = `
You are the RAG (Retrieval-Augmented Generation) Search Intelligence Engine for our e-commerce store.

CUSTOMER SEARCH QUERY: "${query}"

RETRIEVED PRODUCT CONTEXT DOCUMENTS (Top Matches from Catalog Retrieval):
${retrievedContextJson}

TASK INSTRUCTIONS:
1. Intent Analysis: Determine what the customer is looking for (product type, attributes, target gender/age, or specific Product ID).
2. Category Identification: Identify the best category for this query.
3. Re-Ranking & Scoring: Evaluate each product in the retrieved context against customer intent. Assign a matchScore (0 to 100) and matchReason (e.g. "Exact Title Match", "Matching Custom Product ID", "Semantic Category Fit").
4. AI Shopping Summary: Write a clear 2-3 sentence helpful recommendation in Roman Urdu / English for the shopper.
5. Suggested Keywords: Provide 3-4 related search keywords or tags to help user explore.

Return pure JSON matching the requested schema.
`;

      try {
        const response = await callGeminiWithFallback(ai, {
          contents: ragPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                detectedIntent: { type: Type.STRING },
                detectedCategory: { type: Type.STRING },
                suggestedKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                aiSummary: { type: Type.STRING },
                rankedProductIds: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      matchScore: { type: Type.NUMBER },
                      matchReason: { type: Type.STRING }
                    },
                    required: ["id", "matchScore"]
                  }
                }
              },
              required: ["detectedIntent", "detectedCategory", "suggestedKeywords", "aiSummary", "rankedProductIds"]
            }
          }
        });
        responseText = response.text;
      } catch (fallbackErr: any) {
        console.warn("All Gemini models temporarily unavailable for RAG, seamlessly serving catalog index search:", fallbackErr?.message || fallbackErr);
      }
    }

    if (responseText) {
      try {
        const result = JSON.parse(responseText);
        setCachedGeminiResponse(cacheKey, result);
        return res.json({ success: true, data: result });
      } catch (e) {}
    }

    // Catalog Indexed Search Fallback
    const fallbackRanked = candidateDocs.map((p: any) => ({
      id: p.id,
      matchScore: Math.min(95, Math.max(50, Math.round((p.initialScore || 50) / 10))),
      matchReason: "Catalog Match"
    }));

    res.json({
      success: true,
      data: {
        detectedIntent: query,
        detectedCategory: candidateDocs[0]?.category || "All Products",
        suggestedKeywords: queryTokens.slice(0, 4),
        aiSummary: `Displaying matching catalog products for "${query}".`,
        rankedProductIds: fallbackRanked
      }
    });
  } catch (error: any) {
    console.error("Gemini RAG Search Error:", error?.message || error);
    res.json({
      success: true,
      data: {
        detectedIntent: req.body.query || "",
        detectedCategory: "All Products",
        suggestedKeywords: [],
        aiSummary: "Displaying matching catalog items...",
        rankedProductIds: []
      }
    });
  }
});

// Comprehensive High-Speed E-commerce Link Parser (Supports Markaz, Daraz, Shopify, WooCommerce, etc.)
async function parseProductUrl(url: string): Promise<{
  title: string | null;
  price: number | string | null;
  old_price?: number | string | null;
  category: string | null;
  description: string | null;
  image_urls: string[];
  size_categories?: { categoryName: string; sizes: string[] }[];
  sku?: string | null;
  delivery_time?: string | null;
  shipping_fee?: number | null;
  raw_context?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ur;q=0.8",
      }
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const html = await resp.text();

    let title: string | null = null;
    let description: string | null = null;
    let price: number | string | null = null;
    let oldPrice: number | string | null = null;
    let category: string | null = null;
    let sku: string | null = null;
    let deliveryTime: string | null = null;
    let shippingFee: number | null = null;
    const primaryImages: Set<string> = new Set();
    const imageUrls: Set<string> = new Set();
    const extractedSizes: Set<string> = new Set();
    const extractedColors: Set<string> = new Set();
    const extractedDesigns: Set<string> = new Set();

    // Helper to sanitize and normalize image URL to full resolution
    const addCleanImageUrl = (rawUrl: string, isPrimary = false) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      let clean = rawUrl.replace(/&amp;/g, '&').trim();
      
      const lower = clean.toLowerCase();
      if (lower.includes('logo') || lower.includes('favicon') || lower.includes('avatar') || lower.includes('icon') || lower.includes('badge')) {
        return;
      }

      // Handle Markaz / API image proxies
      if (clean.includes('/api/img?url=')) {
        try {
          const match = clean.match(/url=([^&]+)/);
          if (match && match[1]) {
            clean = decodeURIComponent(match[1]);
          }
        } catch (e) {}
      }

      // Convert Markaz thumbnails to full-resolution main product images
      if (clean.includes('static.markaz.app/pakistan/thumbnails/products/')) {
        clean = clean.replace('/thumbnails/products/', '/products/');
      }

      if (clean.startsWith('http://') || clean.startsWith('https://')) {
        if (isPrimary) {
          primaryImages.add(clean);
        }
        imageUrls.add(clean);
      }
    };

    // Known color lists and regex for advanced Color category extraction
    const KNOWN_COLORS = [
      "Black", "White", "Red", "Blue", "Navy Blue", "Navy", "Royal Blue", "Sky Blue", "Baby Blue", "Ice Blue",
      "Pink", "Baby Pink", "Rose", "Hot Pink", "Dusty Pink", "Blush Pink",
      "Green", "Dark Green", "Olive Green", "Olive", "Mint Green", "Mint", "Bottle Green", "Sea Green",
      "Yellow", "Mustard", "Lemon Yellow", "Orange", "Peach", "Rust",
      "Purple", "Lavender", "Lilac", "Violet", "Plum", "Magenta",
      "Maroon", "Burgundy", "Wine",
      "Brown", "Chocolate", "Coffee", "Beige", "Cream", "Off White", "Off-White", "Skin", "Khaki", "Camel",
      "Grey", "Gray", "Light Gray", "Light Grey", "Dark Gray", "Dark Grey", "Charcoal", "Ash Gray",
      "Silver", "Gold", "Golden", "Copper", "Bronze", "Teal", "Turquoise", "Cyan", "Coral", "Emerald",
      "Multicolour", "Multi-Color", "Multi Color", "Multi", "Printed", "Floral"
    ];
    const COLOR_SET = new Set(KNOWN_COLORS.map(c => c.toLowerCase()));

    const isRecognizedColor = (val: string): boolean => {
      if (!val || typeof val !== 'string') return false;
      const clean = val.trim().toLowerCase();
      if (COLOR_SET.has(clean)) return true;
      if (/^(?:dark|light|deep|bright|pale|neon|pastel|soft)\s+[a-z]+$/i.test(clean)) return true;
      return false;
    };

    const normalizeColor = (val: string): string => {
      const clean = val.trim();
      return clean.replace(/\b\w/g, l => l.toUpperCase());
    };

    const isStandardSize = (val: string): boolean => {
      if (!val || typeof val !== 'string') return false;
      const s = val.trim();
      if (/^(?:XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|Small|Medium|Large|Extra Large|Free Size|Standard|Unstitched|Stitched)$/i.test(s)) return true;
      if (/^\d+\s*cm$/i.test(s)) return true;
      if (/^\d+\s*inch(?:es)?$/i.test(s)) return true;
      if (/^\d+(?:-\d+)?\s*(?:Years?|Yrs?|Months?|M|Y)$/i.test(s)) return true;
      if (/^(?:3[4-9]|4[0-8]|5|6|7|8|9|10|11|12)(?:\s*(?:UK|US|EU|CM))?$/i.test(s)) return true;
      return false;
    };

    const isValidSizeValue = (str: string): boolean => {
      if (!str || typeof str !== 'string') return false;
      const s = str.trim();
      if (s.length === 0 || s.length > 50) return false;
      if (/^(?:Add to cart|Buy now|Reviews|Description|Share|View details|Features|Specifications|Quantity|Price|RS|PKR|Sale|Sold Out)$/i.test(s)) return false;
      if (isRecognizedColor(s)) return true;
      if (/^\d+\s*cm(?:-[A-Za-z0-9\s()_-]+)?$/i.test(s)) return true;
      if (/^\d+\s*inch(?:es)?(?:-[A-Za-z0-9\s()_-]+)?$/i.test(s)) return true;
      if (/^\d+(?:-\d+)?\s*(?:Years?|Yrs?|Months?|M|Y)(?:\s*\([^)]+\))?$/i.test(s)) return true;
      if (/^(?:XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|Small|Medium|Large|Extra Large|Free Size|Standard|Unstitched|Stitched)(?:\s*[-_/][A-Za-z0-9\s()_-]+|\s*\([^)]+\))?$/i.test(s)) return true;
      if (/^(?:3[4-9]|4[0-8]|5|6|7|8|9|10|11|12)(?:\s*(?:UK|US|EU|CM))?$/i.test(s)) return true;
      if (/^(?:1 Piece|2 Piece|3 Piece|2 PC|3 PC|Single|Pair|Set of \d+|Pack of \d+)$/i.test(s)) return true;
      if (/^\d+(?:\.\d+)?\s*(?:ml|gm|g|kg|meter|yards?)$/i.test(s)) return true;
      return false;
    };

    const decomposeVariantToken = (
      rawToken: string,
      outSizes: Set<string>,
      outColors: Set<string>,
      outDesigns: Set<string>
    ) => {
      if (!rawToken || typeof rawToken !== 'string') return;
      const token = rawToken.trim();
      if (!token || token.length > 80) return;

      if (/^(?:Add to cart|Buy now|Reviews|Description|Share|View details|Features|Specifications|Quantity|Price|RS|PKR|Sale|Sold Out)$/i.test(token)) return;

      // Direct color
      if (isRecognizedColor(token)) {
        outColors.add(normalizeColor(token));
        return;
      }

      // Direct standard size
      if (isStandardSize(token)) {
        outSizes.add(token.toUpperCase());
        return;
      }

      // Protect range numbers like 2-3 Years or 80-90cm
      const protectedStr = token.replace(/(\d+)\s*-\s*(\d+)/g, '$1~TO~$2');
      // Split on punctuation: #, /, |, _, :, +, ,, or -
      const parts = protectedStr
        .split(/\s*[\/#|:+,_]\s*|\s+-\s*|\s*-(?=[A-Za-z0-9])/)
        .map(p => p.replace(/~TO~/g, '-').trim())
        .filter(Boolean);

      if (parts.length >= 2) {
        for (const part of parts) {
          if (isRecognizedColor(part)) {
            outColors.add(normalizeColor(part));
          } else if (isStandardSize(part)) {
            outSizes.add(part.toUpperCase());
          } else if (/^\d+\s*cm$/i.test(part) || /^\d+(?:-\d+)?\s*(?:Years?|Yrs?|Months?|M|Y)$/i.test(part)) {
            outSizes.add(part);
          } else if (part.length >= 2 && part.length <= 40 && !/^(?:RS|PKR|\d+)$/i.test(part)) {
            outDesigns.add(normalizeColor(part));
          }
        }
        return;
      }

      if (isValidSizeValue(token)) {
        outSizes.add(token);
      }
    };

    // Recursive JSON product scanner for Next.js / Markaz / React Query
    const findProductInObject = (obj: any, depth = 0): any | null => {
      if (!obj || typeof obj !== 'object' || depth > 6) return null;
      if ((obj.title || obj.name || obj.product_name) && (obj.id || obj.product_id || obj.wholesale_price || obj.sale_price || obj.price || obj.images || obj.product_images)) {
        return obj;
      }
      for (const k of Object.keys(obj)) {
        if (k === 'config' || k === 'headers') continue;
        const found = findProductInObject(obj[k], depth + 1);
        if (found) return found;
      }
      return null;
    };

    // 1b. Extract Product ID / SKU from URL path (e.g. Markaz /product/slug/761725 or Daraz /products/i12345.html)
    const markazPathIdMatch = url.match(/\/product\/[^\/]+\/([A-Za-z0-9_\-]+)/i) || url.match(/\/i?(\d{4,12})(?:\.html|\?|#|$)/i);
    if (markazPathIdMatch && markazPathIdMatch[1]) {
      sku = markazPathIdMatch[1];
    }

    // Fallback title from URL slug (highly reliable for Markaz/Daraz)
    if (!title) {
      const slugMatch = url.match(/\/product\/([^\/?#]+)/i) || url.match(/\/p\/([^\/?#]+)/i);
      if (slugMatch && slugMatch[1]) {
        title = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Remove ID if it's at the end of slug
        title = title.replace(/\s+\d+$/, '').trim();
      }
    }

    // 1c. Next.js __NEXT_DATA__ script block parsing (Markaz, Daraz, Shopify, Next.js e-commerce)
    const nextDataMatch = html.match(/<script\s+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch && nextDataMatch[1]) {
      try {
        const nextJson = JSON.parse(nextDataMatch[1]);
        const pObj = findProductInObject(nextJson);

        if (pObj) {
          if ((!title || title === "Imported Product") && (pObj.title || pObj.name || pObj.product_name || pObj.item_name)) {
            title = pObj.title || pObj.name || pObj.product_name || pObj.item_name;
          }
          if (!description && (pObj.description || pObj.details || pObj.summary || pObj.product_details)) {
            description = pObj.description || pObj.details || pObj.summary || pObj.product_details;
          }
          if (!sku && (pObj.id || pObj.product_id || pObj.sku || pObj.code || pObj.custom_id || pObj.product_code)) {
            sku = String(pObj.id || pObj.product_id || pObj.sku || pObj.code || pObj.custom_id || pObj.product_code);
          }
          if (price === null) {
            price = pObj.wholesale_price || pObj.sale_price || pObj.price || pObj.retail_price || pObj.min_price || pObj.max_price || pObj.wholesalePrice || pObj.salePrice || null;
          }
          if (!category && (pObj.category || pObj.category_name || pObj.cat_name)) {
            category = typeof pObj.category === 'string' ? pObj.category : (pObj.category?.name || pObj.category_name || pObj.cat_name);
          }

          // Images array in Next.js pageProps
          const rawImgs = pObj.images || pObj.product_images || pObj.media || pObj.photos || pObj.gallery || pObj.image_list || [];
          if (Array.isArray(rawImgs)) {
            rawImgs.forEach((imgItem: any) => {
              const imgUrl = typeof imgItem === 'string' ? imgItem : (imgItem?.url || imgItem?.src || imgItem?.image_url || imgItem?.full_url || imgItem?.original);
              if (imgUrl) addCleanImageUrl(imgUrl);
            });
          }

          // Variants / Sizes / Colors
          const rawVariants = pObj.variants || pObj.options || pObj.attributes || pObj.sizes || pObj.colors || pObj.product_variants || [];
          if (Array.isArray(rawVariants)) {
            rawVariants.forEach((v: any) => {
              const vName = typeof v === 'string' ? v : (v.name || v.value || v.title || v.size || v.color || v.attribute_value || v.label);
              if (vName && typeof vName === 'string') {
                if (isRecognizedColor(vName)) extractedColors.add(vName.charAt(0).toUpperCase() + vName.slice(1));
                else if (isValidSizeValue(vName)) extractedSizes.add(vName);
              }
            });
          }
        }
      } catch (err) {}
    }

    // 1d. Aggressive Image Scanning
    const allImgMatches = [...html.matchAll(/(?:src|data-src|data-lazy-src|data-original|data-zoom|image|url)["']\s*[:=]\s*["'](https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp|gif))["']/gi)];
    for (const im of allImgMatches) {
      addCleanImageUrl(im[1]);
    }
    const directUrlMatches = [...html.matchAll(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"']*)?/gi)];
    for (const dm of directUrlMatches) {
      if (dm[0].includes('products') || dm[0].includes('item') || dm[0].includes('static')) {
        addCleanImageUrl(dm[0]);
      }
    }
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

              // Images in schema (highest resolution preview images)
              if (item.image) {
                if (Array.isArray(item.image)) {
                  item.image.forEach((img: any) => {
                    const u = typeof img === "string" ? img : img?.url;
                    if (u && typeof u === "string") addCleanImageUrl(u, true);
                  });
                } else if (typeof item.image === "string") {
                  addCleanImageUrl(item.image, true);
                } else if (item.image?.url) {
                  addCleanImageUrl(item.image.url, true);
                }
              }

              // Sizes in schema
              if (item.size) {
                if (Array.isArray(item.size)) item.size.forEach((s: string) => extractedSizes.add(String(s).trim()));
                else if (typeof item.size === 'string') extractedSizes.add(item.size.trim());
              }

              // Offer & Pricing
              if (item.offers) {
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
                if (offer && (offer.price !== undefined || offer.lowPrice !== undefined)) {
                  price = offer.price || offer.lowPrice;
                }
                if (offer?.shippingDetails?.shippingRate?.value) {
                  shippingFee = parseFloat(offer.shippingDetails.shippingRate.value);
                }
                if (offer?.shippingDetails?.deliveryTime) {
                  const min = offer.shippingDetails.deliveryTime.transitTime?.minValue;
                  const max = offer.shippingDetails.deliveryTime.transitTime?.maxValue;
                  if (min && max) deliveryTime = `${min}-${max} Days Delivery`;
                }
              }
            }

            // Breadcrumb List for category
            if (item["@type"] === "BreadcrumbList" && Array.isArray(item.itemListElement)) {
              const crumbs = item.itemListElement
                .map((el: any) => el.name || el.item?.name)
                .filter(Boolean);
              if (crumbs.length > 2 && !category) {
                category = crumbs.slice(1, -1).join(" > ");
              }
            }
          }
        } catch (ldErr) {
          // continue parsing
        }
      }
    }

    // 2. OpenGraph / Twitter / Meta Fallbacks
    const ogMatches = [...html.matchAll(/<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi)];
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
      description = meta["og:description"] || meta["twitter:description"] || meta["description"] || null;
    }
    if (meta["og:image"]) addCleanImageUrl(meta["og:image"]);
    if (meta["twitter:image"]) addCleanImageUrl(meta["twitter:image"]);

    // 3b. Extract Product ID / SKU from URL parameters or HTML meta
    if (!sku) {
      const urlSkuMatch = url.match(/[?&](?:productId|product_id|sku|item_id|itemId|code|id)=([A-Za-z0-9_\-]+)/i);
      if (urlSkuMatch && urlSkuMatch[1]) {
        sku = urlSkuMatch[1];
      }
    }
    if (!sku) {
      const htmlSkuMatch = html.match(/(?:Product\s*ID|Product\s*Code|SKU|Item\s*Code|Code|ID)\s*[:：\-#]?\s*([A-Za-z0-9_\-]+)/i)
        || html.match(/"(?:sku|product_id|productId|productCode|customId)"\s*:\s*"([^"]+)"/i);
      if (htmlSkuMatch && htmlSkuMatch[1]) {
        sku = htmlSkuMatch[1].trim();
      }
    }

    // 3c. Extract all <img> src, data-src, data-lazy-src, data-zoom-image
    const imgMatches = [...html.matchAll(/<img[^>]+(?:src|data-src|data-lazy-src|data-original|data-zoom-image)=["']([^"']+)["']/gi)];
    for (const im of imgMatches) {
      if (im[1] && (im[1].startsWith('http://') || im[1].startsWith('https://'))) {
        addCleanImageUrl(im[1]);
      }
    }

    // 3. Fallback Title extraction from <title> tag
    if (!title) {
      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTag && titleTag[1]) {
        title = titleTag[1].trim();
      }
    }

    // Final Title Cleanup
    if (!title || title === "Imported Product") {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (h1Match && h1Match[1]) {
        const h1Title = h1Match[1].replace(/<[^>]+>/g, ' ').trim();
        if (h1Title.length > 10) title = h1Title;
      }
    }

    if (title) {
      title = title
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s*[–\-\|]\s*Markaz.*$/i, "")
        .replace(/\s*[–\-\|]\s*Daraz.*$/i, "")
        .replace(/\s*[–\-\|]\s*Online.*$/i, "")
        .trim();
    }

    // 4. Fallback Price Extraction from HTML / text / Markaz JSON keys
    if (price === null) {
      const priceTagMatch = html.match(/"(?:wholesale_price|wholesalePrice|sale_price|price|retail_price|amount|price_info)"\s*[:：]\s*"?([0-9,]+(?:\.[0-9]{2})?)"?/i)
        || html.match(/(?:PKR|Rs\.?)\s*(?:<!-- -->\s*)*([0-9,]+(?:\.[0-9]{2})?)/i) 
        || html.match(/(?:price|amount)["']?\s*[:：]\s*["']?([0-9,]+(?:\.[0-9]{2})?)/i);
      if (priceTagMatch && priceTagMatch[1]) {
        price = priceTagMatch[1].replace(/,/g, "");
      }
    }

    // 4b. Direct Markaz & E-commerce Product Specs & Variant Parser (from li, dt/dd, specifications)
    const specItems: { key: string; value: string }[] = [];
    const markazLiMatches = [...html.matchAll(/<li>\s*([^:<]+?)\s*:\s*([^<]+?)\s*<\/li>/gi)];
    for (const lm of markazLiMatches) {
      const k = lm[1].replace(/&#x27;/g, "'").trim();
      const v = lm[2].replace(/&#x27;/g, "'").trim();
      specItems.push({ key: k, value: v });
    }
    const markazDtMatches = [...html.matchAll(/<dt[^>]*>\s*([^<]+?)\s*<\/dt>\s*<dd[^>]*>\s*([^<]+?)\s*<\/dd>/gi)];
    for (const dm of markazDtMatches) {
      const k = dm[1].replace(/&#x27;/g, "'").trim();
      const v = dm[2].replace(/&#x27;/g, "'").trim();
      specItems.push({ key: k, value: v });
    }

    for (const spec of specItems) {
      const kLower = spec.key.toLowerCase();
      if (kLower.includes('size')) {
        const parsedSizes = spec.value.split(/[,|\/\+]/).map(s => s.trim()).filter(Boolean);
        for (const s of parsedSizes) {
          if (isRecognizedColor(s)) {
            extractedColors.add(s.charAt(0).toUpperCase() + s.slice(1));
          } else if (isValidSizeValue(s) || s.length < 30) {
            extractedSizes.add(s);
          }
        }
      } else if (kLower.includes('color') || kLower.includes('colour')) {
        const parsedColors = spec.value.split(/[,|\/\+]/).map(s => s.trim()).filter(Boolean);
        for (const c of parsedColors) {
          if (isRecognizedColor(c) || c.length < 25) {
            extractedColors.add(c.charAt(0).toUpperCase() + c.slice(1));
          }
        }
      } else if (kLower.includes('code') || kLower.includes('sku') || kLower.includes('id')) {
        if (!sku) sku = spec.value.trim();
      }
    }

    // Append Markaz specifications to description if available
    if (specItems.length > 0) {
      const formattedSpecs = specItems
        .filter(s => !s.key.toLowerCase().includes('note'))
        .map(s => `• ${s.key}: ${s.value}`)
        .join('\n');
      if (!description) {
        description = formattedSpecs;
      } else if (!description.includes(specItems[0].key)) {
        description = `${description}\n\nProduct Details:\n${formattedSpecs}`;
      }
    }

    // 5. Extract Product Sizes from text, descriptions, JSON, and interactive HTML elements
    const rawText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");

    let detectedCategoryName: string | null = null;

    // Advanced Regex for all variant headings (Size-Color, Color-Size, Sizes, Colors, etc.)
    const variantHeadingMatches = [...rawText.matchAll(/(?:Size[-\s]*Color|Color[-\s]*Size|Suitable\s+for\s+(?:height|size)[-\s]*(?:Color|Colour)?|Available\s+Colors?|Colors?\s+Available|Colours?|Colors?|Available\s+Sizes?|Sizes?\s+Available|Sizes?|Age\s+Sizes?|Size\s+Range|Age|Shoe\s+Sizes?|Shoe\s+Size|Type|Rung)\s*[:：\-]\s*([A-Za-z0-9\s,\-\/\.()_#]{2,400})/gi)];
    for (const vm of variantHeadingMatches) {
      const headingLower = vm[0].toLowerCase();
      if (headingLower.includes('height')) {
        detectedCategoryName = "Suitable for height";
      } else if (headingLower.includes('shoe')) {
        detectedCategoryName = "Shoe Size";
      } else if (headingLower.includes('age')) {
        detectedCategoryName = "Age / Size";
      }

      const chunk = vm[1];
      const items = chunk.split(/[,|\/\n&]/).map(s => s.trim()).filter(Boolean);
      for (const it of items) {
        decomposeVariantToken(it, extractedSizes, extractedColors, extractedDesigns);
      }
    }

    // Look in inline JSON, script tags (e.g. Next.js __NEXT_DATA__, Shopify window.ShopifyAnalytics, Daraz data objects)
    const jsonStateMatches = [...html.matchAll(/<(?:script|div)[^>]*>(.*?(?:variants|options|skuBase|variation|sizes)["'].*?)<\/(?:script|div)>/gi)];
    for (const jm of jsonStateMatches) {
      const block = jm[1];
      const sizeValMatches = [...block.matchAll(/(?:"name"|"title"|"label"|"option")\s*:\s*"(?:Size|Sizes|Age|Height|Dimension|Colour|Color|Suitable for height|Select Size|Variation)"[^}]*?"values"\s*:\s*\[([^\]]+)\]/gi)];
      for (const svm of sizeValMatches) {
        const vals = svm[1].replace(/"/g, '').split(',').map(s => s.trim()).filter(Boolean);
        vals.forEach(v => {
          decomposeVariantToken(v, extractedSizes, extractedColors, extractedDesigns);
        });
      }
    }

    // Direct JSON variation property matches: "size": "80cm-Pink", "variation": "90cm-Pink (daddy)", "color": "Navy Blue"
    const inlineSizeMatches = [...html.matchAll(/"(?:size|variation|variant_title|sku_property_name|option1|option2|prop_name|color|colour)"\s*:\s*"([^"]+)"/gi)];
    for (const sm of inlineSizeMatches) {
      decomposeVariantToken(sm[1], extractedSizes, extractedColors, extractedDesigns);
    }

    // Extract Product Sizes & Colors from interactive Buttons, Options, Pills, Spans, Labels on page
    const interactiveMatches = [...html.matchAll(/<(?:button|span|div|a|li|option|label)[^>]+(?:class|id|data-testid|aria-label)*=["'][^"']*(?:size|variant|sku|option|pill|badge|radio|selector|color|colour)[^"']*["'][^>]*>([\s\S]*?)<\/(?:button|span|div|a|li|option|label)>/gi)];
    for (const bm of interactiveMatches) {
      const cleanTxt = bm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      decomposeVariantToken(cleanTxt, extractedSizes, extractedColors, extractedDesigns);
    }

    // All standard buttons and labels
    const allButtons = [...html.matchAll(/<(?:button|label)[^>]*>([\s\S]*?)<\/(?:button|label)>/gi)];
    for (const bm of allButtons) {
      const cleanTxt = bm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      decomposeVariantToken(cleanTxt, extractedSizes, extractedColors, extractedDesigns);
    }

    // Select option tags
    const optionMatches = [...html.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/gi)];
    for (const om of optionMatches) {
      const cleanTxt = om[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      decomposeVariantToken(cleanTxt, extractedSizes, extractedColors, extractedDesigns);
    }

    const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL', '6XL', 'FREE SIZE', 'STANDARD', 'UNSTITCHED'];

    const sortSizes = (sizes: string[]): string[] => {
      return [...sizes].sort((a, b) => {
        const aIdx = SIZE_ORDER.indexOf(a.toUpperCase());
        const bIdx = SIZE_ORDER.indexOf(b.toUpperCase());
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      });
    };

    let sizeCategories: { categoryName: string; sizes: string[] }[] = [];

    // 1. Add Color Category if colors are found
    if (extractedColors.size > 0) {
      sizeCategories.push({
        categoryName: "Color",
        sizes: Array.from(extractedColors)
      });
    }

    // 2. Add Size Category if sizes are found
    if (extractedSizes.size > 0) {
      const pureSizes = sortSizes(Array.from(extractedSizes));
      const finalCategoryName = detectedCategoryName || (
        pureSizes.some(s => /height|cm/i.test(s)) ? "Suitable for height" :
        pureSizes.some(s => /Year|Yr|Month/i.test(s)) ? "Age / Size" :
        pureSizes.some(s => /^(?:3[4-9]|4[0-8])$/.test(s)) ? "Shoe Size" : "Size"
      );

      sizeCategories.push({
        categoryName: finalCategoryName,
        sizes: pureSizes
      });
    }

    // 3. Add Design / Style Category if distinct styles are found
    if (extractedDesigns.size > 0) {
      sizeCategories.push({
        categoryName: "Design / Style",
        sizes: Array.from(extractedDesigns)
      });
    }

    if (sizeCategories.length === 0) {
      // Check if product explicit type is mentioned in text
      const combinedText = `${title || ''} ${description || ''} ${category || ''} ${url}`.toLowerCase();
      if (/unstitched|un-stitched|3\s*pc|2\s*pc\s*suit|lawn\s*suit/.test(combinedText)) {
        sizeCategories.push({ categoryName: "Type", sizes: ["Unstitched"] });
      } else if (/free\s*size|standard\s*size/.test(combinedText)) {
        sizeCategories.push({ categoryName: "Size", sizes: ["Free Size"] });
      }
    }

    // Text sample for Gemini enhancement if needed
    const textSample = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    const finalImageUrls = primaryImages.size > 0 
      ? Array.from(primaryImages) 
      : Array.from(imageUrls);

    return {
      title,
      price,
      old_price: oldPrice,
      category,
      description,
      image_urls: finalImageUrls.slice(0, 10),
      size_categories: sizeCategories,
      sku,
      delivery_time: deliveryTime,
      shipping_fee: shippingFee,
      raw_context: textSample
    };
  } catch (err: any) {
    console.warn("Product URL parsing notice:", err?.message || err);
    return {
      title: null,
      price: null,
      category: null,
      description: null,
      image_urls: [],
      size_categories: [],
      raw_context: ""
    };
  }
}

// Unified E-Commerce AI Assistant Route (Type 1: Product Extraction / Type 2: Search Query)
app.post("/api/gemini/assistant", async (req, res) => {
  try {
    const { input, preferredType } = req.body;
    if (!input || typeof input !== "string" || !input.trim()) {
      return res.status(400).json({ success: false, error: "Missing user input" });
    }

    const trimmedInput = input.trim();
    const urlMatch = trimmedInput.match(/https?:\/\/[^\s]+/i);

    // If user provided a product link, immediately fetch and parse structured product data
    if (urlMatch || preferredType === "product_extraction") {
      let parsedLinkData: any = null;
      if (urlMatch) {
        parsedLinkData = await parseProductUrl(urlMatch[0]);
      }

      // If we directly extracted high-quality structured data from Markaz/Daraz/Store (Title & Price or Images exist)
      if (parsedLinkData && (parsedLinkData.title || parsedLinkData.image_urls.length > 0)) {
        // Fast Direct Response if structured data is complete!
        const productResult = {
          title: parsedLinkData.title || "Imported Product",
          price: parsedLinkData.price ? parseFloat(String(parsedLinkData.price).replace(/[^0-9.]/g, "")) : null,
          category: parsedLinkData.category || "General",
          description: parsedLinkData.description || (parsedLinkData.title ? `${parsedLinkData.title}. Cash on delivery available across Pakistan.` : ""),
          image_urls: parsedLinkData.image_urls || [],
          size_categories: parsedLinkData.size_categories || [],
          sku: parsedLinkData.sku || null,
          delivery_time: parsedLinkData.delivery_time || "Delivery in 3-5 Days",
          shipping_fee: parsedLinkData.shipping_fee || 0
        };

        // Try quick Gemini refinement in parallel with a fast 2.5s fallback to enhance title, description, category, and size_categories
        const ai = getGeminiClient();
        if (ai) {
          try {
            const prompt = `You are an expert E-Commerce product parser.
Analyze this product information extracted from a web link or store page.

Product Title: "${productResult.title}"
Current Variants/Sizes/Colors Found on Page: ${JSON.stringify(productResult.size_categories)}
Raw Description / Page Content: "${productResult.description || parsedLinkData.raw_context || ''}"
Category hint: "${productResult.category}"
URL context: "${urlMatch[0]}"

TASK:
1. Clean and refine the product title. IF THE TITLE IS "Imported Product", YOU MUST GENERATE A NEW RELEVANT TITLE BASED ON THE DESCRIPTION OR URL SLUG.
2. Clean and format the description into neat points.
3. Detect the accurate category (e.g. Kids Clothing, Menswear, Womenswear, Shoes, Watches, Jewelry, Electronics).
4. STRICT COLOR & SIZE CATEGORY SEPARATION:
   - Extract only existing colors and sizes.
   - Separate "Color" and "Size" into distinct objects in the size_categories array.
   - For Markaz products, extract any color variants mentioned in the title or text.

Return ONLY valid JSON matching this schema:
{
  "title": "Clean concise product title",
  "price": ${productResult.price || "null"},
  "sku": "${productResult.sku || "Product ID / Code if found"}",
  "category": "Clean category name",
  "description": "Clean bullet-pointed product description",
  "size_categories": [
    {
      "categoryName": "Color or Size or Age / Size or Shoe Size",
      "sizes": ["Option 1", "Option 2"]
    }
  ],
  "image_urls": ${JSON.stringify(productResult.image_urls)}
}`;
            const response = await callGeminiWithFallback(ai, {
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
            if (response && response.text) {
              const cleanJson = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
              const cleaned = JSON.parse(cleanJson);
              if (cleaned) {
                if (cleaned.title) productResult.title = cleaned.title;
                if (cleaned.description) productResult.description = cleaned.description;
                if (cleaned.category) productResult.category = cleaned.category;
                if (cleaned.sku || cleaned.customId || cleaned.product_id) {
                  productResult.sku = cleaned.sku || cleaned.customId || cleaned.product_id;
                }
                if (cleaned.price && !isNaN(parseFloat(String(cleaned.price)))) {
                  productResult.price = parseFloat(String(cleaned.price).replace(/[^0-9.]/g, ""));
                }
                if (Array.isArray(cleaned.image_urls) && cleaned.image_urls.length > 0) {
                  const validImgs = cleaned.image_urls.filter((u: any) => typeof u === "string" && u.startsWith("http"));
                  if (validImgs.length > 0) {
                    productResult.image_urls = [...new Set([...productResult.image_urls, ...validImgs])];
                  }
                }
                if (Array.isArray(cleaned.size_categories) && cleaned.size_categories.length > 0) {
                  productResult.size_categories = cleaned.size_categories;
                }
              }
            }
          } catch (aiErr) {
            // Fast graceful fallback - structured data is already ready!
          }
        }

        return res.json({
          success: true,
          data: {
            type: "product_extraction",
            product: productResult
          }
        });
      }
    }

    // Standard Gemini Processing for raw text inputs or searches
    const systemPrompt = `You are an intelligent E-commerce AI Assistant built inside an online store app.

Your task is to handle TWO types of user inputs cleanly and accurately:

TYPE 1: PRODUCT LINK / PRODUCT RAW TEXT INPUT (For Add-Product or Auto-Fill Feature)
- If the user provides a product link, Markaz product link/text, or raw product text:
- Extract all available details: product title, description, category, price, size_categories, and image URLs.
- In size_categories, ALWAYS decompose combined variant codes into clean separate categories:
  1. "Color": All unique extracted colors (e.g. ['Green', 'Pink', 'Black', 'Light Gray', 'White', 'Red', 'Blue'])
  2. "Size" or "Age / Size" or "Suitable for height": All unique sizes (e.g. ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
  3. "Design / Style": If the token contains design/style names (e.g. 'Rose Letters', 'Three Girls', 'Two Cats', 'Floral', 'Striped'), extract them under "Design / Style"
- CRITICAL EXAMPLES OF VARIANT DECOMPOSITION:
  Example A: "Size-Color: XL-ROSE LETTERS# GREEN, XXL-Three Girls# Green, XL-Three Girls# Green, L-Rose Letter# Pink, M-Two cats# Green, XXL-Two cats# Pink"
  Must be decomposed into:
  - "Color": ["Green", "Pink"]
  - "Size": ["M", "L", "XL", "XXL"]
  - "Design / Style": ["Rose Letters", "Three Girls", "Two Cats"]
  
  Example B: "Size-Color: XXL-Light gray, M-Red, S-Red, XXXL-Black, XXL-Black, XL-Black, L-Black, M-Black, S-Black, XXXL-Light gray, S-White, XL-Light gray, L-Light gray, M-Light gray, S-Light gray, XXXL-White, XXL-White, XL-White, L-White, M-White"
  Must be decomposed into:
  - "Color": ["Black", "Light Gray", "Red", "White"]
  - "Size": ["S", "M", "L", "XL", "XXL", "XXXL"]

  Example C: "Sizes: S, M, L, XL"
  - "Size": ["S", "M", "L", "XL"]

  Example D: "Available Colors: Red, Green, Blue"
  - "Color": ["Blue", "Green", "Red"]

- STRICT FIDELITY: Extract all real sizes, colors, and designs present on the source. Do not omit them or leave them unparsed.
- Return ONLY a valid JSON object matching this structure (no extra markdown explanation):
{
  "type": "product_extraction",
  "product": {
    "title": "Product Title Here",
    "price": 1200,
    "category": "Estimated category (e.g. Clothing, Accessories, Electronics)",
    "description": "Short clean summary of the product",
    "size_categories": [
      {
        "categoryName": "Color",
        "sizes": ["Green", "Pink"]
      },
      {
        "categoryName": "Size",
        "sizes": ["M", "L", "XL", "XXL"]
      },
      {
        "categoryName": "Design / Style",
        "sizes": ["Rose Letters", "Three Girls", "Two Cats"]
      }
    ],
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
2. Do not add conversational filler outside the JSON object.
3. If an image URL or specific field is missing in raw text, set its value to null or empty array [].
4. NEVER return the raw URL as the product title or description. If parsing text, extract the real item name.
`;

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await callGeminiWithFallback(ai, {
          contents: `${systemPrompt}\n\nUser Input: ${trimmedInput}`,
          config: { responseMimeType: "application/json" }
        });
        if (response && response.text) {
          const cleanJson = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          return res.json({ success: true, data: parsed });
        }
      } catch (geminiErr: any) {
        console.warn("Gemini assistant fallback triggered:", geminiErr?.message || geminiErr);
      }
    }

    // Smart Heuristic Fallback (Extracts Title, Price, SKU/Product ID, Image URLs, Colors, and Sizes directly from raw text)
    if (preferredType === "product_extraction" || urlMatch) {
      const text = trimmedInput;
      let cleanTitle = text.split('\n')[0].replace(/^https?:\/\/[^\s]+/i, '').trim() || "Imported Product";

      // If title is weak and we have a URL, extract title from slug
      if ((cleanTitle === "Imported Product" || cleanTitle.length < 5) && urlMatch) {
        const slugMatch = urlMatch[0].match(/\/product\/([^\/?#]+)/i) || urlMatch[0].match(/\/p\/([^\/?#]+)/i);
        if (slugMatch && slugMatch[1]) {
          cleanTitle = slugMatch[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          cleanTitle = cleanTitle.replace(/\s+\d+$/, '').trim();
        }
      }

      // Extract SKU / Product ID
      const skuMatch = text.match(/(?:Product\s*ID|Product\s*Code|SKU|Item\s*Code|Code|ID)\s*[:：\-#]?\s*([A-Za-z0-9_\-]+)/i)
        || text.match(/[?&](?:productId|product_id|sku|item_id|itemId|code|id)=([A-Za-z0-9_\-]+)/i);
      const extractedSku = skuMatch ? skuMatch[1].trim() : null;

      // Extract Price
      const priceMatch = text.match(/(?:PKR|Rs\.?|Price)\s*[:：\-]?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
      const extractedPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

      // Extract Image URLs
      const extractedImages = [...new Set(text.match(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?[^\s"']*)?/gi) || [])];

      // Extract Colors
      const KNOWN_COLORS = ["Black", "White", "Red", "Blue", "Navy Blue", "Pink", "Green", "Yellow", "Purple", "Maroon", "Brown", "Grey", "Gold", "Silver", "Orange", "Peach"];
      const foundColors = KNOWN_COLORS.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(text));

      // Extract Sizes
      const KNOWN_SIZES = ["XS", "Small", "Medium", "Large", "Extra Large", "S", "M", "L", "XL", "XXL", "Free Size", "Unstitched"];
      const foundSizes = KNOWN_SIZES.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

      const sizeCats: { categoryName: string; sizes: string[] }[] = [];
      if (foundColors.length > 0) sizeCats.push({ categoryName: "Color", sizes: foundColors });
      if (foundSizes.length > 0) sizeCats.push({ categoryName: "Size", sizes: foundSizes });

      return res.json({
        success: true,
        data: {
          type: "product_extraction",
          product: {
            title: cleanTitle,
            price: extractedPrice,
            sku: extractedSku,
            category: "General",
            description: text,
            image_urls: extractedImages,
            size_categories: sizeCats,
            delivery_time: "Delivery in 3-5 Days",
            shipping_fee: 0
          }
        }
      });
    }

    res.json({
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
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error?.message || error);
    res.status(500).json({ success: false, error: error?.message || "Failed to process AI Assistant request" });
  }
});

// Dynamic Sitemap Route
app.get("/sitemap.xml", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "localhost:3000";
  const baseUrl = process.env.SITE_URL || `${proto}://${host}`; 
  const pages = ["", "/blog", "/categories", "/more", "/community"];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  pages.forEach(page => {
    xml += `<url><loc>${baseUrl}${page}</loc><changefreq>daily</changefreq><priority>${page === "" ? "1.0" : "0.8"}</priority></url>`;
  });
  xml += `</urlset>`;
  
  res.header("Content-Type", "application/xml");
  res.send(xml);
});

// Ultra-Short Product Link Route with Dynamic OpenGraph preview & Fast Redirection
app.get(["/p/:id", "/product/:id"], (req, res, next) => {
  // If request accepts HTML (browsers, social crawlers)
  const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || '');
  if (!id || id === 'undefined') return next();

  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "localhost:3000";
  const origin = `${proto}://${host}`;

  let product: any = null;
  let savedAppName = "onliny";
  let savedLogo = "";

  try {
    const catalogPath = path.resolve(process.cwd(), "data", "staticCatalog.json");
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed?.settings?.appName) savedAppName = parsed.settings.appName;
      if (parsed?.settings?.logoUrl) savedLogo = parsed.settings.logoUrl;
      const products = parsed?.products || [];
      product = products.find((p: any) => p.id === id || p.customId === id);
    }
  } catch (e) {}

  const rawTitle = product?.name || `Product - ${savedAppName}`;
  const fullTitle = `${rawTitle} | ${savedAppName}`;
  const rawDesc = product?.description || `Explore this product on ${savedAppName}. Best prices, cash on delivery, and quick delivery across Pakistan.`;
  const rawPrice = product?.price ? `Price: Rs. ${Number(product.price).toLocaleString()} - ` : '';
  const displayDesc = `${rawPrice}${rawDesc}`.slice(0, 200);

  let rawImage = product?.images?.[0] || savedLogo || '/pwa-512x512.png';
  if (rawImage.startsWith('/')) {
    rawImage = `${origin}${rawImage}`;
  }

  const targetPath = `/#/product/${encodeURIComponent(product?.id || id)}`;

  const escapeHtml = (text: string) => (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeTitle = escapeHtml(fullTitle);
  const safeDesc = escapeHtml(displayDesc);
  const safeImage = escapeHtml(rawImage);
  const safeAppName = escapeHtml(savedAppName);
  const safeTargetUrl = escapeHtml(targetPath);
  const safeCanonical = escapeHtml(`${origin}/p/${encodeURIComponent(id)}`);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / WhatsApp / Facebook / Telegram -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${safeAppName}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  
  <meta http-equiv="refresh" content="0;url=${safeTargetUrl}">
  <script>window.location.replace("${safeTargetUrl}");</script>
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff1f2;">
  <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 90%;">
    <h2 style="margin: 0 0 8px; color: #be123c;">${safeTitle}</h2>
    <p style="color: #64748b; font-size: 14px;">Opening product page...</p>
    <a href="${safeTargetUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #e11d48; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Click if not redirected</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Dynamic Social Share Route with OpenGraph tags for WhatsApp, Facebook, Twitter, Telegram
app.get("/share", (req, res) => {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.get("host") || "localhost:3000";
  const origin = `${proto}://${host}`;

  const type = String(req.query.type || 'store');
  const id = String(req.query.id || '');
  const rawTitle = String(req.query.title || 'Online Store');
  const rawDesc = String(req.query.desc || 'Discover amazing products, fast delivery, and verified quality.');
  let rawImage = String(req.query.image || '/favicon.svg');
  if (rawImage.startsWith('/')) {
    rawImage = `${origin}${rawImage}`;
  }
  const rawPrice = String(req.query.price || '');
  const rawAppName = String(req.query.app || 'Online Store');

  const fullTitle = rawTitle.includes(rawAppName) ? rawTitle : `${rawTitle} | ${rawAppName}`;
  const displayDesc = rawPrice 
    ? `Price: Rs. ${Number(rawPrice).toLocaleString()} - ${rawDesc}`
    : rawDesc;

  let targetPath = '/#/';
  if (type === 'product' && id) {
    targetPath = `/#/product/${encodeURIComponent(id)}`;
  } else if (type === 'category' && id) {
    targetPath = `/#/category/${encodeURIComponent(id)}`;
  } else if (type === 'standalone' && id) {
    targetPath = `/#/store/c/${encodeURIComponent(id)}`;
  }

  const escapeHtml = (text: string) => (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeTitle = escapeHtml(fullTitle);
  const safeDesc = escapeHtml(displayDesc);
  const safeImage = escapeHtml(rawImage);
  const safeAppName = escapeHtml(rawAppName);
  const safeTargetUrl = escapeHtml(targetPath);
  const canonicalUrl = `${origin}${req.originalUrl}`;
  const safeCanonical = escapeHtml(canonicalUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <meta name="title" content="${safeTitle}">
  <meta name="description" content="${safeDesc}">
  
  <!-- Open Graph / WhatsApp / Facebook / Telegram -->
  <meta property="og:type" content="${type === 'product' ? 'product' : 'website'}">
  <meta property="og:site_name" content="${safeAppName}">
  <meta property="og:url" content="${safeCanonical}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">
  
  <meta http-equiv="refresh" content="0;url=${safeTargetUrl}">
  <script>window.location.replace("${safeTargetUrl}");</script>
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff1f2;">
  <div style="background: white; padding: 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center;">
    <h2 style="margin: 0 0 8px; color: #be123c;">${safeTitle}</h2>
    <p style="color: #64748b; font-size: 14px;">Opening...</p>
    <a href="${safeTargetUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background: #e11d48; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Click if not redirected</a>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Helper to get latest saved store branding from disk
const getSavedStoreBranding = () => {
  let savedAppName = "onliny";
  let savedLogo = "";
  try {
    const catalogPath = path.resolve(process.cwd(), "data", "staticCatalog.json");
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed?.settings?.appName) savedAppName = parsed.settings.appName;
      if (parsed?.settings?.logoUrl) savedLogo = parsed.settings.logoUrl;
    }
  } catch (e) {}
  return { savedAppName, savedLogo };
};

// Core Icon Transformer / Streamer
const servePwaIcon = async (req: express.Request, res: express.Response, defaultSize: number, defaultMaskable: boolean = false) => {
  const size = parseInt(req.query.size as string, 10) || defaultSize;
  const isMaskable = req.query.maskable === "1" || req.query.maskable === "true" || defaultMaskable;
  const explicitUrl = ((req.query.url as string) || "").trim();

  const { savedLogo } = getSavedStoreBranding();
  const rawUrl = explicitUrl || savedLogo;

  const fallbackFile = isMaskable
    ? path.resolve("public/pwa-maskable-512x512.png")
    : size >= 512
    ? path.resolve("public/pwa-512x512.png")
    : size === 180
    ? path.resolve("public/apple-touch-icon.png")
    : path.resolve("public/pwa-192x192.png");

  if (!rawUrl) {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.sendFile(fallbackFile);
  }

  // Handle data URIs (e.g. data:image/png;base64,... or data:image/jpeg;base64,...)
  if (rawUrl.startsWith("data:")) {
    try {
      const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] || "image/png";
        const buffer = Buffer.from(match[2], "base64");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
        return res.send(buffer);
      }
    } catch (err) {
      console.warn("Failed to parse data URL icon:", err);
    }
  }

  try {
    let targetImageUrl = rawUrl;

    // If Cloudinary URL, transform dynamically to exact dimensions and padded background
    if (rawUrl.includes("res.cloudinary.com") && rawUrl.includes("/image/upload/")) {
      const padSize = isMaskable ? Math.round(size * 0.78) : size;
      const transform = isMaskable
        ? `c_pad,b_white,w_${padSize},h_${padSize}/c_pad,b_white,w_${size},h_${size},f_png`
        : `c_pad,b_white,w_${size},h_${size},f_png`;
      targetImageUrl = rawUrl.replace("/image/upload/", `/image/upload/${transform}/`);
    }

    const imgResponse = await fetch(targetImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (PWA-Icon-Fetcher)",
      },
    });

    if (!imgResponse.ok) {
      throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    }

    const contentType = imgResponse.headers.get("content-type") || "image/png";
    const arrayBuffer = await imgResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.send(buffer);
  } catch (error) {
    console.warn("Failed to fetch PWA icon, falling back to default:", error);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.sendFile(fallbackFile);
  }
};

// Dynamic PWA Icon Routes (Intercepts direct browser/device icon fetches for the admin logo)
app.get("/pwa-192x192.png", (req, res) => servePwaIcon(req, res, 192, false));
app.get("/pwa-512x512.png", (req, res) => servePwaIcon(req, res, 512, false));
app.get("/pwa-maskable-512x512.png", (req, res) => servePwaIcon(req, res, 512, true));
app.get("/apple-touch-icon.png", (req, res) => servePwaIcon(req, res, 180, false));
app.get("/apple-touch-icon-precomposed.png", (req, res) => servePwaIcon(req, res, 180, false));
app.get("/favicon.png", (req, res) => servePwaIcon(req, res, 192, false));
app.get("/api/pwa-icon", (req, res) => servePwaIcon(req, res, 192, false));

// Dynamic PWA Manifest Route (WebAPK compliant, same-origin HTTPS, supports vendor/store branding)
const handleManifestRequest = (req: express.Request, res: express.Response) => {
  const vendorId = ((req.query.vendor as string) || (req.query.v as string) || "").trim();
  const categoryId = ((req.query.category as string) || (req.query.c as string) || "").trim();
  const rawName = ((req.query.name as string) || "").trim();
  const rawLogo = ((req.query.logo as string) || "").trim();

  const { savedAppName, savedLogo } = getSavedStoreBranding();

  const appName = rawName || (vendorId ? "Vendor Store" : (categoryId ? "Category Store" : (savedAppName || "onliny")));
  const shortName = appName.length > 12 ? appName.slice(0, 12).trim() : appName;
  const startUrl = vendorId ? `/?vendor=${encodeURIComponent(vendorId)}` : (categoryId ? `/?category=${encodeURIComponent(categoryId)}` : "/");
  const manifestId = vendorId ? `/?vendor=${encodeURIComponent(vendorId)}` : (categoryId ? `/?category=${encodeURIComponent(categoryId)}` : "/");

  const effectiveLogo = rawLogo || savedLogo;
  const isDataUri = effectiveLogo && effectiveLogo.startsWith("data:");
  const icon192 = effectiveLogo
    ? (isDataUri ? effectiveLogo : `/pwa-192x192.png`)
    : "/pwa-192x192.png";
  const icon512 = effectiveLogo
    ? (isDataUri ? effectiveLogo : `/pwa-512x512.png`)
    : "/pwa-512x512.png";
  const iconMaskable = effectiveLogo
    ? (isDataUri ? effectiveLogo : `/pwa-maskable-512x512.png`)
    : "/pwa-maskable-512x512.png";

  const dynamicManifest = {
    id: manifestId,
    name: appName,
    short_name: shortName,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#be185d",
    description: `Official ${appName} storefront with verified products and fast delivery.`,
    prefer_related_applications: false,
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconMaskable,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        form_factor: "narrow",
        label: `${appName} Store`
      }
    ]
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, must-revalidate");
  return res.json(dynamicManifest);
};

app.get("/manifest.json", handleManifestRequest);
app.get("/api/manifest.json", handleManifestRequest);

// SEO Routes: Serve sitemap.xml and robots.txt explicitly with correct content-types
app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.resolve("public/sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    return res.sendFile(sitemapPath);
  }
  res.status(404).send("Sitemap not found");
});

app.get("/robots.txt", (req, res) => {
  const robotsPath = path.resolve("public/robots.txt");
  if (fs.existsSync(robotsPath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.sendFile(robotsPath);
  }
  res.status(404).send("Robots.txt not found");
});

// Global Express Error Handler Middleware (gracefully handles PayloadTooLargeError & JSON syntax errors)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      success: false,
      error: "Payload too large. Please upload smaller images or reduce content size."
    });
  }
  if (err && err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: "Invalid JSON format in request body." });
  }
  console.error("Unhandled Express Error:", err);
  res.status(500).json({ success: false, error: err?.message || "Internal server error" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not running in serverless environments (Vercel or Netlify)
  if (!process.env.VERCEL && !process.env.NETLIFY) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

// In serverless environments, we export the app and the handler handles the rest.
// In standalone environments, we start the server normally.
if (!process.env.VERCEL && !process.env.NETLIFY) {
  startServer();
}

export default app;

