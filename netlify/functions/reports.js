const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const { secret, action, submissionId } = JSON.parse(event.body || '{}');

  if (!secret || secret !== process.env.ADMIN_HASH) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorised' }) };
  }

  const token  = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!token || !siteId) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'NETLIFY_TOKEN or NETLIFY_SITE_ID not configured' }) };
  }

  try {
    if (action === 'list') {
      const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const forms = await formsRes.json();
      const form  = forms.find(f => f.name === 'price-report');
      if (!form) return { statusCode: 200, headers: CORS, body: JSON.stringify({ submissions: [] }) };

      const subRes = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const submissions = await subRes.json();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ submissions }) };
    }

    if (action === 'dismiss') {
      await fetch(`https://api.netlify.com/api/v1/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
