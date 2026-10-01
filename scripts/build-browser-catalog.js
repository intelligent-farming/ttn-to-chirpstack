#!/usr/bin/env node
// Prebuild a curated subset of the TTN device catalog into a single JSON file
// that the browser entry can `import` at bundle time.
//
// Why a curated subset? The full TheThingsNetwork/lorawan-devices repo has
// 200+ vendors and thousands of profile YAMLs — bundling all of it would
// inflate the SPA by 10+ MB. The catalog is the union of two sets:
//
//   1. FULL_VENDORS — every device from the main LoRaWAN OEMs, matching the
//      brands `lorawan-qr-decoder` already identifies via OUI. Override with
//      CATALOG_VENDORS=a,b,c.
//   2. Every device that has a non-draft codec in
//      @intelligent-farming/lorawan-codec-normalization, whatever its vendor.
//      Its codecs/<vendor>/<device>/ ids are TTN ids, so a device the registry
//      normalizes is always one the browser catalog can resolve. Only those
//      devices are added, not the vendor's whole line, and without their TTN
//      codec source (see below) — with it the bundle roughly triples.
//      CATALOG_NORMALIZED=0 skips this set.
//
// Re-run after either changes:
//   npm run build-browser-catalog

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const FULL_VENDORS = (process.env.CATALOG_VENDORS ?? [
  'adeunis',
  'browan',
  'decentlab',
  'dragino',
  'elsys',
  'mclimate',
  'milesight-iot',
  'rakwireless',
  'seeed',
  'sensecap',
  'tektelic',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const VENDOR_DIR = path.join(__dirname, '..', 'lorawan-devices', 'vendor');
const OUT = path.join(__dirname, '..', 'data', 'browser-catalog.json');

const read = (...p) => YAML.parse(fs.readFileSync(path.join(VENDOR_DIR, ...p), 'utf8'));

/**
 * vendor → device ids with a non-draft codec in lorawan-codec-normalization.
 * Fails loudly when the package is missing rather than silently shipping a
 * catalog without those devices — that silent gap is what kept Makerfabs out
 * of Leftenant's model search.
 */
const normalizedDevices = () => {
  if (process.env.CATALOG_NORMALIZED === '0') return new Map();
  let root;
  try {
    root = path.dirname(require.resolve('@intelligent-farming/lorawan-codec-normalization/package.json'));
  } catch {
    throw new Error(
      '@intelligent-farming/lorawan-codec-normalization is not installed (it is a devDependency). '
      + 'Run `npm install`, or set CATALOG_NORMALIZED=0 to build without it.',
    );
  }
  const codecsDir = path.join(root, 'codecs');
  const byVendor = new Map();
  for (const vendor of fs.readdirSync(codecsDir)) {
    const vendorDir = path.join(codecsDir, vendor);
    if (!fs.statSync(vendorDir).isDirectory()) continue;
    for (const device of fs.readdirSync(vendorDir)) {
      const deviceJson = path.join(vendorDir, device, 'device.json');
      if (!fs.existsSync(deviceJson) || !fs.existsSync(path.join(vendorDir, device, 'codec.js'))) continue;
      if (JSON.parse(fs.readFileSync(deviceJson, 'utf8')).draft) continue;
      if (!byVendor.has(vendor)) byVendor.set(vendor, new Set());
      byVendor.get(vendor).add(device);
    }
  }
  return byVendor;
};

const main = () => {
  const normalized = normalizedDevices();
  const CURATED = [...new Set([...FULL_VENDORS, ...normalized.keys()])];

  const vendorsIndex = read('index.yaml').vendors.filter(v => !v.draft);
  const includedVendors = vendorsIndex.filter(v => CURATED.includes(v.id));

  const catalog = {
    /** Subset of `vendors()` — just the curated entries. */
    vendors: includedVendors.map(v => ({ id: v.id, name: v.name, vendorID: v.vendorID })),
    /** `devices()` lookup table: vendorId → device IDs. */
    devices: {},
    /** Per-device YAML (firmwareVersions, name, description). Keyed `${vendor}/${device}`. */
    deviceMetadata: {},
    /** Per-profile YAML. Keyed `${vendor}/${profileId}`. */
    profiles: {},
    /** Codec source as strings. Keyed `${vendor}/${codecId}`. */
    codecs: {},
    builtAt: new Date().toISOString(),
  };

  let deviceCount = 0;
  let profileCount = 0;
  let codecCount = 0;

  for (const vendor of CURATED) {
    const dir = path.join(VENDOR_DIR, vendor);
    if (!fs.existsSync(dir)) {
      console.warn(`[skip] ${vendor}: not in lorawan-devices/`);
      continue;
    }
    const full = FULL_VENDORS.includes(vendor);
    const wanted = normalized.get(vendor) ?? new Set();
    const indexed = read(vendor, 'index.yaml').endDevices ?? [];
    // `devices` drives devices() and search, so it mirrors index.yaml exactly
    // as the Node entry does.
    const deviceList = full ? indexed : indexed.filter(d => wanted.has(d));
    catalog.devices[vendor] = deviceList;
    // A vendor's index.yaml can omit devices whose YAML is present (TTN's
    // dragino index lists 34 of ~200). Ship metadata and profiles for any
    // normalized device that has one, so toChirpStack() and deviceInfo()
    // resolve it, as they do in the Node entry, which reads the YAML directly.
    const unindexed = [...wanted].filter(d => !indexed.includes(d));
    for (const device of unindexed) {
      if (!fs.existsSync(path.join(dir, `${device}.yaml`))) {
        console.warn(`[skip device] ${vendor}/${device}: not in lorawan-devices/`);
      }
    }
    for (const device of [...deviceList, ...unindexed]) {
      if (!fs.existsSync(path.join(dir, `${device}.yaml`))) continue;
      // Devices present only for their normalized codec skip the TTN codec
      // source (see below).
      const withCodec = full && indexed.includes(device);
      try {
        const dev = read(vendor, `${device}.yaml`);
        catalog.deviceMetadata[`${vendor}/${device}`] = {
          name: dev.name,
          description: dev.description ?? '',
          firmwareVersions: dev.firmwareVersions ?? [],
        };
        deviceCount++;
        // Collect referenced profiles + codecs.
        for (const fw of dev.firmwareVersions ?? []) {
          for (const region of Object.keys(fw.profiles ?? {})) {
            const ref = fw.profiles[region];
            const profileKey = `${vendor}/${ref.id}`;
            if (!catalog.profiles[profileKey]) {
              try {
                catalog.profiles[profileKey] = read(vendor, `${ref.id}.yaml`);
                profileCount++;
              } catch (err) {
                console.warn(`[skip profile] ${profileKey}: ${err.message}`);
              }
            }
            // TTN codec source is ~93% of the catalog's bytes. A consumer that
            // pairs this catalog with lorawan-codec-normalization (as Leftenant
            // does) prefers the normalized codec and already bundles it, so
            // devices present only for that codec get no script from
            // toChirpStack().
            if (ref.codec && withCodec) {
              const codecKey = `${vendor}/${ref.codec}`;
              if (!catalog.codecs[codecKey]) {
                try {
                  const codecMeta = read(vendor, `${ref.codec}.yaml`);
                  const file = (codecMeta.uplinkDecoder || codecMeta.downlinkEncoder || codecMeta.downlinkDecoder).fileName;
                  catalog.codecs[codecKey] = fs.readFileSync(path.join(VENDOR_DIR, vendor, file), 'utf8');
                  codecCount++;
                } catch (err) {
                  console.warn(`[skip codec] ${codecKey}: ${err.message}`);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[skip device] ${vendor}/${device}: ${err.message}`);
      }
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(catalog));
  const bytes = fs.statSync(OUT).size;
  console.log(
    `wrote ${OUT}\n`
    + `  vendors:  ${catalog.vendors.length}\n`
    + `  devices:  ${deviceCount}\n`
    + `  profiles: ${profileCount}\n`
    + `  codecs:   ${codecCount}\n`
    + `  size:     ${(bytes / 1024).toFixed(0)} KB`,
  );
};

main();
