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
        const $head = $html.findBelow(proto => Utils.isInstanceof(proto, ElementProto) && proto.tagname === 'head')
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
        if ($head) {
            // assign children global to $head
            $.context($head, () => {
                let cssText = ''
                Utils.forEach($.styleMap, ([constructor, css]) => {
                    if ($html.findBelow(proto => proto.constructor === constructor)) Utils.forEach(css, rule => cssText += rule);
                })
                //@ts-ignore
                if ($.CSS) {
                    //@ts-ignore
                    cssText += $.CSS.text($html);
                }
                if (cssText.length) {
                    const $style = $('style', {id: '__ssr__'}, () => $([ cssText ]));
                    $head.append($style);
                    $style.build();
                }
                //@ts-ignore
                if ($html.global.prefetch) {
                    const $script = $('script', () => $`window.prefetch = ${JSON.stringify({
                        //@ts-ignore
                        caches: $html.global.prefetch.caches,
                        //@ts-ignore
                        expired: $html.global.prefetch.expired,
                    })}`);
                    $head.append($script);
                    $script.build();
                }
                //@ts-ignore
                if ($html.global.title) {
                    //@ts-ignore
                    const $title = $('title', () => $([$html.global.title]))
                    $head.append($title);
                    $title.build();
                }
                //@ts-ignore
                if ($html.global.meta) {
                    //@ts-ignore
                    let metaList: [] = $.meta.resolve($html.global.meta);
                    Utils.forEach(metaList, (meta => {
                        const $meta = $('meta', meta);
                        $head.append($meta);
                        $meta.build();
                    }))
                }
            })
        }
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