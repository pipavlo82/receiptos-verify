"""Literal expected bytes, specified independently of all four native implementations.

None denotes rejection. This is a test oracle, not a replacement canonicalizer.
"""
import json
from pathlib import Path

cases=[]
def add(case_id,raw,js,kit=None,host=None,content=None,compatible=False,kit_reject=False):
    if kit is None and not kit_reject: kit=js
    cases.append({'case_id':case_id,'raw':raw,'compatible':compatible,'expected':{
        'crystal':js,'lens':js,'kit':kit,'host_root':host,
        'host_content':content if content is not None else host}})

add('key-order','{"z":2,"a":1}','{"a":1,"z":2}',host='{"a":1,"z":2}',compatible=True)
add('nested-order','{"b":{"y":2,"a":1},"a":[true,null,3]}','{"a":[true,null,3],"b":{"a":1,"y":2}}',host='{"a":[true,null,3],"b":{"a":1,"y":2}}',compatible=True)
add('anchor-exclusion','{"z":2,"anchor":{"receipt_root":"x"}}','{"z":2}',host='{"z":2}',content='{"anchor":{"receipt_root":"x"},"z":2}',compatible=True)
add('anchor-change','{"z":2,"anchor":{"receipt_root":"y"}}','{"z":2}',host='{"z":2}',content='{"anchor":{"receipt_root":"y"},"z":2}',compatible=True)
add('top-receipt-root','{"x":1,"receipt_root":"saved"}','{"receipt_root":"saved","x":1}',kit='{"x":1}',host='{"receipt_root":"saved","x":1}')
add('nested-exclusions-retained','{"nested":{"anchor":1,"receipt_root":2}}','{"nested":{"anchor":1,"receipt_root":2}}',host='{"nested":{"anchor":1,"receipt_root":2}}',compatible=True)
add('unicode-value','{"text":"π🙂"}','{"text":"π🙂"}',host='{"text":"π🙂"}',compatible=True)
add('unicode-key-order','{"\ue000":1,"\U00010000":2}','{"\U00010000":2,"\ue000":1}',kit='{"\ue000":1,"\U00010000":2}')
add('ascii-numeric-keys','{"2":2,"10":10,"1":1}','{"1":1,"10":10,"2":2}',host='{"1":1,"10":10,"2":2}',compatible=True)
add('escapes','{"s":"a\\n\\t\\\"\\\\b"}','{"s":"a\\n\\t\\\"\\\\b"}',host='{"s":"a\\n\\t\\\"\\\\b"}',compatible=True)
add('solidus','{"s":"a\\/b"}','{"s":"a/b"}',host='{"s":"a/b"}',compatible=True)
add('line-separators','{"s":"\u2028\u2029"}','{"s":"\u2028\u2029"}',host='{"s":"\u2028\u2029"}',compatible=True)
add('unicode-composed','{"s":"é"}','{"s":"é"}',host='{"s":"é"}',compatible=True)
add('unicode-decomposed','{"s":"e\u0301"}','{"s":"e\u0301"}',host='{"s":"e\u0301"}',compatible=True)
add('float-integral','{"n":1.0}','{"n":1}',kit='{"n":1.0}')
add('float-fraction','{"n":1.25}','{"n":1.25}')
add('exponent-small','{"n":1e-7}','{"n":1e-7}',kit='{"n":1e-07}')
add('exponent-large','{"n":1e20}','{"n":100000000000000000000}',kit='{"n":1e+20}')
add('exponent-integer','{"n":1e2}','{"n":100}',kit='{"n":100.0}')
add('negative-zero-int','{"n":-0}','{"n":0}')
add('negative-zero-float','{"n":-0.0}','{"n":0}',kit='{"n":-0.0}')
add('safe-max','{"n":9007199254740991}','{"n":9007199254740991}',host='{"n":9007199254740991}',compatible=True)
add('unsafe-integer','{"n":9007199254740993}','{"n":9007199254740992}',kit='{"n":9007199254740993}')
add('overflow','{"n":1e309}','{"n":null}',kit='{"n":Infinity}')
add('nan-extension','{"n":NaN}',None,kit='{"n":NaN}')
add('infinity-extension','{"n":Infinity}',None,kit='{"n":Infinity}')
add('missing-member','{}','{}',host='{}',compatible=True)
add('null-member','{"n":null}','{"n":null}',host='{"n":null}',compatible=True)
add('duplicate-key','{"a":1,"a":2}','{"a":2}')
add('decoded-duplicate','{"a":1,"\\u0061":2}','{"a":2}')
add('nested-duplicate','{"o":{"a":1,"a":2}}','{"o":{"a":2}}')
add('lone-surrogate','{"s":"\\ud800"}','{"s":"\\ud800"}',kit_reject=True)
add('excluded-overflow','{"x":1,"anchor":{"n":1e309}}','{"x":1}')
add('whitespace',' { "a" : 1 } ','{"a":1}',host='{"a":1}',compatible=True)
add('proto-key','{"__proto__":1}','{"__proto__":1}')
cases[-1]['expected']['lens']='{}'
add('boolean-array','{"a":[false,true,null]}','{"a":[false,true,null]}',host='{"a":[false,true,null]}',compatible=True)
path=Path(__file__).resolve().parents[1]/'fixtures/canonicalization.json'
path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(cases,indent=2,ensure_ascii=True)+'\n',encoding='utf-8',newline='\n')
print(f'{len(cases)} independently specified canonicalization cases')
