import mongoose from "mongoose";

const OptionSchema = new mongoose.Schema({
  id:   { type: String, required: true },  // "A" | "B" | ...
  text: { type: String, required: true },
}, { _id: false });

const BinaryItemSchema = new mongoose.Schema({
  id:            { type: String, required: true },
  text:          { type: String, required: true },
  correctColumn: { type: String, required: true }, // ví dụ "Có" hoặc "Không"
}, { _id: false });

const DragBankSchema = new mongoose.Schema({
  id:   { type: String, required: true },
  text: { type: String, required: true },
}, { _id: false });

const DragTargetSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  label: { type: String, required: true },
}, { _id: false });

// Câu hỏi tổng quát — các field “union” tùy theo type
const QuestionSchema = new mongoose.Schema({
  id:      { type: String, required: true },
  type:    { type: String, enum: ["single", "multi", "binary", "dragdrop", "image_single", "image_grid"], required: true },
  prompt:  { type: String, required: true },
  image:   { type: String }, // dùng cho image_single

  // single / image_single
  options:        { type: [OptionSchema], default: void 0 },
  correct:        { type: mongoose.Schema.Types.Mixed }, // "A" | ["A","C"]

  // multi
  minCorrect:     { type: Number },
  maxCorrect:     { type: Number },

  // binary
  columns:        { type: [String], default: void 0 },     // ["Có","Không"]
  items:          { type: [BinaryItemSchema], default: void 0 },

  // dragdrop
  targets:        { type: [DragTargetSchema], default: void 0 },
  bank:           { type: [DragBankSchema],   default: void 0 },
  correctMapping: { type: Map, of: String,    default: void 0 }, // { t1: "o1", t2: "o2" }
}, { _id: false });

// Validator tùy theo type (báo lỗi sớm nếu payload sai)
QuestionSchema.path("type").validate(function () {
  const t = this.type;
  if (t === "single" || t === "image_single") {
    if (!Array.isArray(this.options) || typeof this.correct !== "string") return false;
  }
  if (t === "image_grid") {
    // image grid expects an options array of 4 image URLs and a string correct id
    if (!Array.isArray(this.options) || this.options.length !== 4) return false;
    if (typeof this.correct !== "string") return false;
  }
  if (t === "multi") {
    if (!Array.isArray(this.options) || !Array.isArray(this.correct) || this.correct.length < 2) return false;
  }
  if (t === "binary") {
    if (!Array.isArray(this.columns) || this.columns.length !== 2) return false;
    if (!Array.isArray(this.items) || this.items.length === 0) return false;
  }
  if (t === "dragdrop") {
    if (!Array.isArray(this.targets) || !Array.isArray(this.bank)) return false;
    if (!this.correctMapping) return false;
  }
  if (t === "coordinate") {
    if (!this.image) return false;
    if (!this.correctCoordinate || typeof this.correctCoordinate.x !== 'number' || typeof this.correctCoordinate.y !== 'number') return false;
  }
  return true;
}, "Invalid question payload for given type");

const QuizSchema = new mongoose.Schema({
  _id:      { type: String, required: true }, 
  title:    { type: String, required: true },
  settings: {
    immediateFeedback: { type: Boolean, default: false },
    timeLimit: { type: Number, default: null } // Thời gian làm bài (phút), null = không giới hạn
  },
  questions: { type: [QuestionSchema], required: true }
}, { timestamps: true });

export default mongoose.model("Quiz", QuizSchema);
