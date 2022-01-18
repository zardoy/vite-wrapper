/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { resolve } from 'path'
import { getGithubRemoteInfo } from 'github-remote-info'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { PackageJson } from 'type-fest'
import { InlineConfig, UserConfig, mergeConfig, loadEnv, UserConfigFn } from 'vite'
import { readPackageJsonFile } from 'typed-jsonfile'
import { envHtmlPlugin } from './plugins/envHtml'

export interface VitUserConfig extends UserConfig {
    defineEnv?: Record<`VITE_${string}`, string>
    /**
     * path relative from `root` option to entry point if index.html in root doesn't exist. If directory is specified it will look for index.ts or index.tsx within it
     * @default src/
     */
    entryPoint?: string
    // I'll implement that when I need
    // hooks: {}
}

const hasDependency = (dep: string, packageJson: PackageJson) =>
    Object.keys(packageJson.dependencies || {}).includes(dep) || Object.keys(packageJson.devDependencies || {}).includes(dep)

type AutoInjectPlugins = Record<
    string,
    {
        export?: string
        options?: any
    }
>

/** These plugins included only if they're installed on the user side */
// TODO always include them as they don't effect performance and idc of install size
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

export function defineVitConfig(userConfig: VitUserConfig = {}): UserConfigFn {
    return async ({ command, mode }) => {
        if (userConfig.defineEnv) {
            for (const [name, value] of Object.entries(userConfig.defineEnv || {})) {
                if (!name.startsWith('VITE_')) throw new TypeError('Check defineEnv in config. Environment variables must start with VITE_ prefix')
                process.env[name] = String(value)
            }

            // do not pass additional config fields into vite
            delete userConfig.defineEnv
        }

        // Ignores the root option by design
        const packageJson = (await readPackageJsonFile({ dir: '.' })) as PackageJson & { displayName?: string }
        const additionalPlugins: any[] = []
        for (const [plugin, { export: pluginExport = 'default', options }] of Object.entries(autoInjectPlugins)) {
            if (!hasDependency(plugin, packageJson)) continue
            additionalPlugins.push((await import(plugin))[pluginExport](options))
        }

        if (hasDependency('react', packageJson))
            additionalPlugins.push(
                (await import('@vitejs/plugin-react')).default({
                    babel: {
                        plugins: [
                            require.resolve('babel-plugin-twin'),
                            [
                                require.resolve('babel-plugin-macros'),
                                {
                                    twin: {
                                        preset: 'styled-components',
                                    },
                                },
                            ],
                            require.resolve('babel-plugin-styled-components'),
                        ],
                    },
                }),
            )
        if (hasDependency('linaria', packageJson))
            additionalPlugins.push((await import('@linaria/rollup')).default({ sourceMap: mode === 'development', exclude: ['**/tailwindcss/**'] }))

        let fullRootPath: string = null!
        const envDir = resolve(process.cwd(), userConfig.root || '', userConfig.envDir || '')
        // https://github.com/vitejs/vite/issues/1930#issuecomment-783747858
        Object.assign(process.env, loadEnv(mode, envDir))
        const appName = packageJson.displayName ?? titleCase(noCase(packageJson.name!))
        const repoInfo = await getGithubRemoteInfo(process.cwd()).catch(() => {})
        // default Environment Variables
        for (const [envName, value] of [
            ['VITE_NAME', appName],
            ['VITE_VERSION', packageJson.version!],
            ['VITE_REPO', repoInfo && `https://github.com/${repoInfo.owner}/${repoInfo.name}`],
        ] as Array<[string, string]>) {
            if (value === undefined) continue
            // loaded from .env file or config's defineEnv. skipping
            if (process.env[envName]) continue
            process.env[envName] = value
        }

        // https://vitejs.dev/config/
        const defaultConfig: InlineConfig = {
            // we can't skip loading env files because it won't even load env from process.env
            // so with this setup vite loaddds .env files twice !!!
            // envFile: false,
            base: command === 'build' ? './' : undefined,
            plugins: [
                {
                    name: 'vit-on-config-resolve',
                    configResolved(config) {
                        fullRootPath = config.root
                    },
                },
                envHtmlPlugin(),
                // windiPlugin(),
                ...additionalPlugins,
            ],
        }
        return mergeConfig(defaultConfig, userConfig)
    }
}
