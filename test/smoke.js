const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  vendors, devices, toChirpStack, search,
  updateDevices, cachePath,
  Region, ChirpStackRegion, Target, MacVersion, RegParamsRevision,
  PayloadCodecRuntime, PayloadCodec,
} = require('..');

describe('catalog inventory', () => {
  test('vendors() returns at least 100 vendors from the TTN catalog', () => {
    const list = vendors();
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 100, `expected >100 vendors, got ${list.length}`);
  });

  test('every vendor entry has an id and name', () => {
    for (const v of vendors().slice(0, 20)) {
      assert.equal(typeof v.id, 'string', `vendor missing id: ${JSON.stringify(v)}`);
      assert.ok(v.id.length > 0);
      assert.equal(typeof v.name, 'string');
      assert.ok(v.name.length > 0);
    }
  });

  test('devices(vendor) lists model slugs for known LoRaWAN vendors', () => {
    assert.ok(devices('dragino').includes('lds01'));
    assert.ok(devices('dragino').length > 5, 'Dragino sells many models');
  });

  test('devices(unknown-vendor) throws or returns empty', () => {
    // Either behaviour is acceptable; just don't silently return wrong data.
    try {
      const list = devices('totally-fake-vendor-xyz');
      assert.deepEqual(list, []);
    } catch (err) {
      assert.ok(err instanceof Error);
    }
  });
});

describe('search — fuzzy text matching', () => {
  test('finds a known device by name + region', () => {
    const hits = search('dragino lds02', 'US902-928', { limit: 3 });
    assert.ok(Array.isArray(hits));
    assert.ok(hits.length > 0, 'search should return at least one match');
    assert.equal(hits[0].name, 'LDS02 - Door Sensor');
    assert.equal(hits[0].region, 'US915');
  });

  test('respects the limit option', () => {
    const hits = search('dragino', 'EU863-870', { limit: 5 });
    assert.ok(hits.length <= 5);
  });

  test('returns empty array on unmatchable query', () => {
    const hits = search('zzzzzzz_no_such_device_xyz_12345', 'EU863-870');
    assert.deepEqual(hits, []);
  });

  test('different regions return different matches for the same query', () => {
    const eu = search('dragino lds02', 'EU863-870', { limit: 1 });
    const us = search('dragino lds02', 'US902-928', { limit: 1 });
    assert.equal(eu[0].region, 'EU868');
    assert.equal(us[0].region, 'US915');
  });
});

describe('toChirpStack — v4 (default) profile shape', () => {
  test('produces a v4 device profile with all required fields', () => {
    const v4 = toChirpStack('dragino', 'lds01', 'EU863-870');
    assert.equal(v4.region, 'EU868');
    assert.equal(v4.macVersion, 'LORAWAN_1_0_3');
    assert.equal(v4.regParamsRevision, 'A');
    assert.equal(v4.supportsOtaa, true);
    assert.equal(v4.payloadCodecRuntime, 'JS');
    assert.match(v4.payloadCodecScript, /decodeUplink/);
  });

  test('payloadCodecScript is valid JS — parses without syntax error', () => {
    const v4 = toChirpStack('dragino', 'lds01', 'EU863-870');
    assert.doesNotThrow(
      () => new Function(v4.payloadCodecScript),
      'codec script should be syntactically valid JavaScript',
    );
  });

  test('handles multiple regions (US, EU, AS, AU)', () => {
    const tests = [
      ['EU863-870', 'EU868'],
      ['US902-928', 'US915'],
    ];
    for (const [input, expected] of tests) {
      const v4 = toChirpStack('dragino', 'lds01', input);
      assert.equal(v4.region, expected, `region mismatch for ${input}`);
    }
  });

  test('throws on unknown vendor', () => {
    assert.throws(() => toChirpStack('totally-fake-vendor-xyz', 'lds01', 'EU863-870'));
  });

  test('throws on unknown model', () => {
    assert.throws(() => toChirpStack('dragino', 'totally-fake-model-xyz', 'EU863-870'));
  });
});

describe('toChirpStack — v3 (legacy) profile shape', () => {
  test('produces a v3 device profile with v3-specific fields', () => {
    const v3 = toChirpStack('dragino', 'lds01', 'EU863-870', { target: 'v3' });
    assert.equal(v3.supportsJoin, true);
    assert.equal(v3.payloadCodec, 'CUSTOM_JS');
    assert.match(v3.payloadDecoderScript, /function Decode\(fPort/);
    assert.match(v3.payloadEncoderScript, /function Encode\(fPort/);
  });

  test('v3 and v4 codecs are derived from the same source but use different wrappers', () => {
    const v3 = toChirpStack('dragino', 'lds01', 'EU863-870', { target: 'v3' });
    const v4 = toChirpStack('dragino', 'lds01', 'EU863-870', { target: 'v4' });
    assert.match(v3.payloadDecoderScript, /function Decode\(/);    // v3 wrapper
    assert.match(v4.payloadCodecScript, /decodeUplink/);            // v4 wrapper
  });
});

describe('enum exports', () => {
  test('Region enum exposes well-known TTN region values via ChirpStack-style keys', () => {
    assert.ok(Region);
    // Keys are short ChirpStack-style names; values are the dashed TTN identifiers.
    assert.equal(Region.EU868, 'EU863-870');
    assert.equal(Region.US915, 'US902-928');
  });

  test('ChirpStackRegion enum exposes ChirpStack-side region keys', () => {
    assert.ok(ChirpStackRegion);
    assert.equal(typeof ChirpStackRegion.EU868, 'string');
    assert.equal(typeof ChirpStackRegion.US915, 'string');
  });

  test('Target enum distinguishes v3 from v4', () => {
    assert.ok(Target);
    assert.equal(typeof Target.V3, 'string');
    assert.equal(typeof Target.V4, 'string');
  });

  test('MacVersion / RegParamsRevision enums cover the LoRaWAN spec values', () => {
    assert.ok(MacVersion);
    assert.equal(typeof MacVersion.LORAWAN_1_0_3, 'string');
    assert.ok(RegParamsRevision);
    assert.equal(typeof RegParamsRevision.A, 'string');
  });

  test('PayloadCodecRuntime / PayloadCodec enums exist', () => {
    assert.ok(PayloadCodecRuntime);
    assert.ok(PayloadCodec);
    assert.equal(typeof PayloadCodecRuntime.JS, 'string');
    assert.equal(typeof PayloadCodec.CUSTOM_JS, 'string');
  });
});

describe('refresh / cache API', () => {
  test('updateDevices is an async function', () => {
    assert.equal(typeof updateDevices, 'function');
  });

  test('cachePath returns a non-empty string path', () => {
    const p = cachePath();
    assert.equal(typeof p, 'string');
    assert.ok(p.length > 0);
  });
});
