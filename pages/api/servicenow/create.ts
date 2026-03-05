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

  const { table, data } = req.body;

  if (!table || !data) {
    return res.status(400).json({
      error: 'Missing required parameters: table, data'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.create(table, data);

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('ServiceNow create error:', error);

    return res.status(500).json({
      error: `Create failed: ${error.message}`
    });
  }
}
