import mongoose from 'mongoose';

const ClaimRecordSchema = new mongoose.Schema({
  claimId: { type: String, required: true, index: true },
  patientName: String,
  diagnosisCode: String,
  amount: { type: Number, default: 0 },
  provider: String,
  date: Date,
  fileName: String,
  uploadTimestamp: { type: Date, default: () => new Date() }
});

export default mongoose.model('ClaimRecord', ClaimRecordSchema);
