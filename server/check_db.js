const mongoose = require('mongoose');

const DEFAULT_CLOUD_MONGO_URI = 'mongodb+srv://palamiphomaly_db_user:Valo58787788@cluster0.fjzhauz.mongodb.net/ltc_recruitment?retryWrites=true&w=majority';
const mongoUri = process.env.MONGODB_URI || DEFAULT_CLOUD_MONGO_URI;

const jobConfigSchema = new mongoose.Schema({
  positions: mongoose.Schema.Types.Mixed,
  requiredDocs: [String],
  applicantRequirements: mongoose.Schema.Types.Mixed
}, { timestamps: true, collection: 'jobconfigs' });

const JobConfig = mongoose.models.JobConfig || mongoose.model('JobConfig', jobConfigSchema);

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas!');

  const count = await JobConfig.countDocuments();
  console.log(`=== Total JobConfig Documents: ${count} ===`);

  const docs = await JobConfig.find().sort({ updatedAt: -1, _id: -1 }).lean();
  docs.forEach((doc, i) => {
    console.log(`Document #${i + 1} | _id: ${doc._id} | updatedAt: ${doc.updatedAt} | positions count: ${doc.positions ? doc.positions.length : 0}`);
  });

  if (docs.length > 1) {
    const keepId = docs[0]._id;
    console.log(`Deleting ${docs.length - 1} older documents and keeping latest (_id: ${keepId})...`);
    const deleteResult = await JobConfig.deleteMany({ _id: { $ne: keepId } });
    console.log(`Deleted ${deleteResult.deletedCount} old document(s).`);
  } else {
    console.log('No old documents to delete (count <= 1).');
  }

  const finalCount = await JobConfig.countDocuments();
  console.log(`=== Final Document Count in DB: ${finalCount} ===`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in check_db:', err);
  process.exit(1);
});
