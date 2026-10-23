# macOS harness follow-up after Echo's second replay

## Finding and scope

Echo-Merlini's [second independent replay](https://github.com/pipavlo82/receiptos-verify/pull/2#issuecomment-6364416613) tested `8342e9b99e6edad76fc7cbdff0bc4259281931a3` with no `python` command, default macOS temporary-directory settings and Homebrew Node. Echo confirmed the authority negative witness, source closure and verifier/action/canonical/mutation/browser results, while identifying two remaining harness portability problems. These macOS execution observations are **reviewer-reported**, not a new local macOS execution.

This follow-up changes research testing/controller tooling and adds a dedicated experimental CI lane. It preserves the production verifier, historical adapters, all 2,156 baseline files, all 41 action fixtures, canonicalization vectors, mutation inventory, previous evidence, root source lock, source pins and license boundaries. No XRPL or upstream changes. Experimental research remains **ITERATE / Draft**, not production-ready.

## Repairs

1. **Installed Node identity.** POSIX controller fixtures now symlink to the real installed Node executable instead of copying its bytes. Homebrew's loader-relative libraries stay beside their installed executable. Windows retains the existing copy behavior. Tests assert that the POSIX executable is a symlink to the selected real target.
2. **Physical temporary paths.** Fixture roots are resolved before constructing runtime paths. A separate POSIX regression creates an actual symlinked `TMPDIR`, executes the complete controller fixture through it and requires physical runtime paths. This addresses `/tmp` versus `/private/tmp` without changing any receipt identifier or canonicalization policy.
3. **Frozen host interpreter boundary.** For the POSIX `host-and-profile-tests` command only, the controller creates a private temporary `python` shell launcher executing its exact `sys.executable`. It quotes the executable path, forwards arguments unchanged and preserves the native exit status/environment. The launcher is removed on success or failure. The inherited adapters are unchanged, and all later steps receive their original `PATH`.

The previous portability fixture's host tests were empty, so they could not detect the literal-`python` boundary. The fixture now executes a real Node child that spawns `python`, checks the selected interpreter, arguments with spaces/quotes, environment and nonzero exit status. It proves absence before the host step, successful scoped execution, cleanup after success/failure and absence afterward. Windows exercises its selected-interpreter fixture without claiming a POSIX launcher.

## Controls and evidence boundaries

The dedicated suite contains 11 tests: Windows executes 10 and skips the one POSIX-specific temporary-directory test; POSIX executes all 11. Normal and Python `-O` focused runs pass on Windows and actual WSL. WSL's old fixture did not reproduce the macOS `/private/tmp` failure, so that original failure remains Echo-reported. The new physical-path assertion and actual symlinked-directory regression make the corrected boundary independently observable on Linux.

Independent disposable controls omit path resolution, replace the Node symlink with a copy, remove the host launcher path, and leak it into later steps. All four are reported as **harness regressions detected**, separately from the product's 24 semantic mutation kills and one diagnostic reason witness. Syntax errors, crashes and test infrastructure failures are not relabeled as semantic kills. A separate actual frozen RVR bridge probe establishes no interpreter before scope, execution during scope and no interpreter afterward, with launcher cleanup. An ELF loader-relative library probe supports the relocation mechanism on Linux; it is not a Homebrew/macOS test.

The authority witness remains `REFUTED / AUTHORITY_PREMISE_BINDING_MISMATCH`; removing the guard exposes `UNVERIFIABLE / NATIVE_HOST_REJECTED_MALFORMED` and preserves positive case A. No verdict fix or broader guarantee is introduced. Three receipt-root-protected guards remain independently unwitnessed.

## Exact-head CI

The additive [workflow](../../.github/workflows/agent-action-research.yml) runs on Ubuntu 24.04 and macOS 15 using SHA-pinned actions, Node 22.15.0, Python 3.12 and Bun 1.3.14. It checks out the exact event head with read-only permissions, installs locked dependencies, prepares the same three pinned public source checkouts externally, and uses the [CI replay driver](tools/ci-replay.py). The runner choice follows GitHub's [supported runner labels](https://docs.github.com/en/actions/reference/runners/github-hosted-runners); macOS 14 is avoided because its [retirement is scheduled for November 2, 2026](https://github.blog/changelog/2026-10-01-github-actions-macos-14-runner-image-retirement/) (accessed October 23, 2026).

The replay `PATH` contains Node, Bun and Git, with no global `python` alias. Normal mode retains the runner's default temporary-directory setting; repeat/optimized modes also use an actual symlinked `TMPDIR`. The selected controller runs serial host/profile, action and canonical checks; normal mode includes browser and physical mutation controls. Final source/preservation/determinism/clean-worktree checks are separate gates. Python launchers are supplied only by the controller's bounded host step.

Only allowlisted generated JSON reports are uploaded. External upstream sources, compiled lens code, node_modules, temporary launchers and raw subprocess logs are excluded. Licensing for recompute-lens remains unchanged; CI is not a redistribution grant. Hosted Windows is excluded because the frozen native bridge uses an author-specific Bun path; local Windows evidence is explicitly separate.

This workflow is new: base `8342e9b` had no exact-head checks or Actions runs. A workflow file alone does not establish a passing run. Actual new-head GitHub status and artifacts must be checked after publication, and independent Homebrew/macOS replay is still required before considering merge. The workflow itself is outside the bounded research source inventory; its tracked Git identity is part of the reviewed commit. The historical root inventory is not rewritten to claim complete host integration.

Previous reports/evidence remain historical. New local command receipts and final exact-head CI observations are recorded externally under `outputs/pr2-macos-harness-repair-20261023`; no unpublished observation is presented as a public artifact.

## Local pre-publication regression

The complete Windows normal controller passes 434/434 host/profile tests, 41/41 action cases, 36 canonical cases / 180 expectations, browser 45/45 plus 36/36 canonical with no page errors/external requests. The dedicated Python suite reports 10 passing tests and one explicitly POSIX-only skip on Windows, versus 11/11 on WSL in normal and `-O` modes. The unchanged mutation family reproduces 24 semantic kills and one separate diagnostic reason witness, all five non-kill controls and exact source/semantic restoration.

Action bytes remain `f96cf8092a19c25dcb46bd945bdc0b002c9c30591a77b610b2cf6ab135ae72e7`; canonical bytes remain `c7f26b46b6749cc0bac21abb1f7418248f95235f3214460076d5ca45321aef5d`. The [pre-publication machine summary](evidence/macos-harness-20261023/summary.json) binds these results to source identities and keeps actual future CI observations distinct. CI artifact-boundary and determinism controls pass 9/9 separately; they are not added to the product test/mutation totals.
