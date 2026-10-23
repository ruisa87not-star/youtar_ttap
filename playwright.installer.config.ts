import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/e2e',testMatch:'installer.spec.ts',timeout:180000,expect:{timeout:15000},workers:1,outputDir:'test-results-installer',use:{trace:'retain-on-failure'}});
