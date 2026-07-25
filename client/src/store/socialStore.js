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
    const formData = new FormData()
    formData.append('content', content)
    if (image) formData.append('image', image)
    const { data } = await api.post('/social/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    set({ feed: [data.post, ...get().feed] })
    return data.post
  },

  createStory: async (media) => {
    const formData = new FormData()
    formData.append('media', media)
    const { data } = await api.post('/social/stories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    set({ stories: [...get().stories, data.story] })
  },

  likePost: async (postId) => {
    try {
      const { data } = await api.post(`/social/posts/${postId}/like`)
      set({
        feed: get().feed.map(p =>
          p.id === postId
            ? { ...p, likes_count: data.liked ? (p.likes_count || 0) + 1 : Math.max((p.likes_count || 0) - 1, 0), isLiked: data.liked }
            : p
        )
      })
    } catch {}
  },

  commentOnPost: async (postId, content) => {
    try {
      const { data } = await api.post(`/social/posts/${postId}/comment`, { content })
      set({
        feed: get().feed.map(p =>
          p.id === postId
            ? { ...p, comments_count: (p.comments_count || 0) + 1, comments: [...(p.comments || []), data.comment] }
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
