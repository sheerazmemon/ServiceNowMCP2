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

  const { table, operation, field, query, groupBy } = req.body;

  if (!table || !operation) {
    return res.status(400).json({
      error: 'Missing required parameters: table, operation'
    });
  }

  const validOperations = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  if (!validOperations.includes(operation)) {
    return res.status(400).json({
      error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
    });
  }

  if (operation !== 'COUNT' && !field) {
    return res.status(400).json({
      error: `Field is required for ${operation} operation`
    });
  }

  try {
    const client = createClientFromEnv();

    if (!client) {
      return res.status(500).json({
        error: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.aggregate(table, query, groupBy, operation, field);

    return res.status(200).json({ result });
  } catch (error: any) {
    console.error('ServiceNow aggregate error:', error);

    return res.status(500).json({
      error: `Aggregate failed: ${error.message}`
    });
  }
}
