import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import transporter from "../config/nodemailer.js";
import pool from "../config/mysql.js"
//registaration form
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    // Check if user already exists
    const [existingUser] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into database
    const [result] = await pool.query('INSERT INTO user (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    const userId = result.insertId;

    // Generate JWT token
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Sending welcome email
    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "🎮 Welcome to GauravGo - Your Adventure Awaits!",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="color: #00ffcc;">🔥 Welcome to GauravGo! 🔥</h1>
          <p style="font-size: 18px;">Hey <strong>${name}</strong>,</p>
          <p>You've successfully joined the world of <strong>SENA</strong>! 🎮</p>
          <p>Get ready for an epic gaming experience where adventure, skill, and strategy will define your journey.</p>
          <div style="margin: 20px 0;">
            <a href="https://gauravgo.com/login" style="background-color: #00ffcc; color: #1a1a1a; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 5px;">Start Playing Now</a>
          </div>
          <p>🚀 Your login email: <strong>${email}</strong></p>
          <p>If you have any questions, feel free to reach out. We’re here to help!</p>
          <p style="font-size: 16px; margin-top: 20px;">See you in the game! 🎮</p>
          <p><strong>- The GauravGo Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//login functionality
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({
      success: false,
      message: 'Email and password are required',
    });
  }

  try {
    // SQL query to find the user by email
    const query = 'SELECT * FROM user WHERE email = ?';
    const [results] = await pool.query(query, [email]);

    if (results.length === 0) {
      return res.json({ success: false, message: 'Invalid email' });
    }

    const user = results[0];

    // Compare the password with the hashed password stored in the database
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid password' });
    }

    // Create JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Set token in cookies
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ success: true, token });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
//logout functionality
export const logout = async (req, res) => {
  try {
    const { userId } = req.body; // Assuming userId is sent in the request body

    // Delete the user from the database
    await pool.query('DELETE FROM user WHERE id = ?', [userId]);

    // Clear the token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.json({ success: true, message: "Logged Out and User Deleted" });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.json({ success: false, message: error.message });
  }
};

//send verification OTP
export const sendVerifyOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    // Fetch the user by ID
    const [rows] = await pool.query('SELECT * FROM user WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }
    
    const user = rows[0];
    
    if (user.isAccountVerified) {
      return res.json({ success: false, message: "Account already verified" });
    }

    // Generate OTP and set expiry (10 minutes)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpireAt = Date.now() + 10 * 60 * 1000;

    // Update the user with the OTP and expiry time
    await pool.query(
      'UPDATE user SET verifyOtp = ?, verifyOtpExpireAt = ? WHERE id = ?',
      [otp, otpExpireAt, userId]
    );

    // Send the verification email
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "🔐 Account Verification OTP - Secure Your Access",
      html: `
                <div style="max-width: 500px; margin: auto; background: #111; padding: 20px; border-radius: 12px; 
                box-shadow: 0px 0px 15px rgba(0, 255, 255, 0.5); text-align: center; font-family: Arial, sans-serif; color: #ffffff;">
                    <h2 style="color: #0ff; text-shadow: 0px 0px 10px cyan;">🔐 Verify Your Account</h2>
                    <p style="font-size: 16px; color: #ddd;">Hello <strong style="color:#0ff;">${user.name}</strong>,</p>
                    <p style="font-size: 16px; color: #bbb;">Your One-Time Password (OTP) for account verification is:</p>
                    <p style="font-size: 24px; font-weight: bold; text-align: center; background: #222; padding: 12px; 
                    border-radius: 6px; color: #0ff; letter-spacing: 3px; text-shadow: 0px 0px 10px cyan; border: 2px solid cyan;">
                    ${otp}</p>
                    <p style="font-size: 16px; color: #bbb;">This OTP is valid for <strong style="color:#0ff;">10 minutes</strong>. 
                    Do not share it with anyone.</p>
                    <p style="font-size: 16px; color: #bbb;">If you did not request this, please ignore this email.</p>
                    <br>
                    <p style="font-size: 16px; color: #bbb;">Best Regards,<br><strong style="color:#0ff;">GauravGo Team</strong></p>
                </div>
            `,
    };

    await transporter.sendMail(mailOption);
    res.json({ success: true, message: "Verification OTP sent to Email" });
  } catch (error) {
    console.error("Error:", error);
    res.json({ success: false, message: error.message });
  }
};
//verify the email of user
export const verifyEmail = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.json({ success: false, message: "Missing Details" });
  }

  try {
    // Fetch user from the database
    const [rows] = await pool.query('SELECT * FROM user WHERE id = ?', [userId]);
    
    if (rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = rows[0];

    if (!user.verifyOtp || user.verifyOtp !== otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (user.verifyOtpExpireAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired" });
    }

    // Update user status to verified
    await pool.query(
      'UPDATE user SET isAccountVerified = ?, verifyOtp = ?, verifyOtpExpireAt = ? WHERE id = ?',
      [1, "", 0, userId]
    );

    return res.json({ success: true, message: "Email Verified" });

  } catch (error) {
    console.error("Error:", error);
    return res.json({ success: false, message: error.message });
  }
};

//check if user is authenticated
export const isAuthenticated = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "User ID is missing" });
    }

    // Fetch user from the database
    const [rows] = await pool.query('SELECT * FROM user WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

//send password Reset otp//error phase due to datatype error
export const sendResetOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    // Check if the user exists
    const [user] = await pool.query("SELECT id, name FROM user WHERE email = ?", [email]);
    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiredAt = Date.now() + 15 * 60 * 1000;

    await pool.query(
      "UPDATE user SET resetOtp = ?, resetOtpExpiredAt = ? WHERE email = ?",
      [otp, otpExpiredAt, email]
    );

    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "🔐 Password RESET OTP - Secure Your Access 🔐",
      html: `
        <div style="max-width: 500px; margin: auto; background: #111; padding: 20px; border-radius: 12px; 
        box-shadow: 0px 0px 15px rgba(0, 255, 255, 0.5); text-align: center; font-family: Arial, sans-serif; color: #ffffff;">
            <h2 style="color: #0ff; text-shadow: 0px 0px 10px cyan;">🔐 Verify Your Account</h2>
            <p style="font-size: 16px; color: #ddd;">Hello <strong style="color:#0ff;">${user[0].name}</strong>,</p>
            <p style="font-size: 16px; color: #bbb;">Your One-Time Password (OTP) for account verification is:</p>
            <p style="font-size: 24px; font-weight: bold; text-align: center; background: #222; padding: 12px; 
            border-radius: 6px; color: #0ff; letter-spacing: 3px; text-shadow: 0px 0px 10px cyan; border: 2px solid cyan;">
            ${otp}</p>
            <p style="font-size: 16px; color: #bbb;">This OTP is valid for <strong style="color:#0ff;">15 minutes</strong>. 
            Do not share it with anyone.</p>
            <p style="font-size: 16px; color: #bbb;">If you did not request this, please ignore this email.</p>
            <br>
            <p style="font-size: 16px; color: #bbb;">Best Regards,<br><strong style="color:#0ff;">GauravGo Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOption);

    return res.status(200).json({ success: true, message: "OTP sent to your mail" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
//reset user password//error phase
export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.json({ success: false, message: "All fields are required" });
  }

  try {
    // Fetch user details from SQL
    const [user] = await pool.query("SELECT * FROM user WHERE email = ?", [email]);

    if (user.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const foundUser = user[0];

    // Check OTP
    if (foundUser.resetOtp !== otp || !foundUser.resetOtp) {
      console.log("Stored OTP:", foundUser.resetOtp, "Received OTP:", otp);
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // Check OTP expiration
    if (foundUser.resetOtpExpiredAt < Date.now()) {
      return res.json({ success: false, message: "OTP Expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and reset OTP fields
    await pool.query(
      "UPDATE user SET password = ?, resetOtp = '', resetOtpExpiredAt = 0 WHERE email = ?",
      [hashedPassword, email]
    );

    return res.json({
      success: true,
      message: "Password reset successfully",
    });

  } catch (error) {
    console.error("Error resetting password:", error);
    return res.json({ success: false, message: error.message });
  }
};

