let memoryApplications = [];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e){}
  }

  if (req.method === 'GET') {
    return res.status(200).json(memoryApplications);
  }

  if (req.method === 'POST') {
    const doc = {
      ...(body || {}),
      _id: String(Date.now()),
      createdAt: (body && body.createdAt) ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      status: (body && body.status) || 'PENDING'
    };
    memoryApplications.unshift(doc);
    return res.status(200).json({ success: true, id: doc._id, data: doc });
  }

  if (req.method === 'PUT') {
    const parts = url.split('/');
    const id = parts[parts.length - 1];
    memoryApplications = memoryApplications.map(a => (a._id === id || a.id === id) ? { ...a, ...(body || {}) } : a);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const parts = url.split('/');
    const id = parts[parts.length - 1];
    memoryApplications = memoryApplications.filter(a => a._id !== id && a.id !== id);
    return res.status(200).json({ success: true });
  }

  return res.status(200).json(memoryApplications);
}
