// Reproducible, account-free screenshots for the manual-import guide.
import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
const html=await readFile(new URL('../tests/fixtures/student-v2.html',import.meta.url),'utf8');
const out=new URL('../src/renderer/help/images/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1100,height:430},deviceScaleFactor:1});
  await page.setContent(`<style>body{margin:0;font:16px Arial;background:#f7f8db;color:#263126}header{padding:18px;background:#263d58;color:white}h1{font-size:22px;margin:20px}table{border-collapse:collapse;margin:20px;width:1060px;font-size:13px}td,th{border:1px solid #a8af75;padding:8px}th{background:#929f50;color:white}aside{padding:12px 20px;background:white;font-weight:bold}</style><header>Course Timetable Preview</header><aside>Example course data • no student account</aside><h1>Display the courses you want to import</h1>${html}`);
  await page.locator('#overviewSector tr').nth(2).locator('td').evaluateAll(cells=>cells.slice(0,5).forEach(cell=>cell.setAttribute('rowspan','2')));
  await page.screenshot({path:new URL('timetable-preview.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  const sample=html.split('\n').slice(0,6).join('\n');
  const escaped=sample.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  await page.setContent(`<style>body{margin:0;background:#f6f8fc;color:#173455;font:17px Arial}header{background:#263d58;color:white;padding:18px}h1{font-size:23px;margin:24px}pre{white-space:pre-wrap;word-break:break-all;font:16px/1.7 Consolas,monospace;margin:24px;padding:20px;background:white;border:1px solid #b5c9e3}strong{background:#e2eeff;padding:5px}</style><header>Page source / example course data</header><h1><strong>Ctrl + A</strong> Select all → <strong>Ctrl + C</strong> Copy</h1><pre>${escaped}</pre>`);
  await page.screenshot({path:new URL('page-source.png',out).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
}finally{await browser.close();}
