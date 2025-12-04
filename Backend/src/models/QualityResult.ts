import mongoose from 'mongoose';

const QualityResultSchema = new mongoose.Schema({
  fileName: String,
  totalRecords: Number,
  totalIssues: Number,
  qualityScore: Number,
  severity: String,
  totalAffectedAmount: Number,
  // issues summary strings (deprecated) kept for backward compatibility
  issues: [{ type: String }],
  // detailed breakdown: [{ name, count, affectedAmount }]
  issuesDetailed: [{ name: String, count: Number, affectedAmount: Number }],
  createdAt: { type: Date, default: () => new Date() }
});

export default mongoose.model('QualityResult', QualityResultSchema);
