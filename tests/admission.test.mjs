import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseStrict, canonicalize } from '../src/core/strict-json.mjs';

const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_CONTAINERS = 32;

function rejectsWithCode(action, label = 'invalid JSON input') {
  let observed;
  assert.throws(action, error => {
    assert.ok(error instanceof Error, `${label}: must throw an Error`);
    assert.equal(typeof error.code, 'string', `${label}: missing Error.code`);
    assert.ok(error.code.length > 0, `${label}: empty Error.code`);
    observed = error.code;
    return true;
  }, label);
  return observed;
}

function bytes(value) {
  const result = canonicalize(value);
  assert.ok(Buffer.isBuffer(result), 'canonicalize must return a UTF-8 Buffer');
  return result;
}

function nested(containers) {
  return '['.repeat(containers) + '0' + ']'.repeat(containers);
}

test('strict parser accepts strings and Buffers containing legal JSON values', () => {
  const cases = [
    ['null', null], ['true', true], ['false', false], ['0', 0], ['-1', -1],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
    ['-9007199254740991', Number.MIN_SAFE_INTEGER],
    ['"scalar"', 'scalar'], ['[]', []], ['[false,null,3]', [false, null, 3]],
  ];
  for (const [source, expected] of cases) {
    assert.deepEqual(parseStrict(source), expected);
    assert.deepEqual(parseStrict(Buffer.from(source, 'utf8')), expected);
  }
  assert.equal(bytes(parseStrict(' \r\n\t {"b":2,"a":1} \n')).toString(), '{"a":1,"b":2}');
});

test('duplicate keys are rejected at every object level, including escaped aliases', () => {
  for (const source of [
    '{"a":1,"a":2}', '{"a":1,"\\u0061":2}',
    '{"\\u0061":1,"a":2}', '{"\\u0061":1,"\\u0061":2}',
    '{"outer":{"id":1,"id":2}}', '[{"x":1,"\\u0078":2}]',
    '{"":1,"":2}', '{"a":1,"b":2,"a":3}',
  ]) rejectsWithCode(() => parseStrict(source), source);
  assert.equal(bytes(parseStrict('{"a":1,"A":2,"outer":{"a":3}}')).toString(),
    '{"A":2,"a":1,"outer":{"a":3}}');
});

test('malformed UTF-8 is rejected rather than replaced', () => {
  for (const payload of [
    [0x80], [0xff], [0xc0, 0xaf], [0xe0, 0x80, 0xaf],
    [0xed, 0xa0, 0x80], [0xf0, 0x80, 0x80, 0xaf],
    [0xf4, 0x90, 0x80, 0x80], [0xf0, 0x9f, 0x98], [0xc2],
  ]) {
    const input = Buffer.from([0x22, ...payload, 0x22]);
    rejectsWithCode(() => parseStrict(input), `UTF-8 ${Buffer.from(payload).toString('hex')}`);
  }
  assert.equal(parseStrict(Buffer.from('"�"', 'utf8')), '�',
    'an explicitly supplied valid replacement scalar is a valid string');
});

test('unpaired surrogate escapes and raw JS surrogate code units are rejected', () => {
  for (const source of [
    '"\\ud800"', '"\\udfff"', '"x\\ud800y"',
    '"\\ud800\\u0061"', '"\\udc00\\ud800"',
    '"' + '\ud800' + '"', '"' + '\udfff' + '"',
  ]) rejectsWithCode(() => parseStrict(source), 'unpaired surrogate');
  assert.equal(parseStrict('"\\ud83d\\ude00"'), '😀');
  assert.equal(bytes(parseStrict('"\\ud83d\\ude00"')).toString(), '"😀"');
});

test('keys must be nonempty printable ASCII after decoding; Unicode values remain allowed', () => {
  for (const source of [
    '{"é":1}', '{"\\u00e9":1}', '{"😀":1}', '{"\\ud83d\\ude00":1}',
    '{"":1}', '{"\\u0000":1}', '{"\\t":1}', '{"\\u007f":1}',
  ]) {
    rejectsWithCode(() => parseStrict(source), 'invalid object key');
  }
  assert.equal(bytes(parseStrict('{"value":"é é 😀 漢字"}')).toString(), '{"value":"é é 😀 漢字"}');
  assert.equal(bytes(parseStrict('{"\\u0061":1}')).toString(), '{"a":1}');
  assert.equal(bytes(parseStrict('{"~":1," ":0,"!":2}')).toString(), '{" ":0,"!":2,"~":1}');
  for (const key of ['', '\u0000', '\t', '\u007f']) {
    rejectsWithCode(() => canonicalize({ [key]: 1 }), 'invalid canonical object key');
  }
});

test('all three prototype-related keys are blocked, including nested and escaped forms', () => {
  for (const key of ['__proto__', 'prototype', 'constructor']) {
    rejectsWithCode(() => parseStrict(`{"${key}":1}`), key);
    rejectsWithCode(() => parseStrict(`{"outer":{"${key}":1}}`), key);
    const escaped = [...key].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    rejectsWithCode(() => parseStrict(`{"${escaped}":1}`), `escaped ${key}`);
    const value = Object.create(null);
    value[key] = 1;
    rejectsWithCode(() => canonicalize(value), `canonical ${key}`);
  }
  assert.equal(Object.prototype.polluted, undefined);
});

test('integer overflow, decimal/exponent tokens, negative zero and nonfinite tokens are rejected', () => {
  for (const source of [
    '9007199254740992', '-9007199254740992', '9007199254740993',
    '123456789012345678901234567890', '-0', '0.0', '-0.0', '1.0',
    '0.5', '1e0', '1E+0', '1e-0', '1e309', '-1e309',
    'NaN', 'Infinity', '-Infinity', '[1,2.0]', '{"x":9007199254740992}',
  ]) rejectsWithCode(() => parseStrict(source), source);
  for (const value of [NaN, Infinity, -Infinity, -0, 0.5, 1.1, 2 ** 53, -(2 ** 53)]) {
    rejectsWithCode(() => canonicalize(value), `canonical number ${String(value)}`);
  }
});

test('only JSON whitespace and one complete JSON value are accepted', () => {
  for (const source of [
    '', ' ', 'true false', '{}{}', '0 1', 'null trailing',
    '\ufeff{}', '\u00a0{}', '{}\u00a0', '\u000b{}',
    '{"a":1,}', '[1,]', '{a:1}', "{'a':1}",
    '{"a" 1}', '{"a":1 "b":2}', '[1 2]', '/*comment*/{}', '//comment\n{}',
    '01', '-01', '+1', '.5', '1.', '"unterminated', '"\\x41"', '"\\uZZZZ"',
    '"raw\nnewline"', '"raw\ttab"', '"raw\u0000nul"',
  ]) rejectsWithCode(() => parseStrict(source), 'malformed grammar or trailing token');
});

test('parser rejects values outside its string-or-Buffer API', () => {
  for (const input of [null, undefined, 0, true, {}, [], new Uint8Array([0x30])]) {
    rejectsWithCode(() => parseStrict(input), 'unsupported parser input type');
  }
});

test('nesting admits exactly 32 containers and rejects the 33rd', () => {
  assert.equal(bytes(parseStrict(nested(MAX_CONTAINERS))).toString(), nested(MAX_CONTAINERS));
  rejectsWithCode(() => parseStrict(nested(MAX_CONTAINERS + 1)), '33 nested arrays');
  let source = '0';
  for (let i = 0; i < MAX_CONTAINERS; i++) source = i % 2 ? `{"x":${source}}` : `[${source}]`;
  assert.equal(bytes(parseStrict(source)).toString(), source);
  rejectsWithCode(() => parseStrict(`[${source}]`), '33 mixed containers');
  let rawValue = 0;
  for (let i = 0; i <= MAX_CONTAINERS; i++) rawValue = [rawValue];
  rejectsWithCode(() => canonicalize(rawValue), 'canonical 33-container value');
});

test('document size is measured in raw UTF-8 bytes, including JSON punctuation and whitespace', () => {
  const atLimit = '"' + 'x'.repeat(MAX_DOCUMENT_BYTES - 2) + '"';
  assert.equal(Buffer.byteLength(atLimit), MAX_DOCUMENT_BYTES);
  assert.equal(parseStrict(atLimit).length, MAX_DOCUMENT_BYTES - 2);
  rejectsWithCode(() => parseStrict(atLimit + ' '), 'one raw byte above the limit');
  const multibyte = '"' + 'é'.repeat((MAX_DOCUMENT_BYTES - 2) / 2) + '"';
  assert.equal(Buffer.byteLength(multibyte), MAX_DOCUMENT_BYTES);
  assert.equal(parseStrict(Buffer.from(multibyte)).length, (MAX_DOCUMENT_BYTES - 2) / 2);
  rejectsWithCode(() => parseStrict(multibyte + ' '), 'UTF-8 byte limit, not JS string length');
  rejectsWithCode(() => parseStrict(Buffer.alloc(MAX_DOCUMENT_BYTES + 1, 0x20)), 'oversized whitespace');
  assert.equal(bytes('x'.repeat(MAX_DOCUMENT_BYTES - 2)).length, MAX_DOCUMENT_BYTES);
  rejectsWithCode(() => canonicalize('x'.repeat(MAX_DOCUMENT_BYTES - 1)), 'oversized canonical output');
});

test('canonical goldens preserve arrays, sort ASCII keys lexically and emit no terminal LF', () => {
  const golden = [
    ['{"b":2,"a":1}', '{"a":1,"b":2}'],
    ['{"2":2,"10":10,"1":1}', '{"1":1,"10":10,"2":2}'],
    ['{"z":null,"a":[3,1,2],"A":true,"_":false}', '{"A":true,"_":false,"a":[3,1,2],"z":null}'],
    ['{"outer":{"z":0,"a":[]},"empty":{}}', '{"empty":{},"outer":{"a":[],"z":0}}'],
    ['[9007199254740991,-9007199254740991,0]', '[9007199254740991,-9007199254740991,0]'],
    ['{"x":"\\u00e9","y":"e\\u0301","z":"\\ud83d\\ude00"}', '{"x":"é","y":"é","z":"😀"}'],
    ['{"x":"\\/\\b\\f\\n\\r\\t\\u0000\\\"\\\\"}', '{"x":"/\\b\\f\\n\\r\\t\\u0000\\\"\\\\"}'],
  ];
  for (const [source, expected] of golden) {
    const value = parseStrict(source);
    assert.deepEqual(bytes(value), Buffer.from(expected, 'utf8'), source);
    assert.equal(bytes(value).at(-1), Buffer.from(expected).at(-1));
    assert.deepEqual(bytes(parseStrict(bytes(value))), bytes(value), 'canonical round trip');
  }
});

test('Unicode scalars are preserved without normalization or unnecessary ASCII escaping', () => {
  const precomposed = bytes(parseStrict('"é"'));
  const decomposed = bytes(parseStrict('"e\\u0301"'));
  assert.notDeepEqual(precomposed, decomposed, 'NFC and NFD inputs must not collapse');
  assert.deepEqual(precomposed, Buffer.from('"é"'));
  assert.deepEqual(decomposed, Buffer.from('"é"'));
  assert.equal(bytes(parseStrict('"  "')).toString(), '"  "');
  assert.notDeepEqual(bytes([3, 1, 2]), bytes([1, 2, 3]));
});

test('canonicalizer accepts plain and null-prototype JSON dictionaries without changing input', () => {
  const value = { z: [3, { b: 2, a: 1 }], a: 'first' };
  const before = JSON.stringify(value);
  assert.equal(bytes(value).toString(), '{"a":"first","z":[3,{"a":1,"b":2}]}');
  assert.equal(JSON.stringify(value), before);
  const dictionary = Object.create(null);
  dictionary.b = 2;
  dictionary.a = 1;
  assert.equal(bytes(dictionary).toString(), '{"a":1,"b":2}');
});

test('canonicalizer refuses non-JSON types, cycles, sparse arrays and invalid keys/strings', () => {
  const cycle = {}; cycle.self = cycle;
  const arrayCycle = []; arrayCycle.push(arrayCycle);
  const inherited = Object.create({ inherited: true }); inherited.own = 1;
  const decoratedArray = [1]; decoratedArray.extra = 2;
  const symbolKey = { a: 1 }; symbolKey[Symbol('hidden')] = 2;
  const nonEnumerable = {}; Object.defineProperty(nonEnumerable, 'hidden', { value: 1 });
  for (const value of [
    undefined, () => 0, Symbol('x'), 1n, new Date(0), new Map(), new Set(),
    Buffer.from('x'), /x/, inherited, cycle, arrayCycle,
    new Array(1), [undefined], { x: undefined }, { x: () => 0 },
    decoratedArray, symbolKey, nonEnumerable, { 'é': 1 }, '\ud800', '\udfff',
  ]) rejectsWithCode(() => canonicalize(value), 'non-JSON canonical input');
});

test('canonicalizer rejects getters and toJSON without invoking producer code', () => {
  let calls = 0;
  const getter = {};
  Object.defineProperty(getter, 'a', { enumerable: true, get() { calls++; return 1; } });
  rejectsWithCode(() => canonicalize(getter), 'getter object');
  const toJSON = { toJSON() { calls++; return { a: 1 }; } };
  rejectsWithCode(() => canonicalize(toJSON), 'toJSON object');
  const arrayGetter = [1];
  Object.defineProperty(arrayGetter, '0', { enumerable: true, get() { calls++; return 1; } });
  rejectsWithCode(() => canonicalize(arrayGetter), 'array index getter');
  const arrayMethod = [1];
  Object.defineProperty(arrayMethod, 'map', { value() { calls++; return [1]; } });
  rejectsWithCode(() => canonicalize(arrayMethod), 'hidden array method override');
  assert.equal(calls, 0, 'admission must not invoke getters or toJSON');
});

test('error codes are stable across identical invalid input and canonicalizer calls', () => {
  assert.equal(rejectsWithCode(() => parseStrict('{"x":1,"x":2}')),
    rejectsWithCode(() => parseStrict('{"x":1,"x":2}')));
  assert.equal(rejectsWithCode(() => canonicalize(-0)), rejectsWithCode(() => canonicalize(-0)));
});

test('canonical bytes agree with an independent Python stdlib reference on legal goldens', t => {
  const values = [
    null, true, false, 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
    { '2': 2, '10': 10, '1': 1, a: 'é', A: 'é', z: '😀' },
    { controls: '\b\f\n\r\t\u0000"\\/', sequence: [3, 1, 2], nested: { z: null, a: [] } },
    { separators: '  ', text: '漢字', zero: 0 },
  ];
  const script = [
    'import json,sys',
    'values=json.loads(sys.stdin.buffer.read().decode("utf-8"))',
    'for value in values:',
    '    result=json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False)',
    '    print(result.encode("utf-8").hex())',
  ].join('\n');
  let result;
  for (const command of [process.env.RECEIPTOS_TEST_PYTHON, 'python', 'python3'].filter(Boolean)) {
    result = spawnSync(command, ['-I', '-c', script], {
      input: Buffer.from(JSON.stringify(values), 'utf8'), encoding: 'utf8', timeout: 10000,
      windowsHide: true,
    });
    if (!result.error) break;
  }
  if (result?.error?.code === 'ENOENT') return t.skip('Python stdlib runtime unavailable; hand-authored canonical goldens remain required');
  assert.ifError(result?.error);
  assert.equal(result.status, 0, result.stderr);
  const reference = result.stdout.trim().split(/\r?\n/);
  assert.equal(reference.length, values.length);
  for (let i = 0; i < values.length; i++) assert.equal(bytes(values[i]).toString('hex'), reference[i], `Python golden ${i}`);
});
