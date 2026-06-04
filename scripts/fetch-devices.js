#!/usr/bin/env node
// Fetches the TTN lorawan-devices vendor catalog from GitHub into the package
// directory. Runs from `postinstall`, so consumers get the data on install
// without us publishing it inside the tarball.
//
// Skipped when lorawan-devices/vendor/ is already populated — e.g. when
// developing this repo with the lorawan-devices git submodule checked out.
// To force a re-fetch, delete that directory and `npm rebuild`.

const fs = require('fs');
const path = require('path');
const https = require('https');
const tar = require('tar');

const ROOT = path.join(__dirname, '..');
const PARENT = path.join(ROOT, 'lorawan-devices');
const TARGET = path.join(PARENT, 'vendor');
const TARBALL = 'https://codeload.github.com/TheThingsNetwork/lorawan-devices/tar.gz/refs/heads/master';

if (fs.existsSync(TARGET) && fs.readdirSync(TARGET).length > 0) {
  process.exit(0);
}

fs.mkdirSync(PARENT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(PARENT, '.tmp-'));

const fail = (msg) => {
  fs.rmSync(tmp, { recursive: true, force: true });
  console.error(`ttn-to-chirpstack: fetch-devices failed — ${msg}`);
  process.exit(1);
};

const get = (url) => https.get(url, res => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    res.resume();
    return get(res.headers.location);
  }
  if (res.statusCode !== 200) return fail(`HTTP ${res.statusCode} from ${url}`);
  res.pipe(tar.x({ cwd: tmp, strip: 1, filter: p => p.split('/')[1] === 'vendor' }))
    .on('finish', () => {
      try {
        fs.renameSync(path.join(tmp, 'vendor'), TARGET);
        fs.rmSync(tmp, { recursive: true, force: true });
        console.log('ttn-to-chirpstack: fetched lorawan-devices vendor catalog');
      } catch (e) { fail(e.message); }
    })
    .on('error', e => fail(e.message));
}).on('error', e => fail(e.message));

get(TARBALL);
