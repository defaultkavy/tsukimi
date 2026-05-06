import 'amateras';
import { ElementProto, Proto } from 'amateras/core';
import { _instanceof, forEach, isString } from 'amateras/utils';
import { CheerioProto } from './CheerioProto';
import type { WidgetConstructor } from 'amateras/widget';

export interface TsukimiConfig {
    entrypoint?: string;
    app: Proto | WidgetConstructor;
    selector: string;
    outDir?: string;
}

export class Tsukimi {
    outDir: string;
    app: Proto | Constructor<Proto>;
    selector: string;
    constructor(config: TsukimiConfig) {
        this.outDir = config.outDir ?? 'dist';
        this.app = config.app;
        this.selector = config.selector;
        this.bundler(config.entrypoint);
    }

    async render(req: URL | string | Request) {
        const index_html = await Bun.file(this.outDir + '/index.html').text();
        const result = new CheerioProto(index_html, 'html', this.selector);
        const {$html} = result;
        //@ts-ignore
        if (_instanceof(req, Request) && $html.global.prefetch) $html.global.prefetch.req = req;
        $html.build();
        if (!result.$container) throw 'Tsukimi.render(): container element not found';
        const $head = $html.findBelow(proto => _instanceof(proto, ElementProto) && proto.tagname === 'head')
        // assign app global to $head
        $.context(Proto, result.$container, () => {
            const $app = $(this.app as any);
            result.$container?.append($app);
            $app.build();
        })
        //@ts-ignore
        if ($html.global.router) await Promise.all($html.global.router.resolve(_instanceof(req, URL) || isString(req) ? req : req.url));
        
        // await app promises
        async function awaitPromises() {
            const promises = Array.from($html.global.promises);
            await Promise.all(promises);
            if ($html.global.promises.size) await awaitPromises();
        }

        await awaitPromises();
        if ($head) {
            // assign children global to $head
            $.context(Proto, $head, () => {
                let cssText = ''
                forEach($.styleMap, ([constructor, css]) => {
                    if ($html.findBelow(proto => proto.constructor === constructor)) forEach(css, rule => cssText += rule);
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
                    //@ts-ignore
                    const $script = $('script', () => $`window.prefetch = ${JSON.stringify($html.global.prefetch.caches)}`);
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
                    forEach(metaList, (meta => {
                        const $meta = $('meta', meta);
                        $head.append($meta);
                        $meta.build();
                    }))
                }
            })
        }
        const html = $html.toString();
        $html.dispose();
        return html;
    }


    private async bundler(entrypoint?: string) {
        const worker = new Worker(`${__dirname}/../lib/bundlerWorker.ts`);
        worker.onmessage = (e) => {
            if (e.data === 'ready') {
                worker.postMessage({outDir: this.outDir, entrypoint});
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