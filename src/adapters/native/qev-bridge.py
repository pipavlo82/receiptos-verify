"""Fresh synthetic-only bridge to the exact pinned QEV finite checker."""
import copy
import json
import platform
import sys
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'vendor/qev'))
from qev import checker as native


def build(options):
    samples = options.get('samples', ['00', '11', '01', '10'])
    width = options.get('width', 2)
    request = {'marker': 'SYNTHETIC', 'request_id': 'synthetic-request',
               'program': {'codec': 'qev-lines.v0', 'source': 'H 0\nMEASURE_ALL\n'},
               'parameters': {'theta_quarters': 0}, 'width': width, 'shots': len(samples),
               'source_to_output': list(range(width)), 'endianness': 'source-index-ascending',
               'provider': 'synthetic-provider', 'backend': 'synthetic-backend', 'job': 'synthetic-job'}
    request.update(options.get('request', {}))
    native.validate_request(request)
    raw = ''.join(sample + '\n' for sample in samples)
    output_to_raw = options.get('output_to_raw', list(range(width)))
    mapped = [''.join(bits[output_to_raw[request['source_to_output'][i]]] for i in range(width)) for bits in samples]
    counts = dict(sorted(Counter(mapped).items()))
    result = {'shots': len(samples),
              'weighted_sum': sum(n * sum((i+1) * int(bits[i]) for i in range(width)) for bits, n in counts.items()),
              'parity_ones': sum(n for bits, n in counts.items() if bits.count('1') % 2)}
    package = {'marker': 'SYNTHETIC', 'profile': native.PROFILE, 'hash_algorithm': 'sha256',
               'json_codec': 'qev-json.v0', 'request': copy.deepcopy(request), 'request_sha256': native.digest(request),
               'raw': None if options.get('raw_missing') else {'codec': 'ascii-bit-lines-lf.v0', 'data': raw, 'sha256': native.sha(raw.encode('ascii'))},
               'output_to_raw': output_to_raw, 'counts': options.get('counts', counts),
               'postprocessor': native.POSTPROCESSOR, 'result': options.get('result', result),
               'claimed_execution': options.get('claimed_execution', 'SYNTHETIC'),
               'provider_evidence': None, 'desired_claim': options.get('desired_claim', native.CLAIM)}
    package['payload_sha256'] = native.digest(package)
    native.validate_package(package)
    return {'request': request, 'package': package}


def main():
    data = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
    if len(data) > 4 * 1024 * 1024:
        raise native.InputError('INPUT_SIZE_LIMIT')
    request = json.loads(data.decode('utf-8'))
    if request['operation'] == 'build':
        value = build(request.get('options', {}))
    elif request['operation'] == 'evaluate':
        value = native.verify(native.canonical(request['input']['request']), native.canonical(request['input']['package']))
    else:
        raise native.InputError('UNSUPPORTED_FIXED_OPERATION', 'UNSUPPORTED')
    print(json.dumps({'ok': True, 'value': value, 'runtime': 'Python ' + platform.python_version()}, separators=(',', ':')))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'ok': False, 'nativeError': {'type': type(error).__name__, 'reason': getattr(error, 'reason', None), 'message': str(error)}}, separators=(',', ':')))
        print(str(error), file=sys.stderr)
        raise SystemExit(0 if isinstance(error, (native.InputError, KeyError, TypeError, ValueError, IndexError)) else 1)
