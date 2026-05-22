// Type-only smoke test. Compiles with `tsc --noEmit test/types-check.ts`.
// Failing compilation here means the public types regressed.

import {
  Region, ChirpStackRegion, Target, MacVersion, PayloadCodecRuntime,
  toChirpStack, search, vendors, devices, updateDevices, cachePath,
  ChirpStackV4DeviceProfile, ChirpStackV3DeviceProfile,
} from '..';

// Enums import at runtime AND as types.
const r: Region = Region.US915;
const cr: ChirpStackRegion = ChirpStackRegion.US915;
const t: Target = Target.V4;

// RegionInput accepts both enum members and bare strings.
const v4a: ChirpStackV4DeviceProfile = toChirpStack('dragino', 'lds01', Region.EU868);
const v4b: ChirpStackV4DeviceProfile = toChirpStack('dragino', 'lds01', 'EU863-870');

// Default and explicit V4 target → V4 return type.
v4a.supportsOtaa;
const v4c = toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V4 });
v4c.payloadCodecRuntime;

// V3 target → V3 return type. supportsJoin only exists on v3.
const v3: ChirpStackV3DeviceProfile = toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });
v3.supportsJoin;
v3.payloadDecoderScript;

// search overloads narrow the same way.
const v4Hits = search('sensecap', Region.US915);
v4Hits[0].region satisfies ChirpStackRegion;
const v3Hits = search('sensecap', Region.US915, { target: Target.V3 });
v3Hits[0].supportsJoin;

// Other exports.
vendors().forEach(v => v.vendorID);
devices('dragino').forEach(id => id.toUpperCase());
updateDevices().then((p: string) => p);
const cp: string = cachePath();

// Enum value is the underlying string at runtime — assignment from a known
// MacVersion to a plain `string` must work.
const mv: string = MacVersion.LORAWAN_1_0_3;
const codec: string = PayloadCodecRuntime.JS;

// Reference vars so tsc doesn't strip them.
void [r, cr, t, v4a, v4b, v4c, v3, v4Hits, v3Hits, cp, mv, codec];
