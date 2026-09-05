const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/projects/worker/:workerId
// @desc    Get portfolio projects for a specific worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const projects = await Project.find({ workerId: req.params.workerId })
      .populate('workerId', 'name avatar title skills')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error('Error fetching worker portfolio:', err.message);
    res.status(500).json({ message: 'Server Error fetching portfolio' });
  }
});

// @route   POST /api/projects
// @desc    Upload portfolio project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, images, imageUrl } = req.body;

    const newProject = new Project({
      workerId: req.user.userId,
      title: title || 'Completed Work Showcase',
      description: description || 'Portfolio showcase item',
      category: category || 'General',
      images: images || (imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600']),
      imageUrl: imageUrl || (images && images[0]) || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600'
    });

    const savedProject = await newProject.save();
    const populated = await Project.findById(savedProject._id).populate('workerId', 'name avatar title');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating portfolio project:', err.message);
    res.status(500).json({ message: 'Server Error creating project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete portfolio item
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.workerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this project' });
    }

    await project.deleteOne();
    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (err) {
    console.error('Error deleting portfolio project:', err.message);
    res.status(500).json({ message: 'Server Error deleting project' });
  }
});

module.exports = router;
