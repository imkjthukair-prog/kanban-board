# Kanban Suggestion Guidelines

## Priority Policy

**ALWAYS set priority to "medium" for all new suggestions.**

Khaled wants to decide urgency himself - don't assume what's urgent.

```json
{
  "priority": "medium",  // ALWAYS use this
  "status": "suggested"
}
```

## Creating Suggestions

When adding tasks via API:

```bash
curl -X POST http://localhost:3333/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Task name",
    "description": "What to do",
    "reasoning": "Why this helps",
    "priority": "medium",
    "status": "suggested"
  }'
```

## Reasoning Field

- **Keep it brief** - 1-2 sentences max
- **Focus on value** - Why this helps Khaled specifically
- **Reference context** - Connect to his goals/feedback
- **No urgency pressure** - Let him decide priority

## Examples

✅ **Good:**
```json
{
  "name": "Quote Reaction Batch Plan",
  "description": "Plan 15 psychology quotes for next 2 weeks",
  "reasoning": "You said this format is working. Batching = less filming stress.",
  "priority": "medium"
}
```

❌ **Bad (old style):**
```json
{
  "priority": "urgent",  // ❌ Don't assume urgency
  "reasoning": "This is CRITICAL and must be done NOW..."  // ❌ No pressure
}
```
