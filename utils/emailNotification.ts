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
    service: 'gmail',
    auth: {
      user,
      pass,
    },
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
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      creds.gmailUser ||
      process.env.GMAIL_USER ||
      ''
    ).trim();

    if (!transporter || !targetEmail) {
      console.warn('[Email Notification] Gmail credentials (user/app password) not configured in server environment.');
      return {
        success: false,
        configured: false,
        message: 'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in server environment variables (.env).',
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

    const info = await transporter.sendMail({
      from: `"${appName}" <${sender}>`,
      to: targetEmail,
      subject: `🔔 New Order #Rs.${Number(order.total).toLocaleString()} from ${order.customerName} - ${appName}`,
      html: htmlContent,
    });

    console.log(`[Email Notification] Order email sent to ${targetEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      configured: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Email Notification Error]:', error);
    return {
      success: false,
      configured: true,
      error: error?.message || 'Failed to send email',
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
        message: 'Gmail User or App Password missing.',
      };
    }

    const appName = creds.appName || 'Online store';
    const sender = (creds.gmailUser || process.env.GMAIL_USER || toEmail).trim();

    const info = await transporter.sendMail({
      from: `"${appName}" <${sender}>`,
      to: toEmail.trim(),
      subject: `✅ Test Email Successful - ${appName} Notifications`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #059669; margin-top: 0;">🎉 Congratulations! Email Alert Setup Working!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.5;">
            Your Gmail SMTP connection is working 100% properly. Whenever a customer places an order on <strong>${appName}</strong>, you will automatically receive instant order details here.
          </p>
          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; font-size: 12px; color: #065f46; margin-top: 15px;">
            <strong>Test Timestamp:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Recipient:</strong> ${toEmail}
          </div>
        </div>
      `,
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[Email Test Error]:', err);
    return { success: false, error: err?.message || 'Test email failed' };
  }
};
