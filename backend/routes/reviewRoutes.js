const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const User = require('../models/User');
const JobRequest = require('../models/JobRequest');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/reviews
// @desc    Submit review for a worker
router.post('/', auth, async (req, res) => {
  try {
    const { workerId, bookingId, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Valid rating (1-5) is required' });
    }

    const review = new Review({
      customerId: req.user.userId,
      workerId,
      bookingId,
      rating: Number(rating),
      comment: comment || 'Great service!'
    });

    await review.save();

    // Recalculate worker rating
    const workerReviews = await Review.find({ workerId });
    const totalRating = workerReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Number((totalRating / workerReviews.length).toFixed(1));

    await User.findByIdAndUpdate(workerId, {
      rating: avgRating,
      reviewsCount: workerReviews.length
    });

    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'name avatar')
      .populate('workerId', 'name title');

    res.status(201).json(populatedReview);
  } catch (err) {
    console.error('Error submitting review:', err.message);
    res.status(500).json({ message: 'Server Error submitting review' });
  }
});

// @route   GET /api/reviews/worker/:workerId
// @desc    Get reviews for a worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const reviews = await Review.find({ workerId: req.params.workerId })
      .populate('customerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ message: 'Server Error fetching reviews' });
  }
});

module.exports = router;
