/**
 * MCP Client for ServiceNow Agile Tools
 * 
 * This client provides a unified interface for calling ServiceNow Agile tools
 * that works in both ChatGPT (via MCP) and local browser (via REST fallback).
 * 
 * When running inside ChatGPT:
 * - Uses window.openai.callTool() to invoke MCP tools
 * - Data flows through the MCP server
 * 
 * When running locally in browser:
 * - Falls back to REST API endpoints
 * - Direct fetch() calls to Next.js API routes
 */

import type { AgileSnapshot } from '../../../lib/servicenow/types';

/**
 * Detects if the widget is running inside ChatGPT with MCP support.
 * 
 * @returns true if window.openai.callTool is available
 */
function isMCPAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.openai?.callTool === 'function';
}

/**
 * Fetches the current sprint snapshot with all stories and tasks.
 * 
 * This function automatically detects the runtime environment:
 * - In ChatGPT: Calls the agile_get_snapshot MCP tool
 * - In browser: Falls back to REST API endpoint
 * 
 * @returns Promise resolving to the AgileSnapshot data
 * @throws Error if the request fails in either environment
 */
export async function getAgileSnapshot(): Promise<AgileSnapshot> {
  if (isMCPAvailable()) {
    console.log('[MCP Client] Using MCP tool: agile_get_snapshot');
    
    try {
      const result = await window.openai!.callTool('agile_get_snapshot', {});
      
      if (result.structuredContent?.snapshot) {
        console.log('[MCP Client] Successfully fetched snapshot via MCP');
        return result.structuredContent.snapshot as AgileSnapshot;
      }
      
      // Handle error response from MCP tool
      if (result.structuredContent?.ok === false) {
        const errorMsg = result.structuredContent.error || 'Unknown MCP error';
        console.error('[MCP Client] MCP tool returned error:', errorMsg);
        throw new Error(`MCP tool error: ${errorMsg}`);
      }
      
      // Unexpected response format
      console.error('[MCP Client] Unexpected MCP response format:', result);
      throw new Error('MCP tool returned unexpected response format');
      
    } catch (error: any) {
      console.error('[MCP Client] MCP call failed:', error);
      throw new Error(`Failed to fetch snapshot via MCP: ${error.message}`);
    }
    
  } else {
    console.log('[MCP Client] MCP not available, using REST fallback');
    
    try {
      const response = await fetch('/api/servicenow/agile-snapshot');
      
      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }
      
      const snapshot = await response.json();
      console.log('[MCP Client] Successfully fetched snapshot via REST');
      return snapshot as AgileSnapshot;
      
    } catch (error: any) {
      console.error('[MCP Client] REST call failed:', error);
      throw new Error(`Failed to fetch snapshot via REST: ${error.message}`);
    }
  }
}

/**
 * Updates a task's state in ServiceNow.
 * 
 * This function automatically detects the runtime environment:
 * - In ChatGPT: Calls the agile_update_task_state MCP tool
 * - In browser: Falls back to REST API endpoint
 * 
 * @param input - Object containing taskId or taskKey, and state
 * @param input.taskId - Task sys_id (optional if taskKey provided)
 * @param input.taskKey - Task number like "STSK0011008" (optional if taskId provided)
 * @param input.state - State label (e.g., "Work in Progress")
 * @returns Promise resolving to the update result
 * @throws Error if the request fails in either environment
 */
export async function updateTaskState(input: {
  taskId?: string;
  taskKey?: string;
  state: string;
}): Promise<any> {
  const { taskId, taskKey, state } = input;
  
  if (isMCPAvailable()) {
    console.log('[MCP Client] Using MCP tool: agile_update_task_state', { taskId, taskKey, state });
    
    try {
      // Prefer taskKey if provided, else use taskId
      const args: any = { state };
      if (taskKey) {
        args.taskKey = taskKey;
      } else if (taskId) {
        args.taskId = taskId;
      } else {
        throw new Error('Either taskId or taskKey is required');
      }
      
      const result = await window.openai!.callTool('agile_update_task_state', args);
      
      // Check for error response
      if (result.structuredContent?.ok === false) {
        const errorMsg = result.structuredContent.error || 'Unknown MCP error';
        console.error('[MCP Client] MCP tool returned error:', errorMsg);
        throw new Error(`MCP tool error: ${errorMsg}`);
      }
      
      console.log('[MCP Client] Successfully updated task via MCP');
      
      // Return structuredContent if present, else return full result
      return result.structuredContent || result;
      
    } catch (error: any) {
      console.error('[MCP Client] MCP call failed:', error);
      throw new Error(`Failed to update task via MCP: ${error.message}`);
    }
    
  } else {
    console.log('[MCP Client] MCP not available, using REST fallback', { taskId, state });
    
    // REST fallback requires taskId
    if (!taskId) {
      throw new Error('REST fallback requires taskId (sys_id)');
    }
    
    try {
      const response = await fetch(`/api/servicenow/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state })
      });
      
      if (!response.ok) {
        throw new Error(`REST API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[MCP Client] Successfully updated task via REST');
      return result;
      
    } catch (error: any) {
      console.error('[MCP Client] REST call failed:', error);
      throw new Error(`Failed to update task via REST: ${error.message}`);
    }
  }
}

/**
 * Gets a human-readable description of the current runtime environment.
 * Useful for debugging and logging.
 * 
 * @returns "ChatGPT (MCP)" or "Browser (REST)"
 */
export function getRuntimeEnvironment(): string {
  return isMCPAvailable() ? 'ChatGPT (MCP)' : 'Browser (REST)';
}
