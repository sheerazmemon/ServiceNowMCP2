/**
 * ServiceNow State Mapping Utility
 * 
 * Maps display labels to ServiceNow numeric choice values for rm_scrum_task.state
 * Uses caching with TTL to minimize sys_choice queries
 */

import { ServiceNowClient } from './client';

interface ChoiceRecord {
  label: { value: string; display_value: string };
  value: { value: string; display_value: string };
  inactive: { value: string; display_value: string };
}

interface StateMapping {
  labelToValue: Map<string, string>;  // normalized label -> numeric value
  valueToLabel: Map<string, string>;  // numeric value -> original label
  rawChoices: Array<{ label: string; value: string }>;
  timestamp: number;
}

// In-memory cache with TTL
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let stateMappingCache: StateMapping | null = null;

/**
 * Normalize label for case-insensitive, whitespace-tolerant matching
 * Examples:
 *   "Work in Progress" -> "work in progress"
 *   " Work   in progress " -> "work in progress"
 */
function normalizeLabel(label: string): string {
  return label
    .trim()
    .replace(/\s+/g, ' ')  // collapse multiple spaces to single space
    .toLowerCase();
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
  if (!stateMappingCache) {
    return false;
  }
  const age = Date.now() - stateMappingCache.timestamp;
  return age < CACHE_TTL_MS;
}

/**
 * Fetch and cache state mappings from sys_choice table
 */
export async function getStateMapping(client: ServiceNowClient): Promise<StateMapping> {
  // Return cached mapping if still valid
  if (isCacheValid() && stateMappingCache) {
    console.log('[StateMapping] Using cached mapping');
    return stateMappingCache;
  }

  console.log('[StateMapping] Fetching state choices from ServiceNow...');

  try {
    const response = await client.query<ChoiceRecord>('sys_choice', {
      sysparm_query: 'name=rm_scrum_task^element=state^inactive=false',
      sysparm_fields: 'label,value,inactive'
    });

    const labelToValue = new Map<string, string>();
    const valueToLabel = new Map<string, string>();
    const rawChoices: Array<{ label: string; value: string }> = [];

    for (const choice of response.result) {
      const label = choice.label.display_value;
      const value = choice.value.value;  // This is a string like "-6", "1", "2", "3", "4"
      
      const normalizedLabel = normalizeLabel(label);
      labelToValue.set(normalizedLabel, value);
      valueToLabel.set(value, label);
      rawChoices.push({ label, value });
    }

    console.log(`[StateMapping] Loaded ${labelToValue.size} state mappings:`);
    rawChoices.forEach(({ label, value }) => {
      console.log(`  "${label}" -> "${value}"`);
    });

    // Cache the mapping
    stateMappingCache = {
      labelToValue,
      valueToLabel,
      rawChoices,
      timestamp: Date.now()
    };

    return stateMappingCache;
  } catch (error) {
    console.error('[StateMapping] Failed to fetch state choices:', error);
    throw error;
  }
}

/**
 * Get state value for a given display label
 * Returns the numeric value string (e.g., "-6", "1", "2", "3", "4")
 */
export async function getStateValue(
  client: ServiceNowClient,
  displayLabel: string
): Promise<string | null> {
  const mapping = await getStateMapping(client);
  const normalized = normalizeLabel(displayLabel);
  return mapping.labelToValue.get(normalized) || null;
}

/**
 * Get all available state choices (for error messages)
 */
export async function getAllStateChoices(
  client: ServiceNowClient
): Promise<Array<{ label: string; value: string }>> {
  const mapping = await getStateMapping(client);
  return mapping.rawChoices;
}

/**
 * Clear the state mapping cache (useful for testing)
 */
export function clearStateMappingCache(): void {
  stateMappingCache = null;
  console.log('[StateMapping] Cache cleared');
}
