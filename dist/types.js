"use strict";
// Shared enums, types, and pure helper functions. Both the Node entry
// (`src/index.ts`) and the browser entry (`src/browser.ts`) import from
// here so the public type surface is exactly the same regardless of which
// transport actually runs.
//
// Nothing in this file touches `fs`, `path`, `os`, or `https` — it's safe
// to bundle for any environment.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toV3 = exports.toV4 = exports.toRegParams = exports.toMacVersion = exports.ADAPTER = exports.REGIONS = exports.PayloadCodec = exports.PayloadCodecRuntime = exports.RegParamsRevision = exports.MacVersion = exports.Target = exports.ChirpStackRegion = exports.Region = void 0;
/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */
/** TTN region key as used in `firmwareVersions[].profiles`. Pass to `toChirpStack` / `search`. */
var Region;
(function (Region) {
    Region["AS923"] = "AS923";
    Region["AU915"] = "AU915-928";
    Region["CN470"] = "CN470-510";
    Region["CN779"] = "CN779-787";
    Region["EU433"] = "EU433";
    Region["EU868"] = "EU863-870";
    Region["IN865"] = "IN865-867";
    Region["KR920"] = "KR920-923";
    Region["RU864"] = "RU864-870";
    Region["US915"] = "US902-928";
})(Region || (exports.Region = Region = {}));
/** ChirpStack's region enum, used in the returned device profile. */
var ChirpStackRegion;
(function (ChirpStackRegion) {
    ChirpStackRegion["AS923"] = "AS923";
    ChirpStackRegion["AU915"] = "AU915";
    ChirpStackRegion["CN470"] = "CN470";
    ChirpStackRegion["CN779"] = "CN779";
    ChirpStackRegion["EU433"] = "EU433";
    ChirpStackRegion["EU868"] = "EU868";
    ChirpStackRegion["IN865"] = "IN865";
    ChirpStackRegion["KR920"] = "KR920";
    ChirpStackRegion["RU864"] = "RU864";
    ChirpStackRegion["US915"] = "US915";
})(ChirpStackRegion || (exports.ChirpStackRegion = ChirpStackRegion = {}));
/** Which ChirpStack API version to emit. */
var Target;
(function (Target) {
    Target["V3"] = "v3";
    Target["V4"] = "v4";
})(Target || (exports.Target = Target = {}));
/** LoRaWAN MAC version string used by ChirpStack. */
var MacVersion;
(function (MacVersion) {
    MacVersion["LORAWAN_1_0_0"] = "LORAWAN_1_0_0";
    MacVersion["LORAWAN_1_0_1"] = "LORAWAN_1_0_1";
    MacVersion["LORAWAN_1_0_2"] = "LORAWAN_1_0_2";
    MacVersion["LORAWAN_1_0_3"] = "LORAWAN_1_0_3";
    MacVersion["LORAWAN_1_0_4"] = "LORAWAN_1_0_4";
    MacVersion["LORAWAN_1_1_0"] = "LORAWAN_1_1_0";
})(MacVersion || (exports.MacVersion = MacVersion = {}));
/** ChirpStack regional-parameters revision. v3 only ever emits `A` or `B`. */
var RegParamsRevision;
(function (RegParamsRevision) {
    RegParamsRevision["A"] = "A";
    RegParamsRevision["B"] = "B";
    RegParamsRevision["RP002_1_0_0"] = "RP002_1_0_0";
    RegParamsRevision["RP002_1_0_1"] = "RP002_1_0_1";
    RegParamsRevision["RP002_1_0_2"] = "RP002_1_0_2";
    RegParamsRevision["RP002_1_0_3"] = "RP002_1_0_3";
})(RegParamsRevision || (exports.RegParamsRevision = RegParamsRevision = {}));
/** ChirpStack v4 codec runtime. */
var PayloadCodecRuntime;
(function (PayloadCodecRuntime) {
    PayloadCodecRuntime["NONE"] = "NONE";
    PayloadCodecRuntime["JS"] = "JS";
})(PayloadCodecRuntime || (exports.PayloadCodecRuntime = PayloadCodecRuntime = {}));
/** ChirpStack v3 codec discriminator. */
var PayloadCodec;
(function (PayloadCodec) {
    PayloadCodec["NONE"] = "";
    PayloadCodec["CAYENNE_LPP"] = "CAYENNE_LPP";
    PayloadCodec["CUSTOM_JS"] = "CUSTOM_JS";
})(PayloadCodec || (exports.PayloadCodec = PayloadCodec = {}));
/* -------------------------------------------------------------------------- */
/* Pure helpers (no fs, no platform deps)                                      */
/* -------------------------------------------------------------------------- */
exports.REGIONS = {
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
exports.ADAPTER = `
function Decode(fPort, bytes, variables) { return decodeUplink({ fPort: fPort, bytes: bytes, variables: variables }).data; }
function Encode(fPort, obj, variables) { return encodeDownlink({ fPort: fPort, data: obj, variables: variables }).bytes; }
`;
const toMacVersion = (v) => ('LORAWAN_' + [...String(v).split('.'), '0', '0', '0'].slice(0, 3).join('_'));
exports.toMacVersion = toMacVersion;
const toRegParams = (r) => {
    if (/^RP002-/.test(r)) {
        return ('RP002_' + r.match(/(\d+\.\d+\.\d+)/)[1].replace(/\./g, '_'));
    }
    return r.endsWith('-RevB') ? RegParamsRevision.B : RegParamsRevision.A;
};
exports.toRegParams = toRegParams;
const toV4 = ({ name, description, region, profile, script }) => ({
    name,
    description,
    region: exports.REGIONS[region] ?? region,
    macVersion: (0, exports.toMacVersion)(profile.macVersion),
    regParamsRevision: (0, exports.toRegParams)(profile.regionalParametersVersion),
    supportsOtaa: !!profile.supportsJoin,
    supportsClassB: !!profile.supportsClassB,
    supportsClassC: !!profile.supportsClassC,
    ...(profile.classBTimeout != null ? { classBTimeout: profile.classBTimeout } : {}),
    ...(profile.classCTimeout != null ? { classCTimeout: profile.classCTimeout } : {}),
    ...(script
        ? { payloadCodecRuntime: PayloadCodecRuntime.JS, payloadCodecScript: script }
        : { payloadCodecRuntime: PayloadCodecRuntime.NONE }),
});
exports.toV4 = toV4;
const toV3 = (loaded) => {
    const v4 = (0, exports.toV4)(loaded);
    const { payloadCodecRuntime: _r, payloadCodecScript, supportsOtaa, regParamsRevision, ...rest } = v4;
    const wrapped = payloadCodecScript ? payloadCodecScript + exports.ADAPTER : '';
    return {
        ...rest,
        supportsJoin: supportsOtaa,
        regParamsRevision: regParamsRevision === RegParamsRevision.B ? RegParamsRevision.B : RegParamsRevision.A,
        maxEIRP: loaded.profile.maxEIRP,
        supports32BitFCnt: !!loaded.profile.supports32bitFCnt,
        payloadCodec: wrapped ? PayloadCodec.CUSTOM_JS : PayloadCodec.NONE,
        payloadDecoderScript: wrapped,
        payloadEncoderScript: wrapped,
    };
};
exports.toV3 = toV3;
//# sourceMappingURL=types.js.map