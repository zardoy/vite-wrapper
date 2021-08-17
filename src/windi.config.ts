import { defineConfig } from 'vite-plugin-windicss'
import typography from 'windicss/plugin/typography'
import lineClamp from 'windicss/plugin/line-clamp'
import scrollSnap from 'windicss/plugin/scroll-snap'

// time?
export default (configOverride: Parameters<typeof defineConfig>[0] = {}) =>
    defineConfig({
        // purge: {
        //     content: ['./src/**/*'],
        //     options: {
        //         keyframes: true,
        //     },
        // },
        darkMode: 'class',
        important: '#root',
        // Too raw. I don't use it for now
        attributify: {
            prefix: 'w-',
        },
        ...configOverride,
        plugins: [
            {
                handler({ addUtilities }) {
                    addUtilities({
                        'text-primary': {
                            color: 'white',
                        },
                    })
                },
            },
            typography({
                dark: true,
            }),
            lineClamp,
            scrollSnap,
            ...(configOverride.plugins || []),
        ],
    })
