/**
 * EquityGrid Kenya — API Client
 *
 * All calls go through the Vite proxy to FastAPI at :8000.
 * Never exposes raw PII — only works with hashed Account IDs.
 */

const API_BASE = '/api/v1';

/**
 * Fetch summary statistics.
 */
export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch paginated equity results.
 * @param {Object} params - { page, per_page, classification, county }
 */
export async function fetchResults(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.classification) query.set('classification', params.classification);
  if (params.county) query.set('county', params.county);

  const res = await fetch(`${API_BASE}/results?${query.toString()}`);
  if (!res.ok) throw new Error(`Results fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single result by account hash.
 */
export async function fetchResultByHash(hash) {
  const res = await fetch(`${API_BASE}/results/${hash}`);
  if (!res.ok) throw new Error(`Result fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Score a single account.
 */
export async function scoreAccount(accountData) {
  const res = await fetch(`${API_BASE}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData),
  });
  if (!res.ok) throw new Error(`Score failed: ${res.status}`);
  return res.json();
}

/**
 * Health check.
 */
export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
