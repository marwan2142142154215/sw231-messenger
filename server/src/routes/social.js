const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../db');
const { authGuard } = require('../middleware/auth');

const router = express.Router();

router.get('/feed', authGuard, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const sb = getSupabase();
    
    const { data: posts } = await sb.from('posts')
      .select('*, users!posts_user_id_fkey(id, username, display_name, avatar_url)')
      .eq('visibility', 'public').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    
    const postIds = (posts || []).map(p => p.id);
    const [likesData, commentsData] = await Promise.all([
      postIds.length > 0 ? sb.from('post_likes').select('post_id, user_id').in('post_id', postIds) : { data: [] },
      postIds.length > 0 ? sb.from('post_comments').select('post_id, id').in('post_id', postIds) : { data: [] }
    ]);
    
    const likesMap = {};
    (likesData.data || []).forEach(l => {
      if (!likesMap[l.post_id]) likesMap[l.post_id] = [];
      likesMap[l.post_id].push(l.user_id);
    });
    
    const commentsMap = {};
    (commentsData.data || []).forEach(c => {
      if (!commentsMap[c.post_id]) commentsMap[c.post_id] = 0;
      commentsMap[c.post_id]++;
    });
    
    const result = (posts || []).map(p => ({
      ...p, user: p.users,
      hasLiked: (likesMap[p.id] || []).includes(req.user.id),
      likesCount: (likesMap[p.id] || []).length,
      commentsCount: commentsMap[p.id] || p.comments_count
    }));
    
    res.json({ posts: result });
  } catch (err) {
    console.error('[SOCIAL] Feed error:', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

router.post('/post', authGuard, async (req, res) => {
  try {
    const { content, mediaUrls, mediaType } = req.body;
    if (!content && (!mediaUrls || mediaUrls.length === 0)) return res.status(400).json({ error: 'Post cannot be empty' });
    
    const sb = getSupabase();
    const postId = uuidv4();
    await sb.from('posts').insert([{
      id: postId, user_id: req.user.id, content: content || '',
      media_urls: JSON.stringify(mediaUrls || []), media_type: mediaType || null
    }]);
    
    res.status(201).json({
      post: { id: postId, user_id: req.user.id, content: content || '', media_urls: mediaUrls || [],
        likes_count: 0, comments_count: 0, created_at: new Date().toISOString(),
        user: { id: req.user.id, username: req.user.username, display_name: req.user.display_name, avatar_url: req.user.avatar_url } }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/post/:postId/like', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: existing } = await sb.from('post_likes')
      .select('*').eq('post_id', req.params.postId).eq('user_id', req.user.id).single();
    
    if (existing) {
      await sb.from('post_likes').delete().eq('post_id', req.params.postId).eq('user_id', req.user.id);
      await sb.from('posts').update({ likes_count: Math.max(0, (await sb.from('posts').select('likes_count').eq('id', req.params.postId).single()).data?.likes_count - 1 || 0) }).eq('id', req.params.postId);
      res.json({ action: 'unliked' });
    } else {
      await sb.from('post_likes').insert([{ post_id: req.params.postId, user_id: req.user.id }]);
      await sb.from('posts').update({ likes_count: ((await sb.from('posts').select('likes_count').eq('id', req.params.postId).single()).data?.likes_count || 0) + 1 }).eq('id', req.params.postId);
      res.json({ action: 'liked' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Like failed' });
  }
});

router.post('/post/:postId/comment', authGuard, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
    const sb = getSupabase();
    const commentId = uuidv4();
    await sb.from('post_comments').insert([{ id: commentId, post_id: req.params.postId, user_id: req.user.id, content }]);
    await sb.from('posts').update({ comments_count: ((await sb.from('posts').select('comments_count').eq('id', req.params.postId).single()).data?.comments_count || 0) + 1 }).eq('id', req.params.postId);
    res.status(201).json({ comment: { id: commentId, post_id: req.params.postId, user_id: req.user.id, content, created_at: new Date().toISOString() } });
  } catch (err) {
    res.status(500).json({ error: 'Comment failed' });
  }
});

router.get('/post/:postId/comments', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: comments } = await sb.from('post_comments')
      .select('*, users!post_comments_user_id_fkey(username, display_name, avatar_url)')
      .eq('post_id', req.params.postId).order('created_at');
    res.json({ comments: (comments || []).map(c => ({ ...c, user: c.users })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/story', authGuard, async (req, res) => {
  try {
    const { mediaUrl, mediaType, caption } = req.body;
    if (!mediaUrl) return res.status(400).json({ error: 'Media required' });
    const sb = getSupabase();
    const storyId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await sb.from('stories').insert([{ id: storyId, user_id: req.user.id, media_url: mediaUrl, media_type: mediaType || 'image', caption: caption || '', expires_at: expiresAt }]);
    res.status(201).json({ story: { id: storyId, media_url: mediaUrl, created_at: new Date().toISOString(), expires_at: expiresAt } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create story' });
  }
});

router.get('/stories', authGuard, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data: stories } = await sb.from('stories')
      .select('*, users!stories_user_id_fkey(id, username, display_name, avatar_url)')
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
    
    const storyMap = {};
    (stories || []).forEach(s => {
      const uid = s.user_id;
      if (!storyMap[uid]) storyMap[uid] = { user: s.users, stories: [] };
      storyMap[uid].stories.push(s);
    });
    
    res.json({ stories: Object.values(storyMap) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

module.exports = router;
