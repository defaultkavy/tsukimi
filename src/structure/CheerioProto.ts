import type { Proto } from "amateras/core";
import { load, type Cheerio } from 'cheerio';

export class CheerioProto {
    $html: Proto;
    $container: Proto | null = null;
    constructor(html: string, rootSelector: string, containerSelector: string) {
        const cheerio$ = load(html);
        const c_html = cheerio$(rootSelector);
        this.$html = this.toProto(c_html, containerSelector);
    }

    toProto(element: Cheerio<any>, containerSelector: string): Proto {
        const tagname = element.prop('tagName')?.toLowerCase();
        if (!tagname) throw 'tsukimi parse proto error: tagname is undefined';
        const attr = element.attr() ?? {};
        const proto = $(tagname, attr, () => {
            element.prop('childNodes').forEach(childNode => {
                switch (childNode.type) {
                    case 'text': {
                        const text = childNode.data.trim();
                        if (text.length) $([ text ]);
                        break;
                    }
                    case 'script':
                    case 'tag': {
                        this.toProto(element.children(childNode), containerSelector);
                        break;
                    }
                }
            })
        });
        if (!this.$container && element.is(containerSelector)) this.$container = proto;
        return proto;
    }
}