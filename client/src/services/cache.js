const PREFIX = 'nx_'
const CONV_TTL = 5 * 60 * 1000
const MSG_TTL = 2 * 60 * 1000

export function getCached(key, ttl = CONV_TTL) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > ttl) { localStorage.removeItem(PREFIX + key); return null }
    return data
  } catch { return null }
}

export function setCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }))
  } catch { try { cleanOldCache() } catch {} }
}

export function removeCache(key) {
  localStorage.removeItem(PREFIX + key)
}

export function getCachedConversations() { return getCached('convs', CONV_TTL) }
export function setCachedConversations(data) { setCache('convs', data) }

export function getCachedMessages(convId) { return getCached('msgs:' + convId, MSG_TTL) }
export function setCachedMessages(convId, data) { setCache('msgs:' + convId, data) }

export function updateCachedMessages(convId, updater) {
  const cached = getCachedMessages(convId)
  if (cached) { setCachedMessages(convId, updater(cached)) }
}

function cleanOldCache() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
  }
  const now = Date.now()
  keys.forEach(k => {
    try {
      const { ts } = JSON.parse(localStorage.getItem(k))
      if (now - ts > 10 * 60 * 1000) localStorage.removeItem(k)
    } catch { localStorage.removeItem(k) }
  })
}
