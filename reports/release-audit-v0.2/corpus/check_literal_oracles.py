import base64, hashlib, json, pathlib
BASE=pathlib.Path(__file__).resolve().parents[2]; ROOT=BASE/'outputs/receiptos-verify'; OUT=pathlib.Path(__file__).resolve().parent
def sha(b): return hashlib.sha256(b).hexdigest()
def canon(v): return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
checks=[]
def add(vector,relation,actual,expected): checks.append(dict(vector=vector,relation=relation,actual=actual,expected=expected,matches=actual==expected))
for p in sorted((ROOT/'vectors').glob('V[0-9][0-9].json'))+sorted((ROOT/'vectors/v0.2').glob('[GI][0-9][0-9].json')):
    v=json.loads(p.read_text()); id=v['id']; payload=v['bundle']['payload']; adapter=v['bundle']['statement'].get('adapter')
    rvr=payload.get('rvr') if id.startswith('V') else payload.get('adapter') if adapter in ['rvr','semantic-abi'] else None
    if rvr:
        b=rvr['originalBundle']; artifact=base64.b64decode(b['payloadsBase64']['artifact']); expected=b['claim']['expectedDigest']; independent='VERIFIED' if sha(artifact)==expected else 'REFUTED'
        add(id,'Python hashlib artifact predicate vs saved native result',independent,b['receipt']['outcome'])
        add(id,'Independent SHA256 artifact identity',sha(artifact),b['evidenceSet']['members'][0]['digest'])
    if adapter=='trustless':
        inp=payload['adapter']['input']; doc=inp['corpus'][0]; root='sha256:'+sha(b'\0'+doc['id'].encode()+b'\0'+doc['content'].encode())
        add(id,'Independent one-leaf committed corpus identity',root,inp['manifest']['body']['rag_corpus']['merkle_root'])
        add(id,'Independent source-scan finding','CONTRADICTED' if inp['toy_scan']['pattern'] in doc['content'] else 'NO_FINDING',v['expected']['native']['RECOMPUTATION.nativeResult.semanticVerdict'])
    if adapter=='interpoll':
        inp=payload['adapter']; a=inp['signed_intent']
        # Native public wire specification is an ordered array, not the product canonical object.
        wire=['interpoll.public-engagement.v1',1,a['namespace'],a['kind'],a['actor'],a['targetType'],a['targetId'],a['value'],a['createdAt'],a['nonce']]
        add(id,'Independent Python signed-intent ID',sha(json.dumps(wire,ensure_ascii=False,separators=(',',':')).encode()),a['id'])
        exact=all(t['action']==a for t in inp['attempts'])
        add(id,'Independent retry action equality',exact,id not in ['G14','I05'])
    guarantees=payload.get('guarantees')
    if guarantees:
        g=guarantees['upstream']; a=g['award']; settlements=g['settlements']; expected='UNVERIFIABLE' if not settlements else 'PRESERVED' if settlements[0]['amount']==a['price'] else 'VIOLATED'
        add(id,'Independent PRF award/settlement finite arithmetic',expected,g['native_result']['outcome'])
result=dict(schema='receiptos.independent.literal-oracle-checks.v02',candidate='4888a0584369a91075eb2bdbd9a2ff6b99c46588',count=len(checks),passed=sum(c['matches'] for c in checks),checks=checks,boundary='Separate Python hash/arithmetic/field equality witnesses, not full native verifier or cryptographic signature conformance.')
(OUT/'literal-oracle-checks.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(dict(count=result['count'],passed=result['passed'],failures=[c for c in checks if not c['matches']])))
