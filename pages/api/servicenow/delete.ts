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

  const { table, sys_id, confirm } = req.body;

  if (!table || !sys_id) {
    return res.status(400).json({
      error: 'Missing required parameters: table, sys_id'
    });
  }

  if (!confirm) {
    return res.status(400).json({
      error: 'Delete operation requires confirm: true'
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    await client.delete(table, sys_id);

    return res.status(200).json({
      success: true,
      message: `Record ${sys_id} deleted successfully from ${table}`
    });
  } catch (error: any) {
    console.error('ServiceNow delete error:', error);

    return res.status(500).json({
      error: `Delete failed: ${error.message}`
    });
  }
}
