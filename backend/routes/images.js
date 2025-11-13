import { Router } from "express";
import multer from "multer";
import Image from "../models/Image.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/images/upload -> multipart form field 'file'
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const img = await Image.create({ filename: req.file.originalname, contentType: req.file.mimetype, data: req.file.buffer });
    res.status(201).json({ id: img._id, url: `/api/images/${img._id}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Upload error" });
  }
});

// GET /api/images/:id -> serve binary
router.get("/:id", async (req, res) => {
  try {
    console.log("GET /api/images", req.params.id);
    const img = await Image.findById(req.params.id);
    if (!img) {
      return res.status(404).send("Not found");
    }

    const mime = img.contentType || "application/octet-stream";
    const data = Buffer.isBuffer(img.data) ? img.data : Buffer.from(img.data ?? []);

    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (data.length) {
      res.setHeader("Content-Length", data.length);
    }
    return res.status(200).end(data);
  } catch (e) {
    console.error("GET /api/images/%s error: %s", req.params.id, e.message);
    res.status(500).send("Error");
  }
});

export default router;
