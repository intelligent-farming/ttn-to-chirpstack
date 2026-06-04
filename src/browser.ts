/**
 * Browser entry: serves the TTN device catalog from a prebuilt JSON bundle
 * instead of reading YAML files via `fs`. Same public API as the Node entry
 * — `vendors()`, `devices()`, `toChirpStack()`, `search()` — but with the
 * curated subset of vendors baked in at install time by
 * `scripts/build-browser-catalog.js`.
 *
 * Selected automatically when bundlers see the `"browser"` field in this
 * package's `exports` map.
 *
 * @packageDocumentation
 */

import Fuse from 'fuse.js';

import {
  Target,
  type RegionInput, type ToChirpStackOptions, type SearchOptions,
  type ChirpStackV4DeviceProfile, type ChirpStackV3DeviceProfile,
  type Vendor, type Yaml, type LoadedDevice, type SearchIndexEntry,
  toV3, toV4,
} from './types';

export * from './types';

import catalog from '../data/browser-catalog.json';

/* -------------------------------------------------------------------------- */
/* Catalog shape                                                               */
/* -------------------------------------------------------------------------- */

interface BrowserCatalog {
  vendors: Vendor[];
  devices: Record<string, string[]>;
  deviceMetadata: Record<string, {
    name: string;
    description: string;
    firmwareVersions: Yaml[];
  }>;
  profiles: Record<string, Yaml>;
  codecs: Record<string, string>;
  builtAt: string;
}

const CATALOG = catalog as unknown as BrowserCatalog;

/** Timestamp from when the bundled catalog was prebuilt. */
export const builtAt = (): string => CATALOG.builtAt;

/* -------------------------------------------------------------------------- */
/* In-memory loaders (mirror Node's loadCodec / loadDevice)                    */
/* -------------------------------------------------------------------------- */

const loadDevice = (vendor: string, device: string, firmware: number | string | undefined, region: RegionInput): LoadedDevice => {
  const dev = CATALOG.deviceMetadata[`${vendor}/${device}`];
  if (!dev) throw new Error(`device not found in bundled catalog: ${vendor}/${device}`);
  const fw = firmware != null
    ? dev.firmwareVersions.find((f: Yaml) => f.numeric === firmware || f.version === firmware)
    : dev.firmwareVersions[0];
  if (!fw) throw new Error(`firmware not found: ${vendor}/${device} ${firmware}`);
  const ref = fw.profiles[region];
  if (!ref) throw new Error(`region ${region} not supported by ${vendor}/${device}`);
  const profile = CATALOG.profiles[`${vendor}/${ref.id}`];
  if (!profile) throw new Error(`profile not in bundled catalog: ${vendor}/${ref.id}`);
  const script = ref.codec ? (CATALOG.codecs[`${vendor}/${ref.codec}`] ?? null) : null;
  return {
    name: dev.name,
    description: dev.description,
    profile,
    script,
    region,
  };
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/** List the curated vendors shipped with this build. */
export const vendors = (): Vendor[] => CATALOG.vendors.slice();

/** List the device IDs for a curated vendor. Throws on unknown vendors. */
export const devices = (vendor: string): string[] => {
  const ids = CATALOG.devices[vendor];
  if (!ids) throw new Error(`vendor not in bundled catalog: ${vendor}. Did you mean to rebuild with CATALOG_VENDORS?`);
  return ids.slice();
};

/** Translate a TTN device entry into a ChirpStack device profile. */
export function toChirpStack(
  vendor: string,
  device: string,
  region: RegionInput,
  opts?: ToChirpStackOptions & { target?: Target.V4 | 'v4' },
): ChirpStackV4DeviceProfile;
export function toChirpStack(
  vendor: string,
  device: string,
  region: RegionInput,
  opts: ToChirpStackOptions & { target: Target.V3 | 'v3' },
): ChirpStackV3DeviceProfile;
export function toChirpStack(
  vendor: string,
  device: string,
  region: RegionInput,
  opts: ToChirpStackOptions = {},
): ChirpStackV4DeviceProfile | ChirpStackV3DeviceProfile {
  return buildProfile(vendor, device, region, opts);
}

const buildProfile = (
  vendor: string,
  device: string,
  region: RegionInput,
  opts: ToChirpStackOptions,
): ChirpStackV4DeviceProfile | ChirpStackV3DeviceProfile =>
  opts.target === Target.V3
    ? toV3(loadDevice(vendor, device, opts.firmware, region))
    : toV4(loadDevice(vendor, device, opts.firmware, region));

/* -------------------------------------------------------------------------- */
/* Fuzzy search                                                                */
/* -------------------------------------------------------------------------- */

let _searchIndex: SearchIndexEntry[] | undefined;
let _fuse: Fuse<SearchIndexEntry> | undefined;

const buildSearchIndex = (): SearchIndexEntry[] => {
  const out: SearchIndexEntry[] = [];
  for (const v of CATALOG.vendors) {
    const ids = CATALOG.devices[v.id] ?? [];
    for (const id of ids) {
      const dev = CATALOG.deviceMetadata[`${v.id}/${id}`];
      if (!dev || !dev.firmwareVersions?.[0]?.profiles) continue;
      out.push({
        vendor: v.id,
        device: id,
        searchText: [v.name, v.id, id, dev.name, dev.description].filter(Boolean).join(' '),
        regions: Object.keys(dev.firmwareVersions[0].profiles),
      });
    }
  }
  return out;
};

/** Fuzzy-search the curated catalog and return ChirpStack profiles. */
export function search(
  query: string,
  region: RegionInput,
  opts?: SearchOptions & { target?: Target.V4 | 'v4' },
): ChirpStackV4DeviceProfile[];
export function search(
  query: string,
  region: RegionInput,
  opts: SearchOptions & { target: Target.V3 | 'v3' },
): ChirpStackV3DeviceProfile[];
export function search(
  query: string,
  region: RegionInput,
  opts: SearchOptions = {},
): Array<ChirpStackV4DeviceProfile | ChirpStackV3DeviceProfile> {
  if (!_fuse) {
    _searchIndex = buildSearchIndex();
    _fuse = new Fuse(_searchIndex, {
      keys: ['searchText'],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }
  const limit = opts.limit ?? 10;
  const out: Array<ChirpStackV4DeviceProfile | ChirpStackV3DeviceProfile> = [];
  for (const { item } of _fuse.search(query)) {
    if (out.length >= limit) break;
    if (!item.regions.includes(region)) continue;
    try { out.push(buildProfile(item.vendor, item.device, region, opts)); }
    catch { /* edge: firmware override w/ different region set */ }
  }
  return out;
}

/**
 * Hits for a query without building the full ChirpStack profile. Cheap —
 * useful for autocomplete dropdowns where you only need vendor/device IDs.
 */
export interface SearchHit {
  vendor: string;
  device: string;
  name: string;
  regions: string[];
}

export const searchHits = (query: string, limit = 10): SearchHit[] => {
  if (!_fuse) {
    _searchIndex = buildSearchIndex();
    _fuse = new Fuse(_searchIndex, { keys: ['searchText'], threshold: 0.4, ignoreLocation: true });
  }
  const out: SearchHit[] = [];
  for (const { item } of _fuse.search(query)) {
    if (out.length >= limit) break;
    const dev = CATALOG.deviceMetadata[`${item.vendor}/${item.device}`];
    out.push({
      vendor: item.vendor,
      device: item.device,
      name: dev?.name ?? item.device,
      regions: item.regions,
    });
  }
  return out;
};
