const CURATED_GIFS = [
  { id: 'g1', title: 'Thumbs Up', tags: ['thumbs up', 'agree', 'ok', 'yes'], thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'g2', title: 'Clapping', tags: ['clap', 'applause', 'bravo', 'congrats'], thumb: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif', url: 'https://media.giphy.com/media/26BRBKqUiq586bRVm/giphy.gif' },
  { id: 'g3', title: 'Fire', tags: ['fire', 'hot', 'lit', 'amazing'], thumb: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
  { id: 'g4', title: 'Heart Eyes', tags: ['love', 'heart', 'crush', 'adorable'], thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { id: 'g5', title: 'LOL Laughing', tags: ['laugh', 'lol', 'funny', 'haha'], thumb: 'https://media.giphy.com/media/xT9Igg4RHvAam2P4iE/giphy.gif', url: 'https://media.giphy.com/media/xT9Igg4RHvAam2P4iE/giphy.gif' },
  { id: 'g6', title: 'Cat', tags: ['cat', 'kitten', 'cute', 'pet'], thumb: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { id: 'g7', title: 'Dog', tags: ['dog', 'puppy', 'cute', 'pet'], thumb: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif' },
  { id: 'g8', title: 'Party', tags: ['party', 'celebrate', 'yay', 'woohoo'], thumb: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif', url: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif' },
  { id: 'g9', title: 'Dancing', tags: ['dance', 'dancing', 'groove', 'vibe'], thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'g10', title: 'Mind Blown', tags: ['mind blown', 'wow', 'omg', 'shocked'], thumb: 'https://media.giphy.com/media/3o7aCTfymlP0qbltVc/giphy.gif', url: 'https://media.giphy.com/media/3o7aCTfymlP0qbltVc/giphy.gif' },
  { id: 'g11', title: 'Cool', tags: ['cool', 'sunglasses', 'deal with it', 'swag'], thumb: 'https://media.giphy.com/media/l46C5Gso2VzRJWQK0/giphy.gif', url: 'https://media.giphy.com/media/l46C5Gso2VzRJWQK0/giphy.gif' },
  { id: 'g12', title: 'Crying', tags: ['cry', 'sad', 'tears', 'emotional'], thumb: 'https://media.giphy.com/media/26BROrSHlmyzzHIfm/giphy.gif', url: 'https://media.giphy.com/media/26BROrSHlmyzzHIfm/giphy.gif' },
  { id: 'g13', title: 'Angry', tags: ['angry', 'mad', 'rage', 'furious'], thumb: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif', url: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif' },
  { id: 'g14', title: 'Pizza', tags: ['pizza', 'food', 'hungry', 'eat'], thumb: 'https://media.giphy.com/media/5tmrTFx3uQJb2WdvQY/giphy.gif', url: 'https://media.giphy.com/media/5tmrTFx3uQJb2WdvQY/giphy.gif' },
  { id: 'g15', title: 'Coffee', tags: ['coffee', 'tea', 'drink', 'morning', 'tired'], thumb: 'https://media.giphy.com/media/xT9Igg4RHvAam2P4iE/giphy.gif', url: 'https://media.giphy.com/media/xT9Igg4RHvAam2P4iE/giphy.gif' },
  { id: 'g16', title: 'Celebration', tags: ['celebrate', 'congrats', 'winner', 'yay'], thumb: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif', url: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif' },
  { id: 'g17', title: 'Hi Hello', tags: ['hello', 'hi', 'hey', 'wave', 'greeting'], thumb: 'https://media.giphy.com/media/3oEjI6SII9dXgQTDAi/giphy.gif', url: 'https://media.giphy.com/media/3oEjI6SII9dXgQTDAi/giphy.gif' },
  { id: 'g18', title: 'Bye', tags: ['bye', 'goodbye', 'see you', 'later'], thumb: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif', url: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif' },
  { id: 'g19', title: 'Shrug', tags: ['shrug', 'idk', 'whatever', 'dunno'], thumb: 'https://media.giphy.com/media/5CdLrKlnFMq2nV6VzG/giphy.gif', url: 'https://media.giphy.com/media/5CdLrKlnFMq2nV6VzG/giphy.gif' },
  { id: 'g20', title: 'Facepalm', tags: ['facepalm', 'oh no', 'fail', 'embarrassed'], thumb: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { id: 'g21', title: 'Nod Yes', tags: ['yes', 'nod', 'agree', 'correct'], thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'g22', title: 'No Way', tags: ['no', 'no way', 'reject', 'nah'], thumb: 'https://media.giphy.com/media/26BROrSHlmyzzHIfm/giphy.gif', url: 'https://media.giphy.com/media/26BROrSHlmyzzHIfm/giphy.gif' },
  { id: 'g23', title: 'Hug', tags: ['hug', 'embrace', 'cuddle', 'warm'], thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { id: 'g24', title: 'Money', tags: ['money', 'cash', 'rich', 'dollar'], thumb: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif', url: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif' },
  { id: 'g25', title: 'Sleep', tags: ['sleep', 'tired', 'nap', 'zzz'], thumb: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif', url: 'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif' },
  { id: 'g26', title: 'Rainbow', tags: ['rainbow', 'color', 'pride', 'beautiful'], thumb: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif', url: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif' },
  { id: 'g27', title: 'Sparks', tags: ['sparkle', 'shine', 'magic', 'glitter'], thumb: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif', url: 'https://media.giphy.com/media/l4FGJbWCz3aOG2Rag/giphy.gif' },
  { id: 'g28', title: 'Game Over', tags: ['game', 'over', 'lose', 'defeat'], thumb: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif', url: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif' },
  { id: 'g29', title: 'Win', tags: ['win', 'victory', 'champion', 'trophy'], thumb: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif', url: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif' },
  { id: 'g30', title: 'Silly', tags: ['silly', 'goofy', 'fun', 'crazy'], thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'g31', title: 'Wave', tags: ['wave', 'hello', 'hi', 'hey'], thumb: 'https://media.giphy.com/media/3oEjI6SII9dXgQTDAi/giphy.gif', url: 'https://media.giphy.com/media/3oEjI6SII9dXgQTDAi/giphy.gif' },
  { id: 'g32', title: 'Kiss', tags: ['kiss', 'love', 'mwah', 'xoxo'], thumb: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { id: 'g33', title: 'Wink', tags: ['wink', 'flirty', 'fun', 'cheeky'], thumb: 'https://media.giphy.com/media/l46C5Gso2VzRJWQK0/giphy.gif', url: 'https://media.giphy.com/media/l46C5Gso2VzRJWQK0/giphy.gif' },
  { id: 'g34', title: 'Screaming', tags: ['scream', 'scared', 'horror', 'terror'], thumb: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif', url: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif' },
  { id: 'g35', title: 'Eating', tags: ['eat', 'food', 'nom', 'yummy'], thumb: 'https://media.giphy.com/media/5tmrTFx3uQJb2WdvQY/giphy.gif', url: 'https://media.giphy.com/media/5tmrTFx3uQJb2WdvQY/giphy.gif' },
  { id: 'g36', title: 'Running', tags: ['run', 'running', 'fast', 'sprint'], thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'g37', title: 'Fighting', tags: ['fight', 'punch', 'boxing', 'strength'], thumb: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif', url: 'https://media.giphy.com/media/Z1kpJsveO7X56/giphy.gif' },
  { id: 'g38', title: 'Music', tags: ['music', 'song', 'listen', 'headphones'], thumb: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' },
  { id: 'g39', title: 'Coding', tags: ['code', 'coding', 'programming', 'hacker', 'dev'], thumb: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif', url: 'https://media.giphy.com/media/3o7TKTd1CJleonRrQs/giphy.gif' },
  { id: 'g40', title: 'Thank You', tags: ['thank', 'thanks', 'grateful', 'appreciate'], thumb: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
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
