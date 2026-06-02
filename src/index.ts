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

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/** TTN region key as used in `firmwareVersions[].profiles`. Pass to {@link toChirpStack} / {@link search}. */
export enum Region {
  AS923 = 'AS923',
  AU915 = 'AU915-928',
  CN470 = 'CN470-510',
  CN779 = 'CN779-787',
  EU433 = 'EU433',
  EU868 = 'EU863-870',
  IN865 = 'IN865-867',
  KR920 = 'KR920-923',
  RU864 = 'RU864-870',
  US915 = 'US902-928',
}

/** ChirpStack's region enum, used in the returned device profile. */
export enum ChirpStackRegion {
  AS923 = 'AS923',
  AU915 = 'AU915',
  CN470 = 'CN470',
  CN779 = 'CN779',
  EU433 = 'EU433',
  EU868 = 'EU868',
  IN865 = 'IN865',
  KR920 = 'KR920',
  RU864 = 'RU864',
  US915 = 'US915',
}

/** Which ChirpStack API version to emit. */
export enum Target {
  V3 = 'v3',
  V4 = 'v4',
}

/** LoRaWAN MAC version string used by ChirpStack. */
export enum MacVersion {
  LORAWAN_1_0_0 = 'LORAWAN_1_0_0',
  LORAWAN_1_0_1 = 'LORAWAN_1_0_1',
  LORAWAN_1_0_2 = 'LORAWAN_1_0_2',
  LORAWAN_1_0_3 = 'LORAWAN_1_0_3',
  LORAWAN_1_0_4 = 'LORAWAN_1_0_4',
  LORAWAN_1_1_0 = 'LORAWAN_1_1_0',
}

/** ChirpStack regional-parameters revision. v3 only ever emits `A` or `B`. */
export enum RegParamsRevision {
  A = 'A',
  B = 'B',
  RP002_1_0_0 = 'RP002_1_0_0',
  RP002_1_0_1 = 'RP002_1_0_1',
  RP002_1_0_2 = 'RP002_1_0_2',
  RP002_1_0_3 = 'RP002_1_0_3',
}

/** ChirpStack v4 codec runtime. */
export enum PayloadCodecRuntime {
  NONE = 'NONE',
  JS = 'JS',
}

/** ChirpStack v3 codec discriminator. */
export enum PayloadCodec {
  NONE = '',
  CAYENNE_LPP = 'CAYENNE_LPP',
  CUSTOM_JS = 'CUSTOM_JS',
}

/** Accept either an enum value or its bare string equivalent. */
export type RegionInput = Region | `${Region}`;
/** Accept either an enum value or its bare string equivalent. */
export type TargetInput = Target | `${Target}`;

/* -------------------------------------------------------------------------- */
/* Public interfaces                                                           */
/* -------------------------------------------------------------------------- */

/** Vendor entry from `vendor/index.yaml`. */
export interface Vendor {
  id: string;
  name: string;
  vendorID: number;
}

/** Plain-object form of a ChirpStack v4 `DeviceProfile`. */
export interface ChirpStackV4DeviceProfile {
  name: string;
  description: string;
  region: ChirpStackRegion;
  macVersion: MacVersion;
  regParamsRevision: RegParamsRevision;
  supportsOtaa: boolean;
  supportsClassB: boolean;
  supportsClassC: boolean;
  classBTimeout?: number;
  classCTimeout?: number;
  payloadCodecRuntime: PayloadCodecRuntime;
  payloadCodecScript?: string;
}

/** Plain-object form of a ChirpStack v3 device profile (REST shape). */
export interface ChirpStackV3DeviceProfile {
  name: string;
  description: string;
  region: ChirpStackRegion;
  macVersion: MacVersion;
  regParamsRevision: RegParamsRevision.A | RegParamsRevision.B;
  supportsJoin: boolean;
  supportsClassB: boolean;
  supportsClassC: boolean;
  classBTimeout?: number;
  classCTimeout?: number;
  maxEIRP: number;
  supports32BitFCnt: boolean;
  payloadCodec: PayloadCodec;
  payloadDecoderScript: string;
  payloadEncoderScript: string;
}

/** Options accepted by {@link toChirpStack}. */
export interface ToChirpStackOptions {
  /** ChirpStack API version. Defaults to v4. */
  target?: TargetInput;
  /** Pin a specific firmware by `numeric` id or `version` string. Defaults to the first listed. */
  firmware?: number | string;
}

/** Options accepted by {@link search}. */
export interface SearchOptions extends ToChirpStackOptions {
  /** Cap on result count. Defaults to 10. */
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/* Internal types & paths                                                      */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Yaml = any;

interface LoadedDevice {
  name: string;
  description: string;
  profile: Yaml;
  script: string | null;
  region: RegionInput;
}

interface SearchIndexEntry {
  vendor: string;
  device: string;
  searchText: string;
  regions: string[];
}

const BUNDLED = path.join(__dirname, '..', 'lorawan-devices', 'vendor');
const CACHE = process.env.TTN_CHIRPSTACK_CACHE
  || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ttn-to-chirpstack');
const CACHED = path.join(CACHE, 'vendor');
const TARBALL = 'https://codeload.github.com/TheThingsNetwork/lorawan-devices/tar.gz/refs/heads/master';

const root = (): string => fs.existsSync(CACHED) ? CACHED : BUNDLED;
const read = (...p: string[]): Yaml => YAML.parse(fs.readFileSync(path.join(root(), ...p), 'utf8'));

/* -------------------------------------------------------------------------- */
/* TTN → ChirpStack mappers                                                    */
/* -------------------------------------------------------------------------- */

const toMacVersion = (v: string | number): MacVersion =>
  ('LORAWAN_' + [...String(v).split('.'), '0', '0', '0'].slice(0, 3).join('_')) as MacVersion;

const toRegParams = (r: string): RegParamsRevision => {
  if (/^RP002-/.test(r)) return ('RP002_' + r.match(/(\d+\.\d+\.\d+)/)![1].replace(/\./g, '_')) as RegParamsRevision;
  return r.endsWith('-RevB') ? RegParamsRevision.B : RegParamsRevision.A;
};

const REGIONS: Record<RegionInput, ChirpStackRegion> = {
  [Region.AS923]: ChirpStackRegion.AS923,
  [Region.AU915]: ChirpStackRegion.AU915,
  [Region.CN470]: ChirpStackRegion.CN470,
  [Region.CN779]: ChirpStackRegion.CN779,
  [Region.EU433]: ChirpStackRegion.EU433,
  [Region.EU868]: ChirpStackRegion.EU868,
  [Region.IN865]: ChirpStackRegion.IN865,
  [Region.KR920]: ChirpStackRegion.KR920,
  [Region.RU864]: ChirpStackRegion.RU864,
  [Region.US915]: ChirpStackRegion.US915,
};

const ADAPTER = `
function Decode(fPort, bytes, variables) { return decodeUplink({ fPort: fPort, bytes: bytes, variables: variables }).data; }
function Encode(fPort, obj, variables) { return encodeDownlink({ fPort: fPort, data: obj, variables: variables }).bytes; }
`;

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
/* Emitters                                                                    */
/* -------------------------------------------------------------------------- */

const toV4 = ({ name, description, region, profile, script }: LoadedDevice): ChirpStackV4DeviceProfile => ({
  name,
  description,
  region: REGIONS[region] ?? (region as unknown as ChirpStackRegion),
  macVersion: toMacVersion(profile.macVersion),
  regParamsRevision: toRegParams(profile.regionalParametersVersion),
  supportsOtaa: !!profile.supportsJoin,
  supportsClassB: !!profile.supportsClassB,
  supportsClassC: !!profile.supportsClassC,
  ...(profile.classBTimeout != null ? { classBTimeout: profile.classBTimeout as number } : {}),
  ...(profile.classCTimeout != null ? { classCTimeout: profile.classCTimeout as number } : {}),
  ...(script
    ? { payloadCodecRuntime: PayloadCodecRuntime.JS, payloadCodecScript: script }
    : { payloadCodecRuntime: PayloadCodecRuntime.NONE }),
});

const toV3 = (loaded: LoadedDevice): ChirpStackV3DeviceProfile => {
  const v4 = toV4(loaded);
  const { payloadCodecRuntime: _r, payloadCodecScript, supportsOtaa, regParamsRevision, ...rest } = v4;
  const wrapped = payloadCodecScript ? payloadCodecScript + ADAPTER : '';
  return {
    ...rest,
    supportsJoin: supportsOtaa,
    regParamsRevision: regParamsRevision === RegParamsRevision.B ? RegParamsRevision.B : RegParamsRevision.A,
    maxEIRP: loaded.profile.maxEIRP as number,
    supports32BitFCnt: !!loaded.profile.supports32bitFCnt,
    payloadCodec: wrapped ? PayloadCodec.CUSTOM_JS : PayloadCodec.NONE,
    payloadDecoderScript: wrapped,
    payloadEncoderScript: wrapped,
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
 * import { toChirpStack, Region, Target } from '@intelligentfarming/ttn-to-chirpstack';
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
 * import { search, Region } from '@intelligentfarming/ttn-to-chirpstack';
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
