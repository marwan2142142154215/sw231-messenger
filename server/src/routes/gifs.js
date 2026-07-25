const express = require('express');

const router = express.Router();

const TENOR_KEY = process.env.TENOR_API_KEY;
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

router.get('/gifs', async (req, res) => {
  try {
    if (!TENOR_KEY) {
      return res.json({ results: [], error: 'TENOR_API_KEY not configured on server' });
    }

    const q = req.query.q;
    const trending = req.query.trending === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    let url;
    if (trending || !q) {
      url = `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=${limit}&media_filter=tinygif,mediumgif`;
    } else {
      url = `${TENOR_BASE}/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&media_filter=tinygif,mediumgif`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({ results: [] });
    }

    const data = await response.json();

    const results = (data.results || []).map(item => ({
      id: item.id,
      title: item.title || '',
      url: item.media_formats?.gif?.url || '',
      thumbnail: item.media_formats?.tinygif?.url || '',
    }));

    res.json({ results });
  } catch (err) {
    console.error('GIF search error:', err.message);
    res.json({ results: [] });
  }
});

module.exports = router;
