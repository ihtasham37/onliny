// Cloudflare Pages Function: /api/send-order-email
interface Env {
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  GMAIL_USER?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
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

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing order payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appName = env.APP_NAME || order.storeName || "onliny";
    const adminEmail = (
      env.ADMIN_NOTIFICATION_EMAIL ||
      env.GMAIL_USER ||
      "ali10cart@gmail.com"
    ).trim();

    const customerEmail = (order.email || "").trim();
    const orderIdShort = String(order.id || "").slice(-6).toUpperCase();
    const formattedTotal = Number(order.total || 0).toLocaleString();

    // Prepare HTML content for Order Notification
    const itemsTableHtml = (order.items || [])
      .map(
        (item: any) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; vertical-align: top;">
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

    const cleanPhone = String(order.customerPhone || "").replace(/\D/g, "");
    const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone;
    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Salam ${order.customerName}, this is regarding your order #${orderIdShort} on ${appName}.`)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${appName}</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95; font-weight: 500;">🎉 Order #${orderIdShort} Received!</p>
        </div>
        
        <div style="padding: 24px;">
          <div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; color: #9f1239; font-weight: 700;">Customer Details</h3>
            <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Name:</strong> ${order.customerName}</p>
            <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Phone:</strong> <a href="tel:${order.customerPhone}" style="color: #e11d48; text-decoration: none;">${order.customerPhone}</a></p>
            ${order.email ? `<p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Email:</strong> ${order.email}</p>` : ""}
            <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Address:</strong> ${order.customerAddress}, ${order.city}${order.province ? `, ${order.province}` : ""}</p>
            <p style="margin: 2px 0; font-size: 13px; color: #334155;"><strong>Payment:</strong> <span style="color: #059669; font-weight: bold;">${order.paymentMethod || "Cash on Delivery"}</span></p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: left;">
                  <th style="padding: 8px;">Image</th>
                  <th style="padding: 8px;">Item</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsTableHtml}</tbody>
            </table>
          </div>

          <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748b; margin-bottom: 6px;">
              <span>Shipping Fee:</span>
              <span style="color: #059669; font-weight: bold;">${Number(order.shippingFee) > 0 ? `Rs. ${Number(order.shippingFee).toLocaleString()}` : "FREE"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0f172a; border-top: 1px solid #e2e8f0; pt: 10px; margin-top: 6px;">
              <span>Grand Total:</span>
              <span style="color: #e11d48;">Rs. ${formattedTotal}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${whatsappUrl}" style="display: inline-block; background: #25d366; color: #ffffff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 700;">
              💬 Open WhatsApp Chat
            </a>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          Automatic Order Alert from <strong>${appName}</strong>
        </div>
      </div>
    </body>
    </html>
    `;

    // Target recipients array (Customer + Admin)
    const recipients = new Set<string>();
    if (adminEmail) recipients.add(adminEmail);
    if (customerEmail) recipients.add(customerEmail);

    const recipientList = Array.from(recipients);
    if (recipientList.length === 0) {
      recipientList.push("ali10cart@gmail.com");
    }

    let sentSuccessfully = false;
    let providerUsed = "None";

    // 1. Try Resend API if key present
    if (env.RESEND_API_KEY) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${appName} <onboarding@resend.dev>`,
            to: recipientList,
            subject: `🛍️ Order #${orderIdShort} Confirmation - Rs. ${formattedTotal}`,
            html: htmlContent,
          }),
        });
        if (resendRes.ok) {
          sentSuccessfully = true;
          providerUsed = "Resend";
        }
      } catch (err) {
        console.warn("Resend email failed:", err);
      }
    }

    // 2. Try Brevo API if key present and not sent yet
    if (!sentSuccessfully && env.BREVO_API_KEY) {
      try {
        const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": env.BREVO_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: { name: appName, email: adminEmail || "notifications@onliny.co.uk" },
            to: recipientList.map(e => ({ email: e })),
            subject: `🛍️ Order #${orderIdShort} Confirmation - Rs. ${formattedTotal}`,
            htmlContent,
          }),
        });
        if (brevoRes.ok) {
          sentSuccessfully = true;
          providerUsed = "Brevo";
        }
      } catch (err) {
        console.warn("Brevo email failed:", err);
      }
    }

    // 3. Try MailChannels API (Built-in free Cloudflare Pages/Workers email provider)
    if (!sentSuccessfully) {
      try {
        const mailchannelsRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: recipientList.map(e => ({ email: e, name: order.customerName || "Customer" })),
              },
            ],
            from: {
              email: "no-reply@onliny.co.uk",
              name: appName,
            },
            subject: `🛍️ Order #${orderIdShort} Confirmation - Rs. ${formattedTotal}`,
            content: [
              {
                type: "text/html",
                value: htmlContent,
              },
            ],
          }),
        });
        if (mailchannelsRes.ok || mailchannelsRes.status === 202) {
          sentSuccessfully = true;
          providerUsed = "MailChannels (Cloudflare Free)";
        } else {
          console.warn("MailChannels status:", mailchannelsRes.status);
        }
      } catch (mcErr) {
        console.warn("MailChannels email attempt:", mcErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Order email processed for ${recipientList.join(", ")}`,
        provider: providerUsed,
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
