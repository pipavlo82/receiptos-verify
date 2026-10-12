import pathlib,subprocess,json,hashlib,importlib.util,os
ws=pathlib.Path(__file__).resolve().parent.parent
repo=ws/'outputs/receiptos-verify';frozen='4888a0584369a91075eb2bdbd9a2ff6b99c46588'
def git(*args,input=None,env=None):return subprocess.check_output(['git',*args],cwd=repo,input=input,env=env)
assert not git('status','--porcelain=v1','--untracked-files=all')
oldhead=git('rev-parse','HEAD').decode().strip();branch=git('branch','--show-current').decode().strip();assert branch=='feat/v0.2-generic-trustless-boundary'
bundle=ws/'work/v02-raw-audit-unpublished.bundle';
if not bundle.exists():git('bundle','create',str(bundle),branch,'^'+frozen)
else:git('bundle','verify',str(bundle))
spec=importlib.util.spec_from_file_location('san',ws/'work/audit02-sanitize-captures.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
paths=[r['path'] for r in json.loads((ws/'work/audit02-audit-capture-license-before.json').read_text())['files']]
index=ws/'work/v02-curation.index';env={**os.environ,'GIT_INDEX_FILE':str(index)}
mapping=[];parent=frozen;changes=[]
for old in git('rev-list','--reverse',frozen+'..'+oldhead).decode().splitlines():
 git('read-tree',old,env=env);current=[]
 for path in paths:
  raw=git('show',old+':'+path);records=[];data=mod.walk(json.loads(raw),records=records);clean=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
  oid=git('hash-object','-w','--stdin',input=clean).decode().strip();git('update-index','--add','--cacheinfo','100644,'+oid+','+path,env=env)
  current.append({'path':path,'beforeSHA256':hashlib.sha256(raw).hexdigest(),'afterSHA256':hashlib.sha256(clean).hexdigest(),'afterBytes':len(clean),'omittedFields':len(records)})
 manifestpath='reports/release-audit-v0.2/corpus/evidence-manifest.json'
 if git('ls-tree',old,'--',manifestpath).strip():
  rawm=git('show',old+':'+manifestpath);manifest=json.loads(rawm)
  for row in manifest['files']:
   matches=[c for c in current if c['path'].endswith('/'+row['path'])]
   if matches:
    c=matches[0];row['bytes']=c['afterBytes'];row['sha256']=c['afterSHA256'];row['originalRawSHA256']=c['beforeSHA256']
  manifest['captureSanitization']={'originalRawManifestSHA256':hashlib.sha256(rawm).hexdigest(),'omissions':'Unnecessary API patch/body/content; exact originals quarantined locally; metadata-only mapping retained.','files':current}
  cleanm=(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n').encode();oid=git('hash-object','-w','--stdin',input=cleanm).decode().strip();git('update-index','--add','--cacheinfo','100644,'+oid+','+manifestpath,env=env)
 tree=git('write-tree',env=env).decode().strip();message=git('show','-s','--format=%B',old)
 new=git('commit-tree',tree,'-p',parent,input=message).decode().strip()
 beforecode=[r for r in git('ls-tree','-r',old).splitlines() if not r.split(b'\t',1)[1].startswith(b'reports/')];aftercode=[r for r in git('ls-tree','-r',new).splitlines() if not r.split(b'\t',1)[1].startswith(b'reports/')];assert beforecode==aftercode
 mapping.append({'original_local_commit':old,'sanitized_commit':new,'tree':tree,'non_report_blobs_identical':True,'file_mappings':current});parent=new
record={'schema':'receiptos.audit.local-history-curation.v1','frozen_anchor':frozen,'old_head':oldhead,'new_head':parent,'branch':branch,'raw_bundle':str(bundle),'raw_bundle_sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'mapping':mapping,'boundary':'Only agent-created local audit commits after frozen anchor curated; frozen/main/tags and all non-report blobs preserved. Raw originals remain unpublished work evidence. Execution receipts retain original identities.'}
(workout:=ws/'work/v02-audit-curation.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8',newline='\n')
git('update-ref','refs/heads/'+branch,parent,oldhead);git('reset','--hard',parent)
index.unlink();print(json.dumps({'old_head':oldhead,'new_head':parent,'commits_curated':len(mapping),'frozen_anchor':frozen,'raw_bundle_sha256':record['raw_bundle_sha256']}))
