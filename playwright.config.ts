import 'dotenv/config';
import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
export default defineConfig({testDir:'tests/e2e',workers:1,timeout:45000,use:{baseURL:'http://127.0.0.1:3000',headless:true,launchOptions:existsSync(chrome)?{executablePath:chrome}:{},trace:'retain-on-failure'},webServer:{command:'npm run start',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:90000}});
