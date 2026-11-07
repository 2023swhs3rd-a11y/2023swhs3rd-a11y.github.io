/*
  픽셀 학교 (첫 화면 /)
  - 교실 여섯 칸은 index.html의 "교실 바로가기" 목록(#rooms a)에서 읽는다. 주소·이름·설명·색·벽 그림을 바꾸려면 그 목록만 고친다.
  - 그림은 모두 이 파일에서 캔버스에 직접 찍는다(그림 파일 없음). 지도 단위는 가로형 384×256, 세로형(휴대폰) 240×336이고,
    한 단위를 2×2 픽셀로 그려 캐릭터와 소품을 두 배 해상도로 표현한다.
  - 걷기: 방향키·WASD, 터치 방향 패드, 화면 클릭·터치. 교실 문으로 들어가면 선생님이 맞아 주고 Enter·A·클릭으로 연다.
    숫자키 1~6은 그 교실 사이트를 바로 연다. M은 소리 켜기·끄기.
  - 효과음은 Web Audio로 그 자리에서 합성한다(소리 파일 없음).
  - 고른 학생과 소리 설정은 localStorage, 마지막에 들어간 교실은 sessionStorage에 두어 뒤로 오면 그 교실 문 앞에서 다시 시작한다.
*/
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RES = 2; // 지도 한 단위 = 2픽셀

  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function load(key, store) { try { return JSON.parse(store.getItem(key)); } catch { return null; } }
  function save(key, v, store) { try { store.setItem(key, JSON.stringify(v)); } catch { /* 저장 안 되는 환경 */ } }

  /* ───────── 교실 ───────── */
  const ROOMS = [...document.querySelectorAll('#rooms a')].map((a, i) => ({
    n: i + 1,
    el: a,
    url: a.getAttribute('href'),
    title: a.querySelector('h3').textContent.trim(),
    desc: a.querySelector('p').textContent.trim(),
    short: a.dataset.short,
    color: a.dataset.color,
    light: mix(a.dataset.color, '#ffffff', 0.55),
    pale: mix(a.dataset.color, '#ffffff', 0.8),
    dark: mix(a.dataset.color, '#000000', 0.3),
    icon: a.dataset.icon,
  }));
  ROOMS.forEach((r) => r.el.style.setProperty('--c', r.color));

  /* ───────── 색 ───────── */
  const C = {
    out: '#2b1d2e', ink: '#1d1430',
    hallA: '#f1e3bf', hallB: '#e6d3a6', hallHi: '#fbf1d6', hallSh: '#d4bd8a',
    woodA: '#d8a066', woodB: '#cc9259', woodLine: '#b07646', woodHi: '#e6b37c',
    wallTop: '#7b5642', wallHi: '#9a6e52', face: '#fbf0d8', faceSh: '#efdfbf',
    wains: '#8fbb81', wainsHi: '#a9d09b', wainsDk: '#679660', trim: '#5b3d2e',
    board: '#2f6a4f', boardDk: '#245641', boardHi: '#3b7d5e', frame: '#9a6339', frameHi: '#b77c4c', chalk: '#f4f1de',
    desk: '#eab273', deskHi: '#f6cd94', deskDk: '#b87846', leg: '#7a4a2a',
    chair: '#7d9cc0', chairHi: '#9cb7d6', chairDk: '#58789c',
    glass: '#a8dcef', glassHi: '#e6f7fc', sky: '#bfe6f5',
    leaf: '#5aa553', leafHi: '#7cc46a', leafDk: '#3b7f3d', pot: '#d0693f', potHi: '#e58b5e', potDk: '#9f4a2a',
    shadow: 'rgba(43,29,46,0.2)', shadow2: 'rgba(43,29,46,0.12)',
    gold: '#ffd36b',
  };

  /* ───────── 사람 그리기(학생·선생님 모두 새로 만든 캐릭터) ─────────
     도형(타원·사각형)으로 칸을 칠한 뒤 오른쪽·아래 가장자리에 그늘, 머리에 윤기, 색마다 다른 테두리를 자동으로 넣는다. */
  const KIDS = [
    { id: 'haneul', name: '하늘', line: '아침마다 1등으로 등교해요', style: 'short', outfit: 'blazer',
      pal: { h: '#2a2440', s: '#f7cba4', c: '#2f3f73', t: '#d8394a', p: '#6b7280', E: '#4a3a6a' } },
    { id: 'bora', name: '보라', line: '도서관 창가 자리가 제 자리예요', style: 'long', outfit: 'blazer', skirt: true,
      pal: { h: '#7a4a2e', s: '#f8d2b0', c: '#2f3f73', t: '#e0475a', p: '#a33a4a', E: '#7a4a2e' } },
    { id: 'doyun', name: '도윤', line: '궁금한 건 바로 찾아봐야 해요', style: 'spiky', outfit: 'sweater', glasses: true,
      pal: { h: '#3a2e2a', s: '#efbe94', c: '#3f7d4e', t: '#2f3f73', p: '#3b4252', E: '#3a2e2a' } },
    { id: 'seoa', name: '서아', line: '체육대회 계주 마지막 주자!', style: 'pony', outfit: 'track',
      pal: { h: '#5b3524', s: '#f3c49c', c: '#ee7a3c', t: '#ffffff', p: '#2f3f73', r: '#ffd36b', E: '#5b3524' } },
    { id: 'jimin', name: '지민', line: '오늘의 뉴스는 제가 스크랩해요', style: 'bob', outfit: 'cardigan', skirt: true,
      pal: { h: '#1f1b2e', s: '#f8d2b0', c: '#f2c14e', t: '#2f3f73', p: '#3b4a7a', E: '#3a3a6a' } },
    { id: 'yuchan', name: '유찬', line: '그래프 그리는 게 제일 재밌어요', style: 'short', outfit: 'hoodie',
      pal: { h: '#8a3b22', s: '#e9b386', c: '#7c5cc4', t: '#ffffff', p: '#4b5563', E: '#8a3b22' } },
  ];
  const TEACHERS = [
    { id: 't1', name: '김 선생님', adult: true, style: 'sidepart', outfit: 'blazer', glasses: true,
      pal: { h: '#55546a', s: '#f1c49c', c: '#2b3a66', t: '#d8394a', p: '#353b4a' }, say: '대입 전형은 무엇이든 물어보세요.' },
    { id: 't2', name: '박 선생님', adult: true, style: 'bun', outfit: 'cardigan', skirt: true,
      pal: { h: '#5a3424', s: '#f6cfa8', c: '#e98aa8', t: '#c2410c', p: '#4b4f7a' }, say: '진로 고민, 같이 찾아봐요.' },
    { id: 't3', name: '이 선생님', adult: true, style: 'short', outfit: 'labcoat', glasses: true,
      pal: { h: '#2a2440', s: '#ecba8f', c: '#f4f4f4', x: '#7fb3e0', t: '#0e7490', p: '#3b4252' }, say: '숫자 속에 우리 동네 이야기가 있어요.' },
    { id: 't4', name: '최 선생님', adult: true, style: 'long', outfit: 'cardigan', skirt: true,
      pal: { h: '#2e2030', s: '#f8d2b0', c: '#6fae6a', w: '#fff6e0', t: '#c2410c', p: '#a35a3a' }, say: '오늘은 어떤 책을 읽고 있나요?' },
    { id: 't5', name: '정 선생님', adult: true, style: 'sidepart', outfit: 'sweater', mustache: true,
      pal: { h: '#3a2a20', s: '#e7b088', c: '#c97b3a', t: '#15803d', p: '#4a3a30' }, say: '뉴스 한 줄이 진로가 되기도 해요.' },
    { id: 't6', name: '한 선생님', adult: true, style: 'bob', outfit: 'dress',
      pal: { h: '#1f1b2e', s: '#f3c49c', c: '#b04a8a', p: '#b04a8a', t: '#ffffff' }, say: '생각을 한 단계씩 키워 봐요.' },
  ];
  const BASEPAL = { e: '#2b1d2e', E: '#4a3a5a', W: '#ffffff', b: '#f59b9b', m: '#c0504d', w: '#ffffff', k: '#3b2a24', g: '#2b1d2e', r: '#e0475a', x: '#ffffff' };
  [...KIDS, ...TEACHERS].forEach((p) => { p.pal = { ...BASEPAL, ...p.pal }; });

  const SPR_W = 24;
  const spriteCache = new Map();
  function personSprite(sp, dir, frame, blink) {
    const key = `${sp.id}|${dir}|${frame}|${blink ? 1 : 0}`;
    let cv = spriteCache.get(key);
    if (cv) return cv;
    cv = drawPerson(sp, dir, frame, blink);
    spriteCache.set(key, cv);
    return cv;
  }
  function drawPerson(sp, dir, frame, blink) {
    const A = !!sp.adult, W = SPR_W;
    const side = dir === 'left' || dir === 'right', up = dir === 'up', down = dir === 'down';
    const top = 3;
    const hr = A ? 8 : 9.5, hry = A ? 8 : 9;
    const cx = side ? 11.5 : 12;
    const hcy = top + hry + 0.5;
    const headBottom = hcy + hry;
    const bodyTop = Math.round(headBottom) - 1;
    const bodyH = A ? 15 : 10;
    const legTop = bodyTop + bodyH;
    const legH = A ? 8 : 4;
    const shoeY = legTop + legH;
    const H = shoeY + 3;
    const G = Array.from({ length: H }, () => Array(W).fill(null));
    const set = (x, y, k, under) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      if (under && G[y][x]) return;
      G[y][x] = k;
    };
    const rect = (x, y, w, h, k, under) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, k, under); };
    const ell = (ex, ey, rx, ry, k, clip, under) => {
      for (let y = Math.floor(ey - ry) - 1; y <= Math.ceil(ey + ry); y++) for (let x = Math.floor(ex - rx) - 1; x <= Math.ceil(ex + rx); x++) {
        const dx = (x + 0.5 - ex) / rx, dy = (y + 0.5 - ey) / ry;
        if (dx * dx + dy * dy <= 1 && (!clip || clip(x, y))) set(x, y, k, under);
      }
    };
    const st = sp.style, out = sp.outfit;
    const L0 = Math.round(cx);

    /* 1. 뒷머리 */
    if (st === 'long' && !up) {
      if (side) rect(cx - 1, hcy - 3, hr + 2.5, bodyTop + (A ? 10 : 8) - (hcy - 3), 'h');
      else { rect(cx - hr - 0.5, hcy - 2, 2 * hr + 1, bodyTop + (A ? 10 : 8) - (hcy - 2), 'h'); }
    }
    if (st === 'bob' && !up) {
      if (side) rect(cx - 1, hcy - 3, hr + 2, hry + 3, 'h');
      else rect(cx - hr - 0.5, hcy - 2, 2 * hr + 1, hry + 2, 'h');
    }
    if (st === 'pony') {
      if (side) { rect(cx + hr - 1.5, hcy - 4, 3, 4, 'h'); rect(cx + hr - 0.5, hcy - 1, 3, 8, 'h'); }
      else if (down) { rect(cx + hr - 2.5, hcy - 6, 4, 5, 'h'); }
    }
    if (st === 'bun' && !up) {
      if (side) ell(cx + hr - 2, hcy - hry + 1, 3.5, 3.2, 'h');
      else ell(cx, top - 0.2, 3.8, 3.2, 'h');
    }
    if (out === 'hoodie' && !up) rect(cx - 6, bodyTop - 2, 12, 4, 'c');

    /* 2. 다리와 신발 */
    const lift = frame === 'a' ? 'R' : frame === 'b' ? 'L' : '';
    if (!side) {
      const legs = [['L', L0 - 4], ['R', L0 + 1]];
      for (const [id, x] of legs) {
        const lf = lift === id ? 1 : 0;
        if (sp.skirt) { rect(x, legTop, 3, legH - lf, 's'); rect(x, legTop + legH - 1 - lf, 3, 1, 'w'); }
        else rect(x, legTop, 3, legH - lf, 'p');
        rect(id === 'L' ? x - 1 : x, shoeY - lf, 4, 2, 'k');
      }
    } else {
      const stride = frame === 'a';
      const legsS = stride ? [[cx - 5, 0], [cx + 1, 0]] : [[cx - 2, 0]];
      for (const [x] of legsS) {
        rect(x, legTop, 4, legH, sp.skirt ? 's' : 'p');
        if (sp.skirt) rect(x, legTop + legH - 1, 4, 1, 'w');
        rect(x - 1, shoeY, 5, 2, 'k');
      }
    }

    /* 3. 몸 */
    const tx0 = side ? cx - 3.5 : L0 - 5, tw = side ? 8 : 10;
    const bodyEnd = legTop + (out === 'labcoat' || out === 'dress' ? 2 : 0);
    rect(tx0, bodyTop, tw, bodyEnd - bodyTop, 'c');
    if (out !== 'track' && out !== 'hoodie' && !side) { rect(tx0 - 1, legTop - 2, 1, 2 + (bodyEnd - legTop), 'c'); rect(tx0 + tw, legTop - 2, 1, 2 + (bodyEnd - legTop), 'c'); }
    if (sp.skirt || out === 'dress') {
      const sk = out === 'dress' ? 'c' : 'p';
      const sh = A ? 5 : 3;
      if (!side) { rect(tx0 - 1, legTop, tw + 2, sh, sk); rect(tx0 - 2, legTop + sh - 1, tw + 4, 1, sk); }
      else { rect(tx0 - 1, legTop, tw + 2, sh, sk); }
    }
    // 팔
    const armK = out === 'sweater' ? 'w' : out === 'labcoat' ? 'c' : 'c';
    if (!side) {
      const swing = frame === 'a' ? 1 : frame === 'b' ? -1 : 0;
      rect(tx0 - 2, bodyTop + 1, 2, bodyH - 3 + swing, armK); rect(tx0 - 2, bodyTop + bodyH - 2 + swing, 2, 2, 's');
      rect(tx0 + tw, bodyTop + 1, 2, bodyH - 3 - swing, armK); rect(tx0 + tw, bodyTop + bodyH - 2 - swing, 2, 2, 's');
      if (out === 'track') { rect(tx0 - 2, bodyTop + 1, 1, bodyH - 3, 'w'); rect(tx0 + tw + 1, bodyTop + 1, 1, bodyH - 3, 'w'); }
    }
    // 옷 앞모양
    if (down) {
      const mid = L0 - 1;
      if (out === 'blazer' || out === 'sweater' || out === 'labcoat') {
        const inner = out === 'labcoat' ? 'x' : 'w';
        rect(mid - 2, bodyTop, 6, 1, inner); rect(mid - 1, bodyTop + 1, 4, 1, inner); rect(mid, bodyTop + 2, 2, 1, inner);
        if (out === 'sweater') rect(mid - 1, bodyTop + 3, 4, 1, 'w');
        rect(mid, bodyTop + 1, 2, A ? 7 : 5, 't'); rect(mid + 0.5, bodyTop + (A ? 8 : 6), 1, 1, 't');
        if (out === 'blazer') { set(mid + 3, bodyTop + (A ? 9 : 6), 'k'); set(mid + 3, bodyTop + (A ? 12 : 8), 'k'); }
        if (out === 'labcoat') { rect(mid - 3, bodyTop + 3, 1, bodyEnd - bodyTop - 3, 'C'); rect(mid + 4, bodyTop + 3, 1, bodyEnd - bodyTop - 3, 'C'); rect(tx0 + 1, legTop - 4, 3, 2, 'C'); }
      } else if (out === 'cardigan') {
        rect(mid - 1, bodyTop, 4, bodyH, 'w'); rect(mid, bodyTop + 1, 2, 2, 't');
        for (let y = bodyTop + 4; y < legTop - 1; y += 3) set(mid - 2, y, 'k');
      } else if (out === 'track') {
        rect(mid - 2, bodyTop, 6, 1, 'w'); rect(mid + 1, bodyTop + 1, 1, bodyH - 1, 't');
      } else if (out === 'hoodie') {
        rect(mid - 1, bodyTop, 1, 4, 't'); rect(mid + 2, bodyTop, 1, 4, 't');
        rect(tx0 + 2, legTop - 4, tw - 4, 3, 'C');
      } else if (out === 'dress') {
        rect(mid - 2, bodyTop, 6, 1, 'w'); rect(tx0, legTop - 4, tw, 1, 't');
      }
    } else if (up) {
      if (out === 'hoodie') { rect(L0 - 4, bodyTop, 8, 4, 'C'); }
      else if (out === 'blazer' || out === 'labcoat') rect(L0 - 3, bodyTop, 6, 1, out === 'labcoat' ? 'x' : 'w');
      else if (out === 'track') rect(L0 - 3, bodyTop, 6, 1, 'w');
    } else {
      // 옆모습 팔
      const sw = frame === 'a' ? -2 : 0;
      rect(cx - 1 + sw, bodyTop + 1, 3, bodyH - 3, armK === 'w' ? 'w' : 'C');
      rect(cx - 1 + sw, bodyTop + bodyH - 2, 3, 2, 's');
      if (out === 'blazer' || out === 'labcoat' || out === 'sweater') rect(tx0, bodyTop, 2, 3, out === 'labcoat' ? 'x' : 'w');
      if (out === 'hoodie') rect(cx + 1, bodyTop - 1, 4, 4, 'C');
    }

    /* 4. 머리(피부) */
    ell(cx, hcy, hr, hry, 's');
    if (sp.adult && down) rect(L0 - 2, bodyTop - 1, 4, 2, 's');

    /* 5. 얼굴 */
    const eyeY = Math.round(hcy + (A ? 1 : 1.5));
    const eyeRows = A ? ['ee', 'We', 'eE'] : ['ee', 'We', 'eE', 'EE'];
    const drawEye = (x0) => {
      if (blink) { rect(x0, eyeY + (A ? 1 : 2), 2, 1, 'e'); return; }
      eyeRows.forEach((row, j) => [...row].forEach((c, i) => set(x0 + i, eyeY + j, c)));
    };
    if (down) {
      const lx = L0 - 6 + (A ? 1 : 0), rx = L0 + 3 - (A ? 1 : 0);
      drawEye(lx); drawEye(rx);
      if (!A) { rect(lx - 2, eyeY + 4, 2, 1, 'b'); rect(rx + 2, eyeY + 4, 2, 1, 'b'); }
      else { rect(lx, eyeY - 2, 2, 1, 'H'); rect(rx, eyeY - 2, 2, 1, 'H'); }
      rect(L0 - 1, eyeY + (A ? 5 : 5), 2, 1, 'm');
      if (sp.mustache) rect(L0 - 2, eyeY + 4, 4, 1, 'H');
      if (sp.glasses) {
        for (const x0 of [lx, rx]) {
          const gh = A ? 4 : 5;
          rect(x0 - 1, eyeY - 1, 4, 1, 'g'); rect(x0 - 1, eyeY + gh - 1, 4, 1, 'g');
          rect(x0 - 1, eyeY - 1, 1, gh, 'g'); rect(x0 + 2, eyeY - 1, 1, gh, 'g');
        }
        rect(lx + 3, eyeY, rx - lx - 4, 1, 'g');
      }
    } else if (side) {
      const ex = Math.round(cx - 6.5);
      drawEye(ex);
      if (!A) rect(ex - 2, eyeY + 4, 2, 1, 'b');
      set(ex - 2, eyeY + 5, 'm');
      if (sp.mustache) rect(ex - 2, eyeY + 4, 3, 1, 'H');
      if (A) rect(ex, eyeY - 2, 2, 1, 'H');
      if (sp.glasses) {
        const gh = A ? 4 : 5;
        rect(ex - 1, eyeY - 1, 4, 1, 'g'); rect(ex - 1, eyeY + gh - 1, 4, 1, 'g');
        rect(ex - 1, eyeY - 1, 1, gh, 'g'); rect(ex + 2, eyeY - 1, 1, gh, 'g');
        rect(ex + 3, eyeY, 4, 1, 'g');
      }
    }

    /* 6. 앞머리 */
    if (up) {
      ell(cx, hcy - 0.5, hr + 0.7, hry + 0.6, 'h');
      if (st === 'long') rect(cx - hr - 0.5, hcy, 2 * hr + 1, bodyTop + (A ? 10 : 8) - hcy, 'h');
      if (st === 'bob') rect(cx - hr - 0.5, hcy, 2 * hr + 1, hry + 1, 'h');
      if (st === 'pony') { rect(L0 - 1, hcy + 2, 3, A ? 10 : 12, 'h'); rect(L0 - 2, hcy + 1, 5, 2, 'r'); }
      if (st === 'bun') ell(cx, hcy - hry + 1.5, 3.8, 3.2, 'h');
      if (st === 'short' || st === 'spiky' || st === 'sidepart') { set(cx - hr - 0.3, hcy + 1, 's'); set(cx - hr - 0.3, hcy + 2, 's'); set(cx + hr - 0.7, hcy + 1, 's'); set(cx + hr - 0.7, hcy + 2, 's'); }
    } else if (down) {
      ell(cx, hcy - 0.8, hr + 0.7, hry + 0.5, 'h', (x, y) => y < hcy - 1.5);
      const x0 = Math.round(cx - hr), x1 = Math.round(cx + hr);
      for (let x = x0; x < x1; x++) {
        if (st === 'sidepart') {
          set(x, hcy - 1.5, 'h');
          if (x < cx + 3) set(x, hcy - 0.5, 'h');
          if (x < cx - 3) set(x, hcy + 0.5, 'h');
        } else {
          set(x, hcy - 1.5, 'h');
          if ((x - x0) % 4 !== 1) set(x, hcy - 0.5, 'h');
          if ((x - x0) % 4 === 3 || (x - x0) % 4 === 0) set(x, hcy + 0.5, 'h');
        }
      }
      const burn = st === 'long' || st === 'bob' ? (A ? 9 : 9) : 4;
      rect(x0, hcy - 1, 2, burn, 'h'); rect(x1 - 2, hcy - 1, 2, burn, 'h');
    } else {
      ell(cx + 0.5, hcy - 0.8, hr + 0.6, hry + 0.5, 'h', (x, y) => y < hcy - 1.5 || x > cx + 0.5);
      for (let x = Math.round(cx - hr); x < cx; x++) {
        set(x, hcy - 1.5, 'h');
        if (st !== 'sidepart' && (x % 3) !== 0) set(x, hcy - 0.5, 'h');
      }
      if (st === 'short' || st === 'spiky' || st === 'sidepart') { rect(cx + 1, hcy + 1, 2, 3, 's'); set(cx + 1.5, hcy + 2, 'S'); }
    }
    if (st === 'spiky') {
      const tY = Math.round(hcy - hry - 0.6);
      for (const dx of [-7, -4, -1, 2, 5]) { const x = cx + dx + (side ? 1 : 0); set(x, tY - 1, 'h'); set(x + 1, tY - 1, 'h'); set(x + 1, tY - 2, 'h'); }
    }
    if (st === 'pony' && side) set(cx + hr - 0.5, hcy - 1, 'r');
    if (st === 'pony' && down) rect(cx + hr - 2.5, hcy - 6, 2, 1, 'r');

    if (dir === 'right') G.forEach((r) => r.reverse());

    /* 7. 그늘·윤기·테두리 */
    const shadeable = new Set(['h', 's', 'c', 'p', 'k', 'w', 'x']);
    const S = G.map((r) => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = G[y][x];
      if (!shadeable.has(k)) continue;
      const rgt = G[y][x + 1], lft = G[y][x - 1];
      const below = (G[y + 1] || [])[x], above = (G[y - 1] || [])[x];
      if ((rgt !== k && lft === k) || (below !== k && above === k && k !== 's')) S[y][x] = k + '2';
    }
    for (let x = 0; x < W; x++) {
      const inBand = x > cx - 7 && x < cx;
      if (!inBand) continue;
      for (let y = 0; y < H; y++) {
        if (G[y][x] === 'h') { if (G[y + 1] && G[y + 1][x] === 'h' && G[y + 2] && G[y + 2][x] === 'h') S[y + 1][x] = 'hL'; break; }
        if (G[y][x]) break;
      }
    }
    const pal = sp.pal;
    const colorOf = (k) => {
      if (!k) return null;
      if (k.length === 2) {
        const b = pal[k[0]] || '#ff00ff';
        return k[1] === 'L' ? mix(b, '#ffffff', 0.32) : mix(b, C.ink, 0.26);
      }
      if (k === 'S') return mix(pal.s, C.ink, 0.2);
      if (k === 'H') return mix(pal.h, C.ink, 0.25);
      if (k === 'C') return mix(pal.c, C.ink, 0.22);
      return pal[k] || '#ff00ff';
    };
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = S[y][x];
      if (k) { g.fillStyle = colorOf(k); g.fillRect(x, y, 1, 1); continue; }
      const nb = [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([dx, dy]) => (G[y + dy] || [])[x + dx]).find(Boolean);
      if (nb) { g.fillStyle = mix(colorOf(nb), C.ink, 0.62); g.fillRect(x, y, 1, 1); }
    }
    cv.foot = shoeY + 2; // 발바닥 줄
    return cv;
  }

  /* ───────── 벽 그림 8×8 (A 교실색 a 연한 교실색 k 진한색 w 흰색) ───────── */
  const ICONS = {
    pennant: ['k.......', 'kAAA....', 'kAwAAA..', 'kAAAAAAA', 'kAAAA...', 'kAA.....', 'k.......', 'k.......'],
    star: ['...AA...', '...AA...', 'AAAwwAAA', '.AAwwAA.', '..AAAA..', '.AAAAAA.', '.AA..AA.', 'A......A'],
    chart: ['.....A..', '.....A..', '..A..A..', '..A..AA.', 'A.A..AA.', 'A.AA.AA.', 'AaAAaAAa', 'kkkkkkkk'],
    book: ['........', '.AA..AA.', 'AwwAAwwA', 'AwkAAkwA', 'AwwAAwwA', 'AwkAAkwA', '.AAAAAA.', '...AA...'],
    news: ['AAAAAAAA', '........', 'kkk.kkkk', 'kkk.....', 'kkk.kkkk', '....kkkk', 'kkk.kkkk', 'kkk.....'],
    pyramid: ['...AA...', '...AA...', '..aaaa..', '..aaaa..', '.AAAAAA.', '.AAAAAA.', 'aaaaaaaa', 'aaaaaaaa'],
  };
  const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'] };
  const PROPS = { pennant: ['trophy', 'plant', 'trash'], star: ['globe', 'shelf', 'plant'], chart: ['easel', 'globe', 'plant'], book: ['shelf', 'beanbag', 'plant'], news: ['tv', 'plant', 'trash'], pyramid: ['blocks', 'plant', 'trash'] };

  /* ───────── 지도 ───────── */
  function buildLayout(portrait) {
    const L = { portrait, rooms: [] };
    if (!portrait) {
      L.W = 384; L.H = 256;
      L.hall = { x: 0, y: 104, w: 384, h: 46 };
      L.walkHall = { x: 28, y: 107, w: 384 - 28 - 24, h: 42 };
      for (let i = 0; i < 6; i++) {
        const top = i < 3, col = i % 3;
        const r = { i, room: ROOMS[i], teacher: TEACHERS[i], x: col * 128, y: top ? 0 : 150, w: 128, h: top ? 104 : 106,
          F: 24, S: top ? 12 : 4, Wt: col === 0 ? 4 : 2, Et: col === 2 ? 4 : 2 };
        if (top) {
          const cx = r.x + 92;
          r.door = { side: 'S', cx, gap: { x: cx - 10, y: r.y + r.h - 12, w: 20, h: 12 },
            walk: { x: cx - 9, y: r.y + r.h - 14, w: 18, h: 20 },
            entry: { x: cx, y: r.y + r.h - 9 }, front: { x: cx, y: L.hall.y + 16 },
            inside: (x, y) => y < r.y + r.h - 6 };
        } else {
          const cx = r.x + 30;
          r.door = { side: 'N', cx, gap: { x: cx - 10, y: r.y, w: 20, h: 24 },
            walk: { x: cx - 9, y: r.y - 6, w: 18, h: 30 },
            entry: { x: cx, y: r.y + 20 }, front: { x: cx, y: r.y - 12 },
            inside: (x, y) => y > r.y + 14 };
        }
        L.rooms.push(r);
      }
    } else {
      L.W = 240; L.H = 336;
      L.hall = { x: 96, y: 0, w: 48, h: 336 };
      L.walkHall = { x: 101, y: 28, w: 38, h: 336 - 28 - 10 };
      for (let i = 0; i < 6; i++) {
        const left = i % 2 === 0, row = Math.floor(i / 2);
        const r = { i, room: ROOMS[i], teacher: TEACHERS[i], x: left ? 0 : 144, y: row * 112, w: 96, h: 112,
          F: 24, S: row === 2 ? 4 : 2, Wt: left ? 4 : 6, Et: left ? 6 : 4 };
        const cy = r.y + r.h - 26;
        if (left) {
          r.door = { side: 'E', cy, gap: { x: r.x + r.w - 6, y: cy - 10, w: 6, h: 20 },
            walk: { x: r.x + r.w - 16, y: cy - 7, w: 23, h: 15 },
            entry: { x: r.x + r.w - 11, y: cy + 2 }, front: { x: L.hall.x + 14, y: cy + 2 },
            inside: (x) => x < r.x + r.w - 7 };
        } else {
          r.door = { side: 'W', cy, gap: { x: r.x, y: cy - 10, w: 6, h: 20 },
            walk: { x: r.x - 7, y: cy - 7, w: 23, h: 15 },
            entry: { x: r.x + 11, y: cy + 2 }, front: { x: L.hall.x + L.hall.w - 14, y: cy + 2 },
            inside: (x) => x > r.x + 7 };
        }
        L.rooms.push(r);
      }
    }
    for (const r of L.rooms) {
      r.floor = { x: r.x + r.Wt, y: r.y + r.F, w: r.w - r.Wt - r.Et, h: r.h - r.F - r.S };
      const fx0 = r.x + r.Wt, fx1 = r.x + r.w - r.Et;
      const bw = Math.min(58, Math.floor((fx1 - fx0) * 0.54));
      let bx = Math.round((fx0 + fx1) / 2 - bw / 2);
      if (r.door.side === 'N') bx = Math.max(bx, r.door.gap.x + r.door.gap.w + 20);
      r.board = { x: bx, y: r.y + 8, w: bw, h: 12 };
      // 칠판 왼쪽: 창문(자리가 넉넉할 때), 오른쪽: 벽 그림과 시계
      r.window = r.door.side !== 'N' && bx - fx0 >= 26 ? { x: fx0 + 5, y: r.y + 7, w: bx - fx0 - 13, h: 12 } : null;
      const right = fx1 - (bx + bw);
      r.poster = right >= 16 ? { x: bx + bw + 6, y: r.y + 8 } : null;
      r.clock = right >= 28 ? { x: bx + bw + 19, y: r.y + 8 } : (!r.window && r.door.side !== 'N' && bx - fx0 >= 14 ? { x: fx0 + 4, y: r.y + 9 } : null);
    }
    L.walk = [L.walkHall, ...L.rooms.map((r) => r.door.walk)];
    L.bg = drawBackground(L);
    return L;
  }

  /* ───────── 배경(교실·복도는 한 번만 그려 둔다) ───────── */
  let R = null, gctx = null;
  function useCtx(g) { gctx = g; R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; }
  function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  function drawBackground(L) {
    const cv = document.createElement('canvas');
    cv.width = L.W * RES; cv.height = L.H * RES;
    const g = cv.getContext('2d');
    g.scale(RES, RES);
    useCtx(g);
    const h = L.hall;
    // 복도 바닥: 반질반질한 타일
    for (let y = h.y; y < h.y + h.h; y += 8) for (let x = h.x; x < h.x + h.w; x += 8) {
      const odd = ((x - h.x) / 8 + (y - h.y) / 8) % 2;
      R(x, y, 8, 8, odd ? C.hallB : C.hallA);
      R(x, y, 8, 0.5, C.hallHi); R(x, y, 0.5, 8, C.hallHi);
      R(x, y + 7.5, 8, 0.5, C.hallSh); R(x + 7.5, y, 0.5, 8, C.hallSh);
      if (!odd && hash(x, y) > 0.8) R(x + 2, y + 2, 1.5, 0.5, '#ffffff');
    }
    if (!L.portrait) {
      for (let i = 0; i < 6; i++) { R(0, h.y + i * 8, 24 - i * 2, 8, i % 2 ? '#c2ab82' : '#d4bd92'); R(0, h.y + i * 8, 24 - i * 2, 0.5, '#e6d2aa'); R(0, h.y + i * 8 + 7, 24 - i * 2, 1, '#8f7a58'); }
      R(24, h.y, 2, h.h, '#8f7a58'); R(24.5, h.y, 0.5, h.h, '#b39a70');
      plant(364, h.y + 3); plant(364, h.y + h.h - 19);
      // 복도 깔개
      rug(140, h.y + 18, 104, 12, '#7d9cc0', '#ffffff');
    } else {
      for (let i = 0; i < 6; i++) { R(h.x, i * 4, h.w, 4, i % 2 ? '#c2ab82' : '#d4bd92'); R(h.x, i * 4, h.w, 0.5, '#e6d2aa'); R(h.x, i * 4 + 3.5, h.w, 0.5, '#8f7a58'); }
      R(h.x, 24, h.w, 2, '#8f7a58');
      R(h.x + 8, L.H - 8, h.w - 16, 8, '#7c9a6a'); R(h.x + 10, L.H - 6, h.w - 20, 0.5, '#5e7c50'); R(h.x + 10, L.H - 3, h.w - 20, 0.5, '#5e7c50');
      rug(h.x + 10, 150, 28, 40, '#7d9cc0', '#ffffff');
    }
    for (const r of L.rooms) drawRoom(r, L);
    if (!L.portrait) R(0, h.y, 384, 2, C.shadow);
    return cv;
  }

  function rug(x, y, w, h, c, c2) {
    R(x + 1, y, w - 2, h, c); R(x, y + 1, w, h - 2, c);
    R(x + 2, y + 1.5, w - 4, 0.5, c2); R(x + 2, y + h - 2, w - 4, 0.5, c2);
    R(x + 1.5, y + 2, 0.5, h - 4, c2); R(x + w - 2, y + 2, 0.5, h - 4, c2);
    for (let i = x + 4; i < x + w - 4; i += 4) R(i, y + h / 2 - 0.5, 1.5, 1, c2);
    for (let i = x + 2; i < x + w - 2; i += 2) { R(i, y - 1, 0.5, 1, c2); R(i, y + h, 0.5, 1, c2); }
  }
  function plant(x, y) {
    R(x + 3, y + 15.5, 9, 1, C.shadow);
    R(x + 2.5, y + 9, 9, 7, C.pot); R(x + 2, y + 9, 10, 1.5, C.potHi); R(x + 9.5, y + 10.5, 2, 5.5, C.potDk); R(x + 3.5, y + 15, 7, 1, C.potDk);
    R(x + 3, y + 3, 8, 6.5, C.leaf); R(x + 1, y + 5, 12, 3.5, C.leaf); R(x + 5, y + 0.5, 4, 3, C.leaf);
    R(x + 4, y + 3.5, 2, 1, C.leafHi); R(x + 2, y + 5.5, 2, 0.5, C.leafHi); R(x + 6, y + 1, 1.5, 1, C.leafHi);
    R(x + 8, y + 4, 2, 2, C.leafDk); R(x + 10.5, y + 6.5, 2, 1.5, C.leafDk); R(x + 5, y + 7.5, 2, 1, C.leafDk);
    R(x + 6, y + 2.5, 1, 1, '#ff8fa3'); R(x + 9.5, y + 3, 1, 1, '#ffd36b');
  }
  function shelf(x, y, room) {
    R(x, y + 20, 13, 1, C.shadow);
    R(x, y, 13, 20, C.frame); R(x, y, 13, 0.5, C.frameHi); R(x + 1, y + 1, 11, 18, '#6b4228');
    const cs = ['#e0475a', '#3f7dd8', '#f2c14e', '#4f9a4a', room ? room.color : '#c2410c', '#ffffff', '#9b6bd3'];
    for (let s = 0; s < 3; s++) {
      let bx = x + 1.5;
      for (let i = 0; bx < x + 11.5; i++) {
        const w = 1.5 + (hash(i + s * 7, x) > 0.5 ? 0.5 : 0), hh = 4 + (hash(i, s + x) > 0.6 ? 0 : 0.5);
        R(bx, y + 1.5 + s * 6 + (5 - hh), w, hh, cs[(i + s * 3) % cs.length]);
        R(bx, y + 1.5 + s * 6 + (5 - hh), 0.5, hh, 'rgba(255,255,255,.35)');
        bx += w + 0.5;
        if (hash(i, s) > 0.86) bx += 1;
      }
      R(x + 1, y + 6.5 + s * 6, 11, 1, C.frame);
    }
  }
  function globe(x, y) {
    R(x + 3, y + 19.5, 8, 1, C.shadow);
    R(x + 4, y + 18, 6, 1.5, C.leg); R(x + 6.5, y + 13, 1, 5, C.leg);
    R(x + 3, y + 3, 8, 10, '#5aa0e0'); R(x + 2, y + 5, 10, 6, '#5aa0e0'); R(x + 4, y + 2, 6, 12, '#5aa0e0');
    R(x + 4, y + 4, 3, 3, '#6fbf5a'); R(x + 7, y + 8, 3, 3, '#6fbf5a'); R(x + 3, y + 9, 2, 2, '#6fbf5a'); R(x + 8, y + 3.5, 2, 1, '#6fbf5a');
    R(x + 4.5, y + 3, 1.5, 1, '#d8efff');
    R(x + 1.5, y + 7.5, 1, 1, C.frame); R(x + 11.5, y + 7.5, 1, 1, C.frame); R(x + 6.5, y + 1, 1, 1, C.frame); R(x + 6.5, y + 14, 1, 1, C.frame);
  }
  function easel(x, y, room) {
    R(x + 2, y + 19.5, 10, 1, C.shadow);
    R(x + 2, y + 8, 1, 12, C.leg); R(x + 11, y + 8, 1, 12, C.leg); R(x + 6.5, y + 9, 1, 10, C.leg);
    R(x + 1, y + 1, 12, 10, C.out); R(x + 1.5, y + 1.5, 11, 9, '#ffffff');
    R(x + 3, y + 6, 2, 4, room.color); R(x + 6, y + 4, 2, 6, room.light); R(x + 9, y + 2.5, 2, 7.5, room.color);
    R(x + 2.5, y + 10, 9, 0.5, C.out);
  }
  function beanbag(x, y, c) {
    R(x + 1, y + 19.5, 12, 1, C.shadow);
    R(x + 1, y + 12, 12, 7.5, c); R(x + 2, y + 10.5, 10, 2, c); R(x + 3, y + 9.5, 8, 1, c);
    R(x + 3, y + 11, 4, 1, mix(c, '#ffffff', 0.35)); R(x + 9, y + 14, 3, 5, mix(c, '#000000', 0.2));
    R(x + 4, y + 15, 6, 0.5, mix(c, '#000000', 0.25));
  }
  function tv(x, y) {
    R(x + 1, y + 19.5, 12, 1, C.shadow);
    R(x + 1, y + 12, 12, 8, '#8d5a33'); R(x + 1, y + 12, 12, 0.5, C.frameHi); R(x + 2, y + 14, 4, 4.5, '#6b4228'); R(x + 8, y + 14, 4, 4.5, '#6b4228');
    R(x + 1, y + 2, 12, 10, '#3a3346'); R(x + 2, y + 3, 10, 7.5, '#7fc6e8');
    R(x + 2, y + 7.5, 10, 3, '#f2f2f2'); R(x + 3, y + 8, 5, 0.5, '#2b1d2e'); R(x + 3, y + 9, 7, 0.5, '#7a7a8a');
    R(x + 9, y + 3.5, 2, 2, '#ffd36b'); R(x + 3, y + 4, 3, 0.5, '#ffffff');
    R(x + 4, y + 0.5, 0.5, 1.5, '#3a3346'); R(x + 9, y + 0.5, 0.5, 1.5, '#3a3346');
  }
  function blocks(x, y, room) {
    R(x + 1, y + 19.5, 12, 1, C.shadow);
    const cs = [room.color, '#ffd36b', '#5aa0e0', '#6fbf5a', room.light, '#e0475a'];
    let k = 0;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) {
      const bx = x + 1.5 + i * 4 + row * 2, by = y + 15.5 - row * 4;
      R(bx, by, 4, 4, cs[k % cs.length]); R(bx, by, 4, 0.5, 'rgba(255,255,255,.45)'); R(bx + 3.5, by, 0.5, 4, 'rgba(0,0,0,.2)');
      R(bx + 1.5, by + 1.5, 1, 1, 'rgba(255,255,255,.6)');
      k++;
    }
  }
  function trophy(x, y) {
    R(x, y + 19.5, 14, 1, C.shadow);
    R(x, y + 9, 14, 11, C.frame); R(x + 1, y + 10, 12, 9, '#6b4228'); R(x, y + 9, 14, 0.5, C.frameHi);
    R(x + 4, y + 1, 6, 4, '#f2c14e'); R(x + 3, y + 1.5, 1, 2, '#f2c14e'); R(x + 10, y + 1.5, 1, 2, '#f2c14e');
    R(x + 6.5, y + 5, 1, 2, '#d39e2a'); R(x + 5, y + 7, 4, 2, '#d39e2a'); R(x + 5, y + 1.5, 1, 2, '#fff1b8');
    R(x + 2, y + 12, 3, 6, '#e0475a'); R(x + 6, y + 13, 3, 5, '#3f7dd8'); R(x + 10, y + 11, 2, 7, '#4f9a4a');
  }
  function trash(x, y) {
    R(x + 3, y + 19.5, 8, 1, C.shadow);
    R(x + 3, y + 12, 8, 8, '#7d9cc0'); R(x + 2.5, y + 11.5, 9, 1, '#9cb7d6'); R(x + 9, y + 12.5, 1.5, 7.5, '#58789c');
    R(x + 5, y + 14, 0.5, 5, '#58789c'); R(x + 7, y + 14, 0.5, 5, '#58789c');
    R(x + 4, y + 10, 3, 2, '#ffffff'); R(x + 6.5, y + 10.5, 2, 1.5, '#f2e6c0');
  }
  function drawProp(kind, x, y, room) {
    ({ plant: () => plant(x, y + 3), shelf: () => shelf(x, y, room), globe: () => globe(x, y), easel: () => easel(x, y, room),
      beanbag: () => beanbag(x, y, room.light), tv: () => tv(x, y), blocks: () => blocks(x, y, room), trophy: () => trophy(x, y), trash: () => trash(x, y) })[kind]();
  }

  function desk(x, y, w, h, chair, seed, room) {
    R(x, y + h, 1, 3, C.leg); R(x + w - 1, y + h, 1, 3, C.leg);
    R(x, y, w, h, C.desk); R(x, y, w, 0.5, C.deskHi); R(x, y + h - 1, w, 1, C.deskDk);
    if (seed != null) {
      const v = hash(seed, w);
      if (v < 0.35) { R(x + 2, y + 1.5, 4, 2.5, ['#e0475a', '#3f7dd8', '#f2c14e', room.color][Math.floor(v * 11) % 4]); R(x + 2, y + 1.5, 4, 0.5, 'rgba(255,255,255,.5)'); }
      else if (v < 0.6) { R(x + 8, y + 2, 4, 1, '#9b6bd3'); R(x + 8, y + 2, 1, 1, '#f2c14e'); }
      else if (v < 0.75) { R(x + 3, y + 1, 3, 3, '#ffffff'); R(x + 3.5, y + 2, 2, 0.5, '#7a7a8a'); }
    }
    if (chair) {
      R(x + 3, y + h + 4, w - 6, 4, C.chair); R(x + 3, y + h + 4, w - 6, 0.5, C.chairHi); R(x + 3, y + h + 7, w - 6, 1, C.chairDk);
      R(x + 3.5, y + h + 8, 0.5, 2, C.leg); R(x + w - 4, y + h + 8, 0.5, 2, C.leg);
    }
  }
  function plate(x, y, room) {
    R(x - 1, y - 1, 7, 9, C.out); R(x, y, 5, 7, room.color); R(x, y, 5, 0.5, room.light);
    DIGITS[room.n].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') R(x + 1 + i, y + 1 + j, 1, 1, '#ffffff'); }));
  }

  function drawRoom(r, L) {
    const room = r.room, f = r.floor, d = r.door;
    // 나무 바닥
    R(r.x, r.y, r.w, r.h, C.woodA);
    for (let y = f.y, k = 0; y < f.y + f.h; y += 6, k++) {
      R(f.x, y, f.w, 0.5, C.woodHi);
      R(f.x, y + 5.5, f.w, 0.5, C.woodLine);
      for (let x = f.x + (k % 2 ? 10 : 24); x < f.x + f.w; x += 28) { R(x, y, 0.5, 6, C.woodLine); R(x + 0.5, y, 0.5, 6, C.woodHi); }
      for (let x = f.x + 4 + (k * 7) % 13; x < f.x + f.w - 3; x += 17) R(x, y + 2.5, 3, 0.5, C.woodB);
    }
    R(f.x, f.y, f.w, 3, C.shadow); R(f.x, f.y + 3, f.w, 1, C.shadow2);

    // 문 안쪽 깔개
    const e = d.entry;
    if (d.side === 'S') rug(e.x - 11, e.y - 16, 22, 9, room.light, '#ffffff');
    else if (d.side === 'N') rug(e.x - 11, e.y + 4, 22, 9, room.light, '#ffffff');
    else if (d.side === 'E') rug(e.x - 18, e.y - 7, 10, 14, room.light, '#ffffff');
    else rug(e.x + 8, e.y - 7, 10, 14, room.light, '#ffffff');

    // 교탁: 꽃병·책·사과
    const tdx = Math.round(r.board.x + r.board.w / 2 - 11);
    r.tdesk = { x: tdx, y: f.y + 6, w: 22 };
    desk(tdx, f.y + 6, 22, 7, false);
    R(tdx + 2, f.y + 3, 3, 4, room.light); R(tdx + 2.5, f.y + 4, 2, 0.5, '#ffffff');
    R(tdx + 1.5, f.y + 1, 1.5, 1.5, '#ff8fa3'); R(tdx + 3.5, f.y + 0.5, 1.5, 1.5, '#ffd36b'); R(tdx + 2.5, f.y + 2, 1, 1.5, C.leaf);
    R(tdx + 8, f.y + 5, 6, 1, '#3f7dd8'); R(tdx + 8.5, f.y + 4, 5, 1, '#e0475a'); R(tdx + 9, f.y + 3, 4, 1, '#f2c14e');
    R(tdx + 17, f.y + 4, 2.5, 2.5, '#e0475a'); R(tdx + 18, f.y + 3.5, 0.5, 1, C.leaf); R(tdx + 17.5, f.y + 4.5, 0.5, 0.5, '#ffb3b3');

    // 학생 책상(3열)
    const cols = Math.max(2, Math.floor((f.w - 40) / 26)), rows = Math.max(1, Math.floor((f.h - 26) / 21));
    const gx = f.x + Math.round((f.w - cols * 26) / 2) + 6, gy = f.y + 22;
    r.seats = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = gx + i * 26, y = gy + j * 21;
      if (Math.abs(x + 7 - e.x) < 22 && Math.abs(y + 6 - e.y) < 24) continue;
      desk(x, y, 14, 6, true, r.i * 13 + j * 5 + i, room);
      r.seats.push({ x: x + 7, y: y + 18 });
    }
    // 구석 소품(문과 가까운 구석은 비운다)
    const corners = [
      { x: f.x + 2, y: f.y + 3 }, { x: f.x + f.w - 16, y: f.y + 3 },
      { x: f.x + 2, y: f.y + f.h - 21 }, { x: f.x + f.w - 16, y: f.y + f.h - 21 },
    ].filter((c) => Math.hypot(c.x + 7 - e.x, c.y + 10 - e.y) > 24);
    corners.sort((a, b) => Math.hypot(b.x - e.x, b.y - e.y) - Math.hypot(a.x - e.x, a.y - e.y));
    (PROPS[room.icon] || ['plant']).slice(0, corners.length).forEach((kind, i) => drawProp(kind, corners[i].x, corners[i].y, room));

    // 북쪽 벽(윗면 + 정면)
    R(r.x, r.y, r.w, 4, C.wallTop); R(r.x, r.y, r.w, 0.5, C.wallHi);
    R(r.x, r.y + 4, r.w, r.F - 4, C.face);
    for (let x = r.x + 2; x < r.x + r.w; x += 4) R(x, r.y + 4, 0.5, r.F - 12, C.faceSh);
    R(r.x, r.y + 4, r.w, 1, C.faceSh);
    R(r.x, r.y + r.F - 7, r.w, 7, C.wains); R(r.x, r.y + r.F - 8, r.w, 1, C.trim); R(r.x, r.y + r.F - 7, r.w, 0.5, C.wainsHi);
    R(r.x, r.y + r.F - 1, r.w, 1, C.wainsDk);
    for (let x = r.x + 1; x < r.x + r.w - 4; x += 8) { R(x + 1, r.y + r.F - 6, 5, 4, C.wainsDk); R(x + 1.5, r.y + r.F - 5.5, 4, 3, C.wains); R(x + 1.5, r.y + r.F - 5.5, 4, 0.5, C.wainsHi); }
    // 창문과 커튼
    if (r.window) {
      const w = r.window;
      R(w.x - 1, w.y - 1, w.w + 2, w.h + 2, '#ffffff'); R(w.x, w.y, w.w, w.h, C.sky);
      R(w.x, w.y + w.h - 4, w.w, 4, '#d6f0fa');
      R(w.x + 2, w.y + 2, 5, 1.5, '#ffffff'); R(w.x + 3, w.y + 1.5, 3, 0.5, '#ffffff');
      R(w.x + w.w - 6, w.y + 4, 4, 1, '#ffffff');
      R(w.x + w.w / 2 - 0.5, w.y, 1, w.h, '#ffffff'); R(w.x, w.y + w.h / 2 - 0.5, w.w, 1, '#ffffff');
      R(w.x - 2, w.y - 1.5, w.w + 4, 1, C.frame);
      R(w.x - 2.5, w.y - 1, 3.5, w.h + 2, room.light); R(w.x + w.w - 1, w.y - 1, 3.5, w.h + 2, room.light);
      R(w.x - 2.5, w.y - 1, 0.5, w.h + 2, room.color); R(w.x + w.w + 2, w.y - 1, 0.5, w.h + 2, room.color);
      R(w.x - 1.5, w.y + 6, 2, 1, room.color); R(w.x + w.w - 0.5, w.y + 6, 2, 1, room.color);
      R(w.x - 1, w.y + w.h + 1.5, w.w + 2, 1, C.frameHi);
    }
    // 칠판
    const b = r.board;
    R(b.x - 2, b.y - 2, b.w + 4, b.h + 4, C.frame); R(b.x - 2, b.y - 2, b.w + 4, 0.5, C.frameHi);
    R(b.x, b.y, b.w, b.h, C.board); R(b.x, b.y, b.w, 0.5, C.boardHi); R(b.x, b.y + b.h - 1.5, b.w, 1.5, C.boardDk);
    R(b.x + 2, b.y + 2, 6, 0.5, 'rgba(244,241,222,.25)'); R(b.x + b.w - 12, b.y + b.h - 3.5, 8, 0.5, 'rgba(244,241,222,.2)');
    R(b.x - 2, b.y + b.h + 2, b.w + 4, 1, C.trim);
    R(b.x + b.w - 9, b.y + b.h + 0.5, 3, 1, C.chalk); R(b.x + b.w - 5, b.y + b.h + 0.5, 2, 1, room.light); R(b.x + 3, b.y + b.h + 0.5, 4, 1, '#e8c4a0');
    // 가랜드
    const gx0 = r.x + r.Wt + 1, gx1 = r.x + r.w - r.Et - 1;
    const gcs = [room.color, C.gold, room.light, '#ffffff', '#ff8fa3'];
    R(gx0, r.y + 4.5, gx1 - gx0, 0.5, C.trim);
    for (let x = gx0 + 1, i = 0; x < gx1 - 3; x += 4.5, i++) {
      if (d.side === 'N' && x + 3 > d.gap.x - 2 && x < d.gap.x + d.gap.w + 2) continue;
      const c = gcs[i % gcs.length];
      R(x, r.y + 5, 3, 1, c); R(x + 0.5, r.y + 6, 2, 0.5, c); R(x + 1, r.y + 6.5, 1, 0.5, c);
    }
    // 벽 그림
    if (r.poster) {
      const p = r.poster;
      R(p.x - 1, p.y - 1, 12, 12, C.out); R(p.x, p.y, 10, 10, '#fffdf4');
      const pal = { A: room.color, a: room.light, k: C.out, w: '#ffffff' };
      ICONS[room.icon].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') R(p.x + 1 + x, p.y + 1 + y, 1, 1, pal[c]); }));
      R(p.x + 4.5, p.y - 1.5, 1, 1, '#e0475a');
    }
    // 시계
    if (r.clock) {
      const ck = r.clock;
      R(ck.x, ck.y + 1, 8, 6, C.out); R(ck.x + 1, ck.y, 6, 8, C.out); R(ck.x + 1, ck.y + 1, 6, 6, '#ffffff'); R(ck.x + 0.5, ck.y + 1.5, 7, 5, '#ffffff');
      R(ck.x + 3.5, ck.y + 1.5, 1, 2.5, C.out); R(ck.x + 4, ck.y + 3.5, 2, 1, room.color);
      R(ck.x + 1.5, ck.y + 3.5, 0.5, 0.5, C.out); R(ck.x + 6, ck.y + 3.5, 0.5, 0.5, C.out);
    }

    // 옆벽·남쪽 벽
    R(r.x, r.y, r.Wt, r.h, C.wallTop); R(r.x + r.Wt - 0.5, r.y + 4, 0.5, r.h - 4, C.wallHi);
    R(r.x + r.w - r.Et, r.y, r.Et, r.h, C.wallTop); R(r.x + r.w - r.Et, r.y + 4, 0.5, r.h - 4, C.wallHi);
    if (r.S === 12) {
      R(r.x, r.y + r.h - 12, r.w, 4, C.wallTop); R(r.x, r.y + r.h - 12, r.w, 0.5, C.wallHi);
      R(r.x, r.y + r.h - 8, r.w, 8, C.face); R(r.x, r.y + r.h - 6, r.w, 1, C.trim);
      R(r.x, r.y + r.h - 5, r.w, 5, C.wains); R(r.x, r.y + r.h - 5, r.w, 0.5, C.wainsHi); R(r.x, r.y + r.h - 1, r.w, 1, C.wainsDk);
      for (let x = r.x + 3; x < r.x + r.w; x += 6) R(x, r.y + r.h - 4, 0.5, 3, C.wainsDk);
      // 복도 쪽 게시판
      const nb = r.x + 14;
      R(nb - 0.5, r.y + r.h - 8.5, 22, 5.5, C.frame); R(nb, r.y + r.h - 8, 21, 4.5, '#d9a86b');
      [['#ffffff', 1], ['#ffd36b', 6], [room.light, 11], ['#a8dcef', 16]].forEach(([c, ox], i) => {
        R(nb + ox, r.y + r.h - 7.5 + (i % 2) * 0.5, 4, 3.5, c); R(nb + ox + 1.5, r.y + r.h - 7.8 + (i % 2) * 0.5, 1, 0.8, '#e0475a');
      });
    } else {
      R(r.x, r.y + r.h - r.S, r.w, r.S, C.wallTop); R(r.x, r.y + r.h - r.S, r.w, 0.5, C.wallHi);
    }

    // 문
    const gp = d.gap, col = room.color, dk = room.dark;
    if (d.side === 'S') {
      R(gp.x, gp.y, gp.w, gp.h, C.woodA); R(gp.x, gp.y, gp.w, 0.5, C.woodLine); R(gp.x, gp.y + 6, gp.w, 0.5, C.woodLine);
      R(gp.x - 2, gp.y, 2, gp.h, dk); R(gp.x + gp.w, gp.y, 2, gp.h, dk);
      R(gp.x - 18, gp.y + 3, 15, 9, col); R(gp.x - 18, gp.y + 3, 15, 0.5, room.light); R(gp.x - 4, gp.y + 3, 1, 9, dk);
      R(gp.x - 15, gp.y + 4.5, 5, 3.5, C.glass); R(gp.x - 15, gp.y + 4.5, 2, 1, C.glassHi);
      R(gp.x - 6, gp.y + 8, 1, 2, C.out);
      plate(gp.x + gp.w + 4, gp.y + 2, room);
    } else if (d.side === 'N') {
      R(gp.x, gp.y, gp.w, 4, C.hallB);
      R(gp.x, gp.y + 4, gp.w, gp.h - 4, '#d4bd92');
      R(gp.x, gp.y + 4, gp.w, 3, '#a89068'); R(gp.x, gp.y + 7, gp.w, 0.5, '#bba47a');
      R(gp.x - 2, gp.y + 4, 2, gp.h - 4, dk); R(gp.x + gp.w, gp.y + 4, 2, gp.h - 4, dk);
      R(gp.x - 2, gp.y + 4, gp.w + 4, 2, dk);
      R(gp.x + gp.w + 2, gp.y + 6, 13, 17, col); R(gp.x + gp.w + 2, gp.y + 6, 13, 0.5, room.light); R(gp.x + gp.w + 14, gp.y + 6, 1, 17, dk);
      R(gp.x + gp.w + 5, gp.y + 8, 7, 5, C.glass); R(gp.x + gp.w + 5, gp.y + 8, 3, 1, C.glassHi);
      R(gp.x + gp.w + 4, gp.y + 15, 1, 2, C.out);
      plate(gp.x - 11, gp.y + 8, room);
      R(gp.x, gp.y + gp.h, gp.w, 1, dk);
    } else {
      const east = d.side === 'E';
      R(gp.x, gp.y, gp.w, gp.h, C.woodA);
      R(gp.x, gp.y - 2, gp.w, 2, dk); R(gp.x, gp.y + gp.h, gp.w, 2, dk);
      R(gp.x + 1, gp.y - 16, 4, 14, col); R(gp.x + 1, gp.y - 16, 4, 0.5, room.light); R(gp.x + 2, gp.y - 13, 2, 5, C.glass);
      plate(east ? gp.x + gp.w + 2 : gp.x - 9, gp.y - 14, room);
    }
  }

  /* ───────── 효과음(Web Audio로 합성) ───────── */
  const SFX = (() => {
    let ac = null, master = null;
    let on = load('pixelSchoolSound', localStorage) !== false;
    function ctx() {
      if (!on) return null;
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.16; master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, t0, dur, type, vol, slide) {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + t0;
      const o = a.createOscillator(), gn = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.linearRampToValueAtTime(vol == null ? 0.5 : vol, t + 0.006);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn).connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
    let noiseBuf = null;
    function noise(t0, dur, vol, freq, q) {
      const a = ctx(); if (!a) return;
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = a.currentTime + t0;
      const s = a.createBufferSource(); s.buffer = noiseBuf;
      const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
      const gn = a.createGain();
      gn.gain.setValueAtTime(vol == null ? 0.5 : vol, t);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(gn).connect(master);
      s.start(t); s.stop(t + dur + 0.02);
    }
    const seq = (notes, step, dur, type, vol, start) => notes.forEach((f, i) => f && tone(f, (start || 0) + i * step, dur, type, vol));
    return {
      get on() { return on; },
      set(v) { on = v; save('pixelSchoolSound', v, localStorage); if (v) ctx(); },
      unlock: ctx,
      step(alt) { noise(0, 0.045, 0.28, alt ? 1400 : 1000, 2.5); tone(alt ? 150 : 130, 0, 0.035, 'triangle', 0.25); },
      bump() { tone(110, 0, 0.09, 'square', 0.25, 0.6); },
      move() { tone(988, 0, 0.045, 'square', 0.28); },
      select() { seq([523, 659, 784, 1047], 0.055, 0.09, 'square', 0.32); },
      chime() { tone(784, 0, 0.08, 'triangle', 0.5); tone(1175, 0.08, 0.16, 'triangle', 0.45); },
      type() { tone(1320 + Math.random() * 120, 0, 0.018, 'square', 0.08); },
      enter() { noise(0, 0.16, 0.35, 2200, 0.8); seq([392, 523, 659, 784, 1047], 0.06, 0.1, 'square', 0.32, 0.1); tone(1568, 0.42, 0.25, 'triangle', 0.3); },
      exit() { seq([784, 659, 523, 392], 0.065, 0.1, 'square', 0.28); noise(0.27, 0.14, 0.28, 1800, 0.8); },
      toggle() { tone(660, 0, 0.06, 'square', 0.3); tone(880, 0.06, 0.08, 'square', 0.3); },
    };
  })();

  /* ───────── 화면·상태 ───────── */
  const stage = $('#stage'), screen = $('#screen'), sctx = screen.getContext('2d');
  const buf = document.createElement('canvas'), g = buf.getContext('2d');
  const labels = $('#labels');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  let L = null, kid = null, mode = 'menu';
  const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, path: [], lastStep: -1 };
  const keys = new Set();
  const padDirs = new Set();
  let dlgRoom = null, armed = null, hoverRoom = null, scale = 2, k = 1, leaving = false, bumpAt = 0;

  function choosePortrait() { return innerWidth < 700 && innerHeight > innerWidth * 1.05; }

  function setLayout(portrait) {
    const prevRoom = L ? nearestDoorRoom() : null;
    L = buildLayout(portrait);
    buf.width = L.W * RES; buf.height = L.H * RES;
    labels.innerHTML = '';
    for (const r of L.rooms) {
      const el = document.createElement('div');
      el.className = 'chalk';
      el.textContent = r.room.short;
      Object.assign(el.style, {
        left: (r.board.x / L.W) * 100 + '%', top: (r.board.y / L.H) * 100 + '%',
        width: (r.board.w / L.W) * 100 + '%', height: ((r.board.h - 1.5) / L.H) * 100 + '%',
      });
      labels.appendChild(el);
    }
    if (prevRoom != null) placeAtDoor(prevRoom);
    else placeCenter();
  }
  function placeCenter() {
    const h = L.walkHall;
    P.x = Math.round(h.x + h.w / 2); P.y = Math.round(h.y + h.h / 2 + 4); P.dir = 'down'; P.path = [];
  }
  function placeAtDoor(i) {
    const d = L.rooms[i].door;
    P.x = d.front.x; P.y = d.front.y; P.path = [];
    P.dir = { S: 'down', N: 'up', E: 'right', W: 'left' }[d.side];
    armed = null;
  }
  function nearestDoorRoom() {
    let best = null, bd = 40;
    for (const r of L.rooms) {
      const dd = Math.hypot(P.x - r.door.front.x, P.y - r.door.front.y);
      if (dd < bd) { bd = dd; best = r.i; }
    }
    return best;
  }

  function fit() {
    const portrait = choosePortrait();
    if (!L || L.portrait !== portrait) setLayout(portrait);
    const overlayPad = isTouch && !portrait && innerHeight < 560;
    document.body.classList.toggle('overlay-pad', overlayPad);
    const availW = Math.min(document.documentElement.clientWidth - 32 - 16, 1200);
    const reserve = overlayPad ? 24 : isTouch ? 230 : 190;
    const byW = availW / L.W;
    const byH = (innerHeight - reserve) / L.H;
    scale = Math.max(0.6, Math.min(byW, Math.max(byH, portrait ? byW * 0.8 : 0.6), 4));
    const cssW = Math.floor(L.W * scale), cssH = Math.floor(L.H * scale);
    stage.style.width = cssW + 8 + 'px';
    stage.style.height = cssH + 8 + 'px';
    k = Math.max(1, Math.ceil((scale * (devicePixelRatio || 1)) / RES));
    screen.width = L.W * RES * k; screen.height = L.H * RES * k;
    stage.style.setProperty('--chalk', Math.max(9, Math.min(22, Math.round(scale * 5.4))) + 'px');
    render();
  }

  /* ───────── 이동 ───────── */
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  function free(x, y) {
    const pts = [[x - 4, y - 3], [x + 3, y - 3], [x - 4, y], [x + 3, y]];
    return pts.every(([a, b]) => L.walk.some((r) => inRect(a, b, r)));
  }
  function tryMove(dx, dy) {
    let moved = false;
    if (dx && free(P.x + dx, P.y)) { P.x += dx; moved = true; }
    if (dy && free(P.x, P.y + dy)) { P.y += dy; moved = true; }
    if (moved) return true;
    // 문 근처에서 살짝 비껴 서 있으면 문 가운데로 당겨 준다
    for (const r of L.rooms) {
      const d = r.door, step = Math.abs(dx || dy);
      if ((d.side === 'S' && dy < 0) || (d.side === 'N' && dy > 0)) {
        if (Math.abs(P.x - d.cx) < 12 && Math.abs(P.y - d.front.y) < 26) {
          const nx = P.x + Math.sign(d.cx - P.x) * Math.min(step, Math.abs(d.cx - P.x));
          if (free(nx, P.y)) { P.x = nx; return true; }
        }
      }
      if ((d.side === 'E' && dx < 0) || (d.side === 'W' && dx > 0)) {
        const cy = d.entry.y;
        if (Math.abs(P.y - cy) < 12 && Math.abs(P.x - d.front.x) < 26) {
          const ny = P.y + Math.sign(cy - P.y) * Math.min(step, Math.abs(cy - P.y));
          if (free(P.x, ny)) { P.y = ny; return true; }
        }
      }
    }
    return false;
  }
  function currentDoorRoom() {
    if ([[P.x - 4, P.y - 3], [P.x + 3, P.y]].every(([a, b]) => inRect(a, b, L.walkHall))) return null;
    return L.rooms.find((r) => inRect(P.x, P.y, r.door.walk)) || null;
  }
  function walkTo(points) { P.path = points.map((p) => ({ x: p.x, y: p.y })); }
  function goToRoom(r) {
    const pts = [];
    const cur = currentDoorRoom();
    if (cur && cur !== r) pts.push(cur.door.front);
    pts.push(r.door.front, r.door.entry);
    walkTo(pts);
  }
  function goToPoint(x, y) {
    const h = L.walkHall;
    const tx = Math.max(h.x + 5, Math.min(h.x + h.w - 4, x));
    const ty = Math.max(h.y + 4, Math.min(h.y + h.h - 1, y));
    const pts = [];
    const cur = currentDoorRoom();
    if (cur) pts.push(cur.door.front);
    pts.push({ x: tx, y: ty });
    walkTo(pts);
  }

  const SPEED = 66;
  function update(dt) {
    if (mode !== 'play' || leaving) { P.moving = false; return; }
    let dx = 0, dy = 0;
    const has = (n) => keys.has(n) || padDirs.has(n);
    if (!dlgRoom) {
      if (has('left')) dx -= 1;
      if (has('right')) dx += 1;
      if (has('up')) dy -= 1;
      if (has('down')) dy += 1;
    }
    P.moving = false;
    if (dx || dy) {
      P.path = [];
      const s = SPEED * dt / (dx && dy ? Math.SQRT2 : 1);
      if (tryMove(dx * s, dy * s)) P.moving = true;
      else if (clock - bumpAt > 0.4) { bumpAt = clock; SFX.bump(); }
      P.dir = dx && !dy ? (dx < 0 ? 'left' : 'right') : dy ? (dy < 0 ? 'up' : 'down') : P.dir;
    } else if (P.path.length && !dlgRoom) {
      const t = P.path[0];
      const vx = t.x - P.x, vy = t.y - P.y, dist = Math.hypot(vx, vy), s = SPEED * dt;
      if (dist <= s) { P.x = t.x; P.y = t.y; P.path.shift(); }
      else { P.x += (vx / dist) * s; P.y += (vy / dist) * s; }
      if (dist > 0.5) P.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      P.moving = true;
    }
    P.anim = P.moving ? P.anim + dt : 0;
    // 발걸음 소리: 발이 바닥에 닿는 순간마다
    const stepIdx = P.moving ? Math.floor(P.anim * 7 / 2) : -1;
    if (stepIdx !== P.lastStep && stepIdx >= 0) SFX.step(stepIdx % 2);
    P.lastStep = stepIdx;

    const r = L.rooms.find((rr) => inRect(P.x, P.y, rr.door.walk) && rr.door.inside(P.x, P.y));
    if (r && armed !== r.i && !dlgRoom) { armed = r.i; P.path = []; openDialog(r); }
    if (!r && armed != null && !dlgRoom) armed = null;
  }

  /* ───────── 그리기 ───────── */
  let clock = 0;
  const snap = (v) => Math.round(v * RES) / RES;
  function drawSprite(cv, x, y) { g.drawImage(cv, snap(x - SPR_W / RES / 2), snap(y - cv.foot / RES), cv.width / RES, cv.height / RES); }
  function shadowAt(x, y, w) { g.fillStyle = C.shadow; g.fillRect(snap(x - w / 2), snap(y - 1.5), w, 2.5); g.fillRect(snap(x - w / 2 + 1), snap(y - 2), w - 2, 0.5); }
  function blinking(seed) { return !reduceMotion && ((clock + seed * 1.7) % 4.2) < 0.14; }

  function render() {
    if (!L) return;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(L.bg, 0, 0, L.W, L.H);
    const others = KIDS.filter((x) => x !== kid);
    L.rooms.forEach((r, i) => {
      // 선생님: 교탁 옆에 서서 학생을 본다(문으로 들어오면 그쪽을 본다)
      const t = r.teacher, td = r.tdesk;
      const f = r.floor;
      const tx = td.x + td.w + 7 + 6 > f.x + f.w - 17 ? td.x - 7 : td.x + td.w + 7, ty = td.y + 12;
      let tdir = 'down';
      if (dlgRoom === r) tdir = Math.abs(r.door.entry.x - tx) > Math.abs(r.door.entry.y - ty) ? (r.door.entry.x < tx ? 'left' : 'right') : 'down';
      shadowAt(tx, ty, 10);
      const tb = !reduceMotion && Math.floor(clock * 1.2 + i) % 5 === 0 ? -0.5 : 0;
      drawSprite(personSprite(t, tdir, 'idle', blinking(i + 3)), tx, ty + tb);
      // 다른 학생: 자리에 앉아 칠판을 본다
      const o = others[i];
      if (o && r.seats.length) {
        const s = r.seats[(i * 2 + 1) % r.seats.length];
        const bob = !reduceMotion && Math.floor(clock * 1.5 + i) % 4 === 0 ? -0.5 : 0;
        shadowAt(s.x, s.y, 10);
        drawSprite(personSprite(o, 'up', 'idle', false), s.x, s.y + bob);
      }
    });
    const hi = hoverRoom != null ? L.rooms[hoverRoom] : dlgRoom;
    if (hi) {
      const f = hi.floor, on = reduceMotion || Math.floor(clock * 4) % 2 === 0;
      g.fillStyle = on ? hi.room.color : '#ffffff';
      for (let x = f.x; x < f.x + f.w; x += 4) { g.fillRect(x, f.y, 2, 1); g.fillRect(x + 2, f.y + f.h - 1, 2, 1); }
      for (let y = f.y; y < f.y + f.h; y += 4) { g.fillRect(f.x, y + 2, 1, 2); g.fillRect(f.x + f.w - 1, y, 1, 2); }
    }
    if (mode === 'play' && !dlgRoom) {
      for (const r of L.rooms) {
        const d = r.door;
        if (Math.hypot(P.x - d.front.x, P.y - d.front.y) < 30 || hoverRoom === r.i) arrow(d, r);
      }
    }
    if (kid && mode === 'play') {
      const frames = P.dir === 'left' || P.dir === 'right' ? ['a', 'idle'] : ['a', 'idle', 'b', 'idle'];
      const fr = P.moving ? frames[Math.floor(P.anim * 7) % frames.length] : 'idle';
      shadowAt(P.x, P.y, 11);
      drawSprite(personSprite(kid, P.dir, fr, !P.moving && blinking(0)), P.x, P.y - (P.moving && fr !== 'idle' ? 0.5 : 0));
    }
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(buf, 0, 0, screen.width, screen.height);
  }
  function arrow(d, r) {
    const up = Math.floor(clock * 3) % 2 && !reduceMotion ? 1 : 0;
    let x, y, dir;
    if (d.side === 'S') { x = d.cx; y = d.gap.y - 9 + up; dir = 'up'; }
    else if (d.side === 'N') { x = d.cx; y = d.gap.y + d.gap.h + 4 - up; dir = 'down'; }
    else if (d.side === 'E') { x = d.gap.x - 8 + up; y = d.entry.y - 2; dir = 'left'; }
    else { x = d.gap.x + d.gap.w + 8 - up; y = d.entry.y - 2; dir = 'right'; }
    const tri = (c, o) => {
      g.fillStyle = c;
      for (let i = 0; i < 4; i++) {
        const w = i * 2 + 1 + o * 2;
        if (dir === 'up' || dir === 'down') g.fillRect(x - Math.floor(w / 2), dir === 'up' ? y - 3 + i : y + 3 - i, w, 1);
        else g.fillRect(dir === 'left' ? x - 3 + i : x + 3 - i, y - Math.floor(w / 2), 1, w);
      }
    };
    tri(C.out, 1); tri(r.room.color, 0);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; clock += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ───────── 대화창 ───────── */
  const dlg = $('#dialog');
  let typer = 0;
  function openDialog(r) {
    dlgRoom = r;
    const room = r.room, t = r.teacher;
    SFX.chime();
    dlg.style.setProperty('--room', room.color);
    $('#dlg-num').textContent = room.n + '반';
    $('#dlg-title').textContent = room.title;
    $('#dlg-desc').textContent = room.desc;
    $('#dlg-upd').textContent = room.el.dataset.upd ? '· ' + room.el.dataset.upd : '';
    $('#dlg-face').replaceChildren(faceCanvas(t));
    const say = `${t.name}: 어서 와요, ${kid ? kid.name : '친구'}! ${t.say}`;
    const el = $('#dlg-say');
    clearInterval(typer);
    if (reduceMotion) el.textContent = say;
    else {
      let n = 0; el.textContent = '';
      typer = setInterval(() => {
        n++; el.textContent = say.slice(0, n);
        if (n % 2 === 0 && say[n - 1] !== ' ') SFX.type();
        if (n >= say.length) clearInterval(typer);
      }, 30);
    }
    dlg.hidden = false;
  }
  function faceCanvas(sp) {
    const src = personSprite(sp, 'down', 'idle', false);
    const c = document.createElement('canvas');
    c.width = 24; c.height = 22;
    c.getContext('2d').drawImage(src, 0, 0, 24, 22, 0, 0, 24, 22);
    return c;
  }
  function closeDialog(stepBack) {
    if (!dlgRoom) return;
    const r = dlgRoom;
    dlgRoom = null; dlg.hidden = true; clearInterval(typer);
    if (stepBack) { walkTo([r.door.front]); SFX.exit(); }
    stage.focus({ preventScroll: true });
  }
  function enter(r) {
    if (leaving) return;
    leaving = true;
    SFX.enter();
    save('pixelSchool', { kid: kid ? kid.id : null, room: r.i }, sessionStorage);
    $('#fade-text').textContent = `${r.room.n}반 ${r.room.short} 교실로 가는 중…`;
    $('#fade').hidden = false;
    setTimeout(() => { location.href = r.room.url; }, reduceMotion ? 120 : 560);
  }
  $('#dlg-go').addEventListener('click', () => dlgRoom && enter(dlgRoom));
  $('#dlg-no').addEventListener('click', () => closeDialog(true));

  /* ───────── 학생 고르기 ───────── */
  const menu = $('#menu'), kidsEl = $('#kids');
  KIDS.forEach((kd) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'kid'; b.dataset.id = kd.id;
    const src = personSprite(kd, 'down', 'idle', false);
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    const nm = document.createElement('b'); nm.textContent = kd.name;
    const ln = document.createElement('small'); ln.textContent = kd.line;
    b.append(c, nm, ln);
    b.setAttribute('aria-label', `${kd.name}: ${kd.line}`);
    b.addEventListener('click', () => start(kd));
    b.addEventListener('focus', () => { if (menu.dataset.ready) SFX.move(); });
    kidsEl.appendChild(b);
  });
  function openMenu() {
    mode = 'menu';
    closeDialog(false);
    menu.hidden = false;
    $('#change').hidden = true;
    const saved = load('pixelSchoolKid', localStorage);
    const btn = kidsEl.querySelector(`[data-id="${saved}"]`) || kidsEl.firstElementChild;
    delete menu.dataset.ready;
    btn.focus({ preventScroll: true });
    menu.dataset.ready = '1';
  }
  function start(kd, roomIndex, quiet) {
    kid = kd;
    save('pixelSchoolKid', kd.id, localStorage);
    menu.hidden = true;
    $('#change').hidden = false;
    mode = 'play';
    if (!quiet) SFX.select();
    if (roomIndex != null && L.rooms[roomIndex]) placeAtDoor(roomIndex);
    stage.focus({ preventScroll: true });
  }
  $('#change').addEventListener('click', (e) => { e.stopPropagation(); SFX.move(); openMenu(); });
  menu.addEventListener('keydown', (e) => {
    const btns = [...kidsEl.children];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = getComputedStyle(kidsEl).gridTemplateColumns.split(' ').length;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
    if (step) {
      e.preventDefault();
      btns[(i + step + btns.length) % btns.length].focus();
    }
  });

  /* ───────── 소리 단추 ───────── */
  const soundBtn = $('#sound');
  function paintSound() {
    soundBtn.textContent = SFX.on ? '♪ 소리 켬' : '♪ 소리 끔';
    soundBtn.setAttribute('aria-pressed', SFX.on ? 'true' : 'false');
    soundBtn.classList.toggle('off', !SFX.on);
  }
  soundBtn.addEventListener('click', (e) => { e.stopPropagation(); SFX.set(!SFX.on); paintSound(); SFX.toggle(); });
  paintSound();
  // 브라우저는 사람이 한 번 누른 뒤에야 소리를 낸다
  ['pointerdown', 'keydown'].forEach((t) => addEventListener(t, () => SFX.unlock(), { once: true, capture: true }));

  /* ───────── 키보드 ───────── */
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function gameHasFocus() {
    const a = document.activeElement;
    return a === document.body || a === stage || (stage.contains(a) && !menu.contains(a));
  }
  function openByNumber(n) {
    const r = L.rooms[n - 1];
    if (!r) return;
    closeDialog(false);
    if (mode === 'play') { P.path = []; P.x = r.door.entry.x; P.y = r.door.entry.y; armed = r.i; }
    enter(r);
  }
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // 숫자키 1~6: 어디서든 그 교실 사이트를 바로 연다
    if (/^[1-6]$/.test(e.key) && !leaving) { e.preventDefault(); openByNumber(+e.key); return; }
    if ((e.key === 'm' || e.key === 'M') && (gameHasFocus() || menu.contains(document.activeElement))) { SFX.set(!SFX.on); paintSound(); SFX.toggle(); return; }
    if (mode !== 'play' || !gameHasFocus()) return;
    const dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      if (dlgRoom) closeDialog(true);
      keys.add(dir);
      return;
    }
    const onButton = tag === 'BUTTON';
    if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
      e.preventDefault();
      interact();
    } else if (e.key === 'Escape' && dlgRoom) {
      e.preventDefault();
      closeDialog(true);
    }
  });
  addEventListener('keyup', (e) => { const dir = KEYMAP[e.key]; if (dir) keys.delete(dir); });
  addEventListener('blur', () => { keys.clear(); padDirs.clear(); });
  document.addEventListener('visibilitychange', () => { keys.clear(); padDirs.clear(); });

  function interact() {
    if (dlgRoom) { enter(dlgRoom); return; }
    let best = null, bd = 34;
    for (const r of L.rooms) {
      const dd = Math.hypot(P.x - r.door.front.x, P.y - r.door.front.y);
      if (dd < bd) { bd = dd; best = r; }
    }
    if (best) { armed = null; goToRoom(best); }
  }

  /* ───────── 마우스·터치 ───────── */
  function toMap(e) {
    const rc = screen.getBoundingClientRect();
    return { x: ((e.clientX - rc.left) / rc.width) * L.W, y: ((e.clientY - rc.top) / rc.height) * L.H };
  }
  function roomAt(x, y) { return L.rooms.find((r) => inRect(x, y, r)) || null; }
  screen.addEventListener('pointerdown', (e) => {
    if (mode !== 'play' || leaving) return;
    e.preventDefault();
    stage.focus({ preventScroll: true });
    const { x, y } = toMap(e);
    const r = roomAt(x, y);
    if (dlgRoom) {
      if (r && r === dlgRoom) { enter(r); return; }
      closeDialog(true);
    }
    if (r) {
      if (inRect(P.x, P.y, r.door.walk) && r.door.inside(P.x, P.y)) { openDialog(r); return; }
      armed = null;
      goToRoom(r);
    } else {
      goToPoint(x, y);
    }
  });
  screen.addEventListener('pointermove', (e) => {
    if (mode !== 'play' || e.pointerType === 'touch') return;
    const { x, y } = toMap(e);
    const r = roomAt(x, y);
    hoverRoom = r ? r.i : null;
    stage.classList.toggle('pointing', !!r);
  });
  screen.addEventListener('pointerleave', () => { hoverRoom = null; stage.classList.remove('pointing'); });

  document.querySelectorAll('.dpad button').forEach((b) => {
    const dir = b.dataset.dir;
    const on = (e) => {
      e.preventDefault();
      try { b.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ }
      if (dlgRoom) closeDialog(true);
      padDirs.add(dir); b.classList.add('on');
    };
    const off = () => { padDirs.delete(dir); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  const abtn = $('#abtn');
  abtn.addEventListener('pointerdown', (e) => { e.preventDefault(); abtn.classList.add('on'); if (mode === 'play') interact(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => abtn.addEventListener(t, () => abtn.classList.remove('on')));

  // 교실 바로가기 목록을 눌러 나갈 때도 문 여는 소리와 함께
  ROOMS.forEach((room, i) => room.el.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || leaving) return;
    e.preventDefault();
    enter(L.rooms[i]);
  }));

  addEventListener('resize', fit);
  // 뒤로 가기로 돌아왔을 때(bfcache): 검은 화면을 걷고 교실 문 앞에 다시 세운 뒤 퇴실 소리
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    $('#fade').hidden = true;
    closeDialog(false);
    const st = load('pixelSchool', sessionStorage);
    if (st && L.rooms[st.room]) { placeAtDoor(st.room); SFX.exit(); }
  });

  /* ───────── 시작 ───────── */
  fit();
  const st = load('pixelSchool', sessionStorage);
  const back = st && KIDS.find((x) => x.id === st.kid);
  if (back) start(back, st.room, true);
  else openMenu();
  requestAnimationFrame((t) => { last = t; loop(t); });

  // 화면 확인용(개발자 도구): pixelSchool.go(1) 은 1반 문으로 걸어간다
  window.pixelSchool = { go: (n) => L.rooms[n - 1] && goToRoom(L.rooms[n - 1]), state: () => ({ mode, x: P.x, y: P.y, dir: P.dir, dialog: dlgRoom && dlgRoom.room.n, portrait: L.portrait, sound: SFX.on }) };
})();
