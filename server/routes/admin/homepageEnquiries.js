const express = require("express");
const HomepageEnquiry = require("../../models/HomepageEnquiry");

const router = express.Router();

// GET: All homepage enquiries (admin only)
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const enquiries = await HomepageEnquiry.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    // Stats
    const totalNew = await HomepageEnquiry.countDocuments({ status: "new" });
    const totalContacted = await HomepageEnquiry.countDocuments({ status: "contacted" });
    const totalClosed = await HomepageEnquiry.countDocuments({ status: "closed" });

    res.json({
      success: true,
      enquiries,
      stats: { total: enquiries.length, new: totalNew, contacted: totalContacted, closed: totalClosed },
    });
  } catch (e) {
    next(e);
  }
});

// PATCH: Update enquiry status (admin only)
router.patch("/:id", async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const enquiry = await HomepageEnquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });

    if (status) enquiry.status = status;
    if (adminNotes !== undefined) enquiry.adminNotes = adminNotes;
    await enquiry.save();

    res.json({ success: true, enquiry });
  } catch (e) {
    next(e);
  }
});

// DELETE: Delete an enquiry (admin only)
router.delete("/:id", async (req, res, next) => {
  try {
    await HomepageEnquiry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Enquiry deleted" });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
