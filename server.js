const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3333;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage backend selection
const USE_VERCEL_KV = process.env.KV_REST_API_URL ? true : false;
let kv;

if (USE_VERCEL_KV) {
  const { createClient } = require('@vercel/kv');
  kv = createClient({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
  console.log('✅ Using Vercel KV for persistent storage');
} else {
  console.log('⚠️  Using local file storage (Vercel KV not configured)');
}

// Data file paths (for local fallback)
const TASKS_FILE = path.join(__dirname, 'data', 'tasks.json');
const ACTIVITY_FILE = path.join(__dirname, 'data', 'activity.json');

// Helper functions - dual backend support
async function readJSON(filepath) {
  if (USE_VERCEL_KV) {
    const key = filepath.includes('tasks.json') ? 'tasks' : 'activity';
    const data = await kv.get(key);
    return data || [];
  }
  
  // Local file fallback
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeJSON(filepath, data) {
  if (USE_VERCEL_KV) {
    const key = filepath.includes('tasks.json') ? 'tasks' : 'activity';
    await kv.set(key, data);
    return;
  }
  
  // Local file fallback
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

async function logActivity(action, taskName, details = {}) {
  const activities = await readJSON(ACTIVITY_FILE);
  activities.unshift({
    timestamp: new Date().toISOString(),
    action,
    taskName,
    ...details
  });
  if (activities.length > 100) activities.length = 100;
  await writeJSON(ACTIVITY_FILE, activities);
}

// API Routes

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    // Prevent caching of task data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const tasks = await readJSON(TASKS_FILE);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read tasks' });
  }
});

// Create new task
app.post('/api/tasks', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    const newTask = {
      id: Date.now().toString(),
      name: req.body.name,
      description: req.body.description || '',
      assignedModel: req.body.assignedModel || 'donna',
      priority: req.body.priority || 'medium',
      status: req.body.status || 'backlog',
      reasoning: req.body.reasoning || '',
      dueDate: req.body.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      statusChangedAt: new Date().toISOString(),
      notes: []
    };
    
    tasks.push(newTask);
    await writeJSON(TASKS_FILE, tasks);
    await logActivity('created', newTask.name, { 
      assignedModel: newTask.assignedModel,
      priority: newTask.priority 
    });
    
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = tasks[taskIndex];
    const oldStatus = task.status;
    
    if (req.body.name !== undefined) task.name = req.body.name;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.assignedModel !== undefined) task.assignedModel = req.body.assignedModel;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;
    
    if (req.body.status !== undefined && req.body.status !== oldStatus) {
      task.status = req.body.status;
      task.statusChangedAt = new Date().toISOString();
    }
    
    if (req.body.note) {
      task.notes.push({
        text: req.body.note,
        timestamp: new Date().toISOString()
      });
    }
    
    task.updatedAt = new Date().toISOString();
    tasks[taskIndex] = task;
    
    await writeJSON(TASKS_FILE, tasks);
    
    if (req.body.status && oldStatus !== req.body.status) {
      await logActivity('moved', task.name, { from: oldStatus, to: req.body.status });
    } else if (req.body.note) {
      await logActivity('note_added', task.name);
    } else {
      await logActivity('updated', task.name);
    }
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const deletedTask = tasks.splice(taskIndex, 1)[0];
    await writeJSON(TASKS_FILE, tasks);
    await logActivity('deleted', deletedTask.name);
    
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get activity log
app.get('/api/activity', async (req, res) => {
  try {
    const activities = await readJSON(ACTIVITY_FILE);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read activity' });
  }
});

// Trigger new suggestion generation
app.post('/api/suggest', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    const recentFeedback = tasks
      .filter(t => t.notes && t.notes.length > 0)
      .map(t => ({
        taskName: t.name,
        status: t.status,
        notes: t.notes.filter(n => n.text.includes('Feedback:') || n.text.includes('Reason:') || n.text.includes('Approved') || n.text.includes('Rejected'))
      }))
      .filter(t => t.notes.length > 0);
    
    const trigger = {
      triggeredAt: new Date().toISOString(),
      feedback: recentFeedback,
      request: 'Generate new strategic suggestions based on feedback patterns above.'
    };
    
    await fs.writeFile(
      path.join(__dirname, 'data', 'suggest-trigger.json'),
      JSON.stringify(trigger, null, 2)
    );
    
    res.json({ status: 'triggered', feedbackCount: recentFeedback.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger suggestions' });
  }
});

// Get feedback summary
app.get('/api/feedback', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    const feedback = tasks
      .filter(t => t.notes && t.notes.length > 0)
      .map(t => ({
        taskName: t.name,
        status: t.status,
        priority: t.priority,
        assignedModel: t.assignedModel,
        notes: t.notes.filter(n => n.text.includes('Feedback:') || n.text.includes('Reason:'))
      }))
      .filter(t => t.notes.length > 0);
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read feedback' });
  }
});

// Weekly auto-archive endpoint
app.post('/api/archive-weekly', async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE);
    let archivedCount = 0;
    
    tasks.forEach(task => {
      if (task.status === 'done') {
        task.status = 'archived';
        task.notes.push({
          text: '📦 Auto-archived (weekly cleanup)',
          timestamp: new Date().toISOString()
        });
        archivedCount++;
      }
    });
    
    await writeJSON(TASKS_FILE, tasks);
    await logActivity('auto_archived', `${archivedCount} completed tasks`, { count: archivedCount });
    
    res.json({ status: 'ok', archived: archivedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to auto-archive' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kanban Board running at http://0.0.0.0:${PORT}`);
  console.log(`📱 Access from your phone: http://[mac-mini-ip]:${PORT}`);
});