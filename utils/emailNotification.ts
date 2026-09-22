import nodemailer from 'nodemailer';

export interface EmailOrderPayload {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  city: string;
  province?: string;
  landmark?: string;
  email?: string;
  items: Array<{
    id?: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    imageUrl?: string;
  }>;
  total: number;
  shippingFee?: number;
  discountAmount?: number;
  appliedCoupon?: string;
  paymentMethod?: string;
  createdAt?: number;
}

export interface EmailCredentials {
  gmailUser?: string;
  gmailAppPassword?: string;
  adminNotificationEmail?: string;
  appName?: string;
}

export const getMailTransporter = (creds: EmailCredentials = {}) => {
  const user = (creds.gmailUser || process.env.GMAIL_USER || '').trim();
  const rawPass = creds.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, '').trim();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export const sendOrderNotificationEmail = async (
  order: EmailOrderPayload,
  creds: EmailCredentials = {}
) => {
  try {
    const transporter = getMailTransporter(creds);
    const targetEmail = (
      creds.adminNotificationEmail ||
      creds.gmailUser ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.GMAIL_USER ||
      'aliihtasham20@gmail.com'
    ).trim();

    if (!transporter) {
      console.warn('[Email Notification] Google SMTP credentials (Gmail Address & 16-Char App Password) not configured.');
      return {
        success: false,
        configured: false,
        message: 'Gmail SMTP credentials not configured. Please enter your Gmail Address and 16-character App Password in Admin Settings.',
      };
    }

    const appName = creds.appName || 'Online store';
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }) : new Date().toLocaleString();
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
    const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Salam ${order.customerName}, this is regarding your order #${order.id.slice(-6).toUpperCase()} on ${appName}.`)}`;

    // Build items rows
    const itemsHtml = (order.items || [])
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 8px; vertical-align: top;">
            ${
              item.imageUrl
                ? `<img src="${item.imageUrl}" alt="${item.name}" width="50" height="50" style="border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; display: block;" />`
                : `<div style="width: 50px; height: 50px; background-color: #f1f5f9; border-radius: 8px; text-align: center; line-height: 50px; color: #94a3b8; font-size: 10px;">Item</div>`
            }
          </td>
          <td style="padding: 12px 8px; vertical-align: top;">
            <div style="font-weight: 600; color: #0f172a; font-size: 14px;">${item.name}</div>
            ${item.selectedSize ? `<span style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #475569; margin-top: 4px; margin-right: 4px;">Size: <strong>${item.selectedSize}</strong></span>` : ''}
            ${item.selectedColor ? `<span style="display: inline-block; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #475569; margin-top: 4px;">Color: <strong>${item.selectedColor}</strong></span>` : ''}
          </td>
          <td style="padding: 12px 8px; vertical-align: top; text-align: center; color: #334155; font-weight: bold; font-size: 13px;">
            ${item.quantity}x
          </td>
          <td style="padding: 12px 8px; vertical-align: top; text-align: right; color: #0f172a; font-weight: 700; font-size: 14px;">
            Rs. ${(item.price * item.quantity).toLocaleString()}
          </td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Order - ${appName}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e11d48, #d97706); padding: 24px 28px; text-align: left; color: #ffffff;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #ffe4e6; margin-bottom: 4px;">
            🚨 NEW ORDER ALERT • ${appName.toUpperCase()}
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">
            New Order Received!
          </h1>
          <div style="font-size: 13px; color: #fff1f2; margin-top: 6px;">
            Order ID: <strong>#${order.id.slice(-6).toUpperCase()}</strong> • ${orderDate}
          </div>
        </div>

        <!-- Quick Summary Banner -->
        <div style="background-color: #fff1f2; padding: 14px 24px; border-bottom: 1px solid #fecdd3; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; color: #9f1239; font-weight: 600;">Total Payable:</span>
          <span style="font-size: 20px; font-weight: 800; color: #be123c;">Rs. ${Number(order.total).toLocaleString()}</span>
        </div>

        <div style="padding: 24px;">
          
          <!-- Customer Information Box -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px;">
              👤 Customer & Shipping Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 35%;">Customer Name:</td>
                <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${order.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Phone Number:</td>
                <td style="padding: 4px 0; font-weight: 700;">
                  <a href="tel:${order.customerPhone}" style="color: #e11d48; text-decoration: none;">${order.customerPhone}</a>
                </td>
              </tr>
              ${
                order.email
                  ? `<tr>
                      <td style="padding: 4px 0; color: #64748b;">Email Address:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${order.email}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 4px 0; color: #64748b;">City / Province:</td>
                <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${order.city}${order.province ? `, ${order.province}` : ''}</td>
              </tr>
              ${
                order.landmark
                  ? `<tr>
                      <td style="padding: 4px 0; color: #64748b;">Landmark / Area:</td>
                      <td style="padding: 4px 0; color: #0f172a;">${order.landmark}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 4px 0; color: #64748b; vertical-align: top;">Delivery Address:</td>
                <td style="padding: 4px 0; color: #0f172a; line-height: 1.4;">${order.customerAddress}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Payment Method:</td>
                <td style="padding: 4px 0; color: #059669; font-weight: 700;">
                  ${order.paymentMethod || 'Cash on Delivery (COD)'}
                </td>
              </tr>
            </table>

            <!-- Call & WhatsApp Action Buttons -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; text-align: center;">
              <a href="tel:${order.customerPhone}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; margin-right: 8px;">
                📞 Call Customer
              </a>
              <a href="${whatsappUrl}" style="display: inline-block; background: #25d366; color: #ffffff; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600;">
                💬 Message on WhatsApp
              </a>
            </div>
          </div>

          <!-- Order Items Table -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 12px;">
              📦 Order Items (${order.items?.length || 0})
            </div>
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b;">
                  <th style="padding: 8px;">Image</th>
                  <th style="padding: 8px;">Product</th>
                  <th style="padding: 8px; text-align: center;">Qty</th>
                  <th style="padding: 8px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Pricing Breakdown -->
          <div style="background: #fafafa; border-radius: 12px; padding: 16px; margin-bottom: 24px; border: 1px solid #eee;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              ${
                order.discountAmount
                  ? `<tr>
                      <td style="padding: 4px 0; color: #64748b;">Coupon Discount (${order.appliedCoupon || 'Code'}):</td>
                      <td style="padding: 4px 0; color: #dc2626; text-align: right; font-weight: 600;">- Rs. ${Number(order.discountAmount).toLocaleString()}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Shipping / Delivery Fee:</td>
                <td style="padding: 4px 0; color: #059669; text-align: right; font-weight: 600;">
                  ${Number(order.shippingFee) > 0 ? `Rs. ${Number(order.shippingFee).toLocaleString()}` : 'FREE Shipping'}
                </td>
              </tr>
              <tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 10px 0 4px; font-size: 16px; font-weight: 800; color: #0f172a;">Grand Total:</td>
                <td style="padding: 10px 0 4px; font-size: 18px; font-weight: 800; color: #e11d48; text-align: right;">
                  Rs. ${Number(order.total).toLocaleString()}
                </td>
              </tr>
            </table>
          </div>

          <!-- Footer Note -->
          <div style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px;">
            This notification was sent automatically by <strong>${appName}</strong> e-commerce platform.<br/>
            You can manage, print challans, and update status in your Admin Panel.
          </div>

        </div>
      </div>
    </body>
    </html>
    `;

    const sender = (creds.gmailUser || process.env.GMAIL_USER || targetEmail).trim();
    const recipientList = new Set<string>();
    if (targetEmail) recipientList.add(targetEmail);
    if (order.email && order.email.trim()) recipientList.add(order.email.trim());

    const finalTo = Array.from(recipientList).join(', ');

    const info = await transporter.sendMail({
      from: `"${appName}" <${sender}>`,
      to: finalTo,
      subject: `🔔 New Order #Rs.${Number(order.total).toLocaleString()} from ${order.customerName} - ${appName}`,
      html: htmlContent,
    });

    console.log(`[Google SMTP] Order email sent to ${finalTo}. MessageId: ${info.messageId}`);
    return {
      success: true,
      configured: true,
      provider: 'smtp',
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Google SMTP Error]:', error);
    let errorMessage = error?.message || 'Failed to send email';
    if (
      errorMessage.includes('Invalid login') ||
      errorMessage.includes('Username and Password not accepted') ||
      errorMessage.includes('BadCredentials') ||
      errorMessage.includes('535-5.7.8')
    ) {
      errorMessage =
        'Google SMTP Login Failed: Gmail address ya 16-character Google App Password galat hai. Baraye meherbani Google Account security se 16-letters ka App Password generate karke Admin Settings mein enter karein.';
    }
    return {
      success: false,
      configured: true,
      error: errorMessage,
    };
  }
};

export const sendTestEmail = async (
  toEmail: string,
  creds: EmailCredentials
) => {
  try {
    const transporter = getMailTransporter(creds);
    if (!transporter) {
      return {
        success: false,
        configured: false,
        message: 'Google SMTP credentials missing! Pehle Admin Settings mein Gmail Address aur 16-character Google App Password enter karein.',
      };
    }

    const appName = creds.appName || 'Online store';
    const sender = (creds.gmailUser || process.env.GMAIL_USER || toEmail).trim();
    const recipient = (toEmail || creds.adminNotificationEmail || sender).trim();

    const testHtml = `
      <div style="font-family: sans-serif; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 520px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">🎉 Google SMTP Connection Successful!</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Aapka Gmail aur Google App Password 100% active hai.</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Mubarak ho! Aapka Google SMTP email system theek se connect ho chuka hai.<br/><br/>
          Ab jab bhi koi customer <strong>${appName}</strong> par order place kare ga, to order ki complete details (naam, phone number, delivery address, items list, aur total bill) automatically is email par send ho jayengi.
        </p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; font-size: 13px; color: #065f46; margin-top: 18px; line-height: 1.6;">
          <strong>Sender Gmail:</strong> ${sender}<br/>
          <strong>Receiving Email:</strong> ${recipient}<br/>
          <strong>Timestamp:</strong> ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${appName}" <${sender}>`,
      to: recipient,
      subject: `✅ Google SMTP Test Successful - ${appName}`,
      html: testHtml,
    });

    console.log(`[Google SMTP Test] Email sent to ${recipient}. MessageId: ${info.messageId}`);
    return {
      success: true,
      provider: 'smtp',
      messageId: info.messageId,
      message: `✅ Test email successfully sent to ${recipient}! Google SMTP theek kaam kar raha hai.`,
    };
  } catch (err: any) {
    console.error('[Google SMTP Test Error]:', err);
    let errorMsg = err?.message || 'Test email failed';
    if (
      errorMsg.includes('Invalid login') ||
      errorMsg.includes('Username and Password not accepted') ||
      errorMsg.includes('BadCredentials') ||
      errorMsg.includes('535-5.7.8')
    ) {
      errorMsg =
        'Google Login Error: Gmail address ya 16-character App Password galat hai. Make sure 2-Step Verification ON hai aur Google App Password 16 letters ka theek enter kiya hai.';
    }
    return {
      success: false,
      error: errorMsg,
      message: `❌ Failed: ${errorMsg}`,
    };
  }
};
