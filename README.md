# ServiceNow MCP Server

A comprehensive Model Context Protocol (MCP) server for ServiceNow integration with 15 powerful tools for agile management and CRUD operations.

🔗 **Live Deployment:** https://servicenow-mcp2.vercel.app

## Features

### 15 MCP Tools Available

#### Agile & Sprint Management (4 tools)
- `show_hello` - Demo widget
- `agile_get_snapshot` - Get current sprint with stories and tasks
- `agile_update_task_state` - Update task state (Draft, Ready, In Progress, Complete, etc.)
- `agile_get_task_details` - Get detailed task information with attachments

#### ServiceNow CRUD & Analytics (11 tools)
- `sn_query` - Query ServiceNow table records with filtering, pagination, field selection
- `sn_get` - Retrieve a single record by sys_id
- `sn_create` - Create a new record in a table
- `sn_update` - Update an existing record
- `sn_delete` - Delete a record (requires confirmation)
- `sn_aggregate` - Perform aggregation operations (COUNT, SUM, AVG, MIN, MAX)
- `sn_schema` - Get table schema definition
- `sn_discover` - Discover available ServiceNow tables
- `sn_relationships` - Get CMDB relationships for configuration items
- `sn_syslog` - Query ServiceNow system logs
- `sn_attachments` - List attachments for a specific record

## Quick Start

```bash
npm install
npm run build:widget
npm run dev
```

Open http://localhost:3000 for the landing page.

## Environment Variables

Create a `.env.local` file:

```
SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com
SERVICENOW_USERNAME=your_username
SERVICENOW_PASSWORD=your_password
OPENAI_API_KEY=your_key (optional)
OPENAI_MODEL=gpt-5 (optional)
```

## Endpoints

- **MCP Server:** `/api/mcp` - Main MCP endpoint for tool execution
- **MCP Tools Info:** `/api/mcp-info` - Browser-friendly view of all available tools
- **Connection Test:** `/api/servicenow/test` - Test ServiceNow connectivity
- **REST APIs:** `/api/servicenow/*` - Direct REST API endpoints

## Deployment

Deployed on Vercel with automatic deployments from GitHub.

**Production URL:** https://servicenow-mcp2.vercel.app
