import { UserConfig, UserConfigExport } from 'vite';
export interface VitUserConfig extends UserConfig {
    defineEnv?: Record<`VITE_${string}`, string>;
    /**
     * path relative from `root` option to entry point if index.html in root doesn't exist. If directory is specified it will look for index.ts or index.tsx within
     * @default src/
     */
    entryPoint?: string;
}
export declare const defineVitConfig: (userConfig?: VitUserConfig) => UserConfigExport;
