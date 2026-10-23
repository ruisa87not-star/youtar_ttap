import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',timeout:30000,expect:{timeout:7000},fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run preview:web -- --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false},
  projects:[
    {name:'web-chromium',testMatch:'web.spec.ts',use:{browserName:'chromium'}},
    {name:'web-firefox',testMatch:'web.spec.ts',use:{browserName:'firefox'}},
    {name:'desktop',testMatch:'electron.spec.ts',use:{browserName:'chromium'}},
  ],
});
