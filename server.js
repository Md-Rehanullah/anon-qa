require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const Filter = require('bad-words');

const Question = require('./models/Question');
const Answer = require('./models/Answer');

const app = express();
const filter = new Filter();

// security & basics
app.use(helmet());
app.use(express.json({ limit: '64kb' }));
app.use(morgan('tiny'));
app.use(cors());
app.set('trust proxy', 1);
app.use(rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));

// ask a question
app.post('/api/ask', async (req, res) => {
  try {
    const text = (req.body?.text || '').trim();
    if (text.length < 8 || text.length > 300) return res.status(400).json({ error: 'Question must be 8–300 characters.' });
    const clean = filter.clean(text);
    const q = await Question.create({ text: clean });
    res.json({ id: q._id.toString() });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// list questions
app.get('/api/questions', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 50);
    const items = await Question.find({ status: 'visible' }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// answer
app.post('/api/questions/:id/answer', async (req, res) => {
  try {
    const text = (req.body?.text || '').trim();
    if (text.length < 2 || text.length > 500) return res.status(400).json({ error: 'Answer must be 2–500 characters.' });
    const q = await Question.findById(req.params.id);
    if (!q || q.status !== 'visible') return res.status(404).json({ error: 'Question not found' });
    const clean = filter.clean(text);
    await Answer.create({ questionId: q._id, text: clean });
    await Question.updateOne({ _id: q._id }, { $inc: { answersCount: 1 } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// answers for a question
app.get('/api/questions/:id/answers', async (req, res) => {
  try {
    const items = await Answer.find({ questionId: req.params.id }).sort({ createdAt: 1 }).lean();
    res.json({ items });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// admin hide
app.post('/api/admin/hide/:id', async (req, res) => {
  try {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
    await Question.updateOne({ _id: req.params.id }, { $set: { status: 'hidden' } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// serve frontend
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;
async function start() {
  if (!process.env.MONGODB_URI) { console.error('Missing MONGODB_URI'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log('Server listening on port', PORT));
}
start();
