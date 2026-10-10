import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';

async function main() {
  const mcpClient = new Client({
    name: 'agent-loop-client',
    version: '1.0.0',
  });

  const transport = new StreamableHTTPClientTransport(
    new URL('http://127.0.0.1:3000/mcp'),
  );

  await mcpClient.connect(transport);

  console.log('✅ Connected to MCP server');

  const { tools } = await mcpClient.listTools();

  console.log('\nTools discovered:');

  for (const tool of tools) {
    console.log(`- ${tool.name}`);
    console.log(`  ${tool.description ?? ''}`);
  }

  await mcpClient.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});