import pathlib,subprocess,json,hashlib,datetime
ws=pathlib.Path(__file__).resolve().parent.parent;repo=ws/'outputs/receiptos-verify';audit=repo/'reports/release-audit-v0.2';frozen='4888a0584369a91075eb2bdbd9a2ff6b99c46588';tested='eb942148eeb489db809b39e053ec905105cc3056'
def h(b):return hashlib.sha256(b).hexdigest()
def git(*args,input=None):return subprocess.check_output(['git',*args],cwd=repo,input=input)
assert git('rev-parse','HEAD').decode().strip()==tested
checks={}
for name,folder,commit in [('frozen',audit/'freeze',frozen),('repaired',audit/'repair/final',tested)]:
 rows=json.loads((folder/('fresh-tracked-files.json' if name=='frozen' else 'tracked-files.json')).read_bytes());ids=[x['git_blob'] for x in rows]
 raw=git('cat-file','--batch',input=('\n'.join(ids)+'\n').encode());offset=0
 for row in rows:
  end=raw.index(b'\n',offset);oid,kind,length=raw[offset:end].split();length=int(length);data=raw[end+1:end+1+length];offset=end+2+length
  assert kind==b'blob' and oid.decode()==row['git_blob'] and len(data)==row['bytes'] and h(data)==row['sha256'],row['path']
 assert offset==len(raw);checks[name+'_inventory_blobs']=len(rows)
for name,folder in [('frozen',audit/'gate'),('final',audit/'repair/final'),('intermediate_failed',audit/'repair/fresh')]:
 s=json.loads((folder/'summary.json').read_bytes());count=0
 for command in s['commands']:
  for suffix,key in [('stdout','stdout_sha256'),('stderr','stderr_sha256')]:
   p=folder/(command['label']+'.'+suffix);assert p.exists(),str(p);assert h(p.read_bytes())==command[key],str(p);count+=1
 checks[name+'_command_stream_hashes']=count
 for receiptpath in folder.glob('*-tests.json'):
  r=json.loads(receiptpath.read_bytes());stem=receiptpath.name[:-5]
  for ext,key in [('.stdout.txt','stdout_sha256'),('.stderr.txt','stderr_sha256')]:assert h((folder/(stem+ext)).read_bytes())==r[key]
final=json.loads((audit/'repair/final/summary.json').read_bytes());assert final['status']=='PASS';assert all(x['pass']==707 and x['fail']==0 for x in final['tests'].values());assert final['vectors']['passed']==68
allowed={'README.md','docs/files-not-reused.md','source-lock.json','RELEASE_AUDIT_v0.2.md'}
rows=json.loads((audit/'repair/final/tracked-files.json').read_bytes());runtime=[]
for row in rows:
 if row['path'].startswith('reports/') or row['path'] in allowed:continue
 assert h((repo/row['path']).read_bytes())==row['sha256'],row['path'];runtime.append(row['path'])
checks['tested_nonreport_files_unchanged']=len(runtime)
# Independently retain exact protected category counts.
entries=[x.split(b'\t',1)[1].decode() for x in git('ls-tree','-r',frozen).splitlines()]
protected={}
for name,select in [('vectors',lambda x:x.startswith('vectors/')),('vendor',lambda x:x.startswith('vendor/')),('legal',lambda x:x in ['LICENSE','NOTICE','LICENSING.md','THIRD_PARTY_NOTICES.md']),('dependency',lambda x:x in ['package.json','package-lock.json','provenance/npm-licenses.json','third_party/npm-licenses.json'])]:
 selected=[x for x in entries if select(x)];bad=[x for x in selected if git('rev-parse',frozen+':'+x)!=git('rev-parse',tested+':'+x)];assert not bad;protected[name]={'files':len(selected),'changed':bad}
checks['protected']=protected
commands=[]
def run(label,argv):
 p=subprocess.run(argv,cwd=repo,capture_output=True);(audit/(label+'.stdout')).write_bytes(p.stdout);(audit/(label+'.stderr')).write_bytes(p.stderr);commands.append({'label':label,'argv':argv,'exit_code':p.returncode,'stdout_sha256':h(p.stdout),'stderr_sha256':h(p.stderr)});assert p.returncode==0,(argv,p.stderr.decode(errors='replace'));return p.stdout
run('closure-lock-write',['node','tools/check-sources.mjs','--write']);lockcheck=json.loads(run('closure-lock-check',['node','tools/check-sources.mjs']));run('closure-provenance-license',['node','tools/check-provenance-v2.mjs']);run('closure-diff-check',['git','diff','--check']);refs=run('closure-public-refs',['git','ls-remote','origin','refs/heads/main','refs/tags/v0.1.0','refs/tags/v0.1.0^{}']).decode();assert '62cd3e59c8f568496ed087d55f0aec3d63363b0a' in refs
out={'schema':'receiptos.verify.release-audit-closure.v2','tested_commit':tested,'tested_tree':final['tree'],'closure_boundary':'Only audit reports/evidence, README, corrected file-exclusion documentation and source-lock differ from tested tree; runtime/schema/tests/vendor/vector/dependency bytes match tested commit. Final child commit SHA is reported separately to avoid self-reference.','checks':checks,'final_source_lock':lockcheck,'package_lock_sha256':h((repo/'package-lock.json').read_bytes()),'commands':commands,'verdict':'READY_TO_PUBLISH_V0_2','timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(audit/'closure.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps({'checks':checks,'source_lock':lockcheck,'verdict':out['verdict']}))
