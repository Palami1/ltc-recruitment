const { connectDB } = require('../../server/db');
const JobConfig = require('../../server/models/JobConfig');

const DEFAULT_CONFIG = {
  positions: [
    { id: '88', department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', title: 'ວິຊາການໄອທີ (IT)', code: '88', slots: '1', requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື ທຽບເທົ່າ'], deadline: '' },
    { id: '99', department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', title: 'ວິຊາການເຕັກນິກ (DEV-TEST)', code: '99', slots: '1', requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ເຕັກໂນໂລຊີ ຫຼື ທຽບເທົ່າ'], deadline: '' },
    { id: '100', department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', title: 'ພະນັກງານບໍລິການ (KHM)', code: '100', slots: '1', requirements: ['ຈົບປະລິນຍາຕີ ຫຼື ທຽບເທົ່າ'], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
  applicantRequirements: []
};

function sanitizePositions(positions) {
  if (!Array.isArray(positions)) return [];
  return positions.map((pos, idx) => ({
    ...pos,
    id: String(pos.id || pos.code || (idx + 1)),
    code: String(pos.code || pos.id || (idx + 1)),
    slots: pos.slots !== undefined && pos.slots !== null ? String(pos.slots) : '1',
    requirements: Array.isArray(pos.requirements) ? pos.requirements : [],
    deadline: pos.deadline || ''
  }));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  await connectDB();

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e){}
    }
    if (!body || !Array.isArray(body.positions)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Invalid payload: positions array is required' }));
    }

    const sanitizedPayload = {
      positions: sanitizePositions(body.positions),
      requiredDocs: Array.isArray(body.requiredDocs) ? body.requiredDocs : DEFAULT_CONFIG.requiredDocs,
      applicantRequirements: Array.isArray(body.applicantRequirements) ? body.applicantRequirements : []
    };

    try {
      await JobConfig.deleteMany({});
      const savedDoc = await JobConfig.create(sanitizedPayload);
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, message: 'Job configuration saved successfully', data: savedDoc }));
    } catch (err) {
      console.error('[API /api/job-config] Save error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ success: false, error: 'Failed to save job configuration to central database' }));
    }
  }

  // GET Request
  try {
    const doc = await JobConfig.findOne().sort({ updatedAt: -1 }).lean();
    if (doc && Array.isArray(doc.positions) && doc.positions.length > 0) {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        positions: sanitizePositions(doc.positions),
        requiredDocs: doc.requiredDocs || DEFAULT_CONFIG.requiredDocs,
        applicantRequirements: doc.applicantRequirements || []
      }));
    }
  } catch (err) {
    console.warn('[API /api/job-config] Read error:', err.message);
  }

  res.statusCode = 200;
  return res.end(JSON.stringify(DEFAULT_CONFIG));
};
