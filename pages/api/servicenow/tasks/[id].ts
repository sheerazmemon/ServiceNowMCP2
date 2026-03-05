import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../../lib/servicenow/client';
import { getStateValue, getAllStateChoices } from '../../../../lib/servicenow/stateMapping';

interface UpdateResponse {
  ok: boolean;
  error?: string;
  allowedStates?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateResponse>
) {
  // Only allow PATCH requests
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use PATCH.'
    });
  }

  // Extract task ID from URL
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'Task ID is required'
    });
  }

  // Validate request body
  const { state } = req.body;

  if (!state || typeof state !== 'string') {
    return res.status(400).json({
      ok: false,
      error: 'State is required'
    });
  }

  // Check for required environment variables
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    return res.status(500).json({
      ok: false,
      error: 'ServiceNow configuration missing'
    });
  }

  try {
    const client = createClientFromEnv();
    
    if (!client) {
      return res.status(500).json({
        ok: false,
        error: 'Failed to create ServiceNow client'
      });
    }

    console.log(`[TaskUpdate] Updating task ${id} to state: "${state}"`);

    // Get the ServiceNow state value for the display label (with caching)
    const stateValue = await getStateValue(client, state);

    if (!stateValue) {
      // Fetch all available choices for error message
      const allChoices = await getAllStateChoices(client);
      const allowedLabels = allChoices.map(c => c.label);
      
      console.error(`[TaskUpdate] Could not map state "${state}"`);
      console.error('[TaskUpdate] Available choices:', allChoices);
      
      return res.status(400).json({
        ok: false,
        error: `Could not map state "${state}"`,
        allowedStates: allowedLabels
      });
    }

    console.log(`[TaskUpdate] Mapped "${state}" to value: "${stateValue}"`);

    // PATCH the task in ServiceNow
    await client.patch('rm_scrum_task', id, {
      state: stateValue
    });

    console.log(`[TaskUpdate] Successfully updated task ${id}`);

    return res.status(200).json({
      ok: true
    });
  } catch (error: any) {
    console.error('[TaskUpdate] Error updating task:', error);
    
    return res.status(500).json({
      ok: false,
      error: error.message || 'Failed to update task'
    });
  }
}
