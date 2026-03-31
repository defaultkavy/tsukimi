# Tsukimi
Tsukimi is a SSR library solution for [Amateras](https://github.com/defaultkavy/amateras).

## Install
```sh
bun add tsukimi
```

## Usage
1. Create these file on your project folder:

    `index.html`
    ```html
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script type="module" src="./index.ts"></script>
        </head>
        <body></body>
    </html>
    ```

    `index.ts`
    ```ts
    import 'amateras';
    import 'amateras/widget';

    export const App = $.widget(() => {
            $('h1', () => $`Hello, World!`)
    })

    $.render(App, 'body');
    ```

    `server.ts`
    ```ts
    import { Tsukimi } from 'tsukimi';
    import { App } from './index.ts';

    const tsukimi = new Tsukimi({
        entrypoint: './index.html',
        outDir: './dist',
        app: App,
        selector: 'body'
    })

    Bun.serve({
        port: 3000,
        routes: {
            '/*': async (req) => {
                const html = await tsukimi.render(req.url);
                return new Response(html, {
                    headers: [
                        ['Content-Type', 'text/html'],
                        ['Content-Length', `${html.length}`]
                    ]
                })
            }
        }
    })

2. Run this command:
   ```sh
   bun server.ts
   ```
```