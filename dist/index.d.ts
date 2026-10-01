/**
 * Translate device definitions from TheThingsNetwork's `lorawan-devices`
 * repository into ChirpStack device profiles. ChirpStack v4 is the default
 * output; v3 is available via `{ target: Target.V3 }` and ships with a small
 * JS adapter so the TTN codec script keeps working under the v3 runtime.
 *
 * @packageDocumentation
 */
import { Target, type RegionInput, type ToChirpStackOptions, type SearchOptions, type ChirpStackV4DeviceProfile, type ChirpStackV3DeviceProfile, type Vendor, type DeviceInfo } from './types';
export * from './types';
/**
 * List vendors from the TTN repo, excluding entries marked `draft: true`.
 *
 * @example
 * ```ts
 * vendors().slice(0, 3); // [{ id: '1m2m', name: '1M2M', vendorID: 1 }, ...]
 * ```
 */
export declare const vendors: () => Vendor[];
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
export declare const devices: (vendor: string) => string[];
/**
 * A device's name, description, and supported TTN region keys (from its first
 * firmware version), or `null` when the device has no YAML in the catalog.
 * Resolves devices missing from the vendor's `index.yaml`, as
 * {@link toChirpStack} does.
 *
 * @example
 * ```ts
 * deviceInfo('dragino', 'lds01')?.regions; // ['EU863-870', 'US902-928', ...]
 * ```
 */
export declare const deviceInfo: (vendor: string, device: string) => DeviceInfo | null;
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
export declare function toChirpStack(vendor: string, device: string, region: RegionInput, opts?: ToChirpStackOptions & {
    target?: Target.V4 | 'v4';
}): ChirpStackV4DeviceProfile;
export declare function toChirpStack(vendor: string, device: string, region: RegionInput, opts: ToChirpStackOptions & {
    target: Target.V3 | 'v3';
}): ChirpStackV3DeviceProfile;
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
export declare const updateDevices: () => Promise<string>;
/**
 * Path that {@link updateDevices} writes into. Delete it (e.g. with
 * `fs.rmSync(cachePath(), {recursive:true, force:true})`) to roll back to
 * the bundled snapshot on the next read.
 */
export declare const cachePath: () => string;
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
export declare function search(query: string, region: RegionInput, opts?: SearchOptions & {
    target?: Target.V4 | 'v4';
}): ChirpStackV4DeviceProfile[];
export declare function search(query: string, region: RegionInput, opts: SearchOptions & {
    target: Target.V3 | 'v3';
}): ChirpStackV3DeviceProfile[];
//# sourceMappingURL=index.d.ts.map