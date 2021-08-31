#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dargs_1 = __importDefault(require("dargs"));
const fs_1 = __importDefault(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
const path_1 = require("path");
const args = (0, minimist_1.default)(process.argv.slice(2));
if (!args.config && !fs_1.default.existsSync((0, path_1.resolve)(process.cwd(), 'vite.config.ts'))) {
    args.config = require.resolve('./defaultConfig');
}
process.argv = [...process.argv.slice(0, 2), ...(0, dargs_1.default)(args)];
require('vite/bin/vite.js');
