const { connectDB } = require('../server/db');
const Application = require('../server/models/Application');

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

  const url = req.url || '';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch(e){}
  }

  if (req.method === 'GET') {
    try {
      const isTrash = url.includes('trash=true');
      const filter = isTrash ? { isDeleted: true } : { isDeleted: { $ne: true } };
      const records = await Application.find(filter).sort({ submittedAt: -1 }).lean();
      res.statusCode = 200;
      return res.end(JSON.stringify({ data: records || [] }));
    } catch (err) {
      console.error('[API /api/applications] GET error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to fetch applications' }));
    }
  }

  if (req.method === 'POST') {
    try {
      const appId = body.id || `APP_${Date.now()}`;
      const doc = {
        ...(body || {}),
        id: appId,
        refCode: body.refCode || `LTC-${new Date().getFullYear()}-${appId.slice(-5).toUpperCase()}`,
        submittedAt: body.submittedAt || new Date().toISOString(),
        status: body.status || 'PENDING',
        isDeleted: false
      };
      const created = await Application.create(doc);
      res.statusCode = 201;
      return res.end(JSON.stringify({ success: true, id: created.id, data: created }));
    } catch (err) {
      console.error('[API /api/applications] POST error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to create application' }));
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      const updated = await Application.findOneAndUpdate({ id }, { ...body }, { new: true });
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, data: updated }));
    } catch (err) {
      console.error('[API /api/applications] PUT/PATCH error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to update application' }));
    }
  }

  if (req.method === 'DELETE') {
    try {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      await Application.findOneAndUpdate({ id }, { isDeleted: true, deletedAt: new Date() });
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[API /api/applications] DELETE error:', err);
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Failed to delete application' }));
    }
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'Method not allowed' }));
};
