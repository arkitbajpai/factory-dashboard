const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { Worker, Workstation, Event } = require("../models");

const router     = express.Router();
const VALID_TYPES = new Set(["working", "idle", "absent", "product_count"]);

function validateEvent(ev) {
  const errors = [];
  if (!ev.timestamp)      errors.push("timestamp is required");
  else if (isNaN(new Date(ev.timestamp))) errors.push("timestamp must be a valid ISO 8601 date");
  if (!ev.worker_id)      errors.push("worker_id is required");
  if (!ev.workstation_id) errors.push("workstation_id is required");
  if (!ev.event_type)     errors.push("event_type is required");
  else if (!VALID_TYPES.has(ev.event_type))
    errors.push(`event_type must be one of: ${[...VALID_TYPES].join(", ")}`);
  if (ev.confidence !== undefined && (ev.confidence < 0 || ev.confidence > 1))
    errors.push("confidence must be between 0 and 1");
  if (ev.count !== undefined && ev.count < 0)
    errors.push("count must be >= 0");
  return errors;
}

async function ingestOne(ev) {
  const worker = await Worker.findOne({ worker_id: ev.worker_id });
  if (!worker) return { status: "erro sorry ", detail: `Worker ${ev.worker_id} not found` };

  const station = await Workstation.findOne({ station_id: ev.workstation_id });
  if (!station) return { status: "error", detail: `Workstation ${ev.workstation_id} not found` };

  const eid = ev.event_id || `EVT-${uuidv4().replace(/-/g,"").slice(0,12).toUpperCase()}`;

  try {
    const doc = await Event.create({
      event_id:       eid,
      timestamp:      new Date(ev.timestamp),
      worker_id:      ev.worker_id,
      workstation_id: ev.workstation_id,
      event_type:     ev.event_type,
      confidence:     ev.confidence ?? 1.0,
      count:          ev.count ?? 0,
      model_version:  ev.model_version || "cv-model-v1.0",
    });
    return { event_id: eid, db_id: doc._id, status: "inserted" };
  } catch (err) {
    if (err.code === 11000) return { event_id: eid, status: "duplicate_skipped" };
    throw err;
  }
}

// POST /api/events/ingest
router.post("/ingest", async (req, res) => {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  try {
    const result = await ingestOne(req.body);
    if (result.status === "error") return res.status(404).json({ detail: result.detail });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/events/ingest/batch
router.post("/ingest/batch", async (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events)) return res.status(400).json({ detail: "'events' must be an array" });

  const results = [];
  for (const ev of events) {
    const errors = validateEvent(ev);
    if (errors.length) { results.push({ event_id: ev.event_id, status: "error", detail: errors.join("; ") }); continue; }
    try {
      results.push(await ingestOne(ev));
    } catch (err) {
      results.push({ event_id: ev.event_id, status: "error", detail: err.message });
    }
  }

  const inserted   = results.filter(r => r.status === "inserted").length;
  const duplicates = results.filter(r => r.status === "duplicate_skipped").length;
  const errors     = results.filter(r => r.status === "error").length;
  return res.json({ total: results.length, inserted, duplicates, errors, results });
});

// GET /api/events/
router.get("/", async (req, res) => {
  const { worker_id, workstation_id, event_type, limit = 100 } = req.query;
  const filter = {};
  if (worker_id)      filter.worker_id      = worker_id;
  if (workstation_id) filter.workstation_id = workstation_id;
  if (event_type)     filter.event_type     = event_type;

  try {
    const docs = await Event.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
