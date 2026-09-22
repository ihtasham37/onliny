// Pure Cloudflare Pages & Workers TLS SMTP Client & Multi-Provider Email Engine

interface EmailOptions {
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  html: string;
  gmailUser?: string;
  gmailAppPassword?: string;
  brevoApiKey?: string;
  resendApiKey?: string;
  sendgridApiKey?: string;
}

interface SmtpResult {
  success: boolean;
  provider: string;
  message?: string;
  error?: string;
}

// Convert string to base64 in Web / Cloudflare Worker environment
function toBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Direct TLS Socket SMTP Client for Cloudflare Workers / Pages
 * Connects directly to smtp.gmail.com:465 with SSL/TLS
 */
async function sendViaCloudflareTlsSmtp(
  user: string,
  pass: string,
  fromName: string,
  recipients: string[],
  subject: string,
  htmlBody: string
): Promise<{ ok: boolean; log: string }> {
  try {
    // Dynamically import cloudflare:sockets
    // @ts-ignore
    const { connect } = await import("cloudflare:sockets");
    if (!connect) {
      return { ok: false, log: "cloudflare:sockets not available in this environment" };
    }

    const cleanPass = pass.replace(/\s+/g, "");
    const cleanUser = user.trim();

    // Connect to Gmail SMTP port 465 with direct TLS
    const socket = connect("smtp.gmail.com:465", {
      secureTransport: "on",
      allowHalfOpen: false,
    });

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    let logs = "";

    async function readResponse(): Promise<string> {
      let result = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        result += text;
        logs += `S: ${text}\n`;
        // SMTP multi-line responses end with "XYZ <space>"
        const lines = result.trim().split("\n");
        const lastLine = lines[lines.length - 1];
        if (/^\d{3}\s/.test(lastLine)) {
          break;
        }
      }
      return result;
    }

    async function sendCommand(cmd: string, expectCode?: number): Promise<string> {
      logs += `C: ${cmd.replace(cleanPass, "********")}\n`;
      await writer.write(encoder.encode(cmd + "\r\n"));
      const res = await readResponse();
      if (expectCode && !res.startsWith(String(expectCode))) {
        throw new Error(`SMTP Error. Expected ${expectCode}, got: ${res}`);
      }
      return res;
    }

    // 1. Initial greeting (220)
    await readResponse();

    // 2. EHLO
    await sendCommand("EHLO localhost", 250);

    // 3. AUTH LOGIN
    await sendCommand("AUTH LOGIN", 334);

    // 4. Send Base64 Username
    await sendCommand(toBase64(cleanUser), 334);

    // 5. Send Base64 Password
    await sendCommand(toBase64(cleanPass), 235);

    // 6. MAIL FROM
    await sendCommand(`MAIL FROM:<${cleanUser}>`, 250);

    // 7. RCPT TO for each recipient
    for (const rcpt of recipients) {
      await sendCommand(`RCPT TO:<${rcpt}>`, 250);
    }

    // 8. DATA command
    await sendCommand("DATA", 354);

    // 9. Send MIME Headers and Body
    const cleanSubject = subject.replace(/[\r\n]+/g, " ");
    const mimeHeaders = [
      `From: "${fromName.replace(/"/g, "")}" <${cleanUser}>`,
      `To: ${recipients.join(", ")}`,
      `Subject: =?UTF-8?B?${toBase64(cleanSubject)}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      `Date: ${new Date().toUTCString()}`,
    ].join("\r\n");

    const fullMessage = `${mimeHeaders}\r\n\r\n${htmlBody}\r\n.\r\n`;
    await writer.write(encoder.encode(fullMessage));
    await readResponse();

    // 10. QUIT
    try {
      await sendCommand("QUIT");
    } catch (e) {}

    try {
      reader.releaseLock();
      writer.releaseLock();
      await socket.close();
    } catch (e) {}

    return { ok: true, log: logs };
  } catch (err: any) {
    return { ok: false, log: err?.message || String(err) };
  }
}

/**
 * Universal Email Sender for Cloudflare Pages / Workers
 * Tries multiple delivery mechanisms in priority order:
 * 1. Google SMTP via Direct Cloudflare TLS Socket (smtp.gmail.com:465)
 * 2. Brevo HTTP API (api.brevo.com)
 * 3. Resend HTTP API (api.resend.com)
 * 4. SendGrid HTTP API (api.sendgrid.com)
 * 5. MailChannels Cloudflare HTTP API
 */
export async function sendUniversalEmail(opts: EmailOptions): Promise<SmtpResult> {
  const {
    from,
    fromName = "Zivio Store",
    to,
    subject,
    html,
    gmailUser,
    gmailAppPassword,
    brevoApiKey,
    resendApiKey,
    sendgridApiKey,
  } = opts;

  const recipientList = Array.from(new Set(to.filter(Boolean)));
  if (recipientList.length === 0) {
    return { success: false, provider: "None", error: "No recipient email provided" };
  }

  // 1. Direct Gmail SMTP via TLS Socket
  if (gmailUser && gmailAppPassword) {
    try {
      const smtpRes = await sendViaCloudflareTlsSmtp(
        gmailUser,
        gmailAppPassword,
        fromName,
        recipientList,
        subject,
        html
      );

      if (smtpRes.ok) {
        return {
          success: true,
          provider: "Gmail SMTP (Direct TLS Socket)",
          message: `Email delivered to ${recipientList.join(", ")} via Gmail SMTP`,
        };
      } else {
        console.warn("Gmail TLS SMTP failed, attempting fallback providers:", smtpRes.log);
      }
    } catch (err: any) {
      console.warn("Gmail TLS SMTP exception:", err?.message || err);
    }
  }

  // 2. Brevo API (Free, high deliverability)
  if (brevoApiKey) {
    try {
      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: { name: fromName, email: gmailUser || from || "notifications@onliny.co.uk" },
          to: recipientList.map((e) => ({ email: e })),
          subject,
          htmlContent: html,
        }),
      });

      if (brevoRes.ok) {
        return {
          success: true,
          provider: "Brevo API",
          message: `Email delivered to ${recipientList.join(", ")} via Brevo API`,
        };
      }
    } catch (err) {
      console.warn("Brevo API attempt failed:", err);
    }
  }

  // 3. Resend API
  if (resendApiKey) {
    try {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <onboarding@resend.dev>`,
          to: recipientList,
          subject,
          html,
        }),
      });

      if (resendRes.ok) {
        return {
          success: true,
          provider: "Resend API",
          message: `Email delivered to ${recipientList.join(", ")} via Resend API`,
        };
      }
    } catch (err) {
      console.warn("Resend API attempt failed:", err);
    }
  }

  // 4. SendGrid API
  if (sendgridApiKey) {
    try {
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: recipientList.map((e) => ({ email: e })) }],
          from: { email: gmailUser || from || "orders@onliny.co.uk", name: fromName },
          subject,
          content: [{ type: "text/html", value: html }],
        }),
      });

      if (sgRes.ok || sgRes.status === 202) {
        return {
          success: true,
          provider: "SendGrid API",
          message: `Email delivered to ${recipientList.join(", ")} via SendGrid API`,
        };
      }
    } catch (err) {
      console.warn("SendGrid API attempt failed:", err);
    }
  }

  // 5. MailChannels (Cloudflare Free Relay)
  try {
    const mcRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: recipientList.map((e) => ({ email: e })) }],
        from: { email: gmailUser || "notifications@onliny.co.uk", name: fromName },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (mcRes.ok || mcRes.status === 202) {
      return {
        success: true,
        provider: "MailChannels",
        message: `Email delivered to ${recipientList.join(", ")} via MailChannels`,
      };
    }
  } catch (err) {}

  return {
    success: false,
    provider: "None",
    error: "No email provider succeeded. Please check GMAIL_USER and GMAIL_APP_PASSWORD in Cloudflare Settings -> Environment Variables.",
  };
}
