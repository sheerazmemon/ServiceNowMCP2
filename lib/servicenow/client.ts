/**
 * ServiceNow REST API Client
 * Uses native fetch for HTTP requests with Basic Authentication
 */

export interface ConnectionTestResult {
  ok: boolean;
  status: number;
  message?: string;
}

export interface TableAccessResult {
  accessible: boolean;
  status: number;
  reason: string | null;
}

export class ServiceNowClient {
  private instanceUrl: string;
  private username: string;
  private password: string;
  private authHeader: string;

  constructor(instanceUrl: string, username: string, password: string) {
    // Remove trailing slash if present
    this.instanceUrl = instanceUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Test connection to ServiceNow instance
   * Makes a minimal API call to sys_user table
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const endpoint = `${this.instanceUrl}/api/now/table/sys_user`;
    const params = new URLSearchParams({
      sysparm_limit: '1',
      sysparm_fields: 'sys_id,user_name'
    });

    try {
      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Verify we got valid ServiceNow response structure
        if (data && Array.isArray(data.result)) {
          return {
            ok: true,
            status: response.status,
            message: `Connected successfully. Found ${data.result.length} user(s).`
          };
        } else {
          return {
            ok: false,
            status: response.status,
            message: 'Unexpected response format from ServiceNow'
          };
        }
      } else if (response.status === 401 || response.status === 403) {
        return {
          ok: false,
          status: response.status,
          message: 'Authentication failed. Check username and password.'
        };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        return {
          ok: false,
          status: response.status,
          message: `ServiceNow returned error: ${errorText.substring(0, 100)}`
        };
      }
    } catch (error: any) {
      // Handle network errors, timeouts, etc.
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          ok: false,
          status: 504,
          message: 'Connection timeout. ServiceNow instance may be unreachable.'
        };
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          ok: false,
          status: 502,
          message: 'Cannot reach ServiceNow instance. Check instance URL.'
        };
      } else {
        return {
          ok: false,
          status: 500,
          message: `Network error: ${error.message}`
        };
      }
    }
  }

  /**
   * Generic query method for ServiceNow tables
   * Returns raw ServiceNow response with display values
   */
  async query<T>(
    tableName: string,
    params: Record<string, string> = {}
  ): Promise<{ result: T[] }> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}`;
    
    // Add display value parameters
    const queryParams = new URLSearchParams({
      sysparm_display_value: 'all',
      sysparm_exclude_reference_link: 'true',
      ...params
    });

    const response = await fetch(`${endpoint}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout for data queries
    });

    if (!response.ok) {
      throw new Error(`ServiceNow query failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Update a ServiceNow record
   * Returns the updated record
   */
  async patch<T>(
    tableName: string,
    sysId: string,
    data: Record<string, any>
  ): Promise<{ result: T }> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}/${sysId}`;

    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow PATCH failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Check if a specific table is accessible
   * Makes a minimal query to verify table exists and is readable
   */
  async checkTableAccess(tableName: string): Promise<TableAccessResult> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}`;
    const params = new URLSearchParams({
      sysparm_limit: '1',
      sysparm_fields: 'sys_id'
    });

    try {
      const response = await fetch(`${endpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        return {
          accessible: true,
          status: response.status,
          reason: null
        };
      } else if (response.status === 404) {
        return {
          accessible: false,
          status: response.status,
          reason: 'not_found'
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          accessible: false,
          status: response.status,
          reason: 'auth'
        };
      } else {
        return {
          accessible: false,
          status: response.status,
          reason: 'error'
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          accessible: false,
          status: 504,
          reason: 'timeout'
        };
      } else {
        return {
          accessible: false,
          status: 502,
          reason: 'network_error'
        };
      }
    }
  }

  /**
   * Get a single record by sys_id
   */
  async get<T>(
    tableName: string,
    sysId: string
  ): Promise<{ result: T }> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}/${sysId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow GET failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Create a new record
   */
  async create<T>(
    tableName: string,
    data: Record<string, any>
  ): Promise<{ result: T }> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow POST failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Update an existing record (alias for patch)
   */
  async update<T>(
    tableName: string,
    sysId: string,
    data: Record<string, any>
  ): Promise<{ result: T }> {
    return this.patch<T>(tableName, sysId, data);
  }

  /**
   * Delete a record
   */
  async delete(tableName: string, sysId: string): Promise<void> {
    const endpoint = `${this.instanceUrl}/api/now/table/${tableName}/${sysId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow DELETE failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  }

  /**
   * Perform aggregation operations
   */
  async aggregate(
    tableName: string,
    query: string | undefined,
    groupBy: string | undefined,
    operation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX',
    field?: string
  ): Promise<any> {
    const params: Record<string, string> = {};

    // For COUNT operations
    if (operation === 'COUNT') {
      params.sysparm_count = 'true';
    }

    // Add query filter
    if (query) {
      params.sysparm_query = query;
    }

    // Add group by
    if (groupBy) {
      params.sysparm_group_by = groupBy;
    }

    // For non-COUNT operations, add field parameter
    if (operation !== 'COUNT' && field) {
      params[`sysparm_${operation.toLowerCase()}_fields`] = field;
    }

    const endpoint = `${this.instanceUrl}/api/now/stats/${tableName}`;
    const queryParams = new URLSearchParams(params);

    const response = await fetch(`${endpoint}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow aggregation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Get schema definition for a table
   */
  async getSchema(tableName: string): Promise<any> {
    const response = await this.query('sys_dictionary', {
      sysparm_query: `name=${tableName}`,
      sysparm_fields: 'element,column_label,internal_type,mandatory,max_length,reference'
    });

    const fields = response.result.map((field: any) => ({
      name: field.element,
      type: field.internal_type,
      label: field.column_label,
      mandatory: field.mandatory === 'true',
      max_length: field.max_length ? parseInt(field.max_length) : undefined,
      reference: field.reference || undefined,
    }));

    return {
      name: tableName,
      label: tableName,
      fields,
    };
  }

  /**
   * Discover available tables
   */
  async discoverTables(filter?: string): Promise<any[]> {
    const params: Record<string, string> = {
      sysparm_limit: '100',
      sysparm_fields: 'name,label,sys_id',
    };

    if (filter) {
      params.sysparm_query = `nameLIKE${filter}^ORlabelLIKE${filter}`;
    }

    const response = await this.query('sys_db_object', params);
    return response.result;
  }

  /**
   * Get CMDB relationships for a configuration item
   */
  async getRelationships(ciSysId: string, depth: number = 3): Promise<any> {
    const endpoint = `${this.instanceUrl}/api/now/cmdb/instance/${ciSysId}`;
    const params = new URLSearchParams({
      sysparm_depth: String(depth)
    });

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ServiceNow CMDB query failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Query system logs
   */
  async getSystemLogs(query?: string, limit: number = 100): Promise<any[]> {
    const params: Record<string, string> = {
      sysparm_limit: String(limit),
    };

    if (query) {
      params.sysparm_query = query;
    }

    const response = await this.query('syslog', params);
    return response.result;
  }

  /**
   * Get attachments for a record
   */
  async getAttachments(tableName: string, recordId: string): Promise<any[]> {
    const response = await this.query('sys_attachment', {
      sysparm_query: `table_name=${tableName}^table_sys_id=${recordId}`
    });
    return response.result;
  }
}

/**
 * Create a ServiceNow client from environment variables
 */
export function createClientFromEnv(): ServiceNowClient | null {
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    return null;
  }

  return new ServiceNowClient(instanceUrl, username, password);
}
