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

  const { table, query, limit = 100, offset, fields } = req.body;

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

    const params: Record<string, string> = {
      sysparm_limit: String(limit)
    };

    if (query) params.sysparm_query = query;
    if (offset) params.sysparm_offset = String(offset);
    if (fields) params.sysparm_fields = fields;

    const result = await client.query(table, params);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('ServiceNow query error:', error);

    return res.status(500).json({
      error: `Query failed: ${error.message}`
    });
  }
}
