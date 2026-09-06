const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get notifications for logged in user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .populate({
        path: 'bookingId',
        populate: [
          { path: 'customerId', select: 'name avatar phone location address' },
          { path: 'workerId', select: 'name avatar phone title' }
        ]
      })
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.userId, 
      isRead: false 
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ message: 'Server Error fetching notifications' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark single notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error updating notification:', err.message);
    res.status(500).json({ message: 'Server Error updating notification' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read for logged in user
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications read:', err.message);
    res.status(500).json({ message: 'Server Error marking notifications read' });
  }
});

module.exports = router;
