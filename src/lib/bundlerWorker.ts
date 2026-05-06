import { build } from "vite";

self.onmessage = async (e) => {
    self.postMessage(await bundler(e.data))
}

self.postMessage('ready');

async function bundler(config: {entrypoint?: string, outDir: string}) {

    const root = process.cwd();
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

    await build({
        configFile: false,
        root: root,
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
                },
                input: config.entrypoint ?? `${root}/index.html`
            }
        }
    });
}