/** TTN region key as used in `firmwareVersions[].profiles`. Pass to `toChirpStack` / `search`. */
export declare enum Region {
    AS923 = "AS923",
    AU915 = "AU915-928",
    CN470 = "CN470-510",
    CN779 = "CN779-787",
    EU433 = "EU433",
    EU868 = "EU863-870",
    IN865 = "IN865-867",
    KR920 = "KR920-923",
    RU864 = "RU864-870",
    US915 = "US902-928"
}
/** ChirpStack's region enum, used in the returned device profile. */
export declare enum ChirpStackRegion {
    AS923 = "AS923",
    AU915 = "AU915",
    CN470 = "CN470",
    CN779 = "CN779",
    EU433 = "EU433",
    EU868 = "EU868",
    IN865 = "IN865",
    KR920 = "KR920",
    RU864 = "RU864",
    US915 = "US915"
}
/** Which ChirpStack API version to emit. */
export declare enum Target {
    V3 = "v3",
    V4 = "v4"
}
/** LoRaWAN MAC version string used by ChirpStack. */
export declare enum MacVersion {
    LORAWAN_1_0_0 = "LORAWAN_1_0_0",
    LORAWAN_1_0_1 = "LORAWAN_1_0_1",
    LORAWAN_1_0_2 = "LORAWAN_1_0_2",
    LORAWAN_1_0_3 = "LORAWAN_1_0_3",
    LORAWAN_1_0_4 = "LORAWAN_1_0_4",
    LORAWAN_1_1_0 = "LORAWAN_1_1_0"
}
/** ChirpStack regional-parameters revision. v3 only ever emits `A` or `B`. */
export declare enum RegParamsRevision {
    A = "A",
    B = "B",
    RP002_1_0_0 = "RP002_1_0_0",
    RP002_1_0_1 = "RP002_1_0_1",
    RP002_1_0_2 = "RP002_1_0_2",
    RP002_1_0_3 = "RP002_1_0_3"
}
/** ChirpStack v4 codec runtime. */
export declare enum PayloadCodecRuntime {
    NONE = "NONE",
    JS = "JS"
}
/** ChirpStack v3 codec discriminator. */
export declare enum PayloadCodec {
    NONE = "",
    CAYENNE_LPP = "CAYENNE_LPP",
    CUSTOM_JS = "CUSTOM_JS"
}
/** Accept either an enum value or its bare string equivalent. */
export type RegionInput = Region | `${Region}`;
/** Accept either an enum value or its bare string equivalent. */
export type TargetInput = Target | `${Target}`;
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
/** Summary of one device entry, from {@link deviceInfo}. */
export interface DeviceInfo {
    name: string;
    description: string;
    /** TTN region keys the device's first firmware version has profiles for. */
    regions: string[];
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
export declare const REGIONS: Record<RegionInput, ChirpStackRegion>;
export declare const ADAPTER = "\nfunction Decode(fPort, bytes, variables) { return decodeUplink({ fPort: fPort, bytes: bytes, variables: variables }).data; }\nfunction Encode(fPort, obj, variables) { return encodeDownlink({ fPort: fPort, data: obj, variables: variables }).bytes; }\n";
export declare const toMacVersion: (v: string | number) => MacVersion;
export declare const toRegParams: (r: string) => RegParamsRevision;
export declare const toV4: ({ name, description, region, profile, script }: LoadedDevice) => ChirpStackV4DeviceProfile;
export declare const toV3: (loaded: LoadedDevice) => ChirpStackV3DeviceProfile;
//# sourceMappingURL=types.d.ts.map