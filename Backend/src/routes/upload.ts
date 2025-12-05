import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { processFile } from '../services/processor';

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads');
try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) { }
const upload = multer({ dest: uploadDir });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const io = req.app.get('io');
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const result = await processFile(filePath, originalName, io);
    try { fs.unlinkSync(filePath); } catch (e) { }
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
