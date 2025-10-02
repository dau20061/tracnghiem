// models/Quiz.js
import mongoose from "mongoose";
const Option = new mongoose.Schema({ id:String, text:String });
const BinaryItem = new mongoose.Schema({ id:String, text:String, correctColumn:String });
const Target = new mongoose.Schema({ id:String, label:String });
const Bank = new mongoose.Schema({ id:String, text:String });

const Question = new mongoose.Schema({
  id: String,
  type: { type:String, enum:["single","multi","binary","dragdrop","image_single"], required:true },
  prompt: String,
  image: String,
  options: [Option],
  correct: mongoose.Schema.Types.Mixed,           // "A" | ["A","C"] | mapping object
  minCorrect: Number,
  maxCorrect: Number,
  columns: [String],                              // ["Có","Không"]
  items: [BinaryItem],
  targets: [Target],
  bank: [Bank],
  correctMapping: mongoose.Schema.Types.Mixed     // { t1: "o1", ... }
});

const QuizSchema = new mongoose.Schema({
  title: String,
  settings: mongoose.Schema.Types.Mixed,
  questions: [Question]
}, { timestamps:true });

export default mongoose.model("Quiz", QuizSchema);
