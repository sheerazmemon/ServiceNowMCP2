import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv } from '../../../lib/servicenow/client';

interface TestResponse {
  ok: boolean;
  instance?: string;
  status: number;
  timestamp: string;
  detail?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      status: 405,
      timestamp: new Date().toISOString(),
      detail: 'Method not allowed. Use GET.'
    });
  }

  // Check for required environment variables
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    return res.status(400).json({
      ok: false,
      status: 400,
      timestamp: new Date().toISOString(),
      detail: 'Missing ServiceNow configuration. Check SERVICENOW_INSTANCE_URL, SERVICENOW_USERNAME, and SERVICENOW_PASSWORD environment variables.'
    });
  }

  // Create client and test connection
  try {
    const client = createClientFromEnv();
    
    if (!client) {
      return res.status(500).json({
        ok: false,
        status: 500,
        timestamp: new Date().toISOString(),
        detail: 'Failed to create ServiceNow client'
      });
    }

    const result = await client.testConnection();

    // Return appropriate HTTP status based on connection result
    const httpStatus = result.ok ? 200 : (result.status >= 400 && result.status < 600 ? result.status : 502);

    return res.status(httpStatus).json({
      ok: result.ok,
      instance: instanceUrl,
      status: result.status,
      timestamp: new Date().toISOString(),
      detail: result.message
    });
  } catch (error: any) {
    console.error('ServiceNow test connection error:', error);
    
    return res.status(502).json({
      ok: false,
      status: 502,
      timestamp: new Date().toISOString(),
      detail: `Unexpected error: ${error.message}`
    });
  }
}
