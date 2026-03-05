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

  const { table } = req.body;

  if (!table) {
    return res.status(400).json({
      error: 'Missing required parameter: table'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.getSchema(table);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('ServiceNow schema error:', error);

    return res.status(500).json({
      error: `Schema retrieval failed: ${error.message}`
    });
  }
}
