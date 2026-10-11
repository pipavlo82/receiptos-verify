"""Audit-only deterministic identity checks; no candidate source edits."""
import pathlib, subprocess, json, hashlib, os
root = pathlib.Path(__file__).resolve().parents[2]
out = root / 'reports/release-audit-v0.1/determinism-after'; out.mkdir(exist_ok=True)
inputs = root / 'reports/release-audit-v0.1/root'
request = inputs / 'independent-request.json'; bundle = inputs / 'independent-bundle.json'
rows = []; reports = []; native = []; capsules = []
digest = lambda b: hashlib.sha256(b).hexdigest()
def run(label, cwd, argv, env=None, stdin=None):
    e = dict(os.environ); e.pop('NODE_PATH', None); e.update(env or {})
    r = subprocess.run(argv, cwd=cwd, env=e, input=stdin, capture_output=True)
    (out/(label+'.stdout')).write_bytes(r.stdout); (out/(label+'.stderr')).write_bytes(r.stderr)
    rows.append({'label':label,'cwd':str(cwd),'argv':argv,'env_overrides':env,'exit':r.returncode,'stdout_sha256':digest(r.stdout),'stderr_sha256':digest(r.stderr)})
    assert r.returncode == 0, label
    return r.stdout
for name in ['repaired-a','repaired-b']:
    cwd = root / 'reports/tmp/release-rc-audit' / name
    for suffix,env in [('normal',{}),('repeat',{}),('alternate-env',{'TZ':'Pacific/Honolulu','LANG':'tr_TR.UTF-8','LC_ALL':'C','PYTHONHASHSEED':'123','PYTHONOPTIMIZE':'1'})]:
        label = name+'-'+suffix
        reports.append(json.loads(run(label,cwd,['node','src/cli.mjs','verify',str(request),str(bundle)],env)))
    b=json.loads(bundle.read_text(encoding='utf8'))
    payload=json.dumps({'operation':'recompute','input':b['payload']['rvr']}).encode()
    for suffix,flags in [('normal',[]),('optimized',['-O'])]:
        native.append(run(name+'-native-'+suffix,cwd,['python','-I','-B',*flags,'-X','utf8',str(cwd/'src/adapters/native/rvr-bridge.py')],stdin=payload))
    carrier=out/(name+'.capsule.json')
    run(name+'-pack',cwd,['node','src/cli.mjs','pack',str(request),str(bundle),str(carrier)])
    capsules.append(carrier.read_bytes())
def differences(a,b,path=''):
    if type(a)!=type(b): return [path]
    if isinstance(a,dict):
        return sum([differences(a.get(k),b.get(k),path+'/'+k) for k in sorted(set(a)|set(b))],[])
    if isinstance(a,list):
        if len(a)!=len(b): return [path]
        return sum([differences(x,y,path+'/'+str(i)) for i,(x,y) in enumerate(zip(a,b))],[])
    return [] if a==b else [path]
diff=differences(reports[0],reports[3])
def semantic(r):
    r=json.loads(json.dumps(r))
    for layer in r['layers'].values():
        if 'execution' in layer: layer['execution'].pop('argv',None)
    return r
checks={'same_path_normal_repeat':reports[0]==reports[1] and reports[3]==reports[4],
        'same_path_alternate_environment':reports[0]==reports[2] and reports[3]==reports[5],
        'cross_path_exact_reports':reports[0]==reports[3],
        'cross_path_difference_pointers':diff,
        'cross_path_reports_without_execution_argv':semantic(reports[0])==semantic(reports[3]),
        'native_bytes_two_paths_normal_optimized':len(set(native))==1,
        'capsule_bytes_two_paths':capsules[0]==capsules[1],
        'capsule_sha256':digest(capsules[0]),
        'note':'Python -I ignores PYTHON* env; optimized bridge was separately invoked with explicit -O. Whole report execution.argv deliberately retains absolute diagnostic locations; it is not canonical evidence identity.'}
(out/'results.json').write_text(json.dumps({'commands':rows,'checks':checks},indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(checks))
