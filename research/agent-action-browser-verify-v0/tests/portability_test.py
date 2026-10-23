"""Portability regressions in disposable trees; no product fixtures are rewritten."""
import hashlib
import json
import os
from pathlib import Path, PureWindowsPath
import shutil
import subprocess
import sys
import tempfile
import unittest

RESEARCH = Path(os.environ.get('PORTABILITY_TEST_SOURCE', Path(__file__).resolve().parents[1]))


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8', newline='\n')


class SourceClosurePortability(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='research-portability-')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.checker = self.root / 'tools/check-research.py'
        self.checker.parent.mkdir()
        shutil.copyfile(RESEARCH / 'tools/check-research.py', self.checker)
        write(self.root / 'BROWSER_DEMO.md', 'Demo\n')
        write(self.root / 'browser/app.mjs', 'export const value = 1;\n')
        self.run_checker('--write', success=True)

    def run_checker(self, *arguments, success):
        process = subprocess.run([sys.executable, '-B', str(self.checker), *arguments], capture_output=True, text=True)
        self.assertEqual(process.returncode == 0, success, process.stdout + process.stderr)
        result = json.loads(process.stdout)
        self.assertEqual(result['status'], 'PASS' if success else 'FAIL')
        return result

    def lock(self):
        return json.loads((self.root / 'source-lock.json').read_text('utf-8'))

    def save_lock(self, lock):
        write(self.root / 'source-lock.json', json.dumps(lock, indent=2) + '\n')
        self.refresh_outer_lock_digest()

    def refresh_outer_lock_digest(self):
        # Keep the outer digest valid so each negative targets the inner check.
        rows = (self.root / 'SHA256SUMS').read_text('utf-8').splitlines()
        digest = hashlib.sha256((self.root / 'source-lock.json').read_bytes()).hexdigest()
        write(self.root / 'SHA256SUMS', ''.join((digest + '  source-lock.json' if row.endswith('  source-lock.json') else row) + '\n' for row in rows))

    def test_writer_uses_exact_posix_order(self):
        paths = [row['path'] for row in self.lock()['files']]
        self.assertEqual(paths, sorted(paths))
        self.assertNotEqual(sorted(paths), sorted(paths, key=PureWindowsPath))
        self.run_checker(success=True)

    def test_checker_accepts_both_legacy_windows_and_posix_order(self):
        lock = self.lock()
        for key in (PureWindowsPath, str):
            with self.subTest(order=key.__name__):
                lock['files'].sort(key=lambda row: key(row['path']))
                self.save_lock(lock)
                self.run_checker(success=True)

    def test_duplicate_inventory_path_is_rejected(self):
        lock = self.lock()
        lock['files'].append(dict(lock['files'][0]))
        self.save_lock(lock)
        self.run_checker(success=False)

    def test_exact_path_bytes_and_digest_are_bound(self):
        original = self.lock()
        for field, value in [('path', 'browser_demo.md'), ('bytes', 999), ('sha256', '0' * 64)]:
            with self.subTest(field=field):
                lock = json.loads(json.dumps(original))
                lock['files'][0][field] = value
                self.save_lock(lock)
                self.run_checker(success=False)

    def test_invalid_paths_and_duplicate_json_fields_are_rejected(self):
        original = self.lock()
        for path in ('../outside', '/absolute', 'C:/absolute', 'browser\\app.mjs', './BROWSER_DEMO.md', 'browser//app.mjs'):
            with self.subTest(path=path):
                lock = json.loads(json.dumps(original))
                lock['files'][0]['path'] = path
                self.save_lock(lock)
                self.run_checker(success=False)
        self.save_lock(original)
        text = (self.root / 'source-lock.json').read_text('utf-8')
        write(self.root / 'source-lock.json', text.replace('"schema":', '"schema":"ignored", "schema":', 1))
        self.refresh_outer_lock_digest()
        self.run_checker(success=False)

    def test_outer_manifest_is_complete_and_unique(self):
        original = (self.root / 'SHA256SUMS').read_text('utf-8')
        rows = original.splitlines()
        for changed in ('\n'.join(rows[1:]) + '\n', original + rows[0] + '\n', original + '0' * 64 + '  undeclared.txt\n'):
            with self.subTest(manifest=changed):
                write(self.root / 'SHA256SUMS', changed)
                self.run_checker(success=False)

    def test_undeclared_files_and_changed_source_are_rejected(self):
        write(self.root / 'new.txt', 'extra\n')
        self.run_checker(success=False)
        (self.root / 'new.txt').unlink()
        write(self.root / 'browser/app.mjs', 'export const value = 2;\n')
        self.run_checker(success=False)

    def test_text_errors_are_rejected_before_writing(self):
        for contents in (b'CRLF\r\n', b'\xef\xbb\xbfBOM\n', b'[bad](missing.txt)\n'):
            with self.subTest(contents=contents):
                (self.root / 'BROWSER_DEMO.md').write_bytes(contents)
                before = (self.root / 'source-lock.json').read_bytes()
                self.run_checker('--write', success=False)
                self.assertEqual((self.root / 'source-lock.json').read_bytes(), before)

    def test_symlinks_fail_closed(self):
        link = self.root / 'linked.txt'
        try:
            link.symlink_to(self.root / 'BROWSER_DEMO.md')
        except (OSError, NotImplementedError) as error:
            self.skipTest('symlink creation unavailable: ' + str(error))
        result = self.run_checker(success=False)
        self.assertTrue(any(error.startswith('SYMLINK:') for error in result['errors']))


class ControllerInterpreterPortability(unittest.TestCase):
    def test_controller_and_actual_js_child_use_selected_interpreter_without_python_command(self):
        with tempfile.TemporaryDirectory(prefix='controller-portability-') as temporary:
            self.run_controller_fixture(temporary)

    @unittest.skipIf(os.name == 'nt', 'POSIX TMPDIR aliases do not apply on Windows')
    def test_controller_through_actual_symlinked_tmpdir(self):
        with tempfile.TemporaryDirectory(prefix='controller-temp-alias-') as temporary:
            outer = Path(temporary).resolve()
            physical = outer / 'physical'
            physical.mkdir()
            alias = outer / 'alias'
            alias.symlink_to(physical, target_is_directory=True)
            previous = os.environ.get('TMPDIR')
            cached = tempfile.tempdir
            try:
                os.environ['TMPDIR'] = str(alias)
                tempfile.tempdir = None
                with tempfile.TemporaryDirectory(prefix='controller-portability-') as selected:
                    self.assertTrue(Path(selected).is_relative_to(alias))
                    self.assertNotEqual(Path(selected), Path(selected).resolve())
                    self.run_controller_fixture(selected)
            finally:
                tempfile.tempdir = cached
                if previous is None:
                    os.environ.pop('TMPDIR', None)
                else:
                    os.environ['TMPDIR'] = previous

    def run_controller_fixture(self, temporary):
        node = shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for the controller integration regression')
        # Resolve /tmp -> /private/tmp before constructing selected runtime paths.
        root = Path(temporary).resolve()
        binary = root / 'bin'
        binary.mkdir()
        self.assertEqual(binary, binary.resolve(), 'runtime directory still traverses a TMPDIR alias')
        # A renamed Python binary prevents Windows CreateProcess from finding
        # python.exe beside the running controller, even with an empty PATH.
        selected = binary / ('selected-interpreter.exe' if os.name == 'nt' else 'selected-interpreter')
        shutil.copy2(getattr(sys, '_base_executable', sys.executable), selected)
        if os.name == 'nt':
            for pattern in ('python*.dll', 'vcruntime*.dll'):
                for runtime in Path(sys.base_prefix).glob(pattern):
                    shutil.copy2(runtime, binary / runtime.name)
        node_copy = binary / ('node.exe' if os.name == 'nt' else 'node')
        if os.name == 'nt':
            shutil.copy2(node, node_copy)
        else:
            # Homebrew Node uses loader-relative libraries: preserve its
            # actual executable location instead of relocating its bytes.
            node_copy.symlink_to(Path(node).resolve())
            self.assertTrue(node_copy.is_symlink(), 'POSIX Node must retain its installed loader path')
            self.assertEqual(node_copy.resolve(), Path(node).resolve())
        support = root / 'support'
        research = root / 'host/research/agent-action-browser-verify-v0'
        (research / 'tools').mkdir(parents=True)
        for name in ('validate.py', 'canonical-differential.mjs'):
            shutil.copyfile(RESEARCH / 'tools' / name, research / 'tools' / name)
        (research / 'lib').mkdir(exist_ok=True)
        shutil.copyfile(RESEARCH / 'lib/paths.mjs', research / 'lib/paths.mjs')
        write(research / 'fixtures/canonicalization.json', '[]\n')
        write(research / 'tools/canonical-native.ts', 'import json\nprint(json.dumps({"rows": []}))\n')
        write(research / 'tools/canonical-kit.py', 'import json, os, pathlib, sys\npathlib.Path(os.environ["AGENT_ACTION_SUPPORT"], "selected-child.json").write_text(json.dumps({"executable": sys.executable, "override": os.environ.get("PYTHON_EXECUTABLE"), "optimized": sys.flags.optimize}))\nprint(json.dumps({"rows": []}))\n')
        write(research / 'tools/build-browser.ts', 'print("fixture browser build")\n')
        write(research / 'tests/portability_test.py', 'print("fixture portability test")\n')
        for script in ('run-cases.mjs', 'browser-test.mjs', 'mutations.mjs'):
            write(research / 'tools' / script, 'import assert from "node:assert/strict";\nimport {spawnSync} from "node:child_process";\nassert.equal(process.env.PATH, process.env.EXPECTED_UNSCOPED_PATH);\nif(process.platform!=="win32") assert.equal(spawnSync("python",["--version"]).error?.code,"ENOENT");\nconsole.log("fixture command");\n')
        write(root / 'host/tools/check-provenance-v2.mjs', 'console.log("fixture provenance");\n')
        base = ['admission', 'admission-v2', 'capsule', 'generic-boundary-v2', 'native-boundary-v2', 'projection-v2', 'projection-release',
                'interpoll-v2', 'semantic-abi-v2', 'provenance-v2', 'requirement-admission-release', 'interpoll-request-classification-release',
                'trustless-v02', 'trustless-grade-v2', 'adapter-context-release', 'guarantee-boundary-v2']
        for name in base:
            write(root / 'host/tests' / (name + '.test.mjs'), '// Empty controller fixture.\n')
        # This is the frozen-host boundary: unlike research helpers, the
        # real host adapters invoke literal `python`, ignoring the override.
        host_script = 'import json, os, sys\nprint(json.dumps({"executable":sys.executable,"arguments":sys.argv[1:],"marker":os.environ["HOST_LAUNCH_MARKER"],"optimized":sys.flags.optimize,"path":os.environ["PATH"]}))\n'
        write(root / 'host/tools/host-python-probe.py', host_script)
        host_test = '''import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const executable=process.platform==='win32'?process.env.PYTHON_EXECUTABLE:'python';
const child=spawnSync(executable,HOST_ARGUMENTS,{encoding:'utf8'});
assert.equal(child.status,0,child.stderr||String(child.error));
assert.equal(spawnSync(executable,['-c','import sys; sys.exit(23)']).status,23);
const result=JSON.parse(child.stdout);
writeFileSync(join(process.env.AGENT_ACTION_SUPPORT,'host-child.json'),JSON.stringify(result));
if(process.env.HOST_FIXTURE_FAIL==='1') process.exit(7);
'''
        # JSON string literals avoid accidental JavaScript quote semantics.
        host_test = host_test.replace('HOST_ARGUMENTS', json.dumps(['-B', 'tools/host-python-probe.py', 'argument with spaces', 'quote"and\'apostrophe']))
        write(root / 'host/tests/admission.test.mjs', host_test)
        write(research / 'tests/contract.test.mjs', '// Empty controller fixture.\n')
        environment = dict(os.environ, PATH=str(binary), PYTHONHOME=sys.base_prefix,
                           AGENT_ACTION_SUPPORT=str(support), BUN_EXECUTABLE=str(selected),
                           PYTHON_EXECUTABLE=str(root / 'must-not-be-used'), PYTHONDONTWRITEBYTECODE='1',
                           HOST_LAUNCH_MARKER='preserved environment', EXPECTED_UNSCOPED_PATH=str(binary))
        environment.pop('PYTHONOPTIMIZE', None)
        self.assertIsNone(shutil.which('python', path=environment['PATH']))
        probe = 'import subprocess\ntry:\n subprocess.run(["python", "--version"], check=True)\nexcept FileNotFoundError:\n print("NO_PYTHON_COMMAND")\nelse:\n raise SystemExit("python unexpectedly available")\n'
        unavailable = subprocess.run([str(selected), '-B', '-c', probe], cwd=root, env=environment, capture_output=True, text=True)
        self.assertEqual(unavailable.returncode, 0, unavailable.stdout + unavailable.stderr)
        self.assertEqual(unavailable.stdout.strip(), 'NO_PYTHON_COMMAND')
        expected_names = {'versions', 'python', 'bun', 'provenance', 'host-and-profile-tests', 'actions', 'canonicalization', 'browser-build', 'browser', 'mutations', 'portability-tests'}
        for mode in ('normal', 'optimized'):
            with self.subTest(mode=mode):
                process = subprocess.run([str(selected), '-B', str(research / 'tools/validate.py'), '--mode', mode, '--browser', '--mutations'], cwd=root, env=environment, capture_output=True, text=True)
                self.assertEqual(process.returncode, 0, process.stdout + process.stderr)
                records = json.loads((support / 'runs' / mode / 'commands.json').read_text('utf-8'))
                self.assertEqual({row['name'] for row in records}, expected_names)
                self.assertTrue(all(row['exit_code'] == 0 for row in records))
                for name in ('python', 'portability-tests'):
                    self.assertEqual(next(row for row in records if row['name'] == name)['argv'][0], str(selected))
                host = json.loads((support / 'host-child.json').read_text('utf-8'))
                self.assertEqual(host['executable'], str(selected))
                self.assertEqual(host['arguments'], ['argument with spaces', 'quote"and\'apostrophe'])
                self.assertEqual(host['marker'], 'preserved environment')
                self.assertEqual(host['optimized'], int(mode == 'optimized'))
                host_record = next(row for row in records if row['name'] == 'host-and-profile-tests')
                if os.name != 'nt':
                    launcher = host_record['python_launcher']
                    self.assertEqual(launcher['interpreter'], str(selected))
                    self.assertEqual(launcher['scope'], 'host-and-profile-tests')
                    self.assertEqual(host['path'], str(Path(launcher['path']).parent) + os.pathsep + str(binary))
                    self.assertFalse(Path(launcher['path']).parent.exists(), 'successful host launcher was not cleaned')
                    removed = subprocess.run([str(node_copy), '--test', 'tests/admission.test.mjs'], cwd=root / 'host', env=environment, capture_output=True, text=True)
                    self.assertNotEqual(removed.returncode, 0, 'literal-python host stub unexpectedly worked after shim cleanup')
                    self.assertIn('ENOENT', removed.stdout + removed.stderr)
                else:
                    self.assertNotIn('python_launcher', host_record)
                child = json.loads((support / 'selected-child.json').read_text('utf-8'))
                self.assertEqual(child, {'executable': str(selected), 'override': str(selected), 'optimized': int(mode == 'optimized')})
                canonical = json.loads((support / 'canonicalization' / mode / 'commands.json').read_text('utf-8'))
                self.assertEqual(next(row for row in canonical if row['name'] == 'python')['argv'][0], str(selected))
                if os.environ.get('PORTABILITY_TEST_EVIDENCE'):
                    evidence = Path(os.environ['PORTABILITY_TEST_EVIDENCE']) / mode
                    write(evidence / 'commands.json', json.dumps(records, indent=2) + '\n')
                    write(evidence / 'canonical-commands.json', json.dumps(canonical, indent=2) + '\n')
                    write(evidence / 'selected-child.json', json.dumps(child, indent=2) + '\n')
                    write(evidence / 'host-child.json', json.dumps(host, indent=2) + '\n')
                    write(evidence / 'python-command-unavailable.txt', unavailable.stdout)
        if os.name != 'nt':
            failed = subprocess.run([str(selected), '-B', str(research / 'tools/validate.py'), '--mode', 'repeat'], cwd=root,
                                    env=dict(environment, HOST_FIXTURE_FAIL='1'), capture_output=True, text=True)
            self.assertNotEqual(failed.returncode, 0, failed.stdout + failed.stderr)
            failed_records = json.loads((support / 'runs/repeat/commands.json').read_text('utf-8'))
            failed_host = failed_records[-1]
            self.assertEqual(failed_host['name'], 'host-and-profile-tests')
            self.assertNotEqual(failed_host['exit_code'], 0)
            self.assertFalse(Path(failed_host['python_launcher']['path']).parent.exists(), 'failed host launcher was not cleaned')


if __name__ == '__main__':
    unittest.main(verbosity=2)
