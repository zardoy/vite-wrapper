"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineVitConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const jsonfile = __importStar(require("jsonfile"));
const vite_1 = require("vite");
const vite_plugin_windicss_1 = __importDefault(require("vite-plugin-windicss"));
const envHtml_1 = require("./plugins/envHtml");
const debug_1 = require("@prisma/debug");
const debug = (0, debug_1.Debug)('vit');
const html = String.raw;
// install lit-element VSCode extension for syntax highlight
const getIndexHtml = (script) => html `
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
`;
const hasDependency = (dep, packageJson) => Object.keys(packageJson.dependencies || {}).includes(dep) || Object.keys(packageJson.devDependencies || {}).includes(dep);
const autoInjectPlugins = {
    // REACT
    '@vitejs/plugin-react-refresh': {},
    // VUE
    '@vitejs/plugin-vue': {},
    // SVELTE
    '@sveltejs/vite-plugin-svelte': {
        export: 'svelte',
    },
};
// prettier-ignore
const defineVitConfig = (userConfig = {}) => async ({ command, mode }) => {
    if (userConfig.defineEnv) {
        for (const [name, value] of Object.entries(userConfig.defineEnv || {})) {
            if (!name.startsWith('VITE_'))
                throw new TypeError('Check defineEnv in config. Environment variables must start with VITE_ prefix');
            process.env[name] = String(value);
        }
        // do not pass additional config fields into vite
        delete userConfig.defineEnv;
    }
    // TODO investigate with different root config option
    const packageJson = await jsonfile.readFile((0, path_1.resolve)(process.cwd(), './package.json'));
    // TODO define on load via plugin!
    if (!packageJson.displayName)
        throw new TypeError("`displayName` must be defined. It's your app name");
    // ignoring package.name because some package managers (yarn) dont' like invalid names
    const additionalPlugins = [];
    for (const [plugin, { export: pluginExport = 'default', options }] of Object.entries(autoInjectPlugins)) {
        if (!hasDependency(plugin, packageJson))
            continue;
        additionalPlugins.push((await Promise.resolve().then(() => __importStar(require(plugin))))[pluginExport](options));
    }
    let fullRootPath = null;
    const envDir = (0, path_1.resolve)(process.cwd(), userConfig.root || '', userConfig.envDir || '');
    // https://github.com/vitejs/vite/issues/1930#issuecomment-783747858
    Object.assign(process.env, (0, vite_1.loadEnv)(mode, envDir));
    // default env
    for (const [envName, value] of [
        ['VITE_NAME', packageJson.displayName],
        ['VITE_VERSION', packageJson.version],
    ]) {
        if (value === undefined)
            continue;
        // loaded from .env file or config's defineEnv. skipping
        if (process.env[envName])
            continue;
        process.env[envName] = value;
    }
    const logger = (0, vite_1.createLogger)();
    // https://vitejs.dev/config/
    const defaultConfig = {
        // we can't skip loading env files because it won't even load env from process.env
        // so with this setup vite loaddds .env files twice !!!
        // TODO fix it
        // envFile: false,
        base: command === 'build' ? './' : undefined,
        plugins: [
            {
                name: 'vit-on-config-resolve',
                configResolved(config) {
                    fullRootPath = config.root;
                },
            },
            {
                name: 'vit-virtual-index-html',
                // ref https://github.com/IndexXuan/vite-plugin-html-template/blob/main/src/index.ts
                configureServer(server) {
                    return () => {
                        const queryRE = /\?.*$/s;
                        const hashRE = /#.*$/s;
                        const cleanUrl = (url) => url.replace(hashRE, '').replace(queryRE, '');
                        // In case of serving index html we don't call next(), so we need to manually implement indexHtmlMiddleware middleware
                        // https://github.com/vitejs/vite/blob/main/packages/vite/src/node/server/middlewares/indexHtml.ts#L149
                        server.middlewares.use(async function serverGeneratedIndexHtml(req, res, next) {
                            // TODO-high logic with custom entryPoints still works very badly. Investiage in lower commits on macOS
                            const url = req.url && cleanUrl(req.url);
                            if (url !== '/index.html' || req.headers['sec-fetch-dest'] === 'script')
                                return next();
                            // TODO I wanted to keep index.html files in src/ folder
                            // I can't just set root option to src/ because it would force to keep all config files in source dir, which doesn't make sense
                            // Now I understand that Snowpack was better at this point
                            if (fs_1.default.existsSync((0, path_1.resolve)(fullRootPath, 'index.html')))
                                return next();
                            if (fs_1.default.existsSync((0, path_1.resolve)(fullRootPath, 'src/index.html')))
                                logger.warn('Move src/index.html to the root');
                            const { entryPoint = 'src' } = userConfig;
                            // detect cases when entryPoint go upper (it's not allowed) e.g. entryPoint: ../index.ts or ./test/dir/../../../index.ts but ./test/dir/../index.ts is ok
                            const relativePath = (0, path_1.relative)(fullRootPath, (0, path_1.join)(fullRootPath, entryPoint));
                            debug(`unresolved relative path ${relativePath} (${userConfig.entryPoint === undefined ? 'default' : 'user config'})`);
                            if (relativePath.startsWith('..'))
                                throw new TypeError('Check entryPoint config option. Entry point must be within root');
                            // TODO-high @high fix prettier. actually doesn't format this block
                            const isDir = fs_1.default.lstatSync((0, path_1.join)(fullRootPath, entryPoint)).isDirectory();
                            if (isDir)
                                debug(`entryPoint is directory. peforming search for index.ts or index.tsx`);
                            /** only if dir */
                            const absoluteFromSrc = (path) => (0, path_1.join)(fullRootPath, entryPoint, path);
                            let resolvedRelativeEntryPoint = isDir ? undefined : entryPoint;
                            if (!resolvedRelativeEntryPoint) {
                                // only if entry point path is directory
                                // TODO-low use posix extended
                                ['index.tsx', 'index.ts'].forEach(relativePath => {
                                    if (!fs_1.default.existsSync(absoluteFromSrc(relativePath)))
                                        return;
                                    resolvedRelativeEntryPoint = (0, path_1.join)(entryPoint, relativePath);
                                });
                            }
                            debug(`resolved entry point: ${resolvedRelativeEntryPoint}`);
                            if (!resolvedRelativeEntryPoint) {
                                logger.error(userConfig.entryPoint ? 'Custom entry point ' + entryPoint + " not found" : 'Entry point not found. Either create your index.html in root or create index.ts or index.tsx in src/');
                                return next();
                            }
                            const html = await server.transformIndexHtml(url, getIndexHtml(resolvedRelativeEntryPoint), req.originalUrl);
                            (0, vite_1.send)(req, res, html, 'html');
                        });
                    };
                },
            },
            (0, envHtml_1.envHtmlPlugin)(),
            (0, vite_plugin_windicss_1.default)(),
            ...additionalPlugins,
        ],
    };
    return (0, vite_1.mergeConfig)(defaultConfig, userConfig);
};
exports.defineVitConfig = defineVitConfig;
