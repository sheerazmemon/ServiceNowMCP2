/**
 * Test script for getTaskDetails function
 * 
 * Run with: 
 *   SERVICENOW_INSTANCE_URL=https://your-instance.service-now.com \
 *   SERVICENOW_USERNAME=your_username \
 *   SERVICENOW_PASSWORD=your_password \
 *   npx tsx test-task-details.ts
 * 
 * Or set environment variables in your shell before running
 */

import { getTaskDetails } from './lib/servicenow/taskDetails';
import { ServiceNowClient } from './lib/servicenow/client';

async function testGetTaskDetails() {
  console.log('=== Testing getTaskDetails ===\n');

  // Initialize ServiceNow client with credentials from environment
  const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instanceUrl || !username || !password) {
    console.error('Error: Missing ServiceNow credentials in environment variables');
    console.error('Please ensure .env.local contains:');
    console.error('  SERVICENOW_INSTANCE_URL');
    console.error('  SERVICENOW_USERNAME');
    console.error('  SERVICENOW_PASSWORD');
    return;
  }

  const client = new ServiceNowClient(instanceUrl, username, password);

  // Test 1: Fetch by taskKey
  console.log('Test 1: Fetch by taskKey');
  try {
    const task1 = await getTaskDetails(client, { taskKey: 'STSK0011008' });
    console.log('Success! Task details:');
    console.log(JSON.stringify(task1, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Fetch by taskId
  console.log('Test 2: Fetch by taskId');
  try {
    const task2 = await getTaskDetails(client, { taskId: '6c6bdd5fcfb23e10ac0b71164d851cba' });
    console.log('Success! Task details:');
    console.log(JSON.stringify(task2, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Error - no identifier
  console.log('Test 3: Error - no identifier');
  try {
    await getTaskDetails(client, {});
  } catch (error: any) {
    console.error('Expected error:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Error - both identifiers
  console.log('Test 4: Error - both identifiers');
  try {
    await getTaskDetails(client, { taskId: 'abc', taskKey: 'STSK123' });
  } catch (error: any) {
    console.error('Expected error:', error.message);
  }
}

testGetTaskDetails();
