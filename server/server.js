import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { register, login, me } from './auth.js';
import pool from './db.js';

// Получаем путь к текущей папке
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// API РОУТЫ
// ============================================
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', me);

// Сохранить заявку из формы
app.post('/api/applications', async (req, res) => {
  try {
    const { name, contact, sport_track, message, token } = req.body;

    let userId = null;
    if (token) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch (e) {}
    }

    const [result] = await pool.execute(
      'INSERT INTO applications (user_id, name, contact, sport_track, message) VALUES (?, ?, ?, ?, ?)',
      [userId, name, contact, sport_track, message || null]
    );

    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Application error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Если запрос не API — отдаём index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ============================================
// ЗАПУСК СЕРВЕРА (ЭТА СТРОКА КЛЮЧЕВАЯ!)
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
  console.log(`📁 Раздаём файлы из: ${path.join(__dirname, '../public')}`);
});