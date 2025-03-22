import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import pool from "./config/mysql.js"; // Import MySQL connection

dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

// CORS Middleware (Place at the top)
app.use(cors({
  origin: ["https://sena-client.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true // Allow credentials
}));

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Respond to preflight with success
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

// Test MySQL connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ MySQL Connected");
    connection.release();
  } catch (error) {
    console.error("❌ MySQL Connection Error:", error.message);
  }
})();

// API Routes
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
