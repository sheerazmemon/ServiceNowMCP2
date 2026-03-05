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

  const { table, record_id } = req.body;

  if (!table || !record_id) {
    return res.status(400).json({
      error: 'Missing required parameters: table, record_id'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.getAttachments(table, record_id);

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('ServiceNow attachments error:', error);

    return res.status(500).json({
      error: `Attachments retrieval failed: ${error.message}`
    });
  }
}
