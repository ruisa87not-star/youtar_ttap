import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/proxy-browser',testMatch:'*.spec.ts',outputDir:'test-results-proxy',timeout:30000,expect:{timeout:7000},workers:1,fullyParallel:false,
  use:{baseURL:'http://127.0.0.1:4177',viewport:{width:1280,height:720},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'node scripts/proxy-fixture.ts',url:'http://127.0.0.1:4177',reuseExistingServer:false,timeout:30000},
  projects:[{name:'proxy-chromium',use:{browserName:'chromium'}},{name:'proxy-firefox',use:{browserName:'firefox'}}]});
