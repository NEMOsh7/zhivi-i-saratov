import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10; // сколько раз "перемешивать" пароль (10 — стандарт)

// ============================================
// РЕГИСТРАЦИЯ
// ============================================
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    // 1. Проверяем, что все поля заполнены
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Заполни все поля' });
    }

    // 2. Проверяем длину пароля
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    // 3. Проверяем формат email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    // 4. Проверяем, нет ли уже такого email в базе
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Этот email уже зарегистрирован' });
    }

    // 5. Хешируем пароль (bcrypt добавляет соль автоматически!)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 6. Сохраняем пользователя в базу
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase(), passwordHash]
    );

    // 7. Создаём JWT-токен (это как "пропуск" на 7 дней)
    const token = jwt.sign(
      { id: result.insertId, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 8. Отправляем ответ клиенту
    res.json({
      success: true,
      token,
      user: { 
        id: result.insertId, 
        name: name.trim(), 
        email: email.toLowerCase() 
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ============================================
// ВХОД
// ============================================
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Заполни все поля' });
    }

    // 1. Ищем пользователя по email
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = users[0];

    // 2. Сравниваем введённый пароль с хешем в базе
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    // 3. Обновляем время последнего входа
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // 4. Создаём токен
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
}

// ============================================
// ПОЛУЧИТЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ (по токену)
// ============================================
export async function me(req, res) {
  try {
    const authHeader = req.headers.authorization;
    
    // Проверяем, есть ли заголовок Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    const token = authHeader.split(' ')[1];
    
    // Проверяем токен
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ищем пользователя
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user: users[0] });

  } catch (err) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}