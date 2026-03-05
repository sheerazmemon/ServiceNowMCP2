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

  const { table, sys_id } = req.body;

  if (!table || !sys_id) {
    return res.status(400).json({
      error: 'Missing required parameters: table, sys_id'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.get(table, sys_id);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('ServiceNow get error:', error);

    return res.status(500).json({
      error: `Get failed: ${error.message}`
    });
  }
}
