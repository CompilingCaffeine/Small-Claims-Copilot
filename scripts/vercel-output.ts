// Builds the Vercel deployment (Build Output API v3): the web app as static files and
// the API as one bundled Node function serving every /api/* path. Run after
// `npm run build` by `npm run build:vercel`, which vercel.json uses.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const OUT = ".vercel/output";
const FUNCTION = `${OUT}/functions/api.func`;

rmSync(OUT, { recursive: true, force: true });
cpSync("dist", `${OUT}/static`, { recursive: true });
mkdirSync(FUNCTION, { recursive: true });

await build({
  entryPoints: ["server/vercel.ts"],
  outfile: `${FUNCTION}/index.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  legalComments: "none",
  // Some dependencies are CommonJS and call require() for Node built-ins.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
});

const json = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
json(`${FUNCTION}/.vc-config.json`, {
  runtime: "nodejs22.x",
  handler: "index.mjs",
  launcherType: "Nodejs",
  shouldAddHelpers: false, // Express and multer read the request body themselves
  maxDuration: 300, // one Claude call per request, but a long analysis can take a minute or more
});
json(`${OUT}/config.json`, {
  version: 3,
  routes: [{ handle: "filesystem" }, { src: "^/api/(.*)$", dest: "/api?__path=$1" }],
});
console.log(`wrote ${OUT}`);
