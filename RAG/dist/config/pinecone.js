"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pineconeIndex = void 0;
const pinecone_1 = require("@pinecone-database/pinecone");
const dotenv_1 = require("dotenv");
(0, dotenv_1.configDotenv)();
const pc = new pinecone_1.Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
exports.pineconeIndex = pc.index("rca-rag", process.env.PINECONE_HOST);
