const express = require('express');
const Query = require('../models/Query');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// User creates a new query/ticket
router.post('/', async (req, res, next) => {
  try {
    const query = await Query.create({ user: req.user._id, ...req.body });
    res.status(201).json({ success: true, query });
  } catch (e) {
    next(e);
  }
});

// Users fetch their own queries, admins fetch all
router.get('/', async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const queries = await Query.find(filter).populate('user', 'name email').populate('creator', 'specialty city');
    res.json({ success: true, queries });
  } catch (e) {
    next(e);
  }
});

// Admin updates query status or response
router.patch('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const query = await Query.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, query });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
