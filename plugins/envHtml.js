"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envHtmlPlugin = void 0;
const envHtmlPlugin = () => ({
    name: 'env-html',
    transformIndexHtml: html => {
        // works only when loaded from fs naturally for some reason
        return html.replace(/%(\w+)%/g, (match, key) => {
            // TODO add warn to get notified
            if (!key.startsWith('VITE_'))
                return match;
            const environmentValue = process.env[key];
            if (environmentValue)
                return environmentValue;
            // TODO warn
            return match;
        });
    },
});
exports.envHtmlPlugin = envHtmlPlugin;
