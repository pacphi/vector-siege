import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
await execFileAsync('node', ['scripts/package-sites.mjs']);
await access('dist/assets/index.html');
const packagedAssets = await import('node:fs/promises').then(({ readdir }) =>
  readdir('dist/assets/assets'),
);
assert.ok(packagedAssets.some((name) => name.endsWith('.js')));
assert.ok(packagedAssets.some((name) => name.endsWith('.css')));

const worker = (await import(`../dist/server/index.js?test=${Date.now()}`)).default;
const requestedPaths = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      requestedPaths.push(path);
      if (path === '/index.html') return new Response('<!doctype html>', { status: 200 });
      return new Response('not found', { status: 404 });
    },
  },
};

const root = await worker.fetch(new Request('https://example.test/'), env);
assert.equal(root.status, 200);
assert.equal(requestedPaths.at(-1), '/index.html');

const route = await worker.fetch(new Request('https://example.test/play'), env);
assert.equal(route.status, 200);
assert.deepEqual(requestedPaths.slice(-2), ['/play', '/index.html']);

const missingAsset = await worker.fetch(new Request('https://example.test/missing.js'), env);
assert.equal(missingAsset.status, 404);
assert.equal(requestedPaths.at(-1), '/missing.js');

console.log('Sites adapter routes root and application paths to index.html.');
