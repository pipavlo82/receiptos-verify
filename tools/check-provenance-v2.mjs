import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalize, parseStrict } from '../src/core/strict-json.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const productRoot = fileURLToPath(new URL('../', import.meta.url));
const modes = new Set(['DEPENDENCY', 'PINNED_SOURCE', 'REIMPLEMENTED_FROM_SPEC', 'FIXTURE_ONLY', 'METHODOLOGY_ONLY']);
const maturities = new Set(['STABLE', 'EXPERIMENTAL', 'HISTORICAL', 'INTERFACE_ONLY']);
const pins = Object.freeze({
  'semantic-abi-native-neutral-v02': 'd15c666dfccff17f7350fe97d2fc7b71cb2cbaee',
  'trustless-native-scan-v02': '1a37bcaf91918fd8a98f164d97d0fddbc28c6755',
  'interpoll-native-signed-action-v02': '559e47f2cd2ffcbd8ad38293da89448d8ec3152d',
  'interpoll-exact-retry-trace-v02': '559e47f2cd2ffcbd8ad38293da89448d8ec3152d',
  'prf-main-award-settlement-native-v02': 'fac26d2e8346aeab08194343b78c345d235c6935',
  'prf-downstream-native-dependency-transfer-v02': 'f525737069dc4cef7741f805d08a988912f4454f',
  'rsi-v02-independent-relation-tests': '3d3038f90c3dd98e79f948398167c5cc3ef2fdd8',
  'seg-v02-caller-context-binding-method': '18f595b537017e5ff7b9074366c3065e877488f9',
});
const vendorRoots = ['vendor/semantic-abi-v02', 'vendor/recompute-kit-v02', 'vendor/interpoll-v02', 'vendor/prf-v02'];
function require(condition, reason) {
  if (!condition) throw Object.assign(new Error(reason), { code: reason });
}
function safePath(root, path) {
  require(typeof path === 'string' && !!path && !path.includes('\\') && !path.split('/').includes('..') && !isAbsolute(path) && !/^[a-z]+:/i.test(path), 'UNSAFE_PROVENANCE_PATH');
  const resolved = resolve(root, path), rel = relative(root, resolved);
  require(rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel), 'UNSAFE_PROVENANCE_PATH');
  return resolved;
}
function regularFile(root, path) {
  const resolved = safePath(root, path);
  let info;
  try { info = lstatSync(resolved); } catch { require(false, 'PRODUCT_FILE_MISSING:' + path); }
  require(info.isFile() && !info.isSymbolicLink(), 'PRODUCT_FILE_NOT_REGULAR:' + path);
  return readFileSync(resolved);
}
function walk(root, path) {
  const full = safePath(root, path), info = lstatSync(full);
  require(!info.isSymbolicLink(), 'VENDOR_SYMLINK_FORBIDDEN');
  if (info.isFile()) return [path];
  require(info.isDirectory(), 'VENDOR_FILE_TYPE_UNSUPPORTED');
  return readdirSync(full).sort().flatMap(name => walk(root, path + '/' + name));
}
function evidenceUrl(repository, value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/' + repository + '/') && !url.username && !url.password;
  } catch { return false; }
}

export function validateProvenanceV2(root = productRoot, options = {}) {
  root = resolve(root);
  const catalog = options.catalog ?? parseStrict(regularFile(root, 'provenance/sources.json'));
  require(catalog.schema === 'receiptos.verify.sources.v1', 'SOURCE_CATALOG_SCHEMA');
  require(Array.isArray(catalog.repositoryReuse) && catalog.repositoryReuse.length === 43, 'HISTORICAL_REPOSITORY_COUNT');
  require(new Set(catalog.repositoryReuse.map(row => row.repository)).size === 43, 'HISTORICAL_REPOSITORY_DUPLICATE');
  const historicalRows = catalog.repositoryReuse.map(({ v02IntegrationIds, ...row }) => row);
  require(sha256(canonicalize(historicalRows)) === 'f4b4ea5918d6010bb5dd085749b952935ad1eaa2992c7d291e0aea51092f249d', 'HISTORICAL_REPOSITORY_ACCOUNT_CHANGED');
  require(Array.isArray(catalog.sources) && catalog.sources.length === 74 && sha256(canonicalize(catalog.sources)) === 'b0ce98e2d48d7a8cbb0ef65488806c393eb2a58e5130e691984d2e0926723548', 'HISTORICAL_SOURCE_ACCOUNT_CHANGED');
  require(catalog.v02Base?.commit === '62cd3e59c8f568496ed087d55f0aec3d63363b0a' && catalog.v02Base.tree === '8a5de5a3735e04f3f45cf164b59da17289693bc2', 'PUBLIC_BASE_IDENTITY_CHANGED');
  require(Array.isArray(catalog.v02Fragments) && catalog.v02Fragments.length === 3, 'SOURCE_FRAGMENT_COUNT');
  const fragments = new Map();
  for (const entry of catalog.v02Fragments) {
    require(['provenance/v02-semantic-abi.json', 'provenance/v02-trustless.json', 'provenance/v02-actions-prf.json'].includes(entry.path) && !fragments.has(entry.path), 'SOURCE_FRAGMENT_IDENTITY');
    const bytes = regularFile(root, entry.path);
    require(sha256(bytes) === entry.sha256, 'SOURCE_FRAGMENT_DIGEST');
    fragments.set(entry.path, { digest: entry.sha256, value: parseStrict(bytes) });
  }
  const integrations = catalog.v02Integrations;
  require(Array.isArray(integrations) && integrations.length === Object.keys(pins).length, 'V02_INTEGRATION_COUNT');
  require(new Set(integrations.map(row => row.capabilityId)).size === integrations.length, 'V02_INTEGRATION_DUPLICATE');
  const repositories = new Set(catalog.repositoryReuse.map(row => row.repository));
  const copied = new Map();
  for (const row of integrations) {
    require(pins[row.capabilityId] === row.sourceSHA, 'SOURCE_PIN_MISMATCH');
    require(repositories.has(row.repository), 'UNACCOUNTED_SOURCE_REPOSITORY');
    require(modes.has(row.integrationMode), 'INTEGRATION_MODE_UNSUPPORTED');
    require(maturities.has(row.maturity), 'INTEGRATION_MATURITY_UNSUPPORTED');
    require(row.ownershipIsNotAuthorship === true, 'OWNERSHIP_AUTHORSHIP_BOUNDARY_MISSING');
    require(typeof row.license === 'string' && /Apache-2\.0|CC0-1\.0|Unlicense|MIT/.test(row.license), 'SOURCE_LICENSE_MISSING');
    require(Array.isArray(row.sourcePaths) && row.sourcePaths.length > 0, 'SOURCE_PATHS_MISSING');
    for (const path of row.sourcePaths) {
      safePath(root, path);
      require(!/(^|\/)(vertice|invinoveritas)(\/|$)/i.test(path), 'EXCLUDED_SOURCE_PATH');
    }
    require(Array.isArray(row.productFiles) && row.productFiles.length > 0, 'PRODUCT_MAPPING_MISSING');
    for (const path of row.productFiles) regularFile(root, path);
    const fragment = fragments.get(row.sourceFragment);
    require(fragment && fragment.digest === row.sourceFragmentSHA256, 'INTEGRATION_FRAGMENT_BINDING');
    const sourceRecord = fragment.value.sources?.find(x => x.capabilityId === row.capabilityId) ?? fragment.value;
    require(sourceRecord.capabilityId === row.capabilityId && sourceRecord.sourceSHA === row.sourceSHA && sourceRecord.repository === row.repository, 'FRAGMENT_SOURCE_IDENTITY_MISMATCH');
    require(Array.isArray(row.contributionEvidence) && row.contributionEvidence.length > 0, 'CONTRIBUTION_EVIDENCE_MISSING');
    for (const evidence of row.contributionEvidence) {
      require(typeof (evidence.actor ?? evidence.github_login) === 'string' && !!(evidence.actor ?? evidence.github_login) && typeof evidence.role === 'string', 'CONTRIBUTION_IDENTITY_MISSING');
      require(evidenceUrl(row.repository, evidence.url ?? evidence.evidence_url), 'CONTRIBUTION_EVIDENCE_URL');
      if (evidence.commit) require(/^[0-9a-f]{40}$/.test(evidence.commit), 'CONTRIBUTION_COMMIT_MALFORMED');
    }
    if (row.sourcePR?.state === 'OPEN') require(row.maturity === 'EXPERIMENTAL' && row.sourcePR.merged === false && row.sourcePR.headSHA === row.sourceSHA, 'OPEN_PR_MISLABELED_AS_MAIN');
    for (const pr of row.upstreamPullRequests ?? []) if (pr.state === 'OPEN') {
      require(pr.maturity === 'EXPERIMENTAL', 'OPEN_PR_MATURITY_UNDECLARED');
      require(pr.used === false || (row.maturity === 'EXPERIMENTAL' && row.sourceSHA === pr.head), 'OPEN_PR_BEHAVIOR_MIXED_WITH_MAIN');
    }
    require(Array.isArray(row.copiedFiles), 'COPIED_FILE_INVENTORY_MISSING');
    for (const file of row.copiedFiles) {
      require(row.integrationMode === 'PINNED_SOURCE' || row.integrationMode === 'DEPENDENCY', 'COPIED_SOURCE_MODE_MISLABELED');
      require(!copied.has(file.productPath) && vendorRoots.some(prefix => file.productPath.startsWith(prefix + '/')), 'COPIED_PATH_DUPLICATE_OR_UNEXPECTED');
      require(row.sourcePaths.includes(file.sourcePath), 'COPIED_SOURCE_PATH_UNDECLARED');
      require(/^[0-9a-f]{64}$/.test(file.sha256) && /^[0-9a-f]{40}$/.test(file.gitBlob), 'COPIED_FILE_IDENTITY_MALFORMED');
      const bytes = regularFile(root, file.productPath);
      require(bytes.length === file.bytes && sha256(bytes) === file.sha256, 'COPIED_FILE_DIGEST:' + file.productPath);
      require(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex') === file.gitBlob, 'COPIED_FILE_GIT_BLOB:' + file.productPath);
      copied.set(file.productPath, row.capabilityId);
    }
  }
  require(copied.size === 14, 'NEW_VENDOR_FILE_COUNT');
  const actualFiles = vendorRoots.flatMap(path => walk(root, path));
  require(actualFiles.length === copied.size && actualFiles.every(path => copied.has(path)), 'UNDECLARED_NEW_VENDOR_BYTES');
  for (const row of catalog.repositoryReuse) {
    const expected = integrations.filter(item => item.repository === row.repository).map(item => item.capabilityId);
    require(Array.isArray(row.v02IntegrationIds) && equalList(row.v02IntegrationIds, expected), 'REPOSITORY_V02_MAPPING_MISMATCH');
  }
  for (const extension of catalog.v02ProductExtensions ?? []) {
    require(modes.has(extension.integrationMode) && maturities.has(extension.maturity), 'PRODUCT_EXTENSION_MODE');
    require(extension.basisCapabilityIds.every(id => Object.hasOwn(pins, id)) && extension.baselineCapabilityIds.every(id => catalog.sources.some(row => row.capabilityId === id)), 'PRODUCT_EXTENSION_SOURCE_UNKNOWN');
    for (const path of extension.productFiles) regularFile(root, path);
  }
  require(catalog.v02ProductExtensions?.length === 1, 'PRODUCT_EXTENSION_MAPPING_MISSING');
  require(sha256(regularFile(root, 'LICENSE')) === 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30', 'PRODUCT_LICENSE_CHANGED');
  const notice = regularFile(root, 'NOTICE').toString('utf8');
  require(notice.includes('Copyright 2026 Pavlo Tvardovskyi'), 'PRODUCT_COPYRIGHT_NOTICE_MISSING');
  const third = regularFile(root, 'THIRD_PARTY_NOTICES.md').toString('utf8');
  for (const name of ['trustless-ai/semantic-abi', 'trustless-ai/recompute-kit', 'Interpoll1/decentralised', 'pipavlo82/protected-relation-fixtures']) require(notice.includes(name) && third.includes(name), 'UPSTREAM_NOTICE_MISSING');
  for (const path of vendorRoots) require(third.includes(path + '/LICENSE'), 'UPSTREAM_LICENSE_NOTICE_MISSING');
  const grants = [
    ['vendor/semantic-abi-v02/LICENSE', 'Apache License'], ['vendor/recompute-kit-v02/LICENSE', 'CC0'],
    ['vendor/interpoll-v02/LICENSE', 'public domain'], ['vendor/prf-v02/LICENSE', 'MIT License'],
  ];
  for (const [path, marker] of grants) require(regularFile(root, path).toString('utf8').includes(marker), 'UPSTREAM_LICENSE_TEXT_MISSING');
  const npm = parseStrict(regularFile(root, 'provenance/npm-licenses.json'));
  // npm's lock format uses an empty package key for the root project, outside
  // the product request parser's nonempty-key domain. This local lock is also
  // byte-bound by source-lock; it is not an untrusted verification request.
  const npmLock = JSON.parse(regularFile(root, 'package-lock.json').toString('utf8'));
  const packageManifest = parseStrict(regularFile(root, 'package.json'));
  const packagePattern = /^node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)*$/;
  const lockedPackages = Object.entries(npmLock.packages ?? {}).filter(([path]) => path !== '');
  require(npm.schema === 'receiptos.verify.npm-license-preservation.v1' && Array.isArray(npm.packages) && npm.packages.length === lockedPackages.length && lockedPackages.length === 26, 'NPM_LICENSE_INVENTORY_CHANGED');
  const historicalNames = ['@noble/curves', '@noble/hashes', 'ajv', 'fast-deep-equal', 'fast-uri', 'json-schema-traverse', 'require-from-string'];
  const historicalNpm = npm.packages.filter(row => !row.packagePath && historicalNames.includes(row.name));
  require(historicalNpm.length === 7 && sha256(canonicalize(historicalNpm)) === 'b6c00f68018acdda3c7827124230a204d85d3dc59543e596deffdbf6ad545d30', 'HISTORICAL_NPM_LICENSE_IDENTITY_CHANGED');
  const npmPaths = new Set(), legalPaths = new Set();
  for (const row of npm.packages) {
    const path = row.packagePath ?? 'node_modules/' + row.name;
    require(packagePattern.test(path) && !npmPaths.has(path), 'NPM_PACKAGE_PATH_DUPLICATE_OR_UNSAFE');
    npmPaths.add(path);
    const locked = npmLock.packages[path];
    const name = path.slice(path.lastIndexOf('node_modules/') + 'node_modules/'.length);
    require(locked && row.name === name && ['version', 'license', 'resolved', 'integrity'].every(key => row[key] === locked[key]), 'NPM_LOCK_IDENTITY_MISMATCH');
    require(/^https:\/\/registry\.npmjs\.org\//.test(row.resolved) && /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(row.integrity), 'NPM_PACKAGE_PUBLICATION_IDENTITY_MISSING');
    require(['MIT', 'BSD-3-Clause', 'ISC', 'Apache-2.0'].includes(row.license), 'NPM_LICENSE_GRANT_UNSUPPORTED');
    require(Array.isArray(row.legal) && row.legal.length > 0, 'NPM_LICENSE_FILES_MISSING');
    for (const file of row.legal) {
      require(file.path.startsWith('vendor/licenses/') && !legalPaths.has(file.path), 'NPM_LICENSE_PATH_DUPLICATE_OR_UNEXPECTED');
      legalPaths.add(file.path);
      require(sha256(regularFile(root, file.path)) === file.sha256, 'NPM_LICENSE_BYTES_CHANGED');
    }
  }
  require(lockedPackages.every(([path]) => npmPaths.has(path)), 'NPM_LOCK_PACKAGE_UNACCOUNTED');
  const actualLegal = walk(root, 'vendor/licenses');
  require(actualLegal.length === legalPaths.size && actualLegal.every(path => legalPaths.has(path)), 'NPM_LICENSE_BYTES_UNDECLARED');
  require(packageManifest.dependencies?.xrpl === '5.3.0' && packageManifest.dependencies?.canonicalize === '5.1.0' && npmLock.packages[''].dependencies.xrpl === '5.3.0' && npmLock.packages[''].dependencies.canonicalize === '5.1.0', 'XRPL_DIRECT_DEPENDENCY_PIN_CHANGED');
  require(catalog.xrplPoc?.path === 'provenance/xrpl-poc.json', 'XRPL_PROVENANCE_FRAGMENT_MISSING');
  const xrplBytes = regularFile(root, catalog.xrplPoc.path);
  require(sha256(xrplBytes) === catalog.xrplPoc.sha256, 'XRPL_PROVENANCE_FRAGMENT_DIGEST');
  const xrplPoc = parseStrict(xrplBytes);
  require(xrplPoc.schema === 'receiptos.verify.xrpl-poc-provenance.v1' && xrplPoc.baseReceiptOS.commit === '6b403702628f216933d4b30a130f74ac5c81171d' && xrplPoc.maturity === 'EXPERIMENTAL', 'XRPL_PROVENANCE_SCOPE');
  for (const dependency of xrplPoc.dependencies ?? []) {
    const row = npm.packages.find(item => (item.packagePath ?? 'node_modules/' + item.name) === 'node_modules/' + dependency.name);
    require(row && ['version', 'license', 'resolved', 'integrity'].every(key => row[key] === dependency[key]) && dependency.integrationMode === 'DEPENDENCY', 'XRPL_DEPENDENCY_PROVENANCE_MISMATCH');
  }
  require(xrplPoc.dependencies?.length === 2, 'XRPL_DEPENDENCY_PROVENANCE_COUNT');
  for (const path of xrplPoc.productFiles ?? []) regularFile(root, path);
  require(xrplPoc.productFiles?.length >= 4 && xrplPoc.noPrivateOrUpstreamCodeAdded === true, 'XRPL_PRODUCT_SOURCE_MAPPING_MISSING');
  return { status: 'PASS', publicBase: catalog.v02Base.commit, historicalRepositories: 43, historicalSourceEntries: 74, newIntegrations: integrations.length, newSourceRepositories: new Set(integrations.map(row => row.repository)).size, newVendorFiles: copied.size, sourceFragments: fragments.size, npmLicensePackages: npm.packages.length, historicalNpmLicensePackages: historicalNpm.length, xrplPocDependencies: xrplPoc.dependencies.length, boundary: 'Offline identity/attribution/notice consistency; not independent authorship adjudication, legal opinion, XRPL consensus or semantic soundness proof.' };
}
const equalList = (a, b) => a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index]);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(JSON.stringify(validateProvenanceV2()) + '\n'); }
  catch (error) { process.stderr.write(JSON.stringify({ status: 'FAIL', reason: error.code ?? error.message }) + '\n'); process.exitCode = 1; }
}
