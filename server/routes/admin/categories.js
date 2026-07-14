/**
 * Admin: Category Management
 * GET    /api/admin/categories          — list all
 * POST   /api/admin/categories          — create
 * PUT    /api/admin/categories/:id      — edit
 * DELETE /api/admin/categories/:id      — delete
 * POST   /api/admin/categories/seed     — seed all 60+ categories
 */
const express = require("express");
const router = express.Router();
const Category = require("../../models/Category");

// GET all categories (admin view — all, including inactive)
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort("sortOrder").lean();
    res.json({ success: true, categories });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST seed all categories from data file
router.post("/seed", async (req, res) => {
  try {
    const allCats = require("../../data/categories");
    let added = 0, skipped = 0;
    for (const cat of allCats) {
      const existing = await Category.findOne({ slug: cat.slug });
      if (!existing) {
        await Category.create(cat);
        added++;
      } else {
        // Update fields if seeding again
        await Category.findOneAndUpdate({ slug: cat.slug }, { $set: { fields: cat.fields, searchFilters: cat.searchFilters, group: cat.group, description: cat.description } });
        skipped++;
      }
    }
    res.json({ success: true, message: `Seeded: ${added} added, ${skipped} updated`, added, skipped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST create category
router.post("/", async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, category: cat });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// PUT update category
router.put("/:id", async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, category: cat });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

// DELETE category
router.delete("/:id", async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
