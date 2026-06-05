/**
 * Translate device definitions from TheThingsNetwork's `lorawan-devices`
 * repository into ChirpStack device profiles. ChirpStack v4 is the default
 * output; v3 is available via `{ target: Target.V3 }` and ships with a small
 * JS adapter so the TTN codec script keeps working under the v3 runtime.
 *
 * @packageDocumentation
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import YAML from 'yaml';
import * as tar from 'tar';
import Fuse from 'fuse.js';

import {
  Target,
  type RegionInput, type ToChirpStackOptions, type SearchOptions,
  type ChirpStackV4DeviceProfile, type ChirpStackV3DeviceProfile,
  type Vendor, type Yaml, type LoadedDevice, type SearchIndexEntry,
  toV3, toV4,
} from './types';

// Re-export all shared types and enums so existing consumers keep working.
export * from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

const BUNDLED = path.join(__dirname, '..', 'lorawan-devices', 'vendor');
const CACHE = process.env.TTN_CHIRPSTACK_CACHE
  || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ttn-to-chirpstack');
const CACHED = path.join(CACHE, 'vendor');
const TARBALL = 'https://codeload.github.com/TheThingsNetwork/lorawan-devices/tar.gz/refs/heads/master';

const root = (): string => fs.existsSync(CACHED) ? CACHED : BUNDLED;
const read = (...p: string[]): Yaml => YAML.parse(fs.readFileSync(path.join(root(), ...p), 'utf8'));

/* -------------------------------------------------------------------------- */
/* File loaders                                                                */
/* -------------------------------------------------------------------------- */

const loadCodec = (vendor: string, id: string): string => {
  const meta: Yaml = read(vendor, `${id}.yaml`);
  const file: string = (meta.uplinkDecoder || meta.downlinkEncoder || meta.downlinkDecoder).fileName;
  return fs.readFileSync(path.join(root(), vendor, file), 'utf8');
};

const loadDevice = (vendor: string, device: string, firmware: number | string | undefined, region: RegionInput): LoadedDevice => {
  const dev: Yaml = read(vendor, `${device}.yaml`);
  const fw = firmware != null
    ? dev.firmwareVersions.find((f: Yaml) => f.numeric === firmware || f.version === firmware)
    : dev.firmwareVersions[0];
  if (!fw) throw new Error(`firmware not found: ${vendor}/${device} ${firmware}`);
  const ref = fw.profiles[region];
  if (!ref) throw new Error(`region ${region} not supported by ${vendor}/${device}`);
  return {
    name: dev.name,
    description: dev.description,
    profile: read(vendor, `${ref.id}.yaml`),
    script: ref.codec ? loadCodec(vendor, ref.codec) : null,
    region,
  };
};

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * List vendors from the TTN repo, excluding entries marked `draft: true`.
 *
 * @example
 * ```ts
 * vendors().slice(0, 3); // [{ id: '1m2m', name: '1M2M', vendorID: 1 }, ...]
 * ```
 */
export const vendors = (): Vendor[] => read('index.yaml').vendors.filter((v: Yaml) => !v.draft);

/**
 * List the device IDs published by a vendor.
 *
 * @param vendor - Vendor slug (e.g. `"dragino"`).
 *
 * @example
 * ```ts
 * devices('dragino').includes('lds01'); // true
 * ```
 */
export const devices = (vendor: string): string[] => read(vendor, 'index.yaml').endDevices;

/**
 * Translate a TTN device entry into a ChirpStack device profile.
 *
 * @param vendor - Vendor slug, e.g. `"dragino"`.
 * @param device - Device ID, e.g. `"lds01"`.
 * @param region - TTN region key (pass {@link Region} or the bare string).
 * @param opts   - {@link ToChirpStackOptions}.
 *
 * @example
 * ```ts
 * import { toChirpStack, Region, Target } from '@intelligent-farming/ttn-to-chirpstack';
 *
 * // ChirpStack v4 (default)
 * const v4 = toChirpStack('dragino', 'lds01', Region.EU868);
 *
 * // ChirpStack v3
 * const v3 = toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });
 *
 * // Pin firmware
 * toChirpStack('dragino', 'lds01', Region.EU868, { firmware: 1 });
 * ```
 */
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

// Non-overloaded internal entry point so {@link search} can dispatch with a
// dynamically-typed `opts` without confusing the overload resolver.
const buildProfile = (
  vendor: string,
  device: string,
  region: RegionInput,
  opts: ToChirpStackOptions,
): ChirpStackV4DeviceProfile | ChirpStackV3DeviceProfile =>
  opts.target === Target.V3
    ? toV3(loadDevice(vendor, device, opts.firmware, region))
    : toV4(loadDevice(vendor, device, opts.firmware, region));

/**
 * Pull the latest TTN `lorawan-devices` archive from GitHub and replace the
 * on-disk cache. Safe to call repeatedly from inside `node_modules` — the
 * cache lives outside the package directory (resolved from
 * `$TTN_CHIRPSTACK_CACHE`, `$XDG_CACHE_HOME`, or `~/.cache`).
 *
 * Invalidates the in-memory search index so the next {@link search} sees the
 * new data without a process restart.
 *
 * @returns The cache path that was written.
 *
 * @example
 * ```ts
 * await updateDevices();
 * ```
 */
export const updateDevices = (): Promise<string> => new Promise((resolve, reject) => {
  fs.mkdirSync(CACHE, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(CACHE, 'tmp-'));
  https.get(TARBALL, res => {
    if (res.statusCode !== 200) return reject(new Error(`download failed: HTTP ${res.statusCode}`));
    res.pipe(tar.x({ cwd: tmp, strip: 1, filter: (p: string) => p.split('/')[1] === 'vendor' }))
      .on('finish', () => {
        try {
          fs.rmSync(CACHED, { recursive: true, force: true });
          fs.renameSync(path.join(tmp, 'vendor'), CACHED);
          fs.rmSync(tmp, { recursive: true, force: true });
          _fuse = _searchIndex = undefined;
          resolve(CACHED);
        } catch (e) { reject(e); }
      })
      .on('error', reject);
  }).on('error', reject);
});

/**
 * Path that {@link updateDevices} writes into. Delete it (e.g. with
 * `fs.rmSync(cachePath(), {recursive:true, force:true})`) to roll back to
 * the bundled snapshot on the next read.
 */
export const cachePath = (): string => CACHED;

/* -------------------------------------------------------------------------- */
/* Fuzzy search                                                                */
/* -------------------------------------------------------------------------- */

let _searchIndex: SearchIndexEntry[] | undefined;
let _fuse: Fuse<SearchIndexEntry> | undefined;

const buildSearchIndex = (): SearchIndexEntry[] => {
  const out: SearchIndexEntry[] = [];
  for (const v of vendors()) {
    let ids: string[];
    try { ids = devices(v.id); } catch { continue; }
    for (const id of ids) {
      try {
        const dev: Yaml = read(v.id, `${id}.yaml`);
        out.push({
          vendor: v.id,
          device: id,
          searchText: [v.name, v.id, id, dev.name, dev.description].filter(Boolean).join(' '),
          regions: Object.keys(dev.firmwareVersions[0].profiles),
        });
      } catch { /* skip malformed entries */ }
    }
  }
  return out;
};

/**
 * Fuzzy-search the TTN catalog and return ChirpStack profiles for the best
 * matches in the given region. Use to show a shortlist of options when the
 * user only roughly knows the vendor and model.
 *
 * The first call builds an in-memory index of every vendor/device entry
 * (a few hundred ms cold disk); subsequent searches are instant. The index
 * is invalidated by {@link updateDevices}.
 *
 * @param query  - Search terms — vendor, device id, friendly name, or any mix.
 * @param region - TTN region key; devices not supporting it are skipped.
 * @param opts   - {@link SearchOptions}.
 *
 * @example
 * ```ts
 * import { search, Region } from '@intelligent-farming/ttn-to-chirpstack';
 * const hits = search('sensecap light', Region.EU868, { limit: 5 });
 * hits.forEach((p, i) => console.log(`${i + 1}. ${p.name}`));
 * ```
 */
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
    catch { /* edge cases like firmware override w/ different region set */ }
  }
  return out;
}
