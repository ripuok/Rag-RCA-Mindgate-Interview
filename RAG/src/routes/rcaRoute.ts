import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { generateRCA } from "../services/rcaService";

const router = express.Router();

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
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Timestamped filename to avoid overwriting (optional)
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    cb(null, `transaction.log`);
  },
});

const upload = multer({ storage });

router.post("/", upload.single("logfile"), async (req: Request, res: Response) => {
  try {
    //if (!req.file) {
      // res.status(400).json({ error: "No file uploaded" });
	  // return;
    //}

    // const filePath = req.file.path;

    // You could pass filePath if needed
    const rca = await generateRCA();

    // res.json({ rca });
	res.setHeader("Content-Type", "text/markdown");
res.send(rca); // not res.json
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "RCA generation failed" });
  }
});

export default router;
