"""Inventory or sanitize only new audit JSON captures; never touch verifier code.

Default is dry-run. --apply requires an explicit checkout directory and changes
only reports/release-audit-v0.2 files. Frozen pre-audit artifacts are outside scope.
The original raw evidence must be preserved separately before applying.
"""
import argparse,base64,collections,hashlib,json,pathlib,re

BASE=pathlib.Path(__file__).resolve().parent.parent
def h(b):return hashlib.sha256(b).hexdigest()
def desc(value,encoding=None):
    raw=value.encode('utf-8') if isinstance(value,str) else json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    d={'valueType':type(value).__name__,'utf8Bytes':len(raw),'sha256':h(raw),'reason':'Unnecessary source/body capture omitted; metadata and original raw local evidence retained separately.'}
    if encoding=='base64' and isinstance(value,str):
        try:
            decoded=base64.b64decode(value,validate=False);d.update(decodedBytes=len(decoded),decodedSHA256=h(decoded))
        except Exception:d['decoding']='INVALID_BASE64'
    return d
def endpoint_repo(path,endpoint):
    for v in [endpoint,*path]:
        m=re.match(r'^repos/([^/]+/[^/]+)(?:/|$)',str(v))
        if m:return m[1]
    return None
def walk(value,path=(),api=False,endpoint=None,records=None):
    records=[] if records is None else records
    if isinstance(value,list):
        return [walk(v,(*path,str(i)),api,endpoint,records) for i,v in enumerate(value)]
    if not isinstance(value,dict):return value
    ownendpoint=value.get('endpoint');api=api or isinstance(ownendpoint,str) and ownendpoint.startswith('repos/')
    endpoint=ownendpoint if isinstance(ownendpoint,str) and ownendpoint.startswith('repos/') else endpoint
    result={}
    for key,val in value.items():
        child_api=api or key.startswith('repos/')
        child_endpoint=key if key.startswith('repos/') else endpoint
        # Numeric counters named "patch" are metadata, not source captures.
        omit=key=='patch' and isinstance(val,str) or key in ['content','body'] and api
        if omit:
            metadata=desc(val,value.get('encoding') if key=='content' else None)
            record={'jsonPath':'/'.join((*path,key)),'key':key,'repository':endpoint_repo(path,endpoint),'endpoint':endpoint,**metadata}
            records.append(record)
            replacement='_omitted_'+key
            if replacement in value:raise ValueError('Sanitizer replacement collision:'+replacement)
            result[replacement]=metadata
        else:result[key]=walk(val,(*path,key),child_api,child_endpoint,records)
    return result
def inventory(repo,apply=False):
    audit=repo/'reports/release-audit-v0.2';files=[];allrecords=[];bodycontent=[]
    for path in sorted(audit.rglob('*')):
        if not path.is_file() or path.suffix.lower() not in ['.json','.stdout','.txt']:continue
        raw=path.read_bytes()
        try:data=json.loads(raw)
        except (ValueError,UnicodeError):continue
        records=[];sanitized=walk(data,records=records)
        # Independently inspect preserved semantic body/content fields; these are
        # required request/signed-manifest/corpus witnesses, not API source captures.
        def inspect(v,p=()):
            if isinstance(v,dict):
                for k,x in v.items():
                    if k in ['body','content']:
                        bodycontent.append({'file':path.relative_to(repo).as_posix(),'jsonPath':'/'.join((*p,k)),**desc(x),'disposition':'PRESERVE_SEMANTIC_ORACLE_INPUT; not an API-context capture'})
                    inspect(x,(*p,k))
            elif isinstance(v,list):
                for i,x in enumerate(v):inspect(x,(*p,str(i)))
        inspect(sanitized)
        if not records:continue
        after=(json.dumps(sanitized,indent=2,ensure_ascii=False)+'\n').encode('utf-8')
        rel=path.relative_to(repo).as_posix()
        for r in records:r['file']=rel
        allrecords+=records
        files.append({'path':rel,'beforeBytes':len(raw),'beforeSHA256':h(raw),'afterBytes':len(after),'afterSHA256':h(after),'omittedFields':len(records)})
        if apply:path.write_bytes(after)
    return {'schema':'receiptos.audit.capture-sanitization.v1','mode':'APPLIED' if apply else 'DRY_RUN','files':files,'omittedFieldCounts':dict(collections.Counter(r['key'] for r in allrecords)),'omittedFields':allrecords,'retainedSemanticBodyContent':bodycontent,'boundary':'Source/vendor/old vectors/legal/dependency files are untouched. This cleans current tree only; old local audit history must be quarantined or sanitized separately before any publication.'}
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--repo',type=pathlib.Path,default=BASE/'outputs/receiptos-verify');ap.add_argument('--out',type=pathlib.Path,default=BASE/'work/audit02-audit-capture-license-before.json');ap.add_argument('--apply',action='store_true');args=ap.parse_args()
    repo=args.repo.resolve(); assert repo.name.startswith('receiptos-verify') or 'audit' in repo.name or repo.name.startswith('ra'), 'Unexpected checkout root; pass an explicit intended audit checkout.'
    output=inventory(repo,args.apply);args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'mode':output['mode'],'files':len(output['files']),'omittedFieldCounts':output['omittedFieldCounts'],'semanticBodyContentRetained':len(output['retainedSemanticBodyContent']),'report':str(args.out)}))
