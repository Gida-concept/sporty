import { createSign } from 'node:crypto';
import { config } from '@/config/index.js';
import { AppError } from '@/middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexingStatus {
  url: string;
  latestUpdate?: { time: string; type: string };
  latestRemove?: { time: string; type: string };
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Google Indexing API Client
// ---------------------------------------------------------------------------

class GoogleIndexingAPI {
  private _accessToken: TokenCache | null = null;
  private _refreshPromise: Promise<string> | null = null;

  private readonly TOKEN_EXPIRY_BUFFER_S = 100; // refresh 100 s before real expiry
  private readonly MAX_CACHE_TTL_S = 3500; // never cache longer than 3500 s
  private readonly SCOPES = 'https://www.googleapis.com/auth/indexing';

  // -----------------------------------------------------------------------
  // Public methods
  // -----------------------------------------------------------------------

  /**
   * Check whether the Google Indexing API integration is enabled in config.
   */
  isEnabled(): boolean {
    return config.googleIndexingEnabled;
  }

  /**
   * Notify Google of a URL update or deletion.
   *
   * @param url  - Absolute URL to notify about.
   * @param type - `'URL_UPDATED'` when content changed, `'URL_DELETED'` when removed.
   * @returns `true` on success.
   * @throws AppError if the API is disabled or the request fails.
   */
  async notify(url: string, type: 'URL_UPDATED' | 'URL_DELETED'): Promise<boolean> {
    this._requireEnabled();

    try {
      await this._request('POST', 'https://indexing.googleapis.com/v3/urlNotifications:publish', {
        url,
        type,
      });
      return true;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('E999', 'Google Indexing API error', 500);
    }
  }

  /**
   * Retrieve the current indexing status for a URL.
   *
   * @param url - Absolute URL to check.
   * @returns The status object, or `null` if no notifications exist for the URL.
   * @throws AppError if the API is disabled or the request fails.
   */
  async getStatus(url: string): Promise<IndexingStatus | null> {
    this._requireEnabled();

    try {
      const encodedUrl = encodeURIComponent(url);
      const data = await this._request(
        'GET',
        `https://indexing.googleapis.com/v3/urlNotifications/metadata?url=${encodedUrl}`,
      );

      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      const status: IndexingStatus = { url: data.url };
      if (data.latestUpdate) {
        status.latestUpdate = { time: data.latestUpdate.time, type: data.latestUpdate.type };
      }
      if (data.latestRemove) {
        status.latestRemove = { time: data.latestRemove.time, type: data.latestRemove.type };
      }
      return status;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('E999', 'Google Indexing API error', 500);
    }
  }

  // -----------------------------------------------------------------------
  // Private – Auth helpers
  // -----------------------------------------------------------------------

  /**
   * Return a valid access token, refreshing from Google if necessary.
   *
   * Implements a simple per-instance lock so only one refresh happens at a
   * time; concurrent callers piggyback on the same in-flight promise.
   */
  private async _getAccessToken(): Promise<string> {
    // Return cached token when still fresh
    if (this._accessToken !== null && Date.now() < this._accessToken.expiresAt) {
      return this._accessToken.token;
    }

    // Deduplicate concurrent refresh attempts
    if (this._refreshPromise !== null) {
      return this._refreshPromise;
    }

    this._refreshPromise = this._refreshAccessToken();
    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  /**
   * Exchange a signed JWT assertion for a Google OAuth2 access token.
   */
  private async _refreshAccessToken(): Promise<string> {
    if (!config.googleServiceAccountEmail || !config.googlePrivateKey) {
      throw new AppError('E010', 'Google Indexing API auth failed: missing credentials', 401);
    }

    const jwt = await this._generateJWT();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError('E010', `Google Indexing API auth failed: ${body}`, 401);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };

    const ttl = Math.min(data.expires_in - this.TOKEN_EXPIRY_BUFFER_S, this.MAX_CACHE_TTL_S);

    this._accessToken = {
      token: data.access_token,
      expiresAt: Date.now() + ttl * 1000,
    };

    return data.access_token;
  }

  /**
   * Create and RS256-sign a JWT assertion for the Google service account.
   *
   * Uses the built-in `crypto.createSign` — no googleapis npm package needed.
   */
  private async _generateJWT(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');

    const payload = Buffer.from(
      JSON.stringify({
        iss: config.googleServiceAccountEmail,
        scope: this.SCOPES,
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    ).toString('base64url');

    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    // The private key may arrive with literal \n escape sequences from .env
    const privateKey = config.googlePrivateKey.replace(/\\n/g, '\n');
    const signature = signer.sign(privateKey, 'base64url');

    return `${header}.${payload}.${signature}`;
  }

  // -----------------------------------------------------------------------
  // Private – HTTP request helpers
  // -----------------------------------------------------------------------

  /**
   * Perform an authenticated request to the Google Indexing API.
   *
   * Automatically refreshes the access token and retries once on a 401
   * response.
   */
  private async _request(method: string, url: string, body?: unknown): Promise<any> {
    const token = await this._getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    let requestBody: string | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    // Token might be stale – refresh and retry once
    if (response.status === 401) {
      this._accessToken = null;
      const newToken = await this._getAccessToken();
      headers.Authorization = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, {
        method,
        headers,
        body: requestBody,
      });

      if (!retryResponse.ok) {
        await this._throwForStatus(retryResponse);
      }

      return retryResponse.status === 204 ? null : retryResponse.json();
    }

    if (!response.ok) {
      await this._throwForStatus(response);
    }

    return response.status === 204 ? null : response.json();
  }

  /**
   * Map a non-2xx HTTP response to the appropriate AppError.
   */
  private async _throwForStatus(response: Response): Promise<never> {
    let detail: string;
    try {
      const json = await response.json();
      detail = JSON.stringify(json);
    } catch {
      detail = await response.text();
    }

    switch (response.status) {
      case 401:
        throw new AppError('E010', `Google Indexing API auth failed: ${detail}`, 401);
      case 429:
        throw new AppError('E001', `Google Indexing API quota exceeded: ${detail}`, 429);
      default:
        throw new AppError('E999', `Google Indexing API error: ${detail}`, 500);
    }
  }

  /**
   * Guard used by public methods when the API is disabled in config.
   */
  private _requireEnabled(): void {
    if (!config.googleIndexingEnabled) {
      throw new AppError('E004', 'Google Indexing API is disabled');
    }
  }
}

export default GoogleIndexingAPI;
