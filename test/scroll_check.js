const path=require('path');const {chromium}=require('playwright');const stub=require('/home/claude/rimworld-sprite-viewer/test/stub');
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1100,height:520}});
await stub(page,[]);
await page.goto('file:///home/claude/rimworld-sprite-viewer/renderer/index.html');await page.waitForTimeout(500);
const m=async(sel)=>page.evaluate((s)=>{const e=document.querySelector(s);if(!e)return null;const lastBottom=e.lastElementChild?e.lastElementChild.getBoundingClientRect().bottom:0;e.scrollTop=1e5;return {client:e.clientHeight,scroll:e.scrollHeight,lastBottomAfterScroll:Math.round(e.lastElementChild.getBoundingClientRect().bottom),win:innerHeight}},sel);
const L=await m('#left'),R=await m('#right');console.log('left',L);console.log('right',R);if(L.client>L.win||R.client>R.win||L.lastBottomAfterScroll>L.win||R.lastBottomAfterScroll>R.win){console.error('SCROLL_FAIL');process.exit(1)}
await page.evaluate(()=>ModBuilder.show(true));await page.waitForTimeout(300);
console.log('modcols',await page.evaluate(()=>[...document.querySelectorAll('.modCol')].map(e=>{e.scrollTop=1e5;return [e.clientHeight,e.scrollHeight,Math.round(e.lastElementChild.getBoundingClientRect().bottom),innerHeight]})));
console.log('SCROLL_OK');await b.close();})();
