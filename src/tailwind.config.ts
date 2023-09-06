/* eslint-disable @typescript-eslint/naming-convention */
import { Config } from 'tailwindcss'
import defaultsDeep from 'lodash.defaultsdeep'
import plugin from 'tailwindcss/plugin'
import { omitObj } from '@zardoy/utils'
import { SetOptional } from 'type-fest'

// https://github.com/tailwindlabs/tailwindcss/blob/a7263a8f6faf989cb98553491d5c456d0b86de9b/src/css/preflight.css
// TODO update to 875c850b37a57bc651e1fed91e3d89af11bdc79f
// ? 173
const preflightLevels = {
    // 4: max, default
    3: [69, 265, 290],
    // these might broke unprepared app
    // TODO border
    2: [83, [188, 189], 231, 239, 281, 286, 302, 339],
}

type CustomConfig = SetOptional<Config, 'content'> & {
    // preflightLevel?: keyof typeof preflightLevels
}

export const defineTailwindConfig = (configOverride: CustomConfig = {}) =>
    defaultsDeep(omitObj(configOverride, 'plugins'), {
        content: ['index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
        darkMode: 'class',
        important: '#root',
        theme: {
            extend: {
                colors: {
                    primary: 'var(--color-primary)',
                    secondary: 'var(--color-secondary)',
                },
            },
        },
        corePlugins: {
            // preflight: false,
        },
        safelist: ['dark'],
        plugins: [
            //@ts-expect-error Not documented
            plugin(({ addUtilities, addBase, theme, addUserCss }) => {
                addUtilities({
                    '.text': {
                        //text-primary
                        color: 'var(--text-primary)',
                    },
                    '.text-secondary': {
                        color: 'var(--text-secondary)',
                    },
                    '.text-muted': {
                        '@apply text-gray-400': '',
                    },
                    // '.bg-primary': {
                    //     'background-color': 'var(--bg-primary)',
                    // },
                    // '.bg-secondary': {
                    //     'background-color': 'var(--bg-secondary)',
                    // },
                })
                addBase({
                    html: { backgroundColor: theme('colors.gray.50'), '--text-primary': '#2c3e50', color: 'var(--text-primary)', minHeight: '100vh' },
                    'html.dark': { backgroundColor: theme('colors.neutral.900'), '--text-primary': 'white', 'color-scheme': 'dark' },
                })
            }),
            ...(configOverride.plugins ?? []),
        ],
    })

export const defineCleanTailwindConfig = (configOverride: Config) => configOverride
