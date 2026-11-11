// Deno tests for the BioBes Edge Function. Run from the package root with:
//   deno test --allow-env --allow-read tests/edge_function.test.ts
//
// The tests mock Deno.serve and fetch, so no Supabase or Gemini request is made.
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url).pathname;
const edgePath = `${root}BioBes_Cloud/supabase/functions/biobes-read-form/index.ts`;
const tomlPath = `${root}BioBes_Cloud/supabase/config.toml`;
const edge = await Deno.readTextFile(edgePath);
const toml = await Deno.readTextFile(tomlPath);

Deno.test('source keeps JWT verification enabled', () => {
  assert.match(toml, /\[functions\.biobes-read-form\]/);
  assert.match(toml, /verify_jwt\s*=\s*true/);
});

Deno.test('source rejects missing auth, missing consent, and missing Gemini key', () => {
  assert.match(edge, /reply\(401,'Hyrja kërkohet\.'\)/);
  assert.match(edge, /consent!==true/);
  assert.match(edge, /BIOBES_GEMINI_API_KEY/);
  assert.match(edge, /Çelësi Gemini nuk është konfiguruar/);
});

Deno.test('source handles Gemini 503 and 401 explicitly', () => {
  assert.match(edge, /upstream\.status===503/);
  assert.match(edge, /Gemini nuk e përfundoi kërkesën/);
  assert.match(edge, /httpStatus:upstream\.status/);
});

Deno.test('source does not log secrets, prompts, or document payloads', () => {
  assert.doesNotMatch(edge, /console\.(?:log|error|warn)\(/);
  assert.doesNotMatch(edge, /console\.error\([^\n]*(?:secret|parts|body|prompt|document)/i);
});

// --- Runtime tests with a mocked Deno.serve and fetch -------------------------
let handler: ((req: Request) => Response | Promise<Response>) | null = null;
const originalServe = (Deno as unknown as { serve: unknown }).serve;
(Deno as unknown as { serve: unknown }).serve = (callback: (req: Request) => Response | Promise<Response>) => {
  handler = callback;
  return { finished: Promise.resolve() };
};
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('BIOBES_GEMINI_API_KEY', 'test-gemini-key');
await import('../BioBes_Cloud/supabase/functions/biobes-read-form/index.ts');

const originalFetch = globalThis.fetch;
let fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async () => new Response('{}', { status: 200 });
globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => fetchImpl(String(url), init)) as typeof fetch;

const errorLogs: unknown[][] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => { errorLogs.push(args); };

function request(body: unknown, authorization = 'Bearer test-access-token-1234567890'): Request {
  return new Request('https://test.supabase.co/functions/v1/biobes-read-form', {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function authAndClaimOk() {
  fetchImpl = async (url) => {
    if (url.includes('/auth/v1/user')) return new Response('{}', { status: 200 });
    if (url.includes('/rest/v1/rpc/biobes_daily_claim_ai')) return new Response('{"ok":true}', { status: 200 });
    return new Response('{}', { status: 200 });
  };
}

const validBody = {
  parts: [{ text: 'SKEDARI EXCEL: test' }],
  consent: true,
  anonymous: true,
  freeTier: true,
};

Deno.test('runtime: returns 401 without a bearer token', async () => {
  authAndClaimOk();
  const res = await handler!(request(validBody, ''));
  assert.equal(res.status, 401);
});

Deno.test('runtime: returns 400 when consent is missing', async () => {
  authAndClaimOk();
  const res = await handler!(request({ ...validBody, consent: false }));
  assert.equal(res.status, 400);
});

Deno.test('runtime: returns 503 when the Gemini key is missing', async () => {
  authAndClaimOk();
  Deno.env.set('BIOBES_GEMINI_API_KEY', '');
  const res = await handler!(request(validBody));
  assert.equal(res.status, 503);
  Deno.env.set('BIOBES_GEMINI_API_KEY', 'test-gemini-key');
});

Deno.test('runtime: returns 503 for Gemini UNAVAILABLE', async () => {
  authAndClaimOk();
  fetchImpl = async (url) => {
    if (url.includes('/auth/v1/user')) return new Response('{}', { status: 200 });
    if (url.includes('/rest/v1/rpc/biobes_daily_claim_ai')) return new Response('{"ok":true}', { status: 200 });
    return new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'high demand' } }), { status: 503 });
  };
  const res = await handler!(request(validBody));
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.match(body.error, /nuk e përfundoi/);
  assert.equal(body.providerStatus, 'UNAVAILABLE');
});

Deno.test('runtime: returns 502 for Gemini UNAUTHENTICATED', async () => {
  authAndClaimOk();
  fetchImpl = async (url) => {
    if (url.includes('/auth/v1/user')) return new Response('{}', { status: 200 });
    if (url.includes('/rest/v1/rpc/biobes_daily_claim_ai')) return new Response('{"ok":true}', { status: 200 });
    return new Response(JSON.stringify({ error: { code: 401, status: 'UNAUTHENTICATED' } }), { status: 401 });
  };
  const res = await handler!(request(validBody));
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.match(body.error, /nuk e përfundoi/);
});

Deno.test('runtime: returns 200 for a successful Gemini response', async () => {
  authAndClaimOk();
  fetchImpl = async (url) => {
    if (url.includes('/auth/v1/user')) return new Response('{}', { status: 200 });
    if (url.includes('/rest/v1/rpc/biobes_daily_claim_ai')) return new Response('{"ok":true}', { status: 200 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"plan":[],"employees":[],"weighings":[],"warnings":[]}' }] } }] }), { status: 200 });
  };
  const res = await handler!(request(validBody));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.candidates);
});

Deno.test('runtime: error logs contain no secrets, prompts, or documents', () => {
  assert.equal(errorLogs.length, 0, 'no provider data logged');
  for (const args of errorLogs) {
    const detail = args[1] as Record<string, unknown>;
    assert.deepEqual(Object.keys(detail).sort(), ['httpStatus', 'providerCode', 'providerStatus']);
  }
});

// Tests run after module evaluation; mocks must remain installed until then.

Deno.test('runtime: sends twelve staff instructions and enhanced observation schema to the current models', async () => {
  let payload: any = null; const called: string[] = [];
  fetchImpl=async (url,init)=>{
    if(url.includes('/auth/v1/user'))return new Response('{}',{status:200});
    if(url.includes('/rest/v1/rpc/biobes_daily_claim_ai'))return new Response('{}',{status:200});
    called.push(url); payload=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"plan":[],"employees":[],"weighings":[],"warnings":[]}'}]}}]}),{status:200});
  };
  assert.equal((await handler!(request(validBody))).status,200);
  assert.match(called[0],/gemini-3\.6-flash/);
  assert.match(payload.systemInstruction.parts[0].text,/12 punonjës/);
  assert.match(payload.systemInstruction.parts[0].text,/saktësisht 12 objekte/); assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel,'low');
  for(const k of ['uncertain','printed_totals','weekday','iso_week','record_numbers_seen','dates_seen'])assert.ok(payload.generationConfig.responseSchema.properties[k]);
  assert.equal(payload.generationConfig.maxOutputTokens,32768);
});
Deno.test('runtime: preserves model fallback for 429 and protects forbidden accounts', async () => {
  const calls: string[]=[];
  fetchImpl=async (url)=>{if(url.includes('/auth/v1/user'))return new Response('{}',{status:200});if(url.includes('/rest/v1/rpc/'))return new Response('{}',{status:200});calls.push(url);return calls.length===1?new Response('{}',{status:429}):new Response('{}',{status:200})};
  assert.equal((await handler!(request(validBody))).status,200);assert.equal(calls.length,2);assert.match(calls[1],/gemini-3\.8-flash/);
  fetchImpl=async (url)=>url.includes('/auth/v1/user')?new Response('{}',{status:200}):new Response('{"message":"BIOBES_FORBIDDEN"}',{status:403});
  assert.equal((await handler!(request(validBody))).status,403);
});
