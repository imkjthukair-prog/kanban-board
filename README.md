# AI-Powered Kanban Board

A premium project management app with intelligent task suggestions powered by AI.

## Features

- **4-Column Workflow:** Suggested → Backlog → Active → Done
- **AI Suggestions:** Proactive task recommendations based on your context
- **Feedback System:** Train the AI by approving/rejecting suggestions with notes
- **Priority Management:** High/Medium/Low priority with visual coding
- **Model Assignment:** Delegate tasks to specialized AI models (Coder/Researcher/Advisor)
- **Activity Log:** Full audit trail of all actions
- **Auto-Archive:** Weekly cleanup (Sundays 1 AM)
- **Mobile Responsive:** Works on any device
- **Dark Theme:** Beautiful, polished UI

## Quick Start

### Local Development

```bash
npm install
npm start
```

The app runs on `http://localhost:3333`

### Deployment Options

#### Option 1: Cloudflare Tunnel (Current Setup)
```bash
cloudflared tunnel --url http://localhost:3333
```

#### Option 2: Vercel (Recommended for Production)
```bash
npm install -g vercel
vercel --prod
```

#### Option 3: GitHub Pages + Backend Service
Deploy the frontend to GitHub Pages and run the backend on your server.

## File Structure

```
kanban-board/
├── public/
│   ├── index.html      # Main UI
│   ├── styles.css      # Styling
│   └── app.js          # Frontend logic
├── server.js           # Node.js backend
├── data/
│   ├── tasks.json      # Task storage (gitignored)
│   └── activity.json   # Activity log (gitignored)
├── SUGGESTION_GUIDELINES.md  # AI suggestion rules
└── feedback-review.md  # Feedback analysis
```

## Configuration

- Data persists in `data/tasks.json` and `data/activity.json`
- Weekly archive runs Sundays at 1 AM (configured via OpenClaw cron)
- AI suggestions default to "medium" priority (you decide urgency)

## Usage

1. **Review Suggestions:** Check the "Suggested" column for AI-generated tasks
2. **Approve/Reject:** Click tasks to approve (→ Backlog/Active) or reject with feedback
3. **Manage Tasks:** Drag-and-drop between columns
4. **Track Progress:** View activity log for full history
5. **Generate More:** Click "💡 Generate Suggestions" for fresh ideas

## Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Node.js, Express
- **AI:** Claude models via OpenClaw
- **Storage:** JSON files (easy to migrate to DB later)
- **Deployment:** Cloudflare Tunnel / Vercel

## Repository

https://github.com/imkjthukair-prog/kanban-board

---

Built with ❤️ by Donna Paulsen
