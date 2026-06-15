import 'amateras';
import { ElementProto, Proto } from 'amateras/core';
import { CheerioProto } from './CheerioProto';
import type { WidgetConstructor } from 'amateras/widget';
import { Utils } from 'amateras/utils';
import path from 'path';

export interface TsukimiConfig {
    root?: string;
    entryfile?: string;
    app: Proto | WidgetConstructor;
    selector: string;
    outDir?: string;
}

export class Tsukimi {
    outDir: string;
    app: Proto | Constructor<Proto>;
    selector: string;
    entryfile: string;
    root: string;
    constructor(config: TsukimiConfig) {
        this.root = config.root ?? process.cwd();
        this.outDir = config.outDir ?? 'dist';
        this.entryfile = config.entryfile ?? 'index.html';
        this.app = config.app;
        this.selector = config.selector;
        this.bundler();
    }

    async render(req: URL | string | Request, htmlHandle?: ($html: ElementProto<HTMLHtmlElement>) => void) {
        const index_html = await Bun.file(path.resolve(this.root, this.outDir, this.entryfile)).text();
        const result = new CheerioProto(index_html, 'html', this.selector);
        const {$html} = result;
        //@ts-ignore
        if (Utils.isInstanceof(req, Request) && $html.global.prefetch) $html.global.prefetch.req = req;
        $html.build();
        htmlHandle?.($html as ElementProto<HTMLHtmlElement>)
        if (!result.$container) throw 'Tsukimi.render(): container element not found';
        const $head = $html.findBelow<ElementProto>(proto => Utils.isInstanceof(proto, ElementProto) && proto.tagname === 'head')
        // assign app global to $head
        $.context(result.$container, () => {
            const $app = $(this.app as any);
            result.$container?.append($app);
            $app.build();
        })
        //@ts-ignore
        if ($html.global.router) await Promise.all($html.global.router.resolve(Utils.isInstanceof(req, URL) || Utils.isString(req) ? req : req.url));
        
        // await app promises
        async function awaitPromises() {
            const promises = Array.from($html.global.promises);
            await Promise.all(promises);
            if ($html.global.promises.size) await awaitPromises();
        }

        await awaitPromises();

        // apply ssr middleware process
        if ($head) $.middleware.ssr.forEach(fn => fn($html, $head));

        const html = $html.toString();
        $html.dispose();
        return `<!DOCTYPE html>\n${html}`;
    }


    private async bundler() {
        const worker = new Worker(`${__dirname}/../lib/bundlerWorker.ts`);
        worker.onmessage = (e) => {
            if (e.data === 'ready') {
                worker.postMessage({outDir: this.outDir, root: this.root, entryfile: this.entryfile});
            }
            else {
                // this.#bundlerOutput = e.data;
                worker.terminate();
            }
        }

        worker.onerror = err => {
            console.error(err.message)
        }
    }
}