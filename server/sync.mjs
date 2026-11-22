import {createRemoteJWKSet,jwtVerify} from 'jose';
const issuer='https://token.actions.githubusercontent.com';
const keys=createRemoteJWKSet(new URL(issuer+'/.well-known/jwks'));
export const SYNC_REPOSITORY='adamusdaniel/portfolio-private';
export const SYNC_AUDIENCE='portfolio-private-sync';
// Signature, issuer, audience and expiration are checked before these claims.
export function assertSyncClaims(payload){
  if(payload.repository!==SYNC_REPOSITORY || payload.repository_visibility!=='private' ||
    payload.ref!=='refs/heads/v2' || payload.workflow_ref!==SYNC_REPOSITORY+'/.github/workflows/publish.yml@refs/heads/v2' ||
    !['push','workflow_dispatch'].includes(payload.event_name) || payload.runner_environment!=='github-hosted') throw Error('Untrusted publisher');
}
export function createSyncAuthorizer(keySet=keys){return async function authorize(request){
  const auth=request.headers.get('authorization');
  if(!auth?.startsWith('Bearer ') || auth.length>20000) throw Error('Missing publisher identity');
  const {payload}=await jwtVerify(auth.slice(7),keySet,{issuer,audience:SYNC_AUDIENCE,algorithms:['RS256'],maxTokenAge:'10m',requiredClaims:['exp','iat','sub']});
  assertSyncClaims(payload);
};}
export const authorizeSync=createSyncAuthorizer();
