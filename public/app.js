// API Base URL
const API_URL = '/api';

// Toast system
const toastContainer = document.getElementById('toast-container');
let undoStack = [];

function showToast(message, type = 'success', undoFn = null) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        ${undoFn ? '<button class="undo-btn" onclick="performUndo()">↩ Undo</button>' : ''}
    `;
    
    toastContainer.appendChild(toast);
    
    if (undoFn) {
        undoStack = [undoFn];
        setTimeout(() => { undoStack = []; }, 5000);
    }
    
    setTimeout(() => toast.remove(), 5000);
}

function performUndo() {
    if (undoStack.length > 0) {
        const fn = undoStack.pop();
        fn();
        showToast('Action undone', 'info');
    }
}

// Global state
let allTasks = [];

// Map backend status values to column IDs
function statusToColumn(status) {
    const map = {
        'suggested': 'suggested',
        'backlog': 'backlog',
        'inprogress': 'active',
        'active': 'active',
        'done': 'done'
    };
    return map[status] || status;
}

// Map column IDs back to backend status values
function columnToStatus(column) {
    const map = {
        'suggested': 'suggested',
        'backlog': 'backlog',
        'active': 'inprogress',
        'done': 'done'
    };
    return map[column] || column;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadActivity();
    setupRefreshButton();
});

async function loadTasks() {
    try {
        const response = await fetch(`${API_URL}/tasks`);
        allTasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showToast('Failed to load tasks', 'error');
    }
}

async function loadActivity() {
    try {
        const response = await fetch(`${API_URL}/activity`);
        const activities = await response.json();
        renderActivity(activities);
    } catch (error) {
        console.error('Failed to load activity:', error);
    }
}

function renderTasks() {
    ['suggested', 'backlog', 'active', 'done'].forEach(col => {
        document.getElementById(`${col}-cards`).innerHTML = '';
    });

    const filtered = allTasks.filter(task => task.status !== 'archived');

    filtered.forEach(task => {
        const card = createCard(task);
        const col = statusToColumn(task.status);
        const container = document.getElementById(`${col}-cards`);
        if (container) {
            container.appendChild(card);
        }
    });

    updateEmptyStates();
    updateCounters();
}

function createCard(task) {
    const card = document.createElement('div');
    const isSuggested = task.status === 'suggested';
    const normalizedPriority = (task.priority || 'medium').toLowerCase();
    
    card.className = `card priority-${normalizedPriority} ${isSuggested ? 'card-suggested' : ''}`;
    card.dataset.id = task.id;

    const priorityBadge = `<span class="priority-badge priority-${normalizedPriority}">${normalizedPriority}</span>`;

    let cardContent = '';

    if (task.status === 'suggested') {
        cardContent = `
            <div class="card-header">
                <h3>${task.name}</h3>
                ${priorityBadge}
            </div>
            <p class="card-description">${task.description || ''}</p>
            ${task.reasoning ? `<div class="card-reasoning"><strong>Why:</strong> ${task.reasoning}</div>` : ''}
            <div class="card-actions">
                <button onclick="approveTask('${task.id}', '${normalizedPriority}')" class="btn btn-success btn-small">
                    ${normalizedPriority === 'urgent' ? '🚀 Start Now' : '✅ Approve'}
                </button>
                <button onclick="rejectTask('${task.id}')" class="btn btn-danger btn-small">✕ Reject</button>
            </div>
            ${renderNotes(task.notes)}
        `;
    } else if (task.status === 'backlog') {
        cardContent = `
            <div class="card-header">
                <h3>${task.name}</h3>
                ${priorityBadge}
            </div>
            <p class="card-description">${task.description || ''}</p>
            <div class="card-actions">
                <button onclick="startTask('${task.id}')" class="btn btn-primary btn-small">▶️ Start Working</button>
                <button onclick="archiveTask('${task.id}')" class="btn btn-secondary btn-small">📦 Archive</button>
            </div>
            ${renderNotes(task.notes)}
        `;
    } else if (task.status === 'inprogress' || task.status === 'active') {
        cardContent = `
            <div class="card-header">
                <h3>${task.name}</h3>
                ${priorityBadge}
                <span class="status-badge active-badge">🔥 Active</span>
            </div>
            <p class="card-description">${task.description || ''}</p>
            <div class="card-actions">
                <button onclick="completeTask('${task.id}')" class="btn btn-success btn-small">✅ Mark Done</button>
                <button onclick="moveToBacklog('${task.id}')" class="btn btn-secondary btn-small">⏸️ Pause</button>
            </div>
            ${renderNotes(task.notes)}
        `;
    } else if (task.status === 'done') {
        cardContent = `
            <div class="card-header">
                <h3>${task.name}</h3>
                <span class="status-badge done-badge">✅ Done</span>
            </div>
            <p class="card-description">${task.description || ''}</p>
            <div class="card-footer">
                <small>Completed: ${formatDate(task.updatedAt)}</small>
            </div>
        `;
    }

    card.innerHTML = cardContent;
    return card;
}

function renderNotes(notes) {
    if (!notes || notes.length === 0) return '';
    
    const notesHtml = notes.map(note => `
        <div class="note">
            <p>${note.text}</p>
            <small>${formatDate(note.timestamp)}</small>
        </div>
    `).join('');
    
    return `<div class="card-notes">${notesHtml}</div>`;
}

function renderActivity(activities) {
    const container = document.getElementById('activity-log');
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="empty-message">No recent activity</p>';
        return;
    }

    container.innerHTML = activities.slice(0, 20).map(activity => `
        <div class="activity-item">
            <span class="activity-icon">${getActivityIcon(activity.action)}</span>
            <div class="activity-details">
                <strong>${activity.taskName}</strong>
                <span>${getActivityText(activity)}</span>
                <small>${formatDate(activity.timestamp)}</small>
            </div>
        </div>
    `).join('');
}

function updateEmptyStates() {
    ['suggested', 'backlog', 'active', 'done'].forEach(col => {
        const cards = document.getElementById(`${col}-cards`);
        const empty = document.getElementById(`${col}-empty`);
        
        if (cards && empty) {
            const hasCards = cards.children.length > 0;
            cards.style.display = hasCards ? 'flex' : 'none';
            empty.style.display = hasCards ? 'none' : 'flex';
        }
    });
}

function updateCounters() {
    const counts = { suggested: 0, backlog: 0, active: 0, done: 0 };
    allTasks.forEach(t => {
        const col = statusToColumn(t.status);
        if (counts[col] !== undefined) counts[col]++;
    });
    
    Object.keys(counts).forEach(col => {
        const counter = document.getElementById(`${col}-count`);
        if (counter) counter.textContent = counts[col];
    });
}

// Task Actions
async function approveTask(taskId, priority) {
    const task = allTasks.find(t => t.id === taskId);
    
    showFeedbackModal(
        '✅ Approve Task',
        'Any feedback or execution notes? This helps me work on it effectively.',
        false,
        async (feedback) => {
            const note = feedback ? `✓ Approved — Feedback: ${feedback}` : '✓ Approved';
            const newStatus = priority === 'urgent' ? 'inprogress' : 'backlog';
            
            try {
                await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: newStatus,
                        note: note
                    })
                });
                
                const taskName = task?.name || 'Task';
                showToast(
                    `✅ ${taskName} ${priority === 'urgent' ? 'started!' : 'added to backlog'}`,
                    'success',
                    async () => {
                        await fetch(`${API_URL}/tasks/${taskId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'suggested' })
                        });
                        await loadTasks();
                    }
                );
                
                await loadTasks();
                await loadActivity();
            } catch (error) {
                showToast('Failed to approve task', 'error');
            }
        }
    );
}

async function rejectTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    
    showFeedbackModal(
        '❌ Reject Task',
        'Why are you rejecting this? Your feedback helps improve future suggestions.',
        true,
        async (reason) => {
            const note = `✕ Rejected — Reason: ${reason}`;
            
            try {
                await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        status: 'archived',
                        note: note
                    })
                });
                
                const taskName = task?.name || 'Task';
                showToast(
                    `✕ ${taskName} rejected`,
                    'info',
                    async () => {
                        await fetch(`${API_URL}/tasks/${taskId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'suggested' })
                        });
                        await loadTasks();
                    }
                );
                
                await loadTasks();
                await loadActivity();
            } catch (error) {
                showToast('Failed to reject task', 'error');
            }
        }
    );
}

async function startTask(taskId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'inprogress',
                note: '▶️ Started working'
            })
        });
        
        const taskName = allTasks.find(t => t.id === taskId)?.name || 'Task';
        showToast(`🔥 Started: ${taskName}`, 'success');
        
        await loadTasks();
        await loadActivity();
    } catch (error) {
        showToast('Failed to start task', 'error');
    }
}

async function completeTask(taskId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'done',
                note: '✅ Completed'
            })
        });
        
        const taskName = allTasks.find(t => t.id === taskId)?.name || 'Task';
        showToast(`✅ Completed: ${taskName}`, 'success');
        
        await loadTasks();
        await loadActivity();
    } catch (error) {
        showToast('Failed to complete task', 'error');
    }
}

async function moveToBacklog(taskId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'backlog',
                note: '⏸️ Paused'
            })
        });
        
        showToast('Task paused', 'info');
        await loadTasks();
        await loadActivity();
    } catch (error) {
        showToast('Failed to pause task', 'error');
    }
}

async function archiveTask(taskId) {
    try {
        await fetch(`${API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                status: 'archived',
                note: '📦 Archived'
            })
        });
        
        showToast('Task archived', 'info');
        await loadTasks();
        await loadActivity();
    } catch (error) {
        showToast('Failed to archive task', 'error');
    }
}

function setupRefreshButton() {
    const btn = document.getElementById('refresh-btn');
    if (btn) {
        btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = '⏳ Generating...';
            
            try {
                await fetch(`${API_URL}/suggest`, { method: 'POST' });
                await loadTasks();
                await loadActivity();
                showToast('✨ New suggestions generated!', 'success');
            } catch (error) {
                showToast('Failed to generate suggestions', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '🔄 Refresh Suggestions';
            }
        };
    }
}

async function refreshSuggestions() {
    const btn = document.getElementById('refresh-btn');
    if (btn) btn.click();
}


function openArchive() {
    const modal = document.getElementById('archive-modal');
    const archiveList = document.getElementById('archive-list');
    
    const archivedTasks = allTasks.filter(t => t.status === 'archived');
    
    if (archivedTasks.length === 0) {
        archiveList.innerHTML = '<p class="empty-message">No archived tasks</p>';
    } else {
        archiveList.innerHTML = archivedTasks.map(task => `
            <div class="archive-item">
                <h4>${task.name}</h4>
                <p>${task.description}</p>
                <small>Archived: ${formatDate(task.updatedAt)}</small>
                ${renderNotes(task.notes)}
            </div>
        `).join('');
    }
    
    modal.style.display = 'flex';
    
    // Close when clicking the dark background (not the content)
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeArchive();
        }
    };
}
function closeArchive() {
    document.getElementById('archive-modal').style.display = 'none';
}


// Feedback Modal
let feedbackCallback = null;

function showFeedbackModal(title, prompt, required = false, callback) {
    const modal = document.getElementById('feedback-modal');
    const titleEl = document.getElementById('feedback-title');
    const promptEl = document.getElementById('feedback-prompt');
    const textarea = document.getElementById('feedback-input');
    const submitBtn = document.getElementById('feedback-submit-btn');
    
    if (!modal || !submitBtn || !textarea) {
        console.error('Modal elements not found!');
        showToast('Modal error - check console', 'error');
        return;
    }
    
    titleEl.textContent = title;
    promptEl.textContent = prompt;
    textarea.value = '';
    textarea.placeholder = required ? 'Feedback required...' : 'Type your feedback here (optional)...';
    
    feedbackCallback = callback;
    modal.style.display = 'flex';
    
    // Close modal when clicking the dark background (not the content)
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeFeedbackModal();
        }
    };
    
    // Small delay to ensure modal is rendered
    setTimeout(() => textarea.focus(), 100);
    
    // Remove old event listeners
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    
    newSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Submit clicked!');
        const feedback = textarea.value.trim();
        console.log('Feedback:', feedback, 'Required:', required);
        
        if (required && !feedback) {
            showToast('Feedback is required', 'error');
            return;
        }
        
        closeFeedbackModal();
        
        if (feedbackCallback) {
            try {
                await feedbackCallback(feedback);
            } catch (error) {
                console.error('Callback error:', error);
                showToast('Error processing feedback', 'error');
            }
        }
    });
    
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            newSubmitBtn.click();
        }
    });
}

function closeFeedbackModal() {
    document.getElementById('feedback-modal').style.display = 'none';
    feedbackCallback = null;
}

// Helper Functions
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function getActivityIcon(action) {
    const icons = {
        'created': '➕',
        'moved': '↔️',
        'approved': '✅',
        'rejected': '✕',
        'started': '▶️',
        'completed': '✅',
        'archived': '📦',
        'note_added': '💬',
        'updated': '✏️'
    };
    return icons[action] || '•';
}

function getActivityText(activity) {
    const texts = {
        'moved': `moved from ${activity.from} to ${activity.to}`,
        'created': 'created',
        'approved': 'approved',
        'rejected': 'rejected',
        'started': 'started',
        'completed': 'completed',
        'archived': 'archived',
        'note_added': 'note added',
        'updated': 'updated'
    };
    return texts[activity.action] || activity.action;
}