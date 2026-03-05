# React ChatGPT MCP

This project scaffolds a Vercel-ready MCP server plus a React widget bundle for a ChatGPT App.

## What this includes
- A Vercel-compatible MCP server at `/mcp` (rewritten to `/api/mcp`).
- A React widget that renders a purple, blinking "Hello World".
- An optional OpenAI SDK call that can enrich the greeting.

## Quick start
```bash
npm install
npm run build:widget
npm run dev
```

Open http://localhost:3000 for the landing page. The MCP endpoint is available at:
- http://localhost:3000/mcp

## Environment variables
Create a `.env.local` if you want the tool to call the OpenAI API:
```
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5
```

## Notes
- The MCP server reads the widget from `public/widget/index.html`.
- Re-run `npm run build:widget` after updating the React component in `web/src`.
