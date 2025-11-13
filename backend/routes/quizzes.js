// backend/routes/quizzes.js
import { Router } from "express";
import Quiz from "../models/Quiz.js";

const r = Router();

/** Tạo mới quiz (POST) **/
r.post("/", async (req, res) => {
  try {
    const { _id, title, settings, questions } = req.body || {};
    if (!_id || !title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Thiếu _id/title/questions" });
    }
    const doc = await Quiz.findById(_id);
    if (doc) {
      doc.title = title;
      doc.settings = settings || {};
      doc.questions = questions;
      await doc.save();
      return res.status(200).json({ message: "Updated", _id: doc._id });
    } else {
      await Quiz.create({ _id, title, settings, questions });
      return res.status(201).json({ message: "Created", _id });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Lỗi máy chủ", detail: e?.message });
  }
});

/** Lấy quiz theo id (GET) **/
r.get("/:id", async (req, res) => {
  try {
    const qz = await Quiz.findById(req.params.id).lean();
    if (!qz) return res.status(404).json({ message: "Quiz không tồn tại" });
    res.json(qz);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

/** Danh sách tất cả quiz **/
r.get("/", async (_req, res) => {
  try {
    const list = await Quiz.find({}, { _id: 1, title: 1, "settings.immediateFeedback": 1 }).lean();
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

/** Xoá quiz theo id **/
r.delete("/:id", async (req, res) => {
  try {
    const del = await Quiz.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "Quiz không tồn tại" });
    res.json({ message: "Đã xoá quiz", _id: req.params.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

export default r;
