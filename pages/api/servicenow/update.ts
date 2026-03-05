import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../lib/servicenow/client';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.'
    });
  }

  const { table, sys_id, data } = req.body;

  if (!table || !sys_id || !data) {
    return res.status(400).json({
      error: 'Missing required parameters: table, sys_id, data'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.update(table, sys_id, data);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('ServiceNow update error:', error);

    return res.status(500).json({
      error: `Update failed: ${error.message}`
    });
  }
}
