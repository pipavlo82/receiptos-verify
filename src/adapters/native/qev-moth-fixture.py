"""Fresh synthetic Moth-shaped bytes, never a copied provider capture.

Native LIVE_MOTH_API_CAPTURE and qpu literals are required profile assertions.
They establish no origin or hardware authority. The outer wrapper says synthetic.
"""
import base64
import copy
import math
from qev import moth_comet as moth, moth_rvr as rvr, moth_receiptos as portable


def build(options):
    job_id = 'synthetic-moth-job'
    stamp = '1970-01-01T00:00:00Z'
    counts = {'0' * 20: 2047 if options.get('refutedCounts') else 2048}
    counts_hash = moth.sha(moth.compact(counts))
    provenance = {'engine': 'comet-qrng-v1', 'mode': 'qpu', 'shots': 2048,
                  'circuit': copy.deepcopy(moth.SPEC), 'readout': 'counts',
                  'backend': 'synthetic-backend-not-hardware', 'provider_job_id': job_id,
                  'engine_version': 'synthetic-v0', 'qpu_seconds': 0, 'circuit_hash': '0' * 64,
                  **{key: stamp for key in ('built_at', 'committed_at', 'collected_at', 'formatted_at')}}
    extractor = {'kind': 'toeplitz', 'input_serialisation': 'sorted bitstrings repeated by count (canonical multiset)',
                 'epsilon_log2': 64, 'output_bits': 0, 'input_bits': 24576}
    entropy = {'n_rand': 12, 'shots': 2048, 'raw_bits': 24576, 'readout': 'counts',
               'budget_bits': 0, 'budget_bits_assumption_free': 0, 'budget_bits_modelled': 0,
               'h_bit': 0, 'h_shot_assumption_free': 0, 'ordering_penalty_bits': math.lgamma(2049) / math.log(2)}
    report = {**{key: entropy[key] for key in ('budget_bits', 'budget_bits_assumption_free', 'budget_bits_modelled', 'h_bit', 'h_shot_assumption_free')},
              'epsilon_log2': 64, 'output_bits': 0, 'raw_bits': 24576, 'accounting_basis': 'synthetic-zero-budget',
              'health_passed': False, 'entropy_accounted': False, 'independence_model_falsified': False,
              'public_output': True, 'witness_violates_classical': False, 'grade': 'hardware-insufficient-entropy'}
    commitment = {'commit': '0' * 64, 'salt': '0' * 64, 'committed_at': stamp,
                  'binds': ['circuit_hash', 'backend', 'provider_job_id', 'salt']}
    pulse = {'raw_counts_hash': counts_hash, 'provenance': provenance, 'extractor': extractor,
             'commitment': {key: commitment[key] for key in ('commit', 'salt')},
             'timestamp': stamp, 'version': 2, 'index': None, 'prev_hash': '0' * 64,
             'output_hash': moth.sha(b''), 'entropy': {**{key: entropy[key] for key in ('budget_bits', 'budget_bits_assumption_free', 'h_bit', 'readout')},
                                                    'basis': report['accounting_basis'], 'health_passed': False}}
    pulse['pulse_hash'] = moth.sha(moth.compact(pulse))
    witness = {'enabled': True, 'kind': 'chsh_fidelity_witness', 'S': 2, 'sigma_S': 0,
               'violates_classical_3sigma': False, 'correlators': [
                   {'qubits': pair, 'setting': setting, 'counts': {'00': 2048, '01': 0, '10': 0, '11': 0}, 'E': 1, 'sigma': 0}
                   for pair, setting in zip(moth.SPEC['witness_pairs'], ("E(a,b)", "E(a,b')", "E(a',b)", "E(a',b')"))]}
    output = {'provenance': provenance, 'raw': {'memory_available': False, 'counts': counts,
                                               'n_unique_bitstrings': 1, 'counts_sha256': counts_hash},
              'pulse': pulse, 'commitment': commitment, 'extractor': extractor, 'entropy': entropy,
              'entropy_report': report, 'random': {'bytes': 0, 'hex': '', 'bits': 0, 'requested_bytes': 32},
              'device_fingerprint': {'n_qubits': 20, 'roles': {'randomness': list(range(12)), 'witness_pairs': moth.SPEC['witness_pairs']},
                                     'p1': [0] * 20, 'z_expectations': [1] * 20}, 'bell_witness': witness,
              'synthetic': True}
    contract = rvr.contract()
    roles = contract['roles']
    build_extra = {'spec': moth.SPEC, 'mode': 'qpu', 'shots': 2048, 'requested_bytes': 32,
                   'include_raw_counts': True, 'epsilon_log2': 64, 'circuit_hash': '0' * 64,
                   'built_at': stamp, 'qpu_token': None, 'qpu_instance': None}
    objects = {roles['request']: moth.REQUEST,
               roles['submit']: {'job_id': job_id, 'status': 'submitted', 'submitted_at': stamp, 'synthetic': True},
               roles['job']: {'job_id': job_id, 'engine_id': 'comet-qrng-v1', 'status': 'completed', 'synthetic': True},
               roles['result']: {'result': {'output': output}},
               'SUBMIT_ATTEMPTED.json': {'post_attempt_authorized': 1, 'retry_allowed': False, 'ibm_token_sent': False},
               'job-reference.json': {'submit_calls': 1, 'job_id': job_id, 'synthetic': True},
               'terminal-observation.json': {'status': 'completed', 'synthetic': True}}
    for name, state in zip(roles['statuses'], ('queued', 'processing', 'completed')):
        objects[name] = {'job_id': job_id, 'engine_id': 'comet-qrng-v1', 'submitted_at': stamp, 'status': state,
                         'steps': [{'name': 'build', 'extra': build_extra}], 'synthetic': True}
        if state == 'completed':
            objects[name]['result'] = objects[roles['result']]['result']
    payloads = {name: moth.encode(value) for name, value in objects.items()}
    for name in contract['members']:
        if not name.endswith('.http.json'):
            continue
        body = name.replace('.http.json', '.body.json')
        method = 'POST' if body == roles['submit'] else 'GET'
        path = '/api/v1/engines/comet-qrng-v1/process' if method == 'POST' else '/api/v1/jobs/' + job_id
        if body == roles['result']:
            path += '/result'
        elif body in roles['statuses']:
            path += '/status'
        payloads[name] = moth.encode({'method': method, 'path': path, 'status': 202 if method == 'POST' else 200,
                                     'body_file': body, 'byte_length': len(payloads[body]),
                                     'sha256': moth.sha(payloads[body]), 'synthetic': True})
    manifest = {'schema': 'qev.moth-http-capture.v0', 'roles': roles,
                'files': {name: {'sha256': moth.sha(raw), 'bytes': len(raw)} for name, raw in payloads.items()}}
    payloads['manifest.json'] = moth.encode(manifest)
    capture_claim = {'schema': 'qev.moth-comet-claim.v0', 'profile': 'qev-moth-comet-counts-v0', 'jobId': job_id,
                     'manifestSha256': moth.sha(payloads['manifest.json']), 'requestSha256': moth.sha(payloads[roles['request']]),
                     'origin': 'LIVE_MOTH_API_CAPTURE', 'authority': 'LOCAL_UNSIGNED_CAPTURE_COMMITMENT'}
    claim = {'schema': 'rvr.claim.qev-moth-counts.v0', 'profile': rvr.PROFILE_ID,
             'relation': 'preserved-counts-and-report-consistency', 'captureClaim': capture_claim,
             'providerAuthentication': 'NOT_ESTABLISHED'}
    if options.get('missingMember'):
        del payloads[roles['result']]
    case = rvr.case_from_payloads(claim, payloads)
    bundle = rvr.make_bundle(case)
    candidate = copy.deepcopy(case)
    if options.get('candidateMissingMember'):
        candidate_payloads = dict(payloads)
        candidate_payloads.pop(roles['result'], None)
        candidate = rvr.case_from_payloads(claim, candidate_payloads)
    export = portable.create(moth.encode(bundle), claim) if options.get('portable', True) else None
    return {'profile': rvr.PROFILE_ID, 'synthetic': True, 'expectedClaim': claim,
            'bundle': bundle, 'candidateCase': candidate, 'portableExport': export}
