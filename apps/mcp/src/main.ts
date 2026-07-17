import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TkfClient } from './client.js';
import { registerTools } from './tools.js';

/**
 * Task Kanban Flow MCP server (stdio).
 *
 * Configure with two environment variables:
 *   TKF_API_URL  — base URL of the API (default http://localhost:3000)
 *   TKF_API_KEY  — an API key (tkf_…). Use a read_write key to allow mutations.
 */
async function main(): Promise<void> {
  const baseUrl = process.env['TKF_API_URL'] ?? 'http://localhost:3000';
  const apiKey = process.env['TKF_API_KEY'];
  if (!apiKey) {
    process.stderr.write(
      'TKF_API_KEY is required (create one in the app under Settings → API Keys).\n',
    );
    process.exit(1);
  }

  const server = new McpServer({ name: 'task-kanban-flow', version: '1.0.0' });
  registerTools(server, new TkfClient({ baseUrl, apiKey }));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`tkf-mcp connected — API ${baseUrl}\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`tkf-mcp failed to start: ${String(err)}\n`);
  process.exit(1);
});
