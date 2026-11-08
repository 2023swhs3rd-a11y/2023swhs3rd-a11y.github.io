/*
  픽셀 학교 (첫 화면 /)
  - 교실 여섯 칸은 index.html의 "교실 바로가기" 목록(#rooms a)에서 읽는다. 주소·이름·설명·색·벽 그림을 바꾸려면 그 목록만 고친다.
  - 그림은 모두 이 파일에서 캔버스에 직접 찍는다(그림 파일 없음). 16비트 게임처럼 지도 한 칸 = 1픽셀이고,
    지도는 가로형 384×256, 세로형(휴대폰) 240×336 픽셀이다.
  - 걷기: 방향키·WASD(Shift는 달리기), 터치 방향 패드, 화면 클릭·터치(길을 찾아 걸어감). 복도와 교실 안을 자유롭게 다닌다.
    교실 문으로 들어서거나 선생님·학생에게 다가가면 사이트로 가는 대화창이 뜨고 Enter·A·클릭으로 연다.
    숫자키 1~6은 그 교실 사이트를 바로 연다. M은 소리 켜기·끄기.
  - 숨은 재미: 반짝이는 별 스티커 3개, 복도에서 뛰면 선생님 잔소리, 계단 끝, ↑↑↓↓←→←→BA.
  - 효과음은 Web Audio로 그 자리에서 합성한다(소리 파일 없음).
  - 고른 학생·소리 설정·주운 스티커는 localStorage, 마지막에 들어간 교실은 sessionStorage에 둔다.
*/
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ───────── 사람(학생·선생님, 모두 이 페이지를 위해 새로 그린 캐릭터) ─────────
     글자 하나가 1픽셀: h 머리 l 머리 윤기 s 피부 S 피부 그늘 e 눈 W 눈 반짝임 b 볼 m 입 c 겉옷 C 겉옷 아랫단
     w 셔츠·옷깃 t 넥타이·리본·지퍼 p 바지·치마 k 신발 g 안경 r 머리끈 H 콧수염. 바깥 테두리와 오른쪽 그늘은 자동으로 넣는다. */
  const HEAD = {
    down: [
      '....hhhhhh....',
      '..hhhhhhhhhh..',
      '.hhllhhhhhhhh.',
      '.hlhhhhhhhhhh.',
      'hhhhhhhhhhhhhh',
      'hhhshhhhhhshhh',
      'hhsssssssssshh',
      'hsseWsssseWssh',
      'hsseesssseessh',
      'hsbsssmmsssbsh',
      '.hssssssssssh.',
      '...ssssssss...',
    ],
    up: [
      '....hhhhhh....',
      '..hhhhhhhhhh..',
      '.hhllhhhhhhhh.',
      '.hlhhhhhhhhhh.',
      'hhhhhhhhhhhhhh',
      'hhhhhhhhhhhhhh',
      'hhhhhhhhhhhhhh',
      'hhhhhhhhhhhhhh',
      'shhhhhhhhhhhhs',
      'shhhhhhhhhhhhs',
      '.hhhhhhhhhhhh.',
      '...ssssssss...',
    ],
    side: [
      '....hhhhhh....',
      '..hhhhhhhhhh..',
      '.hhllhhhhhhhh.',
      '.hlhhhhhhhhhh.',
      'hhhhhhhhhhhhhh',
      'hshhhhhhhhhhhh',
      'sssssshhhhhhhh',
      'sseWsssShhhhhh',
      'sseesssShhhhhh',
      'sbsmssssshhhh.',
      '.ssssssshhhh..',
      '..sssssss.....',
    ],
  };
  const BODY = {
    kid: {
      down: ['....cwttwc....', '...ccwttwcc...', '..sccccccccs..', '...CCCCCCCC...'],
      up: ['....cccccc....', '...cccccccc...', '..sccccccccs..', '...CCCCCCCC...'],
      side: ['....wccccc....', '....cccccc....', '....cscccc....', '....CCCCCC....'],
    },
    adult: {
      down: ['....cwttwc....', '...ccwttwcc...', '..cccwttwccc..', '..ccccttcccc..', '..sccccccccs..', '...CCCCCCCC...'],
      up: ['....cccccc....', '...cccccccc...', '..cccccccccc..', '..cccccccccc..', '..sccccccccs..', '...CCCCCCCC...'],
      side: ['....wccccc....', '....cccccc....', '....cccccc....', '....cccccc....', '....cscccc....', '....CCCCCC....'],
    },
  };
  const LEGS = {
    kid: {
      down: { idle: ['....pp..pp....', '...kkk..kkk...'], a: ['....pp..kk....', '...kkk........'], b: ['....kk..pp....', '........kkk...'] },
      side: { idle: ['.....pppp.....', '....kkkk......'], a: ['....pp..pp....', '...kkk..kkk...'], b: ['.....pppp.....', '....kkkk......'] },
    },
    adult: {
      down: { idle: ['....pp..pp....', '....pp..pp....', '...kkk..kkk...'], a: ['....pp..pp....', '....pp..kk....', '...kkk........'], b: ['....pp..pp....', '....kk..pp....', '........kkk...'] },
      side: { idle: ['.....pppp.....', '.....pppp.....', '....kkkk......'], a: ['....pppppp....', '....pp..pp....', '...kkk..kkk...'], b: ['.....pppp.....', '.....pppp.....', '....kkkk......'] },
    },
  };
  // 덧그림: [모드, 색, x, y, w, h] — u는 빈 칸에만, o는 위에 덮어 칠한다(위 템플릿 좌표)
  const ALL = (list) => ({ down: list, up: list, side: list });
  const EXTRA = {
    long: { down: [['u', 'h', 0, 9, 2, 7], ['u', 'h', 12, 9, 2, 7]], up: [['o', 'h', 1, 10, 12, 5], ['u', 'h', 1, 15, 12, 1]], side: [['u', 'h', 8, 9, 5, 7]] },
    pony: { down: [['u', 'h', 12, 0, 3, 4]], up: [['o', 'r', 6, 9, 2, 1], ['o', 'h', 6, 10, 2, 5]], side: [['u', 'h', 13, 2, 2, 7], ['o', 'r', 13, 3, 1, 1]] },
    bob: { down: [['u', 'h', 0, 10, 2, 2], ['u', 'h', 12, 10, 2, 2]], up: [['o', 'h', 2, 11, 10, 1]], side: [['u', 'h', 9, 10, 4, 2]] },
    spiky: ALL([['u', 'h', 2, 1, 1, 1], ['u', 'h', 3, 0, 1, 1], ['u', 'h', 4, -1, 1, 1], ['u', 'h', 6, -1, 2, 1], ['u', 'h', 7, -2, 1, 1], ['u', 'h', 9, -1, 1, 1], ['u', 'h', 10, 0, 1, 1], ['u', 'h', 11, 1, 1, 1]]),
    buns: { down: [['u', 'h', 0, -1, 3, 3], ['u', 'h', 11, -1, 3, 3], ['o', 't', 2, 1, 1, 1], ['o', 't', 11, 1, 1, 1]], up: [['u', 'h', 0, -1, 3, 3], ['u', 'h', 11, -1, 3, 3]], side: [['u', 'h', 10, -1, 3, 3]] },
    bun: { down: [['u', 'h', 5, -3, 4, 3]], up: [['u', 'h', 5, -3, 4, 3]], side: [['u', 'h', 9, -2, 4, 3]] },
    ahoge: ALL([['u', 'h', 7, -1, 1, 1], ['u', 'h', 8, -2, 1, 1], ['u', 'h', 9, -2, 1, 1]]),
    ribbon: { down: [['o', 'r', 10, 1, 3, 1], ['o', 'r', 11, 0, 1, 3]], up: [['o', 'r', 10, 1, 3, 1], ['o', 'r', 11, 0, 1, 3]], side: [['o', 'r', 9, 1, 3, 1], ['o', 'r', 10, 0, 1, 3]] },
    glasses: { down: [['o', 'g', 2, 7, 1, 2], ['o', 'g', 5, 7, 1, 2], ['o', 'g', 8, 7, 1, 2], ['o', 'g', 11, 7, 1, 2], ['o', 'g', 6, 7, 2, 1]], side: [['o', 'g', 1, 7, 1, 2], ['o', 'g', 4, 7, 1, 2], ['o', 'g', 5, 7, 2, 1]] },
    mustache: { down: [['o', 'H', 5, 9, 4, 1]], side: [['o', 'H', 1, 9, 3, 1]] },
    hood: { down: [['u', 'w', 2, 11, 10, 2]], up: [['o', 'w', 3, 11, 8, 3]], side: [['u', 'w', 8, 10, 4, 3]] },
  };

  const KIDS = [
    { id: 'haneul', name: '하늘', line: '아침마다 1등으로 등교해요', look: ['ahoge'],
      pal: { h: '#2a2440', s: '#ffd9b8', c: '#33508f', w: '#ffffff', t: '#e2475a', p: '#6b7280' } },
    { id: 'bora', name: '보라', line: '도서관 창가 자리가 제 자리예요', look: ['long', 'ribbon'], skirt: true,
      pal: { h: '#8a5232', s: '#ffe0c4', c: '#33508f', w: '#ffffff', t: '#e2475a', p: '#b33d55', r: '#ff6f91' } },
    { id: 'doyun', name: '도윤', line: '궁금한 건 바로 찾아봐야 해요', look: ['spiky', 'glasses'],
      pal: { h: '#40322c', s: '#f7caa0', c: '#4a9a5c', w: '#ffffff', t: '#33508f', p: '#3b4252' } },
    { id: 'seoa', name: '서아', line: '체육대회 계주 마지막 주자!', look: ['pony'],
      pal: { h: '#6a3a26', s: '#ffd4ae', c: '#ff8a3d', w: '#ffffff', t: '#ffffff', p: '#33508f', r: '#ffd36b' } },
    { id: 'jimin', name: '지민', line: '오늘의 뉴스는 제가 스크랩해요', look: ['buns'], skirt: true,
      pal: { h: '#2b2440', s: '#ffe0c4', c: '#ffc94d', w: '#ffffff', t: '#ff6f91', p: '#3f56a0' } },
    { id: 'yuchan', name: '유찬', line: '그래프 그리는 게 제일 재밌어요', look: ['bob', 'hood'],
      pal: { h: '#9a4426', s: '#f7caa0', c: '#8a6ad8', w: '#b9a5f0', t: '#ffffff', p: '#4b5563' } },
  ];
  // 교실 안 학생에게 다가가면 이 가운데 하나를 무작위로 말한다(학생마다 하나 + 모두가 쓰는 말)
  const KID_TALK = {
    haneul: ['오늘도 1등으로 왔더니 교실이 조용해서 좋았어.', '아침 자습 시간에 진로 노트를 써 봤어.'],
    bora: ['요즘 읽는 소설 결말이 너무 궁금해!', '도서관 신간 코너 벌써 가 봤어?'],
    doyun: ['방금 궁금한 걸 검색하다가 새 전공을 알게 됐어.', '내 안경 어때? 새로 맞췄어.'],
    seoa: ['계주 연습하다 왔어. 숨차!', '복도에서는 안 뛰어. 운동장에서만 뛰어!'],
    jimin: ['오늘 스크랩한 기사, 생각보다 재밌더라.', '뉴스 하나로 탐구 주제가 세 개나 나왔어.'],
    yuchan: ['어제 그린 그래프가 꽤 예쁘게 나왔어.', '숫자로 보면 우리 동네가 달라 보여.'],
  };
  const COMMON_TALK = [
    '쉬는 시간 10분은 왜 이렇게 짧을까?', '급식 메뉴 봤어? 오늘 디저트 있대!', '수행평가 주제 아직 못 정했어…',
    '선생님이 이 사이트 꼭 보래.', '어디 숨은 별 스티커 본 적 있어?', '창밖 하늘이 참 맑다.',
    '다음 시간 뭐더라?', '같이 공부할래?', '진로 고민은 혼자 하는 것보다 같이 하는 게 좋대.',
  ];
  const lastTalk = {};
  function kidTalk(npc) {
    const pool = (KID_TALK[npc.id] || []).concat(COMMON_TALK, [npc.line + (/[!?.…]$/.test(npc.line) ? '' : '.')]);
    let line;
    do { line = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && line === lastTalk[npc.id]);
    lastTalk[npc.id] = line;
    return line;
  }
  const TEACHERS = [
    { id: 't1', name: '김 선생님', adult: true, look: ['glasses'], say: '대입 전형은 무엇이든 물어보세요.',
      pal: { h: '#5a596e', s: '#f7caa0', c: '#2b3a66', w: '#ffffff', t: '#e2475a', p: '#353b4a' } },
    { id: 't2', name: '박 선생님', adult: true, look: ['bun'], skirt: true, say: '진로 고민, 같이 찾아봐요.',
      pal: { h: '#6a3a26', s: '#ffd9b8', c: '#f08fb0', w: '#ffffff', t: '#c2410c', p: '#4b4f7a' } },
    { id: 't3', name: '이 선생님', adult: true, look: ['glasses'], say: '숫자 속에 우리 동네 이야기가 있어요.',
      pal: { h: '#2a2440', s: '#f2bf94', c: '#f4f4f4', w: '#7fb3e0', t: '#0e7490', p: '#3b4252' } },
    { id: 't4', name: '최 선생님', adult: true, look: ['long'], skirt: true, say: '오늘은 어떤 책을 읽고 있나요?',
      pal: { h: '#2e2030', s: '#ffe0c4', c: '#74b46e', w: '#fff6e0', t: '#c2410c', p: '#a35a3a' } },
    { id: 't5', name: '정 선생님', adult: true, look: ['mustache'], say: '뉴스 한 줄이 진로가 되기도 해요.',
      pal: { h: '#3a2a20', s: '#efb98e', c: '#cf8240', w: '#ffffff', t: '#15803d', p: '#4a3a30' } },
    { id: 't6', name: '한 선생님', adult: true, look: ['bob'], skirt: true, say: '생각을 한 단계씩 키워 봐요.',
      pal: { h: '#1f1b2e', s: '#ffd4ae', c: '#b55094', w: '#ffffff', t: '#ffd36b', p: '#b55094' } },
  ];

  /* ───────── 오른쪽 끝 교무실 칸: 진로카페·위클래스(사이트로 가지 않고 이야기만 나눈다) ───────── */
  const mkRoom = (o) => Object.assign({ n: null, special: true, el: null, url: null,
    light: mix(o.color, '#ffffff', 0.55), pale: mix(o.color, '#ffffff', 0.8), dark: mix(o.color, '#000000', 0.3) }, o);
  const SPECIAL = [
    { room: mkRoom({ key: 'cafe', short: '진로카페', title: '진로카페', badge: '카페', color: '#9a6240', icon: 'cup',
        desc: '진로 선생님과 따뜻한 차 한 잔 하며 진로 고민을 편하게 나누는 쉼터예요.' }),
      staff: { id: 'barista', name: '윤 선생님', adult: true, look: ['pony'], say: '',
        pal: { h: '#4a2c20', s: '#f7caa0', c: '#6b4228', w: '#fff6e0', t: '#e0a93a', p: '#3b3030' } },
      talk: ['진로카페에서는 커피 향을 맡으며 진로 이야기를 나눠요.', '원두를 고르듯 진로도 천천히 맛보며 골라 봐요.',
        '따뜻한 코코아도 있어요. 고민 하나 내려놓고 가요.', '오늘의 추천 메뉴는 "꿈 한 스푼 라떼"예요.', '쉬는 시간에 잠깐 들러도 좋아요. 자리는 늘 비워 둘게요.'],
      bubble: ['커피 내리는 중…', '꿈 한 스푼 라떼 어때요?', '쉬어 가요, 천천히!', '진로 고민도 한 잔!'] },
    { room: mkRoom({ key: 'wee', short: '위클래스', title: '위클래스(Wee 클래스)', badge: '상담', color: '#d96a8e', icon: 'heart',
        desc: '마음이 힘들거나 이야기를 나누고 싶을 때 찾아오는 상담실이에요. 상담이 필요한 학생은 4층 위클래스로 오세요.' }),
      staff: { id: 'counselor', name: '서 선생님', adult: true, look: ['long'], skirt: true, say: '',
        pal: { h: '#5a3428', s: '#ffe0c4', c: '#f4a7b9', w: '#fff6e0', t: '#ffffff', p: '#8a6ad8' } },
      talk: ['상담이 필요한 학생은 4층 위클래스로 오세요.', '오늘 마음 날씨는 어때요? 흐린 날도 괜찮아요.',
        '말하기 어려운 고민도 여기서는 비밀이 지켜져요.', '힘들 때는 혼자 참지 말고 언제든 찾아와요.', '잘하고 있어요. 오늘도 수고 많았어요.'],
      bubble: ['상담이 필요한 학생은 4층 위클래스로 오세요', '오늘 기분은 어때요?', '언제든 문 열려 있어요', '천천히 숨 한 번!'] },
  ];
  const specialOf = (r) => r && r.room.special ? SPECIAL.find((x) => x.room === r.room) : null;
  const BASEPAL = { e: '#2b1d2e', W: '#ffffff', b: '#ff9fa8', m: '#d0505a', w: '#ffffff', k: '#3b2a24', g: '#8a9cc8', r: '#e0475a', H: '#3a2a20' };
  [...KIDS, ...TEACHERS, ...SPECIAL.map((x) => x.staff)].forEach((p) => {
    p.pal = { ...BASEPAL, ...p.pal };
    p.pal.l = mix(p.pal.h, '#ffffff', 0.38);
    p.pal.S = mix(p.pal.s, '#a0603a', 0.3);
    p.pal.C = mix(p.pal.c, C.ink, 0.25);
  });

  const SPR_W = 18, OX = 2, OY = 3;
  const spriteCache = new Map();
  function personSprite(sp, dir, frame, blink) {
    const key = `${sp.id}|${dir}|${frame}|${blink ? 1 : 0}`;
    let cv = spriteCache.get(key);
    if (!cv) { cv = drawPerson(sp, dir, frame, blink); spriteCache.set(key, cv); }
    return cv;
  }
  function drawPerson(sp, dir, frame, blink) {
    const age = sp.adult ? 'adult' : 'kid';
    const d = dir === 'left' || dir === 'right' ? 'side' : dir;
    const head = HEAD[d].map((r) => r.split(''));
    if (blink && d !== 'up') {
      for (const y of [7, 8]) head[y] = head[y].map((c) => (c === 'e' || c === 'W' ? (y === 8 ? 'e' : 's') : c));
    }
    const body = BODY[age][d].map((r) => r.split(''));
    const legSet = LEGS[age][d === 'up' ? 'down' : d];
    let legs = (legSet[frame] || legSet.idle).map((r) => r.split(''));
    if (sp.skirt) {
      const skirt = (d === 'side' ? '....pppppp....' : age === 'adult' ? '..pppppppppp..' : '...pppppppp...').split('');
      legs = legs.map((r, i) => (i < legs.length - 1 ? r.map((c) => (c === 'p' ? 's' : c)) : r));
      legs.unshift(skirt);
    }
    const rows = [...head, ...body, ...legs];
    const H = rows.length + OY + 1;
    const G = Array.from({ length: H }, () => Array(SPR_W).fill(null));
    rows.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') G[y + OY][x + OX] = c; }));
    const ovs = [];
    for (const name of sp.look || []) ovs.push(...(((EXTRA[name] || {})[d]) || []));
    for (const [mode, c, x0, y0, w, h] of ovs) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const gx = x + OX, gy = y + OY;
        if (gy < 0 || gy >= H || gx < 0 || gx >= SPR_W) continue;
        if (mode === 'o' || !G[gy][gx]) G[gy][gx] = c;
      }
    }
    if (dir === 'right') G.forEach((r) => r.reverse());
    // 오른쪽 가장자리 그늘(머리·옷·바지)
    const S = G.map((r) => r.slice());
    const shade = { h: 'H2', c: 'C', p: 'P2', w: 'w2', k: 'k2' };
    for (let y = 0; y < H; y++) for (let x = 0; x < SPR_W; x++) {
      const k = G[y][x];
      if (!shade[k]) continue;
      if (G[y][x + 1] !== k && G[y][x - 1] === k && (k !== 'h' || G[y][x + 1] == null)) S[y][x] = shade[k];
    }
    const pal = sp.pal;
    const col = (k) => {
      if (k === 'H2') return mix(pal.h, C.ink, 0.3);
      if (k === 'P2') return mix(pal.p, C.ink, 0.25);
      if (k === 'w2') return mix(pal.w, '#9a8fb0', 0.35);
      if (k === 'k2') return mix(pal.k, C.ink, 0.3);
      return pal[k] || '#ff00ff';
    };
    const cv = document.createElement('canvas');
    cv.width = SPR_W; cv.height = H;
    const g = cv.getContext('2d');
    for (let y = 0; y < H; y++) for (let x = 0; x < SPR_W; x++) {
      const k = S[y][x];
      if (k) { g.fillStyle = col(k); g.fillRect(x, y, 1, 1); continue; }
      const nb = [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([dx, dy]) => (G[y + dy] || [])[x + dx]).find(Boolean);
      if (nb) { g.fillStyle = mix(col(nb), C.ink, 0.7); g.fillRect(x, y, 1, 1); }
    }
    cv.foot = OY + rows.length; // 발바닥 바로 아래 줄
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
    cup: ['..w.w...', '.w.w....', '........', 'AAAAAA..', 'AwwwwAkk', 'AwwwwA.k', 'AAAAAAkk', '.aaaa...'],
    heart: ['........', '.AA..AA.', 'AwAAAAAA', 'AAAAAAAA', 'AAAAAAAA', '.AAAAAA.', '..AAAA..', '...AA...'],
  };
  const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'] };
  const PROPS = { cup: ['plant', 'shelf'], heart: ['plant', 'beanbag', 'plant'], pennant: ['trophy', 'plant', 'trash'], star: ['globe', 'shelf', 'plant'], chart: ['easel', 'globe', 'plant'], book: ['shelf', 'beanbag', 'plant'], news: ['tv', 'plant', 'trash'], pyramid: ['blocks', 'plant', 'trash'] };

  /* ───────── 지도 ───────── */
  function buildLayout(portrait) {
    const L = { portrait, rooms: [] };
    if (!portrait) {
      // 교실 3칸 + 오른쪽 끝 교무실 칸(위: 진로카페, 아래: 위클래스)
      L.W = 480; L.H = 256;
      L.hall = { x: 0, y: 104, w: 480, h: 46 };
      L.walkHall = { x: 28, y: 107, w: 480 - 28 - 24, h: 42 };
      for (let i = 0; i < 8; i++) {
        const top = i < 3 || i === 6, col = i < 6 ? i % 3 : 3;
        const r = { i, room: i < 6 ? ROOMS[i] : SPECIAL[i - 6].room, teacher: i < 6 ? TEACHERS[i] : SPECIAL[i - 6].staff,
          x: col * 128, y: top ? 0 : 150, w: col === 3 ? 96 : 128, h: top ? 104 : 106,
          F: 24, S: top ? 12 : 4, Wt: col === 0 ? 4 : 2, Et: col === 3 ? 4 : 2 };
        if (top) {
          const cx = r.x + r.w - 36;
          r.door = { side: 'S', cx, gap: { x: cx - 10, y: r.y + r.h - 12, w: 20, h: 12 },
            walk: { x: cx - 9, y: r.y + r.h - 14, w: 18, h: 20 },
            entry: { x: cx, y: r.y + r.h - 17 }, front: { x: cx, y: L.hall.y + 16 },
            zone: { x: cx - 12, y: r.y + r.h - 30, w: 24, h: 38 }, inward: 'up' };
        } else {
          const cx = r.x + 30;
          r.door = { side: 'N', cx, gap: { x: cx - 10, y: r.y, w: 20, h: 24 },
            walk: { x: cx - 9, y: r.y - 6, w: 18, h: 38 },
            entry: { x: cx, y: r.y + 31 }, front: { x: cx, y: r.y - 12 },
            zone: { x: cx - 12, y: r.y - 8, w: 24, h: 48 }, inward: 'down' };
        }
        L.rooms.push(r);
      }
    } else {
      // 교실 3줄 + 맨 아래 교무실 줄(왼쪽: 진로카페, 오른쪽: 위클래스)
      L.W = 240; L.H = 448;
      L.hall = { x: 96, y: 0, w: 48, h: 448 };
      L.walkHall = { x: 101, y: 28, w: 38, h: 448 - 28 - 10 };
      for (let i = 0; i < 8; i++) {
        const left = i % 2 === 0, row = Math.floor(i / 2);
        const r = { i, room: i < 6 ? ROOMS[i] : SPECIAL[i - 6].room, teacher: i < 6 ? TEACHERS[i] : SPECIAL[i - 6].staff,
          x: left ? 0 : 144, y: row * 112, w: 96, h: 112,
          F: 24, S: row === 3 ? 4 : 2, Wt: left ? 4 : 6, Et: left ? 6 : 4 };
        const cy = r.y + r.h - 26;
        if (left) {
          r.door = { side: 'E', cy, gap: { x: r.x + r.w - 6, y: cy - 10, w: 6, h: 20 },
            walk: { x: r.x + r.w - 16, y: cy - 7, w: 23, h: 15 },
            entry: { x: r.x + r.w - 17, y: cy + 2 }, front: { x: L.hall.x + 14, y: cy + 2 },
            zone: { x: r.x + r.w - 28, y: cy - 10, w: 36, h: 24 }, inward: 'left' };
        } else {
          r.door = { side: 'W', cy, gap: { x: r.x, y: cy - 10, w: 6, h: 20 },
            walk: { x: r.x - 7, y: cy - 7, w: 23, h: 15 },
            entry: { x: r.x + 17, y: cy + 2 }, front: { x: L.hall.x + L.hall.w - 14, y: cy + 2 },
            zone: { x: r.x - 8, y: cy - 10, w: 36, h: 24 }, inward: 'right' };
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
      r.board = { x: bx, y: r.y + 8, w: Math.min(bw, fx1 - 4 - bx), h: 12 };
      // 칠판 왼쪽: 창문(자리가 넉넉할 때), 오른쪽: 벽 그림과 시계
      r.window = r.door.side !== 'N' && bx - fx0 >= 26 ? { x: fx0 + 5, y: r.y + 7, w: bx - fx0 - 13, h: 12 } : null;
      const right = fx1 - (bx + bw);
      r.poster = right >= 16 ? { x: bx + bw + 6, y: r.y + 8 } : null;
      r.clock = right >= 28 ? { x: bx + bw + 19, y: r.y + 8 } : (!r.window && r.door.side !== 'N' && bx - fx0 >= 14 ? { x: fx0 + 4, y: r.y + 9 } : null);
    }
    for (const r of L.rooms) r.walkFloor = { x: r.floor.x + 5, y: r.floor.y + 5, w: r.floor.w - 10, h: r.floor.h - 5 };
    L.walk = [L.walkHall, ...L.rooms.map((r) => r.door.walk), ...L.rooms.map((r) => r.walkFloor)];
    L.obst = []; L.things = []; L.signs = [];
    L.bg = drawBackground(L);
    return L;
  }

  /* ───────── 배경(교실·복도는 한 번만 그려 둔다) ───────── */
  let R = null, gctx = null, L_signs = [];
  // 16비트 느낌을 지키려고 모든 칠하기를 정수 픽셀에 맞춘다
  function useCtx(g) {
    gctx = g;
    R = (x, y, w, h, c) => {
      const x0 = Math.floor(x), y0 = Math.floor(y);
      g.fillStyle = c;
      g.fillRect(x0, y0, Math.max(1, Math.round(x + w) - x0), Math.max(1, Math.round(y + h) - y0));
    };
  }
  function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  function drawBackground(L) {
    const cv = document.createElement('canvas');
    cv.width = L.W; cv.height = L.H;
    const g = cv.getContext('2d');
    useCtx(g);
    L_signs = L.signs;
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
      plant(L.W - 20, h.y + 3); plant(L.W - 20, h.y + h.h - 19);
      // 복도 깔개
      rug(Math.round(L.W / 2 - 52), h.y + 18, 104, 12, '#7d9cc0', '#ffffff');
    } else {
      for (let i = 0; i < 6; i++) { R(h.x, i * 4, h.w, 4, i % 2 ? '#c2ab82' : '#d4bd92'); R(h.x, i * 4, h.w, 0.5, '#e6d2aa'); R(h.x, i * 4 + 3.5, h.w, 0.5, '#8f7a58'); }
      R(h.x, 24, h.w, 2, '#8f7a58');
      R(h.x + 8, L.H - 8, h.w - 16, 8, '#7c9a6a'); R(h.x + 10, L.H - 6, h.w - 20, 0.5, '#5e7c50'); R(h.x + 10, L.H - 3, h.w - 20, 0.5, '#5e7c50');
      rug(h.x + 10, 150, 28, 40, '#7d9cc0', '#ffffff');
      sign(h.x + 3, 5, 42, 12, '정숙');
      standSign(h.x + 4, L.H - 36, 40, 12, '뛰지 맙시다', L);
      // 세워 둔 게시판(가까이 가거나 누르면 진로 선생님께 메시지)
      const bx = h.x + 6, by = 136;
      R(bx + 3, by + 12, 2, 6, C.leg); R(bx + 13, by + 12, 2, 6, C.leg); R(bx + 1, by + 18, 16, 1, C.shadow);
      R(bx - 1, by - 1, 20, 14, C.out); R(bx, by, 18, 12, C.frame); R(bx + 1, by + 1, 16, 10, '#d9a86b');
      R(bx + 2, by + 2, 5, 4, '#ffffff'); R(bx + 8, by + 3, 4, 3, '#ffd36b'); R(bx + 3, by + 7, 4, 3, '#a8dcef');
      R(bx + 10, by + 7, 6, 4, '#ffffff'); R(bx + 11, by + 8, 1, 1, '#e0475a'); R(bx + 14, by + 8, 1, 1, '#e0475a'); R(bx + 12, by + 9, 2, 1, '#e0475a');
      L.obst.push({ x: bx + 1, y: by + 14, w: 16, h: 5 });
      L.board = { x: bx - 1, y: by - 1, w: 20, h: 20, spot: { x: bx + 26, y: by + 14 } };
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
    const glyph = room.special ? (room.icon === 'cup' ? ['...', '###', '#.#', '###', '.#.'] : ['#.#', '###', '###', '.#.', '...']) : DIGITS[room.n];
    glyph.forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') R(x + 1 + i, y + 1 + j, 1, 1, '#ffffff'); }));
  }

  // 표지판: 판은 캔버스에, 글자는 겹쳐 놓은 HTML(칠판 이름과 같은 방식)로 쓴다
  function sign(x, y, w, h, text) {
    R(x - 1, y - 1, w + 2, h + 2, C.out); R(x, y, w, h, '#fffdf4'); R(x, y, w, 1, '#ffffff');
    R(x + 1, y + h - 2, w - 2, 1, '#e8dcc0'); R(x, y, 2, h, '#e0475a'); R(x + w - 2, y, 2, h, '#e0475a');
    L_signs.push({ x: x + 2, y, w: w - 4, h, text });
  }
  function standSign(x, y, w, h, text, L) {
    R(x + 4, y + h, 2, 6, C.leg); R(x + w - 6, y + h, 2, 6, C.leg); R(x + 2, y + h + 6, w - 4, 1, C.shadow);
    R(x - 1, y - 1, w + 2, h + 2, C.out); R(x, y, w, h, '#ffd36b'); R(x, y, w, 1, '#fff1b8'); R(x + 1, y + h - 2, w - 2, 1, '#e0a93a');
    L_signs.push({ x: x + 1, y, w: w - 2, h, text, dark: true });
    L.obst.push({ x: x + 2, y: y + h + 2, w: w - 4, h: 5 });
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
    // 진로카페는 바둑판 타일, 위클래스는 넓고 폭신한 깔개
    if (room.key === 'cafe') {
      for (let y = f.y; y < f.y + f.h; y += 6) for (let x = f.x; x < f.x + f.w; x += 6) {
        R(x, y, 6, 6, ((x - f.x) / 6 + (y - f.y) / 6) % 2 ? '#e9dcc4' : '#b98a62');
        R(x, y, 6, 0.5, 'rgba(255,255,255,.25)');
      }
    } else if (room.key === 'wee') rug(f.x + 6, f.y + 32, f.w - 12, f.h - 40, room.pale, '#ffffff');
    R(f.x, f.y, f.w, 3, C.shadow); R(f.x, f.y + 3, f.w, 1, C.shadow2);

    // 문 안쪽 깔개
    const e = d.entry;
    if (d.side === 'S') rug(e.x - 11, e.y - 16, 22, 9, room.light, '#ffffff');
    else if (d.side === 'N') rug(e.x - 11, e.y + 4, 22, 9, room.light, '#ffffff');
    else if (d.side === 'E') rug(e.x - 18, e.y - 7, 10, 14, room.light, '#ffffff');
    else rug(e.x + 8, e.y - 7, 10, 14, room.light, '#ffffff');

    if (room.special) specialFurniture(r, L, e);
    else classFurniture(r, L, e);
    // 구석 소품(문과 가까운 구석은 비운다)
    const corners = [
      { x: f.x + 2, y: f.y + 3 }, { x: f.x + f.w - 16, y: f.y + 3 },
      { x: f.x + 2, y: f.y + f.h - 21 }, { x: f.x + f.w - 16, y: f.y + f.h - 21 },
    ].filter((c) => Math.hypot(c.x + 7 - e.x, c.y + 10 - e.y) > 24 && !(r.keepClear || []).some((k) => hits(c.x, c.y, 14, 20, k)));
    corners.sort((a, b) => Math.hypot(b.x - e.x, b.y - e.y) - Math.hypot(a.x - e.x, a.y - e.y));
    (PROPS[room.icon] || ['plant']).slice(0, corners.length).forEach((kind, i) => {
      const c = corners[i];
      L.things.push({ y: c.y + 20, fn: () => drawProp(kind, c.x, c.y, room) });
      L.obst.push({ x: c.x + 1, y: c.y + 11, w: 12, h: 9 });
    });
    r.corners = corners;
    // 다른 학생 자리(문에서 먼 자리)
    if (r.seats.length) {
      const s = r.seats[(r.i * 2 + 1) % r.seats.length];
      r.npcSeat = s;
      L.obst.push({ x: s.x - 4, y: s.y - 4, w: 8, h: 5 });
    }
    roomWalls(r, L);
  }
  function classFurniture(r, L, e) {
    const room = r.room, f = r.floor;
    // 교탁: 꽃병·책·사과
    const tdx = Math.round(r.board.x + r.board.w / 2 - 11);
    r.tdesk = { x: tdx, y: f.y + 6, w: 22 };
    L.obst.push({ x: tdx, y: f.y + 6, w: 22, h: 10 });
    L.things.push({ y: f.y + 16, fn: () => {
      desk(tdx, f.y + 6, 22, 7, false);
      R(tdx + 2, f.y + 3, 3, 4, room.light); R(tdx + 3, f.y + 4, 1, 1, '#ffffff');
      R(tdx + 1, f.y + 1, 2, 2, '#ff8fa3'); R(tdx + 3, f.y + 0, 2, 2, '#ffd36b'); R(tdx + 3, f.y + 2, 1, 1, C.leaf);
      R(tdx + 8, f.y + 5, 6, 1, '#3f7dd8'); R(tdx + 9, f.y + 4, 5, 1, '#e0475a'); R(tdx + 9, f.y + 3, 4, 1, '#f2c14e');
      R(tdx + 17, f.y + 4, 3, 2, '#e0475a'); R(tdx + 18, f.y + 3, 1, 1, C.leaf);
    } });
    // 선생님 자리: 교탁 옆(구석 소품과 겹치지 않는 쪽)
    const tright = tdx + 22 + 7;
    r.tpos = { x: tright + 6 > f.x + f.w - 17 ? tdx - 7 : tright, y: f.y + 18 };
    L.obst.push({ x: r.tpos.x - 4, y: r.tpos.y - 4, w: 8, h: 5 });

    // 학생 책상(3열)
    const cols = Math.max(2, Math.floor((f.w - 40) / 26)), rows = Math.max(1, Math.floor((f.h - 26) / 21));
    const gx = f.x + Math.round((f.w - cols * 26) / 2) + 6, gy = f.y + 22;
    r.seats = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = gx + i * 26, y = gy + j * 21;
      if (Math.abs(x + 7 - e.x) < 22 && Math.abs(y + 6 - e.y) < 24) continue;
      const seed = r.i * 13 + j * 5 + i;
      L.things.push({ y: y + 16, fn: () => desk(x, y, 14, 6, true, seed, room) });
      L.obst.push({ x, y: y + 1, w: 14, h: 15 });
      r.seats.push({ x: x + 7, y: y + 18 });
    }
  }

  // 진로카페: 카운터와 커피 머신, 작은 탁자 / 위클래스: 소파·낮은 탁자·쿠션
  function specialFurniture(r, L, e) {
    const room = r.room, f = r.floor;
    r.seats = [];
    if (room.key === 'cafe') {
      const cw = 40, cx = Math.round(f.x + f.w / 2 - cw / 2), cy = f.y + 20;
      r.counter = { x: cx, y: cy, w: cw };
      r.machine = { x: cx + 4, y: cy - 7 };
      r.keepClear = [{ x: cx - 4, y: cy - 22, w: cw + 8, h: 34 }];
      L.obst.push({ x: cx, y: cy, w: cw, h: 10 });
      L.things.push({ y: cy + 11, fn: () => {
        // 카운터
        R(cx, cy + 8, cw, 1, C.shadow);
        R(cx, cy, cw, 8, '#8d5a33'); R(cx, cy, cw, 1.5, '#c98d5a'); R(cx, cy + 1.5, cw, 0.5, '#6b4228');
        for (let x = cx + 3; x < cx + cw - 2; x += 6) R(x, cy + 3, 0.5, 4.5, '#6b4228');
        // 커피 머신
        const mx = cx + 4, my = cy - 7;
        R(mx - 0.5, my - 0.5, 11, 8, C.out); R(mx, my, 10, 7, '#c9ccd6'); R(mx, my, 10, 1, '#ffffff');
        R(mx + 1, my + 2, 3, 2, '#3a3346'); R(mx + 2, my + 2.5, 1, 1, '#ff6f91');
        R(mx + 6, my + 3, 2, 2, '#7a7f8e'); R(mx + 6.5, my + 5, 1, 1.5, '#3a3346');
        R(mx + 5.5, my + 6.5, 3, 0.5, '#ffffff');
        // 잔과 시럽, 쿠키
        R(cx + 17, cy - 3, 4, 3, '#ffffff'); R(cx + 17, cy - 3, 4, 0.5, '#6b4228'); R(cx + 21, cy - 2, 1, 1.5, '#ffffff');
        R(cx + 24, cy - 3, 4, 3, room.light); R(cx + 24, cy - 3, 4, 0.5, '#6b4228');
        R(cx + 31, cy - 5, 2, 5, '#e0a93a'); R(cx + 31, cy - 6, 2, 1, '#e0475a'); R(cx + 34, cy - 5, 2, 5, '#9b6bd3'); R(cx + 34, cy - 6, 2, 1, '#ffffff');
        R(cx + 13, cy - 1.5, 2.5, 1.5, '#c98d5a'); R(cx + 13.5, cy - 1, 0.5, 0.5, '#6b4228');
      } });
      // 바리스타는 카운터 안쪽(머신 옆)에 선다
      r.tpos = { x: cx + 18, y: cy - 1 };
      // 작은 탁자 두 개와 의자
      const tables = [{ x: f.x + 10, y: f.y + f.h - 26 }, { x: f.x + f.w - 26, y: f.y + 34 }]
        .filter((t) => Math.hypot(t.x + 8 - e.x, t.y + 6 - e.y) > 22);
      for (const t of tables) {
        L.obst.push({ x: t.x, y: t.y + 2, w: 16, h: 9 });
        L.things.push({ y: t.y + 11, fn: () => {
          R(t.x + 1, t.y + 11, 14, 1, C.shadow);
          R(t.x + 7, t.y + 5, 2, 6, C.leg); R(t.x + 4, t.y + 10, 8, 1, C.leg);
          R(t.x, t.y + 2, 16, 4, '#ffffff'); R(t.x + 1, t.y + 1, 14, 1, '#ffffff'); R(t.x, t.y + 5, 16, 1, '#d8d2c4');
          R(t.x + 3, t.y + 1.5, 3, 2, room.light); R(t.x + 3, t.y + 1.5, 3, 0.5, '#6b4228');
          R(t.x - 4, t.y + 6, 3, 3, room.color); R(t.x - 3.5, t.y + 9, 0.5, 2, C.leg); R(t.x + 17, t.y + 6, 3, 3, room.color); R(t.x + 19, t.y + 9, 0.5, 2, C.leg);
        } });
      }
    } else {
      // 소파(벽 쪽)와 낮은 탁자, 쿠션
      const sw = 34, sx = Math.round(f.x + f.w - sw - 8), sy = f.y + 6;
      r.keepClear = [{ x: sx - 14, y: sy - 4, w: sw + 18, h: 40 }];
      L.obst.push({ x: sx, y: sy + 2, w: sw, h: 10 });
      L.things.push({ y: sy + 12, fn: () => {
        R(sx + 1, sy + 12, sw - 2, 1, C.shadow);
        R(sx, sy, sw, 6, room.color); R(sx, sy, sw, 1, room.light);
        R(sx - 1, sy + 4, 4, 8, room.dark); R(sx + sw - 3, sy + 4, 4, 8, room.dark);
        R(sx + 3, sy + 6, sw - 6, 5, room.light); R(sx + sw / 2, sy + 6, 0.5, 5, room.color);
        R(sx + 5, sy + 2, 5, 4, '#ffd36b'); R(sx + 6, sy + 3, 1, 1, '#ffffff'); R(sx + sw - 10, sy + 2, 5, 4, '#a8dcef');
        R(sx + 1, sy + 11, 1, 1.5, C.leg); R(sx + sw - 2, sy + 11, 1, 1.5, C.leg);
      } });
      const tx = sx + 8, ty = sy + 20;
      L.obst.push({ x: tx, y: ty, w: 18, h: 6 });
      L.things.push({ y: ty + 6, fn: () => {
        R(tx + 1, ty + 6, 16, 1, C.shadow);
        R(tx, ty, 18, 4, '#c98d5a'); R(tx, ty, 18, 0.5, '#e8b98a'); R(tx + 1, ty + 4, 1, 2, C.leg); R(tx + 16, ty + 4, 1, 2, C.leg);
        // 휴지·화분·차
        R(tx + 2, ty - 2, 4, 2.5, '#ffffff'); R(tx + 3.5, ty - 3, 1, 1, '#ffffff');
        R(tx + 8, ty - 2, 3, 2.5, '#ffffff'); R(tx + 8, ty - 2, 3, 0.5, '#c98d5a');
        R(tx + 13, ty - 1, 3, 2, C.pot); R(tx + 13, ty - 3, 3, 2, C.leaf); R(tx + 14, ty - 4, 1, 1, '#ff8fa3');
      } });
      // 마음 날씨 게시판(벽 쪽 아래) 대신 바닥 쿠션 두 개
      const cs = [{ x: f.x + 8, y: f.y + f.h - 14, c: '#b9a5f0' }, { x: f.x + f.w - 20, y: f.y + f.h - 14, c: '#ffd36b' }]
        .filter((q) => Math.hypot(q.x + 6 - e.x, q.y + 4 - e.y) > 18);
      for (const q of cs) L.things.push({ y: q.y + 6, fn: () => {
        R(q.x + 1, q.y + 6, 10, 1, C.shadow); R(q.x, q.y + 1, 12, 5, q.c); R(q.x + 1, q.y, 10, 1, q.c);
        R(q.x + 2, q.y + 1, 3, 1, mix(q.c, '#ffffff', 0.5)); R(q.x + 5.5, q.y + 3, 1, 1, mix(q.c, '#000000', 0.25));
      } });
      // 상담 선생님은 소파 옆에 선다
      r.tpos = { x: sx - 7, y: sy + 14 };
    }
    L.obst.push({ x: r.tpos.x - 4, y: r.tpos.y - 4, w: 8, h: 5 });
  }

  function roomWalls(r, L) {
    const room = r.room, d = r.door;
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
      // 복도 쪽 표지판과 게시판
      // 표지판은 같은 크기로 한 번씩: 1반 앞 '뛰지 맙시다', 2반 앞 '정숙', 3반 앞은 게시판
      if (r.i === 0) sign(r.x + 8, r.y + r.h - 12, 48, 11, '뛰지 맙시다');
      if (r.i === 1) sign(r.x + 8, r.y + r.h - 12, 48, 11, '정숙');
      if (r.i === 2) {
        // 복도 게시판: 가까이 가거나 누르면 진로 선생님께 메시지를 남긴다
        const nb = r.x + 8, by = r.y + r.h - 11;
        R(nb - 1, by - 1, 34, 10, C.out); R(nb, by, 32, 8, C.frame); R(nb + 1, by + 1, 30, 6, '#d9a86b');
        [['#ffffff', 2], ['#ffd36b', 8], [room.light, 14], ['#a8dcef', 20]].forEach(([c, ox], i) => {
          R(nb + ox, by + 2 + (i % 2), 5, 3, c); R(nb + ox + 2, by + 2 + (i % 2), 1, 1, '#e0475a');
        });
        // 편지 봉투
        R(nb + 26, by + 2, 5, 4, '#ffffff'); R(nb + 27, by + 3, 1, 1, '#e0475a'); R(nb + 29, by + 3, 1, 1, '#e0475a'); R(nb + 28, by + 4, 1, 1, '#e0475a');
        L.board = { x: nb - 1, y: by - 1, w: 34, h: 10, spot: { x: nb + 16, y: L.walkHall.y + 6 } };
      }
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
    let ac = null, master = null, noiseBuf = null;
    let on = load('pixelSchoolSound', localStorage) !== false;
    // 오디오는 누르거나 키를 친 순간(unlock)에만 만든다. 맥 사파리는 그 밖에서 만든 오디오를
    // 나중에 다시 켜 주지 않을 때가 있어서다. 그 전에 나는 효과음은 그냥 건너뛴다.
    function ctx(create) {
      if (!on) return null;
      if (!ac && !create) return null;
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        // 처음 버전(맥 사파리에서 소리가 나던 때)과 같은 단순한 연결: 음량 노드 하나 → 스피커.
        // 휴대폰 무음 모드는 브라우저 기본값대로 따른다(아이폰은 무음이면 소리 없음).
        ac = new AC();
        master = ac.createGain(); master.gain.value = 0.3;
        master.connect(ac.destination);
      }
      if (ac.state !== 'running') {
        const p = ac.resume();
        if (p && p.catch) p.catch(() => {});
      }
      return ac;
    }
    // 브라우저는 사용자가 누르거나 터치한 순간에만 소리를 켜 준다. 켜질 때까지 매번 다시 시도하고,
    // 사파리용으로 소리 없는 아주 짧은 버퍼를 한 번 재생한다.
    function unlock() {
      // 맥 사파리는 켜 둔 오디오를 나중에 스스로 멈출 때가 있어서, 누를 때마다 확인한다(켜져 있으면 아무것도 안 함)
      if (ac && ac.state === 'running') return;
      // 눌렀는데도 켜지지 않은 채 남은 오디오는 버리고, 이번 누름 안에서 새로 만든다
      if (ac && ac.state !== 'running' && ac.__tried && performance.now() - ac.__tried > 1000) { try { ac.close(); } catch (e) { /* 무시 */ } ac = null; noiseBuf = null; }
      const a = ctx(true); if (!a) return;
      if (a.state !== 'running' && !a.__tried) a.__tried = performance.now();
      try {
        const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource();
        s.buffer = b; s.connect(a.destination); s.start(0);
      } catch (e) { /* 무시 */ }
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
      o.connect(gn); gn.connect(master);
      o.start(t); o.stop(t + dur + 0.03);
    }
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
      s.connect(f); f.connect(gn); gn.connect(master);
      s.start(t); s.stop(t + dur + 0.02);
    }
    const seq = (notes, step, dur, type, vol, start) => notes.forEach((f, i) => f && tone(f, (start || 0) + i * step, dur, type, vol));
    return {
      get on() { return on; },
      set(v) { on = v; save('pixelSchoolSound', v, localStorage); if (v) unlock(); },
      unlock,
      get state() { return ac ? ac.state : 'none'; },
      step(alt) { noise(0, 0.045, 0.28, alt ? 1400 : 1000, 2.5); tone(alt ? 150 : 130, 0, 0.035, 'triangle', 0.25); },
      bump() { tone(110, 0, 0.09, 'square', 0.25, 0.6); },
      move() { tone(988, 0, 0.045, 'square', 0.28); },
      select() { seq([523, 659, 784, 1047], 0.055, 0.09, 'square', 0.32); },
      chime() { tone(784, 0, 0.08, 'triangle', 0.5); tone(1175, 0.08, 0.16, 'triangle', 0.45); },
      type() { tone(1320 + Math.random() * 120, 0, 0.018, 'square', 0.08); },
      enter() { noise(0, 0.16, 0.35, 2200, 0.8); seq([392, 523, 659, 784, 1047], 0.06, 0.1, 'square', 0.32, 0.1); tone(1568, 0.42, 0.25, 'triangle', 0.3); },
      exit() { seq([784, 659, 523, 392], 0.065, 0.1, 'square', 0.28); noise(0.27, 0.14, 0.28, 1800, 0.8); },
      toggle() { tone(660, 0, 0.06, 'square', 0.3); tone(880, 0.06, 0.08, 'square', 0.3); },
      door() { noise(0, 0.12, 0.25, 2600, 0.9); tone(523, 0.05, 0.07, 'triangle', 0.3); tone(659, 0.11, 0.09, 'triangle', 0.3); },
      pickup() { seq([1047, 1319, 1568, 2093], 0.045, 0.08, 'square', 0.3); },
      warn() { tone(880, 0, 0.12, 'square', 0.3); tone(698, 0.14, 0.18, 'square', 0.3); },
      party() { seq([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.08, 0.12, 'square', 0.3); seq([262, 0, 392, 0, 262, 0, 392, 523], 0.08, 0.14, 'triangle', 0.35); },
    };
  })();


  /* ───────── 화면·상태 ───────── */
  const stage = $('#stage'), screen = $('#screen'), sctx = screen.getContext('2d');
  const buf = document.createElement('canvas'), g = buf.getContext('2d');
  const labels = $('#labels');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  let L = null, kid = null, mode = 'menu';
  const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, path: [], lastStep: -1, quietRoom: null, room: null, runFor: 0, runBan: 0 };
  const keys = new Set();
  const padDirs = new Set();
  let dlg = null, armed = null, hoverRoom = null, scale = 2, k = 1, leaving = false, bumpAt = 0, party = 0, clock = 0;
  const found = new Set(load('pixelSchoolStars', localStorage) || []);
  const said = new Set();

  function choosePortrait() { return innerWidth < 700 && innerHeight > innerWidth * 1.05; }

  function setLayout(portrait) {
    const prevRoom = L ? nearestDoorRoom() : null;
    L = buildLayout(portrait);
    buf.width = L.W; buf.height = L.H;
    buildGrid();
    placeStickers();
    labels.innerHTML = '';
    const put = (cls, text, x, y, w, h) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      Object.assign(el.style, { left: (x / L.W) * 100 + '%', top: (y / L.H) * 100 + '%', width: (w / L.W) * 100 + '%', height: (h / L.H) * 100 + '%' });
      labels.appendChild(el);
    };
    for (const r of L.rooms) put('chalk', r.room.short, r.board.x, r.board.y, r.board.w, r.board.h - 1);
    // 진로카페·위클래스 선생님 머리 위 말풍선
    for (const r of L.rooms) {
      if (!r.room.special) continue;
      const el = document.createElement('div');
      el.className = 'bubble ' + r.room.key;
      el.hidden = true;
      Object.assign(el.style, { left: (r.tpos.x / L.W) * 100 + '%', top: ((r.tpos.y - 19) / L.H) * 100 + '%' });
      labels.appendChild(el);
      r.bubbleEl = el;
    }
    for (const sg of L.signs) put('sign' + (sg.dark ? ' dark' : ''), sg.text, sg.x, sg.y, sg.w, sg.h - 1);
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
    armed = 'door' + i;
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
    k = Math.max(1, Math.ceil(scale * (devicePixelRatio || 1)));
    screen.width = L.W * k; screen.height = L.H * k;
    stage.style.setProperty('--chalk', Math.max(9, Math.min(22, Math.round(scale * 5.4))) + 'px');
    stage.style.setProperty('--sign', Math.max(8, Math.min(18, Math.round(scale * 4.6))) + 'px');
    render();
  }

  /* ───────── 걷는 곳·부딪히는 것 ───────── */
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const hits = (x, y, w, h, o) => x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y;
  function free(x, y) {
    const pts = [[x - 4, y - 3], [x + 3, y - 3], [x - 4, y], [x + 3, y]];
    if (!pts.every(([a, b]) => L.walk.some((r) => inRect(a, b, r)))) return false;
    return !L.obst.some((o) => hits(x - 4, y - 3, 8, 3, o));
  }
  // 길찾기용 4픽셀 칸
  const CELL = 4;
  function buildGrid() {
    L.gw = Math.ceil(L.W / CELL); L.gh = Math.ceil(L.H / CELL);
    L.grid = new Uint8Array(L.gw * L.gh);
    for (let j = 0; j < L.gh; j++) for (let i = 0; i < L.gw; i++) L.grid[j * L.gw + i] = free(i * CELL + 2, j * CELL + 2) ? 1 : 0;
    // 복도에서 닿지 않는 작은 틈(가구 사이 구석)은 막힌 칸으로 친다
    const W = L.gw, seen = new Uint8Array(W * L.gh);
    const h = L.walkHall, s0 = Math.floor((h.y + h.h / 2) / CELL) * W + Math.floor((h.x + h.w / 2) / CELL);
    const q = [s0]; seen[s0] = 1;
    for (let k = 0; k < q.length; k++) {
      const c = q[k], ci = c % W;
      for (const n of [c + 1, c - 1, c + W, c - W]) {
        if (n < 0 || n >= seen.length || seen[n] || !L.grid[n]) continue;
        if ((n === c + 1 && ci === W - 1) || (n === c - 1 && ci === 0)) continue;
        seen[n] = 1; q.push(n);
      }
    }
    for (let i = 0; i < seen.length; i++) if (!seen[i]) L.grid[i] = 0;
  }
  const cellOf = (x, y) => [Math.max(0, Math.min(L.gw - 1, Math.floor(x / CELL))), Math.max(0, Math.min(L.gh - 1, Math.floor(y / CELL)))];
  // 가장 가까운 걸을 수 있는 칸. 교실 안을 가리켰으면 그 교실 안에서만 찾는다(벽 너머 복도로 새지 않게)
  function nearestOpen(x, y) {
    const [ci, cj] = cellOf(x, y);
    const room = L.rooms.find((r) => inRect(x, y, r));
    const ok = (px, py) => !room || inRect(px, py, { x: room.x, y: room.y, w: room.w, h: room.h + 4 }) || inRect(px, py, room.door.walk);
    for (let rad = 0; rad < 14; rad++) {
      let best = null, bd = 1e9;
      for (let j = cj - rad; j <= cj + rad; j++) for (let i = ci - rad; i <= ci + rad; i++) {
        if (i < 0 || j < 0 || i >= L.gw || j >= L.gh || !L.grid[j * L.gw + i] || !ok(i * CELL + 2, j * CELL + 2)) continue;
        const dd = Math.hypot(i * CELL + 2 - x, j * CELL + 2 - y);
        if (dd < bd) { bd = dd; best = [i, j]; }
      }
      if (best) return best;
    }
    return null;
  }
  function lineFree(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
    for (let i = 1; i <= n; i++) { const t = i / n; if (!free(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
    return true;
  }
  function findPath(tx, ty) {
    const goal = nearestOpen(tx, ty), startC = nearestOpen(P.x, P.y);
    if (!goal || !startC) return null;
    const W = L.gw, sIdx = startC[1] * W + startC[0], gIdx = goal[1] * W + goal[0];
    const prev = new Int32Array(W * L.gh).fill(-1);
    prev[sIdx] = sIdx;
    const q = [sIdx];
    for (let h = 0; h < q.length && prev[gIdx] < 0; h++) {
      const c = q[h], ci = c % W, cj = (c - ci) / W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= W || nj >= L.gh) continue;
        const n = nj * W + ni;
        if (prev[n] >= 0 || !L.grid[n]) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[gIdx] < 0) return null;
    const cells = [];
    for (let c = gIdx; c !== sIdx; c = prev[c]) cells.push({ x: (c % W) * CELL + 2, y: Math.floor(c / W) * CELL + 2 });
    cells.reverse();
    const exact = free(tx, ty) ? { x: tx, y: ty } : null;
    if (exact) cells.push(exact);
    // 곧게 갈 수 있는 칸은 건너뛴다
    const out = [];
    let cx = P.x, cy = P.y, i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !lineFree(cx, cy, cells[j].x, cells[j].y)) j--;
      out.push(cells[j]); cx = cells[j].x; cy = cells[j].y; i = j + 1;
    }
    return out;
  }
  function walkTo(x, y, quietRoom) {
    const p = findPath(x, y);
    P.path = p || [];
    P.quietRoom = quietRoom == null ? null : quietRoom;
  }

  function tryMove(dx, dy) {
    let moved = false;
    if (dx && free(P.x + dx, P.y)) { P.x += dx; moved = true; }
    if (dy && free(P.x, P.y + dy)) { P.y += dy; moved = true; }
    if (moved) return true;
    // 문 가까이에서 비껴 서 있으면 문 가운데로 당겨 준다(교실 안에서 나갈 때도)
    for (const r of L.rooms) {
      const d = r.door, step = Math.abs(dx || dy);
      if ((d.side === 'S' || d.side === 'N') && dy && !dx) {
        if (Math.abs(P.x - d.cx) < 13 && inRect(P.x, P.y, d.zone)) {
          const nx = P.x + Math.sign(d.cx - P.x) * Math.min(step, Math.abs(d.cx - P.x));
          if (free(nx, P.y)) { P.x = nx; return true; }
        }
      }
      if ((d.side === 'E' || d.side === 'W') && dx && !dy) {
        const cy = d.entry.y;
        if (Math.abs(P.y - cy) < 12 && inRect(P.x, P.y, d.zone)) {
          const ny = P.y + Math.sign(cy - P.y) * Math.min(step, Math.abs(cy - P.y));
          if (free(P.x, ny)) { P.y = ny; return true; }
        }
      }
    }
    return false;
  }
  const roomOfPoint = (x, y) => L.rooms.find((r) => inRect(x, y, r.walkFloor)) || null;

  /* ───────── 별 스티커(숨은 재미) ───────── */
  function placeStickers() {
    // 화분·책장 같은 구석 소품 그림에 가려지지 않는 자리만 쓴다
    const covered = (x, y) => L.rooms.some((r) => r.corners.slice(0, (PROPS[r.room.icon] || ['plant']).length)
      .some((c) => x > c.x - 4 && x < c.x + 18 && y > c.y - 2 && y < c.y + 24));
    // area 안(그 교실·복도)에서만 고른다
    const spot = (x, y, area) => {
      for (let k = 0; k < 40; k++) {
        const tx = x + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 3 * (x < L.W / 2 ? -1 : 1);
        const c = nearestOpen(tx, y);
        const px = c && c[0] * CELL + 2, py = c && c[1] * CELL + 2;
        if (c && (!area || inRect(px, py, area)) && !covered(px, py)) return { x: px, y: py };
      }
      const c = nearestOpen(x, y); return c ? { x: c[0] * CELL + 2, y: c[1] * CELL + 2 } : { x, y };
    };
    const r4 = L.rooms[3], r6 = L.rooms[5];
    L.stickers = [
      { id: 'hall', ...(L.portrait ? spot(L.walkHall.x + L.walkHall.w - 3, L.walkHall.y + 6, L.walkHall) : spot(L.walkHall.x + L.walkHall.w - 3, L.walkHall.y + L.walkHall.h - 2, L.walkHall)) },
      { id: 'book', ...spot(r4.walkFloor.x + 2, r4.walkFloor.y + r4.walkFloor.h - 1, r4.walkFloor) },
      { id: 'matrix', ...spot(r6.walkFloor.x + r6.walkFloor.w - 2, r6.walkFloor.y + 2, r6.walkFloor) },
    ];
  }

  /* ───────── 움직임 ───────── */
  const SPEED = 62;
  function updateBubbles() {
    for (const r of L.rooms) {
      if (!r.bubbleEl) continue;
      const sp = specialOf(r);
      const near = mode === 'play' && !(dlg && dlg.r === r) && (roomOfPoint(P.x, P.y) === r || Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y) < 70);
      if (near) {
        const text = sp.bubble[Math.floor(clock / 4) % sp.bubble.length];
        if (r.bubbleEl.textContent !== text) r.bubbleEl.textContent = text;
      }
      if (r.bubbleEl.hidden === near) r.bubbleEl.hidden = !near;
    }
  }
  function update(dt) {
    updateBubbles();
    if (party > 0) party -= dt;
    if (mode !== 'play' || leaving || memoOpen) { P.moving = false; return; }
    let dx = 0, dy = 0;
    const has = (n) => keys.has(n) || padDirs.has(n);
    if (!dlg) {
      if (has('left')) dx -= 1;
      if (has('right')) dx += 1;
      if (has('up')) dy -= 1;
      if (has('down')) dy += 1;
    }
    const running = keys.has('run') && P.runBan <= 0;
    if (P.runBan > 0) P.runBan -= dt;
    P.moving = false;
    if (dx || dy) {
      P.path = []; P.quietRoom = null;
      const s = SPEED * (running ? 1.8 : 1) * dt / (dx && dy ? Math.SQRT2 : 1);
      if (tryMove(dx * s, dy * s)) P.moving = true;
      else if (clock - bumpAt > 0.4) { bumpAt = clock; SFX.bump(); }
      P.dir = dx && !dy ? (dx < 0 ? 'left' : 'right') : dy ? (dy < 0 ? 'up' : 'down') : P.dir;
    } else if (P.path.length && !dlg) {
      const t = P.path[0];
      const vx = t.x - P.x, vy = t.y - P.y, dist = Math.hypot(vx, vy), s = SPEED * dt;
      if (dist <= s) { P.x = t.x; P.y = t.y; P.path.shift(); }
      else { P.x += (vx / dist) * s; P.y += (vy / dist) * s; }
      if (dist > 0.5) P.dir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      P.moving = true;
      if (!P.path.length && P.onArrive) { const f = P.onArrive; P.onArrive = null; f(); }
    }
    P.anim = P.moving ? P.anim + dt * (running && (dx || dy) ? 1.6 : 1) : 0;
    const stepIdx = P.moving ? Math.floor(P.anim * 7 / 2) : -1;
    if (stepIdx !== P.lastStep && stepIdx >= 0) SFX.step(stepIdx % 2);
    P.lastStep = stepIdx;

    // 복도에서 뛰면 선생님이 말린다
    const inHall = inRect(P.x, P.y, L.walkHall);
    if (running && P.moving && inHall) {
      P.runFor += dt;
      if (P.runFor > 0.9) { P.runFor = 0; P.runBan = 2.5; SFX.warn(); toast('김 선생님', '복도에서는 뛰지 맙시다! 천천히 걸어요.'); }
    } else P.runFor = 0;

    // 교실에 들고 날 때 문소리·퇴실 소리
    const nowRoom = roomOfPoint(P.x, P.y);
    if (nowRoom !== P.room) {
      if (nowRoom && !P.room) SFX.door();
      if (!nowRoom && P.room && inHall) SFX.exit();
      if (!nowRoom && !inHall) { /* 문턱 */ } else P.room = nowRoom;
    }
    // 계단 끝
    // 계단 가까이 가면 한마디(멀어졌다 다시 오면 또)
    const stairGap = !inRect(P.x, P.y, L.hall) ? 99 : L.portrait ? P.y - L.walkHall.y : P.x - L.walkHall.x;
    if (stairGap < 8 && !said.has('stairs')) { said.add('stairs'); SFX.bump(); toast(kid ? kid.name : '나', '아아, 계단으로는 갈 수 없는 모양이다…'); }
    else if (stairGap > 24) said.delete('stairs');

    // 별 스티커 줍기
    for (const st of L.stickers) {
      if (found.has(st.id) || Math.hypot(P.x - st.x, P.y - st.y) > 8) continue;
      found.add(st.id);
      save('pixelSchoolStars', [...found], localStorage);
      SFX.pickup();
      if (found.size >= L.stickers.length) {
        party = 6; SFX.party();
        toast('축하해요!', '반짝이는 별 스티커 3개를 모두 찾았어요. 오늘의 명예 탐험가!');
      } else toast('반짝!', `별 스티커를 주웠어요 (${found.size}/${L.stickers.length})`);
      paintStars();
    }

    if (!dlg) checkMeet();
  }

  // 대화창을 띄울 곳: 문으로 들어설 때, 선생님·학생 가까이 갔을 때
  function checkMeet() {
    let hit = null;
    if (L.board && Math.hypot(P.x - L.board.spot.x, P.y - L.board.spot.y) < 14) hit = { id: 'board', who: 'board' };
    for (const r of L.rooms) {
      if (hit) break;
      const d = r.door;
      if (inRect(P.x, P.y, d.zone) && P.dir === d.inward && P.moving && P.quietRoom !== r.i) { hit = { id: 'door' + r.i, r, who: 'door' }; break; }
      if (Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y) < 17) { hit = { id: 't' + r.i, r, who: 'teacher' }; break; }
      if (r.npcSeat && r.npc && Math.hypot(P.x - r.npcSeat.x, P.y - r.npcSeat.y) < 16) { hit = { id: 's' + r.i, r, who: 'student' }; break; }
    }
    if (hit && armed !== hit.id) {
      armed = hit.id;
      // 걷던 길은 기억해 두었다가 '교실 둘러보기'를 누르면 이어 간다
      P.resume = P.path.length ? { path: P.path, onArrive: P.onArrive } : null;
      P.path = []; P.onArrive = null;
      if (hit.who === 'board') openMemo(); else openDialog(hit.r, hit.who);
    }
    if (!hit && armed === 'board') {
      if (Math.hypot(P.x - L.board.spot.x, P.y - L.board.spot.y) > 20) armed = null;
    } else if (!hit && armed) {
      // 멀어지면 다시 뜰 수 있게
      const r = L.rooms[+armed.slice(armed.startsWith('door') ? 4 : 1)];
      const far = armed.startsWith('door') ? !inRect(P.x, P.y, r.door.zone)
        : armed[0] === 't' ? Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y) > 22
          : Math.hypot(P.x - r.npcSeat.x, P.y - r.npcSeat.y) > 21;
      if (far) armed = null;
    }
  }

  /* ───────── 그리기 ───────── */
  const rnd = Math.round;
  function drawSprite(cv, x, y) { g.drawImage(cv, rnd(x - SPR_W / 2), rnd(y - cv.foot)); }
  function shadowAt(x, y, w) { g.fillStyle = C.shadow; g.fillRect(rnd(x - w / 2), rnd(y - 2), w, 2); g.fillRect(rnd(x - w / 2 + 1), rnd(y - 3), w - 2, 1); }
  function blinking(seed) { return !reduceMotion && ((clock + seed * 1.7) % 4.2) < 0.15; }
  const hop = (i) => (party > 0 && !reduceMotion && Math.floor(clock * 6 + i) % 2 ? -2 : 0);

  function render() {
    if (!L) return;
    useCtx(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(L.bg, 0, 0);
    // 앞뒤 순서대로: 가구·소품·사람·별 스티커
    const list = L.things.slice();
    for (const st of L.stickers) {
      if (found.has(st.id)) continue;
      list.push({ y: st.y + 1, fn: () => {
        const tw = Math.floor(clock * 2 + st.x) % 4 === 0;
        const x = st.x, y = st.y - 3;
        g.fillStyle = C.out; g.fillRect(x - 3, y - 1, 7, 3); g.fillRect(x - 1, y - 3, 3, 7);
        g.fillStyle = '#ffd36b'; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); g.fillRect(x - 1, y - 1, 3, 3);
        g.fillStyle = '#fff6c8'; g.fillRect(x - 1, y - 1, 1, 1);
        if (tw && !reduceMotion) { g.fillStyle = '#ffffff'; g.fillRect(x - 4, y - 3, 1, 1); g.fillRect(x + 4, y - 3, 1, 1); g.fillRect(x + 3, y + 3, 1, 1); g.fillRect(x - 3, y + 3, 1, 1); }
      } });
    }
    const others = KIDS.filter((x) => x !== kid);
    L.rooms.forEach((r, i) => {
      const t = r.teacher, tp = r.tpos;
      let tdir = 'down';
      if (dlg && dlg.r === r || Math.hypot(P.x - tp.x, P.y - tp.y) < 40) {
        const vx = P.x - tp.x, vy = P.y - tp.y;
        tdir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      }
      list.push({ y: tp.y, fn: () => { shadowAt(tp.x, tp.y, 10); drawSprite(personSprite(t, tdir, 'idle', blinking(i + 3)), tp.x, tp.y + hop(i)); } });
      const o = others[i];
      r.npc = o || null;
      if (o && r.npcSeat) {
        const s = r.npcSeat;
        const near = Math.hypot(P.x - s.x, P.y - s.y) < 30;
        let sd = 'up';
        if (near) { const vx = P.x - s.x, vy = P.y - s.y; sd = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down'); }
        list.push({ y: s.y, fn: () => { shadowAt(s.x, s.y, 10); drawSprite(personSprite(o, sd, 'idle', near && blinking(i)), s.x, s.y + hop(i + 1)); } });
      }
    });
    if (kid && mode === 'play') {
      const frames = P.dir === 'left' || P.dir === 'right' ? ['a', 'idle'] : ['a', 'idle', 'b', 'idle'];
      const fr = P.moving ? frames[Math.floor(P.anim * 7) % frames.length] : 'idle';
      list.push({ y: P.y + 0.1, fn: () => {
        shadowAt(P.x, P.y, 11);
        drawSprite(personSprite(kid, P.dir, fr, !P.moving && blinking(0)), P.x, P.y - (P.moving && fr !== 'idle' ? 1 : 0) + hop(9));
      } });
    }
    list.sort((a, b) => a.y - b.y).forEach((it) => it.fn());
    // 커피 머신 김
    for (const r of L.rooms) {
      if (!r.machine || reduceMotion) continue;
      for (let i = 0; i < 3; i++) {
        const t = (clock * 0.8 + i / 3) % 1;
        g.fillStyle = `rgba(255,255,255,${(0.85 - t * 0.8).toFixed(2)})`;
        g.fillRect(Math.round(r.machine.x + 6.5 + Math.sin((clock + i) * 3) * 1.2), Math.round(r.machine.y - 1 - t * 9), 1, 1);
      }
    }

    const hi = hoverRoom != null ? L.rooms[hoverRoom] : dlg && dlg.r;
    if (hi) {
      const f = hi.floor, on = reduceMotion || Math.floor(clock * 4) % 2 === 0;
      g.fillStyle = on ? hi.room.color : '#ffffff';
      for (let x = f.x; x < f.x + f.w; x += 4) { g.fillRect(x, f.y, 2, 1); g.fillRect(x + 2, f.y + f.h - 1, 2, 1); }
      for (let y = f.y; y < f.y + f.h; y += 4) { g.fillRect(f.x, y + 2, 1, 2); g.fillRect(f.x + f.w - 1, y, 1, 2); }
    }
    if (mode === 'play' && !dlg) {
      for (const r of L.rooms) {
        const d = r.door;
        if ((Math.hypot(P.x - d.front.x, P.y - d.front.y) < 30 && !roomOfPoint(P.x, P.y)) || hoverRoom === r.i) arrow(d, r);
      }
    }
    if (party > 0 && !reduceMotion) confetti();
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(buf, 0, 0, screen.width, screen.height);
  }
  function confetti() {
    const cs = ['#ffd36b', '#ff6f91', '#7fc6e8', '#74b46e', '#b9a5f0', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const x = (i * 53.3 + Math.sin(clock * 2 + i) * 6) % L.W;
      const y = ((i * 37.7) + clock * (30 + (i % 5) * 8)) % L.H;
      g.fillStyle = cs[i % cs.length];
      g.fillRect(Math.floor(x), Math.floor(y), i % 3 ? 2 : 1, i % 2 ? 1 : 2);
    }
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

  /* ───────── 말풍선(짧은 알림) ───────── */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(who, text) {
    toastEl.replaceChildren();
    const b = document.createElement('b'); b.textContent = who;
    toastEl.append(b, document.createTextNode(' ' + text));
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }
  const starsEl = $('#stars');
  function paintStars() {
    starsEl.hidden = found.size === 0;
    starsEl.textContent = '★ ' + found.size + '/3';
    starsEl.title = '찾은 별 스티커';
  }

  /* ───────── 대화창 ───────── */
  const dlgEl = $('#dialog');
  let typer = 0;
  function openDialog(r, who) {
    who = who || 'door';
    dlg = { r, who };
    const room = r.room, t = r.teacher, sp = specialOf(r);
    SFX.chime();
    dlgEl.style.setProperty('--room', room.color);
    $('#dlg-go').firstChild.textContent = sp ? '▶ 이야기 더 듣기 ' : '▶ 들어가기 ';
    $('#dlg-num').textContent = sp ? room.badge : room.n + '반';
    $('#dlg-title').textContent = room.title;
    $('#dlg-desc').textContent = room.desc;
    $('#dlg-upd').textContent = room.el && room.el.dataset.upd ? '· ' + room.el.dataset.upd : '';
    const me = kid ? kid.name : '친구';
    let face = t, say;
    if (sp) say = `${t.name}: ${who === 'door' ? `어서 와요, ${me}! ` : ''}${specialTalk(sp)}`;
    else if (who === 'student' && r.npc) { face = r.npc; say = `${r.npc.name}: 안녕, ${me}! ${kidTalk(r.npc)} 여기 ${room.short} 사이트 같이 볼래?`; }
    else if (who === 'teacher') say = `${t.name}: 반가워요, ${me}! ${t.say}`;
    else say = `${t.name}: 어서 와요, ${me}! 여기는 ${room.n}반 ${room.short} 교실이에요.`;
    $('#dlg-face').replaceChildren(faceCanvas(face));
    $('#dlg-no').firstChild.textContent = sp ? '닫기 ' : '교실 둘러보기 ';
    const el = $('#dlg-say');
    clearInterval(typer);
    if (reduceMotion) el.textContent = say;
    else {
      let n = 0; el.textContent = '';
      typer = setInterval(() => {
        n++; el.textContent = say.slice(0, n);
        if (n % 2 === 0 && say[n - 1] !== ' ') SFX.type();
        if (n >= say.length) clearInterval(typer);
      }, 28);
    }
    dlgEl.hidden = false;
  }
  // 진로카페·위클래스 선생님 말: 처음엔 첫 줄(위클래스는 4층 안내), 그다음은 무작위
  function specialTalk(sp) {
    const said = sp.said || (sp.said = []);
    let line = said.length === 0 ? sp.talk[0] : sp.talk[Math.floor(Math.random() * sp.talk.length)];
    if (said.length && line === said[said.length - 1]) line = sp.talk[(sp.talk.indexOf(line) + 1) % sp.talk.length];
    said.push(line);
    return line;
  }
  function faceCanvas(sp) {
    const src = personSprite(sp, 'down', 'idle', false);
    const c = document.createElement('canvas');
    c.width = 16; c.height = 14;
    c.getContext('2d').drawImage(src, 1, 1, 16, 14, 0, 0, 16, 14);
    return c;
  }
  function closeDialog(resume) {
    if (!dlg) return;
    dlg = null; dlgEl.hidden = true; clearInterval(typer);
    if (resume && P.resume) { P.path = P.resume.path; P.onArrive = P.resume.onArrive; }
    P.resume = null;
    stage.focus({ preventScroll: true });
  }
  function enter(r) {
    if (leaving) return;
    if (r.room.special) { openDialog(r, 'teacher'); return; } // 사이트가 없는 칸: Enter를 누르면 다음 이야기
    leaving = true;
    SFX.enter();
    save('pixelSchool', { kid: kid ? kid.id : null, room: r.i }, sessionStorage);
    $('#fade-text').textContent = `${r.room.n}반 ${r.room.short} 교실로 가는 중…`;
    $('#fade').hidden = false;
    setTimeout(() => { location.href = r.room.url; }, reduceMotion ? 120 : 560);
  }
  $('#dlg-go').addEventListener('click', () => dlg && enter(dlg.r));
  $('#dlg-no').addEventListener('click', () => closeDialog(true));

  /* ───────── 복도 게시판: 진로 선생님께 메시지 ───────── */
  const memoEl = $('#memo'), memoForm = $('#memo-form'), memoStatus = $('#memo-status'), memoSend = $('#memo-send');
  let memoOpen = false;
  function memoSay(text, err) { memoStatus.textContent = text; memoStatus.classList.toggle('err', !!err); }
  function openMemo() {
    if (memoOpen || !memoEl) return;
    closeDialog();
    memoOpen = true; keys.clear(); padDirs.clear();
    P.resume = P.path.length ? { path: P.path, onArrive: P.onArrive } : null;
    P.path = []; P.onArrive = null;
    SFX.chime();
    $('#memo-face').replaceChildren(faceCanvas(TEACHERS[1]));
    if (!memoForm.dataset.endpoint) memoSay('아직 메시지 받는 곳을 준비하고 있어요. 조금만 기다려 주세요.', true);
    else if (!memoStatus.classList.contains('err')) memoSay('');
    memoEl.hidden = false;
    memoForm.msg.focus({ preventScroll: true });
  }
  function closeMemo() {
    if (!memoOpen) return;
    memoOpen = false; memoEl.hidden = true;
    if (P.resume) { P.path = P.resume.path; P.onArrive = P.resume.onArrive; }
    P.resume = null;
    stage.focus({ preventScroll: true });
  }
  $('#memo-close').addEventListener('click', closeMemo);
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = memoForm.dataset.endpoint;
    const msg = memoForm.msg.value.trim(), who = memoForm.who.value.trim();
    if (!url) { memoSay('아직 메시지 받는 곳을 준비하고 있어요. 조금만 기다려 주세요.', true); return; }
    if (msg.length < 2) { memoSay('메시지를 두 글자 넘게 적어 주세요.', true); memoForm.msg.focus(); return; }
    const last = +(load('pixelSchoolMemoAt', localStorage) || 0);
    if (Date.now() - last < 30000) { memoSay('조금 전에 보냈어요. 30초 뒤에 다시 보내 주세요.', true); return; }
    memoSend.disabled = true; memoSay('보내는 중…');
    try {
      // 구글 Apps Script 웹 앱은 응답을 읽을 수 없게(no-cors) 보내는 것이 가장 확실하다
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ who, msg, kid: kid ? kid.name : '', website: memoForm.website.value }) });
      save('pixelSchoolMemoAt', Date.now(), localStorage);
      memoForm.msg.value = '';
      SFX.pickup();
      memoSay('보냈어요! 진로 선생님이 꼭 읽어 볼게요.');
    } catch (err) {
      memoSay('보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', true);
    } finally { memoSend.disabled = false; }
  });

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
    closeDialog();
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
  const unlockEvents = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  // 주소 끝에 ?sound 를 붙이면 누를 때마다 오디오 상태를 보여 준다(소리 문제 확인용)
  const soundDebug = /[?&]sound\b/.test(location.search);
  const unlockAudio = (e) => {
    SFX.unlock();
    if (soundDebug) setTimeout(() => toast('소리 점검', `${e.type} → ${SFX.state} · ${SFX.on ? '켬' : '끔'} · ${navigator.userAgent.match(/Version\/[\d.]+/) || ''}`), 150);
  };
  unlockEvents.forEach((t) => addEventListener(t, unlockAudio, true));


  /* ───────── 키보드 ───────── */
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konami = 0;
  function gameHasFocus() {
    const a = document.activeElement;
    return a === document.body || a === stage || (stage.contains(a) && !menu.contains(a));
  }
  function openByNumber(n) {
    const r = L.rooms[n - 1];
    if (!r) return;
    closeDialog();
    if (mode === 'play') { P.path = []; P.x = r.door.entry.x; P.y = r.door.entry.y; armed = 'door' + r.i; }
    enter(r);
  }
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (memoOpen) { if (e.key === 'Escape') { e.preventDefault(); closeMemo(); } return; }
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    // ↑↑↓↓←→←→BA
    const kk = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konami = kk === KONAMI[konami] ? konami + 1 : kk === KONAMI[0] ? 1 : 0;
    if (konami === KONAMI.length) { konami = 0; party = 7; SFX.party(); toast('다 같이', '쉬는 시간이다! 모두 신나게 콩콩!'); }
    if (/^[1-6]$/.test(e.key) && !leaving) { e.preventDefault(); openByNumber(+e.key); return; }
    if ((e.key === 'm' || e.key === 'M') && (gameHasFocus() || menu.contains(document.activeElement))) { SFX.set(!SFX.on); paintSound(); SFX.toggle(); return; }
    if (e.key === 'Shift') keys.add('run');
    if (mode !== 'play' || !gameHasFocus()) return;
    const dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      if (dlg) closeDialog();
      keys.add(dir);
      return;
    }
    const onButton = tag === 'BUTTON';
    if ((e.key === 'Enter' || e.key === ' ') && !onButton) {
      e.preventDefault();
      interact();
    } else if (e.key === 'Escape' && dlg) {
      e.preventDefault();
      closeDialog(true);
    }
  });
  addEventListener('keyup', (e) => { const dir = KEYMAP[e.key]; if (dir) keys.delete(dir); if (e.key === 'Shift') keys.delete('run'); });
  addEventListener('blur', () => { keys.clear(); padDirs.clear(); });
  document.addEventListener('visibilitychange', () => { keys.clear(); padDirs.clear(); });

  // Enter·A: 대화창이 떠 있으면 사이트로, 아니면 가까운 문·선생님·학생에게 말을 건다
  function interact() {
    if (dlg) { enter(dlg.r); return; }
    if (L.board && Math.hypot(P.x - L.board.spot.x, P.y - L.board.spot.y) < 20) { armed = 'board'; openMemo(); return; }
    let best = null, bd = 34;
    for (const r of L.rooms) {
      const cands = [[r.door.front, 'door'], [r.door.entry, 'door'], [r.tpos, 'teacher']];
      if (r.npcSeat && r.npc) cands.push([r.npcSeat, 'student']);
      for (const [p, who] of cands) {
        const dd = Math.hypot(P.x - p.x, P.y - p.y);
        if (dd < bd) { bd = dd; best = { r, who }; }
      }
    }
    if (!best) return;
    armed = (best.who === 'door' ? 'door' : best.who === 'teacher' ? 't' : 's') + best.r.i;
    openDialog(best.r, best.who);
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
    if (memoOpen) closeMemo();
    const b = L.board;
    if (b && x > b.x - 3 && x < b.x + b.w + 3 && y > b.y - 3 && y < b.y + b.h + 3) {
      if (dlg) closeDialog();
      armed = null;
      walkTo(b.spot.x, b.spot.y);
      P.onArrive = () => { if (!memoOpen) { armed = 'board'; openMemo(); } };
      return;
    }
    const r = roomAt(x, y);
    if (dlg) {
      if (r && r === dlg.r && y < r.y + r.F + 2) { enter(r); return; }
      closeDialog();
    }
    if (!r) { walkTo(x, y); return; }
    // 칠판·벽·문을 누르면 문으로 가서 대화창, 선생님·학생을 누르면 그 앞으로, 바닥은 그 자리로
    const onWall = y < r.y + r.F || inRect(x, y, r.door.gap);
    const nearT = Math.hypot(x - r.tpos.x, y - (r.tpos.y - 8)) < 11;
    const nearS = r.npcSeat && Math.hypot(x - r.npcSeat.x, y - (r.npcSeat.y - 8)) < 11;
    if (nearT || nearS) {
      const p = nearT ? r.tpos : r.npcSeat;
      armed = null;
      const spot = [[0, 8], [-11, 0], [11, 0], [0, -9], [-11, 6], [11, 6]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).find((q) => free(q.x, q.y)) || { x: p.x, y: p.y + 8 };
      walkTo(spot.x, spot.y, r.i);
      P.onArrive = () => { if (!dlg) { armed = (nearT ? 't' : 's') + r.i; openDialog(r, nearT ? 'teacher' : 'student'); } };
    } else if (onWall) {
      armed = null;
      walkTo(r.door.entry.x, r.door.entry.y);
      P.onArrive = () => { if (!dlg) { armed = 'door' + r.i; openDialog(r, 'door'); } };
    } else {
      // 이미 그 교실 안이면 조용히 걷고, 밖에서 누르면 문을 지날 때 대화창이 뜬다
      walkTo(x, y, roomOfPoint(P.x, P.y) === r ? r.i : null);
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
      if (dlg) closeDialog();
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

  ROOMS.forEach((room, i) => room.el.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || leaving) return;
    e.preventDefault();
    enter(L.rooms[i]);
  }));

  addEventListener('resize', fit);
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    $('#fade').hidden = true;
    closeDialog();
    const st = load('pixelSchool', sessionStorage);
    if (st && L.rooms[st.room]) { placeAtDoor(st.room); P.room = null; SFX.exit(); }
  });

  /* ───────── 시작 ───────── */
  fit();
  paintStars();
  const st = load('pixelSchool', sessionStorage);
  const back = st && KIDS.find((x) => x.id === st.kid);
  if (back) start(back, st.room, true);
  else openMenu();
  requestAnimationFrame((t) => { last = t; loop(t); });

  // 화면 확인용(개발자 도구)
  window.pixelSchool = {
    go: (n) => { const r = L.rooms[n - 1]; walkTo(r.door.entry.x, r.door.entry.y); },
    walk: (x, y) => walkTo(x, y),
    state: () => ({ mode, x: P.x, y: P.y, dir: P.dir, dialog: dlg && dlg.r.room.n, who: dlg && dlg.who, portrait: L.portrait, sound: SFX.on, audio: SFX.state, stars: found.size, room: P.room && P.room.i }),
    layout: () => L,
  };
})();
