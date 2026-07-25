const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/listings', authGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const { category, status } = req.query;
    const sb = getSupabase();
    
    let query = sb.from('listings').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    else query = query.eq('status', 'available');
    
    const { data: listings } = await query;
    
    const userIds = [...new Set((listings || []).map(l => l.user_id).filter(Boolean))];
    let userMap = {};
    if (userIds.length > 0) {
      const { data: users } = await sb.from('users').select('id, username, display_name, avatar_url').in('id', userIds);
      (users || []).forEach(u => { userMap[u.id] = u; });
    }
    
    res.json({ listings: (listings || []).map(l => ({ ...l, user: userMap[l.user_id] || null })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

router.post('/listings', authGuard, async (req, res) => {
  try {
    const { title, description, price, currency, mediaUrls, category, location } = req.body;
    if (!title || !price) return res.status(400).json({ error: 'Title and price required' });
    
    const sb = getSupabase();
    const listingId = uuidv4();
    await sb.from('listings').insert([{
      id: listingId, user_id: req.user.id, title, description: description || '',
      price, currency: currency || 'IDR', media_urls: JSON.stringify(mediaUrls || []),
      category: category || 'general', location: location || ''
    }]);
    
    res.status(201).json({
      listing: { id: listingId, user_id: req.user.id, title, description, price, currency: currency || 'IDR',
        media_urls: mediaUrls || [], category: category || 'general', status: 'available', created_at: new Date().toISOString() }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

router.put('/listings/:id', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: listing } = await sb.from('listings').select('id').eq('id', req.params.id).eq('user_id', req.user.id).single();
    if (!listing) return res.status(404).json({ error: 'Not found' });
    
    const { title, description, price, status, category, location } = req.body;
    const update = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (price) update.price = price;
    if (status) update.status = status;
    if (category) update.category = category;
    if (location !== undefined) update.location = location;
    update.updated_at = new Date().toISOString();
    
    await sb.from('listings').update(update).eq('id', req.params.id);
    res.json({ message: 'Listing updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

router.delete('/listings/:id', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    await sb.from('listings').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

module.exports = router;
