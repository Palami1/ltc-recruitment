export const config = {
  runtime: 'edge',
};

let store = {
  positions: [
    { id: '88', department: 'ແຂວງສະຫວັນນະເຂດ', branch: 'ແຂວງສະຫວັນນະເຂດ', title: 'ວິຊາການໄອທີ (IT)', code: '88', slots: '1', requirements: [], deadline: '' },
    { id: '99', department: 'ແຂວງບໍລິຄຳໄຊ', branch: 'ແຂວງບໍລິຄຳໄຊ', title: 'ວິຊາການເຕັກນິກ (DEV-TEST)', code: '99', slots: '1', requirements: [], deadline: '' },
    { id: '100', department: 'ແຂວງຄຳມ່ວນ', branch: 'ແຂວງຄຳມ່ວນ', title: 'ພະນັກງານບໍລິການ (KHM)', code: '100', slots: '1', requirements: [], deadline: '' }
  ],
  requiredDocs: ['ໃບສະໝັກວຽກ', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.']
};

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const data = await req.json();
      if (data && Array.isArray(data.positions)) {
        store = data;
      }
    } catch (e) {}
  }

  return new Response(JSON.stringify(store), {
    status: 200,
    headers: corsHeaders,
  });
}
