/**
 * lib/github/validateWebhookSignature.ts
 *
 * Validates the HMAC-SHA256 signature on incoming GitHub webhooks.
 * GitHub sends the signature in the `X-Hub-Signature-256` HTTP header.
 */

import crypto from 'crypto';

/**
 * Validates that an incoming webhook payload was sent by GitHub and matches
 * the shared secret configured in GITHUB_WEBHOOK_SECRET.
 *
 * @param payload - Raw request body string (do NOT JSON.stringify an already-parsed body).
 * @param signatureHeader - Value of the X-Hub-Signature-256 header (e.g. "sha256=abc...").
 * @returns true if valid, false otherwise.
 */
export function validateWebhookSignature(
  payload: string,
  signatureHeader: string | null | undefined
): boolean {
  if (!signatureHeader || !payload) {
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      '[validateWebhookSignature] GITHUB_WEBHOOK_SECRET is not configured.'
    );
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const sigBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expectedSignature);

  // Constant-time length check before timingSafeEqual to avoid throwing.
  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
