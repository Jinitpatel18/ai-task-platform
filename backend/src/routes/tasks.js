const express = require('express');
const Task = require('../models/Task');
const authenticate = require('../middleware/auth');
const { getClient } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

const QUEUE_NAME = 'task_queue';

// GET /api/tasks - List user's tasks
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-logs'),
      Task.countDocuments({ user: req.user._id })
    ]);

    res.json({ tasks, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error('List tasks error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Create a task
router.post('/', async (req, res) => {
  try {
    const { title, inputText, operation } = req.body;

    if (!title || !inputText || !operation) {
      return res.status(400).json({ error: 'title, inputText, and operation are required' });
    }

    const { OPERATIONS } = require('../models/Task');
    if (!OPERATIONS.includes(operation)) {
      return res.status(400).json({
        error: `Invalid operation. Valid: ${OPERATIONS.join(', ')}`
      });
    }

    const task = await Task.create({
      user: req.user._id,
      title,
      inputText,
      operation,
      status: 'pending',
      logs: [{ message: 'Task created and queued', level: 'info' }]
    });

    // Push to Redis queue
    const redis = getClient();
    await redis.lpush(
      QUEUE_NAME,
      JSON.stringify({ taskId: task._id.toString() })
    );

    logger.info('Task created', { taskId: task._id, operation });

    res.status(201).json({ task });
  } catch (err) {
    logger.error('Create task error', { error: err.message });
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/tasks/:id - Get task details with logs
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
  } catch (err) {
    logger.error('Get task error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    logger.error('Delete task error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
