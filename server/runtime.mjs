import { getStore } from '@netlify/blobs';
import deployment from './deployment.mjs';
import { createAccess } from './access.mjs';
export default async function handler(request) {
  // Explicit namespace prevents branch/preview deployments sharing access data.
  const env = process.env;
  if (deployment.branch !== 'v2' || deployment.context !== 'branch-deploy' || !/^[a-z0-9-]{3,60}$/.test(env.ACCESS_STORE || '')) {
    return Response.json({error:'Private access is not enabled for this deployment.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
  try {
    return await createAccess({env, store:getStore({name:env.ACCESS_STORE,consistency:'strong'})})(request);
  } catch {
    return Response.json({error:'Private access is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
