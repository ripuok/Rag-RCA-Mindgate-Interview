import { z } from "zod";
import fs from "fs";
import path from "path";

export const getFailedTransactionsTool = {
	name: "get-failed-transactions",
	description: "Return full plain text contents of transaction.log",
	inputSchema: z.object({}),
	handler: async () => {
		const logFilePath = path.join(process.cwd(), "uploads/transaction.log");

		if (!fs.existsSync(logFilePath)) {
			return {
				content: [{ type: "text", text: "transaction.log file not found" }],
			};
		}

		try {
			const rawText = fs.readFileSync(logFilePath, "utf-8");
			return {
				content: [
					{
						type: "text",
						text: `Full transaction.log contents:\n\n${rawText}`,
					},
				],
			};
		} catch (err: any) {
			return {
				content: [
					{
						type: "text",
						text: `Error reading log file: ${err.message}`,
					},
				],
			};
		}
	},
};
