/**
 * Local MCP Shim for Browser Testing (DEV ONLY)
 * 
 * This shim allows testing MCP tools locally in a browser without deploying to ChatGPT.
 * It creates a fake window.openai.callTool that routes calls to the local MCP server
 * via JSON-RPC over HTTP.
 * 
 * Enable the shim by:
 * 1. Adding ?mcp=1 to the URL: http://localhost:3000/?mcp=1
 * 2. Setting NEXT_PUBLIC_FORCE_MCP=1 in .env.local
 * 
 * WARNING: This is for development/testing only. Do not use in production.
 */

let requestIdCounter = 0;

/**
 * Checks if the local MCP shim should be enabled.
 * 
 * @returns true if URL has ?mcp=1 or NEXT_PUBLIC_FORCE_MCP is "1"
 */
function isShimEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mcp') === '1') {
    return true;
  }
  
  // Check environment variable
  if (process.env.NEXT_PUBLIC_FORCE_MCP === '1') {
    return true;
  }
  
  return false;
}

/**
 * Implementation of window.openai.callTool that routes to local MCP server.
 * 
 * @param name - The MCP tool name to call
 * @param args - The arguments to pass to the tool
 * @returns Promise resolving to the tool's response
 */
async function callTool(name: string, args: any): Promise<{
  content: Array<{ type: string; text: string }>;
  structuredContent?: any;
}> {
  const requestId = ++requestIdCounter;
  
  console.log(`[Local MCP Shim] Calling tool: ${name}`, args);
  
  try {
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name,
          arguments: args ?? {}
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle JSON-RPC error response
    if (data.error) {
      const errorMsg = data.error.message || 'Unknown MCP error';
      console.error('[Local MCP Shim] MCP server returned error:', data.error);
      throw new Error(errorMsg);
    }
    
    // Return the result (should include content and structuredContent)
    if (!data.result) {
      console.error('[Local MCP Shim] Unexpected response format:', data);
      throw new Error('MCP server returned unexpected response format');
    }
    
    console.log(`[Local MCP Shim] Tool ${name} succeeded`);
    return data.result;
    
  } catch (error: any) {
    console.error(`[Local MCP Shim] Tool ${name} failed:`, error);
    throw error;
  }
}

/**
 * Installs the local MCP shim if enabled.
 * 
 * This function should be called early in the widget lifecycle,
 * before any MCP tool calls are made.
 * 
 * If enabled, it sets window.openai.callTool to route calls to the local MCP server.
 * If disabled, it does nothing (allowing normal REST fallback).
 */
export function installLocalMcpShimIfEnabled(): void {
  if (!isShimEnabled()) {
    console.log('[Local MCP Shim] Disabled (use ?mcp=1 to enable)');
    return;
  }
  
  console.log('[Local MCP Shim] Enabled - routing MCP calls to /api/mcp');
  
  // Install the shim
  (window as any).openai = {
    callTool
  };
  
  console.log('[Local MCP Shim] window.openai.callTool installed');
}

/**
 * Checks if the shim is currently enabled.
 * Useful for debugging and testing.
 * 
 * @returns true if the shim is enabled
 */
export function isLocalMcpShimEnabled(): boolean {
  return isShimEnabled();
}
