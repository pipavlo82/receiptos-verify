import { computeReceiptRoot } from '../../../vendor/crystal/src/receiptos/canon/receipt-root';
import { verifyHandoffReceiptRoot } from '../../../vendor/crystal/src/receiptos/verify/verify-receipt';

try {
  const input = JSON.parse(await Bun.stdin.text());
  let value;
  if (input.operation === 'build') {
    const evidence = input.evidence;
    value = { ...evidence, anchor: { ...evidence.anchor, receipt_root: computeReceiptRoot(evidence) } };
  } else if (input.operation === 'verify') {
    value = await verifyHandoffReceiptRoot(input.evidence);
  } else throw new Error('Unsupported fixed bridge operation');
  console.log(JSON.stringify({ ok: true, value, runtime: `Bun ${Bun.version}` }));
} catch (error) {
  console.log(JSON.stringify({ ok: false, nativeError: { type: error.name, message: error.message } }));
  console.error(error.message);
  // An expected typed-input diagnostic is structured output. Unexpected
  // checker failures remain nonzero and cannot be parsed as semantic evidence.
  process.exitCode = error instanceof TypeError ? 0 : 1;
}
