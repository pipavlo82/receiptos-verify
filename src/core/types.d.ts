export type ProductVerdict='VERIFIED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'CANNOT_RECOMPUTE'|'REJECTED_MALFORMED'|'UNSUPPORTED_PROFILE';
export interface Subject {kind:'git-artifact';id:string;artifact_digest:string;commit:string;tree:string;artifact_path:string;version:string}
export interface SemanticContract {claim_type:string;authority_class:string;subject:string|object;scope:string|object;valid_after:number;valid_until:number;assumptions:string[];evidence_requirements:string[]}
export interface VerificationRequest {schema:'receiptos.verify.request.v1';verification_profile:string;claim:{kind:'SHA256_EQUALS';expected_digest:string};subject:Subject;policy:{id:string;version:string;trusted_keys:{id:string;spki_base64:string}[];required_layers:string[];minimum_grade:string;verification_time:number};evidence:never[];semantic_requirement:SemanticContract;requested_guarantees:object[];domain_profile?:string;domain_requirement?:object;continuity_request?:object;guarantee_context?:object}
export interface AdapterResult {status:string;reasonCodes:string[];nativeResult:unknown;limitations?:string[];provenance?:object;execution?:object}
// Opt-in versioned native binding completeness; legacy v0.2 adapters do not
// silently acquire this contract. Evidence snapshots remain adapter-local.
export type BindingStatus='VERIFIED'|'CONTRADICTED'|'INSUFFICIENT_EVIDENCE'|'REJECTED_MALFORMED'|'UNSUPPORTED_PROFILE';
export type BindingJson=null|boolean|number|string|BindingJson[]|{[key:string]:BindingJson};
export interface BindingContract {version:1;required:string[]}
export interface ExactBinding {status:BindingStatus;relation:'EXACT';expected:BindingJson;observed:BindingJson;evidence:[string,string]}
export interface BindingReport {version:1;profileId:string;bindings:Record<string,ExactBinding>}
export interface BindingDescriptor {profileId:string;binding_contract:BindingContract}
export interface BindingAssessment {binding:string;status:BindingStatus;reasonCodes:string[];evidence?:string[]}
export interface BindingValidation extends AdapterResult {version:number|null;required:string[];bindings:Record<string,BindingAssessment>;missing:string[];failures:BindingAssessment[]}
export interface VerificationReport {schema:'receiptos.verify.report.v1';projection_version:'receiptos.verify.projection.v1';overall:ProductVerdict;reason_codes:string[];explanation:string;required_layers:string[];layers:Record<string,AdapterResult>;boundaries:string[]}
