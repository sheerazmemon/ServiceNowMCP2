import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../lib/servicenow/client';
import { getAgileSnapshot } from '../../../lib/servicenow/agileSnapshot';
import { AgileSnapshot } from '../../../lib/servicenow/types';

interface ErrorResponse {
  error: string;
  detail?: string;
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgileSnapshot | ErrorResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      detail: 'Use GET to fetch agile snapshot',
      timestamp: new Date().toISOString()
    });
  }

  // Check for required environment variables
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    return res.status(400).json({
      error: 'Missing configuration',
      detail: 'ServiceNow credentials not configured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const client = createClientFromEnv();
    
    if (!client) {
      return res.status(500).json({
        error: 'Client creation failed',
        detail: 'Failed to create ServiceNow client',
        timestamp: new Date().toISOString()
      });
    }

    console.log('\n=== Agile Snapshot Request ===');
    const startTime = Date.now();

    const snapshot = await getAgileSnapshot(client);

    const duration = Date.now() - startTime;
    console.log(`=== Completed in ${duration}ms ===\n`);

    return res.status(200).json(snapshot);
  } catch (error: any) {
    console.error('Agile snapshot error:', error);
    
    return res.status(500).json({
      error: 'Snapshot failed',
      detail: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
}
