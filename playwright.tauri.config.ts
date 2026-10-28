import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/tauri',testMatch:'desktop.spec.ts',timeout:60000,expect:{timeout:10000},workers:1,fullyParallel:false,outputDir:'test-results-tauri',use:{trace:'retain-on-failure'}});
