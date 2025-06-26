import express, { Request } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { generateRCA } from "../services/rcaService";

const router = express.Router();

/**
 * @swagger
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
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rca:
 *                   type: string
 */
const storage = multer.diskStorage({
	destination: (req: Request, file: Express.Multer.File, cb) => {
		const uploadDir = path.join(process.cwd(), "uploads");
		if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		cb(null, "transaction.log"); // Always overwrite for simplicity
	},
});

const upload = multer({ storage });

// Route with file upload
router.post("/", upload.single("logfile"), async (req: Request, res) => {
	try {
		const rca = await generateRCA(); // You can pass transactionId or path if needed
		res.json({ rca });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "RCA generation failed" });
	}
});

export default router;
