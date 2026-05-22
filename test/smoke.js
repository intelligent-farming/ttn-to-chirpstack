const assert = require('assert');
const { vendors, devices, toChirpStack, search, updateDevices, cachePath } = require('..');

assert.strictEqual(typeof updateDevices, 'function');
assert.strictEqual(typeof cachePath(), 'string');

const hits = search('dragino lds02', 'US902-928', { limit: 3 });
assert(Array.isArray(hits) && hits.length > 0, 'search should return at least one match');
assert.strictEqual(hits[0].name, 'LDS02 - Door Sensor');
assert.strictEqual(hits[0].region, 'US915');

assert(vendors().length > 100, 'vendor list should be populated');
assert(devices('dragino').includes('lds01'), 'dragino should list lds01');

const v4 = toChirpStack('dragino', 'lds01', 'EU863-870');
assert.strictEqual(v4.region, 'EU868');
assert.strictEqual(v4.macVersion, 'LORAWAN_1_0_3');
assert.strictEqual(v4.regParamsRevision, 'A');
assert.strictEqual(v4.supportsOtaa, true);
assert.strictEqual(v4.payloadCodecRuntime, 'JS');
assert(v4.payloadCodecScript.includes('decodeUplink'));

const v3 = toChirpStack('dragino', 'lds01', 'EU863-870', { target: 'v3' });
assert.strictEqual(v3.supportsJoin, true);
assert.strictEqual(v3.payloadCodec, 'CUSTOM_JS');
assert(v3.payloadDecoderScript.includes('function Decode(fPort'));
assert(v3.payloadEncoderScript.includes('function Encode(fPort'));

console.log('ok');
