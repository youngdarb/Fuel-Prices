const REPO   = 'youngdarb/Fuel-Prices';
const BRANCH = 'main';

async function ghGet(token, path) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) throw new Error(`GitHub error ${r.status} on ${path}`);
  return r.json();
}

async function ghPut(token, path, content, sha, message) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content, sha, branch: BRANCH })
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || `GitHub error ${r.status}`); }
  return r.json();
}

function b64(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

exports.handler = async function (event) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { secret, data, action } = JSON.parse(event.body);

    // Verify against the admin password hash stored in env
    if (!secret || secret !== process.env.ADMIN_HASH) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorised' }) };
    }

    const token = process.env.GH_TOKEN;
    if (!token) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'GH_TOKEN not configured' }) };
    }

    // Fetch the live prices.json via the GitHub API — never cached,
    // unlike raw.githubusercontent.com which serves stale data for up to 5 minutes
    if (action === 'get') {
      const { content } = await ghGet(token, 'prices.json');
      const json = Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
      return { statusCode: 200, headers: corsHeaders, body: json };
    }

    const now   = new Date();
    const label = `${String(now.getDate()).padStart(2,'0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}/${now.getFullYear()}`;

    // Commit prices.json
    const { sha: priceSha } = await ghGet(token, 'prices.json');
    await ghPut(token, 'prices.json', b64(JSON.stringify(data, null, 2)), priceSha, `Update fuel prices ${label}`);

    // Append to price-history.json (non-fatal)
    try {
      const { sha: histSha, content: histB64 } = await ghGet(token, 'price-history.json');
      const history = JSON.parse(Buffer.from(histB64.replace(/\n/g, ''), 'base64').toString('utf8'));
      const entry = { date: label, ts: now.getTime(), stations: {} };
      data.stations.forEach(s => { if (s.name) entry.stations[s.name] = { ul: s.unleaded, ds: s.diesel }; });
      history.entries.push(entry);
      if (history.entries.length > 104) history.entries = history.entries.slice(-104);
      await ghPut(token, 'price-history.json', b64(JSON.stringify(history)), histSha, `Update price history ${label}`);
    } catch (_) { /* non-fatal */ }

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, label }) };

  } catch (e) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
  }
};
