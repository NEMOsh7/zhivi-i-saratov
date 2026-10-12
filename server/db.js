import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Загружаем переменные из .env
dotenv.config();

// Создаём "пул" подключений к MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,      // localhost
  user: process.env.DB_USER,      // root
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,  // zhivi_saratov
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,            // максимум 10 одновременных подключений
  queueLimit: 0
});

// Проверяем подключение при запуске
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL подключён к базе:', connection.config.database);
    connection.release(); // освобождаем подключение
  } catch (err) {
    console.error('❌ Ошибка подключения к MySQL:', err.message);
  }
}

checkConnection();

export default pool;