const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authGuard } = require('../middleware/guard');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'images';
    if (file.mimetype.startsWith('video/')) folder = 'videos';
    else if (file.mimetype.startsWith('audio/')) folder = 'audio';
    const dir = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || getExtFromMime(file.mimetype);
    cb(null, `${uuidv4()}${ext}`);
  }
});

function getExtFromMime(mime) {
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
    'image/webp': '.webp', 'image/svg+xml': '.svg',
    'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogg',
    'audio/mpeg': '.mp3', 'audio/ogg': '.ogg', 'audio/wav': '.wav',
    'audio/webm': '.webm'
  };
  return map[mime] || '.bin';
}

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /^(image|video|audio)\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung.'));
    }
  }
});

router.post('/upload', authGuard, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file.' });

    const file = req.file;
    let type = 'file';
    let url = `/uploads/images/${file.filename}`;
    let thumbnailUrl = null;

    if (file.mimetype.startsWith('video/')) {
      type = 'video';
      url = `/uploads/videos/${file.filename}`;
    } else if (file.mimetype.startsWith('audio/')) {
      type = 'audio';
      url = `/uploads/audio/${file.filename}`;
    } else if (file.mimetype.startsWith('image/')) {
      type = 'image';
      url = `/uploads/images/${file.filename}`;
    }

    res.json({
      url,
      type,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
      thumbnailUrl
    });
  } catch (err) {
    console.error('[MEDIA] Upload error:', err);
    res.status(500).json({ error: 'Gagal upload file.' });
  }
});

router.post('/upload-multiple', authGuard, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Tidak ada file.' });

    const results = req.files.map(file => {
      let type = 'file';
      let url = `/uploads/images/${file.filename}`;
      if (file.mimetype.startsWith('video/')) { type = 'video'; url = `/uploads/videos/${file.filename}`; }
      else if (file.mimetype.startsWith('audio/')) { type = 'audio'; url = `/uploads/audio/${file.filename}`; }
      else if (file.mimetype.startsWith('image/')) { type = 'image'; url = `/uploads/images/${file.filename}`; }
      return { url, type, mimeType: file.mimetype, size: file.size, originalName: file.originalname };
    });

    res.json({ files: results });
  } catch (err) {
    console.error('[MEDIA] Multi upload error:', err);
    res.status(500).json({ error: 'Gagal upload file.' });
  }
});

router.post('/upload-voice', authGuard, (req, res) => {
  const uploadSingle = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(UPLOAD_DIR, 'voice');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => cb(null, `${uuidv4()}.webm`)
    }),
    limits: { fileSize: 50 * 1024 * 1024 }
  }).single('voice');

  uploadSingle(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file.' });
    res.json({
      url: `/uploads/voice/${req.file.filename}`,
      type: 'voice',
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  });
});

router.get('/stickers', authGuard, (req, res) => {
  res.json({
    categories: [
      {
        name: 'Smileys',
        stickers: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎','🤓']
      },
      {
        name: 'Gestures',
        stickers: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤝','🙏','💪']
      },
      {
        name: 'Hearts',
        stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟']
      },
      {
        name: 'Animals',
        stickers: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦋','🐝','🐙','🦑','🐢','🐍','🦎','🦖','🐴','🦄']
      },
      {
        name: 'Food',
        stickers: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🥑','🍔','🍟','🍕','🌮','🌯','🥗','🍰','🍩','🍪','🍫','☕','🍺','🍷']
      },
      {
        name: 'Objects',
        stickers: ['⌚','📱','💻','🖥️','📷','📹','🎥','📞','📺','🎵','🎶','🎸','🎹','🎺','🏈','⚽','🏀','🎮','🎲','🧩','🎨','💡','🔑','💰','📦','🎁']
      },
      {
        name: 'Nature',
        stickers: ['🌸','🌺','🌻','🌹','🌷','🌱','🌲','🌳','🍀','🍁','🍂','🌊','🔥','❄️','⭐','🌙','☀️','🌈','☁️','⚡']
      },
      {
        name: 'Flags',
        stickers: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️']
      }
    ]
  });
});

module.exports = router;
