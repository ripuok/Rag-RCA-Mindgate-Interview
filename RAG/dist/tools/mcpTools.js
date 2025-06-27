"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedTransactionsTool = void 0;
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.getFailedTransactionsTool = {
    name: "get-failed-transactions",
    description: "Return full plain text contents of transaction.log",
    inputSchema: zod_1.z.object({}),
    handler: async () => {
        const logFilePath = path_1.default.join(process.cwd(), "uploads/transaction.log");
        if (!fs_1.default.existsSync(logFilePath)) {
            return {
                content: [{ type: "text", text: "transaction.log file not found" }],
            };
        }
        try {
            const rawText = fs_1.default.readFileSync(logFilePath, "utf-8");
            return {
                content: [
                    {
                        type: "text",
                        text: `Full transaction.log contents:\n\n${rawText}`,
                    },
                ],
            };
        }
        catch (err) {
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
