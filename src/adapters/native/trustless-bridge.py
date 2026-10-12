"""Bounded execution bridge for unchanged public recompute-kit main sources.

The saved result is a replay target, never the semantic oracle. The native raw
relations run before the native self-grading conformance runner is consulted.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
VENDOR = ROOT / "vendor" / "recompute-kit-v02"
PROFILE = "scan_subject_binding.v0"


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def execute(payload):
    checker_path = VENDOR / "conformance/scan-subject-binding-v0/scan_check.py"
    runner_path = VENDOR / "tools/run_conformance.py"
    checker = load_module("receiptos_pinned_native_scan", checker_path)
    runner = load_module("receiptos_pinned_native_runner", runner_path)
    item = payload["input"]
    pub = bytes.fromhex(item["public_key_ed25519"])
    case = {key: item[key] for key in ("corpus", "manifest", "decision")}
    failures = checker.check_decision(pub, case["corpus"], case["manifest"], case["decision"])
    signature = checker.sig_ok(pub, case["manifest"])
    verdict, grade = checker.subject_bound(case["corpus"], case["manifest"], case["decision"], item["toy_scan"], signature)
    actual = {
        "replay_bindings": "valid" if not failures else "FAIL",
        "result_only_check": checker.result_only(case["manifest"]),
        "subject_bound_check": verdict,
        "evidence_grade": grade,
    }
    saved = payload["saved_result"]
    # Native evaluate() requires replay_failures only for deliberately invalid
    # bindings. Preserve these independently observed failures as native detail.
    if "replay_failures" in saved:
        actual["replay_failures"] = failures
    case["expect"] = saved
    native_vectors = {
        "test_public_key_ed25519": item["public_key_ed25519"],
        "toy_scan": item["toy_scan"],
        "cases": {payload["case_id"]: case},
    }
    with tempfile.TemporaryDirectory(prefix="receiptos-kit-") as directory:
        d = Path(directory)
        (d / "scan_check.py").write_bytes(checker_path.read_bytes())
        (d / "README.md").write_bytes((checker_path.parent / "README.md").read_bytes())
        vectors = canonical(native_vectors)
        (d / "vectors.json").write_bytes(vectors)
        command = [sys.executable, "-I", "-B", "-X", "utf8", "scan_check.py", "vectors.json"]
        manifest = {
            "profile": PROFILE,
            "spec": {"path": "README.md", "sha256": hashlib.sha256((d / "README.md").read_bytes()).hexdigest()},
            "checker": {"path": "scan_check.py", "sha256": hashlib.sha256(checker_path.read_bytes()).hexdigest()},
            "vectors": {"path": "vectors.json", "sha256": hashlib.sha256(vectors).hexdigest()},
            "adapter": {"kind": "stdio", "cmd": subprocess.list2cmdline(command) if sys.platform == "win32" else shlex.join(command)},
        }
        (d / "suite.json").write_bytes(canonical(manifest))
        # Retain full actual native JSON; the canonical runner only retains the
        # last process diagnostic. Both execute exactly the same fresh corpus.
        proc = subprocess.run(command, cwd=d, input=vectors, capture_output=True, timeout=15)
        native_artifact = json.loads(proc.stdout.decode("utf-8", "strict"))
        suite_rows = runner.run_suite(d)
        row = suite_rows[0]
        runner_result = {"name": f"scan-subject-binding-v0/conformance", "ok": row.ok,
                         "kind": row.kind, "detail": row.detail,
                         "verdict": "PASS" if row.ok else row.kind}
    return {
        "ok": True, "profile": PROFILE, "native_result": actual,
        "native_artifact": native_artifact, "native_exit_code": proc.returncode,
        "native_stderr": proc.stderr.decode("utf-8", "strict"),
        "runner_result": runner_result, "replay_failures": failures,
        "signature_valid": signature,
        "computed_effective_dataset_digest": checker.root(case["decision"]["retrieved"]),
        "computed_corpus_digest": checker.root(case["corpus"]),
        "native_vector_digest": hashlib.sha256(vectors).hexdigest(),
        "python_version": sys.version.split()[0],
    }


def main():
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "strict"))
        value = execute(payload)
    except Exception as error:
        value = {"ok": False, "error": type(error).__name__, "detail": str(error)}
    sys.stdout.buffer.write(canonical(value) + b"\n")


if __name__ == "__main__":
    main()
