import fs from 'fs'
import { resolve, join } from 'path'
import { UserConfigExport, UserConfig, createLogger } from 'vite'
import { PackageJson } from 'type-fest'
import windiPlugin from 'vite-plugin-windicss'

import * as jsonfile from 'jsonfile'
import { envHtmlPlugin } from './plugins/envHtml'

export interface VitUserConfig extends UserConfig {
    defineEnv?: Record<string, string>
    // I'll implement that only if needed
    // hooks: {}
}

const html = String.raw

// install lit-element VSCode extension for syntax highlight
const getIndexHtml = (script: string, appName: string) => html`
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no, viewport-fit=cover" />
            <title>${appName}</title>
        </head>

        <body>
            <div id="root"></div>
            <script src="${script}" type="module"></script>
        </body>
    </html>
`

const hasDependency = (dep: string, packageJson: PackageJson) =>
    Object.keys(packageJson.dependencies || {}).includes(dep) || Object.keys(packageJson.devDependencies || {}).includes(dep)

type AutoInjectPlugins = Record<
    string,
    {
        export?: string
        options?: any
    }
>

const autoInjectPlugins: AutoInjectPlugins = {
    // REACT
    '@vitejs/plugin-react-refresh': {},
    // VUE
    '@vitejs/plugin-vue': {},
    // SVELTE
    '@sveltejs/vite-plugin-svelte': {
        export: 'svelte',
    },
}

export const defineVitConfig = (userConfig: VitUserConfig = {}): UserConfigExport => {
    return async () => {
        const fromCwd = (path: string) => resolve(process.cwd(), path)
        const fromSource = (path: string) => resolve(process.cwd(), 'src', path)

        if (userConfig.defineEnv) {
            for (const [name, value] of Object.entries(userConfig.defineEnv || {})) {
                if (!name.startsWith('VITE_')) throw new TypeError('Check defineEnv in config. Environment variables must start with VITE_ prefix')
                process.env[name] = String(value)
            }

            delete userConfig.defineEnv
        }

        const packageJson = await jsonfile.readFile(fromCwd('./package.json'))
        // TODO define on load via plugin!
        if (!packageJson.displayName) throw new TypeError("`displayName` must be defined. It's your app name")
        // ignoring package.name because some package managers (yarn) dont' like invalid names
        process.env.VITE_NAME = packageJson.displayName
        if (packageJson.version) process.env.VITE_VERSION = packageJson.version

        const additionalPlugins: any[] = []
        for (const [plugin, { export: pluginExport = 'default', options }] of Object.entries(autoInjectPlugins)) {
            if (!hasDependency(plugin, packageJson)) continue
            additionalPlugins.push((await import(plugin))[pluginExport](options))
        }
        const logger = createLogger()

        // https://vitejs.dev/config/
        return {
            base: './',
            clearsScreen: false,
            ...userConfig,
            plugins: [
                {
                    name: 'virtual-index-html',
                    // ref https://github.com/IndexXuan/vite-plugin-html-template/blob/main/src/index.ts
                    configureServer(server) {
                        return () => {
                            server.middlewares.use(async (req, res, next) => {
                                const { url: path } = req
                                console.log('path', path)
                                if (path !== '/index.html') return next()
                                const indexHtmlPath = fromSource('./index.html')
                                if (fs.existsSync(indexHtmlPath)) {
                                    // TODO fix transfrom html hooks
                                    res.end(await fs.promises.readFile(indexHtmlPath, 'utf-8'))
                                } else {
                                    const mainScript = join('src', fs.existsSync(fromSource('./index.tsx')) ? 'index.tsx' : 'index.ts')
                                    res.end(getIndexHtml(mainScript, process.env.VITE_NAME!))
                                }
                            })
                        }
                    },
                },
                envHtmlPlugin(),
                windiPlugin(),
                ...additionalPlugins,
                ...(userConfig.plugins || []),
            ],
        }
    }
}
