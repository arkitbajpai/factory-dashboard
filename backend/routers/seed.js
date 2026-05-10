const express = require("express");
const { Event, Worker, Workstation } = require("../models");
const { seedAll } = require("../seed");

const router = express.Router();

// POST /api/seed/refresh — evaluators use this
router.post("/refresh", async (req, res) => {
  try {
    const count = await seedAll(true); // force = true
    return res.json({
      status: "ok",
      message: "Seed data refreshed successfully",
      events_inserted: count,
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/seed/status
router.get("/status", async (req, res) => {
  try {
    const total    = await Event.countDocuments();
    const workers  = await Worker.countDocuments();
    const stations = await Workstation.countDocuments();

    const byType = await Event.aggregate([
      { $group: { _id: "$event_type", count: { $sum: 1 } } },
    ]);

    return res.json({
      total_events:   total,
      workers,
      workstations:   stations,
      by_event_type:  Object.fromEntries(byType.map(r => [r._id, r.count])),
    });
  } catch (err) {
    return res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
