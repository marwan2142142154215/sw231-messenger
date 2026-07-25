const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authGuard } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../..', 'uploads');
['images', 'videos', 'audio', 'files', 'voice'].forEach(f => {
  const dir = path.join(UPLOAD_DIR, f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'files';
    if (file.mimetype.startsWith('video/')) folder = 'videos';
    else if (file.mimetype.startsWith('audio/')) folder = 'audio';
    else if (file.mimetype.startsWith('image/')) folder = 'images';
    cb(null, path.join(UPLOAD_DIR, folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(exe|bat|cmd|sh|ps1|vbs|jar|msi|dll|scr|com|pif)$/i.test(file.originalname))
      return cb(new Error('File type not allowed'));
    cb(null, true);
  }
});

router.post('/upload', authGuard, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const file = req.file;
  let type = 'file', folder = 'files';
  if (file.mimetype.startsWith('video/')) { type = 'video'; folder = 'videos'; }
  else if (file.mimetype.startsWith('audio/')) { type = 'audio'; folder = 'audio'; }
  else if (file.mimetype.startsWith('image/')) { type = 'image'; folder = 'images'; }
  res.json({ url: '/uploads/' + folder + '/' + file.filename, type, mimeType: file.mimetype, size: file.size, originalName: file.originalname });
});

router.post('/upload-voice', authGuard, upload.single('voice'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No voice file' });
  const filename = uuidv4() + '.webm';
  const dir = path.join(UPLOAD_DIR, 'voice');
  const oldPath = req.file.path;
  const newPath = path.join(dir, filename);
  fs.renameSync(oldPath, newPath);
  res.json({ url: '/uploads/voice/' + filename, mimeType: 'audio/webm', size: req.file.size });
});

router.get('/stickers', (req, res) => {
  res.json({
    categories: [
      { name: 'Smileys', stickers: ['😀','😂','😍','🥰','😎','🤩','😇','🥺','😭','🥳','🤔','😱','🤫','🥴','🤯','💀','👻','🤖','🤡','👽'] },
      { name: 'Hearts', stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖','💗','💘','💝','💞','💓','💟'] },
      { name: 'Gestures', stickers: ['👍','👎','👋','🤝','🙏','💪','✌️','🤙','👆','👇','👈','👉','🫶','👏','🙌','✋'] },
      { name: 'Animals', stickers: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔'] },
      { name: 'Food', stickers: ['🍕','🍔','🍟','🌮','🍣','🍩','🍪','🎂','🍰','☕','🧋','🍺','🍷','🥤','🍎','🍕'] },
      { name: 'Nature', stickers: ['🌸','🌺','🌻','🌹','🌈','⭐','🌙','☀️','🔥','❄️','🌊','🍃','🌴','🌵','🍄','💎'] }
    ]
  });
});

module.exports = router;
