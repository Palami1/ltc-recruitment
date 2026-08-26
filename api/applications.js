export const config = {
  runtime: 'edge',
};

let memoryApplications = [];

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

  const url = new URL(req.url);

  if (req.method === 'GET') {
    return new Response(JSON.stringify(memoryApplications), {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const doc = {
        ...(body || {}),
        _id: String(Date.now()),
        createdAt: body?.createdAt ? new Date(body.createdAt) : new Date(),
        updatedAt: new Date(),
        status: body?.status || 'PENDING'
      };
      memoryApplications.unshift(doc);
      return new Response(JSON.stringify({ success: true, id: doc._id, data: doc }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];
      memoryApplications = memoryApplications.map(a => (a._id === id || a.id === id) ? { ...a, ...(body || {}) } : a);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
  }

  if (req.method === 'DELETE') {
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    memoryApplications = memoryApplications.filter(a => a._id !== id && a.id !== id);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify(memoryApplications), {
    status: 200,
    headers: corsHeaders,
  });
}
