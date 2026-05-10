const { Worker, Workstation, Event } = require("./models");

const WORKERS = [
  { worker_id: "W1", name: "Arjun Sharma",  role: "Senior Operator", shift: "Morning"   },
  { worker_id: "W2", name: "Priya Mehta",   role: "Operator",        shift: "Morning"   },
  { worker_id: "W3", name: "Rohit Verma",   role: "Operator",        shift: "Morning"   },
  { worker_id: "W4", name: "Sneha Patel",   role: "Technician",      shift: "Afternoon" },
  { worker_id: "W5", name: "Karan Singh",   role: "Operator",        shift: "Afternoon" },
  { worker_id: "W6", name: "Divya Nair",    role: "Senior Operator", shift: "Afternoon" },
];

const WORKSTATIONS = [
  { station_id: "S1", name: "Assembly Line A", type: "Assembly",      location: "Floor A" },
  { station_id: "S2", name: "Assembly Line B", type: "Assembly",      location: "Floor A" },
  { station_id: "S3", name: "Welding Bay 1",   type: "Welding",       location: "Floor B" },
  { station_id: "S4", name: "Welding Bay 2",   type: "Welding",       location: "Floor B" },
  { station_id: "S5", name: "QC Station 1",    type: "Quality Check", location: "Floor C" },
  { station_id: "S6", name: "Packaging Unit",  type: "Packaging",     location: "Floor C" },
];

const ASSIGNMENT = { W1:"S1", W2:"S2", W3:"S3", W4:"S4", W5:"S5", W6:"S6" };

const PROFILES = {
  W1: { workRatio: 0.85, unitsPerHour: 14 },
  W2: { workRatio: 0.78, unitsPerHour: 11 },
  W3: { workRatio: 0.70, unitsPerHour:  9 },
  W4: { workRatio: 0.82, unitsPerHour: 12 },
  W5: { workRatio: 0.65, unitsPerHour:  8 },
  W6: { workRatio: 0.90, unitsPerHour: 16 },
};

const rand    = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));

async function seedStaticData() {
  // Upsert workers and workstations (idempotent)
  for (const w of WORKERS) {
    await Worker.findOneAndUpdate({ worker_id: w.worker_id }, w, { upsert: true, new: true });
  }
  for (const s of WORKSTATIONS) {
    await Workstation.findOneAndUpdate({ station_id: s.station_id }, s, { upsert: true, new: true });
  }
  console.log("[Seed] Workers & workstations ready ✓");
}

async function seedEvents(force = false) {
  if (!force) {
    const count = await Event.countDocuments();
    if (count > 0) {
      console.log(`[Seed] ${count} events already exist, skipping event seed`);
      return 0;
    }
  } else {
    await Event.deleteMany({});
    console.log("[Seed] Cleared existing events");
  }

  const now        = Date.now();
  const shiftStart = now - 8 * 60 * 60 * 1000;
  const eventsToInsert = [];
  let counter = 0;

  for (const workerId of Object.keys(PROFILES)) {
    const stationId = ASSIGNMENT[workerId];
    const profile   = PROFILES[workerId];
    let tsMs        = shiftStart + randInt(0, 300_000);

    while (tsMs < now) {
      const r = Math.random();
      let etype, durationMs;

      if (r < profile.workRatio) {
        etype      = "working";
        durationMs = randInt(8, 20) * 60_000;
      } else if (r < profile.workRatio + 0.12) {
        etype      = "idle";
        durationMs = randInt(3, 10) * 60_000;
      } else {
        etype      = "absent";
        durationMs = randInt(5, 15) * 60_000;
      }

      counter++;
      eventsToInsert.push({
        event_id:       `EVT-SEED-${String(counter).padStart(6, "0")}`,
        timestamp:      new Date(tsMs),
        worker_id:      workerId,
        workstation_id: stationId,
        event_type:     etype,
        confidence:     parseFloat(rand(0.80, 0.99).toFixed(2)),
        count:          0,
        model_version:  "cv-model-v1.0",
      });

      // product_count after working session
      if (etype === "working") {
        const hours = durationMs / 3_600_000;
        const units = Math.max(1, Math.round(hours * profile.unitsPerHour * rand(0.8, 1.2)));
        const pcTs  = tsMs + durationMs + randInt(10_000, 60_000);
        if (pcTs < now) {
          counter++;
          eventsToInsert.push({
            event_id:       `EVT-SEED-${String(counter).padStart(6, "0")}`,
            timestamp:      new Date(pcTs),
            worker_id:      workerId,
            workstation_id: stationId,
            event_type:     "product_count",
            confidence:     parseFloat(rand(0.88, 0.99).toFixed(2)),
            count:          units,
            model_version:  "cv-model-v1.0",
          });
        }
      }

      tsMs += durationMs + randInt(30_000, 120_000);
    }
  }

  // Bulk insert with ordered:false to skip duplicates gracefully
  try {
    await Event.insertMany(eventsToInsert, { ordered: false });
  } catch (err) {
    if (err.code !== 11000) throw err; // ignore duplicate key errors
  }

  console.log(`[Seed] Inserted ${eventsToInsert.length} events ✓`);
  return eventsToInsert.length;
}

async function seedAll(force = false) {
  await seedStaticData();
  return seedEvents(force);
}

module.exports = { seedAll, seedEvents, seedStaticData };
