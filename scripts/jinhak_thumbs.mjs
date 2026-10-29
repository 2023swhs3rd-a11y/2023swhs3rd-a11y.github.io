#!/usr/bin/env node
// 대입·진로 추천 자료의 미리보기 그림(jinhak/thumbs/<id>.jpg, 640×400 JPEG)을 만든다.
//   node scripts/jinhak_thumbs.mjs              그림이 없는 자료만 만든다
//   node scripts/jinhak_thumbs.mjs <id> [<id>]  지정한 자료를 다시 만든다(있어도 덮어씀)
// 그림 출처: 유튜브는 영상 대표 이미지, 구글 드라이브·문서·시트는 드라이브 미리보기(공개 파일이어야 함),
// 그 밖의 웹사이트는 첫 화면을 1280×800으로 캡처해 줄인다. 이미지 주소(.jpg·.png)는 그대로 쓴다.
// playwright 가 필요하다(npm i -g playwright && npx playwright install chromium). 먼저 python3 scripts/jinhak_data.py --fix 로 id 를 채운다.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'jinhak', 'thumbs');
const W = 640, H = 400, QUALITY = 72;

let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('playwright 가 없습니다: npm i -g playwright && npx playwright install chromium'); process.exit(1); }

// 자료 주소 → 그림으로 쓸 이미지 주소. 없으면 null(웹 화면을 캡처)
export function imageFor(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return `https://i.ytimg.com/vi/${u.pathname.slice(1).split('/')[0]}/hqdefault.jpg`;
  if (host === 'youtube.com') {
    const v = u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/) || [])[1];
    if (v) return `https://i.ytimg.com/vi/${v}/hqdefault.jpg`;
    return null; // 재생목록·채널은 화면 캡처
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const id = (u.pathname.match(/\/d\/([\w-]{10,})/) || [])[1] || u.searchParams.get('id');
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1280`;
    return null; // 폴더는 화면 캡처
  }
  if (/\.(jpe?g|png|webp|gif)$/i.test(u.pathname)) return url;
  return null;
}

async function main() {
  const data = JSON.parse(readFileSync(join(ROOT, 'jinhak', 'resources.json'), 'utf8'));
  const want = process.argv.slice(2);
  const todo = data.items.filter((it) => want.length ? want.includes(it.id) : !existsSync(join(DIR, `${it.id}.jpg`)));
  const noId = data.items.filter((it) => !it.id);
  if (noId.length) { console.error(`id 가 없는 자료 ${noId.length}개: 먼저 python3 scripts/jinhak_data.py --fix`); process.exit(1); }
  if (!todo.length) { console.log('새로 만들 미리보기 그림이 없습니다.'); return; }

  const browser = await chromium.launch();
  let fail = 0;
  for (const it of todo) {
    const out = join(DIR, `${it.id}.jpg`);
    try {
      const img = imageFor(it.url);
      if (img) {
        // 이미지를 640×400 칸에 위쪽 기준으로 꽉 채워 찍는다
        const p = await browser.newPage({ viewport: { width: W, height: H } });
        await p.setContent(`<style>html,body{margin:0;background:#fff}img{display:block;width:${W}px;height:${H}px;object-fit:cover;object-position:top}</style><img src="${img.replace(/"/g, '&quot;')}">`);
        const ok = await p.evaluate(() => new Promise((res) => { const i = document.images[0]; if (i.complete) res(i.naturalWidth > 0); else { i.onload = () => res(true); i.onerror = () => res(false); } }));
        if (!ok) throw new Error(`그림을 받지 못함: ${img}`);
        await p.screenshot({ path: out, type: 'jpeg', quality: QUALITY });
        await p.close();
      } else {
        // 웹사이트 첫 화면을 1280×800으로 열어 절반 크기로 찍는다
        const p = await browser.newPage({ viewport: { width: W * 2, height: H * 2 }, deviceScaleFactor: 0.5, locale: 'ko-KR' });
        await p.goto(it.url, { waitUntil: 'load', timeout: 45000 });
        await p.waitForTimeout(1500);
        await p.screenshot({ path: out, type: 'jpeg', quality: QUALITY });
        await p.close();
      }
      console.log(`만듦 ${it.id}  ${it.title}`);
    } catch (e) {
      fail++;
      const msg = e.message.split('\n')[0];
      // PDF 파일을 바로 가리키는 주소는 브라우저가 내려받기로 처리해 캡처할 수 없다
      const hint = /download/i.test(msg) ? ' → PDF 첫 쪽을 640×400 JPEG로 저장해 직접 넣으세요' : '';
      console.error(`실패 ${it.id}  ${it.title}: ${msg}${hint}`);
    }
  }
  await browser.close();
  console.log(`미리보기 그림 ${todo.length - fail}개 만듦${fail ? `, ${fail}개 실패(화면에는 형태 아이콘이 대신 보임)` : ''}`);
  if (fail) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
