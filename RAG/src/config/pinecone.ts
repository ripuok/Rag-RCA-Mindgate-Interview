import { Pinecone } from "@pinecone-database/pinecone";
import { configDotenv } from "dotenv";

configDotenv();

const pc = new Pinecone({
	apiKey: process.env.PINECONE_API_KEY!,
});

export const pineconeIndex = pc.index("rca-rag", process.env.PINECONE_HOST);
