"use strict";
/**
 * Translate device definitions from TheThingsNetwork's `lorawan-devices`
 * repository into ChirpStack device profiles. ChirpStack v4 is the default
 * output; v3 is available via `{ target: Target.V3 }` and ships with a small
 * JS adapter so the TTN codec script keeps working under the v3 runtime.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachePath = exports.updateDevices = exports.deviceInfo = exports.devices = exports.vendors = void 0;
exports.toChirpStack = toChirpStack;
exports.search = search;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const yaml_1 = __importDefault(require("yaml"));
const tar = __importStar(require("tar"));
const fuse_js_1 = __importDefault(require("fuse.js"));
const types_1 = require("./types");
// Re-export all shared types and enums so existing consumers keep working.
__exportStar(require("./types"), exports);
/* eslint-disable @typescript-eslint/no-explicit-any */
const BUNDLED = path_1.default.join(__dirname, '..', 'lorawan-devices', 'vendor');
const CACHE = process.env.TTN_CHIRPSTACK_CACHE
    || path_1.default.join(process.env.XDG_CACHE_HOME || path_1.default.join(os_1.default.homedir(), '.cache'), 'ttn-to-chirpstack');
const CACHED = path_1.default.join(CACHE, 'vendor');
const TARBALL = 'https://codeload.github.com/TheThingsNetwork/lorawan-devices/tar.gz/refs/heads/master';
const root = () => fs_1.default.existsSync(CACHED) ? CACHED : BUNDLED;
const read = (...p) => yaml_1.default.parse(fs_1.default.readFileSync(path_1.default.join(root(), ...p), 'utf8'));
/* -------------------------------------------------------------------------- */
/* File loaders                                                                */
/* -------------------------------------------------------------------------- */
const loadCodec = (vendor, id) => {
    const meta = read(vendor, `${id}.yaml`);
    const file = (meta.uplinkDecoder || meta.downlinkEncoder || meta.downlinkDecoder).fileName;
    return fs_1.default.readFileSync(path_1.default.join(root(), vendor, file), 'utf8');
};
const loadDevice = (vendor, device, firmware, region) => {
    const dev = read(vendor, `${device}.yaml`);
    const fw = firmware != null
        ? dev.firmwareVersions.find((f) => f.numeric === firmware || f.version === firmware)
        : dev.firmwareVersions[0];
    if (!fw)
        throw new Error(`firmware not found: ${vendor}/${device} ${firmware}`);
    const ref = fw.profiles[region];
    if (!ref)
        throw new Error(`region ${region} not supported by ${vendor}/${device}`);
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
const vendors = () => read('index.yaml').vendors.filter((v) => !v.draft);
exports.vendors = vendors;
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
const devices = (vendor) => read(vendor, 'index.yaml').endDevices;
exports.devices = devices;
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
const deviceInfo = (vendor, device) => {
    if (!fs_1.default.existsSync(path_1.default.join(root(), vendor, `${device}.yaml`)))
        return null;
    const dev = read(vendor, `${device}.yaml`);
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
// Non-overloaded internal entry point so {@link search} can dispatch with a
// dynamically-typed `opts` without confusing the overload resolver.
const buildProfile = (vendor, device, region, opts) => opts.target === types_1.Target.V3
    ? (0, types_1.toV3)(loadDevice(vendor, device, opts.firmware, region))
    : (0, types_1.toV4)(loadDevice(vendor, device, opts.firmware, region));
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
const updateDevices = () => new Promise((resolve, reject) => {
    fs_1.default.mkdirSync(CACHE, { recursive: true });
    const tmp = fs_1.default.mkdtempSync(path_1.default.join(CACHE, 'tmp-'));
    https_1.default.get(TARBALL, res => {
        if (res.statusCode !== 200)
            return reject(new Error(`download failed: HTTP ${res.statusCode}`));
        res.pipe(tar.x({ cwd: tmp, strip: 1, filter: (p) => p.split('/')[1] === 'vendor' }))
            .on('finish', () => {
            try {
                fs_1.default.rmSync(CACHED, { recursive: true, force: true });
                fs_1.default.renameSync(path_1.default.join(tmp, 'vendor'), CACHED);
                fs_1.default.rmSync(tmp, { recursive: true, force: true });
                _fuse = _searchIndex = undefined;
                resolve(CACHED);
            }
            catch (e) {
                reject(e);
            }
        })
            .on('error', reject);
    }).on('error', reject);
});
exports.updateDevices = updateDevices;
/**
 * Path that {@link updateDevices} writes into. Delete it (e.g. with
 * `fs.rmSync(cachePath(), {recursive:true, force:true})`) to roll back to
 * the bundled snapshot on the next read.
 */
const cachePath = () => CACHED;
exports.cachePath = cachePath;
/* -------------------------------------------------------------------------- */
/* Fuzzy search                                                                */
/* -------------------------------------------------------------------------- */
let _searchIndex;
let _fuse;
const buildSearchIndex = () => {
    const out = [];
    for (const v of (0, exports.vendors)()) {
        let ids;
        try {
            ids = (0, exports.devices)(v.id);
        }
        catch {
            continue;
        }
        for (const id of ids) {
            try {
                const dev = read(v.id, `${id}.yaml`);
                out.push({
                    vendor: v.id,
                    device: id,
                    searchText: [v.name, v.id, id, dev.name, dev.description].filter(Boolean).join(' '),
                    regions: Object.keys(dev.firmwareVersions[0].profiles),
                });
            }
            catch { /* skip malformed entries */ }
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
        catch { /* edge cases like firmware override w/ different region set */ }
    }
    return out;
}
//# sourceMappingURL=index.js.map