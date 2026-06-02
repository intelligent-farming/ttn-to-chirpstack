# @intelligentfarming/ttn-to-chirpstack

Translate device definitions from TheThingsNetwork's `lorawan-devices`
repository into ChirpStack device profiles. ChirpStack v4 is the default
output; v3 is available via `{ target: Target.V3 }` and ships with a small
JS adapter so the TTN codec script keeps working under the v3 runtime.

## Enumerations

### ChirpStackRegion

ChirpStack's region enum, used in the returned device profile.

#### Enumeration Members

##### AS923

> **AS923**: `"AS923"`

##### AU915

> **AU915**: `"AU915"`

##### CN470

> **CN470**: `"CN470"`

##### CN779

> **CN779**: `"CN779"`

##### EU433

> **EU433**: `"EU433"`

##### EU868

> **EU868**: `"EU868"`

##### IN865

> **IN865**: `"IN865"`

##### KR920

> **KR920**: `"KR920"`

##### RU864

> **RU864**: `"RU864"`

##### US915

> **US915**: `"US915"`

***

### MacVersion

LoRaWAN MAC version string used by ChirpStack.

#### Enumeration Members

##### LORAWAN\_1\_0\_0

> **LORAWAN\_1\_0\_0**: `"LORAWAN_1_0_0"`

##### LORAWAN\_1\_0\_1

> **LORAWAN\_1\_0\_1**: `"LORAWAN_1_0_1"`

##### LORAWAN\_1\_0\_2

> **LORAWAN\_1\_0\_2**: `"LORAWAN_1_0_2"`

##### LORAWAN\_1\_0\_3

> **LORAWAN\_1\_0\_3**: `"LORAWAN_1_0_3"`

##### LORAWAN\_1\_0\_4

> **LORAWAN\_1\_0\_4**: `"LORAWAN_1_0_4"`

##### LORAWAN\_1\_1\_0

> **LORAWAN\_1\_1\_0**: `"LORAWAN_1_1_0"`

***

### PayloadCodec

ChirpStack v3 codec discriminator.

#### Enumeration Members

##### CAYENNE\_LPP

> **CAYENNE\_LPP**: `"CAYENNE_LPP"`

##### CUSTOM\_JS

> **CUSTOM\_JS**: `"CUSTOM_JS"`

##### NONE

> **NONE**: `""`

***

### PayloadCodecRuntime

ChirpStack v4 codec runtime.

#### Enumeration Members

##### JS

> **JS**: `"JS"`

##### NONE

> **NONE**: `"NONE"`

***

### Region

TTN region key as used in `firmwareVersions[].profiles`. Pass to [toChirpStack](#tochirpstack) / [search](#search).

#### Enumeration Members

##### AS923

> **AS923**: `"AS923"`

##### AU915

> **AU915**: `"AU915-928"`

##### CN470

> **CN470**: `"CN470-510"`

##### CN779

> **CN779**: `"CN779-787"`

##### EU433

> **EU433**: `"EU433"`

##### EU868

> **EU868**: `"EU863-870"`

##### IN865

> **IN865**: `"IN865-867"`

##### KR920

> **KR920**: `"KR920-923"`

##### RU864

> **RU864**: `"RU864-870"`

##### US915

> **US915**: `"US902-928"`

***

### RegParamsRevision

ChirpStack regional-parameters revision. v3 only ever emits `A` or `B`.

#### Enumeration Members

##### A

> **A**: `"A"`

##### B

> **B**: `"B"`

##### RP002\_1\_0\_0

> **RP002\_1\_0\_0**: `"RP002_1_0_0"`

##### RP002\_1\_0\_1

> **RP002\_1\_0\_1**: `"RP002_1_0_1"`

##### RP002\_1\_0\_2

> **RP002\_1\_0\_2**: `"RP002_1_0_2"`

##### RP002\_1\_0\_3

> **RP002\_1\_0\_3**: `"RP002_1_0_3"`

***

### Target

Which ChirpStack API version to emit.

#### Enumeration Members

##### V3

> **V3**: `"v3"`

##### V4

> **V4**: `"v4"`

## Interfaces

### ChirpStackV3DeviceProfile

Plain-object form of a ChirpStack v3 device profile (REST shape).

#### Properties

##### classBTimeout?

> `optional` **classBTimeout?**: `number`

##### classCTimeout?

> `optional` **classCTimeout?**: `number`

##### description

> **description**: `string`

##### macVersion

> **macVersion**: [`MacVersion`](#macversion)

##### maxEIRP

> **maxEIRP**: `number`

##### name

> **name**: `string`

##### payloadCodec

> **payloadCodec**: [`PayloadCodec`](#payloadcodec)

##### payloadDecoderScript

> **payloadDecoderScript**: `string`

##### payloadEncoderScript

> **payloadEncoderScript**: `string`

##### region

> **region**: [`ChirpStackRegion`](#chirpstackregion)

##### regParamsRevision

> **regParamsRevision**: [`A`](#a) \| [`B`](#b)

##### supports32BitFCnt

> **supports32BitFCnt**: `boolean`

##### supportsClassB

> **supportsClassB**: `boolean`

##### supportsClassC

> **supportsClassC**: `boolean`

##### supportsJoin

> **supportsJoin**: `boolean`

***

### ChirpStackV4DeviceProfile

Plain-object form of a ChirpStack v4 `DeviceProfile`.

#### Properties

##### classBTimeout?

> `optional` **classBTimeout?**: `number`

##### classCTimeout?

> `optional` **classCTimeout?**: `number`

##### description

> **description**: `string`

##### macVersion

> **macVersion**: [`MacVersion`](#macversion)

##### name

> **name**: `string`

##### payloadCodecRuntime

> **payloadCodecRuntime**: [`PayloadCodecRuntime`](#payloadcodecruntime)

##### payloadCodecScript?

> `optional` **payloadCodecScript?**: `string`

##### region

> **region**: [`ChirpStackRegion`](#chirpstackregion)

##### regParamsRevision

> **regParamsRevision**: [`RegParamsRevision`](#regparamsrevision)

##### supportsClassB

> **supportsClassB**: `boolean`

##### supportsClassC

> **supportsClassC**: `boolean`

##### supportsOtaa

> **supportsOtaa**: `boolean`

***

### SearchOptions

Options accepted by [search](#search).

#### Extends

- [`ToChirpStackOptions`](#tochirpstackoptions)

#### Properties

##### firmware?

> `optional` **firmware?**: `string` \| `number`

Pin a specific firmware by `numeric` id or `version` string. Defaults to the first listed.

###### Inherited from

[`ToChirpStackOptions`](#tochirpstackoptions).[`firmware`](#firmware-1)

##### limit?

> `optional` **limit?**: `number`

Cap on result count. Defaults to 10.

##### target?

> `optional` **target?**: [`TargetInput`](#targetinput)

ChirpStack API version. Defaults to v4.

###### Inherited from

[`ToChirpStackOptions`](#tochirpstackoptions).[`target`](#target-2)

***

### ToChirpStackOptions

Options accepted by [toChirpStack](#tochirpstack).

#### Extended by

- [`SearchOptions`](#searchoptions)

#### Properties

##### firmware?

> `optional` **firmware?**: `string` \| `number`

Pin a specific firmware by `numeric` id or `version` string. Defaults to the first listed.

##### target?

> `optional` **target?**: [`TargetInput`](#targetinput)

ChirpStack API version. Defaults to v4.

***

### Vendor

Vendor entry from `vendor/index.yaml`.

#### Properties

##### id

> **id**: `string`

##### name

> **name**: `string`

##### vendorID

> **vendorID**: `number`

## Type Aliases

### RegionInput

> **RegionInput** = [`Region`](#region) \| `` `${Region}` ``

Accept either an enum value or its bare string equivalent.

***

### TargetInput

> **TargetInput** = [`Target`](#target) \| `` `${Target}` ``

Accept either an enum value or its bare string equivalent.

## Functions

### cachePath()

> **cachePath**(): `string`

Path that [updateDevices](#updatedevices) writes into. Delete it (e.g. with
`fs.rmSync(cachePath(), {recursive:true, force:true})`) to roll back to
the bundled snapshot on the next read.

#### Returns

`string`

***

### devices()

> **devices**(`vendor`): `string`[]

List the device IDs published by a vendor.

#### Parameters

##### vendor

`string`

Vendor slug (e.g. `"dragino"`).

#### Returns

`string`[]

#### Example

```ts
devices('dragino').includes('lds01'); // true
```

***

### search()

#### Call Signature

> **search**(`query`, `region`, `opts?`): [`ChirpStackV4DeviceProfile`](#chirpstackv4deviceprofile)[]

Fuzzy-search the TTN catalog and return ChirpStack profiles for the best
matches in the given region. Use to show a shortlist of options when the
user only roughly knows the vendor and model.

The first call builds an in-memory index of every vendor/device entry
(a few hundred ms cold disk); subsequent searches are instant. The index
is invalidated by [updateDevices](#updatedevices).

##### Parameters

###### query

`string`

Search terms — vendor, device id, friendly name, or any mix.

###### region

[`RegionInput`](#regioninput)

TTN region key; devices not supporting it are skipped.

###### opts?

[`SearchOptions`](#searchoptions) & `object`

[SearchOptions](#searchoptions).

##### Returns

[`ChirpStackV4DeviceProfile`](#chirpstackv4deviceprofile)[]

##### Example

```ts
import { search, Region } from '@intelligentfarming/ttn-to-chirpstack';
const hits = search('sensecap light', Region.EU868, { limit: 5 });
hits.forEach((p, i) => console.log(`${i + 1}. ${p.name}`));
```

#### Call Signature

> **search**(`query`, `region`, `opts`): [`ChirpStackV3DeviceProfile`](#chirpstackv3deviceprofile)[]

Fuzzy-search the TTN catalog and return ChirpStack profiles for the best
matches in the given region. Use to show a shortlist of options when the
user only roughly knows the vendor and model.

The first call builds an in-memory index of every vendor/device entry
(a few hundred ms cold disk); subsequent searches are instant. The index
is invalidated by [updateDevices](#updatedevices).

##### Parameters

###### query

`string`

Search terms — vendor, device id, friendly name, or any mix.

###### region

[`RegionInput`](#regioninput)

TTN region key; devices not supporting it are skipped.

###### opts

[`SearchOptions`](#searchoptions) & `object`

[SearchOptions](#searchoptions).

##### Returns

[`ChirpStackV3DeviceProfile`](#chirpstackv3deviceprofile)[]

##### Example

```ts
import { search, Region } from '@intelligentfarming/ttn-to-chirpstack';
const hits = search('sensecap light', Region.EU868, { limit: 5 });
hits.forEach((p, i) => console.log(`${i + 1}. ${p.name}`));
```

***

### toChirpStack()

#### Call Signature

> **toChirpStack**(`vendor`, `device`, `region`, `opts?`): [`ChirpStackV4DeviceProfile`](#chirpstackv4deviceprofile)

Translate a TTN device entry into a ChirpStack device profile.

##### Parameters

###### vendor

`string`

Vendor slug, e.g. `"dragino"`.

###### device

`string`

Device ID, e.g. `"lds01"`.

###### region

[`RegionInput`](#regioninput)

TTN region key (pass [Region](#region) or the bare string).

###### opts?

[`ToChirpStackOptions`](#tochirpstackoptions) & `object`

[ToChirpStackOptions](#tochirpstackoptions).

##### Returns

[`ChirpStackV4DeviceProfile`](#chirpstackv4deviceprofile)

##### Example

```ts
import { toChirpStack, Region, Target } from '@intelligentfarming/ttn-to-chirpstack';

// ChirpStack v4 (default)
const v4 = toChirpStack('dragino', 'lds01', Region.EU868);

// ChirpStack v3
const v3 = toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });

// Pin firmware
toChirpStack('dragino', 'lds01', Region.EU868, { firmware: 1 });
```

#### Call Signature

> **toChirpStack**(`vendor`, `device`, `region`, `opts`): [`ChirpStackV3DeviceProfile`](#chirpstackv3deviceprofile)

Translate a TTN device entry into a ChirpStack device profile.

##### Parameters

###### vendor

`string`

Vendor slug, e.g. `"dragino"`.

###### device

`string`

Device ID, e.g. `"lds01"`.

###### region

[`RegionInput`](#regioninput)

TTN region key (pass [Region](#region) or the bare string).

###### opts

[`ToChirpStackOptions`](#tochirpstackoptions) & `object`

[ToChirpStackOptions](#tochirpstackoptions).

##### Returns

[`ChirpStackV3DeviceProfile`](#chirpstackv3deviceprofile)

##### Example

```ts
import { toChirpStack, Region, Target } from '@intelligentfarming/ttn-to-chirpstack';

// ChirpStack v4 (default)
const v4 = toChirpStack('dragino', 'lds01', Region.EU868);

// ChirpStack v3
const v3 = toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });

// Pin firmware
toChirpStack('dragino', 'lds01', Region.EU868, { firmware: 1 });
```

***

### updateDevices()

> **updateDevices**(): `Promise`\<`string`\>

Pull the latest TTN `lorawan-devices` archive from GitHub and replace the
on-disk cache. Safe to call repeatedly from inside `node_modules` — the
cache lives outside the package directory (resolved from
`$TTN_CHIRPSTACK_CACHE`, `$XDG_CACHE_HOME`, or `~/.cache`).

Invalidates the in-memory search index so the next [search](#search) sees the
new data without a process restart.

#### Returns

`Promise`\<`string`\>

The cache path that was written.

#### Example

```ts
await updateDevices();
```

***

### vendors()

> **vendors**(): [`Vendor`](#vendor)[]

List vendors from the TTN repo, excluding entries marked `draft: true`.

#### Returns

[`Vendor`](#vendor)[]

#### Example

```ts
vendors().slice(0, 3); // [{ id: '1m2m', name: '1M2M', vendorID: 1 }, ...]
```
