import dns from 'node:dns';

/**
 * A "mongodb+srv://" address needs a DNS SRV (and TXT) lookup. Some networks refuse those lookups
 * ("querySrv ECONNREFUSED") even though ordinary browsing works. When that happens we ask a public
 * DNS-over-HTTPS resolver instead (plain HTTPS on port 443) and build the equivalent standard
 * "mongodb://host1,host2,host3/..." address, which needs no SRV lookup at all.
 */
const DEFAULT_DOH = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/resolve'];
const TYPES = { SRV: 33, TXT: 16 };
const TXT_OPTIONS = new Set(['authsource', 'replicaset', 'loadbalanced']); // the only options the spec allows in TXT

const dohEndpoints = () => {
  const custom = (process.env.DOH_ENDPOINTS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return custom.length ? custom : DEFAULT_DOH;
};

export async function dohQuery(name, type, { fetchImpl = globalThis.fetch, urls = dohEndpoints(), timeoutMs = 6000 } = {}) {
  let lastError;
  for (const base of urls) {
    try {
      const res = await fetchImpl(`${base}?name=${encodeURIComponent(name)}&type=${type}`, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.Status !== 0) throw new Error(`DNS status ${json.Status}`);
      return (json.Answer || []).filter((a) => a.type === TYPES[type]).map((a) => String(a.data));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('no DNS-over-HTTPS endpoint available');
}

/** Turn SRV + TXT answers into a standard (non-SRV) connection string. Pure function, unit tested. */
export function buildStandardUri(srvUri, srvData, txtData = []) {
  const url = new URL(srvUri);
  const hosts = srvData.map((d) => {
    const [, , port, target] = d.trim().split(/\s+/);
    return `${target.replace(/\.$/, '')}:${port}`;
  });
  if (!hosts.length) throw new Error('no SRV records');

  const params = new URLSearchParams(url.search);
  if (!params.has('tls') && !params.has('ssl')) params.set('tls', 'true'); // SRV addresses imply TLS
  for (const txt of txtData) {
    const joined = txt.replace(/"\s+"/g, '').replace(/^"|"$/g, '');
    for (const [key, value] of new URLSearchParams(joined)) {
      if (TXT_OPTIONS.has(key.toLowerCase()) && !params.has(key)) params.set(key, value);
    }
  }
  const auth = url.username ? `${url.username}${url.password ? `:${url.password}` : ''}@` : '';
  const path = url.pathname && url.pathname !== '/' ? url.pathname : '/';
  return `mongodb://${auth}${hosts.join(',')}${path}?${params.toString()}`;
}

/**
 * Returns { uri, method, systemError?, dohError? } where method is:
 *   'direct' — not an SRV address, used as is
 *   'srv'    — the system resolver handled the SRV lookup, used as is
 *   'doh'    — the system resolver failed; `uri` is the equivalent standard address built over HTTPS
 *   'failed' — both failed; `uri` is the original so the driver reports its own error
 */
export async function resolveMongoUri(uri, { fetchImpl, resolveSrv = dns.promises.resolveSrv } = {}) {
  if (!uri.startsWith('mongodb+srv://')) return { uri, method: 'direct' };
  let host;
  try {
    host = new URL(uri).hostname;
  } catch {
    return { uri, method: 'srv' };
  }
  try {
    await resolveSrv(`_mongodb._tcp.${host}`);
    return { uri, method: 'srv' };
  } catch (systemError) {
    try {
      const [srv, txt] = await Promise.all([
        dohQuery(`_mongodb._tcp.${host}`, 'SRV', { fetchImpl }),
        dohQuery(host, 'TXT', { fetchImpl }).catch(() => []),
      ]);
      return { uri: buildStandardUri(uri, srv, txt), method: 'doh', systemError };
    } catch (dohError) {
      return { uri, method: 'failed', systemError, dohError };
    }
  }
}
