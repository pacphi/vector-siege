import { cp, mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await writeFile(
  'dist/server/index.js',
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes(".")) return response;

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`,
);

await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
