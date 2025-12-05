import mongoose from 'mongoose';

const QualityResultSchema = new mongoose.Schema({
  fileName: String,
  totalRecords: Number,
  totalIssues: Number,
  qualityScore: Number,
  severity: String,
  totalAffectedAmount: Number,
  issues: [{ type: String }],
  issuesDetailed: [{ name: String, count: Number, affectedAmount: Number }],
  anomalies: [{ type: { type: String }, detail: String, severity: String }],
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.model('QualityResult', QualityResultSchema);
