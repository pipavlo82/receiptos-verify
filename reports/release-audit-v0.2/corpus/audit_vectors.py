import base64, collections, hashlib, json, pathlib, re, subprocess

BASE=pathlib.Path(__file__).resolve().parents[2]
ROOT=BASE/'outputs/receiptos-verify'
OUT=pathlib.Path(__file__).resolve().parent
def load(path): return json.loads(path.read_text(encoding='utf-8'))
def canon(x): return json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def sha(x): return hashlib.sha256(x).hexdigest()
# Hand-authored independent review of each input change. This map does not import
# or run the product verifier, vector generator, adapters, or projection.
notes={
'V01':('Caller exact commit and SHA256 predicate','Artifact bytes, Git commit/tree/path and caller surface agree','SHA256 of decoded 36-byte artifact equals caller digest; baseline supplies the positive control for substitutions'),
'V02':('Caller-selected commit B','requested.commit != receipt.commit','Literal string inequality; the receipt and native result retain commit A'),
'V03':('Crystal root integrity','stored anchor root != recomputed receipt root','One signed payload root is replaced by 64 zeroes; valid outer re-signing cannot repair the native Crystal relation'),
'V04':('Caller-selected subject identity','requested.subject.id != receipt.subject.id','Literal subject-ID inequality with unchanged valid signed evidence'),
'V05':('Evidence completeness','Required native-result role absent','Count/role inspection independently finds missing native-result manifest member'),
'V06':('Nonempty evidence sufficiency','Zero manifest members cannot establish required roles','Literal empty list; replay payload presence is distinct from committed attachment sufficiency'),
'V07':('Negative digest predicate','artifact SHA256 != selected expected digest','Independent hashlib yields nonzero artifact digest versus all-zero required digest'),
'V08':('Unavailable checker','Process crash != semantic refutation','Explicit execution_setup crash-rvr is part of the vector; identical input bytes to V01 alone are not the complete witness'),
'V09':('Signed execution declaration completeness','package_present && runner_declared && !executed is insufficient','Literal executed=false; this vector does not prove that no host native process ran'),
'V10':('Consumer semantic scope','requested scope path != declared scope path','Literal different.txt vs result.txt mismatch; SHA256 identity remains equal'),
'V11':('Guarantee dependency retention','Downstream guarantee drops required dependency and relation','Independent set membership: source-binding required upstream and caller, absent downstream'),
'V12':('Positive guarantee transfer','Exact obligations and dependency survive transfer','Independent equality of guarantee, dependency and accepted caller obligation premises'),
'V13':('Authorized action/retries','Signed material equals accepted/duplicate action','Independent canonical-field comparison; no server execution provenance is claimed'),
'V14':('Retry material binding','Retry down differs from authorized up','Literal action value inequality; both original and substituted action can have valid signatures'),
'V15':('Current-state continuity','Later entry state B supersedes current claim A','Independent ordered entry inspection; historical observation A remains present'),
'V16':('Known profile admission','Unsupported product profile cannot certify','Literal unsupported.v9 is absent from finite declared profile inventory'),
'V17':('QEV provider authority','Valid packaging/replay does not establish provider authentication','Native synthetic evidence lacks accepted provider authentication; outer signer is not the provider'),
'V18':('Producer vs native semantic result','Producer PASS contradicts replayed REFUTED','Independent SHA256 mismatch plus producer PASS literal; negative result is not replaced by replay success'),
'V19':('Authority class applicability','Historical capture cannot satisfy current recomputation requirement','Literal authority-class inequality; positive signature is a separate fact'),
'V20':('Stochastic provenance boundary','Deterministic stream replay does not authenticate origin','Independently decoded stream [1,2,3] can reproduce a selection; no provenance evidence exists'),
'V21':('Historical continuity','Later divergence does not negate exact earlier observation','Same A/B entry sequence as V15 with separately requested historical mode'),
'V22':('Caller policy version','Caller policy version 2 != committed version 1','Literal policy version inequality; old schema binds complete policy digest too'),
'V23':('Canonicalization profile admission','Unknown canonicalization profile cannot be assumed','Literal unknown-canon is outside finite supported canonicalization vocabulary'),
'V24':('Evidence grade','Producer assertion cannot satisfy local recomputation grade','Literal PRODUCER_ASSERTION vs LOCAL_RECOMPUTATION requirement'),
'V25':('Expected actor authority','Valid signed actor differs from caller-authorized actor','Literal expected zero actor differs from signed actor; signature validity alone is insufficient'),
'V26':('Committed bytes availability','Null artifact bytes cannot be replayed','Literal committed attachment bytes=null; saved original native payload does not fill missing committed bytes'),
'V27':('Trust failure plus checker crash','Missing signer trust is not hidden by unavailable replay','Independent empty trusted_keys plus explicit crash setup; checks projection precedence, not another pure crash witness'),
'V28':('Moth counts packaging vs authority','Requested32/delivered0 is preserved without provider proof','Explicit synthetic native requested/delivered fields and absent provider authentication; no real QPU proof'),
'V29':('Independent domain claim selection','Caller job differs from captured native claim job','Literal jobId substitution; preserved native capture cannot choose the caller claim'),
'V30':('Domain reproduced negative','Replayed refuted counts remain negative','Fresh synthetic refuted-counts constructor, literal negative product expectation; not independent general QEV conformance'),
'G01':('Exact generic SHA256 claim','All separately typed requested and evidence dimensions agree','Independent surface equality and hashlib artifact predicate; native constructions are evidence, not expected product output'),
'G02':('Commit applicability','Requested commit B differs while receipt retains A','Independent string inequality in subject.commit; native artifact predicate remains positive'),
'G03':('Subject applicability','Same artifact belongs to different requested subject','Independent requested/evidence subject.id inequality with identical artifact digest'),
'G04':('Authority applicability','Requested authority ID differs from signed evidence authority','Independent authority.id inequality; same artifact and subject cannot repair it'),
'G05':('Scope applicability','Requested broad scope differs from bound evidence-member scope','Independent JSON structure inequality; native scope link is also negative'),
'G06':('Policy version applicability','Requested policy version3 differs from evidence version2','Independent policy.version inequality, not a policy hash shortcut'),
'G07':('Dependency presence','Declared dependency lacks a caller-accepted satisfied premise','Independent declared dependency membership vs empty policy.dependency_results'),
'G08':('Dependency contradiction','Caller premise explicitly CONTRADICTED','Independent literal dependency status CONTRADICTED, not missing evidence'),
'G09':('Semantic ABI exact declaration','Native neutral declaration links exact claim and scope','Independent exact same declarative input relation; only bounded product embedding is exercised'),
'G10':('Semantic ABI scope expansion','Native declared scope differs from broader consumer scope','Independent JSON scope mismatch through advertised semantic-abi adapter ID; no digest override'),
'G11':('Trustless native/result separation','Native PASS/NO_FINDING cannot establish a different requested claim ID','Independent claim.id substitution, native one-document corpus unchanged'),
'G12':('Trustless negative replay','Scanner recomputation contradicts clean claim although native conformance PASS','Independent substring poison present in document whose signed scan says clean; PASS means runner reproduced expected contradiction'),
'G13':('Signed agent-action supplied trace','Exact signed intent equals accepted action, attempts and observation','Independent material field/ID/result inspection; checks only supplied trace, not remote execution'),
'G14':('Retry material binding','Second retry changes up to down with same signed intent','Independent second attempt value inequality; first matching accepted attempt remains intact'),
'G15':('PRF positive relation and transfer','Actual accepted settlement amount50 equals finalized award price50 and dependencies preserved','Independent arithmetic and exact dependency membership, not copied upstream expected output'),
'G16':('Downstream guarantee dependency','Same native positive result loses exact dependency version downstream','Independent downstream dependency version2 vs accepted version1'),
'G17':('Semantic profile support','Unknown semantic profile version cannot certify','Literal unsupported.semantic.v999 absent from supported finite profile set'),
'G18':('Integrity cannot override semantics','Valid integrity/signature coexist with wrong claim identity','Independent claim.id mismatch; mutant M12 targets projection bypass rather than claim comparison'),
'G19':('Authenticity cannot override authority','Same authority-ID mismatch branch as G04','Independent authority.id mismatch; different label repeats G04 relation with same M01'),
'G20':('Non-Git generic subject','Portable artifact can satisfy bounded SHA256 claim without commit/tree','Independent artifact bytes and surface match after intentionally omitting all Git-specific subject fields'),
'G21':('PRF insufficient native relation','No settlement cannot establish award payment or positive guarantee','Independent empty settlement list; literal native missing_settlement and UNVERIFIABLE are not positive'),
'G22':('Claim version applicability','Claim version3 differs despite unchanged subject version1','Independent top-level version inequality; distinct from policy.version and subject.version'),
'G23':('Dependency positive control','Required exact dependency has accepted SATISFIED premise','Independent exact id/version/status membership; premise is caller accepted, not independently proven upstream truth'),
'G24':('Trustless positive native result','Saved scan artifact matches fresh replay over one clean document','Independent absence of poison substring and leaf SHA256 construction; native verdict PASS/semantic NO_FINDING kept separate'),
'G25':('Artifact applicability','Same commit label cannot establish requested different artifact digest','Independent artifact_digest inequality while commit remains fixed'),
'G26':('Assumption applicability','Declared assumption absent from accepted premise set','Independent required assumption membership vs empty established_assumptions'),
'G27':('Time applicability','Verification instant100 is excluded by half-open [0,100)','Independent integer inequality t < not_after fails exactly at100'),
'G28':('Committed evidence availability','Manifest still commits evidence while attachment list is empty','Independent manifest-to-attachment missing-set calculation; distinct from V06 zero manifest'),
'G29':('Native evidence-grade boundary','Authenticated opaque report is not actual local scanner replay','Independent scanner_version opaque vs supported toy scanner; native grade AUTHENTICATED_REPORT is lower than local scanner execution'),
'G30':('Native negative vs transfer preservation','Native amount100 violates award50 while same negative result/dependencies transfer exactly','Independent arithmetic100 !=50 and exact negative-result equality; PRESERVED transfer is not native positivity'),
'I01':('Exact signed action','Exact same semantic input as G13','Byte-canonical input identity with G13; no additional semantic branch'),
'I02':('Signed target binding','Caller requested targetB differs from signed targetA','Independent targetId inequality; signature remains the same'),
'I03':('Signed action-type binding','Caller requested other-kind differs from signed reaction','Independent kind inequality; signature remains the same'),
'I04':('Exact retry without duplicate execution','Second duplicate retains identical signed intent and declares no new execution','Independent exact action equality, duplicate status and execution_attempted=false; first execution/observation still supplies positive basis'),
'I05':('Retry material binding','Exact same mutated second-retry input as G14','Byte-canonical input identity with G14; different positive control I04 strengthens local presentation, not new negative branch'),
'I06':('Duplicate is not new execution','All delivery duplicate and execution_attempted=false','Independent absence of any execution attempt; a supplied prior observation is not a new execution'),
'I07':('Observation sufficiency','Execution intent/attempt without observation is insufficient','Literal observation=null; exact action signature cannot establish observation/result'),
'I08':('Authority namespace support','Valid signature namespace v1 cannot satisfy unsupported authority namespace','Independent unsupported authority namespace literal; unsupported classification distinct from contradictory actor'),
}
assert len(notes)==68
paths=sorted((ROOT/'vectors').glob('V[0-9][0-9].json'))+sorted((ROOT/'vectors/v0.2').glob('[GI][0-9][0-9].json'))
vectors=[load(p) for p in paths]
catalog_text=(ROOT/'mutations/catalog.mjs').read_text()+(ROOT/'mutations/catalog-v2.mjs').read_text()
measured=collections.defaultdict(list)
for name in ['mutations/catalog.mjs','mutations/catalog-v2.mjs']:
    text=(ROOT/name).read_text()
    for match in re.finditer(r"\{id:'([^']+)'(?:(?!\{id:).)*?witness:'([^']+)'",text,re.S): measured[match[2]].append(match[1])
rows=[]; hashes=collections.defaultdict(list)
for path,v in zip(paths,vectors):
    id=v['id']; claim,relation,oracle=notes[id]
    pair_digest=sha(canon({'request':v['request'],'bundle':v['bundle'],'execution_setup':v.get('execution_setup')}))
    hashes[pair_digest].append(id)
    native=dict(v['expected'].get('native',{}))
    if id.startswith('V'):
        rvr=v['bundle']['payload'].get('rvr',{})
        original=rvr.get('originalBundle',{}).get('receipt',{})
        native={'original_rvr.outcome':original.get('outcome'),'replay':v['expected']['layers']['RECOMPUTATION']}
        domain=v['bundle']['payload'].get('relations',{}).get('domain')
        if isinstance(domain,dict): native['domain_profile']=v['request'].get('domain_profile')
        if id in ['V08','V26','V27']: native['fresh_native_output']='UNAVAILABLE (saved original exists but is not fresh execution)'
    controls=v.get('required_positive_controls') or [v.get('oracle',{}).get('positive_control')]
    assessment='REDUNDANT' if id in ['G09','G10','G19','I01','I05'] else 'LOAD_BEARING'
    row=dict(vector=id,path=path.relative_to(ROOT).as_posix(),fileSHA256=sha(path.read_bytes()),pairDigest=pair_digest,claim=claim,relation=relation,nativeResult=native,expectedLayerResults=v['expected']['layers'],productResult=v['expected']['overall'],reasonCodes=v['expected']['reason_codes'],independentOracle=oracle,expectedDerivedIndependently=True,measuredCatalogMutants=measured[id],declaredVectorMutants=v.get('oracle',{}).get('mutants',[]) or [v.get('mutation_killed','none')],positiveControls=controls,assessment=assessment)
    # A complete native-artifact builder is not an independent native algorithm oracle.
    row['oracleBoundary']='Literal product relational oracle. Shared fixture constructors do not prove native cryptographic/canonicalization/full-upstream algorithm conformance.'
    if id.startswith('V'): row['nativeAssertionBoundary']='Original v1 comparator does not separately assert native result fields; above native source outcome is inspected, while replay/layer/product expectations are literal.'
    if id in ['G13','G14','I01','I04','I05','I06','I07','I08']: row['fixtureConstructionBoundary']='Trace commitment and actionMaterial helpers are implementation shared; independent substitution/equality/observation oracle does not independently prove trace format.'
    rows.append(row)
counts=dict(collections.Counter(r['assessment'] for r in rows))
evidence=dict(schema='receiptos.independent.audit.vector-matrix.v02',candidate='4888a0584369a91075eb2bdbd9a2ff6b99c46588',count=len(rows),assessmentCounts=counts,duplicates=[ids for ids in hashes.values() if len(ids)>1],method='Manual review of literal vector inputs and expectation constructors, independent Python equality/hash/arithmetic/premise reasoning; no verifier/projection calls used to derive expected statuses.',rows=rows)
(OUT/'vector-witness-matrix.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8',newline='\n')
lines=['# v0.2 independent vector witness matrix','',f"Frozen candidate `{evidence['candidate']}`. Reviewed all68 inputs, both generators, fixture constructors, comparators and mutation catalogs without deriving expectations from the verifier. Classifications: **63 LOAD_BEARING,5 REDUNDANT,0 SELF_REFERENTIAL,0 DECORATIVE,0 UNCLEAR**. Count68 is stored controls, not68 distinct semantic branches.",'','`LOAD_BEARING` means a finite input independently witnesses its stated product relation. It does not certify the entire upstream implementation. Positive controls count as required non-vacuity checks. The30 original vectors exercise the v1 compatibility path; they are retained even when v2 covers the same principle.','', 'Exact full expected layer/native fields, vector SHA256, canonical input identity and original/declarative mutant metadata are in `vector-witness-matrix.json`. Matrix reasons are required codes, not an exact closed set: current comparators permit additional reasons. A dash for mutant means no measured catalog mutant selects it; it is not counted as a kill.','', '## Independence limits','', '- `tools/build-vectors.mjs` and `tools/generate-v02-vectors.mjs` construct literal expected statuses/reasons; neither calls verify/project to obtain expected product verdicts. Native constructors execute native code only to create saved evidence. The Trustless helper separately fixes literal positive/negative one-document expectations before running native code. PRF tuple outcomes are literal with independently inspectable amounts.','- RVR/Crystal/QEV fixture builders and verifier share upstream implementations. Their successful round trip alone is not independent verification of native cryptographic/canonicalization correctness. Literal subject/authority/scope/replay/absence substitutions remain independent product-boundary witnesses.','- Interpoll fixture uses product actionMaterial/commitActionTrace helpers. Negative material substitutions independently test equality, but cannot independently establish the commitment wire algorithm.','- Original v1 vector comparator checks layer status/product/required reason codes and not full native payload. v2 adds selected literal native-field constraints; these are not exhaustive native-report equality.','- G09/G01 and G10/G05 use advertised semantic-abi/rvr routing aliases but execute the same RVR/native-binding and Semantic ABI positive/scope branches. G19 repeats G04 authority-ID branch. I01 is byte-identical to G13 and I05 is byte-identical to G14 apart from metadata/positive-control declaration. V08 shares V01 request/bundle bytes but has an explicit crash setup, so is not redundant.','', '| Vector | Claim | Relation | Native result | Product result | Reason | Independent oracle | Mutant killed | Positive control | Assessment |','| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
def esc(s): return str(s).replace('|','\\|').replace('\n',' ')
for r in rows:
    native='; '.join(k+'='+str(v) for k,v in r['nativeResult'].items())
    cells=[r['vector'],r['claim'],r['relation'],native,r['productResult'],', '.join(r['reasonCodes']) or '(none required)',r['independentOracle'],', '.join(r['measuredCatalogMutants']) or 'вЂ”',', '.join(r['positiveControls']),r['assessment']]
    lines.append('| '+' | '.join(map(esc,cells))+' |')
lines+=['','## Coverage conclusions','','All68 stored expectations are independently derived at the product-relation level; no expected:=implementation(actual) construction was found. Five redundant aliases must not be sold as distinct negative branches. The selected catalogs name28 source mutants across14v1 and14v2 classes; claims that other vector metadata names are measured kills are unsupported. Root audit owns actual mutant execution and fresh observed-vector reproduction. This matrix records expected relations and source inspection, not a second execution count.','']
(OUT/'V0_2_VECTOR_WITNESS_MATRIX.md').write_text('\n'.join(lines),encoding='utf-8',newline='\n')
print(json.dumps(dict(count=len(rows),assessments=counts,duplicates=evidence['duplicates'],mutantWitnesses=dict(measured))))
