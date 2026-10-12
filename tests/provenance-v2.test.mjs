import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProvenanceV2 } from '../tools/check-provenance-v2.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const original = JSON.parse(readFileSync(join(root, 'provenance/sources.json'), 'utf8'));
const row = (catalog, id = 'trustless-native-scan-v02') => catalog.v02Integrations.find(item => item.capabilityId === id);
function reject(edit, reason) {
  const catalog = structuredClone(original); edit(catalog);
  assert.throws(() => validateProvenanceV2(root, { catalog }), error => error.code === reason, reason);
}
test('v0.2 provenance retains exact public base, all 43 repository accounts and vendor closure', () => {
  const actual = validateProvenanceV2();
  assert.equal(actual.status, 'PASS');
  assert.equal(actual.publicBase, '62cd3e59c8f568496ed087d55f0aec3d63363b0a');
  assert.equal(actual.historicalRepositories, 43);
  assert.equal(actual.historicalSourceEntries, 74);
  assert.equal(actual.newIntegrations, 8);
  assert.equal(actual.newSourceRepositories, 6);
  assert.equal(actual.newVendorFiles, 14);
  assert.equal(actual.npmLicensePackages, 26);
  assert.equal(actual.historicalNpmLicensePackages, 7);
  assert.equal(actual.xrplPocDependencies, 2);
});
test('v0.2 provenance rejects dropped historical repository', () => reject(c => c.repositoryReuse.pop(), 'HISTORICAL_REPOSITORY_COUNT'));
test('v0.2 provenance rejects historical capability rewriting', () => reject(c => c.sources[0].sourceSHA = '0'.repeat(40), 'HISTORICAL_SOURCE_ACCOUNT_CHANGED'));
test('v0.2 provenance rejects changed historical repository authorship/role', () => reject(c => c.repositoryReuse[0].mode = 'runtime', 'HISTORICAL_REPOSITORY_ACCOUNT_CHANGED'));
test('v0.2 provenance rejects duplicate historical repositories', () => reject(c => c.repositoryReuse[1].repository = c.repositoryReuse[0].repository, 'HISTORICAL_REPOSITORY_DUPLICATE'));
test('v0.2 provenance rejects wrong public base', () => reject(c => c.v02Base.commit = '750a9b63c2cec696334f9d43e389b4987d128189', 'PUBLIC_BASE_IDENTITY_CHANGED'));
test('v0.2 provenance rejects invented source pins', () => reject(c => row(c).sourceSHA = '0'.repeat(40), 'SOURCE_PIN_MISMATCH'));
test('v0.2 provenance rejects unsupported integration mode', () => reject(c => row(c).integrationMode = 'COPIED_BUT_RELICENSED', 'INTEGRATION_MODE_UNSUPPORTED'));
test('v0.2 provenance rejects undeclared maturity', () => reject(c => row(c).maturity = 'PRODUCTION', 'INTEGRATION_MATURITY_UNSUPPORTED'));
test('v0.2 provenance refuses ownership as authorship', () => reject(c => row(c).ownershipIsNotAuthorship = false, 'OWNERSHIP_AUTHORSHIP_BOUNDARY_MISSING'));
test('v0.2 provenance requires concrete contribution evidence', () => reject(c => row(c).contributionEvidence = [], 'CONTRIBUTION_EVIDENCE_MISSING'));
test('v0.2 provenance rejects contribution URLs outside the source repository', () => reject(c => row(c).contributionEvidence[0].url = 'https://example.org/owned-by-pavlo', 'CONTRIBUTION_EVIDENCE_URL'));
test('v0.2 provenance rejects missing license attribution', () => reject(c => row(c).license = '', 'SOURCE_LICENSE_MISSING'));
test('v0.2 provenance rejects private/domain-specific source selection', () => reject(c => row(c).sourcePaths.push('adapters/vertice/private.mjs'), 'EXCLUDED_SOURCE_PATH'));
test('v0.2 provenance rejects malicious product path references', () => reject(c => row(c).productFiles.push('../../outside'), 'UNSAFE_PROVENANCE_PATH'));
test('v0.2 provenance rejects copied source mislabeled as original specification work', () => reject(c => row(c).integrationMode = 'REIMPLEMENTED_FROM_SPEC', 'COPIED_SOURCE_MODE_MISLABELED'));
test('v0.2 provenance rejects copied byte hash mismatch', () => reject(c => row(c).copiedFiles[0].sha256 = '0'.repeat(64), 'COPIED_FILE_DIGEST:vendor/recompute-kit-v02/LICENSE'));
test('v0.2 provenance rejects copied source outside declared source paths', () => reject(c => row(c).copiedFiles[0].sourcePath = 'unrecorded/LICENSE', 'COPIED_SOURCE_PATH_UNDECLARED'));
test('v0.2 provenance binds exact source fragments', () => reject(c => c.v02Fragments[0].sha256 = '0'.repeat(64), 'SOURCE_FRAGMENT_DIGEST'));
test('v0.2 provenance rejects PR14 labeling as stable main', () => reject(c => row(c, 'prf-downstream-native-dependency-transfer-v02').maturity = 'STABLE', 'OPEN_PR_MISLABELED_AS_MAIN'));
test('v0.2 provenance rejects silently enabling open PR57 behavior in main adapter', () => reject(c => row(c).upstreamPullRequests.find(pr => pr.number === 57).used = true, 'OPEN_PR_BEHAVIOR_MIXED_WITH_MAIN'));
test('v0.2 provenance rejects repository v2 integration misattribution', () => reject(c => c.repositoryReuse[0].v02IntegrationIds.push('trustless-native-scan-v02'), 'REPOSITORY_V02_MAPPING_MISMATCH'));
test('v0.2 provenance detects undeclared vendor bytes in a separate temporary product', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'rv02-provenance-'));
  try {
    const paths = new Set(['provenance/sources.json', 'provenance/npm-licenses.json', 'package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']);
    paths.add(original.xrplPoc.path);
    const xrpl = JSON.parse(readFileSync(join(root, original.xrplPoc.path), 'utf8'));
    for (const path of xrpl.productFiles) paths.add(path);
    for (const fragment of original.v02Fragments) paths.add(fragment.path);
    for (const integration of original.v02Integrations) {
      for (const path of integration.productFiles) paths.add(path);
      for (const file of integration.copiedFiles) paths.add(file.productPath);
    }
    for (const extension of original.v02ProductExtensions) for (const path of extension.productFiles) paths.add(path);
    const npm = JSON.parse(readFileSync(join(root, 'provenance/npm-licenses.json'), 'utf8'));
    for (const packageRow of npm.packages) for (const file of packageRow.legal) paths.add(file.path);
    for (const path of paths) { const destination = join(temporary, path); mkdirSync(dirname(destination), { recursive: true }); copyFileSync(join(root, path), destination); }
    assert.equal(validateProvenanceV2(temporary).status, 'PASS');
    writeFileSync(join(temporary, 'vendor/prf-v02/unattributed.py'), '# extra source\n');
    assert.throws(() => validateProvenanceV2(temporary), error => error.code === 'UNDECLARED_NEW_VENDOR_BYTES');
  } finally {
    assert.ok(resolve(temporary).startsWith(resolve(tmpdir()) + sep + 'rv02-provenance-'), 'Temporary cleanup target must remain under the verified OS-temp prefix.');
    rmSync(temporary, { recursive: true, force: true });
  }
});
