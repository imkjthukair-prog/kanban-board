#!/usr/bin/env python3
import os

# app.js content
app_js = '''// API Base URL
const API_URL = '/api';

// Global state
let allTasks = [];
let undoTimeout = null;
let lastDeletedTask = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadActivity();
    initDragAndDrop();
    initEventListeners();
});

function initEventListeners() {
    document.getElementById('search-input').addEventListener('input', handleSearch);
    document.getElementById('filter-priority').addEventListener('change', handleFilter);
    document.getElementById('add-task-btn').addEventListener('click', openAddTaskModal);
    document.getElementById('refresh-btn').addEventListener('click', refreshSuggestions);
    document.getElementById('toggle-sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('archive-btn').addEventListener('click', openArchive);
}

function initDragAndDrop() {
    const columns = ['suggested', 'backlog', 'active', 'done'];
    columns.forEach(status => {
        const container = document.getElementById(status + '-cards');
        if (container) {
            new Sortable(container, {
                group: 'kanban',
                animation: 200,
                ghostClass: 'card-ghost',
                chosenClass: 'card-chosen',
                dragClass: 'card-drag',
                onEnd: function(evt) {
                    const taskId = evt.item.dataset.id;
                    const newStatus = evt.to.dataset.status;
                    moveTask(taskId, newStatus);
                }
            });
        }
    });
}

function handleSearch() { renderTasks(); }
function handleFilter() { renderTasks(); }

function getFilteredTasks() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const priorityFilter = document.getElementById('filter-priority').value;
    
    return allTasks.filter(task => {
        if (task.status === 'archived') return false;
        const matchesSearch = !searchTerm || 
            task.name.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm));
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        return matchesSearch && matchesPriority;
    });
}

async function loadTasks() {
    try {
        const response = await fetch(API_URL + '/tasks');
        allTasks = await response.json();
        renderTasks();
        updateStats();
    } catch (error) { console.error('Failed to load tasks:', error); }
}

async function loadActivity() {
    try {
        const response = await fetch(API_URL + '/activity');
        const activities = await response.json();
        renderActivity(activities);
    } catch (error) { console.error('Failed to load activity:', error); }
}

function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    ['suggested', 'backlog', 'active', 'done'].forEach(status => {
        document.getElementById(status + '-cards').innerHTML = '';
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (a.status === 'backlog' && b.status === 'backlog') {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return 0;
    });

    sortedTasks.forEach(task => {
        const card = createCard(task);
        const container = document.getElementById(task.status + '-cards');
        if (container) container.appendChild(card);
    });

    updateEmptyStates();
    updateCounters();
}

function createCard(task) {
    const card = document.createElement('div');
    card.className = 'card priority-' + task.priority;
    card.dataset.id = task.id;
    
    const timeInStatus = getTimeInStatus(task);
    const timeBadge = task.status !== 'suggested' && task.status !== 'archived' 
        ? '<span class="time-in-status"><i class="fas fa-clock"></i> ' + timeInStatus + '</span>' 
        : '';
    
    const dueDateBadge = task.dueDate ? getDueDateBadge(task.dueDate) : '';
    const priorityBadge = '<span class="priority-badge priority-' + task.priority + '">' + task.priority + '</span>';

    let cardContent = '';

    if (task.status === 'suggested') {
        cardContent = '
            <div class="card-header">
                <h3>' + task.name + '</h3>
                ' + priorityBadge + '
            </div>
            <p class="card-description">' + (task.description || '') + '</p>
            ' + (task.reasoning ? '<div class="card-reasoning"><strong>Why:</strong> ' + task.reasoning + '</div>' : '') + '
            <div class="card-actions">
                <button onclick="approveTask('' + task.id + '', '' + task.priority + '')" class="btn btn-success btn-small">
                    ' + (task.priority === 'urgent' ? '<i class="fas fa-rocket"></i> Start Now' : '<i class="fas fa-check"></i> Approve') + '
                </button>
                <button onclick="rejectTask('' + task.id + '')" class="btn btn-danger btn-small"><i class="fas fa-xmark"></i> Reject</button>
            </div>
            ' + renderNotes(task.notes) + '
        ';
    } else if (task.status === 'backlog') {
        cardContent = '
            <div class="card-header">
                <h3>' + task.name + '</h3>
                ' + priorityBadge + '
                ' + dueDateBadge + '
            </div>
            <p class="card-description">' + (task.description || '') + '</p>
            <div class="card-actions">
                <button onclick="startTask('' + task.id + '')" class="btn btn-primary btn-small"><i class="fas fa-play"></i> Start</button>
                <button onclick="openTaskModal('' + task.id + '')" class="btn btn-secondary btn-small"><i class="fas fa-edit"></i> Edit</button>
            </div>
            ' + renderNotes(task.notes) + '
        ';
    } else if (task.status === 'active') {
        cardContent = '
            <div class="card-header">
                <h3>' + task.name + '</h3>
                ' + priorityBadge + '
                ' + dueDateBadge + '
                ' + timeBadge + '
            </div>
            <p class="card-description">' + (task.description || '') + '</p>
            <div class="card-actions">
                <button onclick="completeTask('' + task.id + '')" class="btn btn-success btn-small"><i class="fas fa-check"></i> Done</button>
                <button onclick="moveToBacklog('' + task.id + '')" class="btn btn-secondary btn-small"><i class="fas fa-pause"></i> Pause</button>
            </div>
            ' + renderNotes(task.notes) + '
        ';
    } else if (task.status === 'done') {
        cardContent = '
            <div class="card-header">
                <h3>' + task.name + '</h3>
                <span class="status-badge done-badge"><i class="fas fa-check-circle"></i> Done</span>
            </div>
            <p class="card-description">' + (task.description || '') + '</p>
            <div class="card-footer">
                <small><i class="fas fa-calendar-check"></i> Completed: ' + formatDate(task.updatedAt) + '</small>
            </div>
        ';
    }

}