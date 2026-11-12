import handler from '../../server/runtime.mjs';
export default handler;
export const config = {path:['/api/access/login','/api/owner/login'], rateLimit:{action:'rate_limit',windowLimit:10,windowSize:60,aggregateBy:['ip','domain']}};
