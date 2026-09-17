require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const staffRoutes = require("./routes/staff");
const adminRoutes = require("./routes/admin");
const portalRoutes = require("./routes/portal");
const clockRoutes = require("./routes/clock");
const outboxRoutes = require("./routes/outbox");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api", clockRoutes);
app.use("/api", outboxRoutes);
app.use("/", clockRoutes);
app.use("/", outboxRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] failed to connect to MongoDB", err);
    process.exit(1);
  });
