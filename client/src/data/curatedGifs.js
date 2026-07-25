const CURATED_GIFS = [
  { id: 'g1', title: 'Thumbs Up', tags: ['thumbs up', 'agree', 'ok', 'yes'], thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'g2', title: 'Clapping', tags: ['clap', 'applause', 'bravo', 'congrats'], thumb: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif' },
  { id: 'g3', title: 'Fire', tags: ['fire', 'hot', 'lit', 'amazing'], thumb: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
  { id: 'g4', title: 'Heart Eyes', tags: ['love', 'heart', 'crush', 'adorable'], thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { id: 'g5', title: 'LOL Laughing', tags: ['laugh', 'lol', 'funny', 'haha'], thumb: 'https://media.giphy.com/media/GpyS1lJXJYupG/giphy.gif', url: 'https://media.giphy.com/media/GpyS1lJXJYupG/giphy.gif' },
  { id: 'g6', title: 'Cat', tags: ['cat', 'kitten', 'cute', 'pet'], thumb: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { id: 'g7', title: 'Dog', tags: ['dog', 'puppy', 'cute', 'pet'], thumb: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif' },
  { id: 'g8', title: 'Party', tags: ['party', 'celebrate', 'yay', 'woohoo'], thumb: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', url: 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif' },
  { id: 'g9', title: 'Dancing', tags: ['dance', 'dancing', 'groove', 'vibe'], thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'g10', title: 'Mind Blown', tags: ['mind blown', 'wow', 'omg', 'shocked'], thumb: 'https://media.giphy.com/media/dAVLtOPb0JeIE/giphy.gif', url: 'https://media.giphy.com/media/dAVLtOPb0JeIE/giphy.gif' },
  { id: 'g11', title: 'Wow', tags: ['wow', 'amazing', 'impressed', 'awesome'], thumb: 'https://media.giphy.com/media/QUENDfi6DEMLzQ0CKt/giphy.gif', url: 'https://media.giphy.com/media/QUENDfi6DEMLzQ0CKt/giphy.gif' },
  { id: 'g12', title: 'Confused', tags: ['confused', 'puzzled', 'huh', 'what'], thumb: 'https://media.giphy.com/media/hv53DaYcXWe3nRbR1A/giphy.gif', url: 'https://media.giphy.com/media/hv53DaYcXWe3nRbR1A/giphy.gif' },
  { id: 'g13', title: 'Hello Bear', tags: ['hello', 'hi', 'hey', 'wave', 'greeting'], thumb: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif' },
  { id: 'g14', title: 'Cheers', tags: ['cheers', 'congrats', 'celebrate', 'leo'], thumb: 'https://media.giphy.com/media/UVRSXu4L4s76yze4q3/giphy.gif', url: 'https://media.giphy.com/media/UVRSXu4L4s76yze4q3/giphy.gif' },
  { id: 'g15', title: 'No', tags: ['no', 'no way', 'reject', 'nah', 'disapprove'], thumb: 'https://media.giphy.com/media/15aGGXfSlat2dP6ohs/giphy.gif', url: 'https://media.giphy.com/media/15aGGXfSlat2dP6ohs/giphy.gif' },
  { id: 'g16', title: 'Kiss', tags: ['kiss', 'love', 'mwah', 'xoxo'], thumb: 'https://media.giphy.com/media/f5vXCvhSJsZxu/giphy.gif', url: 'https://media.giphy.com/media/f5vXCvhSJsZxu/giphy.gif' },
  { id: 'g17', title: 'Trending', tags: ['trending', 'popular', 'cool', 'fire'], thumb: 'https://media.giphy.com/media/4jPKeGb3lOBA7vpjCp/giphy.gif', url: 'https://media.giphy.com/media/4jPKeGb3lOBA7vpjCp/giphy.gif' },
  { id: 'g18', title: 'Ok', tags: ['ok', 'okay', 'sure', 'fine'], thumb: 'https://media.giphy.com/media/sAGqd8yDHTGtGYzRgG/giphy.gif', url: 'https://media.giphy.com/media/sAGqd8yDHTGtGYzRgG/giphy.gif' },
  { id: 'g19', title: 'Wait', tags: ['wait', 'waiting', 'hold on', 'patience'], thumb: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif', url: 'https://media.giphy.com/media/11sBLVxNs7v6WA/giphy.gif' },
  { id: 'g20', title: 'Yes', tags: ['yes', 'nod', 'agree', 'correct'], thumb: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { id: 'g21', title: 'Nod', tags: ['nod', 'ok', 'yes', 'agree'], thumb: 'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif', url: 'https://media.giphy.com/media/nR4L10XlJcSeQ/giphy.gif' },
  { id: 'g22', title: 'High Five', tags: ['high five', 'slap', 'nice', 'awesome'], thumb: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
  { id: 'g23', title: 'Hug', tags: ['hug', 'embrace', 'cuddle', 'warm', 'comfort'], thumb: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif', url: 'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif' },
  { id: 'g24', title: 'Celebration', tags: ['celebrate', 'congrats', 'winner', 'yay'], thumb: 'https://media.giphy.com/media/CK0Eg2ymtfzTO2yVJD/giphy.gif', url: 'https://media.giphy.com/media/CK0Eg2ymtfzTO2yVJD/giphy.gif' },
  { id: 'g25', title: 'Sparkle', tags: ['sparkle', 'shine', 'magic', 'beautiful'], thumb: 'https://media.giphy.com/media/XJtM2nNFCzT3etvzOB/giphy.gif', url: 'https://media.giphy.com/media/XJtM2nNFCzT3etvzOB/giphy.gif' },
  { id: 'g26', title: 'Excited', tags: ['excited', 'happy', 'joy', 'yay'], thumb: 'https://media.giphy.com/media/fHoqSTQTsgSbfUoiTw/giphy.gif', url: 'https://media.giphy.com/media/fHoqSTQTsgSbfUoiTw/giphy.gif' },
  { id: 'g27', title: 'Thank You', tags: ['thank', 'thanks', 'grateful', 'appreciate'], thumb: 'https://media.giphy.com/media/4N1wOi78ZGzSB6H7vK/giphy.gif', url: 'https://media.giphy.com/media/4N1wOi78ZGzSB6H7vK/giphy.gif' },
]

const CATEGORIES = [
  { name: 'Popular', icon: '🔥', filter: null },
  { name: 'Reactions', icon: '😊', filter: ['thumbs up', 'clap', 'nod', 'yes', 'no', 'shrug', 'facepalm', 'wink'] },
  { name: 'Emotions', icon: '❤️', filter: ['love', 'heart', 'laugh', 'cry', 'angry', 'sad', 'happy', 'excited'] },
  { name: 'Animals', icon: '🐱', filter: ['cat', 'dog', 'pet', 'animal', 'puppy', 'kitten'] },
  { name: 'Food', icon: '🍕', filter: ['food', 'pizza', 'coffee', 'eat', 'hungry', 'yummy'] },
  { name: 'Fun', icon: '🎉', filter: ['dance', 'party', 'celebrate', 'music', 'game', 'silly', 'fun'] },
  { name: 'Words', icon: '💬', filter: ['hello', 'hi', 'bye', 'thanks', 'welcome', 'cool'] },
]

export function getCuratedGifs(categoryIdx = 0) {
  const cat = CATEGORIES[categoryIdx]
  if (!cat || !cat.filter) return CURATED_GIFS
  return CURATED_GIFS.filter(g => g.tags.some(t => cat.filter.includes(t)))
}

export function searchCuratedGifs(query) {
  if (!query) return CURATED_GIFS
  const q = query.toLowerCase()
  return CURATED_GIFS.filter(g =>
    g.title.toLowerCase().includes(q) ||
    g.tags.some(t => t.includes(q))
  )
}

export { CURATED_GIFS, CATEGORIES }
