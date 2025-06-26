import { z } from "zod";
import fs from "fs";
import path from "path";
import readline from "readline";

export const getFailedTransactionsTool = {
	name: "get-failed-transactions",
	description:
		"Return all raw JSON lines of failed transactions from transaction.log",
	inputSchema: z.object({}),
	handler: async () => {
		const logFilePath = path.join(process.cwd(), "../uploads/transaction.log");

		if (!fs.existsSync(logFilePath)) {
			return {
				content: [{ type: "text", text: "transaction.log file not found" }],
			};
		}

		const fileStream = fs.createReadStream(logFilePath);
		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		});

		const failedRawLogs: string[] = [];

		for await (const line of rl) {
			try {
				const tx = JSON.parse(line);
				if (tx.status?.toLowerCase() === "failed") {
					failedRawLogs.push(line); // use raw original line
				}
			} catch {
				continue;
			}
		}

		return {
			content: [
				{
					type: "text",
					text:
						failedRawLogs.length > 0
							? `Raw Failed Transactions:\n\n${failedRawLogs.join("\n")}`
							: "No failed transactions found.",
				},
			],
		};
	},
};
