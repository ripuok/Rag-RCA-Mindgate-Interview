import OpenAI from "openai";
import { getFailedTransactionsTool } from "../tools/mcpTools";
import { pineconeIndex } from "../config/pinecone";

const openai = new OpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: process.env.OPENROUTER_BASE_URL,
});

export const generateRCA = async () => {
	const failedTransactionsResult = await getFailedTransactionsTool.handler();

	// Extract plain text from the tool output
	const failedTransactions =
		failedTransactionsResult.content?.[0]?.text ||
		"No failed transactions found.";

	const result = await pineconeIndex.namespace("my-namespace").searchRecords({
		query: {
			inputs: { text: failedTransactions },
			topK: 4,
		},
		fields: ["category", "chunk_text"],
	});

	type Hit = {
		_score: number;
		fields: {
			chunk_text?: string;
			category?: string;
			[key: string]: any;
		};
	};

	const relevantDocs = (result.result.hits as Hit[])
		.filter((match) => match._score && match._score > 0.75)
		.map((match) => match.fields.chunk_text || "");

	const context = relevantDocs.join("\n") || "No relevant documentation found.";

	const prompt = `
You are a financial system analyst. 
Based on the following transaction details and relevant context, 
generate a Root Cause Analysis (RCA).

Transaction Info:
${failedTransactions}

Relevant Knowledge:
${context}
`;

	const response = await openai.chat.completions.create({
		model: "gpt-4",
		messages: [
			{ role: "system", content: "You are a payments RCA expert." },
			{ role: "user", content: prompt },
		],
	});

	return response.choices[0].message.content || "No response from OpenAI.";
};
