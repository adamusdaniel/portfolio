import handler from '../../server/runtime.mjs';
export default handler;
export const config = {path:['/api/access/session','/api/access/logout','/api/owner/logout','/api/owner/grants','/api/owner/images','/api/owner/content','/api/owner/grants/*','/api/private/*']};
