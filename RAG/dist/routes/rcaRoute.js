"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const rcaService_1 = require("../services/rcaService");
const router = express_1.default.Router();
/**
 * @openapi
 * /rca:
 *   post:
 *     summary: Upload transaction log and generate RCA
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logfile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Successfully generated RCA
 *         content:
 *           text/markdown:
 *             schema:
 *               type: object
 *               properties:
 *                 rca:
 *                   type: string
 *                   description: Markdown-formatted RCA report
 *                   example: |
 *                     ### Root Cause Analysis (RCA)
 *                     - TransactionID: TXN123...
 */
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), "uploads");
        if (!fs_1.default.existsSync(uploadDir))
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Timestamped filename to avoid overwriting (optional)
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        cb(null, `transaction.log`);
    },
});
const upload = (0, multer_1.default)({ storage });
router.post("/", upload.single("logfile"), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }
        // const filePath = req.file.path;
        // You could pass filePath if needed
        const rca = await (0, rcaService_1.generateRCA)();
        // res.json({ rca });
        res.setHeader("Content-Type", "text/markdown");
        res.send(rca); // not res.json
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "RCA generation failed" });
    }
});
exports.default = router;
