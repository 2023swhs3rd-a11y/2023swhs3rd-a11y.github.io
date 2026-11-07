/*
  픽셀 학교 (/school/)
  - 교실 여섯 칸은 index.html의 "교실 바로가기" 목록(#rooms a)에서 읽는다. 주소·이름·색·벽 그림을 바꾸려면 그 목록만 고친다.
  - 그림은 모두 이 파일에서 캔버스에 직접 찍는다(외부 그림 파일 없음). 화면 크기는 가로형 384×256, 세로형(휴대폰) 240×336 픽셀이다.
  - 걷기: 방향키·WASD, 터치 방향 패드, 화면 클릭·터치(그 자리까지 걸어감). 교실 문으로 들어가면 대화창이 뜨고 Enter·A·클릭으로 연다.
  - 고른 학생은 localStorage, 마지막에 들어간 교실은 sessionStorage에 두어 뒤로 오면 그 교실 문 앞에서 다시 시작한다.
*/
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── 교실 ───────── */
  const ROOMS = [...document.querySelectorAll('#rooms a')].map((a, i) => ({
    n: i + 1,
    url: a.getAttribute('href'),
    title: a.querySelector('b').textContent.trim(),
    desc: a.querySelector('span').textContent.trim(),
    short: a.dataset.short,
    color: a.dataset.color,
    light: mix(a.dataset.color, '#ffffff', 0.55),
    dark: mix(a.dataset.color, '#000000', 0.3),
    icon: a.dataset.icon,
  }));
  document.querySelectorAll('#rooms a').forEach((a) => a.style.setProperty('--c', a.dataset.color));

  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const x = p(a), y = p(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* ───────── 색 ───────── */
  const C = {
    out: '#2b1d2e',
    hallA: '#efe0b9', hallB: '#e4d1a2', hallLine: '#d2bb87',
    woodA: '#d49c62', woodB: '#c88f56', woodLine: '#ad7443',
    wallTop: '#7b5642', wallHi: '#9a6e52', face: '#f6ead0', faceSh: '#e6d4b0',
    wains: '#88b27b', wainsDk: '#62905a', trim: '#5b3d2e',
    board: '#2f6a4f', boardDk: '#245641', frame: '#8d5a33', chalk: '#f4f1de',
    desk: '#e6ad6c', deskDk: '#b47644', leg: '#7a4a2a',
    chair: '#6f8fb3', chairDk: '#4c6b8f',
    glass: '#a8dcef', glassHi: '#e6f7fc',
    leaf: '#4f9a4a', leafDk: '#357a3a', pot: '#c8643c',
    shadow: 'rgba(43,29,46,0.22)',
  };

  /* ───────── 학생 캐릭터 (모두 새로 그린 픽셀) ─────────
     글자 하나가 픽셀 하나: h 머리 H 머리그늘 s 피부 S 피부그늘 e 눈 b 볼 m 입 c 겉옷 C 겉옷그늘 w 셔츠 t 넥타이·지퍼
     p 바지·치마 k 신발 g 안경테 G 안경알 r 머리끈. 바깥 테두리는 자동으로 두른다. */
  const T = {
    down: {
      head: [
        '...hhhhhh...',
        '..hhhhhhhh..',
        '.hhhhhhhhhh.',
        '.hhhhhhhhhH.',
        '.hhhshhshhH.',
        '.hssssssssH.',
        '.ssessssess.',
        '.ssessssess.',
        '.sbssmmssbs.',
        '..ssssssss..',
      ],
      body: [
        '...cwttwc...',
        '..ccwttwcc..',
        '.ccccttcccc.',
        '.scccttcccs.',
        '..CCCCCCCC..',
      ],
      legs: {
        idle: ['..pppppppp..', '..ppp..ppp..', '..kkk..kkk..'],
        a: ['..pppppppp..', '..ppp..kkk..', '..kkk.......'],
        b: ['..pppppppp..', '..kkk..ppp..', '.......kkk..'],
      },
    },
    up: {
      head: [
        '...hhhhhh...',
        '..hhhhhhhh..',
        '.hhhhhhhhhh.',
        '.hhhhhhhhhH.',
        '.hhhhhhhhhH.',
        '.hhhhhhhhhH.',
        '.HhhhhhhhhH.',
        '.sHhhhhhhHs.',
        '..HHHHHHHH..',
        '...SSSSSS...',
      ],
      body: [
        '...cccccc...',
        '..cccccccc..',
        '.cccccccccc.',
        '.sccccccccs.',
        '..CCCCCCCC..',
      ],
      legs: {
        idle: ['..pppppppp..', '..ppp..ppp..', '..kkk..kkk..'],
        a: ['..pppppppp..', '..ppp..kkk..', '..kkk.......'],
        b: ['..pppppppp..', '..kkk..ppp..', '.......kkk..'],
      },
    },
    side: {
      head: [
        '....hhhhh...',
        '..hhhhhhhh..',
        '.hhhhhhhhhh.',
        '.hhhhhhhhhH.',
        '.hhhhhhhhhH.',
        '.hsshhhhhhH.',
        '.sesssShhhH.',
        '.sesssShhhH.',
        '.sbssssHhH..',
        '..sssss.....',
      ],
      body: [
        '...wcccc....',
        '...cccccc...',
        '...ccccCc...',
        '...cscccc...',
        '...CCCCCC...',
      ],
      legs: {
        idle: ['...pppppp...', '....pppp....', '...kkkkk....'],
        a: ['...pppppp...', '..pp...pp...', '.kkk...kkk..'],
        b: ['...pppppp...', '....pppp....', '...kkkkk....'],
      },
    },
  };
  // 머리 모양: [모드, 색, x, y, w, h] — under는 빈 칸에만, over는 위에 덮어 칠한다(템플릿 좌표)
  const HAIR = {
    short: {},
    long: {
      down: [['u', 'h', 0, 3, 2, 9], ['u', 'h', 10, 3, 2, 9]],
      up: [['o', 'h', 1, 7, 10, 6], ['o', 'H', 1, 7, 1, 6], ['o', 'H', 10, 7, 1, 6]],
      side: [['u', 'h', 7, 3, 5, 9]],
    },
    pony: {
      down: [['u', 'h', 10, 1, 2, 4]],
      up: [['o', 'r', 5, 6, 2, 1], ['o', 'h', 5, 7, 2, 5], ['o', 'H', 6, 8, 1, 4]],
      side: [['u', 'h', 10, 3, 2, 6], ['o', 'r', 10, 3, 1, 1]],
    },
    bob: {
      down: [['u', 'h', 0, 3, 2, 6], ['u', 'h', 10, 3, 2, 6]],
      up: [['o', 'h', 1, 7, 10, 2]],
      side: [['u', 'h', 7, 3, 5, 6]],
    },
    spiky: {
      down: [['u', 'h', 2, 0, 1, 1], ['u', 'h', 3, -1, 1, 1], ['u', 'h', 5, -1, 2, 1], ['u', 'h', 8, -1, 1, 1], ['u', 'h', 9, 0, 1, 1]],
      up: [['u', 'h', 2, 0, 1, 1], ['u', 'h', 3, -1, 1, 1], ['u', 'h', 5, -1, 2, 1], ['u', 'h', 8, -1, 1, 1], ['u', 'h', 9, 0, 1, 1]],
      side: [['u', 'h', 3, 0, 1, 1], ['u', 'h', 4, -1, 1, 1], ['u', 'h', 6, -1, 2, 1], ['u', 'h', 9, -1, 1, 1], ['u', 'h', 10, 0, 1, 1]],
    },
  };
  const GLASSES = {
    down: [['o', 'G', 2, 6, 1, 2], ['o', 'G', 4, 6, 1, 2], ['o', 'G', 7, 6, 1, 2], ['o', 'G', 9, 6, 1, 2], ['o', 'g', 5, 6, 2, 1]],
    side: [['o', 'G', 1, 6, 1, 2], ['o', 'G', 3, 6, 1, 2], ['o', 'g', 4, 6, 3, 1]],
  };
  const base = { e: '#2b1d2e', b: '#f59b9b', m: '#c0504d', w: '#ffffff', k: '#3b2a24', g: '#2b1d2e', G: '#d5f1fb', r: '#e0475a' };
  const KIDS = [
    { id: 'haneul', name: '하늘', line: '아침마다 1등으로 등교해요', style: 'short',
      pal: { h: '#2a2440', H: '#17132a', s: '#f7cba4', S: '#e0a57f', c: '#2f3f73', C: '#1f2b52', t: '#d8394a', p: '#6b7280' } },
    { id: 'bora', name: '보라', line: '도서관 창가 자리가 제 자리예요', style: 'long', skirt: true,
      pal: { h: '#7a4a2e', H: '#59331e', s: '#f8d2b0', S: '#e3ad88', c: '#2f3f73', C: '#1f2b52', t: '#e0475a', p: '#a33a4a' } },
    { id: 'doyun', name: '도윤', line: '궁금한 건 바로 찾아봐야 해요', style: 'spiky', glasses: true,
      pal: { h: '#3a2e2a', H: '#241b18', s: '#efbe94', S: '#d39c72', c: '#3f7d4e', C: '#2b5e38', t: '#2f3f73', p: '#3b4252' } },
    { id: 'seoa', name: '서아', line: '체육대회 계주 마지막 주자!', style: 'pony',
      pal: { h: '#5b3524', H: '#3e2216', s: '#f3c49c', S: '#d9a07a', c: '#ee7a3c', C: '#c45a26', t: '#ffffff', w: '#ffffff', p: '#2f3f73', r: '#ffd36b' } },
    { id: 'jimin', name: '지민', line: '오늘의 뉴스는 제가 스크랩해요', style: 'bob', skirt: true,
      pal: { h: '#1f1b2e', H: '#110e1c', s: '#f8d2b0', S: '#e3ad88', c: '#f2c14e', C: '#d39e2a', t: '#2f3f73', p: '#3b4a7a' } },
    { id: 'yuchan', name: '유찬', line: '그래프 그리는 게 제일 재밌어요', style: 'short',
      pal: { h: '#8a3b22', H: '#652914', s: '#e9b386', S: '#cc946a', c: '#7c5cc4', C: '#5e43a0', t: '#ffffff', p: '#4b5563' } },
  ];
  KIDS.forEach((k) => { k.pal = { ...base, ...k.pal, o: C.out }; });

  const SW = 16, SH = 22; // 스프라이트 칸
  const spriteCache = new Map();
  function spriteGrid(kid, dir, frame) {
    const d = dir === 'left' || dir === 'right' ? 'side' : dir;
    const t = T[d];
    const legs = (t.legs[frame] || t.legs.idle).slice();
    const rows = [...t.head, ...t.body, ...legs].map((r) => r.split(''));
    if (kid.skirt) {
      rows[15] = (d === 'side' ? '..ppppppp...' : '.pppppppppp.').split('');
      for (let y = 16; y < 18; y++) rows[y] = rows[y].map((c) => (c === 'p' ? 's' : c));
    }
    const G = Array.from({ length: SH }, () => Array(SW).fill('.'));
    rows.forEach((r, y) => r.forEach((c, x) => { G[y + 2][x + 2] = c; }));
    const ovs = [...((HAIR[kid.style] || {})[d] || []), ...(kid.glasses ? GLASSES[d] || [] : [])];
    for (const [mode, c, x0, y0, w, h] of ovs) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const gx = x + 2, gy = y + 2;
        if (gy < 0 || gy >= SH || gx < 0 || gx >= SW) continue;
        if (mode === 'o' || G[gy][gx] === '.') G[gy][gx] = c;
      }
    }
    if (dir === 'right') G.forEach((r) => r.reverse());
    const O = G.map((r) => r.slice());
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
      if (G[y][x] !== '.') continue;
      const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => {
        const v = (G[y + dy] || [])[x + dx];
        return v && v !== '.' && v !== 'o';
      });
      if (n) O[y][x] = 'o';
    }
    return O;
  }
  function sprite(kid, dir, frame) {
    const key = kid.id + dir + frame;
    let c = spriteCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    const g = c.getContext('2d');
    spriteGrid(kid, dir, frame).forEach((r, y) => r.forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = kid.pal[ch] || '#ff00ff';
      g.fillRect(x, y, 1, 1);
    }));
    spriteCache.set(key, c);
    return c;
  }

  /* ───────── 벽 그림(교실마다 하나) 8×8, A 교실색 a 연한 교실색 k 진한색 w 흰색 ───────── */
  const ICONS = {
    pennant: ['k.......', 'kAAA....', 'kAwAAA..', 'kAAAAAAA', 'kAAAA...', 'kAA.....', 'k.......', 'k.......'],
    star: ['...AA...', '...AA...', 'AAAwwAAA', '.AAwwAA.', '..AAAA..', '.AAAAAA.', '.AA..AA.', 'A......A'],
    chart: ['.....A..', '.....A..', '..A..A..', '..A..AA.', 'A.A..AA.', 'A.AA.AA.', 'AaAAaAAa', 'kkkkkkkk'],
    book: ['........', '.AA..AA.', 'AwwAAwwA', 'AwkAAkwA', 'AwwAAwwA', 'AwkAAkwA', '.AAAAAA.', '...AA...'],
    news: ['AAAAAAAA', '........', 'kkk.kkkk', 'kkk.....', 'kkk.kkkk', '....kkkk', 'kkk.kkkk', 'kkk.....'],
    pyramid: ['...AA...', '...AA...', '..aaaa..', '..aaaa..', '.AAAAAA.', '.AAAAAA.', 'aaaaaaaa', 'aaaaaaaa'],
  };
  const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'] };

  /* ───────── 지도 ───────── */
  function buildLayout(portrait) {
    const L = { portrait, rooms: [] };
    if (!portrait) {
      L.W = 384; L.H = 256;
      L.hall = { x: 0, y: 104, w: 384, h: 46 };
      L.walkHall = { x: 28, y: 107, w: 384 - 28 - 24, h: 42 };
      for (let i = 0; i < 6; i++) {
        const top = i < 3, col = i % 3;
        const r = { i, room: ROOMS[i], x: col * 128, y: top ? 0 : 150, w: 128, h: top ? 104 : 106,
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
        const r = { i, room: ROOMS[i], x: left ? 0 : 144, y: row * 112, w: 96, h: 112,
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
      // 칠판: 북쪽 벽 가운데(문이 북쪽 벽에 있으면 문 옆으로)
      const fx0 = r.x + r.Wt, fx1 = r.x + r.w - r.Et;
      const bw = Math.min(62, Math.floor((fx1 - fx0) * 0.56));
      let bx = Math.round((fx0 + fx1) / 2 - bw / 2);
      if (r.door.side === 'N') bx = Math.max(bx, r.door.gap.x + r.door.gap.w + 20);
      r.board = { x: bx, y: r.y + 7, w: bw, h: 13 };
      r.poster = { x: r.board.x + r.board.w + 7, y: r.y + 8 };
      if (r.poster.x + 10 > fx1 - 2) r.poster.x = r.board.x - 17;
      if (r.door.side === 'N' && r.poster.x < r.door.gap.x + r.door.gap.w + 2) r.poster = null;
    }
    L.walk = [L.walkHall, ...L.rooms.map((r) => r.door.walk)];
    L.bg = drawBackground(L);
    return L;
  }

  /* ───────── 배경 그리기(교실·복도는 한 번만 그려 둔다) ───────── */
  function drawBackground(L) {
    const cv = document.createElement('canvas');
    cv.width = L.W; cv.height = L.H;
    const g = cv.getContext('2d');
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

    // 복도 바닥(체크 타일)
    const h = L.hall;
    for (let y = h.y; y < h.y + h.h; y += 8) for (let x = h.x; x < h.x + h.w; x += 8) {
      const odd = ((x - h.x) / 8 + (y - h.y) / 8) % 2;
      R(x, y, 8, 8, odd ? C.hallB : C.hallA);
    }
    if (!L.portrait) {
      // 왼쪽 끝 계단, 오른쪽 끝 화분과 창문
      for (let i = 0; i < 6; i++) { R(0, h.y + i * 8, 24 - i * 2, 8, i % 2 ? '#b9a27a' : '#cdb68b'); R(0, h.y + i * 8 + 7, 24 - i * 2, 1, '#8f7a58'); }
      R(24, h.y, 2, h.h, '#8f7a58');
      plant(g, 364, h.y + 4);
      plant(g, 364, h.y + h.h - 18);
    } else {
      for (let i = 0; i < 6; i++) { R(h.x, i * 4, h.w, 4, i % 2 ? '#b9a27a' : '#cdb68b'); R(h.x, i * 4 + 3, h.w, 1, '#8f7a58'); }
      R(h.x, 24, h.w, 2, '#8f7a58');
      R(h.x + 8, L.H - 8, h.w - 16, 8, '#7c9a6a');
      R(h.x + 10, L.H - 6, h.w - 20, 1, '#5e7c50');
    }

    for (const r of L.rooms) drawRoom(g, R, r, L);

    // 바닥 그림자(벽 아래)
    if (!L.portrait) R(0, h.y, 384, 2, C.shadow);
    return cv;
  }

  function plant(g, x, y) {
    const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
    R(x + 2, y + 9, 10, 7, C.pot); R(x + 2, y + 9, 10, 1, '#e08a5c'); R(x + 3, y + 15, 8, 1, '#9c4a2a');
    R(x + 3, y + 2, 8, 7, C.leaf); R(x + 1, y + 4, 12, 4, C.leaf); R(x + 5, y, 4, 3, C.leaf);
    R(x + 4, y + 5, 2, 2, C.leafDk); R(x + 8, y + 3, 2, 2, C.leafDk); R(x + 2, y + 6, 2, 1, C.leafDk);
  }

  function drawRoom(g, R, r, L) {
    const room = r.room, f = r.floor, d = r.door;
    // 나무 바닥
    R(r.x, r.y, r.w, r.h, C.woodA);
    for (let y = f.y, k = 0; y < f.y + f.h; y += 6, k++) {
      R(f.x, y + 5, f.w, 1, C.woodLine);
      for (let x = f.x + (k % 2 ? 10 : 22); x < f.x + f.w; x += 28) R(x, y, 1, 5, C.woodLine);
      if (k % 3 === 1) R(f.x, y, f.w, 1, C.woodB);
    }
    // 앞쪽 바닥 그림자
    R(f.x, f.y, f.w, 3, C.shadow);

    // 교탁과 책상
    const tx = r.board.x + r.board.w / 2 - 11;
    desk(R, Math.round(tx), f.y + 6, 22, 7, false);
    const cols = Math.max(2, Math.floor((f.w - 8) / 26)), rows = Math.max(1, Math.floor((f.h - 26) / 21));
    const gx = f.x + Math.round((f.w - cols * 26) / 2) + 6, gy = f.y + 22;
    r.seats = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = gx + i * 26, y = gy + j * 21;
      // 문으로 들어오는 자리는 비워 둔다
      if (Math.abs(x + 7 - d.entry.x) < 18 && Math.abs(y + 6 - d.entry.y) < 18) continue;
      desk(R, x, y, 14, 6, true);
      r.seats.push({ x: x + 7, y: y + 18 });
    }
    // 교실마다 다른 소품
    if (room.icon === 'book') shelf(R, f.x + f.w - 14, f.y + f.h - 22);
    else plant(g, d.side === 'W' || (d.side === 'S' && d.cx > r.x + r.w / 2) ? f.x + 1 : f.x + f.w - 15, f.y + f.h - 17);

    // 북쪽 벽(윗면 + 정면)
    R(r.x, r.y, r.w, 4, C.wallTop); R(r.x, r.y, r.w, 1, C.wallHi);
    R(r.x, r.y + 4, r.w, r.F - 4, C.face);
    R(r.x, r.y + 4, r.w, 1, C.faceSh);
    R(r.x, r.y + r.F - 7, r.w, 7, C.wains); R(r.x, r.y + r.F - 8, r.w, 1, C.trim); R(r.x, r.y + r.F - 1, r.w, 1, C.wainsDk);
    for (let x = r.x + 3; x < r.x + r.w; x += 6) R(x, r.y + r.F - 6, 1, 5, C.wainsDk);
    // 칠판
    const b = r.board;
    R(b.x - 2, b.y - 2, b.w + 4, b.h + 4, C.frame);
    R(b.x, b.y, b.w, b.h, C.board); R(b.x, b.y + b.h - 2, b.w, 2, C.boardDk);
    R(b.x - 2, b.y + b.h + 2, b.w + 4, 1, C.trim);
    R(b.x + b.w - 8, b.y + b.h, 3, 1, C.chalk); R(b.x + b.w - 4, b.y + b.h, 2, 1, room.light);
    // 벽 그림
    if (r.poster) {
      const p = r.poster;
      R(p.x - 1, p.y - 1, 12, 12, C.out); R(p.x, p.y, 10, 10, '#fffdf4');
      const pal = { A: room.color, a: room.light, k: C.out, w: '#ffffff' };
      ICONS[room.icon].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') R(p.x + 1 + x, p.y + 1 + y, 1, 1, pal[c]); }));
    }
    // 시계
    const ck = { x: r.x + r.Wt + 6, y: r.y + 7 };
    if (d.side !== 'N') {
      R(ck.x, ck.y + 1, 8, 6, C.out); R(ck.x + 1, ck.y, 6, 8, C.out); R(ck.x + 1, ck.y + 1, 6, 6, '#ffffff');
      R(ck.x + 4, ck.y + 2, 1, 2, C.out); R(ck.x + 4, ck.y + 4, 2, 1, room.color);
    }

    // 옆벽·남쪽 벽
    R(r.x, r.y, r.Wt, r.h, C.wallTop);
    R(r.x + r.w - r.Et, r.y, r.Et, r.h, C.wallTop);
    if (r.S === 12) {
      R(r.x, r.y + r.h - 12, r.w, 4, C.wallTop); R(r.x, r.y + r.h - 12, r.w, 1, C.wallHi);
      R(r.x, r.y + r.h - 8, r.w, 8, C.face); R(r.x, r.y + r.h - 6, r.w, 1, C.trim);
      R(r.x, r.y + r.h - 5, r.w, 5, C.wains); R(r.x, r.y + r.h - 1, r.w, 1, C.wainsDk);
      for (let x = r.x + 3; x < r.x + r.w; x += 6) R(x, r.y + r.h - 4, 1, 3, C.wainsDk);
    } else {
      R(r.x, r.y + r.h - r.S, r.w, r.S, C.wallTop);
    }

    // 문
    const gp = d.gap, col = room.color, dk = room.dark;
    if (d.side === 'S') {
      R(gp.x, gp.y, gp.w, gp.h, C.woodA);
      R(gp.x, gp.y, gp.w, 1, C.woodLine);
      R(gp.x - 2, gp.y, 2, gp.h, dk); R(gp.x + gp.w, gp.y, 2, gp.h, dk);
      // 옆으로 밀어 둔 미닫이문
      R(gp.x - 18, gp.y + 3, 15, 9, col); R(gp.x - 18, gp.y + 3, 15, 1, room.light);
      R(gp.x - 15, gp.y + 5, 5, 3, C.glass); R(gp.x - 15, gp.y + 5, 2, 1, C.glassHi);
      R(gp.x - 6, gp.y + 8, 1, 2, C.out);
      plate(R, gp.x + gp.w + 4, gp.y + 2, r.room);
    } else if (d.side === 'N') {
      R(gp.x, gp.y, gp.w, 4, C.hallB);
      R(gp.x, gp.y + 4, gp.w, gp.h - 4, '#cdb68b');
      R(gp.x, gp.y + 4, gp.w, 3, '#a89068');
      R(gp.x - 2, gp.y + 4, 2, gp.h - 4, dk); R(gp.x + gp.w, gp.y + 4, 2, gp.h - 4, dk);
      R(gp.x - 2, gp.y + 4, gp.w + 4, 2, dk);
      R(gp.x + gp.w + 2, gp.y + 6, 13, 17, col); R(gp.x + gp.w + 2, gp.y + 6, 13, 1, room.light);
      R(gp.x + gp.w + 5, gp.y + 8, 7, 5, C.glass); R(gp.x + gp.w + 5, gp.y + 8, 3, 1, C.glassHi);
      R(gp.x + gp.w + 4, gp.y + 15, 1, 2, C.out);
      plate(R, gp.x - 11, gp.y + 8, r.room);
      R(gp.x, gp.y + gp.h, gp.w, 1, dk);
    } else {
      const east = d.side === 'E';
      R(gp.x, gp.y, gp.w, gp.h, C.woodA);
      R(gp.x, gp.y - 2, gp.w, 2, dk); R(gp.x, gp.y + gp.h, gp.w, 2, dk);
      R(gp.x + (east ? 1 : 1), gp.y - 16, 4, 14, col); R(gp.x + 2, gp.y - 13, 2, 5, C.glass);
      plate(R, east ? gp.x + gp.w + 2 : gp.x - 9, gp.y - 14, r.room);
    }
  }
  function desk(R, x, y, w, h, chair) {
    R(x, y + h, 2, 3, C.leg); R(x + w - 2, y + h, 2, 3, C.leg);
    R(x, y, w, h, C.desk); R(x, y, w, 1, '#f3c58e'); R(x, y + h - 1, w, 1, C.deskDk);
    if (chair) { R(x + 3, y + h + 4, w - 6, 4, C.chair); R(x + 3, y + h + 7, w - 6, 1, C.chairDk); R(x + 3, y + h + 8, 1, 2, C.leg); R(x + w - 4, y + h + 8, 1, 2, C.leg); }
  }
  function shelf(R, x, y) {
    R(x, y, 12, 20, C.frame); R(x + 1, y + 1, 10, 18, '#6b4228');
    const cs = ['#e0475a', '#3f7dd8', '#f2c14e', '#4f9a4a', '#c2410c', '#ffffff'];
    for (let s = 0; s < 3; s++) for (let i = 0; i < 5; i++) R(x + 1 + i * 2, y + 2 + s * 6, 2, 5, cs[(i + s * 2) % cs.length]);
    R(x + 1, y + 7, 10, 1, C.frame); R(x + 1, y + 13, 10, 1, C.frame);
  }
  function plate(R, x, y, room) {
    R(x - 1, y - 1, 7, 9, C.out); R(x, y, 5, 7, room.color);
    DIGITS[room.n].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') R(x + 1 + i, y + 1 + j, 1, 1, '#ffffff'); }));
  }

  /* ───────── 화면·상태 ───────── */
  const stage = $('#stage'), screen = $('#screen'), sctx = screen.getContext('2d');
  const buf = document.createElement('canvas'), g = buf.getContext('2d');
  const labels = $('#labels');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  let L = null, kid = null, mode = 'menu';
  const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, path: [] };
  const keys = new Set();
  const padDirs = new Set();
  let dlgRoom = null, armed = null, hoverRoom = null, scale = 2, k = 2, leaving = false;

  function load(key, store) { try { return JSON.parse(store.getItem(key)); } catch { return null; } }
  function save(key, v, store) { try { store.setItem(key, JSON.stringify(v)); } catch { /* 저장 안 되는 환경 */ } }

  function choosePortrait() { return innerWidth < 700 && innerHeight > innerWidth * 1.05; }

  function setLayout(portrait) {
    const prevRoom = L ? nearestDoorRoom() : null;
    L = buildLayout(portrait);
    buf.width = L.W; buf.height = L.H;
    labels.innerHTML = '';
    for (const r of L.rooms) {
      const el = document.createElement('div');
      el.className = 'chalk';
      el.textContent = r.room.short;
      Object.assign(el.style, {
        left: (r.board.x / L.W) * 100 + '%', top: (r.board.y / L.H) * 100 + '%',
        width: (r.board.w / L.W) * 100 + '%', height: ((r.board.h - 2) / L.H) * 100 + '%',
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
    const reserve = overlayPad ? 24 : isTouch ? 230 : 170;
    const byW = availW / L.W;
    const byH = (innerHeight - reserve) / L.H;
    scale = Math.max(0.6, Math.min(byW, Math.max(byH, portrait ? byW * 0.8 : 0.6), 4));
    const cssW = Math.floor(L.W * scale), cssH = Math.floor(L.H * scale);
    stage.style.width = cssW + 8 + 'px';
    stage.style.height = cssH + 8 + 'px';
    k = Math.max(1, Math.ceil(scale * (devicePixelRatio || 1)));
    screen.width = L.W * k; screen.height = L.H * k;
    stage.style.setProperty('--chalk', Math.max(9, Math.min(22, Math.round(scale * 5.6))) + 'px');
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
    if (free(P.x, P.y) && [[P.x - 4, P.y - 3], [P.x + 3, P.y]].every(([a, b]) => inRect(a, b, L.walkHall))) return null;
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
      P.dir = dx && !dy ? (dx < 0 ? 'left' : 'right') : dy ? (dy < 0 ? 'up' : 'down') : P.dir;
      if (dx && dy) P.dir = Math.abs(dx) > Math.abs(dy) ? P.dir : (dy < 0 ? 'up' : 'down');
    } else if (P.path.length && !dlgRoom) {
      const t = P.path[0];
      const vx = t.x - P.x, vy = t.y - P.y, dist = Math.hypot(vx, vy), s = SPEED * dt;
      if (dist <= s) { P.x = t.x; P.y = t.y; P.path.shift(); }
      else { P.x += (vx / dist) * s; P.y += (vy / dist) * s; }
      if (dist > 0.5) P.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      P.moving = true;
    }
    P.anim = P.moving ? P.anim + dt : 0;

    // 교실 문 안으로 들어섰는지
    const r = L.rooms.find((rr) => inRect(P.x, P.y, rr.door.walk) && rr.door.inside(P.x, P.y));
    if (r && armed !== r.i && !dlgRoom) { armed = r.i; P.path = []; openDialog(r); }
    if (!r && armed != null && !dlgRoom) armed = null;
  }

  /* ───────── 그리기 ───────── */
  let clock = 0;
  function render() {
    if (!L) return;
    g.drawImage(L.bg, 0, 0);
    // 교실에 있는 다른 학생들
    const others = KIDS.filter((x) => x !== kid);
    L.rooms.forEach((r, i) => {
      const o = others[i];
      if (!o || !r.seats.length) return;
      const s = r.seats[(i * 2 + 1) % r.seats.length];
      const bob = !reduceMotion && Math.floor(clock * 1.5 + i) % 4 === 0 ? -1 : 0;
      g.fillStyle = C.shadow; g.fillRect(s.x - 5, s.y - 2, 10, 3);
      g.drawImage(sprite(o, 'up', 'idle'), Math.round(s.x - 8), Math.round(s.y - 20 + bob));
    });
    // 마우스를 올린 교실 테두리
    const hi = hoverRoom != null ? L.rooms[hoverRoom] : dlgRoom;
    if (hi) {
      const f = hi.floor, on = reduceMotion || Math.floor(clock * 4) % 2 === 0;
      g.fillStyle = on ? hi.room.color : '#ffffff';
      for (let x = f.x; x < f.x + f.w; x += 4) { g.fillRect(x, f.y, 2, 1); g.fillRect(x + 2, f.y + f.h - 1, 2, 1); }
      for (let y = f.y; y < f.y + f.h; y += 4) { g.fillRect(f.x, y + 2, 1, 2); g.fillRect(f.x + f.w - 1, y, 1, 2); }
    }
    // 가까운 문 위에 깜빡이는 화살표
    if (mode === 'play' && !dlgRoom) {
      for (const r of L.rooms) {
        const d = r.door;
        if (Math.hypot(P.x - d.front.x, P.y - d.front.y) < 30 || hoverRoom === r.i) arrow(d, r);
      }
    }
    // 내 캐릭터
    if (kid && mode === 'play') {
      const frames = P.dir === 'left' || P.dir === 'right' ? ['a', 'idle'] : ['a', 'idle', 'b', 'idle'];
      const fr = P.moving ? frames[Math.floor(P.anim * 7) % frames.length] : 'idle';
      const x = Math.round(P.x), y = Math.round(P.y);
      g.fillStyle = C.shadow; g.fillRect(x - 5, y - 2, 10, 3); g.fillRect(x - 4, y - 3, 8, 1);
      g.drawImage(sprite(kid, P.dir, fr), x - 8, y - 20 - (P.moving && fr !== 'idle' ? 1 : 0));
    }
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(buf, 0, 0, L.W * k, L.H * k);
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
        // i번째 줄: 화살 끝(1칸)에서 뒤로 갈수록 넓어진다
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
    const room = r.room;
    dlg.style.setProperty('--room', room.color);
    $('#dlg-num').textContent = room.n + '반';
    $('#dlg-title').textContent = room.title;
    $('#dlg-desc').textContent = room.desc;
    const say = `${kid.name}: ${room.short} 교실이다! 들어가 볼까?`;
    const el = $('#dlg-say');
    clearInterval(typer);
    if (reduceMotion) el.textContent = say;
    else {
      let n = 0; el.textContent = '';
      typer = setInterval(() => { n++; el.textContent = say.slice(0, n); if (n >= say.length) clearInterval(typer); }, 28);
    }
    dlg.hidden = false;
  }
  function closeDialog(stepBack) {
    if (!dlgRoom) return;
    const r = dlgRoom;
    dlgRoom = null; dlg.hidden = true; clearInterval(typer);
    if (stepBack) walkTo([r.door.front]);
    stage.focus({ preventScroll: true });
  }
  function enter(r) {
    if (leaving) return;
    leaving = true;
    save('pixelSchool', { kid: kid.id, room: r.i }, sessionStorage);
    $('#fade').hidden = false;
    setTimeout(() => { location.href = r.room.url; }, reduceMotion ? 0 : 320);
  }
  $('#dlg-go').addEventListener('click', () => dlgRoom && enter(dlgRoom));
  $('#dlg-no').addEventListener('click', () => closeDialog(true));

  /* ───────── 학생 고르기 ───────── */
  const menu = $('#menu'), kidsEl = $('#kids');
  KIDS.forEach((kd) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'kid'; b.dataset.id = kd.id;
    const c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    c.getContext('2d').drawImage(sprite(kd, 'down', 'idle'), 0, 0);
    const nm = document.createElement('b'); nm.textContent = kd.name;
    const ln = document.createElement('small'); ln.textContent = kd.line;
    b.append(c, nm, ln);
    b.setAttribute('aria-label', `${kd.name}: ${kd.line}`);
    b.addEventListener('click', () => start(kd));
    kidsEl.appendChild(b);
  });
  function openMenu() {
    mode = 'menu';
    closeDialog(false);
    menu.hidden = false;
    $('#change').hidden = true;
    const saved = load('pixelSchoolKid', localStorage);
    const btn = kidsEl.querySelector(`[data-id="${saved}"]`) || kidsEl.firstElementChild;
    btn.focus({ preventScroll: true });
  }
  function start(kd, roomIndex) {
    kid = kd;
    save('pixelSchoolKid', kd.id, localStorage);
    menu.hidden = true;
    $('#change').hidden = false;
    mode = 'play';
    if (roomIndex != null && L.rooms[roomIndex]) placeAtDoor(roomIndex);
    stage.focus({ preventScroll: true });
  }
  $('#change').addEventListener('click', (e) => { e.stopPropagation(); openMenu(); });
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

  /* ───────── 키보드 ───────── */
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function gameHasFocus() {
    const a = document.activeElement;
    return a === document.body || a === stage || (stage.contains(a) && !menu.contains(a));
  }
  addEventListener('keydown', (e) => {
    if (mode !== 'play' || !gameHasFocus() || e.altKey || e.ctrlKey || e.metaKey) return;
    const dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      if (dlgRoom) closeDialog(false);
      keys.add(dir);
      return;
    }
    const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
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

  // Enter·A: 대화창이 떠 있으면 들어가고, 문 앞이면 문으로 걸어 들어간다
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
      closeDialog(false);
    }
    if (r) {
      // 이미 그 교실 문 안에 서 있으면 바로 대화창
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

  // 방향 패드
  document.querySelectorAll('.dpad button').forEach((b) => {
    const dir = b.dataset.dir;
    const on = (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ } if (dlgRoom) closeDialog(false); padDirs.add(dir); b.classList.add('on'); };
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

  addEventListener('resize', fit);
  // 뒤로 가기로 돌아왔을 때(bfcache) 검은 화면을 걷고 문 앞에 다시 세운다
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    $('#fade').hidden = true;
    closeDialog(false);
    const st = load('pixelSchool', sessionStorage);
    if (st && L.rooms[st.room]) placeAtDoor(st.room);
  });

  /* ───────── 시작 ───────── */
  fit();
  const st = load('pixelSchool', sessionStorage);
  const back = st && KIDS.find((x) => x.id === st.kid);
  if (back) start(back, st.room);
  else openMenu();
  requestAnimationFrame((t) => { last = t; loop(t); });

  // 화면 확인용(개발자 도구): pixelSchool.go(1) 은 1반 문으로 걸어간다
  window.pixelSchool = { go: (n) => L.rooms[n - 1] && goToRoom(L.rooms[n - 1]), state: () => ({ mode, x: P.x, y: P.y, dir: P.dir, dialog: dlgRoom && dlgRoom.room.n, portrait: L.portrait }) };
})();
