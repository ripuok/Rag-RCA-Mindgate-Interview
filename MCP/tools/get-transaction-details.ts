import { z } from "zod";
import { db } from "../db/connection";

export const getTransactionDetailsTool = {
	name: "get-transaction-details",
	description: "Fetch details of a specific transaction",
	inputSchema: z.object({
		transactionId: z.number().describe("Transaction ID"),
	}),
	handler: async ({ transactionId }) => {
		const [rows] = await db.query(
			`SELECT t.*, s.name as status_name
       FROM transactions t
       JOIN status s ON t.status_id = s.id
       WHERE t.id = ?`,
			[transactionId]
		);

		if ((rows as any[]).length === 0) {
			return {
				content: [{ type: "text", text: "No transaction found with that ID." }],
			};
		}

		const t = (rows as any)[0];
		return {
			content: [
				{
					type: "text",
					text: `Transaction ID: ${t.id}\nUser: ${t.user_id}\nAmount: ₹${t.amount}\nTime: ${t.timestamp}\nStatus: ${t.status_name}`,
				},
			],
		};
	},
};
