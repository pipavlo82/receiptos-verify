import hashlib,json,pathlib,re,subprocess,sys
repo=pathlib.Path(sys.argv[1]).resolve()
out=pathlib.Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=True)
files=['tests/requirement-admission-release.test.mjs','tests/guarantee-boundary-v2.test.mjs','tests/admission-v2.test.mjs']
receipts=[]
for label,flags in [('normal',[]),('no-opt',['--no-opt'])]:
    argv=['node',*flags,'--test',*files]
    run=subprocess.run(argv,cwd=repo,capture_output=True)
    for name,data in [('stdout',run.stdout),('stderr',run.stderr)]:
        (out/f'{label}.{name}').write_bytes(data)
    counts={name:int(value) for name,value in re.findall(rb'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)\r?$',run.stdout,re.M)}
    counts={name.decode():value for name,value in counts.items()}
    receipts.append({'label':label,'argv':argv,'exitCode':run.returncode,'counts':counts,'stdoutSha256':hashlib.sha256(run.stdout).hexdigest(),'stderrSha256':hashlib.sha256(run.stderr).hexdigest()})
(out/'focused.json').write_text(json.dumps(receipts,indent=2)+'\n',encoding='utf8',newline='\n')
print(json.dumps(receipts,indent=2))
if any(r['exitCode'] or r['counts'].get('fail') for r in receipts):raise SystemExit(1)
