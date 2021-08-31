"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineVitConfig = exports.defineWindiConfig = void 0;
var windi_config_1 = require("./windi.config");
Object.defineProperty(exports, "defineWindiConfig", { enumerable: true, get: function () { return __importDefault(windi_config_1).default; } });
// config to be used in vite.config.ts instead of Vite's defineConfig
var config_1 = require("./config");
Object.defineProperty(exports, "defineVitConfig", { enumerable: true, get: function () { return config_1.defineVitConfig; } });
