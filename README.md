# @intelligent-farming/ttn-to-chirpstack

Takes device definitions from TTN's [lorawan-devices](https://github.com/TheThingsNetwork/lorawan-devices) repo and converts them to ChirpStack device profiles.

Full API reference: [docs/api-doc.md](docs/api-doc.md). Regenerate with `npm run docs`.

## Install

```sh
npm install @intelligentfarming/ttn-to-chirpstack
```

The vendor catalog (~4 MB of YAML) is **not** in the published tarball — a `postinstall` script fetches it from `codeload.github.com` into the installed package directory. You need network access during `npm install`.

If you install with `--ignore-scripts` (or pnpm/yarn equivalents), postinstall is skipped and the catalog will be missing. Fetch it manually:

```sh
node node_modules/@intelligentfarming/ttn-to-chirpstack/scripts/fetch-devices.js
```

Or call `updateDevices()` at runtime — it writes to the cache directory, which reads prefer over the package dir.

## Usage

```ts
import {
  vendors, devices, toChirpStack, search, updateDevices, cachePath,
  Region, Target,
} from '@intelligentfarming/ttn-to-chirpstack';

vendors();                              // Vendor[]
devices('dragino');                     // string[]

// v4 device profile, ready to hand to chirpstack-api.
// `Region.EU868` resolves to "EU863-870" — the actual TTN key.
toChirpStack('dragino', 'lds01', Region.EU868);

// v3 if your stack is older. Return type narrows to ChirpStackV3DeviceProfile.
toChirpStack('dragino', 'lds01', Region.EU868, { target: Target.V3 });

// Pin a specific firmware (numeric id or version string).
toChirpStack('dragino', 'lds01', Region.EU868, { firmware: 1 });

// Refresh from upstream. Takes about 20 seconds.
await updateDevices();
cachePath();   // wherever it just wrote

// Fuzzy search across vendor + device names. Returns an array of full device
// profiles, ordered by relevance, ready to show as picker options.
search('dragino lds02', Region.US915);
search('sensecap light', Region.EU868, { limit: 5 });
```

## How the cache works

Device data lives in two places: the catalog inside the installed package (fetched by `postinstall`), and a cache directory on disk that `updateDevices()` writes to. Reads check the cache first and fall back to the package-dir catalog, and that check runs on every read, so once `updateDevices()` finishes you see the new data immediately.

The cache path is the first of these that's set:

1. `TTN_CHIRPSTACK_CACHE`
2. `$XDG_CACHE_HOME/ttn-to-chirpstack`
3. `~/.cache/ttn-to-chirpstack`

`updateDevices()` downloads the master tarball from `codeload.github.com`, pulls out just the `vendor/` subtree into a tempdir under the cache root, then renames it into place. If you ever want to fall back to the bundled snapshot, delete whatever `cachePath()` returns.

## Docker use of cache

The default cache sits under the container user's homedir (usually `/root/.cache/...`), so it works without any setup but disappears when the container does. Pick whichever of these fits your situation.
