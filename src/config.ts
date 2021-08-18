import fs from 'fs'
import * as jsonfile from 'jsonfile'
import { join, resolve } from 'path'
import { PackageJson } from 'type-fest'
import { createLogger, InlineConfig, UserConfig, UserConfigExport } from 'vite'
import windiPlugin from 'vite-plugin-windicss'
import { envHtmlPlugin } from './plugins/envHtml'
import { send as serverSendContent, mergeConfig, loadEnv } from 'vite/'

export interface VitUserConfig extends UserConfig {
    defineEnv?: {
        [envName: `VITE_${string}`]: string
    }
    // I'll implement that when I need
    // hooks: {}
}

const html = String.raw

// install lit-element VSCode extension for syntax highlight
const getIndexHtml = (script: string) => html`
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no, viewport-fit=cover" />
            <title>%VITE_NAME%</title>
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

// loadConfigFromFile
export const defineVitConfig = (userConfig: VitUserConfig = {}): UserConfigExport => {
    return async ({ command, mode }) => {
        if (userConfig.defineEnv) {
            for (const [name, value] of Object.entries(userConfig.defineEnv || {})) {
                if (!name.startsWith('VITE_')) throw new TypeError('Check defineEnv in config. Environment variables must start with VITE_ prefix')
                process.env[name] = String(value)
            }

            // do not pass additional config fields into vite
            delete userConfig.defineEnv
        }

        // TODO investigate with different root config option
        const packageJson = await jsonfile.readFile(resolve(process.cwd(), './package.json'))
        // TODO define on load via plugin!
        if (!packageJson.displayName) throw new TypeError("`displayName` must be defined. It's your app name")
        // ignoring package.name because some package managers (yarn) dont' like invalid names

        const additionalPlugins: any[] = []
        for (const [plugin, { export: pluginExport = 'default', options }] of Object.entries(autoInjectPlugins)) {
            if (!hasDependency(plugin, packageJson)) continue
            additionalPlugins.push((await import(plugin))[pluginExport](options))
        }
        let fullRootPath: string = null!

        const envDir = resolve(process.cwd(), userConfig.root || '', userConfig.envDir || '')
        // https://github.com/vitejs/vite/issues/1930#issuecomment-783747858
        Object.assign(process.env, loadEnv(mode, envDir))

        // default env
        for (const [envName, value] of [
            ['VITE_NAME', packageJson.displayName],
            ['VITE_VERSION', packageJson.version],
        ]) {
            if (value === undefined) continue
            // loaded from .env file or config's defineEnv. skipping
            if (process.env[envName]) continue
            process.env[envName] = value
        }
        const warnLogger = createLogger('warn')

        // https://vitejs.dev/config/
        const defaultConfig: InlineConfig = {
            // we can't skip loading env files because it won't even load env from process.env
            // so with this setup vite loaddds .env files twice !!!
            // TODO fix it
            // envFile: false,
            base: command === 'build' ? './' : undefined,
            plugins: [
                {
                    name: 'vit-on-config-resolve',
                    configResolved(config) {
                        fullRootPath = config.root
                    },
                },
                {
                    name: 'vit-virtual-index-html',
                    // ref https://github.com/IndexXuan/vite-plugin-html-template/blob/main/src/index.ts
                    configureServer(server) {
                        return () => {
                            const queryRE = /\?.*$/s
                            const hashRE = /#.*$/s

                            const cleanUrl = (url: string): string => url.replace(hashRE, '').replace(queryRE, '')
                            // In case of serving index html we don't call next(), so we need to manually implement indexHtmlMiddleware middleware
                            // https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/middlewares/indexHtml.ts#L149
                            server.middlewares.use(async function serverGeneratedIndexHtml(req, res, next) {
                                const url = req.url && cleanUrl(req.url)
                                if (url !== '/index.html' || req.headers['sec-fetch-dest'] === 'script') return next()
                                // TODO I wanted to keep index.html files in src/ folder
                                // I can't just set root option to src/ because it would force to keep all config files in source dir, which doesn't make sense
                                // Now I understand that Snowpack was better at this point
                                if (fs.existsSync(resolve(fullRootPath, 'index.html'))) return next()
                                if (fs.existsSync(resolve(fullRootPath, 'src/index.html'))) warnLogger.warn('Move src/index.html to the root')
                                const mainScript = join('src', fs.existsSync(join(fullRootPath, 'index.tsx')) ? 'index.tsx' : 'index.ts')
                                const html = await server.transformIndexHtml(url, getIndexHtml(mainScript), req.originalUrl)
                                serverSendContent(req, res, html, 'html')
                            })
                        }
                    },
                },
                envHtmlPlugin(),
                windiPlugin(),
                ...additionalPlugins,
            ],
        }
        return mergeConfig(defaultConfig, userConfig)
    }
}
