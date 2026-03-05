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

  const { query, limit = 100 } = req.body;

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.getSystemLogs(query, limit);

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('ServiceNow syslog error:', error);

    return res.status(500).json({
      error: `System logs retrieval failed: ${error.message}`
    });
  }
}
