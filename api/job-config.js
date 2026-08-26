let memoryJobConfig = {
  positions: [
    { id: '88', department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', title: 'ວິຊາການໄອທີ (IT)', code: '88', slots: '1', requirements: [], deadline: '' },
    { id: '99', department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', title: 'ວິຊາການເຕັກນິກ (DEV-TEST)', code: '99', slots: '1', requirements: [], deadline: '' },
    { id: '100', department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', title: 'ພະນັກງານບໍລິການ (KHM)', code: '100', slots: '1', requirements: [], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e){}
    }
    if (body && Array.isArray(body.positions)) {
      memoryJobConfig = body;
    }
    return res.status(200).json({ success: true, data: memoryJobConfig });
  }

  return res.status(200).json(memoryJobConfig);
}
