const express = require("express");
const BookingEvent = require("../models/BookingEvent");
const Booking = require("../models/Booking");
const Creator = require("../models/Creator");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(protect, authorize("creator"));

// Helper: get creator from user
async function getCreator(userId) {
  return Creator.findOne({ user: userId });
}

// GET all events for a specific booking
router.get("/booking/:bookingId", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const events = await BookingEvent.find({
      booking: req.params.bookingId,
      creator: creator._id,
    }).sort("eventDate");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// GET all events for creator (for calendar view)
router.get("/calendar", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { month, year } = req.query;

    let query = { creator: creator._id };
    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.eventDate = { $gte: start, $lte: end };
    }

    const events = await BookingEvent.find(query)
      .populate("booking", "clientName eventType amount advancePaid remaining paymentStatus packageName")
      .sort("eventDate");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// GET all events for creator (all time, for full calendar)
router.get("/all", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const events = await BookingEvent.find({ creator: creator._id })
      .populate("booking", "clientName eventType amount advancePaid remaining paymentStatus packageName clientPhone clientEmail creatorNotes")
      .sort("eventDate");
    res.json({ success: true, events });
  } catch (e) {
    next(e);
  }
});

// POST create a new event for a booking
router.post("/", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { bookingId, eventName, eventDate, startTime, endTime, location, notes, assignedTeam } = req.body;

    if (!bookingId || !eventName || !eventDate) {
      return res.status(400).json({ success: false, message: "Booking ID, event name, and date are required" });
    }

    // Verify booking belongs to this creator
    const booking = await Booking.findOne({ _id: bookingId, creator: creator._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const event = await BookingEvent.create({
      booking: bookingId,
      creator: creator._id,
      eventName,
      eventDate,
      startTime: startTime || "",
      endTime: endTime || "",
      location: location || booking.eventLocation || "",
      notes: notes || "",
      assignedTeam: assignedTeam || "",
      status: "upcoming",
    });

    res.status(201).json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// POST bulk create events for a booking
router.post("/bulk", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const { bookingId, events } = req.body;

    if (!bookingId || !events || !events.length) {
      return res.status(400).json({ success: false, message: "Booking ID and events array required" });
    }

    const booking = await Booking.findOne({ _id: bookingId, creator: creator._id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const created = await BookingEvent.insertMany(
      events.map((e) => ({
        booking: bookingId,
        creator: creator._id,
        eventName: e.eventName,
        eventDate: e.eventDate,
        startTime: e.startTime || "",
        endTime: e.endTime || "",
        location: e.location || booking.eventLocation || "",
        notes: e.notes || "",
        assignedTeam: e.assignedTeam || "",
        status: "upcoming",
      }))
    );

    res.status(201).json({ success: true, events: created });
  } catch (e) {
    next(e);
  }
});

// PATCH update an event
router.patch("/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const event = await BookingEvent.findOne({ _id: req.params.id, creator: creator._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const { eventName, eventDate, startTime, endTime, location, notes, assignedTeam, status } = req.body;
    if (eventName !== undefined) event.eventName = eventName;
    if (eventDate !== undefined) event.eventDate = eventDate;
    if (startTime !== undefined) event.startTime = startTime;
    if (endTime !== undefined) event.endTime = endTime;
    if (location !== undefined) event.location = location;
    if (notes !== undefined) event.notes = notes;
    if (assignedTeam !== undefined) event.assignedTeam = assignedTeam;
    if (status !== undefined) event.status = status;

    await event.save();
    res.json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// PATCH mark event as completed
router.patch("/:id/complete", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const event = await BookingEvent.findOne({ _id: req.params.id, creator: creator._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    event.status = "completed";
    await event.save();
    res.json({ success: true, event });
  } catch (e) {
    next(e);
  }
});

// POST duplicate an event
router.post("/:id/duplicate", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const source = await BookingEvent.findOne({ _id: req.params.id, creator: creator._id });
    if (!source) return res.status(404).json({ success: false, message: "Event not found" });

    const duplicate = await BookingEvent.create({
      booking: source.booking,
      creator: creator._id,
      eventName: source.eventName + " (Copy)",
      eventDate: req.body.eventDate || source.eventDate,
      startTime: source.startTime,
      endTime: source.endTime,
      location: source.location,
      notes: source.notes,
      assignedTeam: source.assignedTeam,
      status: "upcoming",
    });

    res.status(201).json({ success: true, event: duplicate });
  } catch (e) {
    next(e);
  }
});

// DELETE an event
router.delete("/:id", async (req, res, next) => {
  try {
    const creator = await getCreator(req.user._id);
    const event = await BookingEvent.findOneAndDelete({ _id: req.params.id, creator: creator._id });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    res.json({ success: true, message: "Event deleted" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
