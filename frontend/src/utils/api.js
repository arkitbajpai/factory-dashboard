const BASE = process.env.REACT_APP_API_URL || '/api';
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts });
  if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail || 'API error'); }
  return res.json();
}
export const api = {
  health:         ()       => apiFetch('/health'),
  factoryMetrics: ()       => apiFetch('/metrics/factory'),
  workerMetrics:  (id)     => apiFetch(`/metrics/workers${id ? `?worker_id=${id}` : ''}`),
  stationMetrics: (id)     => apiFetch(`/metrics/workstations${id ? `?station_id=${id}` : ''}`),
  timeline:       (params) => apiFetch(`/metrics/timeline?${new URLSearchParams(params)}`),
  recentEvents:   (params) => apiFetch(`/events/?${new URLSearchParams(params)}`),
  ingestEvent:    (body)   => apiFetch('/events/ingest', { method: 'POST', body: JSON.stringify(body) }),
  refreshSeed:    ()       => apiFetch('/seed/refresh', { method: 'POST' }),
  seedStatus:     ()       => apiFetch('/seed/status'),
};
