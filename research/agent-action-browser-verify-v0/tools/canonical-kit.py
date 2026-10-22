"""Invoke the current exact external recompute-kit receiptos module."""
import importlib.util
import json
import os
from pathlib import Path
import sys

root=Path(__file__).resolve().parents[1]
support=Path(os.environ.get('AGENT_ACTION_SUPPORT','D:/PAVLO HQ/Workspaces/agent-action-verify-v0'))
spec=importlib.util.spec_from_file_location('upstream_receiptos',support/'sources/trustless-ai--recompute-kit/mcp/receiptos.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
rows=[]
for c in json.loads((root/'fixtures/canonicalization.json').read_text(encoding='utf-8')):
    try:
        value=json.loads(c['raw'])
        body={k:v for k,v in value.items() if k not in ('anchor','receipt_root')}
        canonical=module.jcs(body)
        rows.append({'case_id':c['case_id'],'engine':'kit','status':'ACCEPTED','canonical_hex':canonical.hex(),'receipt_root':module.receipt_root(value)})
    except Exception as error:
        rows.append({'case_id':c['case_id'],'engine':'kit','status':'REJECTED','canonical_hex':None,'receipt_root':None,'error_class':type(error).__name__})
print(json.dumps({'rows':rows},sort_keys=True))
