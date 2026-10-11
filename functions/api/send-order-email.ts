// Cloudflare Pages Function: /api/send-order-email
import { sendUniversalEmail } from "../utils/smtpClient";

interface Env {
  GMAIL_USER?: string;
  SENDER_EMAIL?: string;
  SMTP_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  GMAIL_PASS?: string;
  SMTP_PASS?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  RECEIVER_EMAIL?: string;
  ADMIN_EMAIL?: string;
  BREVO_API_KEY?: string;
  RESEND_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  APP_NAME?: string;
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
    const order = body?.order;
    const credentials = body?.credentials || {};

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing order payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appName = env.APP_NAME || credentials.appName || order.storeName || "Onliny";
    
    // Resolve Sender Gmail
    const gmailUser = (
      env.GMAIL_USER ||
      env.SENDER_EMAIL ||
      env.SMTP_USER ||
      credentials.gmailUser ||
      ""
    ).trim();

    // Resolve Google App Password (16 characters)
    const gmailAppPassword = (
      env.GMAIL_APP_PASSWORD ||
      env.GMAIL_PASS ||
      env.SMTP_PASS ||
      credentials.gmailAppPassword ||
      ""
    ).trim();

    // Resolve Receiver / Admin Notification Email
    const adminEmail = (
      env.ADMIN_NOTIFICATION_EMAIL ||
      env.RECEIVER_EMAIL ||
      env.ADMIN_EMAIL ||
      credentials.adminNotificationEmail ||
      credentials.adminEmail ||
      gmailUser ||
      "ali10cart@gmail.com"
    ).trim();

    const customerEmail = (order.email || "").trim();
    const orderIdShort = String(order.id || "").slice(-6).toUpperCase();
    const formattedTotal = Number(order.total || 0).toLocaleString();

    // Build items HTML table
    const itemsTableHtml = (order.items || [])
      .map(
        (item: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; vertical-align: top; width: 60px;">
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; display: block;" />`
                : `<div style="width: 50px; height: 50px; background-color: #f1f5f9; border-radius: 8px; text-align: center; line-height: 50px; color: #94a3b8; font-size: 10px;">Product</div>`
            }
          </td>
          <td style="padding: 10px; vertical-align: top;">
            <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${item.name}</div>
            ${item.selectedSize ? `<span style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; color: #475569; margin-right: 4px;">Size: <strong>${item.selectedSize}</strong></span>` : ""}
            ${item.selectedColor ? `<span style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 10px; color: #475569;">Color: <strong>${item.selectedColor}</strong></span>` : ""}
          </td>
          <td style="padding: 10px; text-align: center; color: #334155; font-weight: bold; font-size: 13px;">x${item.quantity || 1}</td>
          <td style="padding: 10px; text-align: right; color: #e11d48; font-weight: bold; font-size: 13px;">Rs. ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const storeWhatsappRaw = (credentials.storeWhatsappNumber || env.STORE_WHATSAPP || "").trim();
    const storeOrigin = (credentials.storeOrigin || env.STORE_ORIGIN || "https://onliny.co.uk").replace(/\/+$/, "");
    const trackingUrl = `${storeOrigin}/#/track-order?id=${order.id}`;

    let storeWhatsappUrl = "";
    let displayStoreWa = storeWhatsappRaw;
    if (storeWhatsappRaw) {
      const cleanWaDigits = storeWhatsappRaw.replace(/\D/g, "");
      const fullWaNumber = cleanWaDigits.startsWith("0") ? "92" + cleanWaDigits.slice(1) : cleanWaDigits;
      if (fullWaNumber) {
        storeWhatsappUrl = `https://wa.me/${fullWaNumber}?text=${encodeURIComponent(`Salam, I have an inquiry about my order #${orderIdShort} on ${appName}.`)}`;
      }
    }

    const cleanCustomerPhone = String(order.customerPhone || "").replace(/\D/g, "");
    const waCustomerPhone = cleanCustomerPhone.startsWith("0") ? "92" + cleanCustomerPhone.slice(1) : cleanCustomerPhone;
    const adminCustomerWhatsappUrl = `https://wa.me/${waCustomerPhone}?text=${encodeURIComponent(`Salam ${order.customerName}, this is regarding your order #${orderIdShort} on ${appName}.`)}`;

    // 1. CUSTOMER ORDER CONFIRMATION EMAIL TEMPLATE (Clean, item details, tracking link, store WhatsApp if added)
    const customerHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 26px 20px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${appName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 600;">🎉 Order Confirmed! (آپ کا آرڈر موصول ہو گیا ہے)</p>
        </div>

        <div style="padding: 24px;">
          <!-- Greeting -->
          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
              Salam ${order.customerName || "Customer"},
            </p>
            <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
              ${appName} se shopping karne ka shukriya! Aap ka order kamyabi se book ho gaya hai aur delivery process shuru ho chuka hai.
            </p>
          </div>

          <!-- Order Summary Card -->
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 16px; margin-bottom: 22px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #9f1239; font-weight: 600; text-transform: uppercase;">Order Number</span>
              <span style="font-size: 14px; font-weight: 800; color: #e11d48;">#${orderIdShort}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; color: #9f1239; font-weight: 600; text-transform: uppercase;">Payment</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.paymentMethod || "Cash on Delivery (COD)"}</span>
            </div>
          </div>

          <!-- Ordered Items Table -->
          <h3 style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Items (${order.items?.length || 0})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Item</th>
                <th style="padding: 8px 10px;">Product Details</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableHtml}
            </tbody>
          </table>

          <!-- Bill Summary Breakdown -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 22px; border: 1px solid #f1f5f9;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>Rs. ${Number(order.subtotal || order.total || 0).toLocaleString()}</span>
            </div>
            ${
              order.shippingFee !== undefined
                ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <span>Delivery Charges:</span>
              <span>${Number(order.shippingFee) === 0 ? "FREE Delivery" : `Rs. ${Number(order.shippingFee).toLocaleString()}`}</span>
            </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px;">
              <span>Total Payable Bill:</span>
              <span style="color: #e11d48;">Rs. ${formattedTotal}</span>
            </div>
          </div>

          <!-- Track Order Button -->
          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(225,29,72,0.25);">
              📦 Track Your Order (آرڈر ٹریک کریں)
            </a>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">Click button to view real-time parcel dispatch status</p>
          </div>

          <!-- Store WhatsApp Support (Only if WhatsApp number is configured) -->
          ${
            storeWhatsappUrl
              ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin-top: 18px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #166534;">💬 Need Help or Have Questions?</p>
            <a href="${storeWhatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff; padding: 9px 18px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">
              Chat on WhatsApp (${displayStoreWa})
            </a>
          </div>`
              : ""
          }

        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">Official Order Receipt from <strong>${appName}</strong>. Thank you for your business!</p>
        </div>

      </div>
    </body>
    </html>
    `;

    // 2. ADMIN NEW ORDER ALERT EMAIL TEMPLATE (Full Customer address, phone, direct contact)
    const adminHtmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${appName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">🚨 New Order Received! (نیا آرڈر موصول ہوا ہے)</p>
        </div>

        <!-- Order Summary Pill -->
        <div style="padding: 24px 24px 16px 24px;">
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #9f1239; font-weight: 600; text-transform: uppercase;">Order Number</span>
              <span style="font-size: 14px; font-weight: 800; color: #e11d48;">#${orderIdShort}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 12px; color: #9f1239; font-weight: 600; text-transform: uppercase;">Payment Method</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${order.paymentMethod || "Cash on Delivery (COD)"}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 12px; color: #9f1239; font-weight: 600; text-transform: uppercase;">Total Bill</span>
              <span style="font-size: 16px; font-weight: 800; color: #e11d48;">Rs. ${formattedTotal}</span>
            </div>
          </div>

          <!-- Customer Details -->
          <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Customer Delivery Info</h3>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
            <div>👤 <strong>Name:</strong> ${order.customerName || "N/A"}</div>
            <div>📞 <strong>Phone:</strong> <a href="tel:${order.customerPhone}" style="color: #e11d48; text-decoration: none; font-weight: bold;">${order.customerPhone || "N/A"}</a></div>
            ${order.email ? `<div>✉️ <strong>Email:</strong> ${order.email}</div>` : ""}
            ${order.city ? `<div>🏙️ <strong>City:</strong> ${order.city}</div>` : ""}
            <div>📍 <strong>Address:</strong> ${order.shippingAddress || "N/A"}</div>
            ${order.deliveryNotes ? `<div>📝 <strong>Note:</strong> ${order.deliveryNotes}</div>` : ""}
            
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
              <a href="${adminCustomerWhatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px;">
                💬 Open WhatsApp Chat with Customer (${order.customerPhone})
              </a>
            </div>
          </div>

          <!-- Ordered Items -->
          <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Ordered Items (${order.items?.length || 0})</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px 10px;">Item</th>
                <th style="padding: 8px 10px;">Details</th>
                <th style="padding: 8px 10px; text-align: center;">Qty</th>
                <th style="padding: 8px 10px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableHtml}
            </tbody>
          </table>

          <!-- Bill Summary Breakdown -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 14px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>Rs. ${Number(order.subtotal || order.total || 0).toLocaleString()}</span>
            </div>
            ${
              order.shippingFee !== undefined
                ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px;">
              <span>Delivery Charges:</span>
              <span>${Number(order.shippingFee) === 0 ? "FREE" : `Rs. ${Number(order.shippingFee).toLocaleString()}`}</span>
            </div>`
                : ""
            }
            <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 6px;">
              <span>Total Amount:</span>
              <span style="color: #e11d48;">Rs. ${formattedTotal}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">Automated order notification for <strong>${appName} Admin</strong>.</p>
        </div>

      </div>
    </body>
    </html>
    `;

    let customerSent = false;
    let adminSent = false;

    // 1. Send dedicated Customer Confirmation Email
    if (customerEmail && customerEmail.includes("@")) {
      try {
        const custResult = await sendUniversalEmail({
          from: gmailUser || "notifications@onliny.co.uk",
          fromName: appName,
          to: [customerEmail],
          subject: `🛍️ Order Confirmed #${orderIdShort} - ${appName}`,
          html: customerHtmlContent,
          gmailUser,
          gmailAppPassword,
          brevoApiKey: env.BREVO_API_KEY,
          resendApiKey: env.RESEND_API_KEY,
          sendgridApiKey: env.SENDGRID_API_KEY,
        });
        customerSent = custResult.success;
      } catch (custErr) {
        console.warn("Customer email dispatch note:", custErr);
      }
    }

    // 2. Send full Admin Notification Email
    if (adminEmail && adminEmail.includes("@")) {
      try {
        const adminResult = await sendUniversalEmail({
          from: gmailUser || "notifications@onliny.co.uk",
          fromName: appName,
          to: [adminEmail],
          subject: `🚨 New Order Alert #${orderIdShort} (${order.customerName || "Customer"}) - Rs. ${formattedTotal}`,
          html: adminHtmlContent,
          gmailUser,
          gmailAppPassword,
          brevoApiKey: env.BREVO_API_KEY,
          resendApiKey: env.RESEND_API_KEY,
          sendgridApiKey: env.SENDGRID_API_KEY,
        });
        adminSent = adminResult.success;
      } catch (adminErr) {
        console.warn("Admin email dispatch note:", adminErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: customerSent || adminSent,
        customerSent,
        adminSent,
        message: `Order emails processed (Customer: ${customerSent ? "Sent" : "Skipped"}, Admin: ${adminSent ? "Sent" : "Skipped"})`,
        orderId: order.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Order processing error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
