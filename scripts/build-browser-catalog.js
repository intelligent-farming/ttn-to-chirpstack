#!/usr/bin/env node
// Prebuild a curated subset of the TTN device catalog into a single JSON file
// that the browser entry can `import` at bundle time.
//
// Why a curated subset? The full TheThingsNetwork/lorawan-devices repo has
// 200+ vendors and thousands of profile YAMLs — bundling all of it would
// inflate the SPA by 10+ MB. Leftenant only needs the vendors its operators
// actually ship. The list below covers the main LoRaWAN OEMs and matches the
// brands `lorawan-qr-decoder` already identifies via OUI.
//
// To add a vendor: append its slug to CURATED below, then re-run this script.
//   npm run build-browser-catalog

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const CURATED = (process.env.CATALOG_VENDORS ?? [
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

const main = () => {
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
    const deviceList = read(vendor, 'index.yaml').endDevices ?? [];
    catalog.devices[vendor] = deviceList;
    for (const device of deviceList) {
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
            if (ref.codec) {
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
