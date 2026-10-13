# XRPL repair hygiene and license review

This is a read-only review of the repair after frozen candidate
`667760d0e153cb28b9f2524035dd444f32f30ad9`. It does not replace the preserved
cold-review findings. No repository files, wallets, transactions or upstreams
were changed by this reviewer.

## Preliminary result

`light.json` records the precommit scan: 23 current/diff artifacts, 824,666
bytes, one previously reviewed public identifier match, zero unclassified
secret matches. Matched values are redacted; fingerprints and locations are
retained. This preliminary scope is deliberately smaller than the final
tracked-file and repair-history sweep.

The exact dependency versions and all non-script `package.json` values remain
identical to the frozen candidate. `package-lock.json`, the root legal files,
the npm-license manifest and all 26 cataloged dependency license files are
byte-identical. No new dependency or source vendoring is introduced.

All pre-existing `provenance/sources.json` values except its `xrplPoc` digest
remain equal to the frozen candidate. The new digest matches the changed
fragment. The fragment retains its original source pins, dependency records,
official sources, authorship boundaries and limitations, adding only product
file references and the local binding-hardening record. There remain 43
historical repository rows and 74 capability entries.

The helper now reuses public signature-shaped fields from the existing
capture in counterfactual codec carriers. Its comments explicitly deny that
these changed carriers are authorized transactions or live observations.
The original 95 test expectations are retained. Existing live-tool wallet,
faucet, signing and submission sites are unchanged; no new such site was
introduced. This review does not execute them.

The claim-surface repair is limited to exact typed-list admission already
specified by the v0.2 schemas: unique arrays, at most 64 identities, each a
nonempty string of at most 1024 Unicode codepoints. Evidence requirements
remain nonempty. No case, substring, prefix, whitespace or Unicode
normalization is added. Missing optional context lists remain empty;
explicit null or malformed lists fail closed. Valid v0.2 inputs retain the
same set-membership relation. The registered 45 new tests include the actual
direct API A/raw-AB witness and analogous evidence-basis cases.

## Scope limits

The preserved cold review scanned all reachable original Git objects. The
final repair pass will rescan current tracked bytes and all commit patches
added after the frozen candidate, plus relevant repair logs. Unreachable or
quarantined objects and unrelated private machine state are excluded.
Regex scanning cannot prove historical process-memory-only handling or the
absence of every possible secret. No full secret value is printed or saved
by this review.

## Implementation-commit full result

The full sweep finished at implementation commit
`3f3a9329228de6e9c93349a07ef2582217a5a81a` and scanned that actual commit patch.
`final.json` preserves the inventory, digests and redacted classifications:
2,250 artifacts totaling 126,071,540 bytes, including all 2,200 current
repository files. At scan start these were 2,195 tracked files plus five new
files; the commit completed during the read-only sweep, and its actual patch
and new-history identity were then included. Counts refer to scanned artifacts,
not a claim that duplicated current/patch/log bytes are independent evidence.

There were 92 regex hits: 90 previously reviewed public identifiers and two
occurrences of the pre-existing, explicitly public synthetic Interpoll test
key. There were zero unclassified matches and no new operational secret found.
No full matched value is preserved in this audit output. Historical reachable
objects were covered by the earlier frozen-candidate audit; the new commit
patch is independently covered here.

All 26 installed dependency versions, license identifiers, lockfile versions,
SRI/URL identities and retained-versus-installed legal bytes match. The lock,
legal manifest, 26 license files and root legal documents remain byte-identical
to the original candidate. No dependency-source copying was introduced.

The public capture remains SHA-256
`7f7fa0ad162a5d619ff594e0aa562beb361fdd0d275821f7d1f0b2d54e7231ce`;
the separately selected caller policy remains SHA-256
`330f1a8e1fd7881720b57c72f699eed8fadf169de2023f464e0d6c68a045eadf`.
Both are byte-identical to the frozen candidate. All historical 43-repository
and 74-capability catalog values remain unchanged, and the amended XRPL
fragment digest matches its catalog reference.

Verdict for implementation-commit hygiene and license preservation: **PASS**
within the scope limits above. A final documentation/evidence closure commit
will receive an incremental patch scan after its SHA is known.
