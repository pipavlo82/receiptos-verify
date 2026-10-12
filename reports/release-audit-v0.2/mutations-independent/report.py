from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parent
d=json.loads((R/'independent-mutation-results.json').read_text())
b=json.loads((R/'baseline-inputs-and-reports.json').read_text())
c=json.loads((R/'negative-control-results.json').read_text())
def normal(x):
    if isinstance(x,dict):return {k:normal(v) for k,v in x.items() if k!='argv'}
    if isinstance(x,list):return [normal(v) for v in x]
    return x
def changes(a,b,path=''):
    if type(a)!=type(b):return [{'path':path,'before':a,'after':b}]
    if isinstance(a,dict):
        result=[]
        for key in sorted(a.keys()|b.keys()):
            result+=changes(a.get(key),b.get(key),path+'.'+key)
        return result
    if isinstance(a,list):
        if len(a)!=len(b):return [{'path':path,'before_length':len(a),'after_length':len(b)}]
        return [entry for i,(x,y) in enumerate(zip(a,b)) for entry in changes(x,y,path+f'[{i}]')]
    return [] if a==b else [{'path':path,'before':a,'after':b}]

positive_differences=[]
for row in d['rows']:
    before=b[row['family']+'-'+row['positive']]['run']['report']
    after=row['positive_run']['report']
    delta=changes(normal(before),normal(after))
    row['positive_full_normalized_byte_structure_equal']=not delta
    row['positive_semantic_summary_equal']=row['baseline_positive']==row['mutant_positive']
    row['positive_diagnostic_differences']=delta
    if delta:positive_differences.append({'family':row['family'],'id':row['id'],'changes':delta})
    if row['controlled_fault_held_fixed']:
        p1=R/'copies-run02/baseline-v1-V08/src/adapters/native/rvr-bridge.py'
        p2=R/'copies-run02/v1-count-crash-as-semantic-refutation/src/adapters/native/rvr-bridge.py'
        row['controlled_fault_identity']={'baseline_sha256':hashlib.sha256(p1.read_bytes()).hexdigest(),'mutant_sha256':hashlib.sha256(p2.read_bytes()).hexdigest(),'equal':p1.read_bytes()==p2.read_bytes()}

(R/'independent-mutation-results.json').write_text(json.dumps(d,indent=2)+'\n',encoding='utf8',newline='\n')
(R/'positive-diagnostic-differences.json').write_text(json.dumps(positive_differences,indent=2)+'\n',encoding='utf8',newline='\n')

notes={
'ignore-requested-subject':'Removes caller/evidence subject comparison.',
'compare-receipt-to-itself':'Self-comparison ignores independently selected subject.',
'accept-any-valid-signature':'Removes authorized action material comparison.',
'promote-reproduced-to-verified':'Suppresses negative semantic outcome guard and requires no positive native outcome.',
'accept-empty-evidence':'Returns sufficient for an empty manifest despite required role evidence.',
'count-crash-as-semantic-refutation':'Changes CANNOT_RECOMPUTE projection into false CONTRADICTED, with identical deliberate native crash on both sides.',
'package-presence-as-pass':'Drops executed=true requirement; narrower witness is execution-declaration completeness, not a no-run experiment.',
'ignore-policy-version':'Deletes policy ID, version and digest comparison together; not isolated version-only mutant.',
'ignore-guarantee-dependency':'Deletes upstream and downstream dependency checks.',
'ignore-retry-action-change':'Bypasses exact action equality for retries.',
'ignore-evidence-grade':'Removes required LOCAL_RECOMPUTATION grade guard.',
'ignore-authority':'Deletes semantic authority checks; witness weakens CONTRADICTED to INSUFFICIENT rather than certifying success.',
'ignore-commit':'Deletes commit member from subject comparison list.',
'ignore-canonicalization-profile':'Bypasses supported canonicalization admission guard.',
'M01':'Deletes caller/evidence authority comparison.',
'M02':'Deletes scope comparison and erases scope in the native Semantic ABI embedding; both barriers must be bypassed.',
'M03':'Deletes complete policy comparison, including version.',
'M04':'Deletes missing dependency premise check; G23 retains satisfied dependency positive.',
'M05':'Deletes contradicted dependency premise check; G23 retains satisfied dependency positive.',
'M06':'Compares evidence subject to itself.',
'M07':'Returns VERIFIED from positive native outcome before compatibility obligations.',
'M08':'Suppresses REFUTED guard and admits REFUTED as acceptable final semantic outcome.',
'M09':'Bypasses material equality between retry attempt and signed intent.',
'M10':'Bypasses native PRF UNVERIFIABLE gate.',
'M11':'Deletes claim and subject version comparison together.',
'M12':'Returns VERIFIED from integrity and authenticity before semantic obligations.',
'M13':'Deletes native scanner evidence-grade requirement.',
'M14':'Ignores nested PRF native product projection while transfer stays PRESERVED.',
}
lines=['# Independent mutation audit — ReceiptOS Verify v0.2', '',
'Frozen candidate: `4888a0584369a91075eb2bdbd9a2ff6b99c46588`.', '',
'This observer independently extracted source and fixture bytes with `git archive`, applied each exact catalogue substitution in a disposable copy, and invoked only the verifier from an original five-line runner. It did not import candidate corpus helpers, mutation classifiers, report validators or cached result receipts. The catalogue is the object being audited, not a trusted success oracle. The literal fixture oracle is additionally checked by source/semantic inspection; this audit alone does not prove that every literal expectation is independently correct.', '',
'Dependencies are the seven locked packages already installed in the separately reproduced frozen fresh checkout. This mutation observer makes no second fresh-install claim. It retains full freshly executed baseline, positive and witness outputs, exact replacement text/occurrences, original/mutated SHA-256, runtime, raw stdout/stderr hashes and process codes.', '',
'## Actual catalogue results', '',
'All **14 v1 + 14 v2** substitutions applied once in each declared source location. All 28 retained the positive control’s product, layer-status, semantic-outcome and reason summary. Every witness distinguished a wrong product verdict. No unexpected host crash, malformed result or failed inner checker supplied a catalogue kill.', '',
'26 positive reports were fully identical after excluding only diagnostic `execution.argv`. Two retained the same positive semantics while the intentionally removed check changed diagnostic native inputs/output: v1 `ignore-guarantee-dependency` and v2 `M02`. Exact differences are recorded in `positive-diagnostic-differences.json`; they are not hidden behind an assertion of byte equality.', '',
'| Family | Mutant | Positive | Witness | Baseline → mutant product | Applied / semantic kill | Intended semantic location |',
'| --- | --- | --- | --- | --- | --- | --- |']
for row in d['rows']:
    lines.append(f"| {row['family']} | {row['id']} | {row['positive']} | {row['witness']} | {row['baseline_witness']['overall']} → {row['mutant_witness']['overall']} | yes / {row['classification']} | {notes[row['id']]} |")
lines += ['',
'The v1 `count-crash-as-semantic-refutation` control is valid: baseline V08 and the mutant witness receive the same deliberate exit-7 bridge bytes (`c4df76eac2a98d58f7d14c77386370d6fa8d12750261962aaf5edf9f94060e06`). The baseline reports inability; the mutant falsely asserts a semantic contradiction. The crash is held fixed rather than counted as the kill. Its positive V01 runs before the fault and remains valid.', '',
'## Negative controls against both candidate harnesses', '',
'These are newly executed controls in disposable copies. Function-driver exit 0 for v2 does not mean coverage passes: its returned `passed=false` and `KILLED=0` are inspected. The public v2 command separately maps `passed` to its process exit code.', '',
'| Family | Control | Actual candidate classification | KILLED | Successful coverage claimed? |',
'| --- | --- | --- | --- | --- |']
for row in c['rows']:
    result=row['candidate_harness_result'] or {}
    counts=result.get('counts',{})
    classification=', '.join(k for k,v in counts.items() if v) or result.get('caught') or ('ZERO_MUTANTS exception, no report' if row['control']=='zero' else 'no report')
    lines.append(f"| {row['family']} | {row['control']} | {classification} | {counts.get('KILLED',0)} | {'YES — defect' if row['successful_semantic_coverage_claimed'] else 'no'} |")
lines += ['',
'## Finding MUTA-01 — HIGH', '',
'The frozen **v1 mutation harness falsely counts a failed inner checker as a semantic kill**. A conditional native bridge exit 7, preserving V01 but crashing the V07 negative checker, produces a structurally valid host report with CANNOT_RECOMPUTE. The outer process exits 0. The v1 harness compares only the changed product projection and reports `KILLED=1` / command exit 0. A conditional native `null` response with exit 0 is also counted as KILLED. Neither establishes the tested semantic defect. Root’s earlier independent captures under `work/audit02-mutations/native-crash-before.json` and `native-null-before.json` are preserved; this observer independently reproduced both.', '',
'The v2 harness correctly detects both cases (`CRASHED` and `INVALID_OUTPUT`, KILLED=0). Required repair: inspect nested native execution/output failure in v1; preserve the legitimate fixed-fault V08 semantic witness by comparing the controlled baseline and mutant under the same fault. Add actual v1 negative controls, rerun both catalogues and the complete canonical suite. This is an audit/test-infrastructure defect, not a demonstrated false VERIFIED production path. Independent reproduction supports the current 14 catalogue kills but does not make the broad frozen “crash is never a kill” claim accurate.', '',
'## Boundaries of this evidence', '',
'All mutations are selected, single-source-string (or explicitly multi-barrier) defect simulations. They are not random mutation coverage, a proof of all code paths, or a count of independent security properties. V1/V2 overlap, deliberate corpus aliases, reason-subset oracles and incomplete expected-native fields must be disclosed in the vector audit. `ignore-policy-version`, M03 and M11 remove more than a single version subfield. M02 intentionally bypasses two scope barriers. The independent observer requires full positive semantic equality; it records remaining diagnostic differences rather than inventing independent byte identity.', '',
'Evidence files: `independent-mutation-results.json`, `baseline-inputs-and-reports.json`, `catalogs.json`, `negative-control-results.json`, `positive-diagnostic-differences.json`, `raw/`, `observer.mjs`, `audit.py`, `negative-controls.py`. No product, upstream or Git refs were modified by this sub-audit.', '']
(R/'MUTATION_AUDIT_INDEPENDENT.md').write_text('\n'.join(lines),encoding='utf8',newline='\n')
print(json.dumps(positive_differences,indent=2))
