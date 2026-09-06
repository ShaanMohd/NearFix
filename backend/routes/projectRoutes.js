const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/portfolio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `portfolio-${uniqueSuffix}${ext}`);
  }
});

// MIME type validator
const fileFilter = (req, file, cb) => {
  const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoMimes = ['video/mp4', 'video/webm'];

  if (allowedImageMimes.includes(file.mimetype) || allowedVideoMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Supported: JPG, JPEG, PNG, WebP for photos and MP4, WebM for videos.'), false);
  }
};

// Multer upload config: 25MB max overall limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max (video limit)
  }
});

// Middleware to handle multipart fields with specific limits & clean error messages
const handleMediaUpload = (req, res, next) => {
  const uploadFields = upload.fields([
    { name: 'media', maxCount: 1 },
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum allowed size is 5MB for images and 25MB for videos.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Additional check: enforce 5MB limit for images specifically
    const files = req.files || {};
    for (const key of ['media', 'beforeImage', 'afterImage']) {
      const fileList = files[key];
      if (fileList && fileList[0] && fileList[0].mimetype.startsWith('image/')) {
        if (fileList[0].size > 5 * 1024 * 1024) {
          // Remove uploaded file exceeding image limit
          try { fs.unlinkSync(fileList[0].path); } catch (_) {}
          return res.status(400).json({ message: 'Image size exceeds maximum limit of 5 MB.' });
        }
      }
    }

    next();
  });
};

// Helper to remove local file from disk safely
const deleteLocalFile = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  if (fileUrl.startsWith('/uploads/portfolio/') || fileUrl.startsWith('uploads/portfolio/')) {
    const filename = path.basename(fileUrl);
    const fullPath = path.join(uploadDir, filename);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.error('Error removing local file:', e.message);
    }
  }
};

// @route   GET /api/projects/worker/:workerId
// @desc    Get portfolio projects for a specific worker (Public)
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
// @desc    Upload portfolio project (Worker only, authenticated)
router.post('/', auth, handleMediaUpload, async (req, res) => {
  try {
    const { title, description, category, projectType, videoDuration } = req.body;
    const files = req.files || {};

    const mediaFile = files.media ? files.media[0] : (files.video ? files.video[0] : null);
    const beforeFile = files.beforeImage ? files.beforeImage[0] : null;
    const afterFile = files.afterImage ? files.afterImage[0] : null;

    let mediaType = req.body.mediaType || 'image';
    let videoUrl = '';
    let beforeImage = '';
    let afterImage = '';
    let imageUrl = '';
    let images = [];

    // Check if media is video
    if (mediaFile && mediaFile.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (req.body.mediaType === 'video') {
      mediaType = 'video';
    }

    if (mediaType === 'video') {
      if (mediaFile) {
        videoUrl = `/uploads/portfolio/${mediaFile.filename}`;
      } else if (req.body.videoUrl) {
        videoUrl = req.body.videoUrl;
      }
    } else if (projectType === 'Before & After') {
      if (beforeFile) {
        beforeImage = `/uploads/portfolio/${beforeFile.filename}`;
      } else if (req.body.beforeImage) {
        beforeImage = req.body.beforeImage;
      }

      if (afterFile) {
        afterImage = `/uploads/portfolio/${afterFile.filename}`;
      } else if (req.body.afterImage) {
        afterImage = req.body.afterImage;
      }

      imageUrl = afterImage || beforeImage || (mediaFile ? `/uploads/portfolio/${mediaFile.filename}` : '');
      images = [beforeImage, afterImage].filter(Boolean);
    } else {
      // Standard image showcase
      if (mediaFile) {
        imageUrl = `/uploads/portfolio/${mediaFile.filename}`;
      } else if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
      } else if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
        imageUrl = req.body.images[0];
      }

      images = imageUrl ? [imageUrl] : [];
    }

    // Fallback for legacy JSON requests if completely missing
    if (!imageUrl && !videoUrl && !beforeImage) {
      if (req.body.imageUrl) {
        imageUrl = req.body.imageUrl;
        images = [imageUrl];
      } else {
        return res.status(400).json({ message: 'Please select a photo or video to upload.' });
      }
    }

    const newProject = new Project({
      workerId: req.user.userId,
      title: title || 'Completed Work Showcase',
      description: description || '',
      category: category || 'General',
      mediaType: mediaType || 'image',
      videoUrl: videoUrl || '',
      videoDuration: videoDuration || '',
      projectType: projectType || 'Completed Work',
      beforeImage: beforeImage || '',
      afterImage: afterImage || '',
      images: images.length > 0 ? images : (imageUrl ? [imageUrl] : []),
      imageUrl: imageUrl || ''
    });

    const savedProject = await newProject.save();
    const populated = await Project.findById(savedProject._id).populate('workerId', 'name avatar title');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error creating portfolio project:', err.message);
    res.status(500).json({ message: 'Server Error creating project: ' + err.message });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update own portfolio project (Worker only, authenticated)
router.put('/:id', auth, handleMediaUpload, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Validate ownership using authenticated token
    if (project.workerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized to update this project' });
    }

    const { title, description, category, projectType, videoDuration } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (category !== undefined) project.category = category;
    if (projectType !== undefined) project.projectType = projectType;
    if (videoDuration !== undefined) project.videoDuration = videoDuration;

    // Optional media replacement
    const files = req.files || {};
    if (files.media && files.media[0]) {
      const newFile = files.media[0];
      if (newFile.mimetype.startsWith('video/')) {
        deleteLocalFile(project.videoUrl);
        project.mediaType = 'video';
        project.videoUrl = `/uploads/portfolio/${newFile.filename}`;
      } else {
        deleteLocalFile(project.imageUrl);
        project.mediaType = 'image';
        project.imageUrl = `/uploads/portfolio/${newFile.filename}`;
        project.images = [project.imageUrl];
      }
    }

    if (files.beforeImage && files.beforeImage[0]) {
      deleteLocalFile(project.beforeImage);
      project.beforeImage = `/uploads/portfolio/${files.beforeImage[0].filename}`;
    }

    if (files.afterImage && files.afterImage[0]) {
      deleteLocalFile(project.afterImage);
      project.afterImage = `/uploads/portfolio/${files.afterImage[0].filename}`;
      project.imageUrl = project.afterImage;
    }

    const updatedProject = await project.save();
    const populated = await Project.findById(updatedProject._id).populate('workerId', 'name avatar title');

    res.json(populated);
  } catch (err) {
    console.error('Error updating portfolio project:', err.message);
    res.status(500).json({ message: 'Server Error updating project' });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete own portfolio project (Worker only, authenticated)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Validate ownership using authenticated token
    if (project.workerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this project' });
    }

    // Clean up local media files from disk
    deleteLocalFile(project.imageUrl);
    deleteLocalFile(project.videoUrl);
    deleteLocalFile(project.beforeImage);
    deleteLocalFile(project.afterImage);
    if (Array.isArray(project.images)) {
      project.images.forEach(img => deleteLocalFile(img));
    }

    await project.deleteOne();
    res.json({ message: 'Portfolio item deleted successfully' });
  } catch (err) {
    console.error('Error deleting portfolio project:', err.message);
    res.status(500).json({ message: 'Server Error deleting project' });
  }
});

module.exports = router;
