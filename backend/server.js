require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { connectDB } = require("./db");
const { seedAll }   = require("./seed");

const eventsRouter  = require("./routers/events");
const metricsRouter = require("./routers/metrics");
const seedRouter    = require("./routers/seed");

const app  = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use("/api/events",  eventsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/seed",    seedRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "factory-dashboard-api", db: "MongoDB Atlas", runtime: "Node.js" });
});

app.use((_req, res) => res.status(404).json({ detail: "Not found" }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: err.message || "Internal server error" });
});

async function start() {
  await connectDB();
  await seedAll(false); // seed only if DB is empty
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[API] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
