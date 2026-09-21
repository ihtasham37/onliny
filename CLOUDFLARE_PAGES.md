# Cloudflare Pages Deployment Guide (Zivio)

Yeh app ab **Cloudflare Pages** per host hone ke liye mukammal tor per tayyar (fully configured) hai.

---

## 🚀 Quick Setup on Cloudflare Pages (Kadam ba Kadam)

### 1. GitHub / GitLab Repository Push
Apne project ko GitHub ya GitLab repository mein push karein:
```bash
git add .
git commit -m "Cloudflare Pages configuration ready for Zivio"
git push origin main
```

---

### 2. Cloudflare Dashboard Setup
1. **[Cloudflare Dashboard](https://dash.cloudflare.com)** par login karein.
2. Sidebar se **Compute (Workers & Pages)** par click karein.
3. **Create application** par click karein aur **Pages** tab select karein.
4. **Connect to Git** par click karein aur apni repository select karein.

---

### 3. Build Configuration Settings
Jab Cloudflare repository select karega, yeh settings set karein:

| Setting | Value |
| :--- | :--- |
| **Framework preset** | `React (Vite)` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave empty or slash) |

---

### 4. Environment Variables (Zaroori Settings)
**Environment variables (advanced)** section mein yeh variables add karein:

| Variable Name | Value / Description |
| :--- | :--- |
| `NODE_VERSION` | `20` |
| `VITE_FIREBASE_API_KEY` | `AIzaSyCnVWIVy4szPh5mtgqZR7o7FU1NdZKhDBM` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `e-commerse-ca95f.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | `https://e-commerse-ca95f-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_PROJECT_ID` | `e-commerse-ca95f` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `e-commerse-ca95f.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `186543384543` |
| `VITE_FIREBASE_APP_ID` | `1:186543384543:web:db1bc7a80f750f994c066a` |
| `GEMINI_API_KEY` | `AIzaSyDlLGz_GjqXXlQ7o8333ZqDgSmdcxKO_HA` |
| `CLOUDINARY_CLOUD_NAME` | `daafqfrqh` |
| `CLOUDINARY_API_KEY` | `551261625733394` |
| `CLOUDINARY_API_SECRET` | `7k8Cn1_vuMPuD3wv8KY79AJcxCw` |

---

### 5. Deploy karein
**Save and Deploy** button par click karein!
- Cloudflare automatically aapki app compile karega.
- 1 se 2 minute mein aapko ek free **`*.pages.dev`** domain mil jayega (e.g., `zivio.pages.dev`).
- **Custom Domain**: Dashboard mein ja kar aap apna personal `.com`, `.pk`, ya koi bhi custom domain 1 click mein connect kar sakte hain with **Free Cloudflare SSL**.

---

## 🛠 Is App Mein Cloudflare Pages Ke Liye Kya Configure Hua Hai?

1. **`public/_redirects` & `_redirects`**:
   - Single Page Application (SPA) routing rule: `/*  /index.html  200`
   - Is se mobile/desktop per kisi bhi link (jaise `/product/123`, `/categories`, `/track-order`) ko refresh ya direct open karne par 404 error nahi aayega.

2. **`public/_headers`**:
   - Cloudflare CDN edge caching headers configure hain.
   - Vite ke bundled assets (`/assets/*`) 1 saal ke liye immutable cache honge.
   - PWA Service Worker (`/sw.js`, `/service-worker.js`) aur `manifest.json` hamesha fresh revalidate honge taake app updates foran mil sakein.
   - Security headers (`X-Frame-Options`, `X-Content-Type-Options`) shamil hain.

3. **`public/_routes.json`**:
   - Cloudflare Pages routing rule: static assets ko global Edge CDN se serve karta hai aur `/api/*` requests ko Edge Functions per bhejta hai.

4. **`functions/api/` (Cloudflare Pages Edge Functions)**:
   - `/api/health`: Instant healthcheck route.
   - `/api/gemini/optimize-query` & `/api/gemini/rag-search`: Edge par chalne wala ultra-fast AI search aur catalog intelligence engine.
   - CORS headers pre-configured hain.

5. **`wrangler.toml`**:
   - Official Cloudflare Pages configuration file with `nodejs_compat` support.
