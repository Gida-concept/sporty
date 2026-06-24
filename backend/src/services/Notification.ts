import { config } from '../config/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'error' | 'warning' | 'info';

export interface RoutingPlan {
  channels: string[];
  dedup: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rate limit window: 5 minutes (in milliseconds). */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/** Maximum messages allowed per channel within the rate-limit window. */
const RATE_LIMIT_MAX = 10;

/** Timeout for outbound webhook requests in milliseconds. */
const WEBHOOK_TIMEOUT_MS = 5_000;

/** Cooldown period for severity-gated sends (1 hour). */
const SEVERITY_COOLDOWN_MS = 60 * 60 * 1000;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

class Notification {
  /** Per-channel send timestamps for general rate limiting. */
  private rateLimitStore: Map<string, number[]>;

  /** Last time an error email was dispatched (ms epoch). */
  private lastErrorEmailTime: number;

  /** Last time a warning webhook was dispatched (ms epoch). */
  private lastWarningWebhookTime: number;

  constructor() {
    this.rateLimitStore = new Map();
    this.lastErrorEmailTime = 0;
    this.lastWarningWebhookTime = 0;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Route an alert to the appropriate notification channels based on severity.
   *
   * Behaviour per severity:
   *   critical — email + webhook, no rate limiting
   *   error    — webhook immediately, email at most 1/hour
   *   warning  — console.warn, webhook at most 1/hour
   *   info     — console.log only (aggregated for weekly digest)
   */
  async sendAlert(
    severity: Severity,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const plan = this.routeAlert(severity, message);
    const now = Date.now();
    const payload: Record<string, unknown> = {
      severity,
      message,
      timestamp: new Date(now).toISOString(),
    };

    if (details) {
      payload.details = details;
    }

    switch (severity) {
      case 'critical': {
        // All channels immediately, no rate limiting
        if (plan.channels.includes('email')) {
          await this.sendEmail(
            ADMIN_EMAIL,
            `[CRITICAL] ${message}`,
            JSON.stringify(payload, null, 2),
          );
        }
        if (plan.channels.includes('webhook')) {
          await this.sendWebhook(WEBHOOK_URL, payload);
        }
        break;
      }

      case 'error': {
        // Webhook immediately
        if (plan.channels.includes('webhook')) {
          await this.sendWebhook(WEBHOOK_URL, payload);
        }

        // Email rate-limited to 1/hour
        if (
          plan.channels.includes('email') &&
          now - this.lastErrorEmailTime >= SEVERITY_COOLDOWN_MS
        ) {
          await this.sendEmail(ADMIN_EMAIL, `[ERROR] ${message}`, JSON.stringify(payload, null, 2));
          this.lastErrorEmailTime = now;
        }
        break;
      }

      case 'warning': {
        console.warn(`[WARNING] ${message}`, details ?? '');

        // Webhook only if same severity not sent in last hour
        if (
          plan.channels.includes('webhook') &&
          now - this.lastWarningWebhookTime >= SEVERITY_COOLDOWN_MS
        ) {
          await this.sendWebhook(WEBHOOK_URL, payload);
          this.lastWarningWebhookTime = now;
        }
        break;
      }

      case 'info': {
        console.log(`[INFO] ${message}`, details ?? '');
        // Aggregated for weekly digest — currently logged and batched
        break;
      }
    }
  }

  /**
   * Stub for sending email. Logs the call to console.
   * In production this would integrate with SendGrid, Resend, or similar.
   */
  async sendEmail(to: string, subject: string, _body: string): Promise<void> {
    console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}`);
  }

  /**
   * POST a JSON payload to the given webhook URL.
   * Uses Node 22 native fetch with a 5-second timeout.
   * Returns true for 2xx responses, false otherwise.
   * Failures are logged via console.warn.
   */
  async sendWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
    if (!url) {
      console.warn('[Notification] No webhook URL configured, skipping');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return true;
      }

      console.warn(`[Notification] Webhook returned ${response.status} ${response.statusText}`);
      return false;
    } catch (err) {
      console.warn(
        `[Notification] Webhook request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * Return the routing plan for a given severity.
   * Pure mapping — no side effects, no async.
   */
  routeAlert(severity: Severity, _message?: string): RoutingPlan {
    switch (severity) {
      case 'critical':
        return { channels: ['email', 'webhook'], dedup: false };
      case 'error':
        return { channels: ['webhook', 'email'], dedup: true };
      case 'warning':
        return { channels: ['webhook'], dedup: true };
      case 'info':
        return { channels: ['log'], dedup: true };
    }
  }

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------

  /**
   * Check whether the given channel has exceeded the rate limit
   * (10 messages per 5 minutes).
   */
  private isRateLimited(channel: string): boolean {
    const now = Date.now();
    const timestamps = this.rateLimitStore.get(channel) ?? [];

    // Purge entries outside the sliding window
    const valid = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    this.rateLimitStore.set(channel, valid);

    return valid.length >= RATE_LIMIT_MAX;
  }

  /**
   * Record a send timestamp for the given channel.
   */
  private recordSend(channel: string): void {
    const now = Date.now();
    const timestamps = this.rateLimitStore.get(channel) ?? [];
    timestamps.push(now);
    this.rateLimitStore.set(channel, timestamps);
  }
}

export default Notification;
