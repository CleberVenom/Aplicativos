/**
 * End-to-end test of the main flow on the web build, in a phone-sized viewport.
 *
 *   BASE_URL=http://localhost:8081 MODE=demo node e2e/web-e2e.mjs
 *   BASE_URL=http://localhost:8081 MODE=ai   node e2e/web-e2e.mjs   (needs the mock AI server, see e2e/mock-ai-server.mjs)
 *
 * Screenshots go to e2e/artifacts/<mode>/. Exits with code 1 on any failure.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://localhost:8081';
const MODE = process.env.MODE ?? 'demo';
const out = join(root, 'e2e/artifacts', MODE);
mkdirSync(out, { recursive: true });

const errors = [];
const steps = [];
let shot = 0;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' });
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});
page.on('dialog', (d) => d.accept());

// The web stack keeps previous screens mounted (hidden), so only match visible elements.
const byId = (id) => page.locator(`[data-testid="${id}"]:visible`).first();
async function snap(name) {
  shot += 1;
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, `${String(shot).padStart(2, '0')}-${name}.png`) });
}
async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    steps.push(`✔ ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    steps.push(`✘ ${name}: ${error.message.split('\n')[0]}`);
    await page.screenshot({ path: join(out, `FAILED-${name.replace(/\W+/g, '-')}.png`) }).catch(() => {});
    throw error;
  }
}

let projectId = null;
try {
  await step('home loads', async () => {
    // The first request compiles the web bundle in development, which can take a while.
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await byId('home-screen').waitFor({ timeout: 180_000 });
    await snap('home');
  });

  await step('pick photo from gallery', async () => {
    const chooser = page.waitForEvent('filechooser');
    await byId('start-gallery').click();
    await (await chooser).setFiles(join(root, 'assets/demo/before.png'));
    await byId('photo-screen').waitFor({ timeout: 30_000 });
    await byId('photo-preview').waitFor();
    await snap('photo');
  });

  await step('questionnaire: room → goals → style → budget', async () => {
    await byId('photo-continue').click();
    await byId('step-room').waitFor();
    await byId('room-sala_estar').click();
    await snap('step-room');
    await byId('step-next').click();
    await byId('step-goals').waitFor();
    await byId('goal-modernizar').click();
    await byId('goal-aconchego').click();
    await byId('step-next').click();
    await byId('step-style').waitFor();
    await byId('style-japandi').click();
    await byId('style-escandinavo').click();
    await snap('step-style');
    await byId('step-next').click();
    await byId('step-budget').waitFor();
    await byId('budget-intermediario').click();
    await byId('step-next').click();
  });

  await step('questionnaire: optional steps, back keeps answers', async () => {
    await byId('step-furniture').waitFor();
    await snap('step-furniture');
    // Going back must keep the previous answer selected.
    await byId('step-back').click();
    await byId('step-budget').waitFor();
    const checked = await byId('budget-intermediario').getAttribute('aria-checked');
    if (checked !== 'true') throw new Error(`budget answer lost after going back (aria-checked=${checked})`);
    await byId('step-next').click();
    await byId('step-furniture').waitFor();
    // "Não tenho" marks an item that does not exist in the room today.
    const noCurtains = page.getByRole('radio', { name: 'Cortinas: Não tenho' }).filter({ visible: true });
    await noCurtains.click();
    if ((await noCurtains.getAttribute('aria-checked')) !== 'true') throw new Error('"Não tenho" option did not select');
    await snap('step-furniture-missing-item');
    await byId('step-next').click();
    await byId('step-preferences').waitFor();
    await byId('fav-verde_salvia').click();
    await byId('need-pets').click();
    await byId('step-next').click();
    // "modernizar" is an intervention goal, so the property step must appear.
    await byId('step-property').waitFor();
    await byId('tenure-alugado').click();
    await snap('step-property');
    await byId('step-next').click();
    await byId('step-review').waitFor();
    await byId('review-summary').waitFor();
    const summary = await byId('review-summary').innerText();
    if (!/Não tenho\s*Cortinas/.test(summary)) throw new Error('review summary does not list the missing item');
    await snap('review');
  });

  await step(`generate proposals (${MODE})`, async () => {
    if (MODE === 'ai') {
      await byId('generate-ai').waitFor({ timeout: 20_000 });
      await byId('generate-ai').click();
      await byId('consent-screen').waitFor();
      await snap('consent');
      await byId('consent-accept').click();
    } else {
      await byId('generate-demo').waitFor({ timeout: 20_000 });
      await byId('generate-demo').click();
    }
    await byId('project-screen').waitFor({ timeout: 30_000 });
    projectId = new URL(page.url()).pathname.split('/')[2];
    await snap('project-start');
    for (const key of ['A', 'B', 'C']) await byId(`proposal-card-${key}`).waitFor({ timeout: 120_000 });
    if (MODE === 'demo') await byId('demo-notice').waitFor();
    if (MODE === 'ai') {
      // Images arrive after the proposals.
      await page.waitForFunction(() => document.querySelectorAll('[data-testid^="proposal-card-"] img').length >= 3, null, { timeout: 120_000 });
    }
    await page.waitForTimeout(800);
    await snap('project-proposals');
    await page.mouse.wheel(0, 900);
    await snap('project-proposals-scrolled');
  });

  if (MODE === 'ai') {
    await step('full analysis screen', async () => {
      await byId('open-analysis').click();
      await byId('analysis-screen').waitFor();
      await snap('analysis');
      await page.goBack();
      await byId('project-screen').waitFor();
    });
  }

  await step('proposal detail + choose + 3D invite', async () => {
    await byId('open-proposal-B').click();
    await byId('proposal-screen').waitFor();
    if (MODE === 'demo') await page.getByText('Considera que você ainda não tem: cortinas.', { exact: false }).first().waitFor();
    await snap('proposal-B');
    await page.mouse.wheel(0, 1400);
    await snap('proposal-B-scrolled');
    await byId('choose-proposal').click();
    await byId('invite3d-screen').waitFor();
    await snap('invite-3d');
    await byId('invite-yes').click();
  });

  await step('3D viewer renders and responds', async () => {
    await byId('viewer-canvas').waitFor({ timeout: 30_000 });
    const frame = page.frameLocator('iframe[title="Visualização 3D do ambiente"]');
    await frame.locator('canvas').waitFor({ timeout: 30_000 });
    await page.waitForTimeout(2500);
    await snap('viewer-overview');
    const box = await page.locator('iframe[title="Visualização 3D do ambiente"]').boundingBox();
    // Orbit with a drag and select an item with a tap.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 20, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(800);
    await snap('viewer-orbit');
    await page.getByText('Como na foto', { exact: true }).click();
    await page.waitForTimeout(1200);
    await snap('viewer-photo-view');
    await page.getByText('Visão geral', { exact: true }).click();
    await page.waitForTimeout(1000);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.55);
    // The viewer (iframe) must report the tapped item back to the app.
    await byId('selected-item').waitFor({ timeout: 10_000 });
    await snap('viewer-tap');
    await byId('apply-measures').scrollIntoViewIfNeeded();
    await snap('viewer-controls');
    if (MODE === 'ai') {
      await byId('world-card').scrollIntoViewIfNeeded();
      await byId('start-world').click();
      await byId('open-world').waitFor({ timeout: 60_000 });
      await snap('viewer-world-ready');
    }
  });

  await step('adjust proposal creates a new version', async () => {
    await page.goto(`${BASE}/project/${projectId}/proposal/B`, { waitUntil: 'domcontentloaded' });
    await byId('proposal-screen').waitFor();
    await byId('adjust-proposal').click();
    await byId('adjust-screen').waitFor();
    await snap('adjust');
    if (MODE === 'ai') {
      await byId('adjust-text').fill('Troque o verde por azul-marinho e mantenha a estante.');
      await byId('adjust-submit').click();
    } else {
      await byId('demo-cheaper').click();
    }
    await byId('proposal-screen').waitFor({ timeout: 120_000 });
    await page.getByText('Versão 2', { exact: false }).first().waitFor({ timeout: 120_000 });
    await page.mouse.wheel(0, 4000);
    await snap('proposal-history');
  });

  await step('compare proposals', async () => {
    await page.goto(`${BASE}/project/${projectId}/compare`, { waitUntil: 'domcontentloaded' });
    await byId('compare-screen').waitFor();
    await snap('compare');
  });

  await step('saved projects: reopen, rename, delete', async () => {
    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' });
    await byId(`project-card-${projectId}`).waitFor();
    await snap('projects');
    await byId(`rename-${projectId}`).click();
    await byId('rename-input').fill('Minha sala nova');
    await byId('rename-save').click();
    await page.getByText('Minha sala nova').first().waitFor({ timeout: 10_000 });
    await byId(`project-card-${projectId}`).click();
    await byId('project-screen').waitFor();
    await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' });
    await byId(`delete-${projectId}`).click();
    await page.getByText('Nenhum projeto ainda').waitFor({ timeout: 10_000 });
    await snap('projects-empty');
  });

  await step('settings', async () => {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
    await byId('settings-screen').waitFor();
    await snap('settings');
  });
} catch {
  // reported below
}

await browser.close();
const ignorable = (e) => /DevTools|favicon|Download the React DevTools|ResizeObserver loop/.test(e);
const realErrors = errors.filter((e) => !ignorable(e));
const report = [`MODE=${MODE}`, ...steps, '', `console/page errors: ${realErrors.length}`, ...realErrors.slice(0, 30)].join('\n');
writeFileSync(join(out, 'report.txt'), report);
console.log(report);
process.exit(steps.some((s) => s.startsWith('✘')) || realErrors.length ? 1 : 0);
