/**
 * TypeScript global type declarations for OpenAI ChatGPT MCP integration.
 * 
 * When the widget runs inside ChatGPT, the window.openai object is available
 * and provides the callTool method for invoking MCP tools.
 */

declare global {
  interface Window {
    openai?: {
      /**
       * Calls an MCP tool by name with the provided arguments.
       * 
       * @param name - The name of the MCP tool to call
       * @param args - The arguments to pass to the tool
       * @returns Promise resolving to the tool's response
       */
      callTool: (name: string, args: any) => Promise<{
        content: Array<{ type: string; text: string }>;
        structuredContent?: any;
      }>;
    };
  }
}

export {};
