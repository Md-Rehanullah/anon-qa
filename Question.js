const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true, minlength: 8, maxlength: 300 },
  status: { type: String, default: "visible", enum: ["visible", "hidden"] },
  createdAt: { type: Date, default: Date.now },
  answersCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Question', QuestionSchema);
