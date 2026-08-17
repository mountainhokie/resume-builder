import { Resend } from "resend";

/**
 * Transactional email for verification and password reset.
 *
 * Unconfigured, this logs the link to the server console instead of sending —
 * so local development works without a Resend account, and a missing key in
 * production surfaces as a visible warning rather than a silent dead end.
 */

const from = process.env.EMAIL_FROM ?? "Resume Builder <onboarding@resend.dev>";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

type SendResult = { sent: boolean; devLink?: string };

/**
 * A send that failed for a reason retrying will not fix — a missing key, an
 * unverified domain, a rejected sender. Separated from transient failures so
 * the caller can say something true instead of "try again in a moment".
 *
 * `detail` names the actual misconfiguration and is only ever shown outside
 * production, since these endpoints are reachable without signing in.
 */
export class EmailConfigError extends Error {
  readonly detail: string;
  constructor(message: string, detail: string) {
    super(message);
    this.name = "EmailConfigError";
    this.detail = detail;
  }
}

/**
 * Turns a Resend failure into something a person can act on.
 *
 * Matching on the message alone is not enough: an invalid API key comes back
 * as a bland "Internal server error" with no clue in the text, so the status
 * code has to carry the classification. Resend answers 401/403 for anything
 * to do with credentials or sender permissions, and none of those are helped
 * by retrying.
 */
export function describeSendFailure(
  raw: { message?: string; name?: string; statusCode?: number } | string,
  to: string
): EmailConfigError | null {
  const error = typeof raw === "string" ? { message: raw } : raw;
  const message = error.message ?? "";
  const status = error.statusCode;
  // Resend's shared test sender only delivers to the address that owns the
  // Resend account until a domain of your own is verified.
  if (/only send testing emails to your own email address/i.test(message)) {
    return new EmailConfigError(
      "This site cannot send email to that address yet.",
      `Resend is still using its test sender, which only delivers to the address that owns your Resend account. ` +
        `Either sign up with that address while testing, or verify a domain at ` +
        `resend.com/domains and set EMAIL_FROM to an address on it. Tried to send to ${to}.`
    );
  }
  if (/domain is not verified|not verified/i.test(message)) {
    return new EmailConfigError(
      "This site cannot send email yet.",
      `The sending domain is not verified with Resend. Verify it at resend.com/domains, ` +
        `then set EMAIL_FROM to an address on that domain. Current EMAIL_FROM: ${from}`
    );
  }
  if (/api key|unauthorized|invalid.*key/i.test(message)) {
    return new EmailConfigError(
      "This site cannot send email yet.",
      "RESEND_API_KEY is missing or not valid. Check the key at resend.com/api-keys."
    );
  }

  // Catch-all for credential and permission failures, which Resend reports as
  // 401/403 with an unhelpful body. Retrying never fixes these.
  if (status === 401 || status === 403) {
    return new EmailConfigError(
      "This site cannot send email yet.",
      `Resend rejected the request with ${status}. That is almost always an ` +
        `invalid RESEND_API_KEY, or a sender address the key is not allowed ` +
        `to use. Check resend.com/api-keys and resend.com/domains. ` +
        `Current EMAIL_FROM: ${from}. Resend said: "${message}"`
    );
  }
  return null;
}

async function send(
  to: string,
  subject: string,
  heading: string,
  body: string,
  buttonLabel: string,
  link: string
): Promise<SendResult> {
  const resend = client();
  if (!resend) {
    console.warn(
      `\n[email] RESEND_API_KEY is not set, so no message was sent to ${to}.\n` +
        `[email] ${subject}\n[email] ${link}\n`
    );
    // Returned to the caller only outside production. In production this link
    // is the sole proof of address ownership, so handing it back over HTTP to
    // whoever submitted the form would let anyone claim any address — exactly
    // the takeover the verification step exists to prevent. There, a missing
    // key fails loudly instead.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email is not configured on this server, so the message could not be sent."
      );
    }
    return { sent: false, devLink: link };
  }

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: template(heading, body, buttonLabel, link),
    text: `${heading}\n\n${body}\n\n${link}\n`,
  });
  if (error) {
    console.error("Error sending email:", error);
    const described = describeSendFailure(
      error as { message?: string; name?: string; statusCode?: number },
      to
    );
    if (described) throw described;
    // Anything unrecognised really might be transient.
    throw new Error("Could not send the email. Try again in a moment.");
  }
  return { sent: true };
}

export function sendVerificationEmail(to: string, link: string) {
  return send(
    to,
    "Confirm your email for Resume Builder",
    "Confirm your email",
    "Click below to finish creating your Resume Builder account. This link expires in 24 hours.",
    "Confirm email",
    link
  );
}

export function sendPasswordResetEmail(to: string, link: string) {
  return send(
    to,
    "Reset your Resume Builder password",
    "Reset your password",
    "Click below to choose a new password. This link expires in one hour. If you did not ask for this, you can ignore this email — nothing has changed.",
    "Choose a new password",
    link
  );
}

/** Inline styles throughout: email clients strip <style> blocks. */
function template(
  heading: string,
  body: string,
  buttonLabel: string,
  link: string
): string {
  return `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h1 style="font-size:20px;margin:0 0 16px">${heading}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#334155">${body}</p>
  <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:6px">${buttonLabel}</a>
  <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#64748b">
    If the button does not work, paste this into your browser:<br>
    <a href="${link}" style="color:#2563eb;word-break:break-all">${link}</a>
  </p>
</div>`.trim();
}

/** Absolute URLs for links that have to survive leaving the browser. */
export function appOrigin(request?: Request): string {
  const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}
