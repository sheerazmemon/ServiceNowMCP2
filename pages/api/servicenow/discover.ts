import type { NextApiRequest, NextApiResponse } from 'next';
import { createClientFromEnv, TableAccessResult } from '../../../lib/servicenow/client';

interface DiscoverResponse {
  ok: boolean;
  instance?: string;
  timestamp: string;
  tables?: Record<string, TableAccessResult>;
  detail?: string;
}

// Tables to check for Agile Development plugin
const AGILE_TABLES = [
  'rm_story',       // User stories (primary agile work items)
  'rm_sprint',      // Sprint definitions
  'rm_release',     // Release planning
  'rm_epic',        // Epic groupings
  'rm_scrum_task',  // Scrum tasks
  'sys_user'        // Users (sanity check)
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiscoverResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
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
      timestamp: new Date().toISOString(),
      detail: 'Missing ServiceNow configuration. Check environment variables.'
    });
  }

  // Create client
  try {
    const client = createClientFromEnv();
    
    if (!client) {
      return res.status(500).json({
        ok: false,
        timestamp: new Date().toISOString(),
        detail: 'Failed to create ServiceNow client'
      });
    }

    // Check access to each table
    const tableResults: Record<string, TableAccessResult> = {};
    let allAccessible = true;

    for (const tableName of AGILE_TABLES) {
      const result = await client.checkTableAccess(tableName);
      tableResults[tableName] = result;
      
      if (!result.accessible) {
        allAccessible = false;
      }
    }

    // Return results
    return res.status(200).json({
      ok: allAccessible,
      instance: instanceUrl,
      timestamp: new Date().toISOString(),
      tables: tableResults
    });
  } catch (error: any) {
    console.error('ServiceNow discovery error:', error);
    
    return res.status(502).json({
      ok: false,
      timestamp: new Date().toISOString(),
      detail: `Unexpected error during discovery: ${error.message}`
    });
  }
}
