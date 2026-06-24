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
import { Target, type RegionInput, type ToChirpStackOptions, type SearchOptions, type ChirpStackV4DeviceProfile, type ChirpStackV3DeviceProfile, type Vendor } from './types';
export * from './types';
/** Timestamp from when the bundled catalog was prebuilt. */
export declare const builtAt: () => string;
/** List the curated vendors shipped with this build. */
export declare const vendors: () => Vendor[];
/** List the device IDs for a curated vendor. Throws on unknown vendors. */
export declare const devices: (vendor: string) => string[];
/** Translate a TTN device entry into a ChirpStack device profile. */
export declare function toChirpStack(vendor: string, device: string, region: RegionInput, opts?: ToChirpStackOptions & {
    target?: Target.V4 | 'v4';
}): ChirpStackV4DeviceProfile;
export declare function toChirpStack(vendor: string, device: string, region: RegionInput, opts: ToChirpStackOptions & {
    target: Target.V3 | 'v3';
}): ChirpStackV3DeviceProfile;
/** Fuzzy-search the curated catalog and return ChirpStack profiles. */
export declare function search(query: string, region: RegionInput, opts?: SearchOptions & {
    target?: Target.V4 | 'v4';
}): ChirpStackV4DeviceProfile[];
export declare function search(query: string, region: RegionInput, opts: SearchOptions & {
    target: Target.V3 | 'v3';
}): ChirpStackV3DeviceProfile[];
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
export declare const searchHits: (query: string, limit?: number) => SearchHit[];
//# sourceMappingURL=browser.d.ts.map