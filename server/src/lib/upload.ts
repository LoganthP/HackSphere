import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { badRequest } from "./http";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([".pdf", ".zip", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".mp4", ".md", ".txt", ".docx"]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.has(ext)) return cb(badRequest(`Files of type ${ext || "unknown"} aren't accepted. Use PDF, ZIP, PPTX, DOCX, MD, TXT, PNG, JPG or MP4.`));
    cb(null, true);
  },
});
