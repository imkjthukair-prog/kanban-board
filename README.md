# Kanban Board - Premium Project Management

A sleek, dark-themed Kanban board for managing tasks across your AI team (Donna, Coder, Researcher, Advisor).

## Features

✅ **4-Column Workflow:** Backlog → In Progress → Review → Done  
✅ **Drag & Drop:** Move tasks between columns seamlessly  
✅ **Priority System:** Low, Medium, High, Urgent with color coding  
✅ **Model Assignment:** Assign tasks to specific AI agents  
✅ **Activity Log:** Track all changes and updates  
✅ **Mobile Responsive:** Works great on phone  
✅ **REST API:** Programmatic control for automations  
✅ **Premium Dark UI:** Beautiful, modern interface  

## Quick Start

```bash
cd ~/.openclaw/workspace/kanban-board
npm install
npm start
```

Server runs on **http://0.0.0.0:3333**

Access from your phone: **http://[mac-mini-ip]:3333**

## API Endpoints

### Get all tasks
```bash
GET /api/tasks
```

### Create task
```bash
POST /api/tasks
Content-Type: application/json

{
  "name": "Research competitors",
  "description": "Analyze top 5 Saudi event companies",
  "assignedModel": "researcher",
  "priority": "high"
}
```

### Update task
```bash
PATCH /api/tasks/:id
Content-Type: application/json

{
  "status": "inprogress",
  "note": "Started data collection"
}
```

### Delete task
```bash
DELETE /api/tasks/:id
```

### Get activity log
```bash
GET /api/activity
```

### Get feedback summary (for learning)
```bash
GET /api/feedback
```

Returns all tasks with approval/rejection feedback to help Donna learn patterns.

## Usage

**Create a task:**
1. Click "+ New Task"
2. Fill in details
3. Click "Create Task"

**Move tasks:**
- Drag and drop between columns
- Or click task → view details

**Track progress:**
- Click task to view full details
- Add notes via API
- Check activity log (📊 Activity button)

**Filter view:**
- Filter by model (Donna, Coder, etc.)
- Filter by priority
- Counters update automatically

## Data Storage

Tasks: `data/tasks.json`  
Activity: `data/activity.json`

Both are simple JSON files — easy to backup or migrate.

## Built With

- **Backend:** Node.js + Express
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Design:** Custom CSS with premium dark theme
- **Data:** Simple JSON file storage

---

**Built by Donna 👩‍💼**
