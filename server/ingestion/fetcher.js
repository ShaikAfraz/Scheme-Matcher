/**
 * RESILIENT AUTHORIZED DATA FETCHER & SOURCE ADAPTERS
 * Handles API authentication, rate limiting, pagination, exponential backoff, and timeouts.
 *
 * NOTE: Credentials remain strictly on the backend and are never sent to the client.
 */

/**
 * Executes a network fetch with configurable timeout and exponential backoff retry.
 */
export async function fetchWithRetry(url, options = {}, { maxRetries = 3, initialBackoffMs = 400, timeoutMs = 8000 } = {}) {
  let attempt = 0;
  let delay = initialBackoffMs;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP Rate Limit (429) or Server Errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        if (attempt >= maxRetries) {
          throw new Error(`Remote API returned HTTP status ${response.status} after ${maxRetries} attempts`);
        }
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? Number(retryAfter) * 1000 : delay;
        await new Promise((r) => setTimeout(r, waitTime));
        delay *= 2;
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`API request timed out after ${timeoutMs}ms (${url})`);
      }
      if (attempt >= maxRetries) {
        throw new Error(`API request failed after ${maxRetries} attempts: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }

  throw new Error(`Failed to fetch from ${url} after ${maxRetries} attempts`);
}

/**
 * Adapter for myScheme National Portal API through API Setu
 */
export class MySchemeApiAdapter {
  constructor(config = {}) {
    this.endpoint = config.endpointUrl || process.env.MYSCHEME_API_URL || "https://apisetu.gov.in/myscheme/v1/schemes";
    this.apiKey = config.apiKey !== undefined ? config.apiKey : (process.env.MYSCHEME_API_KEY || process.env.APISETU_API_KEY || "");
    this.clientId = config.clientId !== undefined ? config.clientId : (process.env.MYSCHEME_CLIENT_ID || process.env.APISETU_CLIENT_ID || "");
  }

  isConfigured() {
    return Boolean(this.apiKey && this.clientId);
  }

  async fetchSchemes({ page = 1, limit = 25 } = {}) {
    if (!this.isConfigured()) {
      throw new Error(
        "myScheme API credentials not configured in backend environment. " +
        "Please provide MYSCHEME_API_KEY and MYSCHEME_CLIENT_ID in .env, or use the authorized CSV/JSON Dataset Import workflow."
      );
    }

    const url = new URL(this.endpoint);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));

    const res = await fetchWithRetry(url.toString(), {
      headers: {
        "Accept": "application/json",
        "X-APISETU-APIKEY": this.apiKey,
        "X-APISETU-CLIENTID": this.clientId,
      },
    });

    if (!res.ok) {
      throw new Error(`myScheme API returned error HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      records: Array.isArray(data.schemes) ? data.schemes : Array.isArray(data.data) ? data.data : [],
      total: data.total || data.count || 0,
      page,
      hasMore: Boolean(data.hasMore || (data.total && page * limit < data.total)),
    };
  }
}

/**
 * Adapter for Open Government Data Platform (data.gov.in)
 */
export class DataGovInAdapter {
  constructor(config = {}) {
    this.endpoint = config.endpointUrl || process.env.DATAGOV_API_URL || "https://api.data.gov.in/resource/schemes";
    this.apiKey = config.apiKey !== undefined ? config.apiKey : (process.env.DATAGOV_API_KEY || "");
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async fetchSchemes({ offset = 0, limit = 25 } = {}) {
    if (!this.isConfigured()) {
      throw new Error(
        "data.gov.in API Key not configured in backend environment. " +
        "Please provide DATAGOV_API_KEY in .env, or use the authorized CSV/JSON Dataset Import workflow."
      );
    }

    const url = new URL(this.endpoint);
    url.searchParams.set("api-key", this.apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));

    const res = await fetchWithRetry(url.toString(), {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      throw new Error(`data.gov.in API returned error HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const records = Array.isArray(data.records) ? data.records : [];
    return {
      records,
      total: data.total || records.length,
      offset,
      hasMore: Boolean(data.total && offset + limit < data.total),
    };
  }
}
