import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import pool from "./config/mysql.js"; // Import MySQL connection

const app = express();
const port = process.env.PORT || 4000;
const allowedOrigin = [
  // "https://cheerful-croquembouche-c05303.netlify.app",
  // "http://localhost:5173",
  // "http://65.2.112.209",
  // "http://65.2.112.209:5173",
  // "http://localhost:4000",
  // "https://app.netlify.com",
  // "http://65.2.112.209:4000/",
  "*"
];

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
     origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Test MySQL connection on server start
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL Connected");
    connection.release();
  } catch (error) {
    console.error("MySQL Connection Error:", error.message);
  }
})();

// API ENDPOINT
app.get("/", (req, res) => {
  res.send("API START");
});

// Define /leaderboard Route
const leaderboard = [
  { id: 1, name: "Player 1", score: 100 },
  { id: 2, name: "Player 2", score: 90 },
];
app.get("/leaderboard", (req, res) => {
  res.json(leaderboard);
});

// Import Routes (optional)
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);

app.listen(port, () => {
  console.log(`Server started on port no: ${port}`);
});
