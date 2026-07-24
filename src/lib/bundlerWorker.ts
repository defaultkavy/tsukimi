import { build, loadConfigFromFile, mergeConfig, type InlineConfig } from "vite";

self.onmessage = async (e) => {
    self.postMessage(await bundler(e.data))
}

self.postMessage('ready');

async function bundler(config: {root: string, outDir: string, entryfile: string}) {

    const defaultConfig: InlineConfig = {
        configFile: false,
        root: config.root,
        build: {
            outDir: config.outDir,
            emptyOutDir: true,
            write: true,
            minify: 'esbuild',
            target: 'esnext',
            copyPublicDir: true,
            // lib: {
            //     entry: config.entrypoint ?? `${root}/index.html`,
            //     formats: ['es'],
            // },
            rollupOptions: {
                output: {
                    assetFileNames: 'assets/[name].[ext]',
                    chunkFileNames: 'src/[name].[hash].js',
                    entryFileNames: '[name].js',
                    codeSplitting: {
                        includeDependenciesRecursively: false,
                        groups: [
                            {
                                name: 'AMATERAS',
                                test: id => {
                                    if (/@amateras\/.+?\//.test(id) || /amateras\/packages/.test(id)) {
                                        if (id.includes('@amateras/ui') || id.includes('/packages/ui')) return false;
                                        if (id.includes('@amateras/markdown') || id.includes('/packages/markdown')) return false;
                                        return true;
                                    }
                                }
                            }
                        ]
                    }
                },
                input: `${config.root}/${config.entryfile}`
            }
        }
    }

    const loadConfig = await loadConfigFromFile({
        command: 'build', mode: 'production'
    }, undefined, config.root)

    const buildConfig = loadConfig ? mergeConfig(defaultConfig, loadConfig) : defaultConfig;

    if (buildConfig.plugins) {
        buildConfig.plugins.push(...loadConfig?.config.plugins ?? [])
    } else buildConfig.plugins = loadConfig?.config.plugins;

    await build(buildConfig);
}

// const dist = config.outDir;

// // delete old files
// await Bun.$`rm -rf ${dist}`
// const output = await Bun.build({
//     plugins: [],
//     entrypoints: [config.entrypoint ?? `${root}/index.html`],
//     outdir: dist,
//     // minify: true,
//     target: 'browser',
//     splitting: true,
//     naming: {
//         chunk: './src/[name]-[hash].[ext]',
//         asset: './assets/[name].[ext]',
//         entry: '[name].[ext]'
//     },
//     format: 'esm',
// })