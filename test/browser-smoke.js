// Smoke test for the prebuilt browser catalog. Loads `dist/browser.js`
// directly (bypassing the package.json conditional export, since Node will
// resolve the "default" condition to dist/index.js).
//
// The runtime is Node — we're not booting a browser. The point is to
// confirm the prebuilt JSON catalog deserializes, the public API works
// without any `fs` calls, and the profiles it emits match the Node entry's
// output for the curated vendors.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const browser = require('../dist/browser.js');
const node = require('../dist/index.js');
const { Region, Target } = browser;

describe('browser entry — catalog metadata', () => {
  test('builtAt is an ISO date', () => {
    const t = browser.builtAt();
    assert.equal(typeof t, 'string');
    assert.ok(!isNaN(Date.parse(t)), `expected ISO date, got "${t}"`);
  });

  test('exports the same symbols as the Node entry', () => {
    for (const name of ['vendors', 'devices', 'toChirpStack', 'search', 'Region', 'Target']) {
      assert.equal(typeof browser[name], typeof node[name], `${name} type mismatch`);
    }
  });

  test('catalog ships the curated LoRaWAN vendors', () => {
    const ids = new Set(browser.vendors().map(v => v.id));
    for (const expected of ['dragino', 'milesight-iot', 'rakwireless', 'browan', 'seeed']) {
      assert.ok(ids.has(expected), `missing curated vendor: ${expected}`);
    }
  });
});

describe('vendors / devices listing', () => {
  test('vendors() returns Vendor objects with id and name (vendorID is optional)', () => {
    for (const v of browser.vendors()) {
      assert.equal(typeof v.id, 'string');
      assert.equal(typeof v.name, 'string');
      if (v.vendorID !== undefined) assert.equal(typeof v.vendorID, 'number');
    }
  });

  test('devices() lists known Dragino models', () => {
    const list = browser.devices('dragino');
    assert.ok(list.length > 5, 'Dragino sells many models');
    assert.ok(list.includes('lds01'));
  });

  test('devices() throws for vendors outside the curated subset', () => {
    assert.throws(() => browser.devices('vendor-not-in-curated-list-xyz'),
      /not in bundled catalog/);
  });
});

describe('toChirpStack — v4', () => {
  test('produces a complete v4 profile for a known device', () => {
    const v4 = browser.toChirpStack('dragino', 'lds01', Region.EU868);
    assert.equal(v4.region, 'EU868');
    assert.equal(v4.macVersion, 'LORAWAN_1_0_3');
    assert.equal(v4.regParamsRevision, 'A');
    assert.equal(v4.supportsOtaa, true);
    assert.equal(v4.payloadCodecRuntime, 'JS');
    assert.match(v4.payloadCodecScript, /decodeUplink/);
  });

  test('output matches the Node entry exactly (same catalog, same logic)', () => {
    const fromBrowser = browser.toChirpStack('dragino', 'lds01', Region.EU868);
    const fromNode = node.toChirpStack('dragino', 'lds01', Region.EU868);
    assert.deepEqual(fromBrowser, fromNode);
  });

  test('throws on unknown vendor', () => {
    assert.throws(() => browser.toChirpStack('fake-vendor-xyz', 'lds01', Region.EU868));
  });

  test('throws on unknown model', () => {
    assert.throws(() => browser.toChirpStack('dragino', 'fake-model-xyz', Region.EU868));
  });

  test('throws on unsupported region for a real device', () => {
    // Try a region a Dragino device likely doesn't list.
    assert.throws(() => browser.toChirpStack('dragino', 'lds01', 'CN779-787'));
  });
});

describe('toChirpStack — v3', () => {
  test('emits v3 shape with wrapped codec', () => {
    const v3 = browser.toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });
    assert.equal(v3.supportsJoin, true);
    assert.equal(v3.payloadCodec, 'CUSTOM_JS');
    assert.match(v3.payloadDecoderScript, /function Decode\(fPort/);
    assert.match(v3.payloadEncoderScript, /function Encode\(fPort/);
  });
});

describe('search', () => {
  test('finds a Dragino device by friendly name', () => {
    const hits = browser.search('dragino lds02', Region.EU868, { limit: 3 });
    assert.ok(Array.isArray(hits));
    assert.ok(hits.length > 0);
    assert.match(hits[0].name, /LDS02/i);
  });

  test('respects the limit option', () => {
    const hits = browser.search('dragino', Region.EU868, { limit: 5 });
    assert.ok(hits.length <= 5);
  });

  test('returns empty array for unmatchable queries', () => {
    const hits = browser.search('zzzzzzz_no_such_device_xyz', Region.EU868);
    assert.deepEqual(hits, []);
  });

  test('searchHits returns lightweight metadata without building profiles', () => {
    const hits = browser.searchHits('dragino lds02', 3);
    assert.ok(hits.length > 0);
    for (const h of hits) {
      assert.equal(typeof h.vendor, 'string');
      assert.equal(typeof h.device, 'string');
      assert.equal(typeof h.name, 'string');
      assert.ok(Array.isArray(h.regions));
    }
  });
});

describe('isomorphism with Node entry', () => {
  test('search results for the same query match across entries', () => {
    const bro = browser.search('dragino', Region.EU868, { limit: 3 });
    const nod = node.search('dragino', Region.EU868, { limit: 3 });
    // Same fuse settings + same catalog data → same ordering.
    assert.equal(bro.length, nod.length);
    for (let i = 0; i < bro.length; i++) {
      assert.deepEqual(bro[i], nod[i], `mismatch at index ${i}`);
    }
  });
});
