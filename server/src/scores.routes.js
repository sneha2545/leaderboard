import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Score } from './scores.model.js';

const router = Router();

const createScoreSchema = z.object({
  name: z.string().min(1).max(50),
  score: z.number().int().nonnegative(),
});

const updateScoreSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  score: z.number().int().nonnegative().optional(),
}).refine(v => typeof v.name !== 'undefined' || typeof v.score !== 'undefined', {
  message: 'At least one of name or score is required'
});

// In-memory fallback store when MongoDB isn't connected
const mem = { data: [] };

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);
    if (mongoose.connection.readyState === 1) {
      const scores = await Score.find().sort({ score: -1, createdAt: 1 }).limit(limit).lean();
      return res.json(scores);
    }
    const sorted = [...mem.data].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, limit);
    res.json(sorted);
  } catch (e) {
    console.error('GET /api/scores failed:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const parse = createScoreSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parse.error.issues });
    }
    const { name, score } = parse.data;
    if (mongoose.connection.readyState === 1) {
      const doc = await Score.create({ name, score });
      return res.status(201).json(doc);
    }
    // memory mode
    const doc = { _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name, score, createdAt: new Date(), updatedAt: new Date() };
    mem.data.push(doc);
    res.status(201).json(doc);
  } catch (e) {
    console.error('POST /api/scores failed:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parse = updateScoreSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid payload', issues: parse.error.issues });
    }
    const updates = parse.data;
    if (mongoose.connection.readyState === 1) {
      try {
        const updated = await Score.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
        if (!updated) return res.status(404).json({ error: 'Not found' });
        return res.json(updated);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid id' });
      }
    }
    // memory
    const idx = mem.data.findIndex(x => String(x._id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    mem.data[idx] = { ...mem.data[idx], ...updates, updatedAt: new Date() };
    return res.json(mem.data[idx]);
  } catch (e) {
    console.error('PATCH /api/scores/:id failed:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      try {
        const deleted = await Score.findByIdAndDelete(id).lean();
        if (!deleted) return res.status(404).json({ error: 'Not found' });
        return res.status(204).send();
      } catch (e) {
        return res.status(400).json({ error: 'Invalid id' });
      }
    }
    // memory
    const before = mem.data.length;
    mem.data = mem.data.filter(x => String(x._id) !== String(id));
    if (mem.data.length === before) return res.status(404).json({ error: 'Not found' });
    return res.status(204).send();
  } catch (e) {
    console.error('DELETE /api/scores/:id failed:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
