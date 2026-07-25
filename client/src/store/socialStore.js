import { create } from 'zustand'
import api from '../services/api'

export const useSocialStore = create((set, get) => ({
  feed: [],
  stories: [],
  listings: [],
  loading: false,

  loadFeed: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/social/feed')
      set({ feed: data.posts || [], loading: false })
    } catch {
      set({ loading: false })
    }
  },

  loadStories: async () => {
    try {
      const { data } = await api.get('/social/stories')
      set({ stories: data.stories || [] })
    } catch {}
  },

  createPost: async (content, image) => {
    let mediaUrls = []
    if (image) {
      const formData = new FormData()
      formData.append('file', image)
      try {
        const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
        mediaUrls = [data.url]
      } catch {}
    }
    const { data } = await api.post('/social/post', { content, mediaUrls })
    set({ feed: [data.post, ...get().feed] })
    return data.post
  },

  createStory: async (media) => {
    let mediaUrl = ''
    let mediaType = 'image'
    const formData = new FormData()
    formData.append('file', media)
    try {
      const { data } = await api.post('/media/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      mediaUrl = data.url
      mediaType = data.type
    } catch { throw new Error('Upload failed') }
    const { data } = await api.post('/social/story', { mediaUrl, mediaType })
    set({ stories: [...get().stories, data.story] })
  },

  likePost: async (postId) => {
    try {
      const { data } = await api.post(`/social/post/${postId}/like`)
      set({
        feed: get().feed.map(p =>
          p.id === postId
            ? { ...p, likesCount: data.action === 'liked' ? (p.likesCount || 0) + 1 : Math.max((p.likesCount || 0) - 1, 0), hasLiked: data.action === 'liked' }
            : p
        )
      })
    } catch {}
  },

  commentOnPost: async (postId, content) => {
    try {
      const { data } = await api.post(`/social/post/${postId}/comment`, { content })
      set({
        feed: get().feed.map(p =>
          p.id === postId
            ? { ...p, commentsCount: (p.commentsCount || 0) + 1, comments: [...(p.comments || []), data.comment] }
            : p
        )
      })
      return data.comment
    } catch {}
  },

  loadListings: async () => {
    try {
      const { data } = await api.get('/marketplace/listings')
      set({ listings: data.listings || [] })
    } catch {}
  },

  createListing: async (listing) => {
    const { data } = await api.post('/marketplace/listings', listing)
    set({ listings: [data.listing, ...get().listings] })
    return data.listing
  },

  deleteListing: async (listingId) => {
    await api.delete(`/marketplace/listings/${listingId}`)
    set({ listings: get().listings.filter(l => l.id !== listingId) })
  }
}))
