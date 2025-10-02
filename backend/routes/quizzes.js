// backend/routes/quizzes.js
import { Router } from "express";
import { quiz } from "../models/quizdata.js"; // ✅ import đúng tên 'quiz'

const r = Router();

r.get("/:id", (req, res) => {
  const { id } = req.params;
  // Trả về cùng 1 đề, nhưng “gắn” _id theo id được hỏi để FE hiển thị hợp lý
  return res.json({
    ...quiz,
    _id: id,
    title: `${quiz.title} – ${id}`
  });
});

export default r;
