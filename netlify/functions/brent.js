exports.handler = async function () {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=15d',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GSYFuel/1.0)' } }
    );
    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);
    const json = await res.json();
    const result = json.chart.result[0];
    const closes = result.indicators.quote[0].close;
    const valid = closes.filter(v => v != null);
    if (valid.length < 2) throw new Error('Not enough data points');
    const today    = Math.round(valid[valid.length - 1] * 100) / 100;
    const lastWeek = Math.round((valid[valid.length - 6] ?? valid[0]) * 100) / 100;
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      body: JSON.stringify({ today, last_week: lastWeek })
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
