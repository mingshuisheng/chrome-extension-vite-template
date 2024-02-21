import { build } from "vite";
import fs from "fs";
import path from "path";
import { JsonPlaceholderReplacer } from "json-placeholder-replacer";
import solid from "vite-plugin-solid";

const isBuild = process.argv[2] === "build";
const watch = !isBuild;
const outDir = "./dist";
const srcDir = "./src";
const manifestFileName = "manifest.json";
const manifestPath = path.resolve("./", manifestFileName);
const packagePath = "./package.json";
const publicDir = path.resolve("./", "resources");
const popupPath = path.resolve(srcDir, "popup/index.tsx");
const optionsPath = path.resolve(srcDir, "options/index.tsx");
const backgroundPath = path.resolve(srcDir, "background/index.ts");
const contentScriptPath = path.resolve(srcDir, "content/index.ts");

const libs = [
  {
    entry: optionsPath,
    name: "options",
    fileName: () => `options.js`,
  },
  {
    entry: popupPath,
    name: "popup",
    fileName: () => `popup.js`,
  },
  {
    entry: backgroundPath,
    name: "background",
    fileName: () => `background.js`,
  },
  {
    entry: contentScriptPath,
    name: "content",
    fileName: () => `content.js`,
  },
];

try {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
} catch (err) {
  console.error("error create outDir error: ", err);
}

async function buildManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
  const placeholderReplacer = new JsonPlaceholderReplacer();
  placeholderReplacer.addVariableMap({
    packageJson,
  });

  const afterManifest = placeholderReplacer.replace(manifest);

  return fs.writeFile(
    path.resolve(outDir, manifestFileName),
    JSON.stringify(afterManifest),
    (err) => {
      if (err) {
        console.error(`${manifestFileName} err: `, err);
      }
      console.log(`${manifestFileName} write success`);
    }
  );
}

const libConfig = {
  entry: popupPath,
  name: "popup",
  fileName: () => `popup.js`,
  formats: ["iife"],
};

const buildConfig = {
  configFile: false,
  plugins: [solid()],
  build: {
    outDir,
    emptyOutDir: false,
    watch,
  },
};

function createLibBuild(lib, config) {
  return build({
    ...config,
    ...buildConfig,
    build: {
      ...buildConfig.build,
      lib: {
        ...libConfig,
        ...lib,
      },
    },
  });
}

async function doBuild() {
  const libBuilds = [];
  for (const [index, lib] of libs.entries()) {
    if (index === 0) {
      libBuilds.push(createLibBuild(lib, { publicDir }));
    } else {
      libBuilds.push(createLibBuild(lib));
    }
  }

  const manifest = buildManifest();
  await Promise.all([...libBuilds, manifest]);
  console.log("build success");
}

doBuild();
