import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocialStore } from '../store/socialStore'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function MarketplacePage() {
  const listings = useSocialStore(s => s.listings)
  const loadListings = useSocialStore(s => s.loadListings)
  const createListing = useSocialStore(s => s.createListing)
  const deleteListing = useSocialStore(s => s.deleteListing)
  const user = useAuthStore(s => s.user)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'general' })

  useEffect(() => { loadListings() }, [loadListings])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.price) { toast.error('Title and price required'); return }
    try {
      await createListing({ ...form, price: parseFloat(form.price) })
      setForm({ title: '', description: '', price: '', category: 'general' })
      setShowForm(false)
      toast.success('Listing created!')
    } catch { toast.error('Failed to create listing') }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl font-bold gradient-text">
            Marketplace
          </motion.h1>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
            {showForm ? 'Cancel' : '+ New Listing'}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="glass rounded-2xl p-5 space-y-4">
              <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={3} />
              <div className="flex gap-3">
                <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input-field flex-1" />
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field flex-1">
                  <option value="general">General</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button onClick={handleCreate} className="btn-primary w-full">Create Listing</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {listings.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-5 space-y-3 hover:bg-white/5 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{listing.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-nyx-600/20 text-nyx-300">{listing.category}</span>
                  </div>
                  <p className="font-display text-lg font-bold text-neon-cyan">${listing.price}</p>
                </div>
                {listing.description && <p className="text-sm text-gray-400">{listing.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <p className="text-xs text-gray-500">By {listing.seller_name || 'Unknown'}</p>
                  {listing.seller_id === user?.id && (
                    <button onClick={() => deleteListing(listing.id)} className="text-xs text-neon-pink hover:text-neon-pink/80">Delete</button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {listings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No listings yet. Create the first one!</p>
          </div>
        )}
      </div>
    </div>
  )
}
