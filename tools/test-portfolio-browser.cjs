// Requires Playwright and Chromium. Run against a local server, never production.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.PORTFOLIO_TEST_URL || 'http://127.0.0.1:8000';

async function checkCase(page, slug) {
  await page.goto(`${base}/#project/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#caseRoot h1').waitFor();
  const actual = await page.evaluate(() => {
    const root = document.querySelector('#caseRoot');
    const figures = [...root.querySelectorAll('.case-body figure,.split-media figure')];
    return {
      title: root.querySelector('h1').textContent,
      emptyAlt: [...root.querySelectorAll('.case-hero img,.case-body figure img,.split-media img')].filter(i => !i.alt).length,
      figures: figures.length,
      captions: root.querySelectorAll('figcaption').length,
      keyboard: figures.every(f => f.tabIndex === 0),
      tags: [...root.querySelectorAll('.case-head .tag')].map(t => t.textContent),
      metadata: [...root.querySelectorAll('.roles .detail>span')].map(t => t.textContent),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.equal(actual.emptyAlt, 0, slug);
  assert.equal(actual.figures, actual.captions, slug);
  assert(actual.keyboard, slug);
  assert(!actual.overflow, slug);
  assert(actual.metadata.includes('Role'), slug);
  const card = await page.locator(`#featured .card[href="#project/${slug}"]`).evaluate(e => ({
    title: e.querySelector('h3').textContent,
    tags: [...e.querySelectorAll('.tag')].map(t => t.textContent),
  }));
  assert.equal(actual.title, card.title, slug);
  assert.deepEqual(actual.tags, card.tags, slug);

  const figure = page.locator('#caseRoot figure').first();
  await figure.focus();
  await page.keyboard.press('Enter');
  assert(await page.locator('#lb').isVisible(), slug);
  assert(await page.locator('#lbX').evaluate(e => e === document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('#lbN').evaluate(e => e === document.activeElement));
  await page.keyboard.press('Tab');
  assert(await page.locator('#lbX').evaluate(e => e === document.activeElement));
  await page.keyboard.press('Escape');
  assert(await figure.evaluate(e => e === document.activeElement));

  for (const image of await page.locator('#caseRoot .case-hero img,#caseRoot figure img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(i => i.decode());
    const size=await image.evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,nw:i.naturalWidth,nh:i.naturalHeight}));
    assert(size.width<=size.nw+1,slug+' image enlarged');
    assert(Math.abs(size.width/size.height-size.nw/size.nh)<0.015,slug+' image distorted');
  }
  await page.goto(`${base}/#home`);
  assert.match(await page.title(), /^Product Designer/);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  try {
    for (const width of [375, 768, 1049, 1110, 1126, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/#home`);
      assert.deepEqual(await page.locator('#featured .card').evaluateAll(cards=>cards.map(c=>c.getAttribute('href').split('/')[1])),['buchfix','loyalty','niewidomi']);
      await page.locator('.menu [data-sec="projects"]').click();
      assert.equal(new URL(page.url()).hash,'#projects');
      assert(await page.locator('#view-home').evaluate(e=>e.classList.contains('is-on')));
      await page.waitForTimeout(800);
      for(const id of ['projects','about','skills','contact']) {
        if(await page.locator('.menu [data-sec="'+id+'"]').isVisible()) await page.locator('.menu [data-sec="'+id+'"]').click();
        else await page.evaluate(id=>{location.hash='#'+id;},id);
        await page.waitForTimeout(1400);
        const geometry=await page.evaluate(id=>({heading:document.querySelector('#'+id+' .section-title').getBoundingClientRect().top,nav:document.getElementById('nav').getBoundingClientRect().bottom}),id);
        assert(geometry.heading>=geometry.nav+20,`${id} header overlaps menu or lacks margin at ${width}px: ${JSON.stringify(geometry)}`);
      }
      await page.goto(`${base}/#project/buchfix`);await page.locator('#caseRoot h1').waitFor();
      await page.locator('.menu [data-sec="projects"]').click();await page.waitForTimeout(1400);
      assert(await page.locator('#view-home').evaluate(e=>e.classList.contains('is-on')));
      assert(await page.evaluate(()=>document.querySelector('#projects .section-title').getBoundingClientRect().top>=document.getElementById('nav').getBoundingClientRect().bottom+20));
      await page.goto(`${base}/#all-projects`);
      await page.locator('#moreLocked').waitFor();
      assert.equal(await page.locator('#more-grid .card').count(),0);
      await page.goto(`${base}/#project/tauron-search`);
      await page.locator('#moreLocked').waitFor();
      assert(await page.locator('#view-case').isHidden());
      await page.goto(`${base}/#home`);
      const slugs = await page.locator('#featured .card').evaluateAll(cards => cards.map(c => c.getAttribute('href').split('/')[1]));
      assert.deepEqual(slugs,['buchfix','loyalty','niewidomi']);
      for (const slug of slugs) await checkCase(page, slug);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px: 3 public cases, protected full list, homepage scroll, titles/tags, metadata, accessible images, focus, overflow, home title`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
