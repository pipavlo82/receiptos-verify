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
        self.root = Path(self.temporary.name)
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
        node = shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for the controller integration regression')
        with tempfile.TemporaryDirectory(prefix='controller-portability-') as temporary:
            root = Path(temporary)
            binary = root / 'bin'
            binary.mkdir()
            # A renamed Python binary prevents Windows CreateProcess from finding
            # python.exe beside the running controller, even with an empty PATH.
            selected = binary / ('selected-interpreter.exe' if os.name == 'nt' else 'selected-interpreter')
            shutil.copy2(getattr(sys, '_base_executable', sys.executable), selected)
            if os.name == 'nt':
                for pattern in ('python*.dll', 'vcruntime*.dll'):
                    for runtime in Path(sys.base_prefix).glob(pattern):
                        shutil.copy2(runtime, binary / runtime.name)
            node_copy = binary / ('node.exe' if os.name == 'nt' else 'node')
            shutil.copy2(node, node_copy)
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
                write(research / 'tools' / script, 'console.log("fixture command");\n')
            write(root / 'host/tools/check-provenance-v2.mjs', 'console.log("fixture provenance");\n')
            base = ['admission', 'admission-v2', 'capsule', 'generic-boundary-v2', 'native-boundary-v2', 'projection-v2', 'projection-release',
                    'interpoll-v2', 'semantic-abi-v2', 'provenance-v2', 'requirement-admission-release', 'interpoll-request-classification-release',
                    'trustless-v02', 'trustless-grade-v2', 'adapter-context-release', 'guarantee-boundary-v2']
            for name in base:
                write(root / 'host/tests' / (name + '.test.mjs'), '// Empty controller fixture.\n')
            write(research / 'tests/contract.test.mjs', '// Empty controller fixture.\n')
            environment = dict(os.environ, PATH=str(binary), PYTHONHOME=sys.base_prefix,
                               AGENT_ACTION_SUPPORT=str(support), BUN_EXECUTABLE=str(selected),
                               PYTHON_EXECUTABLE=str(root / 'must-not-be-used'), PYTHONDONTWRITEBYTECODE='1')
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
                    child = json.loads((support / 'selected-child.json').read_text('utf-8'))
                    self.assertEqual(child, {'executable': str(selected), 'override': str(selected), 'optimized': int(mode == 'optimized')})
                    canonical = json.loads((support / 'canonicalization' / mode / 'commands.json').read_text('utf-8'))
                    self.assertEqual(next(row for row in canonical if row['name'] == 'python')['argv'][0], str(selected))
                    if os.environ.get('PORTABILITY_TEST_EVIDENCE'):
                        evidence = Path(os.environ['PORTABILITY_TEST_EVIDENCE']) / mode
                        write(evidence / 'commands.json', json.dumps(records, indent=2) + '\n')
                        write(evidence / 'canonical-commands.json', json.dumps(canonical, indent=2) + '\n')
                        write(evidence / 'selected-child.json', json.dumps(child, indent=2) + '\n')
                        write(evidence / 'python-command-unavailable.txt', unavailable.stdout)


if __name__ == '__main__':
    unittest.main(verbosity=2)
