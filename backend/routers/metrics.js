/**
 * Metrics computation using MongoDB aggregation pipelines.
 *
 * Assumptions:
 * 1. Duration = gap to next event for same worker, capped at 30 minutes.
 * 2. product_count events contribute units only (not time).
 * 3. Utilization = working / (working + idle) × 100.
 * 4. Workstation occupancy = sum of working durations at that station.
 */

const express = require("express");
const { Worker, Workstation, Event } = require("../models");

const router  = express.Router();
const CAP_MS  = 30 * 60 * 1000; // 30-minute cap in milliseconds

// ── Helper: compute metrics from sorted event array ───────
function computeWorkerMetrics(events) {
  let workingMs = 0, idleMs = 0, absentMs = 0, units = 0;

  for (let i = 0; i < events.length; i++) {
    const { event_type, count, timestamp } = events[i];

    if (event_type === "product_count") { units += count; continue; }

    let durationMs;
    if (i + 1 < events.length) {
      const diff = new Date(events[i + 1].timestamp) - new Date(timestamp);
      durationMs = Math.max(0, Math.min(diff, CAP_MS));
    } else {
      durationMs = 5 * 60 * 1000; // 5-min tail
    }

    if (event_type === "working") workingMs += durationMs;
    else if (event_type === "idle")   idleMs += durationMs;
    else if (event_type === "absent") absentMs += durationMs;
  }

  const presentMs      = workingMs + idleMs;
  const utilizationPct = presentMs > 0 ? (workingMs / presentMs) * 100 : 0;
  const workingH       = workingMs / 3_600_000;
  const unitsPerHour   = workingH > 0 ? units / workingH : 0;

  return {
    working_seconds:  Math.round(workingMs / 1000),
    idle_seconds:     Math.round(idleMs    / 1000),
    absent_seconds:   Math.round(absentMs  / 1000),
    total_seconds:    Math.round((workingMs + idleMs + absentMs) / 1000),
    utilization_pct:  parseFloat(utilizationPct.toFixed(1)),
    units_produced:   units,
    units_per_hour:   parseFloat(unitsPerHour.toFixed(2)),
  };
}

function computeStationMetrics(events) {
  let workingMs = 0, units = 0;

  for (let i = 0; i < events.length; i++) {
    const { event_type, count, timestamp } = events[i];
    if (event_type === "product_count") { units += count; continue; }

    let durationMs;
    if (i + 1 < events.length) {
      const diff = new Date(events[i + 1].timestamp) - new Date(timestamp);
      durationMs = Math.max(0, Math.min(diff, CAP_MS));
    } else {
      durationMs = 5 * 60 * 1000;
    }
    if (event_type === "working") workingMs += durationMs;
  }

  const occupancyH  = workingMs / 3_600_000;
  const throughput  = occupancyH > 0 ? units / occupancyH : 0;

  return {
    occupancy_seconds: Math.round(workingMs / 1000),
    occupancy_hours:   parseFloat(occupancyH.toFixed(2)),
    units_produced:    units,
    throughput_rate:   parseFloat(throughput.toFixed(2)),
  };
}

// GET /api/metrics/factory
router.get("/factory", async (req, res) => {
  try {
    const workers = await Worker.find().lean();
    let totalWorkingS = 0, totalUnits = 0;
    const utilValues = [];

    for (const w of workers) {
      const events = await Event.find({ worker_id: w.worker_id }).sort({ timestamp: 1 }).lean();
      const m = computeWorkerMetrics(events);
      totalWorkingS += m.working_seconds;
      totalUnits    += m.units_produced;
      utilValues.push(m.utilization_pct);
    }

    const avgUtil     = utilValues.length ? utilValues.reduce((a,b)=>a+b,0)/utilValues.length : 0;
    const workingH    = totalWorkingS / 3600;
    const avgProdRate = workingH > 0 ? totalUnits / workingH : 0;

    // Shift span from first to last event
    const first = await Event.findOne().sort({ timestamp:  1 }).lean();
    const last  = await Event.findOne().sort({ timestamp: -1 }).lean();
    const shiftDuration = (first && last)
      ? (new Date(last.timestamp) - new Date(first.timestamp)) / 1000
      : 0;

    const totalEvents = await Event.countDocuments();

    return res.json({
      total_productive_time_seconds: totalWorkingS,
      total_productive_time_hours:   parseFloat((totalWorkingS/3600).toFixed(2)),
      total_production_count:        totalUnits,
      average_production_rate:       parseFloat(avgProdRate.toFixed(2)),
      average_utilization_pct:       parseFloat(avgUtil.toFixed(1)),
      shift_duration_seconds:        Math.round(shiftDuration),
      total_events:                  totalEvents,
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/metrics/workers?worker_id=W1
router.get("/workers", async (req, res) => {
  try {
    const filter = req.query.worker_id ? { worker_id: req.query.worker_id } : {};
    const workers = await Worker.find(filter).sort({ worker_id: 1 }).lean();
    if (req.query.worker_id && !workers.length)
      return res.status(404).json({ detail: "Worker not found" });

    const result = await Promise.all(workers.map(async w => {
      const events = await Event.find({ worker_id: w.worker_id }).sort({ timestamp: 1 }).lean();
      const m = computeWorkerMetrics(events);
      return { ...w, ...m, total_events: events.length };
    }));

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/metrics/workstations?station_id=S1
router.get("/workstations", async (req, res) => {
  try {
    const filter = req.query.station_id ? { station_id: req.query.station_id } : {};
    const stations = await Workstation.find(filter).sort({ station_id: 1 }).lean();
    if (req.query.station_id && !stations.length)
      return res.status(404).json({ detail: "Workstation not found" });

    const result = await Promise.all(stations.map(async s => {
      const events = await Event.find({ workstation_id: s.station_id }).sort({ timestamp: 1 }).lean();
      const m = computeStationMetrics(events);

      let utilPct = 0;
      if (events.length > 1) {
        const span = (new Date(events[events.length-1].timestamp) - new Date(events[0].timestamp)) / 1000;
        if (span > 0) utilPct = Math.min((m.occupancy_seconds / span) * 100, 100);
      }

      return { ...s, ...m, utilization_pct: parseFloat(utilPct.toFixed(1)), total_events: events.length };
    }));

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/metrics/timeline?worker_id=W1&limit=200
router.get("/timeline", async (req, res) => {
  try {
    const { worker_id, workstation_id, limit = 200 } = req.query;
    const filter = {};
    if (worker_id)      filter.worker_id      = worker_id;
    if (workstation_id) filter.workstation_id = workstation_id;

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
