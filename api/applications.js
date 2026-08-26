global.__MEM_APPLICATIONS__ = global.__MEM_APPLICATIONS__ || [];

module.exports = async function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.end();
  }

  const url = req.url || '';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e){}
  }

  if (req.method === 'GET') {
    return res.end(JSON.stringify(global.__MEM_APPLICATIONS__));
  }

  if (req.method === 'POST') {
    const doc = {
      ...(body || {}),
      _id: String(Date.now()),
      createdAt: body?.createdAt ? new Date(body.createdAt) : new Date(),
      updatedAt: new Date(),
      status: body?.status || 'PENDING'
    };
    global.__MEM_APPLICATIONS__.unshift(doc);
    return res.end(JSON.stringify({ success: true, id: doc._id, data: doc }));
  }

  if (req.method === 'PUT') {
    const parts = url.split('/');
    const id = parts[parts.length - 1];
    global.__MEM_APPLICATIONS__ = global.__MEM_APPLICATIONS__.map(a => (a._id === id || a.id === id) ? { ...a, ...(body || {}) } : a);
    return res.end(JSON.stringify({ success: true }));
  }

  if (req.method === 'DELETE') {
    const parts = url.split('/');
    const id = parts[parts.length - 1];
    global.__MEM_APPLICATIONS__ = global.__MEM_APPLICATIONS__.filter(a => a._id !== id && a.id !== id);
    return res.end(JSON.stringify({ success: true }));
  }

  return res.end(JSON.stringify(global.__MEM_APPLICATIONS__));
};
