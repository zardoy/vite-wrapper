"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vite_plugin_windicss_1 = require("vite-plugin-windicss");
const typography_1 = __importDefault(require("windicss/plugin/typography"));
const line_clamp_1 = __importDefault(require("windicss/plugin/line-clamp"));
const scroll_snap_1 = __importDefault(require("windicss/plugin/scroll-snap"));
// time?
exports.default = (configOverride = {}) => (0, vite_plugin_windicss_1.defineConfig)({
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
                });
            },
        },
        (0, typography_1.default)({
            dark: true,
        }),
        line_clamp_1.default,
        scroll_snap_1.default,
        ...(configOverride.plugins || []),
    ],
});
