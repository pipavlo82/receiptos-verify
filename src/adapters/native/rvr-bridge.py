"""Fixed stdin bridge to unmodified, pinned native RVR functions. No file writes."""
import base64
import copy
import importlib.util
import json
import platform
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
MODULE = ROOT / 'vendor/rvr/conformance/rvr-v0/adapter.py'
spec = importlib.util.spec_from_file_location('receiptos_pinned_rvr', MODULE)
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def make_case(encoded, expected, unavailable=False):
    if not isinstance(encoded, str) or not isinstance(expected, str):
        raise native.GateRejection('rvr.gate.schema_invalid', 'Fixture bytes/digest must be strings')
    data = base64.b64decode(encoded, validate=True)
    if base64.b64encode(data).decode('ascii') != encoded or len(data) > 1024 * 1024:
        raise native.GateRejection('rvr.gate.schema_invalid', 'Noncanonical or oversized fixture bytes')
    member = ({'id': 'artifact', 'status': 'UNAVAILABLE', 'reasonCode': 'rvr.v0.evidence_unavailable'}
              if unavailable else {'id': 'artifact', 'status': 'PRESENT', 'mediaType': 'application/octet-stream',
                                  'byteLength': str(len(data)), 'digest': native.sha256_hex(data)})
    return {'claim': {'schema': 'rvr.claim.sha256-equals.v0', 'operation': 'SHA256_EQUALS',
                      'evidenceMember': 'artifact', 'expectedDigest': expected},
            'evidenceSet': {'schema': 'rvr.evidence-set.v0', 'members': [member]},
            'payloadsBase64': {} if unavailable else {'artifact': encoded}}


def main():
    data = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024:
        raise native.GateRejection('rvr.gate.schema_invalid', 'Native input too large')
    request = native.parse_json_bytes(data, 'bridge stdin')
    profile = native.load_json(native.PROFILE_PATH)
    manifest_bytes = native.PROFILE_MANIFEST_SCHEMA_PATH.read_bytes()
    profile_digest, _, _ = native.audit_profile(profile, native.parse_json_bytes(manifest_bytes, 'manifest schema'), manifest_bytes)
    schema = native.load_json(native.PACKAGE / 'rvr.schema.json')
    canonical_result = None
    if request['operation'] == 'build':
        options = request.get('options', {})
        candidate = make_case(request['artifactBase64'], request['expectedDigest'], options.get('unavailable', False))
        original_case = make_case(options.get('savedArtifactBase64', request['artifactBase64']),
                                  options.get('savedExpectedDigest', request['expectedDigest']),
                                  options.get('unavailable', False))
        bundle = native.make_bundle(original_case, profile, profile_digest, schema)
        if 'savedOutcome' in options:
            outcome = options['savedOutcome']
            if outcome not in ('VERIFIED', 'REFUTED'):
                raise native.GateRejection('rvr.gate.schema_invalid', 'Invalid synthetic saved outcome')
            result = bundle['canonicalResult']
            result['outcome'] = outcome
            result['reasonCode'] = 'rvr.v0.digest_match' if outcome == 'VERIFIED' else 'rvr.v0.digest_mismatch'
            expected = result['evaluation']['expectedDigest']
            result['evaluation']['observedDigest'] = expected if outcome == 'VERIFIED' else ('1' if expected == '0' * 64 else '0') * 64
            bundle['receipt']['outcome'] = outcome
            bundle['receipt']['reasonCode'] = result['reasonCode']
            bundle['receipt']['resultDigest'] = native.canonical_digest(result)
            native.validate_receipt_envelope(bundle, profile_digest, schema)
        value = {'originalBundle': bundle, 'candidateCase': candidate}
    elif request['operation'] == 'recompute':
        original = request['input']['originalBundle']
        candidate = request['input']['candidateCase']
        # Never allow producer-selected dependency paths/profile semantics.
        if native.canonical_digest(original['verificationProfile']) != profile_digest:
            raise native.GateRejection('rvr.gate.identity_mismatch', 'Bundle profile differs from installed pinned profile')
        value = native.recompute(original, candidate, profile_digest, schema)
        if value.get('evaluationPerformed'):
            payloads = native.validate_evidence_closure(candidate['evidenceSet'], candidate['payloadsBase64'])
            canonical_result = native.evaluate(candidate['claim'], candidate['evidenceSet'], payloads, schema)
    else:
        raise native.GateRejection('rvr.gate.schema_invalid', 'Unsupported fixed bridge operation')
    print(json.dumps({'ok': True, 'value': value, 'canonicalResult': canonical_result, 'profileDigest': profile_digest,
                      'runtime': 'Python ' + platform.python_version()}, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'nativeError': {'type': type(error).__name__,
                         'reasonCode': getattr(error, 'reason_code', None), 'message': str(error)}},
                         ensure_ascii=False, separators=(',', ':')))
        print(str(error), file=sys.stderr)
        raise SystemExit(0 if isinstance(error, (native.RvrError, KeyError, TypeError, ValueError)) else 1)
