"""Explicit public source checkout preparation. Never reset an existing directory."""
import json,os,pathlib,subprocess
RESEARCH=pathlib.Path(__file__).resolve().parents[1]
SUPPORT=pathlib.Path(os.environ.get('AGENT_ACTION_SUPPORT','D:/PAVLO HQ/Workspaces/agent-action-verify-v0'))
for row in json.loads((RESEARCH/'source-pins.json').read_text('utf-8'))['repositories']:
    if not row['runtime_dependency']:continue
    target=SUPPORT/'sources'/row['repository'].replace('/','--')
    if target.exists():
        observed=subprocess.check_output(['git','rev-parse','HEAD'],cwd=target,text=True).strip()
        if observed!=row['sha']:raise SystemExit('Existing checkout has another SHA; select a new AGENT_ACTION_SUPPORT directory: '+str(target))
    else:
        target.parent.mkdir(parents=True,exist_ok=True)
        subprocess.run(['git','-c','core.autocrlf=false','clone','--no-checkout',row['url']+'.git',str(target)],check=True)
        subprocess.run(['git','config','core.autocrlf','false'],cwd=target,check=True)
        subprocess.run(['git','checkout','--detach',row['sha']],cwd=target,check=True)
    print(row['repository'],row['sha'])
print('Prepared external local runtime dependencies. No license grant is inferred for recompute-lens.')
