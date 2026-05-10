const mongoose = require("mongoose");

// ── Worker ────────────────────────────────────────────────
const workerSchema = new mongoose.Schema({
  worker_id: { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  role:      { type: String, default: "Operator" },
  shift:     { type: String, enum: ["Morning", "Afternoon"], default: "Morning" },
}, { timestamps: true });

// ── Workstation ───────────────────────────────────────────
const workstationSchema = new mongoose.Schema({
  station_id: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  type:       { type: String, required: true },
  location:   { type: String, default: "Floor A" },
}, { timestamps: true });

// ── Event ─────────────────────────────────────────────────
const eventSchema = new mongoose.Schema({
  event_id:       { type: String, unique: true, sparse: true },
  timestamp:      { type: Date,   required: true, index: true },
  worker_id:      { type: String, required: true, ref: "Worker",      index: true },
  workstation_id: { type: String, required: true, ref: "Workstation", index: true },
  event_type:     {
    type: String, required: true, index: true,
    enum: ["working", "idle", "absent", "product_count"],
  },
  confidence:     { type: Number, default: 1.0, min: 0, max: 1 },
  count:          { type: Number, default: 0,   min: 0 },
  ingested_at:    { type: Date,   default: Date.now },
  model_version:  { type: String, default: "cv-model-v1.0" },
}, { timestamps: false });

// Compound index for efficient per-worker timeline queries
eventSchema.index({ worker_id: 1, timestamp: 1 });
eventSchema.index({ workstation_id: 1, timestamp: 1 });

const Worker      = mongoose.model("Worker",      workerSchema);
const Workstation = mongoose.model("Workstation", workstationSchema);
const Event       = mongoose.model("Event",       eventSchema);

module.exports = { Worker, Workstation, Event };
