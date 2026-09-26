export const formatCurrency = (amount: number | null | undefined) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
};

export const safeLower = (value: string | undefined | null): string => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return "";
};

export const normalizeCategoryName = (val: string | undefined | null): string => {
  if (!val || typeof val !== 'string') return '';
  return val
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036"]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
};

export const matchCategory = (
  productCategory: string | undefined | null,
  targetCategory: { id: string; name: string } | string | undefined | null
): boolean => {
  if (!productCategory || !targetCategory) return false;
  const pNorm = normalizeCategoryName(productCategory);
  if (typeof targetCategory === 'string') {
    const tNorm = normalizeCategoryName(targetCategory);
    return productCategory === targetCategory || pNorm === tNorm;
  }
  const idNorm = normalizeCategoryName(targetCategory.id);
  const nameNorm = normalizeCategoryName(targetCategory.name);
  return (
    productCategory === targetCategory.id ||
    productCategory === targetCategory.name ||
    pNorm === idNorm ||
    pNorm === nameNorm
  );
};


export const normalizePhone = (phone: string): string => {
  if (typeof phone !== 'string') return '';
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // If it starts with '03', replace '0' with '92'
  if (digits.startsWith('03')) {
      digits = '92' + digits.substring(1);
  }
  return digits;
};

export const safeJsonStringify = (obj: any, indent?: number): string => {
  if (obj === undefined) return '';
  try {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'function' || typeof value === 'symbol') {
        return undefined;
      }
      if (typeof window !== 'undefined') {
        if (value instanceof Element || value instanceof Node || value instanceof Window || value instanceof Event) {
          return undefined;
        }
        if (typeof Image !== 'undefined' && value instanceof Image) {
          return undefined;
        }
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return undefined; // Break circular reference cleanly
        }
        seen.add(value);
      }
      return value;
    }, indent);
  } catch (error) {
    console.warn("safeJsonStringify encountered error, falling back to safe serialization:", error);
    try {
      // Fallback sanitizer
      const seen = new WeakSet();
      const clean = (val: any): any => {
        if (val === null || val === undefined) return val;
        if (typeof val !== 'object') return val;
        if (seen.has(val)) return undefined;
        seen.add(val);
        if (Array.isArray(val)) return val.map(clean).filter(v => v !== undefined);
        const res: Record<string, any> = {};
        for (const k of Object.keys(val)) {
          try {
            const v = clean(val[k]);
            if (v !== undefined) res[k] = v;
          } catch (e) {}
        }
        return res;
      };
      return JSON.stringify(clean(obj), null, indent);
    } catch (e) {
      return "{}";
    }
  }
};

export const generateCartItemKey = (item: { id: string; selectedSizes?: Record<string, string> }): string => {
  if (!item.selectedSizes || Object.keys(item.selectedSizes).length === 0) {
    return item.id;
  }
  // Create a stable key from selected sizes by sorting keys
  const sizesKey = Object.entries(item.selectedSizes)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  return `${item.id}-${sizesKey}`;
};

export const sanitizeForFirestore = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
  if (typeof window !== 'undefined' && (obj instanceof Element || obj instanceof Node || obj instanceof Window)) {
    return undefined;
  }
  if (typeof obj !== 'object') return obj;
  if (seen.has(obj)) return undefined; // Break circular reference
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeForFirestore(item, seen))
      .filter(item => item !== undefined);
  }

  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      const sanitized = sanitizeForFirestore(val, seen);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
  }
  return cleaned;
};

export const getSelectedSizesEntries = (selectedSizes: any): [string, any][] => {
  if (!selectedSizes) return [];
  if (typeof selectedSizes === 'string') {
    try {
      const parsed = JSON.parse(selectedSizes);
      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed);
      }
    } catch (e) {
      return [];
    }
  }
  if (typeof selectedSizes === 'object') {
    return Object.entries(selectedSizes);
  }
  return [];
};

export const getBaseAppUrl = (settings?: any) => {
  // Always use the active browser origin if available so receipt links (View Product, Track Order) always point to current app URL!
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    if (origin && !origin.includes('localhost:5173') && !origin.includes('zivio.pages.dev')) {
      return origin;
    }
  }
  let rawDomain = settings?.storeDomain?.trim();
  if (rawDomain && !rawDomain.toLowerCase().includes('zivio.pages.dev')) {
    rawDomain = rawDomain.replace(/\/+$/, '');
    if (!rawDomain.startsWith('http://') && !rawDomain.startsWith('https://')) {
      rawDomain = `https://${rawDomain}`;
    }
    return rawDomain;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return '';
};

export const getDisplayOrderId = (order: any) => {
    if (!order) return 'N/A';
    if (order.customId && order.customId.trim() && order.customId !== 'NIL') {
      return order.customId.trim();
    }
    if (order.id && order.id.trim()) {
      const idStr = order.id.trim();
      return idStr.startsWith('ORD-') ? idStr : `#${idStr.slice(0, 8).toUpperCase()}`;
    }
    const customIds = order.items?.map((i: any) => i.customId).filter(Boolean);
    if (customIds && customIds.length > 0) return customIds.join(', ');
    return 'N/A';
};

export const printHtmlContent = (html: string, title: string = 'Document', shopName: string = 'Receipt') => {
  const origin = window.location.origin;
  const fullDocumentHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <base href="${origin}/" />
        <title>${shopName} - ${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap');
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background-color: #faf5f0;
            color: #1e293b;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            -webkit-text-size-adjust: 100%;
          }

          body {
            padding: 16px 12px;
          }

          .receipt-page-wrapper {
            max-width: 680px;
            width: 100%;
            margin: 0 auto;
            box-sizing: border-box;
          }

          table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }

          td, th {
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            vertical-align: top;
          }

          a {
            color: #be185d !important;
            text-decoration: none;
            word-break: break-all !important;
            overflow-wrap: anywhere !important;
          }

          a:hover {
            text-decoration: underline;
          }

          .no-print-bar {
            text-align: center;
            margin-bottom: 16px;
          }

          .print-btn {
            background: linear-gradient(135deg, #be185d 0%, #9d174d 100%);
            color: #ffffff !important;
            border: none;
            padding: 12px 28px;
            border-radius: 9999px;
            font-weight: 700;
            cursor: pointer;
            font-size: 15px;
            box-shadow: 0 4px 14px rgba(190, 24, 93, 0.35);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
          }

          .print-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(190, 24, 93, 0.45);
          }

          @media print {
            body { 
              padding: 0 !important; 
              margin: 0 !important;
              background-color: #ffffff !important;
            }
            .no-print-bar {
              display: none !important;
            }
            .receipt-page-wrapper {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            @page {
              size: auto;
              margin: 10mm 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-page-wrapper">
          <div class="no-print-bar">
            <button class="print-btn" onclick="window.print()">
              <span>📄 Download / Save as PDF</span>
            </button>
          </div>
          ${html}
        </div>
        <script>
          setTimeout(function() {
            window.print();
          }, 600);
        </script>
      </body>
    </html>
  `;

  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(fullDocumentHtml);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('window.open was blocked, using iframe fallback for printing', e);
  }

  // Mobile fallback when popup windows are restricted
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(fullDocumentHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch(err) {}
        }, 2500);
      }, 600);
    }
  } catch (err) {
    alert('Please allow popups to print or save the PDF receipt.');
  }
};