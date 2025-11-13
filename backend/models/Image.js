import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema({
  filename: { type: String },
  contentType: { type: String },
  data: { type: Buffer },
}, { timestamps: true });

export default mongoose.model("Image", ImageSchema);
