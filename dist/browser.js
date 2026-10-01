"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchHits = exports.deviceInfo = exports.devices = exports.vendors = exports.builtAt = void 0;
exports.toChirpStack = toChirpStack;
exports.search = search;
const fuse_js_1 = __importDefault(require("fuse.js"));
const types_1 = require("./types");
__exportStar(require("./types"), exports);
const browser_catalog_json_1 = __importDefault(require("../data/browser-catalog.json"));
const CATALOG = browser_catalog_json_1.default;
/** Timestamp from when the bundled catalog was prebuilt. */
const builtAt = () => CATALOG.builtAt;
exports.builtAt = builtAt;
/* -------------------------------------------------------------------------- */
/* In-memory loaders (mirror Node's loadCodec / loadDevice)                    */
/* -------------------------------------------------------------------------- */
const loadDevice = (vendor, device, firmware, region) => {
    const dev = CATALOG.deviceMetadata[`${vendor}/${device}`];
    if (!dev)
        throw new Error(`device not found in bundled catalog: ${vendor}/${device}`);
    const fw = firmware != null
        ? dev.firmwareVersions.find((f) => f.numeric === firmware || f.version === firmware)
        : dev.firmwareVersions[0];
    if (!fw)
        throw new Error(`firmware not found: ${vendor}/${device} ${firmware}`);
    const ref = fw.profiles[region];
    if (!ref)
        throw new Error(`region ${region} not supported by ${vendor}/${device}`);
    const profile = CATALOG.profiles[`${vendor}/${ref.id}`];
    if (!profile)
        throw new Error(`profile not in bundled catalog: ${vendor}/${ref.id}`);
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
const vendors = () => CATALOG.vendors.slice();
exports.vendors = vendors;
/** List the device IDs for a curated vendor. Throws on unknown vendors. */
const devices = (vendor) => {
    const ids = CATALOG.devices[vendor];
    if (!ids)
        throw new Error(`vendor not in bundled catalog: ${vendor}. Did you mean to rebuild with CATALOG_VENDORS?`);
    return ids.slice();
};
exports.devices = devices;
/**
 * A device's name, description, and supported TTN region keys (from its first
 * firmware version), or `null` when the device is not in the bundled catalog.
 * Resolves devices that {@link devices} does not list (missing from the
 * vendor's `index.yaml`), as {@link toChirpStack} does.
 */
const deviceInfo = (vendor, device) => {
    const dev = CATALOG.deviceMetadata[`${vendor}/${device}`];
    if (!dev)
        return null;
    return {
        name: dev.name,
        description: dev.description ?? '',
        regions: Object.keys(dev.firmwareVersions?.[0]?.profiles ?? {}),
    };
};
exports.deviceInfo = deviceInfo;
function toChirpStack(vendor, device, region, opts = {}) {
    return buildProfile(vendor, device, region, opts);
}
const buildProfile = (vendor, device, region, opts) => opts.target === types_1.Target.V3
    ? (0, types_1.toV3)(loadDevice(vendor, device, opts.firmware, region))
    : (0, types_1.toV4)(loadDevice(vendor, device, opts.firmware, region));
/* -------------------------------------------------------------------------- */
/* Fuzzy search                                                                */
/* -------------------------------------------------------------------------- */
let _searchIndex;
let _fuse;
const buildSearchIndex = () => {
    const out = [];
    for (const v of CATALOG.vendors) {
        const ids = CATALOG.devices[v.id] ?? [];
        for (const id of ids) {
            const dev = CATALOG.deviceMetadata[`${v.id}/${id}`];
            if (!dev || !dev.firmwareVersions?.[0]?.profiles)
                continue;
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
function search(query, region, opts = {}) {
    if (!_fuse) {
        _searchIndex = buildSearchIndex();
        _fuse = new fuse_js_1.default(_searchIndex, {
            keys: ['searchText'],
            threshold: 0.4,
            ignoreLocation: true,
        });
    }
    const limit = opts.limit ?? 10;
    const out = [];
    for (const { item } of _fuse.search(query)) {
        if (out.length >= limit)
            break;
        if (!item.regions.includes(region))
            continue;
        try {
            out.push(buildProfile(item.vendor, item.device, region, opts));
        }
        catch { /* edge: firmware override w/ different region set */ }
    }
    return out;
}
const searchHits = (query, limit = 10) => {
    if (!_fuse) {
        _searchIndex = buildSearchIndex();
        _fuse = new fuse_js_1.default(_searchIndex, { keys: ['searchText'], threshold: 0.4, ignoreLocation: true });
    }
    const out = [];
    for (const { item } of _fuse.search(query)) {
        if (out.length >= limit)
            break;
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
exports.searchHits = searchHits;
//# sourceMappingURL=browser.js.map