import 'amateras';
import { ElementProto, Proto } from 'amateras/core';
import { load, type Cheerio } from 'cheerio';
import { _instanceof, forEach } from '../../amateras/packages/utils/src/lib/utils';

export interface TsukimiConfig {
    entrypoint?: string;
    app: Proto;
    outDir?: string;
}

export class Tsukimi {
    outDir: string;
    app: Proto;
    constructor(config: TsukimiConfig) {
        this.outDir = config.outDir ?? 'dist';
        this.app = config.app;
        this.bundler(config.entrypoint);
    }

    cheerioToProto($element: Cheerio<any>) {
        const tagname = $element.prop('tagName')?.toLowerCase();
        if (!tagname) throw 'tsukimi parse proto error: tagname is undefined';
        const attr = $element.attr() ?? {};
        const proto = $(tagname, attr, () => {
            $element.prop('childNodes').forEach(childNode => {
                switch (childNode.type) {
                    case 'text': {
                        const text = childNode.data.trim();
                        if (text.length) $([ text ]);
                        break;
                    }
                    case 'script':
                    case 'tag': {
                        this.cheerioToProto($element.children(childNode));
                        break;
                    }
                }
            })
        });
        return proto;
    }

    async render(path: string) {
        const cheerio$ = load(await Bun.file(this.outDir + '/index.html').text());
        const $html = this.cheerioToProto(cheerio$('html'));
        $html.build();
        const $head = $html.findBelow(proto => _instanceof(proto, ElementProto) && proto.tagname === 'head')
        const $body = $html.findBelow(proto => proto instanceof ElementProto && proto.tagname === 'body');
        // assign app global to $head
        $.context(Proto, $body, () => {
            const $app = $(this.app);
            $body?.append($app);
            $app.build();
        })
        //@ts-ignore
        if ($html.global.router) await Promise.all($html.global.router.resolve(path));
        
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
        $html.global.dispose();
        $html.dispose();
        return html;
    }


    private async bundler(entrypoint?: string) {
        const worker = new Worker(`${__dirname}/bundlerWorker.ts`);
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