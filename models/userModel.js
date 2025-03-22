import pool from '../config/mysql.js';

// Insert user into MySQL
export const userModel = async (userData) => {
  const { name, email, password, verifyOtp, verifyOtpExpireAt, isAccountVerified, resetOtp, resetOtpExpiredAt } = userData;
  const query = `
    INSERT INTO user (name, email, password, verifyOtp, verifyOtpExpireAt, isAccountVerified, resetOtp, resetOtpExpiredAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(query, [name, email, password, verifyOtp, verifyOtpExpireAt, isAccountVerified, resetOtp, resetOtpExpiredAt]);
  return result.insertId;
};

// Fetch user by email (for login)
export  const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM user WHERE email = ?';
  const [rows] = await pool.query(query, [email]);
  return rows[0];
};
export const findById = async (id) => {
  const query = 'SELECT * FROM user WHERE id = ?';
  const [rows] = await pool.query(query, [id]);
  return rows[0];
};
export default userModel;