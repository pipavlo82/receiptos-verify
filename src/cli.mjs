import { readFile, writeFile } from 'node:fs/promises';
import { verify } from './core/verify.mjs';
import { textReport } from './core/report.mjs';
import { baseline } from '../tools/fixtures.mjs';
import { encodeCapsule, decodeCapsule } from './core/capsule.mjs';
import { parseStrict } from './core/strict-json.mjs';
const [command,...args]=process.argv.slice(2);
if(command==='verify'&&args.length>=2) {
  const report=await verify(await readFile(args[0]),await readFile(args[1]));
  process.stdout.write(args.includes('--text')?textReport(report):JSON.stringify(report,null,2)+'\n');
  process.exitCode=report.overall==='VERIFIED'?0:report.overall==='CONTRADICTED'?2:3;
} else if(command==='pack'&&args.length===3) {
  const encoded=encodeCapsule(parseStrict(await readFile(args[0])),parseStrict(await readFile(args[1])));
  await writeFile(args[2],encoded.bytes);process.stdout.write(JSON.stringify({containerDigest:encoded.containerDigest,manifestMerkleRoot:encoded.manifestMerkleRoot,packagingOnly:true})+'\n');
} else if(command==='verify-capsule'&&args.length>=2) {
  const decoded=decodeCapsule(await readFile(args[1]),args[2]?{containerDigest:args[2]}:{});
  const report=await verify(await readFile(args[0]),decoded.bundle);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');process.exitCode=report.overall==='VERIFIED'?0:report.overall==='CONTRADICTED'?2:3;
} else if(command==='demo-v2') {
  const output=await (await import('../tools/demos-v2.mjs')).demosV2();
  process.stdout.write(JSON.stringify(output,null,2)+'\n');process.exitCode=output.passed?0:1;
} else if(command==='demo') {
  const pair=await baseline();
  const positive=await verify(pair.request,pair.bundle);
  const wrong=structuredClone(pair.request);wrong.subject.commit='b'.repeat(40);
  const negative=await verify(wrong,pair.bundle);
  process.stdout.write(JSON.stringify({synthetic:true,sameReceipt:true,positive,wrong_commit:negative},null,2)+'\n');
  process.exitCode=positive.overall==='VERIFIED'&&negative.overall==='CONTRADICTED'?0:1;
} else {
  process.stderr.write('Usage: node src/cli.mjs verify request.json bundle.json [--text]\n       node src/cli.mjs verify-capsule request.json capsule.json [containerDigest]\n       node src/cli.mjs pack request.json bundle.json capsule.json\n       node src/cli.mjs demo\n');process.exitCode=64;
}
