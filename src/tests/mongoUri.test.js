import { buildStandardUri, resolveMongoUri } from '../utils/mongoUri.js';

// A multi-host mongodb:// string is not a valid WHATWG URL, so read the query part directly.
const query = (uri) => new URLSearchParams(uri.split('?')[1]);

const SRV = ['0 0 27017 ac-abc-shard-00-00.cluster0.xyz.mongodb.net.', '0 0 27017 ac-abc-shard-00-01.cluster0.xyz.mongodb.net.', '0 0 27017 ac-abc-shard-00-02.cluster0.xyz.mongodb.net.'];
const TXT = ['"authSource=admin&replicaSet=atlas-abc-shard-0"'];

describe('buildStandardUri', () => {
  test('turns SRV + TXT answers into a standard connection string', () => {
    const uri = buildStandardUri('mongodb+srv://me:p%40ss@cluster0.xyz.mongodb.net/vroomly?retryWrites=true&w=majority', SRV, TXT);
    expect(uri.startsWith('mongodb://me:p%40ss@ac-abc-shard-00-00.cluster0.xyz.mongodb.net:27017,ac-abc-shard-00-01.cluster0.xyz.mongodb.net:27017,ac-abc-shard-00-02.cluster0.xyz.mongodb.net:27017/vroomly?')).toBe(true);
    const params = query(uri);
    expect(params.get('tls')).toBe('true');
    expect(params.get('authSource')).toBe('admin');
    expect(params.get('replicaSet')).toBe('atlas-abc-shard-0');
    expect(params.get('retryWrites')).toBe('true');
    expect(params.get('w')).toBe('majority');
  });

  test('options already in the address win over the TXT record, and unknown TXT keys are ignored', () => {
    const uri = buildStandardUri('mongodb+srv://c.example.net/db?authSource=other&tls=false', ['0 0 27017 h1.example.net.'], ['"authSource=admin&evil=1"']);
    const params = query(uri);
    expect(params.get('authSource')).toBe('other');
    expect(params.get('tls')).toBe('false');
    expect(params.has('evil')).toBe(false);
  });

  test('handles a TXT record split into several quoted strings and a missing database path', () => {
    const uri = buildStandardUri('mongodb+srv://c.example.net', ['0 0 27017 h1.example.net.'], ['"authSource=ad" "min"']);
    expect(uri).toContain('mongodb://h1.example.net:27017/?');
    expect(query(uri).get('authSource')).toBe('admin');
  });

  test('rejects an empty SRV answer', () => {
    expect(() => buildStandardUri('mongodb+srv://c.example.net/db', [])).toThrow(/no SRV/);
  });
});

describe('resolveMongoUri', () => {
  const json = (data) => ({ ok: true, json: async () => data });
  const fakeFetch = async (url) => {
    if (String(url).includes('type=SRV')) return json({ Status: 0, Answer: SRV.map((data) => ({ type: 33, data })) });
    return json({ Status: 0, Answer: TXT.map((data) => ({ type: 16, data })) });
  };

  test('leaves a normal mongodb:// address alone', async () => {
    const r = await resolveMongoUri('mongodb://127.0.0.1:27017/vroomly');
    expect(r).toEqual({ uri: 'mongodb://127.0.0.1:27017/vroomly', method: 'direct' });
  });

  test('keeps the SRV address when the system resolver works', async () => {
    const r = await resolveMongoUri('mongodb+srv://c.example.net/db', { resolveSrv: async () => [{}] });
    expect(r.method).toBe('srv');
    expect(r.uri).toBe('mongodb+srv://c.example.net/db');
  });

  test('falls back to DNS-over-HTTPS when the system resolver refuses (querySrv ECONNREFUSED)', async () => {
    const refused = Object.assign(new Error('querySrv ECONNREFUSED'), { code: 'ECONNREFUSED' });
    const r = await resolveMongoUri('mongodb+srv://me:pw@cluster0.xyz.mongodb.net/vroomly', { resolveSrv: async () => { throw refused; }, fetchImpl: fakeFetch });
    expect(r.method).toBe('doh');
    expect(r.uri.startsWith('mongodb://me:pw@ac-abc-shard-00-00.cluster0.xyz.mongodb.net:27017')).toBe(true);
    expect(r.systemError.code).toBe('ECONNREFUSED');
  });

  test('reports failure (and keeps the original address) when both methods fail', async () => {
    const down = async () => { throw new Error('offline'); };
    const r = await resolveMongoUri('mongodb+srv://c.example.net/db', { resolveSrv: down, fetchImpl: down });
    expect(r.method).toBe('failed');
    expect(r.uri).toBe('mongodb+srv://c.example.net/db');
  });
});
