// JM M002 workstream 2 — read-only current-source authority reconciliation.
// Source is NOT authority: compare an exact observed hosted result before any
// production promotion. No owner/private data, network dispatch or mutation here.
const expectedServer='JM ECOSTATE Build Mesh Native MCP';
const SHA=/^[a-f0-9]{64}$/;
export function reconcileBuildMeshAuthority({candidate,published,hosted}){
 if(!candidate||!published||!hosted)throw Error('JM_MESH_CONTACT_INPUT_HOLD');
 if(candidate.schema!=='JM.Estate.PublicNervousSystem/1'||published.schema!==candidate.schema)
   throw Error('JM_MESH_PUBLIC_SCHEMA_HOLD');
 const seat=r=>r.lineage_seats?.find(x=>x.id==='JM-BUILD-MESH-001');
 const current=seat(candidate),deployed=seat(published);
 if(!current||!deployed||candidate.privacy_boundary?.contains_private_owner_data!==false||
   candidate.privacy_boundary?.contains_owner_write_endpoint!==false||
   deployed.authority?.primary===undefined)throw Error('JM_MESH_PRIVACY_OR_SEAT_HOLD');
 if(hosted.server!==expectedServer||!/^0\.\d+\.\d+$/.test(hosted.version||'')||
   hosted.current_registry_hash_mode!=='SHA256_EXACT_LOADED_BYTES'||
   hosted.current_registry_reload_policy!=='PROCESS_START'||
   !SHA.test(hosted.current_registry_sha256||'')||
   !Number.isSafeInteger(hosted.current_registry_loaded_bytes)||hosted.current_registry_loaded_bytes<1||
   !Number.isSafeInteger(hosted.current_project_records)||hosted.current_project_records<1||
   !Number.isSafeInteger(hosted.capability_profiles)||hosted.capability_profiles<1||
   !/^JM\.CareerCurrentProjectRegistry\/\d+\.\d+$/.test(hosted.current_registry_schema||''))
   throw Error('JM_MESH_LIVE_STATUS_CONTRACT_HOLD');
 const currentVersion='v'+hosted.version;
 const aligned=current.authority?.hosted_mcp_current===currentVersion&&
   current.authority?.primary===hosted.current_registry_schema&&
   current.lineage?.some(x=>x.locator==='v0.7.3')&&
   current.lineage?.some(x=>x.locator?.includes(currentVersion)&&String(x.authority||'').includes(hosted.current_registry_sha256))&&
   String(current.boundary||'').includes('candidate until explicitly deployed');
 const publishedAligned=deployed.authority?.hosted_mcp_current===currentVersion&&
   deployed.authority?.primary===hosted.current_registry_schema;
 const publicDrift=!publishedAligned;
 return Object.freeze({
  schema:'jm.m002.mesh-authority-reconciliation/1',
  directHosted:{server:hosted.server,version:currentVersion,registry:hosted.current_registry_schema,
   registrySha256:hosted.current_registry_sha256,registryBytes:hosted.current_registry_loaded_bytes,
   records:hosted.current_project_records,capabilityProfiles:hosted.capability_profiles},
  publicCurrent:{version:deployed.authority?.hosted_mcp_current,registry:deployed.authority?.primary,
    state:publicDrift?'PUBLIC_SOURCE_DRIFT':'MATCHES_DIRECT_HOSTED'},
  candidate:{version:current.authority?.hosted_mcp_current,registry:current.authority?.primary,
    state:aligned?'SOURCE_RECONCILED_DEPLOY_HOLD':'SOURCE_DRIFT_HOLD'},
  eligibleForReview:aligned, mutationPerformed:false, deploymentPerformed:false,
  privacyBoundary:'Public read-only metadata only. Private owner current evidence outranks public registry. Candidate match is not deployment or live private owner/write authority.'
 });
}
