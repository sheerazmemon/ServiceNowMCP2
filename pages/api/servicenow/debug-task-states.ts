import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../lib/servicenow/client';
import { getAllStateChoices } from '../../../lib/servicenow/stateMapping';

interface DebugResponse {
  count: number;
  choices: Array<{ label: string; value: string }>;
  error?: string;
}

/**
 * Debug endpoint to inspect rm_scrum_task.state choices
 * GET /api/servicenow/debug-task-states
 * 
 * Returns the actual labels and numeric values from sys_choice
 * Useful for troubleshooting state mapping issues
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DebugResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      count: 0,
      choices: [],
      error: 'Method not allowed. Use GET.'
    });
  }

  // Check for required environment variables
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    return res.status(500).json({
      count: 0,
      choices: [],
      error: 'ServiceNow configuration missing'
    });
  }

  try {
    const client = createClientFromEnv();
    
    if (!client) {
      return res.status(500).json({
        count: 0,
        choices: [],
        error: 'Failed to create ServiceNow client'
      });
    }

    console.log('[DebugTaskStates] Fetching rm_scrum_task.state choices...');

    const choices = await getAllStateChoices(client);

    console.log(`[DebugTaskStates] Found ${choices.length} choices:`, choices);

    return res.status(200).json({
      count: choices.length,
      choices
    });
  } catch (error: any) {
    console.error('[DebugTaskStates] Error:', error);
    
    return res.status(500).json({
      count: 0,
      choices: [],
      error: error.message || 'Failed to fetch state choices'
    });
  }
}
