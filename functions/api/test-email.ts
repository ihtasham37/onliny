// Cloudflare Pages Function: /api/test-email
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
    const { toEmail, credentials } = body;

    const gmailUser = (
      credentials?.gmailUser ||
      env.GMAIL_USER ||
      env.SENDER_EMAIL ||
      env.SMTP_USER ||
      ""
    ).trim();

    const gmailAppPassword = (
      credentials?.gmailAppPassword ||
      env.GMAIL_APP_PASSWORD ||
      env.GMAIL_PASS ||
      env.SMTP_PASS ||
      ""
    ).trim();

    const targetEmail = (
      toEmail ||
      credentials?.adminNotificationEmail ||
      env.ADMIN_NOTIFICATION_EMAIL ||
      env.RECEIVER_EMAIL ||
      env.ADMIN_EMAIL ||
      gmailUser
    ).trim();

    if (!targetEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing recipient email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appName = credentials?.appName || env.APP_NAME || "Zivio Store";

    const testHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 32px; width: 64px; height: 64px; line-height: 64px; border-radius: 50%;">✅</div>
          <h2 style="color: #059669; margin: 12px 0 4px 0;">Email Connection Successful!</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Your ${appName} automatic order notification system is working perfectly.</p>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          <div><strong>Sender:</strong> ${gmailUser || "Default Mailer"}</div>
          <div><strong>Recipient:</strong> ${targetEmail}</div>
          <div><strong>Time:</strong> ${new Date().toLocaleString()}</div>
          <div><strong>Platform:</strong> Cloudflare Pages Edge Runtime</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">Whenever a customer places an order, you will receive full order and customer details here automatically.</p>
      </div>
    </body>
    </html>
    `;

    const emailResult = await sendUniversalEmail({
      from: gmailUser || "notifications@onliny.co.uk",
      fromName: `${appName} Alerts`,
      to: [targetEmail],
      subject: `✅ Test Email Successful - ${appName} Order Alerts Active`,
      html: testHtml,
      gmailUser,
      gmailAppPassword,
      brevoApiKey: env.BREVO_API_KEY,
      resendApiKey: env.RESEND_API_KEY,
      sendgridApiKey: env.SENDGRID_API_KEY,
    });

    return new Response(
      JSON.stringify({
        success: emailResult.success,
        provider: emailResult.provider,
        message: emailResult.success
          ? `✅ Test email sent successfully to ${targetEmail} via ${emailResult.provider}! Check your inbox.`
          : emailResult.error || "Failed to send test email.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || "Test email failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
