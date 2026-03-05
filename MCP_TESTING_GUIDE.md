# MCP ServiceNow Integration - Complete Testing Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Testing MCP Server Directly](#testing-mcp-server-directly)
4. [Testing Widget Integration](#testing-widget-integration)
5. [Local MCP Shim (Browser Testing)](#local-mcp-shim-browser-testing)
6. [ChatGPT Integration](#chatgpt-integration)
7. [Console Logs Reference](#console-logs-reference)
8. [Error Cases & Troubleshooting](#error-cases--troubleshooting)
9. [Verification Checklists](#verification-checklists)

---

## Overview

The MCP integration provides three ways to interact with ServiceNow Agile data:

### **MCP Tools Available:**
1. **`agile_get_snapshot`** - Fetches current sprint with stories and tasks (READ)
2. **`agile_update_task_state`** - Updates task state in ServiceNow (WRITE)
3. **`agile_get_task_details`** - Fetches detailed task information including attachments and activity (READ - ✅ Phase 4 Complete)

### **Testing Modes:**
1. **Direct MCP Server** - Test tools with curl (server-side only)
2. **Widget in Browser (REST)** - Default fallback mode
3. **Widget in Browser (MCP Shim)** - Test MCP path locally with `?mcp=1`
4. **Widget in ChatGPT (Real MCP)** - Production MCP integration

---

## Prerequisites

### 1. Start Dev Server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 2. Configure ServiceNow Credentials

Create `.env.local`:
```bash
SERVICENOW_INSTANCE_URL=https://experiments.service-now.com
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password
```

### 3. Verify Widget Build

```bash
npm run build:widget
```

Widget should be at `public/widget/index.html`

---

## Testing MCP Server Directly

Test MCP tools using curl (bypasses widget, tests server-side only).

### List Available Tools

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "show_hello",
        "description": "Returns the hello widget..."
      },
      {
        "name": "agile_get_snapshot",
        "description": "Fetches the current sprint with all stories..."
      },
      {
        "name": "agile_update_task_state",
        "description": "Updates the state of a ServiceNow scrum task..."
      }
    ]
  }
}
```

### Test `agile_get_snapshot`

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "agile_get_snapshot",
      "arguments": {}
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Retrieved sprint \"Autonomous Enterprise Sprint 1\" with 1 stories and 3 tasks"
      }
    ],
    "structuredContent": {
      "snapshot": {
        "sprint": {
          "id": "2928d15bcfb23e10ac0b71164d851c23",
          "name": "Autonomous Enterprise Sprint 1"
        },
        "stories": [
          {
            "id": "dc881d5bcfb23e10ac0b71164d851c89",
            "key": "STRY0010003",
            "title": "ChatGPT App ServiceNow Integration",
            "state": "Draft",
            "assigneeName": null,
            "tasks": [
              {
                "id": "6c6bdd5fcfb23e10ac0b71164d851cba",
                "key": "STSK0011008",
                "title": "Display Widget in ChatGPT",
                "state": "Draft",
                "assigneeName": "Demo Dev1"
              }
            ]
          }
        ]
      }
    }
  }
}
```

### Test `agile_update_task_state` (Using sys_id)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "agile_update_task_state",
      "arguments": {
        "taskId": "6c6bdd5fcfb23e10ac0b71164d851cba",
        "state": "Work in Progress"
      }
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully updated task 6c6bdd5fcfb23e10ac0b71164d851cba to state \"Work in Progress\""
      }
    ],
    "structuredContent": {
      "ok": true,
      "taskId": "6c6bdd5fcfb23e10ac0b71164d851cba",
      "state": "Work in Progress",
      "stateValue": "2"
    }
  }
}
```

### Test `agile_update_task_state` (Using Task Key)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "agile_update_task_state",
      "arguments": {
        "taskKey": "STSK0011008",
        "state": "Ready"
      }
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully updated task STSK0011008 to state \"Ready\""
      }
    ],
    "structuredContent": {
      "ok": true,
      "taskId": "6c6bdd5fcfb23e10ac0b71164d851cba",
      "taskKey": "STSK0011008",
      "state": "Ready",
      "stateValue": "1"
    }
  }
}
```

### Verify Update

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "agile_get_snapshot",
      "arguments": {}
    }
  }' | jq '.result.structuredContent.snapshot.stories[0].tasks[] | select(.id=="6c6bdd5fcfb23e10ac0b71164d851cba")'
```

**Expected:** Task state should be updated

---

### Test `agile_get_task_details` (Using Task Key)

**Status:** ✅ **Phase 4 Complete** - This tool now fetches **real data** from ServiceNow.

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "agile_get_task_details",
      "arguments": {
        "taskKey": "STSK0011008"
      }
    }
  }' | jq
```

**Expected Response (Real ServiceNow Data):**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Loaded task details for STSK0011008: \"Display Widget in ChatGPT\""
      }
    ],
    "structuredContent": {
      "task": {
        "id": "6c6bdd5fcfb23e10ac0b71164d851cba",
        "key": "STSK0011008",
        "title": "Display Widget in ChatGPT",
        "description": "Register new ChatGPT App",
        "state": "Ready",
        "assignee": {
          "id": "71a4d5d3cfb23e10ac0b71164d851ccb",
          "name": "Demo Dev1"
        },
        "story": {
          "id": "dc881d5bcfb23e10ac0b71164d851c89",
          "key": "ChatGPT App ServiceNow Integration",
          "title": "ChatGPT App ServiceNow Integration"
        },
        "labels": [],
        "attachments": [],
        "activity": [
          {
            "id": "eb2cc5dccf4b7250ac0b71164d851cde",
            "type": "field_change",
            "author": "nick",
            "timestamp": "2026-02-09 20:20:49",
            "field": "blocked_reason",
            "from": "",
            "to": "Blocked for testing purposes"
          },
          {
            "id": "ab2cc5dccf4b7250ac0b71164d851cde",
            "type": "field_change",
            "author": "nick",
            "timestamp": "2026-02-09 20:20:49",
            "field": "description",
            "from": "",
            "to": "Register new ChatGPT App"
          },
          {
            "id": "871c85dccf4b7250ac0b71164d851c5a",
            "type": "work_note",
            "author": "nick",
            "timestamp": "2026-02-09 20:20:31",
            "text": "Testing if MCP tool retrieves activity data"
          },
          {
            "id": "d7c7f010cf8b7650ac72b6503d851c1c",
            "type": "field_change",
            "author": "nick",
            "timestamp": "2026-02-09 18:51:47",
            "field": "state",
            "from": "2",
            "to": "1"
          }
        ]
      }
    }
  }
}
```

**Note:** Response shows actual data from ServiceNow including:
- Real task details from `rm_scrum_task` table
- Actual assignee information
- Parent story reference
- Real activity history (field changes, work notes, comments)
- Attachments (if any exist on the task)

---

### Test `agile_get_task_details` (Using Task ID)

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "agile_get_task_details",
      "arguments": {
        "taskId": "6c6bdd5fcfb23e10ac0b71164d851cba"
      }
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Loaded task details for STSK0011008: \"Display Widget in ChatGPT\""
      }
    ],
    "structuredContent": {
      "task": {
        "id": "6c6bdd5fcfb23e10ac0b71164d851cba",
        "key": "STSK0011008",
        "title": "Display Widget in ChatGPT",
        "description": "Register new ChatGPT App",
        "state": "Ready",
        "assignee": { "id": "71a4d5d3cfb23e10ac0b71164d851ccb", "name": "Demo Dev1" },
        "story": { "id": "dc881d5bcfb23e10ac0b71164d851c89", "key": "ChatGPT App ServiceNow Integration", "title": "ChatGPT App ServiceNow Integration" },
        "labels": [],
        "attachments": [],
        "activity": [ /* Real activity from ServiceNow */ ]
      }
    }
  }
}
```

**Output Shape:**

The `structuredContent.task` object follows the `TaskDetails` type:

```typescript
{
  task: {
    // Core identifiers
    id: string;              // Task sys_id
    key: string;             // Task number (e.g., "STSK0011008")
    
    // Basic fields
    title: string;           // Task title
    description: string | null;
    state: string;           // Current state label
    
    // Relationships
    assignee: null | { id: string; name: string };
    story: null | { id: string; key: string; title: string };
    
    // Metadata
    labels: string[];
    
    // Attachments
    attachments: Array<{
      id: string;
      fileName: string;
      contentType: string | null;
      sizeBytes: number | null;
      downloadUrl: string | null;
    }>;
    
    // Activity history
    activity: Array<{
      id: string;
      type: "comment" | "work_note" | "field_change" | "system";
      author: string | null;
      timestamp: string;      // ISO 8601
      text?: string;          // For comments/work notes
      field?: string;         // For field changes
      from?: string | null;   // For field changes
      to?: string | null;     // For field changes
    }>;
  }
}
```

**Activity Types:**
- **`system`** - System events (e.g., "Task created"), no author
- **`field_change`** - Field value changes with `field`, `from`, `to`
- **`comment`** - User comments with `text`
- **`work_note`** - Internal notes with `text`

**Phase 4 Implementation:**
✅ **Real ServiceNow Integration Complete** - The tool now fetches live data from:
- **Task details** from `rm_scrum_task` table (title, description, state, etc.)
- **Assignee** information with display values
- **Story** reference with display values
- **Attachments** from `sys_attachment` table (file name, type, size, download link)
- **Activity history** from:
  - `sys_journal_field` table (comments and work notes)
  - `sys_audit` table (field change history)
  - Merged and sorted by timestamp (newest first)

**Data Normalization:**
- All ServiceNow data is normalized to the canonical `TaskDetails` type
- Display values are preferred over raw values
- Missing tables/data result in empty arrays (no crashes)
- Activity is sorted DESC (newest first)

---

## Testing Widget Integration

### Mode 1: Browser with REST Fallback (Default)

**URL:**
```
http://localhost:3000/
```

**Expected Console Logs:**
```
[Local MCP Shim] Disabled (use ?mcp=1 to enable)
[HelloWidget] Loading snapshot via Browser (REST)
[MCP Client] MCP not available, using REST fallback
[MCP Client] Successfully fetched snapshot via REST
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

**Data Flow:**
```
Widget → getAgileSnapshot()
  ↓
isMCPAvailable() → false
  ↓
fetch('/api/servicenow/agile-snapshot')
  ↓
Next.js API Route → ServiceNow
  ↓
Return AgileSnapshot
```

**Verify:**
- ✅ Widget loads successfully
- ✅ Shows current sprint data
- ✅ Cards visible in columns
- ✅ Console shows "Browser (REST)"
- ✅ No errors

**Test Drag and Drop:**
1. Drag card to different column
2. Card moves immediately
3. Snapshot refreshes via REST
4. Card stays in new column

---

## Local MCP Shim (Browser Testing)

Test MCP path locally without deploying to ChatGPT.

### Enabling the Shim

**Option 1: URL Parameter (Recommended)**
```
http://localhost:3000/?mcp=1
```

**Note:** The preview page automatically forwards query parameters to the widget iframe and "Open Widget in New Tab" link. This means:
- Opening `http://localhost:3000/?mcp=1` will load the widget with `?mcp=1`
- The iframe src becomes `/widget/index.html?mcp=1`
- The "Open Widget in New Tab" link becomes `/widget/index.html?mcp=1`

**Option 2: Direct Widget URL**
```
http://localhost:3000/widget/index.html?mcp=1
```

**Option 3: Environment Variable**

Add to `.env.local`:
```bash
NEXT_PUBLIC_FORCE_MCP=1
```

Then restart server.

### How It Works

The shim:
1. Creates fake `window.openai.callTool` function
2. Routes MCP calls to `/api/mcp` via JSON-RPC
3. Returns ChatGPT-compatible responses

### Testing with Shim Enabled

**URL:**
```
http://localhost:3000/?mcp=1
```

**Expected Console Logs:**
```
[Local MCP Shim] Enabled - routing MCP calls to /api/mcp
[Local MCP Shim] window.openai.callTool installed
[HelloWidget] Loading snapshot via ChatGPT (MCP)
[MCP Client] Using MCP tool: agile_get_snapshot
[Local MCP Shim] Calling tool: agile_get_snapshot {}
[Local MCP Shim] Tool agile_get_snapshot succeeded
[MCP Client] Successfully fetched snapshot via MCP
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

**Data Flow:**
```
Widget → getAgileSnapshot()
  ↓
isMCPAvailable() → true (shim installed)
  ↓
window.openai.callTool('agile_get_snapshot', {})
  ↓
Shim: POST /api/mcp (JSON-RPC)
  ↓
MCP Server → ServiceNow
  ↓
Extract structuredContent.snapshot
  ↓
Return AgileSnapshot
```

**Key Indicators:**
- ✅ "Local MCP Shim] Enabled"
- ✅ "ChatGPT (MCP)" (not "Browser (REST)")
- ✅ "Using MCP tool: agile_get_snapshot"
- ✅ No REST fetch to `/api/servicenow/agile-snapshot`

**Test Drag and Drop:**
```
[DragStop] Updating task 6c6bdd5fcfb23e10ac0b71164d851cba to state: Work in Progress
[TaskUpdate] Mapped "Work in Progress" to value: "2"
[TaskUpdate] Successfully updated task
[DragStop] Task updated successfully, refreshing snapshot...
[MCP Client] Using MCP tool: agile_get_snapshot
[Local MCP Shim] Calling tool: agile_get_snapshot {}
[Local MCP Shim] Tool agile_get_snapshot succeeded
[MCP Client] Successfully fetched snapshot via MCP
[DragStop] Snapshot refreshed
```

**Note:** Write operations still use REST endpoint. Only reads use MCP.

### Disabling the Shim

**Option 1:** Remove `?mcp=1` from URL
```
http://localhost:3000/
```

**Option 2:** Remove `NEXT_PUBLIC_FORCE_MCP` from `.env.local` and restart

**Expected:**
```
[Local MCP Shim] Disabled (use ?mcp=1 to enable)
[HelloWidget] Loading snapshot via Browser (REST)
```

### Comparison: REST vs MCP Shim

| Feature | REST Mode | MCP Shim Mode |
|---------|-----------|---------------|
| **URL** | `http://localhost:3000/` | `http://localhost:3000/?mcp=1` |
| **Console** | "Browser (REST)" | "ChatGPT (MCP)" |
| **Read Path** | `fetch('/api/servicenow/agile-snapshot')` | `window.openai.callTool('agile_get_snapshot', {})` |
| **Write Path** | `fetch('/api/servicenow/tasks/[id]')` | `fetch('/api/servicenow/tasks/[id]')` (same) |
| **Use Case** | Default local dev | Test MCP integration locally |

---

## ChatGPT Integration

### Prerequisites

1. MCP server running (`npm run dev`)
2. Widget deployed to ChatGPT
3. MCP connection established

### Testing in ChatGPT

**Load Widget:**
1. Open ChatGPT
2. Load widget via MCP resource

**Expected Console Logs:**
```
[HelloWidget] Loading snapshot via ChatGPT (MCP)
[MCP Client] Using MCP tool: agile_get_snapshot
[MCP Client] Successfully fetched snapshot via MCP
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

**Data Flow:**
```
Widget → getAgileSnapshot()
  ↓
isMCPAvailable() → true (real window.openai)
  ↓
window.openai.callTool('agile_get_snapshot', {})
  ↓
ChatGPT MCP Bridge
  ↓
MCP Server → ServiceNow
  ↓
Return { structuredContent: { snapshot: {...} } }
  ↓
Extract snapshot
```

**Verify:**
- ✅ Widget loads in ChatGPT
- ✅ Shows current sprint data
- ✅ Uses real MCP (not REST)
- ✅ No errors

### Natural Language Prompts

**Example prompts:**
- "Show me the current sprint from ServiceNow"
- "Update task STSK0011008 to Work in Progress"
- "What tasks are in the current sprint?"
- "Move task STSK0011008 to Complete"
- "Set task STSK0011007 to Ready"

**ChatGPT will:**
1. Call appropriate MCP tool
2. Use taskKey for user-friendly references
3. Parse structured response
4. Present data in user-friendly format

**Task References:**
- Task key (e.g., "STSK0011008") - More user-friendly
- Task sys_id (e.g., "6c6bdd5fcfb23e10ac0b71164d851cba") - Direct lookup

### Drag and Drop in ChatGPT

**Expected Behavior:**
- Drag handler uses REST endpoint `/api/servicenow/tasks/[id]` (write not migrated yet)
- Snapshot refresh uses MCP tool

**Console Logs:**
```
[DragStop] Updating task 6c6bdd5fcfb23e10ac0b71164d851cba to state: Work in Progress
[TaskUpdate] Mapped "Work in Progress" to value: "2"
[TaskUpdate] Successfully updated task
[DragStop] Task updated successfully, refreshing snapshot...
[MCP Client] Using MCP tool: agile_get_snapshot
[MCP Client] Successfully fetched snapshot via MCP
[DragStop] Snapshot refreshed
```

---

## Console Logs Reference

### MCP Server Logs (Terminal)

**agile_get_snapshot:**
```
[AgileSnapshot] Starting data fetch...
[AgileSnapshot] Fetching current sprint...
[AgileSnapshot] Found sprint: Autonomous Enterprise Sprint 1 (2928d15bcfb23e10ac0b71164d851c23)
[AgileSnapshot] Fetching stories...
[AgileSnapshot] Found 1 stories
[AgileSnapshot] Fetching scrum tasks...
[AgileSnapshot] Found 3 tasks
[AgileSnapshot] Fetching 1 unique users...
[AgileSnapshot] Resolved 1 user names
[AgileSnapshot] Aggregation complete
[AgileSnapshot] Summary: 1 stories, 3 tasks, 1 users
```

**agile_update_task_state (using sys_id):**
```
[MCP agile_update_task_state] Updating task 6c6bdd5fcfb23e10ac0b71164d851cba (sys_id: 6c6bdd5fcfb23e10ac0b71164d851cba) to state: Work in Progress
[StateMapping] Using cached mapping
[MCP agile_update_task_state] Mapped "Work in Progress" to value: "2"
[MCP agile_update_task_state] Successfully updated task 6c6bdd5fcfb23e10ac0b71164d851cba
```

**agile_update_task_state (using taskKey):**
```
[MCP agile_update_task_state] Looking up sys_id for task key: STSK0011008
[MCP agile_update_task_state] Resolved STSK0011008 to sys_id: 6c6bdd5fcfb23e10ac0b71164d851cba
[MCP agile_update_task_state] Updating task STSK0011008 (sys_id: 6c6bdd5fcfb23e10ac0b71164d851cba) to state: Ready
[StateMapping] Using cached mapping
[MCP agile_update_task_state] Mapped "Ready" to value: "1"
[MCP agile_update_task_state] Successfully updated task STSK0011008
```

### Browser Console Logs

**REST Mode:**
```
[Local MCP Shim] Disabled (use ?mcp=1 to enable)
[HelloWidget] Loading snapshot via Browser (REST)
[MCP Client] MCP not available, using REST fallback
[MCP Client] Successfully fetched snapshot via REST
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

**MCP Shim Mode:**
```
[Local MCP Shim] Enabled - routing MCP calls to /api/mcp
[Local MCP Shim] window.openai.callTool installed
[HelloWidget] Loading snapshot via ChatGPT (MCP)
[MCP Client] Using MCP tool: agile_get_snapshot
[Local MCP Shim] Calling tool: agile_get_snapshot {}
[Local MCP Shim] Tool agile_get_snapshot succeeded
[MCP Client] Successfully fetched snapshot via MCP
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

**ChatGPT Mode:**
```
[HelloWidget] Loading snapshot via ChatGPT (MCP)
[MCP Client] Using MCP tool: agile_get_snapshot
[MCP Client] Successfully fetched snapshot via MCP
[HelloWidget] ServiceNow snapshot loaded: { sprint: {...}, stories: [...] }
```

---

## Error Cases & Troubleshooting

### 1. Missing ServiceNow Credentials

**Symptom:**
```json
{
  "ok": false,
  "error": "ServiceNow credentials not configured"
}
```

**Fix:**
- Ensure `.env.local` has all three variables:
  ```bash
  SERVICENOW_INSTANCE_URL=...
  SERVICENOW_USERNAME=...
  SERVICENOW_PASSWORD=...
  ```
- Restart dev server

### 2. Task Not Found

**Symptom:**
```json
{
  "ok": false,
  "error": "Task not found for key",
  "taskKey": "STSK9999999"
}
```

**Fix:**
- Verify task key is correct
- Use `agile_get_snapshot` to see available tasks
- Or use task's sys_id instead

### 3. Invalid Task ID

**Symptom:**
```
ServiceNow PATCH failed: 404 Not Found
```

**Fix:**
- Use valid task sys_id from snapshot
- Verify task exists in ServiceNow

### 4. Invalid State Label

**Symptom:**
```json
{
  "ok": false,
  "error": "Could not map state \"Invalid State\"",
  "allowedStates": ["Draft", "Ready", "Work in progress", "Complete", "Cancelled"]
}
```

**Fix:**
- Use one of the allowed states:
  - Draft
  - Ready
  - Work in Progress
  - Complete
  - Cancelled

### 5. MCP Shim Not Enabled

**Symptom:**
```
[Local MCP Shim] Disabled (use ?mcp=1 to enable)
[HelloWidget] Loading snapshot via Browser (REST)
```

**Fix:**
- Add `?mcp=1` to URL
- Or set `NEXT_PUBLIC_FORCE_MCP=1` in `.env.local`
- Hard refresh page (Cmd+Shift+R)

### 6. MCP Server Error: 404

**Symptom:**
```
MCP server error: 404 Not Found
```

**Fix:**
- Verify dev server is running
- Check `/api/mcp` endpoint exists
- Test with curl command

### 7. Widget Not Loading in ChatGPT

**Symptom:**
- Widget fails to load
- Console shows "MCP Client not available"

**Fix:**
- Verify MCP server is running
- Check MCP connection in ChatGPT settings
- Ensure widget loaded via MCP resource

### 8. Failed to Fetch Snapshot via REST

**Symptom:**
```
Failed to fetch snapshot via REST: Failed to load snapshot
```

**Fix:**
- Verify `npm run dev` is running
- Check `.env.local` has ServiceNow credentials
- Test endpoint: `curl http://localhost:3000/api/servicenow/agile-snapshot`

### 9. MCP Tool Returned Unexpected Response

**Symptom:**
```
MCP tool returned unexpected response format
```

**Fix:**
- Check MCP server logs in terminal
- Verify `agile_get_snapshot` tool implementation
- Test MCP tool directly with curl

### 10. Still Using REST Despite ?mcp=1

**Symptom:**
- Console shows "Browser (REST)" instead of "ChatGPT (MCP)"

**Fix:**
- Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for shim installation logs
- Verify `installLocalMcpShimIfEnabled()` is called

---

## Verification Checklists

### Direct MCP Server Testing

- [ ] `tools/list` returns 4 tools
- [ ] `agile_get_snapshot` returns snapshot with stories/tasks
- [ ] `agile_update_task_state` with taskId works
- [ ] `agile_update_task_state` with taskKey works
- [ ] `agile_get_task_details` with taskKey returns real ServiceNow task details
- [ ] `agile_get_task_details` with taskId returns real ServiceNow task details
- [ ] `agile_get_task_details` includes real attachments (if any exist)
- [ ] `agile_get_task_details` includes real activity history (field changes, comments, work notes)
- [ ] Activity is sorted DESC (newest first)
- [ ] Invalid state returns error with allowed states
- [ ] Task not found returns appropriate error
- [ ] Server logs show correct operations

### Widget - REST Mode

- [ ] Widget loads without errors
- [ ] Shows current sprint data
- [ ] Console shows "Browser (REST)" mode
- [ ] Cards display correctly
- [ ] Drag and drop works
- [ ] Snapshot refreshes after drag via REST
- [ ] Error recovery works

### Widget - MCP Shim Mode (?mcp=1)

- [ ] Shim installs when `?mcp=1` present
- [ ] Console shows "Local MCP Shim] Enabled"
- [ ] Console shows "ChatGPT (MCP)" mode
- [ ] Widget loads sprint data via MCP
- [ ] No direct fetch to `/api/servicenow/agile-snapshot`
- [ ] Drag and drop works
- [ ] Snapshot refreshes via MCP after drag
- [ ] Removing `?mcp=1` disables shim

### Widget - ChatGPT Mode

- [ ] Widget loads in ChatGPT
- [ ] Shows current sprint data
- [ ] Console shows "ChatGPT (MCP)" mode
- [ ] Uses real MCP (not shim)
- [ ] Drag and drop works
- [ ] Snapshot refreshes via MCP
- [ ] Natural language prompts work
- [ ] No REST calls for snapshot (only for write)

### Data Consistency

- [ ] REST and MCP return identical data
- [ ] State updates persist correctly
- [ ] Task key and sys_id both work
- [ ] Snapshot refresh shows updated state
- [ ] No data loss during operations

---

## Quick Reference

### URLs

| Mode | URL | Purpose |
|------|-----|---------|
| REST | `http://localhost:3000/` | Default local dev |
| MCP Shim | `http://localhost:3000/?mcp=1` | Test MCP locally |
| ChatGPT | Via MCP resource | Production MCP |

### Key Console Messages

| Message | Meaning |
|---------|---------|
| "Browser (REST)" | Using REST fallback |
| "ChatGPT (MCP)" | Using MCP (shim or real) |
| "Local MCP Shim] Enabled" | Shim active |
| "Local MCP Shim] Disabled" | Shim inactive |
| "Using MCP tool: agile_get_snapshot" | MCP read operation |
| "MCP not available, using REST fallback" | Falling back to REST |

### Allowed Task States

- Draft
- Ready
- Work in Progress
- Complete
- Cancelled

**Note:** ServiceNow returns "Work in progress" (lowercase), but you can use "Work in Progress" (capital) - normalization handles both.

---

## Phase 2B — Write Operations via MCP

**Status:** ✅ **Implemented**

Both READ and WRITE operations now support dual-mode (MCP + REST fallback).

### What Changed

**Before Phase 2B:**
- ✅ Reads via MCP: `getAgileSnapshot()` → `agile_get_snapshot` tool
- ❌ Writes via REST only: Direct `fetch('/api/servicenow/tasks/{id}')`

**After Phase 2B:**
- ✅ Reads via MCP: `getAgileSnapshot()` → `agile_get_snapshot` tool
- ✅ Writes via MCP: `updateTaskState()` → `agile_update_task_state` tool
- ✅ Both auto-detect MCP vs REST environment

### Testing Write Operations

#### Test 1: REST Mode (Default)

**URL:**
```
http://localhost:3000/
```

**Steps:**
1. Open widget in browser
2. Drag a card from "Draft" to "Work in Progress"
3. Check console logs

**Expected Console Logs:**
```
[DragStop] Updating task 6c6bdd5fcfb23e10ac0b71164d851cba to state: Work in Progress
[MCP Client] MCP not available, using REST fallback { taskId: "6c6bdd5fcfb23e10ac0b71164d851cba", state: "Work in Progress" }
[MCP Client] Successfully updated task via REST
[DragStop] Task updated successfully, refreshing snapshot...
[MCP Client] MCP not available, using REST fallback
[MCP Client] Successfully fetched snapshot via REST
[DragStop] Snapshot refreshed
```

**Verify:**
- ✅ Card moves to "Work in Progress" column
- ✅ Console shows "REST fallback" for write
- ✅ Snapshot refreshes via REST
- ✅ Card stays in "Work in Progress" after refresh (no snap-back)
- ✅ ServiceNow record updated

#### Test 2: MCP Shim Mode

**URL:**
```
http://localhost:3000/?mcp=1
```

**Steps:**
1. Open widget with MCP shim enabled
2. Drag a card from "Ready" to "Work in Progress"
3. Check console logs

**Expected Console Logs:**
```
[Local MCP Shim] Enabled - routing MCP calls to /api/mcp
[Local MCP Shim] window.openai.callTool installed
[DragStop] Updating task 6c6bdd5fcfb23e10ac0b71164d851cba to state: Work in Progress
[MCP Client] Using MCP tool: agile_update_task_state { taskId: "6c6bdd5fcfb23e10ac0b71164d851cba", state: "Work in Progress" }
[Local MCP Shim] Calling tool: agile_update_task_state { taskId: "...", state: "Work in Progress" }
[Local MCP Shim] Tool agile_update_task_state succeeded
[MCP Client] Successfully updated task via MCP
[DragStop] Task updated successfully, refreshing snapshot...
[MCP Client] Using MCP tool: agile_get_snapshot
[Local MCP Shim] Calling tool: agile_get_snapshot {}
[Local MCP Shim] Tool agile_get_snapshot succeeded
[MCP Client] Successfully fetched snapshot via MCP
[DragStop] Snapshot refreshed
```

**Verify:**
- ✅ Card moves to "Work in Progress" column
- ✅ Console shows "Using MCP tool: agile_update_task_state"
- ✅ Snapshot refreshes via MCP
- ✅ Card stays in "Work in Progress" after refresh (no snap-back)
- ✅ ServiceNow record updated

#### Test 3: Direct MCP Tool Call

Test the write tool directly with curl:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "agile_update_task_state",
      "arguments": {
        "taskKey": "STSK0011008",
        "state": "Ready"
      }
    }
  }' | jq
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully updated task STSK0011008 to state \"Ready\""
      }
    ],
    "structuredContent": {
      "ok": true,
      "taskId": "6c6bdd5fcfb23e10ac0b71164d851cba",
      "taskKey": "STSK0011008",
      "state": "Ready",
      "stateValue": "1"
    }
  }
}
```

#### Test 4: Verify No Snap-Back

**Critical Test:** Ensure cards stay in the correct column after refresh.

**Steps:**
1. Drag card from "Draft" to "Work in Progress"
2. Wait for refresh to complete
3. Observe card position

**Expected:**
- ✅ Card stays in "Work in Progress" column
- ✅ No visual "snap-back" to original column
- ✅ ServiceNow state matches Kanban column

**Why This Works:**
- `buildKanbanData.ts` has case-insensitive state normalization
- ServiceNow returns "Work in progress" (lowercase p)
- Normalizer maps to "Work in Progress" (canonical)
- Card Status matches Kanban column key exactly

### State Normalization

The adapter handles ServiceNow's inconsistent capitalization:

| ServiceNow Returns | Normalized To | Kanban Column |
|--------------------|---------------|---------------|
| "Work in progress" | "Work in Progress" | Work in Progress |
| "work in progress" | "Work in Progress" | Work in Progress |
| "CANCELLED" | "Cancelled" | Cancelled |
| "draft" | "Draft" | Draft |
| "Unknown State" | "Draft" | Draft (fallback) |

**Implementation:**
```typescript
// web/src/servicenow/buildKanbanData.ts
function normalizeState(state: string): string {
  const normalized = state.trim().replace(/\s+/g, ' ').toLowerCase();
  return STATE_LOOKUP.get(normalized) ?? 'Draft';
}
```

### Data Flow Comparison

#### REST Mode (Write)
```
Drag Card
  ↓
updateTaskState({ taskId, state })
  ↓
isMCPAvailable() → false
  ↓
fetch('/api/servicenow/tasks/{taskId}', { method: 'PATCH', body: { state } })
  ↓
Next.js API Route → ServiceNow
  ↓
Return { ok: true }
  ↓
Refresh snapshot via REST
```

#### MCP Mode (Write)
```
Drag Card
  ↓
updateTaskState({ taskId, state })
  ↓
isMCPAvailable() → true
  ↓
window.openai.callTool('agile_update_task_state', { taskId, state })
  ↓
MCP Server → ServiceNow
  ↓
Return { structuredContent: { ok: true, ... } }
  ↓
Refresh snapshot via MCP
```

### Verification Checklist

#### REST Mode
- [ ] Drag card to different column
- [ ] Console shows "REST fallback" for write
- [ ] Console shows "REST fallback" for read
- [ ] Card moves immediately
- [ ] Snapshot refreshes
- [ ] Card stays in new column (no snap-back)
- [ ] ServiceNow record updated

#### MCP Shim Mode
- [ ] URL has `?mcp=1`
- [ ] Console shows "Local MCP Shim] Enabled"
- [ ] Drag card to different column
- [ ] Console shows "Using MCP tool: agile_update_task_state"
- [ ] Console shows "Using MCP tool: agile_get_snapshot"
- [ ] Card moves immediately
- [ ] Snapshot refreshes
- [ ] Card stays in new column (no snap-back)
- [ ] ServiceNow record updated

#### ChatGPT Mode
- [ ] Widget loads in ChatGPT
- [ ] Drag card to different column
- [ ] Console shows "Using MCP tool: agile_update_task_state"
- [ ] Console shows "Using MCP tool: agile_get_snapshot"
- [ ] No REST calls in console
- [ ] Card stays in new column after refresh
- [ ] ServiceNow record updated

### Known Limitations

1. **No Optimistic UI**
   - Widget waits for server response before updating
   - Card position may flicker during update
   - Future enhancement: optimistic updates

2. **Error Handling**
   - Failed updates show alert dialog
   - Snapshot refreshes to revert to source of truth
   - Same behavior as before

3. **taskKey vs taskId**
   - MCP mode can use taskKey (user-friendly)
   - REST mode requires taskId (sys_id)
   - Widget always has taskId from snapshot

---

## Summary

**Three Testing Modes:**

1. **Direct curl** - Test MCP server without widget
2. **Browser (REST)** - Default local dev, no MCP
3. **Browser (MCP Shim)** - Test MCP path locally with `?mcp=1`
4. **ChatGPT (Real MCP)** - Production MCP integration

**Key Files:**
- `pages/api/mcp/[[...slug]].ts` - MCP server
- `web/src/servicenow/mcpClient.ts` - MCP client with fallback (READ + WRITE)
- `web/src/servicenow/mcpLocalShim.ts` - Local testing shim
- `web/src/HelloWidget.tsx` - Widget integration
- `web/src/servicenow/buildKanbanData.ts` - State normalization

**Development Workflow:**
1. Develop with REST (fast)
2. Test with MCP shim (`?mcp=1`)
3. Verify identical behavior
4. Deploy to ChatGPT (real MCP)

**Phase 2B Complete:**
- ✅ Read operations via MCP
- ✅ Write operations via MCP
- ✅ REST fallback for both
- ✅ State normalization (no snap-back)
- ✅ Local testing with shim
- ✅ ChatGPT ready

**Security:**
- ✅ Credentials stay server-side
- ✅ All ServiceNow API calls from backend
- ✅ No OpenAI model calls in tools
- ✅ Shim only enabled with explicit flag
- ✅ REST endpoints still work as fallback
