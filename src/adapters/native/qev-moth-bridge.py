"""Fixed native counts/RVR/ReceiptOS operations. No fixture/capture input paths."""
import importlib.util
import base64
import json
import platform
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'vendor/qev_moth'))
from qev import moth_rvr as rvr, moth_receiptos as portable, moth_comet as moth
from qev.live_common import CannotRecompute, Rejected, parse


def main():
    data = sys.stdin.buffer.read(4 * 1024 * 1024 + 1)
    # The portable native envelope contains an authorization object; use its
    # native bounded outer parser. Each counts payload is separately parsed by
    # moth_comet's stricter provider-payload parser during actual evaluation.
    request = parse(data)
    if request['operation'] == 'build':
        spec = importlib.util.spec_from_file_location('synthetic_moth_factory', Path(__file__).with_name('qev-moth-fixture.py'))
        factory = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(factory)
        value = factory.build(request.get('options', {}))
    elif request['operation'] == 'evaluate':
        entry = request['input']
        if entry.get('synthetic') is not True or entry.get('profile') != rvr.PROFILE_ID:
            raise Rejected('SYNTHETIC_WRAPPER_REQUIRED')
        replay = rvr.recompute(entry['bundle'], entry['expectedClaim'], candidate=entry.get('candidateCase'))
        packaged = None
        if entry.get('portableExport') is not None:
            attached = moth.parse(portable.unbase64(entry['portableExport']['attachment']['base64']))
            if moth.compact(attached) != moth.compact(entry['bundle']):
                raise Rejected('PORTABLE_BUNDLE_BINDING')
            packaged = portable.replay(entry['portableExport'], entry['expectedClaim'])
        value = {'rvr': replay, 'receiptOs': packaged}
    else:
        raise Rejected('BRIDGE_OPERATION')
    print(json.dumps({'ok': True, 'value': value, 'runtime': 'Python ' + platform.python_version()}, separators=(',', ':'), ensure_ascii=True))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        barrier = isinstance(error, CannotRecompute)
        print(json.dumps({'ok': False, 'nativeError': {'type': type(error).__name__, 'message': str(error),
                         'reasonCode': str(error), 'barrier': barrier}}, separators=(',', ':'), ensure_ascii=True))
        print(str(error), file=sys.stderr)
        raise SystemExit(0 if isinstance(error, (CannotRecompute, Rejected, moth.MothError, KeyError, TypeError, ValueError)) else 1)
