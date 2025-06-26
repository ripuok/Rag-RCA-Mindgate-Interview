import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getTransactionDetailsTool } from "./tools/get-transaction-details";

import { configDotenv } from "dotenv";
configDotenv();

const server = new McpServer({
	name: "rca-mcp-server",
	version: "1.0.0",
});

server.tool(
	getTransactionDetailsTool.name,
	getTransactionDetailsTool.description,
	getTransactionDetailsTool.inputSchema,
	getTransactionDetailsTool.handler
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("RCA MCP Server running via stdio");
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
