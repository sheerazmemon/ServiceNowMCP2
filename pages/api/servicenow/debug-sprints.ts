import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../lib/servicenow/client';

/**
 * Debug endpoint to see all sprints and their states
 * Helps identify what sprint states exist in the instance
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = createClientFromEnv();
    if (!client) {
      return res.status(500).json({ error: 'Failed to create client' });
    }

    // Fetch all sprints with their states
    const response = await client.query('rm_sprint', {
      sysparm_fields: 'sys_id,short_description,state,start_date,end_date',
      sysparm_limit: '10'
    });

    return res.status(200).json({
      count: response.result.length,
      sprints: response.result.map((sprint: any) => ({
        id: sprint.sys_id?.value,
        name: sprint.short_description?.display_value,
        state: sprint.state?.display_value,
        stateValue: sprint.state?.value,
        startDate: sprint.start_date?.display_value,
        endDate: sprint.end_date?.display_value
      }))
    });
  } catch (error: any) {
    console.error('Debug sprints error:', error);
    return res.status(500).json({
      error: error.message
    });
  }
}
