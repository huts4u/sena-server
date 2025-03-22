// config/mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test the connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL Connected");
    connection.release();
  } catch (error) {
    console.error("MySQL Connection Error:", error.message);
  }
};
testConnection();

export default pool;
