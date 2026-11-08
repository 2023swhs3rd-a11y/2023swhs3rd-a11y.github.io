// 첫 화면(픽셀 학교)을 링크로 보낼 때 뜨는 미리보기 그림 og.png(1200×630)를 만든다.
// 쓰는 법: 저장소 맨 위에서 `python3 -m http.server 8765`를 켜 둔 채 `node scripts/og_image.mjs` (playwright 필요).
// 교실 이름을 바꾸면 아래 ROOMS도 같이 고치고 다시 만든 뒤, index.html의 og:image 주소 ?v= 숫자를 올린다.
// 글자는 갈무리 글꼴 일부(화면에 나오는 글자만 들어 있음)로 쓰므로 화면에 없는 글자는 넣지 않는다.
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('playwright 가 없습니다: npm i -g playwright && npx playwright install chromium'); process.exit(1); }

const BASE = process.env.BASE || 'http://localhost:8765';
const ROOMS = ['2028 대입', '진로 자료', '학생수 통계', '독서나눔', '뉴스 탐구', '탐구 매트릭스'];
const stagePng = join(tmpdir(), 'og-stage.png');

const browser = await chromium.launch();
// 이 크기에서 게임 화면이 정확히 2배(768×512)로 그려진다
const page = await browser.newPage({ viewport: { width: 1200, height: 702 } });
await page.goto(BASE + '/');
await page.waitForTimeout(1200);
await page.click('#kids > :nth-child(2)'); // 보라를 골라 복도에 세운다
await page.waitForTimeout(300);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(800);
await page.addStyleTag({ content: '.hud-row,#change,#sound,.toast,.stars{display:none!important} .stage{box-shadow:none}' });
await (await page.$('#stage')).screenshot({ path: stagePng });

const img = readFileSync(stagePng).toString('base64');
const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.goto(BASE + '/404.html'); // 글꼴을 같은 주소에서 불러오려고 먼저 연다
await card.setContent(`<!doctype html><html><head><style>
@font-face{font-family:G;src:url(${BASE}/assets/school/fonts/galmuri11-subset.woff2)}
body{margin:0;width:1200px;height:630px;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:14px;
 background:#1d1733;color:#f6ead0;font-family:G;
 background-image:radial-gradient(2px 2px at 20px 30px,#ffffff55 50%,transparent 51%),radial-gradient(2px 2px at 90px 80px,#ffffff40 50%,transparent 51%);background-size:180px 120px}
.l{width:360px}
.s{color:#b9add8;font-size:22px;margin:0 0 14px}
h1{margin:0;font-size:58px;line-height:1.15;color:#fff;text-shadow:4px 4px 0 #2b1d2e}
.g{display:inline-block;margin:18px 0 26px;color:#1d1733;background:#ffd36b;font-size:30px;padding:4px 14px;box-shadow:4px 4px 0 #2b1d2e}
ul{list-style:none;margin:0;padding:0;font-size:20px;line-height:1.75}
ul b{display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;margin-right:10px;background:#f6ead0;color:#1d1733;font-size:17px}
img{display:block;box-shadow:0 0 0 4px #2b1d2e,10px 10px 0 4px #00000066}
</style></head><body>
<div class="l"><p class="s">봉일천고등학교 진로진학부</p><h1>진로진학<br>자료실</h1><span class="g">픽셀 학교</span>
<ul>${ROOMS.map((r, i) => `<li><b>${i + 1}</b>${r}</li>`).join('')}</ul></div>
<img src="data:image/png;base64,${img}" alt=""></body></html>`);
await card.evaluate(() => document.fonts.ready);
await card.waitForTimeout(300);
await card.screenshot({ path: join(ROOT, 'og.png') });
await browser.close();
console.log('og.png 만듦 (1200×630)');
