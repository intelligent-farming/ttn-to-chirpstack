// Shared enums, types, and pure helper functions. Both the Node entry
// (`src/index.ts`) and the browser entry (`src/browser.ts`) import from
// here so the public type surface is exactly the same regardless of which
// transport actually runs.
//
// Nothing in this file touches `fs`, `path`, `os`, or `https` — it's safe
// to bundle for any environment.

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/** TTN region key as used in `firmwareVersions[].profiles`. Pass to `toChirpStack` / `search`. */
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

export interface Vendor {
  id: string;
  name: string;
  /**
   * IEEE/LoRa-Alliance vendor ID, when assigned. Not every TTN catalog entry
   * has one (some community-submitted vendors are unlisted), so callers
   * should treat this as advisory.
   */
  vendorID?: number;
}

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

export interface ToChirpStackOptions {
  target?: TargetInput;
  firmware?: number | string;
}

export interface SearchOptions extends ToChirpStackOptions {
  limit?: number;
}

/* -------------------------------------------------------------------------- */
/* Internal types                                                              */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Yaml = any;

export interface LoadedDevice {
  name: string;
  description: string;
  profile: Yaml;
  script: string | null;
  region: RegionInput;
}

export interface SearchIndexEntry {
  vendor: string;
  device: string;
  searchText: string;
  regions: string[];
}

/* -------------------------------------------------------------------------- */
/* Pure helpers (no fs, no platform deps)                                      */
/* -------------------------------------------------------------------------- */

export const REGIONS: Record<RegionInput, ChirpStackRegion> = {
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

export const ADAPTER = `
function Decode(fPort, bytes, variables) { return decodeUplink({ fPort: fPort, bytes: bytes, variables: variables }).data; }
function Encode(fPort, obj, variables) { return encodeDownlink({ fPort: fPort, data: obj, variables: variables }).bytes; }
`;

export const toMacVersion = (v: string | number): MacVersion =>
  ('LORAWAN_' + [...String(v).split('.'), '0', '0', '0'].slice(0, 3).join('_')) as MacVersion;

export const toRegParams = (r: string): RegParamsRevision => {
  if (/^RP002-/.test(r)) {
    return ('RP002_' + r.match(/(\d+\.\d+\.\d+)/)![1].replace(/\./g, '_')) as RegParamsRevision;
  }
  return r.endsWith('-RevB') ? RegParamsRevision.B : RegParamsRevision.A;
};

export const toV4 = ({ name, description, region, profile, script }: LoadedDevice): ChirpStackV4DeviceProfile => ({
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

export const toV3 = (loaded: LoadedDevice): ChirpStackV3DeviceProfile => {
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
