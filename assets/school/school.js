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
    link: a.dataset.extra ? { url: a.dataset.extra, label: a.dataset.extraLabel || '바로 가기' } : null,
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
    // 인상 쓴 눈썹(안쪽이 내려간 八자 반대 모양)과 꾹 다문 입
    frown: { down: [['o', 'H', 2, 6, 3, 1], ['o', 'H', 5, 7, 1, 1], ['o', 'H', 9, 6, 3, 1], ['o', 'H', 8, 7, 1, 1], ['o', 'e', 4, 7, 1, 1], ['o', 'e', 10, 7, 1, 1], ['o', 'e', 6, 9, 2, 1], ['o', 's', 2, 9, 1, 1], ['o', 's', 11, 9, 1, 1]],
      side: [['o', 'H', 1, 6, 3, 1], ['o', 'H', 4, 7, 1, 1], ['o', 'e', 3, 7, 1, 1], ['o', 'e', 3, 9, 1, 1]] },
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
  // 친구 도감: 학생마다 꿈과 관심 전공
  const DREAMS = {
    haneul: ['아침 라디오 PD', '미디어커뮤니케이션학'], bora: ['소설가', '국어국문학·문예창작'], doyun: ['데이터 과학자', '컴퓨터공학·통계학'],
    seoa: ['스포츠 재활 트레이너', '스포츠의학·물리치료'], jimin: ['기자', '언론정보학'], yuchan: ['도시계획가', '도시공학·지리학'],
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
    { id: 't1', mono: ['수시 일정표 다시 정리해야지.', '이 대학 전형이 바뀌었네…', '상담 신청한 학생이 누구였더라?', '학생부 기록, 꼼꼼히!', '면접 질문 목록 만들어 볼까.'], bubble: ['전형 이름부터 알아 둬요!', '교과? 종합? 같이 봐요', '수시 6장 전략 세웠나요?', '2028 대입, 미리미리!'], name: '김 선생님', adult: true, look: ['glasses'], say: '대입 전형은 무엇이든 물어보세요.',
      pal: { h: '#5a596e', s: '#f7caa0', c: '#2b3a66', w: '#ffffff', t: '#e2475a', p: '#353b4a' } },
    { id: 't2', mono: ['진로 검사 결과 정리해야지.', '이 학과 소개 자료 좋다!', '꿈은 바뀌어도 괜찮아…', '다음 진로 특강은 누구를 모실까?', '추천 자료에 하나 더 넣어야겠다.'], bubble: ['좋아하는 것부터 적어 봐요', '진로는 천천히 찾아도 돼요', '추천 자료 새로 올렸어요!', '전공 안내서 읽어 봤나요?'], name: '박 선생님', adult: true, look: ['bun'], skirt: true, say: '진로 고민, 같이 찾아봐요.',
      pal: { h: '#6a3a26', s: '#ffd9b8', c: '#f08fb0', w: '#ffffff', t: '#c2410c', p: '#4b4f7a' } },
    { id: 't3', mono: ['이 그래프, 수업에 써 볼까?', '학생 수 통계가 새로 나왔네.', '표 하나 더 그려 볼까.', '숫자 속에 이야기가 있지.', '데이터는 거짓말을 안 해.'], bubble: ['그래프에 답이 숨어 있어요', '우리 시는 학생이 늘었을까?', '숫자는 거짓말을 안 해요', '지도에서 동네를 찾아봐요'], name: '이 선생님', adult: true, look: ['glasses'], say: '숫자 속에 우리 동네 이야기가 있어요.',
      pal: { h: '#2a2440', s: '#f2bf94', c: '#f4f4f4', w: '#7fb3e0', t: '#0e7490', p: '#3b4252' } },
    { id: 't4', mono: ['이 책 정말 재밌다…', '다음 달 추천 도서는 뭘로 하지?', '독서 릴레이 댓글이 늘었네!', '한 장만 더 읽고 일해야지.', '도서관 새 책이 들어왔대.'], bubble: ['오늘의 한 문장은?', '쉿, 책 읽는 중이에요', '친구 책에 공감 눌러 줘요', '한 쪽만 더 읽어 볼까요?', '전자도서관도 열려 있어요'], name: '최 선생님', adult: true, look: ['long'], skirt: true, say: '오늘은 어떤 책을 읽고 있나요?',
      pal: { h: '#2e2030', s: '#ffe0c4', c: '#74b46e', w: '#fff6e0', t: '#c2410c', p: '#a35a3a' } },
    { id: 't5', mono: ['오늘 기사 하나 골라 볼까.', '이 뉴스는 어떤 전공과 이어질까?', '신문 스크랩 정리 끝!', '질문을 잘 만드는 게 먼저야.', '월요일 뉴스 준비해야지.'], bubble: ['오늘 아침 뉴스 봤나요?', '이 기사, 어떤 전공일까?', '질문 다섯 개로 깊게 읽기!', '월요일엔 새 뉴스가 와요'], name: '정 선생님', adult: true, look: ['mustache'], say: '뉴스 한 줄이 진로가 되기도 해요.',
      pal: { h: '#3a2a20', s: '#efb98e', c: '#cf8240', w: '#ffffff', t: '#15803d', p: '#4a3a30' } },
    { id: 't6', mono: ['탐구 주제 예시를 더 모아야지.', '이 활동은 어느 단계일까?', '보고서 피드백 써 줘야겠다.', '실험 안전 수칙 다시 확인!', '학생 탐구 발표 기대된다.'], bubble: ['기억하고, 이해하고, 적용!', '탐구 주제 정했나요?', '한 단계 위로 올라가 봐요', '성취기준에서 출발해요'], name: '한 선생님', adult: true, look: ['bob'], skirt: true, say: '생각을 한 단계씩 키워 봐요.',
      pal: { h: '#1f1b2e', s: '#ffd4ae', c: '#b55094', w: '#ffffff', t: '#ffd36b', p: '#b55094' } },
  ];

  /* ───────── 오른쪽 끝 교무실 칸: 진로카페·위클래스(사이트로 가지 않고 이야기만 나눈다) ───────── */
  const mkRoom = (o) => Object.assign({ n: null, special: true, el: null, url: null,
    light: mix(o.color, '#ffffff', 0.55), pale: mix(o.color, '#ffffff', 0.8), dark: mix(o.color, '#000000', 0.3) }, o);
  const SPECIAL = [
    { room: mkRoom({ key: 'cafe', short: '진로카페', title: '진로카페', badge: '카페', color: '#9a6240', icon: 'cup',
        desc: '진로 선생님과 따뜻한 차 한 잔 하며 진로 고민을 편하게 나누는 쉼터예요.' }),
      staff: { id: 'barista', name: '쿠리만쥬 쌤', adult: true, look: ['ahoge', 'frown'], say: '',
        mono: ['…원두가 떨어져 가네.', '흥, 오늘 라떼 아트는 잘됐군.', '진로 상담 예약이 꽉 찼어…', '우유 거품이 너무 많아.', '…컵은 제자리에 두라고.'],
        pal: { h: '#8a4b26', s: '#f7caa0', c: '#e9b48c', w: '#fff1e0', t: '#a8643c', p: '#5a3a2a', H: '#4a2410' } },
      talk: ['진로카페에서는 커피 향을 맡으며 진로 이야기를 나눠요.', '원두를 고르듯 진로도 천천히 맛보며 골라 봐요.',
        '따뜻한 코코아도 있어요. 고민 하나 내려놓고 가요.', '오늘의 추천 메뉴는 "꿈 한 스푼 라떼"예요.', '쉬는 시간에 잠깐 들러도 좋아요. 자리는 늘 비워 둘게요.'],
      bubble: ['커피 내리는 중…', '꿈 한 스푼 라떼 어때요?', '쉬어 가요, 천천히!', '진로 고민도 한 잔!'] },
    { room: mkRoom({ key: 'wee', short: '위클래스', title: '위클래스(Wee 클래스)', badge: '상담', color: '#d96a8e', icon: 'heart',
        desc: '마음이 힘들거나 이야기를 나누고 싶을 때 찾아오는 상담실이에요. 상담이 필요한 학생은 4층 위클래스로 오세요.' }),
      staff: { id: 'counselor', name: '소윤 쌤', adult: true, look: ['long'], skirt: true, say: '',
        mono: ['뭉치 산책 시간이다~', '상담 일지 정리해야지.', '오늘 다들 마음이 편했으면…', '쿠션 좀 정리할까?', '따뜻한 차 한 잔 우려야지.'],
        pal: { h: '#5a3428', s: '#ffe0c4', c: '#f4a7b9', w: '#fff6e0', t: '#ffffff', p: '#8a6ad8' } },
      talk: ['상담이 필요한 학생은 4층 위클래스로 오세요.', '오늘 마음 날씨는 어때요? 흐린 날도 괜찮아요.',
        '말하기 어려운 고민도 여기서는 비밀이 지켜져요.', '힘들 때는 혼자 참지 말고 언제든 찾아와요.', '잘하고 있어요. 오늘도 수고 많았어요.'],
      bubble: ['상담이 필요한 학생은 4층 위클래스로 오세요', '오늘 기분은 어때요?', '언제든 문 열려 있어요', '천천히 숨 한 번!'] },
  ];
  /* ───────── 1층: 보건실·교장실·교무실·학생 쉼터·급식실·체육관(사이트 없이 이야기와 미션) ───────── */
  const KIDPAL = (h, s, c, t, p) => ({ h, s, c, w: '#ffffff', t, p, r: '#ff6f91' });
  const FLOOR1 = [
    { room: mkRoom({ key: 'nurse', short: '보건실', title: '보건실', badge: '보건', color: '#3aa58f', icon: 'cross',
        desc: '몸이 아프거나 다쳤을 때 찾아오는 곳이에요. 보건 선생님이 돌봐 주세요.' }),
      staff: { id: 'f1-nurse', name: '나래 쌤', adult: true, look: ['bob'], skirt: true,
        mono: ['밴드랑 소독약 채워 둬야지.', '오늘은 체온계가 바쁘네…', '독감 예방 안내문 붙여야겠다.', '침대 시트 갈 시간이다.', '보건 일지 정리 끝!', '찜질팩 데워 둘까?'],
        pal: { h: '#3a2a30', s: '#ffe0c4', c: '#ffffff', w: '#a8dcef', t: '#3aa58f', p: '#5a7a9a' } },
      talk: ['아픈 곳이 있으면 참지 말고 바로 보건실로 와요.', '손 씻기만 잘해도 감기의 절반은 막을 수 있어요.', '물을 자주 마셔요. 머리도 맑아져요.',
        '잠은 7시간 넘게! 키도 크고 기억력도 좋아져요.', '다쳤을 땐 상처를 깨끗한 물로 먼저 씻어요.'],
      bubble: ['어디 아픈 데는 없어요?', '손 씻기 30초!', '물 한 컵 마셔요', '푹 자는 것도 공부예요', '바른 자세로 앉아요', '눈도 가끔 쉬어 줘요'],
      npc: { id: 'f1-junseo', name: '준서', look: ['spiky'], pal: KIDPAL('#2a2440', '#f7caa0', '#7fb3e0', '#ffffff', '#3b4252'),
        talk: ['콜록… 감기 기운이 있어서 잠깐 쉬러 왔어.', '보건 쌤이 따뜻한 물을 자주 마시래.', '어제 늦게 잤더니 머리가 띵해. 오늘은 일찍 잘래.'],
        bubble: ['콜록콜록…', '조금 쉬면 괜찮아질 거야', '보건실 침대 푹신해'] } },
    { room: mkRoom({ key: 'principal', short: '교장실', title: '교장실', badge: '교장', color: '#7d5ab5', icon: 'crown',
        desc: '학교를 이끄시는 교장 선생님 방이에요. 학생 누구나 노크하고 들어올 수 있어요.' }),
      staff: { id: 'f1-principal', name: '교장 선생님', adult: true, look: ['glasses', 'mustache'],
        mono: ['오늘 조회 때 무슨 이야기를 할까…', '화단 꽃이 예쁘게 폈네.', '학교 운영위원회 자료를 봐야지.', '복도가 오늘도 깨끗하구나.', '학생들 웃음소리가 들리네.', '축제 준비는 잘 되고 있나?'],
        pal: { h: '#b8b8c8', s: '#f2c49e', c: '#2b3a66', w: '#ffffff', t: '#c2283c', p: '#2b2f40', H: '#8a8a9a' } },
      talk: ['교장실 문은 언제나 열려 있어요. 편하게 들어와요.', '꿈은 크게, 오늘 할 일은 작게 나눠 봐요.', '먼저 인사하는 사람이 하루를 밝게 만들어요.',
        '학교에 바라는 점이 있으면 학생 쉼터 건의함에 써 줘요.', '실패해도 괜찮아요. 다시 해 보는 게 배움이에요.'],
      bubble: ['어서 와요, 반가워요!', '오늘도 힘차게!', '건의함 의견 기다려요', '인사는 마음의 문이에요', '꿈 이야기 들려줄래요?', '책 한 권 빌려 갈래요?'],
      npc: { id: 'f1-vice', name: '교감 선생님', adult: true, look: ['glasses'],
        mono: ['다음 주 행사 일정표 확인!', '안전 점검 목록이 어디 있더라…', '시간표 바뀐 거 공지해야지.', '결재 서류가 한가득이네.', '비상 대피 훈련 날짜 정해야겠다.'], pal: { h: '#3a3a48', s: '#f7caa0', c: '#4a5a7a', w: '#ffffff', t: '#2f7a4a', p: '#2b2f40' },
        talk: ['학교 행사 일정은 교무실 게시판에서 볼 수 있어요.', '복도에서 인사하는 학생을 보면 하루가 즐거워요.', '안전이 먼저예요. 계단에서는 천천히!'],
        bubble: ['인사 잘하네요!', '행사 일정 확인 중', '오늘도 안전하게!'] } },
    { room: mkRoom({ key: 'office', short: '교무실', title: '교무실', badge: '교무', color: '#3f7dd8', icon: 'clip',
        link: { url: 'https://bongilcheon-h.goepj.kr/bongilcheon-h/main.do', label: '학교 홈페이지' },
        desc: '선생님들이 수업을 준비하고 일하시는 곳이에요. 들어올 땐 노크하고 찾는 선생님 성함을 말해요. 학교 홈페이지도 여기서 열 수 있어요.' }),
      staff: { id: 'f1-office', name: '오 선생님', adult: true, look: ['glasses'],
        mono: ['가정통신문 오늘 나가야 하는데…', '학교 홈페이지 공지 올려야지.', '수행평가 일정표 다시 확인!', '교과서 신청 마감이 언제더라?', '채점할 게 산더미네…'],
        pal: { h: '#2a2440', s: '#f7caa0', c: '#e9e4d8', w: '#7fb3e0', t: '#33508f', p: '#3b4252' } },
      talk: ['학교 홈페이지가 궁금하면 아래 버튼을 눌러 봐요. 공지사항과 학사일정이 있어요.', '교무실에 들어올 땐 노크하고, 찾는 선생님 성함을 말해요.', '수행평가 일정은 미리미리 확인해요.', '결석했을 땐 확인 서류를 꼭 챙겨 와요.',
        '시험 기간엔 교무실에 들어올 수 없어요. 질문은 미리 해요.', '학급 회의 결과는 담임 선생님께 알려 줘요.'],
      bubble: ['노크는 똑똑!', '학교 홈페이지는 여기서!', '수행평가 날짜 확인!', '서류는 미리 챙겨요', '수업 준비 중이에요'],
      npc: { id: 'f1-bae', name: '배 선생님', adult: true, look: ['long'], skirt: true, pal: { h: '#6a3a26', s: '#ffd9b8', c: '#74b46e', w: '#ffffff', t: '#ffffff', p: '#4b4f7a' },
        talk: ['시험지 채점 중이에요. 잠깐만요!', '프린터가 또 종이를 먹었어요…', '질문하러 왔어요? 기특하네요.'],
        bubble: ['채점 중…', '프린터야 힘내…', '질문은 언제든!'] } },
    { room: mkRoom({ key: 'lounge', short: '봉쿱', title: '봉쿱(학생 쉼터)', badge: '쉼터', color: '#e0a93a', icon: 'sofa',
        desc: '쉬는 시간에 친구들과 쉬어 가는 학생 쉼터 봉쿱이에요. 학생회 건의함이 있고, 오른쪽 위 구석에 음료 자판기도 있어요.' }),
      staff: { id: 'f1-gaeun', name: '가은', hi: '어서 와! 여기는 학생 쉼터 봉쿱이야. ', look: ['pony'], skirt: true, pal: KIDPAL('#40322c', '#ffe0c4', '#33508f', '#ffd36b', '#b33d55') },
      talk: ['학생회장 가은이야! 봉쿱은 모두의 공간이니까 깨끗하게 써 줘.', '건의함에 의견을 넣으면 학생회가 꼭 읽어.', '자판기 음료는 하루 한 개만! 당 조심!',
        '다음 달 축제는 학생회가 준비하고 있어. 기대해!', '쉬는 시간엔 여기서 잠깐 쉬어 가.'],
      bubble: ['봉쿱은 깨끗하게!', '건의함 열려 있어요', '축제 준비 중!', '쉬었다 가!'],
      npc: { id: 'f1-taeo', name: '태오', look: ['ahoge', 'hood'], pal: KIDPAL('#8a5232', '#f7caa0', '#5bb36b', '#ffffff', '#4b5563'),
        talk: ['봉쿱 자판기에서 뭐 마실지 10분째 고민 중이야.', '여기 소파 은근 편해.', '쉬는 시간 끝나기 1분 전이 제일 아쉬워.'],
        bubble: ['뭐 마시지…', '소파 최고', '쉬는 시간 짧아…'] } },
    { room: mkRoom({ key: 'cafeteria', short: '급식실', title: '급식실', badge: '급식', color: '#e0603a', icon: 'rice',
        desc: '점심을 먹는 곳이에요. 먹을 만큼 받고, 줄은 차례대로 서요.' }),
      staff: { id: 'f1-diet', name: '하은 쌤', adult: true, look: ['bun', 'glasses'], skirt: true,
        mono: ['다음 주 식단은 뭘로 짤까…', '오늘 국 간이 딱 맞았어.', '잔반이 조금 줄었네, 다행이다!', '알레르기 표시 다시 확인!', '디저트로 과일을 넣어 볼까?', '조리실 위생 점검 끝!'],
        pal: { h: '#2e2030', s: '#ffe0c4', c: '#ffffff', w: '#ffd36b', t: '#e0603a', p: '#5a5060' } },
      talk: ['채소도 한 입! 골고루 먹어야 오후 수업도 힘이 나요.', '먹을 만큼 받고 남기지 않기!', '식단표는 매주 월요일에 새로 나와요.',
        '알레르기가 있으면 식단표의 숫자를 꼭 확인해요.', '줄은 차례대로, 새치기는 안 돼요.'],
      bubble: ['채소도 한 입!', '잔반 줄이기!', '줄은 차례대로', '꼭꼭 씹어 먹어요', '물도 한 컵!'],
      npc: { id: 'f1-minjae', name: '민재', look: ['spiky', 'glasses'], pal: KIDPAL('#1f1b2e', '#ffd4ae', '#ffffff', '#e0603a', '#3b4252'),
        talk: ['나 오늘 급식 당번이야. 우유 나눠 줄게!', '오늘 디저트 뭔지 알아? 비밀!', '반 전체 잔반 제로에 도전 중이야.'],
        bubble: ['우유 받아 가!', '오늘 디저트는 비밀', '잔반 제로!'] } },
    { room: mkRoom({ key: 'gym', short: '체육관', title: '체육관', badge: '체육', color: '#4f9a4a', icon: 'ball',
        desc: '체육 수업과 동아리 활동을 하는 곳이에요. 실내화로 갈아 신고 들어와요.' }),
      staff: { id: 'f1-gym', name: '강 선생님', adult: true, look: ['spiky'],
        mono: ['공에 바람 넣어야겠다.', '다음 시간은 배드민턴이다!', '체육대회 조 편성 해 볼까.', '줄넘기 몇 개나 남았지?', '호루라기가 어디 갔지…'],
        pal: { h: '#1f1b2e', s: '#efb98e', c: '#2f7a4a', w: '#ffffff', t: '#ffffff', p: '#2f7a4a' } },
      talk: ['운동 전엔 준비 운동부터! 다치면 안 돼요.', '체육관에서는 실내화로 갈아 신어요.', '이기는 것보다 같이 뛰는 게 더 중요해요.',
        '하루 30분은 몸을 움직여요. 머리도 맑아져요.', '공은 다 쓰면 바구니에 제자리!'],
      bubble: ['준비 운동부터!', '물 마시고 해요', '공은 제자리에!', '파이팅!', '스트레칭 10초!', '같이 뛰니까 재밌죠?'],
      npc: { id: 'f1-yejun', name: '예준', look: ['ahoge'], pal: KIDPAL('#6a3a26', '#f7caa0', '#ff8a3d', '#ffffff', '#33508f'),
        talk: ['자유투 열 개 중에 일곱 개 넣었어!', '농구 동아리 들어올래?', '땀나면 물부터 마셔야 해.'],
        bubble: ['슛!', '자유투 연습 중', '같이 농구 할래?'] } },
  ];
  // 교무실에 함께 계신 선생님들(혼잣말만 한다)
  const OFFICE_EXTRA = [
    { id: 'f1-seo', name: '서 선생님', adult: true, look: ['spiky', 'glasses'], pal: { h: '#40322c', s: '#f2c49e', c: '#5a6b8a', w: '#ffffff', t: '#e0a93a', p: '#3b4252' },
      mono: ['수행평가 채점 기준표가 어디 갔지…', '오늘 3교시 실험 준비 끝!', '커피가 식었네…'] },
    { id: 'f1-yoon', name: '윤 선생님', adult: true, look: ['pony'], skirt: true, pal: { h: '#2a2440', s: '#ffe0c4', c: '#f08fb0', w: '#ffffff', t: '#ffffff', p: '#4b4f7a' },
      mono: ['동아리 신청서 마감이 내일이던가?', '이 학생 소감문 정말 잘 썼다!', '출석부 정리 완료~'] },
    { id: 'f1-lim', name: '임 선생님', adult: true, look: ['mustache'], pal: { h: '#1f1b2e', s: '#efb98e', c: '#8d5a33', w: '#fff1e0', t: '#15803d', p: '#4a3a30' },
      mono: ['수학 문제 하나 더 만들어 볼까…', '프린터 종이 누가 채워 주셨지? 감사합니다.', '음, 이 풀이 깔끔하네.'] },
    { id: 'f1-jo', name: '조 선생님', adult: true, look: ['bob', 'glasses'], skirt: true, pal: { h: '#6a3a26', s: '#ffd9b8', c: '#a8dcef', w: '#ffffff', t: '#e0475a', p: '#3b3a5a' },
      mono: ['영어 단어 시험지 복사해야지.', '학부모 상담 일정 확인!', '오늘은 칼퇴할 수 있을까…'] },
  ];
  // 말풍선 더하기: 사람마다 가까이 갔을 때(bubble)와 멀리서 혼잣말(mono)을 몇 줄씩 더 넣는다
  {
    const add = (o, k, lines) => { o[k] = (o[k] || []).concat(lines); };
    const T = Object.fromEntries(TEACHERS.map((t) => [t.id, t]));
    add(T.t1, 'bubble', ['면접은 연습이 답이에요', '최저 기준도 꼭 확인!', '모집요강은 밑줄 치며 읽기']);
    add(T.t1, 'mono', ['입결표를 또 바꿨네…', '자기소개 1분 연습시켜야지.', '원서 접수 날짜 달력에 표시!']);
    add(T.t2, 'bubble', ['직업 카드 한 장 뽑아 볼래요?', '오늘 하고 싶은 일은 뭐예요?', '실패도 진로 경험이에요']);
    add(T.t2, 'mono', ['진로 포트폴리오 양식 바꿔 볼까.', '이번 체험학습 장소는 어디가 좋을까?', '학생 꿈 목록 벌써 서른 개!']);
    add(T.t3, 'bubble', ['평균보다 중앙값이 궁금해요', '표를 그래프로 바꿔 봐요', '추세선이 위로 가네요!']);
    add(T.t3, 'mono', ['소수점 둘째 자리까지 맞나…', '원그래프는 이제 그만!', '엑셀 함수 하나 더 배워야지.']);
    add(T.t4, 'bubble', ['책갈피 하나 줄까요?', '시집도 한번 읽어 봐요', '독서 릴레이 다음 주자는?']);
    add(T.t4, 'mono', ['반납 기한이 오늘이었나…', '이 문장 필사해 둬야지.', '책 냄새 좋다.']);
    add(T.t5, 'bubble', ['제목만 읽지 말고 본문까지!', '출처를 꼭 확인해요', '사설과 기사는 달라요']);
    add(T.t5, 'mono', ['가짜 뉴스 수업 자료 만들어야지.', '오늘 1면은 뭘까.', '헤드라인이 참 잘 뽑혔네.']);
    add(T.t6, 'bubble', ['왜? 를 세 번 물어봐요', '가설부터 세워 볼까요?', '실험 노트 꼼꼼히!']);
    add(T.t6, 'mono', ['탐구 질문이 점점 좋아지네.', '발표 순서 정해야지.', '루브릭을 다시 다듬자.']);
    const SP = Object.fromEntries(SPECIAL.map((x) => [x.room.key, x]));
    add(SP.cafe, 'bubble', ['…오늘은 핸드드립이에요', '흥, 또 왔군요', '설탕은 셀프예요']);
    add(SP.cafe.staff, 'mono', ['…이 원두는 산미가 좋군.', '머그잔 하나가 없어졌어.', '흥, 오늘도 손님이 많군.']);
    add(SP.wee, 'bubble', ['뭉치가 보고 싶었대요', '오늘 하루 수고했어요', '차 한 잔 할래요?']);
    add(SP.wee.staff, 'mono', ['상담실 화분에 물 줘야지.', '마음 일기 양식 새로 만들까?', '뭉치 간식 남았나?']);
    const F = Object.fromEntries(FLOOR1.map((x) => [x.room.key, x]));
    add(F.nurse, 'bubble', ['어지러우면 바로 말해요', '체육 시간 전에 스트레칭!', '손톱 깎았나요?']);
    add(F.nurse.staff, 'mono', ['소독솜이 거의 다 떨어졌네.', '오늘 체온계는 쉬는 날이면 좋겠다.', '응급 키트 점검 끝!']);
    add(F.nurse.npc, 'bubble', ['머리가 조금 아파…', '이불 덮으니 따뜻해']);
    add(F.principal, 'bubble', ['우리 학교 자랑거리는?', '꿈은 크게 가져요', '선생님들께 인사했나요?']);
    add(F.principal.staff, 'mono', ['졸업식 축사 초안을 써 볼까.', '운동장에 잔디가 잘 자랐네.', '학교 신문 이번 호 재밌군.']);
    add(F.principal.npc, 'mono', ['다음 달 교직원 연수 준비!', '행정실에 전화해야지.', '복도 조명 하나가 깜빡이네.']);
    add(F.principal.npc, 'bubble', ['계단은 한 칸씩!', '오늘 지각생은 없네요']);
    add(F.office, 'bubble', ['교과서 챙겼나요?', '조퇴증은 담임 선생님께!', '분실물은 교무실로']);
    add(F.office.staff, 'mono', ['출결 정리 마감이 오늘이네.', '복사기 토너 바꿔야겠다.', '내일 시간표 변경 있음!']);
    add(F.office.npc, 'bubble', ['복사 중이에요~', '커피 한 잔만…']);
    add(F.lounge, 'bubble', ['학생회 회의는 목요일!', '분리수거 부탁해', '축제 공연팀 모집 중!']);
    add(F.lounge.npc, 'bubble', ['이온음료? 탄산?', '매점 빵 다 팔렸대', '보드게임 할 사람?']);
    add(F.cafeteria, 'bubble', ['오늘 국 맛있어요', '수저는 제자리에!', '디저트는 하나씩!']);
    add(F.cafeteria.staff, 'mono', ['내일 아침 재료 확인!', '오늘 잔반 몇 kg이었지?', '새 메뉴 시식해 볼까.']);
    add(F.cafeteria.npc, 'bubble', ['우유 하나 더 있어', '숟가락 여기!']);
    add(F.gym, 'bubble', ['손목·발목 돌려요!', '실내화 끈 묶었나요?', '줄 맞춰 서요!']);
    add(F.gym.staff, 'mono', ['배구 네트 높이 맞춰야지.', '체력 측정 기록표 어디 뒀더라.', '휘슬 소리 좋다!']);
    add(F.gym.npc, 'bubble', ['레이업 연습 중!', '3점 슛 들어갔다!']);
    for (const x of OFFICE_EXTRA) add(x, 'mono', ['메신저 알림이 또 왔네.', '내일 수업 PPT 수정해야지.', '책상 정리 좀 할까…']);
  }
  // 저녁(17시~24시, 0시에 원래대로): 1층 선생님들은 17시에 모두 퇴근(교무실 두 분만 야근), 미션·심부름은 쉰다.
  // 급식실·봉쿱은 야간 자습실, 체육관은 레슬링부 연습, 교장실·보건실은 불을 끄고 문을 잠근다
  const STUDY_KEYS = ['cafeteria', 'lounge'];
  const LOCKED_KEYS = ['principal', 'nurse'];
  const isStudy = () => new Date().getHours() >= 17;
  const isOff = isStudy;
  const isEve = isStudy;
  const wrestleRoom = (r) => !!(r && r.f1 && L && L.night && r.f1.room.key === 'gym');
  const studyRoom = (r) => !!(r && r.f1 && L && L.night && STUDY_KEYS.includes(r.f1.room.key));
  const nightOffice = (r) => !!(r && r.f1 && L && L.off && r.f1.room.key === 'office');
  const STUDY = {
    desc: '17시부터 24시까지는 조용히 공부하는 야간 자습실이에요. 자정이 되면 다시 원래대로 돌아가요.',
    bubble: ['자습 감독 중이에요', '쉿, 조용히!', '모르는 건 메모해 두기', '물 마시고 집중!', '조금만 더 힘내요'],
    talk: ['지금은 야간 자습 시간이에요. 소곤소곤 말해요.', '모르는 문제는 표시해 두었다가 내일 선생님께 물어봐요.', '50분 공부하고 10분은 꼭 쉬어요.'],
    kid: { id: 'study-kid', bubble: ['쉿, 공부 중…', '문제집 반 남았다', '집중, 집중!', '졸리다… 아니야!'],
      crowd: ['쉿, 공부 중…', '수학 문제집 반 남았다', '이 단원만 끝내자!', '영단어 50개 외우기', '배고프다… 매점 닫았지', '내일 수행평가 준비 중',
        '12시 전엔 끝내자', '형광펜 어디 갔지?', '오답 노트 정리 중', '조금만 더 힘내자', '이 문제 어떻게 풀지…', '졸면 안 돼!'],
      talk: ['지금은 야간 자습 중이야. 소곤소곤 말해 줘.', '자습실이 조용해서 공부가 잘돼.', '12시 전엔 끝내고 집에 갈 거야.', '여기 와이파이는 안 돼서 오히려 집중이 잘돼.'] },
  };
  const OVERTIME = {
    mono: ['아… 오늘도 야근이다', '저녁은 컵라면이다…', '내일 수업 자료 마저 만들어야지', '교무실에 우리 둘만 남았네요…', '자습실 한 바퀴 돌고 올까?', '집에 가고 싶다…', '커피 한 잔 더…'],
    bubble: ['아… 오늘도 야근이다', '야근 중…', '저녁은 컵라면!', '자습실 순찰 가야지'],
    talk: ['아… 오늘도 야근이에요. 다른 선생님들은 다 퇴근하셨어요.', '자습실에서 공부하다 왔어요? 대단하네요. 너무 늦지 않게 들어가요.', '내일 수업 자료 만드느라 아직 퇴근을 못 했어요.', '이 시간엔 교무실도 조용하네요. 컵라면 냄새만 빼면요.'],
  };
  // 저녁 체육관: 레슬링부 연습
  const WRESTLE = {
    crowd: ['하나, 둘! 하나, 둘!', '태클 연습 한 번 더!', '브리지 10초만 버텨!', '체급 맞추려면 야식 참아야지…', '대회까지 2주 남았다!', '한 판 더 붙자!',
      '매트 밖으로 나가면 안 돼!', '낮은 자세! 더 낮게!', '스파링 끝나면 스트레칭!', '물 마시고 다시!', '오늘은 꼭 한 판 이긴다', '숨 고르고… 간다!'],
    desc: '17시가 지나면 체육관은 레슬링부 연습장이에요. 매트 위에서 두 명씩 짝을 지어 연습해요.',
    talk: ['레슬링부 저녁 연습 중이야! 매트 밖에서 구경해 줘.', '태클은 자세가 낮아야 해. 너도 해 볼래?', '대회 나가려면 매일 연습해야 해.', '땀 냄새는 비밀로 해 줘…'],
  };
  // 저녁 2층 선생님: 퇴근할 수 없는 NPC의 슬픔
  const NPC_EVE = {
    bubble: ['아… 우리는 영영 퇴근할 수 없는 건가', '퇴근 버튼은 어디 있지?', '1층 선생님들은 다 퇴근했대요…', '우린 NPC라 야근 수당도 없어요',
      '개발자님, 퇴근 패치 좀…', '오늘도 같은 자리, 같은 대사…', '플레이어 왔다! 바쁜 척!', '창밖이 깜깜한데 난 아직 여기…'],
    mono: ['아… 우리는 영영 퇴근할 수 없는 건가.', '이 교실을 벗어나 본 적이 있었나…?', '화면이 꺼져야 쉬는 거겠지.', '대사가 더 있었으면 좋겠다.',
      '저 학생은 퇴근을 할 수 있겠지?', '내일도 여기, 모레도 여기.', '버그라도 나면 집에 갈 수 있을까?', '1층 선생님들 부럽다…'],
  };
  const specialOf = (r) => r && r.room.special ? (r.f1 || SPECIAL.find((x) => x.room === r.room)) : null;
  const BASEPAL = { e: '#2b1d2e', W: '#ffffff', b: '#ff9fa8', m: '#d0505a', w: '#ffffff', k: '#3b2a24', g: '#8a9cc8', r: '#e0475a', H: '#3a2a20' };
  function finishPal(p) {
    p.pal = { ...BASEPAL, ...p.pal };
    p.pal.l = mix(p.pal.h, '#ffffff', 0.38);
    p.pal.S = mix(p.pal.s, '#a0603a', 0.3);
    p.pal.C = mix(p.pal.c, C.ink, 0.25);
    return p;
  }
  [...KIDS, ...TEACHERS, ...SPECIAL.map((x) => x.staff), ...FLOOR1.map((x) => x.staff), ...FLOOR1.map((x) => x.npc), ...OFFICE_EXTRA].forEach(finishPal);
  // 내 캐릭터: 처음 한 번 적은 이름·성별로 만든다(교복 차림, 머리 모양·색은 이름에 따라)
  const HAIRS = ['#2a2440', '#40322c', '#6a3a26', '#8a5232', '#1f1b2e', '#5a3428'];
  const SKINS = ['#ffd9b8', '#ffe0c4', '#f7caa0', '#ffd4ae'];
  function makeMe(name, g) {
    let h = 7; for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    const female = g === 'f';
    const look = female ? [['long', 'ribbon'], ['pony'], ['bob'], ['buns']][h % 4] : [['spiky'], ['ahoge'], [], ['spiky', 'glasses']][h % 4];
    return finishPal({ id: `me-${g}-${h % 997}`, me: true, name, gender: g, line: '나', look, skirt: female,
      pal: { h: HAIRS[h % HAIRS.length], s: SKINS[(h >>> 3) % SKINS.length], c: '#2b3a66', w: '#ffffff', t: female ? '#e2475a' : '#c2283c', p: female ? '#4b4f7a' : '#3b4252', r: '#ff6f91' } });
  }
  // 이름은 화면 글자로만 쓰지만, 혹시 몰라 꺾쇠·따옴표 같은 기호는 빼고 6자로 자른다
  function cleanName(v) { return [...String(v || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim()].slice(0, 6).join(''); }
  // 1층 점심시간에 급식실을 채울 다른 학생들(이름 없이 모습만). 처음 쓸 때 만든다
  let CROWD = null;
  const crowdList = () => CROWD || (CROWD = Array.from({ length: 60 }, (_, i) => Object.assign(makeMe('급식' + i * 7, i % 2 ? 'f' : 'm'), { id: 'crowd' + i, me: false })));
  let ME = (() => { const m = load('pixelSchoolMe', localStorage); return m && cleanName(m.name) && /^[mf]$/.test(m.g) ? makeMe(cleanName(m.name), m.g) : null; })();

  const SPR_W = 18, OX = 2, OY = 3;
  // 머리 꼭대기까지의 높이(발 기준). 말풍선은 이보다 위(또는 발 아래)에 띄워 얼굴을 가리지 않는다
  const headUp = (sp) => (sp && sp.adult ? 21 : 18) + (sp && sp.skirt ? 1 : 0) + 2;
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
    cross: ['..AAAA..', '..AwwA..', 'AAAwwAAA', 'AwwwwwwA', 'AwwwwwwA', 'AAAwwAAA', '..AwwA..', '..AAAA..'],
    crown: ['........', 'A..AA..A', 'AA.AA.AA', 'AAAAAAAA', 'AawAAwaA', 'AAAAAAAA', 'kkkkkkkk', '........'],
    clip: ['..kkkk..', '.AkwwkA.', '.AAAAAA.', '.AwwwwA.', '.AkkkwA.', '.AwwwwA.', '.AkkwwA.', '.AAAAAA.'],
    sofa: ['........', '.AAAAAA.', '.AaaaaA.', 'AAaaaaAA', 'AAAAAAAA', 'AAAAAAAA', '.k....k.', '........'],
    rice: ['..w.w...', '.w.w....', 'wwwwwwww', 'AwwwwwwA', 'AAAAAAAA', '.AAAAAA.', '..AAAA..', '........'],
    ball: ['..kkkk..', '.kAAkAk.', 'kAAkAAAk', 'kkkkkkkk', 'kAAAkAAk', 'kAAAkAAk', '.kAkAAk.', '..kkkk..'],
  };
  const DIGITS = { 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'] };
  const PROPS = { cup: ['plant', 'shelf'], heart: ['plant', 'beanbag', 'plant'], pennant: ['trophy', 'plant', 'trash'], star: ['globe', 'shelf', 'plant'], chart: ['easel', 'globe', 'plant'], book: ['shelf', 'beanbag', 'plant'], news: ['tv', 'plant', 'trash'], pyramid: ['blocks', 'plant', 'trash'],
    cross: ['plant'], crown: ['trophy', 'shelf', 'plant'], clip: ['shelf', 'plant', 'trash'], sofa: ['plant', 'trash'], rice: ['plant', 'trash'], ball: ['trash'] };

  /* ───────── 지도 ───────── */
  // 2층: 1~6반 교실 + 진로카페·위클래스 / 1층: 보건실·교장실·교무실·학생 쉼터·급식실·체육관
  function buildLayout(portrait) {
    const f1 = floor === 1;
    const L = { portrait, rooms: [], f1, floor };
    const who = (i) => (f1 ? { room: FLOOR1[i].room, teacher: FLOOR1[i].staff, f1: FLOOR1[i] }
      : { room: i < 6 ? ROOMS[i] : SPECIAL[i - 6].room, teacher: i < 6 ? TEACHERS[i] : SPECIAL[i - 6].staff });
    if (!portrait) {
      L.W = 480; L.H = 256;
      L.hall = { x: 0, y: 104, w: 480, h: 46 };
      L.walkHall = { x: 28, y: 107, w: 480 - 28 - 24, h: 42 };
      // [x, 위쪽 줄?, 너비]
      const slots = f1 ? [[0, 0, 128], [0, 1, 128], [128, 1, 176], [304, 1, 176], [128, 0, 176], [304, 0, 176]]
        : [[0, 1, 128], [128, 1, 128], [256, 1, 128], [0, 0, 128], [128, 0, 128], [256, 0, 128], [384, 1, 96], [384, 0, 96]];
      slots.forEach(([x, top, w], i) => {
        const r = { i, ...who(i), x, y: top ? 0 : 150, w, h: top ? 104 : 106,
          F: 24, S: top ? 12 : 4, Wt: x === 0 ? 4 : 2, Et: x + w === 480 ? 4 : 2 };
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
      });
    } else {
      L.W = 240; L.H = 448;
      L.hall = { x: 96, y: 0, w: 48, h: 448 };
      L.walkHall = { x: 101, y: 28, w: 38, h: 448 - 28 - 10 };
      // [왼쪽?, y, 높이]
      const slots = f1 ? [[0, 0, 128], [1, 0, 128], [1, 128, 160], [1, 288, 160], [0, 128, 160], [0, 288, 160]]
        : Array.from({ length: 8 }, (_, i) => [i % 2 === 0 ? 1 : 0, Math.floor(i / 2) * 112, 112]);
      slots.forEach(([left, y, h], i) => {
        const r = { i, ...who(i), x: left ? 0 : 144, y, w: 96, h,
          F: 24, S: y + h === 448 ? 4 : 2, Wt: left ? 4 : 6, Et: left ? 6 : 4 };
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
      });
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
    // 계단 위로도 걸어 들어갈 수 있다(끝까지 가면 다른 층으로)
    L.stairs = portrait ? { x: L.walkHall.x, y: 6, w: L.walkHall.w, h: 26 } : { x: 6, y: L.walkHall.y, w: 26, h: L.walkHall.h };
    L.night = f1 && isStudy(); L.off = L.night;
    // 저녁: 교장실·보건실은 문을 잠근다(걸어 들어갈 수 없다)
    for (const r of L.rooms) r.locked = L.off && LOCKED_KEYS.includes(r.f1.room.key);
    const open = L.rooms.filter((r) => !r.locked);
    L.walk = [L.walkHall, L.stairs, ...open.map((r) => r.door.walk), ...open.map((r) => r.walkFloor)];
    L.obst = []; L.things = []; L.signs = [];
    L.bg = drawBackground(L);
    // 17시 이후: 1층 어른들은 퇴근(교무실은 오 선생님과 한 분만 남아 야근). 잠긴 방과 체육관(레슬링부)의 학생도 집에 간다
    if (L.off) for (const r of L.rooms) {
      const key = r.f1.room.key, office = key === 'office';
      r.away = !!r.teacher.adult && !office;
      r.npcAway = !!r.f1.npc.adult || r.locked || key === 'gym';
      if (office) r.extras = (r.extras || []).slice(0, 1);
    }
    return L;
  }

  /* ───────── 배경(교실·복도는 한 번만 그려 둔다) ───────── */
  let R = null, gctx = null, L_signs = [], L_glass = [];
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
    L_glass = L.hallGlass = [];
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
      // 복도 오른쪽 끝 벽의 창문(가까이 가면 한마디)
      hallWindow(L.W - 6, h.y, 6, h.h, true);
      L.window = { x: L.W - 6, y: h.y, w: 6, h: h.h };
      // 계단 표지판: 2층에서는 내려가는 길, 1층에서는 올라가는 길
      sign(2, h.y + 2, 20, 9, L.f1 ? '▲2층' : '▼1층');
      // 복도 깔개
      rug(Math.round(L.W / 2 - 52), h.y + 18, 104, 12, '#7d9cc0', '#ffffff');
    } else {
      for (let i = 0; i < 6; i++) { R(h.x, i * 4, h.w, 4, i % 2 ? '#c2ab82' : '#d4bd92'); R(h.x, i * 4, h.w, 0.5, '#e6d2aa'); R(h.x, i * 4 + 3.5, h.w, 0.5, '#8f7a58'); }
      R(h.x, 24, h.w, 2, '#8f7a58');
      hallWindow(h.x, L.H - 6, h.w, 6, false);
      L.window = { x: h.x, y: L.H - 6, w: h.w, h: 6 };
      rug(h.x + 10, 150, 28, 40, '#7d9cc0', '#ffffff');
      sign(h.x + 3, 5, 42, 12, L.f1 ? '▲ 2층' : '▼ 1층');
      standSign(h.x + 1, 232, 34, 12, '뛰지 마요', L);
    }
    if (L.portrait && !L.f1) {
      // 진로카페 앞에 세워 둔 게시판(가까이 가거나 누르면 진로 선생님께 메시지)
      const bx = h.x + 6, by = 344;
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
  // 복도 끝 창문: vertical이면 오른쪽 벽(가로 화면), 아니면 아래 벽(세로 화면)
  function hallWindow(x, y, w, h, vertical) {
    R(x, y, w, h, C.wallTop);
    if (vertical) {
      R(x, y, 0.5, h, C.wallHi);
      const gy = y + 5, gh = h - 10;
      R(x + 1, gy - 1, 4, gh + 2, C.frame); R(x + 1.5, gy, 3, gh, C.glass);
      L_glass.push({ x: x + 1.5, y: gy, w: 3, h: gh / 2 - 0.5, v: true }, { x: x + 1.5, y: gy + gh / 2 + 0.5, w: 3, h: gh / 2 - 0.5, v: true });
      R(x + 1.5, gy + gh / 2 - 0.5, 3, 1, C.frame);
      R(x + 2, gy + 2, 1, 5, C.glassHi); R(x + 2, gy + gh / 2 + 3, 1, 4, C.glassHi);
      R(x - 1, gy, 1, gh, C.frameHi);
      // 창으로 들어오는 햇빛
      for (let i = 0; i < 5; i++) R(x - 4 - i * 3, gy + 2 + i, 3, gh - 4 - i * 2, 'rgba(255,248,214,0.16)');
    } else {
      R(x, y, w, 0.5, C.wallHi);
      const gx = x + 6, gw = w - 12;
      R(gx - 1, y + 1, gw + 2, 4, C.frame); R(gx, y + 1.5, gw, 3, C.glass);
      L_glass.push({ x: gx, y: y + 1.5, w: gw / 2 - 0.5, h: 3 }, { x: gx + gw / 2 + 0.5, y: y + 1.5, w: gw / 2 - 0.5, h: 3 });
      R(gx + gw / 2 - 0.5, y + 1.5, 1, 3, C.frame);
      R(gx + 2, y + 2, 5, 1, C.glassHi); R(gx + gw / 2 + 3, y + 2, 4, 1, C.glassHi);
      R(gx, y - 1, gw, 1, C.frameHi);
      for (let i = 0; i < 5; i++) R(gx + 2 + i, y - 4 - i * 3, gw - 4 - i * 2, 3, 'rgba(255,248,214,0.16)');
    }
  }
  // 음료 자판기: 14×24(통째로 부딪힘)
  function vending(x, y, L, spot) {
    vendingArt(x, y);
    L.obst.push({ x: x, y: y, w: 14, h: 24 });
    L.vend = { x, y, spot: spot || { x: x + 7, y: y + 30 } };
  }
  function vendingArt(x, y) {
    R(x + 1, y + 23, 13, 1, C.shadow);
    R(x - 1, y - 1, 16, 25, C.out);
    R(x, y, 14, 23, '#d8323f'); R(x, y, 14, 1, '#f0606a'); R(x + 12, y + 1, 2, 22, '#a8222d');
    // 진열창과 음료들
    R(x + 1.5, y + 2, 9, 11, '#2b1d2e'); R(x + 2, y + 2.5, 8, 10, '#bfe6f5');
    const cans = ['#ffd36b', '#5bb36b', '#e0475a', '#7d9cc0', '#ffffff', '#f08fb0', '#cf8240', '#8a6ad8', '#a8dcef'];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const cx = x + 2.5 + col * 2.6, cy = y + 3 + row * 3.3;
      R(cx, cy, 1.6, 2.4, cans[row * 3 + col]); R(cx, cy, 1.6, 0.5, '#ffffff');
      R(x + 2, cy + 2.6, 8, 0.4, '#8f7a58');
    }
    R(x + 2.5, y + 3, 1, 9, 'rgba(255,255,255,0.35)');
    // 버튼·동전 넣는 곳·꺼내는 곳
    R(x + 11, y + 3, 1, 1, '#ffd36b'); R(x + 11, y + 5, 1, 1, '#5bb36b'); R(x + 11, y + 7, 1, 1, '#ffffff');
    R(x + 10.5, y + 10, 2, 2, '#2b1d2e'); R(x + 11, y + 10.5, 1, 1, '#c8c8c8');
    R(x + 2, y + 16, 10, 4, '#2b1d2e'); R(x + 2.5, y + 16.5, 9, 3, '#5a5060');
    R(x + 3, y + 14, 8, 1, '#ffffff'); R(x + 3, y + 14, 3, 1, '#ffd36b');
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
  const PLATE = { cup: ['...', '###', '#.#', '###', '.#.'], heart: ['#.#', '###', '###', '.#.', '...'], cross: ['...', '.#.', '###', '.#.', '...'],
    crown: ['...', '#.#', '###', '###', '...'], clip: ['##.', '#.#', '#.#', '#.#', '###'], sofa: ['...', '#.#', '###', '#.#', '...'],
    rice: ['...', '###', '###', '.#.', '...'], ball: ['.#.', '###', '###', '.#.', '...'] };
  function plate(x, y, room) {
    if (!room.special) {
      // 교실 번호판: 숫자를 두 배로 키워 멀리서도 보이게(같은 자리를 중심으로)
      const X = x - 1.5, Y = y - 2.5, s = 2;
      R(X - 1, Y - 1, 10, 14, C.out); R(X, Y, 8, 12, room.color); R(X, Y, 8, 0.5, room.light); R(X, Y + 11.5, 8, 0.5, room.dark);
      DIGITS[room.n].forEach((row, j) => [...row].forEach((c, i) => { if (c === '#') R(X + 1 + i * s, Y + 1 + j * s, s, s, '#ffffff'); }));
      return;
    }
    R(x - 1, y - 1, 7, 9, C.out); R(x, y, 5, 7, room.color); R(x, y, 5, 0.5, room.light);
    const glyph = PLATE[room.icon] || PLATE.heart;
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
    // 진로카페·보건실·급식실은 바둑판 타일, 위클래스는 넓고 폭신한 깔개, 교장실은 붉은 양탄자, 체육관은 코트 선
    const tiles = { cafe: ['#e9dcc4', '#b98a62'], nurse: ['#eef8f5', '#cfe8e1'], cafeteria: ['#fdf6e6', '#eadcbc'] }[room.key];
    if (tiles) {
      for (let y = f.y; y < f.y + f.h; y += 6) for (let x = f.x; x < f.x + f.w; x += 6) {
        R(x, y, 6, 6, tiles[((x - f.x) / 6 + (y - f.y) / 6) % 2]);
        R(x, y, 6, 0.5, 'rgba(255,255,255,.25)');
      }
    } else if (room.key === 'wee') rug(f.x + 6, f.y + 32, f.w - 12, f.h - 40, room.pale, '#ffffff');
    else if (room.key === 'principal') rug(f.x + 4, f.y + 26, f.w - 8, f.h - 30, '#b0485a', '#f2c14e');
    else if (room.key === 'lounge') rug(f.x + 22, f.y + 30, f.w - 44, f.h - 44, room.light, '#ffffff');
    else if (room.key === 'gym') {
      R(f.x, f.y, f.w, f.h, 'rgba(255,214,140,.28)');
      const x0 = f.x + 6, y0 = f.y + 6, w = f.w - 12, h = f.h - 10, lc = 'rgba(255,255,255,.85)';
      R(x0, y0, w, 1, lc); R(x0, y0 + h, w, 1, lc); R(x0, y0, 1, h, lc); R(x0 + w - 1, y0, 1, h, lc);
      const cx = x0 + w / 2, cy = y0 + h / 2;
      if (w > h) R(Math.round(cx), y0, 1, h, lc); else R(x0, Math.round(cy), w, 1, lc);
      for (let a = 0; a < 28; a++) R(Math.round(cx + Math.cos(a / 28 * Math.PI * 2) * 9), Math.round(cy + Math.sin(a / 28 * Math.PI * 2) * 7), 1, 1, lc);
      R(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3, '#e0603a');
    }
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
    if (r.f1) { floor1Furniture(r, L, e); return; }
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
      // 위클래스 강아지: 깔개 위, 문·탁자에서 먼 자리에 앉아 있다
      const spots = [{ x: f.x + 24, y: f.y + f.h - 16 }, { x: f.x + Math.round(f.w / 2), y: f.y + f.h - 14 }, { x: f.x + 18, y: f.y + 34 }, { x: f.x + f.w - 26, y: f.y + f.h - 16 }]
        .filter((q) => Math.hypot(q.x - e.x, q.y - e.y) > 22 && !cs.some((c) => Math.abs(q.x - (c.x + 6)) < 14 && Math.abs(q.y - (c.y + 6)) < 10));
      if (spots.length) {
        const dg = r.dog = spots[0];
        L.obst.push({ x: dg.x - 6, y: dg.y - 4, w: 12, h: 4 });
        L.things.push({ y: dg.y, fn: () => drawDog(dg) });
      }
    }
    L.obst.push({ x: r.tpos.x - 4, y: r.tpos.y - 4, w: 8, h: 5 });
  }

  // 자습실 책상 위 펼친 책과 공책(6×4)
  function studyBook(x, y, n) {
    const col = ['#7fb3e0', '#ff9a52', '#6fbf5a', '#e0475a', '#b48ae0'][Math.abs(n) % 5];
    R(x, y + 1, 6, 3, col); R(x + 0.5, y + 1, 2.5, 2.5, '#ffffff'); R(x + 3, y + 1, 2.5, 2.5, '#fffdf4'); R(x + 3, y + 1, 0.5, 2.5, col);
    R(x + 1, y + 2, 1.5, 0.5, '#9aa0b0'); R(x + 3.5, y + 2, 1.5, 0.5, '#9aa0b0');
  }
  // 1층 교실 가구. 선생님 자리(tpos)와 학생 자리(npcSeat)도 여기서 정한다
  function floor1Furniture(r, L, e) {
    const room = r.room, f = r.floor, key = room.key;
    const thing = (y, fn) => L.things.push({ y, fn });
    const block = (x, y, w, h) => L.obst.push({ x, y, w, h });
    const mid = Math.round(f.x + f.w / 2), doorRight = e.x > mid;
    r.keepClear = [];
    if (key === 'nurse') {
      // 침대 두 개와 칸막이 커튼, 약장, 보건 선생님 책상
      // 침대는 문에서 먼 쪽 벽에 붙인다
      const b0 = doorRight ? f.x + 4 : f.x + f.w - 44;
      for (const bx of [b0, b0 + 20]) {
        const by = f.y + 3;
        block(bx, by + 2, 16, 24);
        thing(by + 26, () => {
          R(bx + 1, by + 26, 15, 1, C.shadow);
          R(bx, by, 16, 4, '#c9ccd6'); R(bx, by, 16, 1, '#ffffff');
          R(bx + 1, by + 4, 14, 21, '#ffffff'); R(bx + 1, by + 24, 14, 1, '#d8d2c4');
          R(bx + 3, by + 5, 10, 5, '#eaf6ff'); R(bx + 3, by + 9.5, 10, 0.5, '#c9dbe8');
          R(bx + 1, by + 12, 14, 12, room.light); R(bx + 1, by + 12, 14, 1, room.pale); R(bx + 14, by + 12, 1, 12, room.color);
          R(bx + 1, by + 25, 1, 2, C.leg); R(bx + 14, by + 25, 1, 2, C.leg);
        });
      }
      thing(f.y + 29, () => {
        const cx = b0 + 17;
        R(b0 - 2, f.y + 1, 40, 0.5, '#9aa0b0');
        R(cx - 1, f.y + 1, 4, 27, '#bfe6e0'); R(cx - 1, f.y + 1, 1, 27, '#8fcabf');
        for (let y = f.y + 3; y < f.y + 26; y += 4) R(cx + 1.5, y, 1, 2, '#8fcabf');
      });
      r.keepClear.push({ x: b0 - 4, y: f.y, w: 44, h: 32 });
      const cx = doorRight ? b0 + 44 : b0 - 18, cy = f.y + 2;
      block(cx, cy + 12, 14, 9);
      r.keepClear.push({ x: cx - 2, y: cy, w: 18, h: 24 });
      thing(cy + 21, () => {
        R(cx, cy + 20, 14, 1, C.shadow);
        R(cx - 0.5, cy - 0.5, 15, 21, C.out); R(cx, cy, 14, 20, '#f4f4f4'); R(cx, cy, 14, 1, '#ffffff');
        R(cx + 1, cy + 2, 12, 8, '#cfe9f2'); R(cx + 6.5, cy + 2, 1, 8, '#9ab8c8');
        R(cx + 2, cy + 6, 2, 3.5, '#ffd36b'); R(cx + 4.5, cy + 5, 1.5, 4.5, '#e0475a'); R(cx + 8, cy + 6, 2, 3.5, '#ffffff'); R(cx + 10.5, cy + 4.5, 1.5, 5, '#7fb3e0');
        R(cx + 5.5, cy + 12, 3, 7, room.color); R(cx + 3.5, cy + 14, 7, 3, room.color);
      });
      const dx = mid - 11, dy = f.y + 36;
      block(dx, dy, 22, 9);
      thing(dy + 9, () => {
        desk(dx, dy, 22, 7, false);
        R(dx + 2, dy - 2, 6, 2.5, '#ffffff'); R(dx + 2, dy - 2, 6, 0.5, '#7a7a8a');
        R(dx + 12, dy - 3, 3, 3, room.light); R(dx + 17, dy - 2, 3, 2, '#ffffff'); R(dx + 18, dy - 3, 1, 1, '#e0475a');
      });
      r.tpos = { x: dx + 11, y: dy - 1 };
      r.npcSeat = { x: doorRight ? b0 + 8 : b0 + 28, y: f.y + 37 };
    } else if (key === 'principal') {
      // 큰 책상과 명패, 학교 깃발, 손님 소파
      const dw = 36, dx = mid - dw / 2, dy = f.y + 14;
      r.keepClear.push({ x: dx - 16, y: f.y, w: dw + 32, h: 30 });
      block(dx, dy, dw, 10);
      thing(dy + 11, () => {
        R(dx + 13, dy - 9, 10, 9, '#5a2f3a'); R(dx + 13, dy - 9, 10, 1, '#8a4a5a');
        R(dx, dy + 10, dw, 1, C.shadow);
        R(dx, dy, dw, 9, '#7a4a2a'); R(dx, dy, dw, 1.5, '#b07a4a'); R(dx + 2, dy + 3, dw - 4, 5, '#6a3a20');
        R(dx + 12, dy - 2, 12, 3, '#f2c14e'); R(dx + 12, dy - 2, 12, 0.5, '#fff1b8');
        R(dx + 3, dy - 2, 5, 2, '#ffffff'); R(dx + 4, dy - 3, 3, 1, '#ffffff');
        R(dx + 28, dy - 3, 3, 3, '#3a3346'); R(dx + 27.5, dy - 1, 4, 1, '#3a3346');
      });
      const fx = dx - 10;
      block(fx, dy + 6, 4, 4);
      thing(dy + 10, () => {
        R(fx, dy + 9, 4, 1, C.shadow); R(fx + 1.5, dy - 14, 1, 24, '#c9a24e'); R(fx + 1, dy - 15, 2, 1.5, '#f2c14e');
        R(fx + 2.5, dy - 13, 8, 6, room.color); R(fx + 2.5, dy - 13, 8, 0.5, room.light); R(fx + 5, dy - 11.5, 3, 3, '#ffffff'); R(fx + 6, dy - 11, 1, 2, room.color);
      });
      r.tpos = { x: dx + dw + 8, y: dy + 8 };
      // 좁은 방(휴대폰 세로)에서는 소파를 아래로 내려 교장 선생님 말풍선이 교감 선생님 얼굴을 가리지 않게
      const ox = doorRight ? f.x + 6 : f.x + f.w - 30, sy = f.y + (f.w < 120 ? 62 : 34);
      r.keepClear.push({ x: ox - 4, y: sy - 2, w: 32, h: 32 });
      for (const y of [sy, sy + 20]) {
        block(ox, y + 1, 24, 6);
        thing(y + 7, () => {
          R(ox + 1, y + 7, 22, 1, C.shadow);
          R(ox, y, 24, 7, '#5a2f3a'); R(ox, y, 24, 1, '#8a4a5a'); R(ox + 2, y + 2, 20, 4, '#7a3f4e'); R(ox + 12, y + 2, 0.5, 4, '#5a2f3a');
        });
      }
      block(ox + 3, sy + 11, 18, 5);
      thing(sy + 16, () => {
        R(ox + 4, sy + 16, 16, 1, C.shadow); R(ox + 3, sy + 11, 18, 4, '#c98d5a'); R(ox + 3, sy + 11, 18, 0.5, '#e8b98a');
        R(ox + 6, sy + 9, 3, 2.5, '#ffffff'); R(ox + 13, sy + 10, 5, 1.5, '#ffd36b');
      });
      r.npcSeat = { x: doorRight ? ox + 32 : ox - 12, y: sy + 18 };
    } else if (key === 'office') {
      // 선생님 책상(모니터·서류)
      const cols = Math.max(1, Math.floor((f.w - 24) / 30)), rows = Math.max(1, Math.min(3, Math.floor((f.h - 10) / 28)));
      const gx = f.x + Math.round((f.w - cols * 30) / 2) + 4, gy = f.y + 8;
      const spots = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = gx + i * 30, y = gy + j * 28, seed = i * 7 + j * 3;
        if (Math.abs(x + 11 - e.x) < 24 && Math.abs(y + 6 - e.y) < 26) continue;
        block(x, y + 1, 22, 9);
        thing(y + 10, () => {
          desk(x, y + 2, 22, 6, false);
          R(x + 3, y - 5, 9, 7, C.out); R(x + 3.5, y - 4.5, 8, 5.5, '#7fc6e8'); R(x + 4, y - 4, 3, 0.5, '#ffffff'); R(x + 7, y + 1.5, 1, 1, C.out);
          R(x + 14, y, 6, 2, '#ffffff'); R(x + 14.5, y - 1, 5, 1, hash(seed, 3) > 0.5 ? '#ffd36b' : '#ffffff');
          if (hash(seed, 9) > 0.5) { R(x + 1, y + 1, 2, 2, room.light); R(x + 1, y + 1, 2, 0.5, '#6b4228'); }
        });
        spots.push({ x: x + 11, y: y + 18 });
        thing(y + 20, () => { R(x + 7, y + 14, 8, 4, C.chair); R(x + 7, y + 14, 8, 0.5, C.chairHi); R(x + 7.5, y + 18, 0.5, 2, C.leg); R(x + 14, y + 18, 0.5, 2, C.leg); });
      }
      r.tpos = spots[0];
      r.npcSeat = spots.length > 1 ? spots[spots.length - 1] : null;
      r.extras = spots.slice(1, -1).slice(0, OFFICE_EXTRA.length).map((pos, k) => ({ sp: OFFICE_EXTRA[k], pos }));
      for (const x of r.extras) block(x.pos.x - 4, x.pos.y - 4, 8, 5);
    } else if (key === 'lounge') {
      // 봉쿱: 왼쪽 위 소파와 건의함, 낮은 탁자, 벤치, 오른쪽 위 구석 음료 자판기
      const sw = 34, sx0 = f.x + 6, sy0 = f.y + 4;
      const vx = f.x + f.w - 18, vy = f.y + 1;
      block(vx, vy + 6, 14, 18);
      r.keepClear.push({ x: vx - 4, y: f.y, w: 22, h: 40 });
      thing(vy + 24, () => vendingArt(vx, vy));
      L.vend = { x: vx, y: vy, spot: { x: vx + 7, y: vy + 32 } };
      block(sx0, sy0 + 2, sw, 10);
      r.keepClear.push({ x: sx0 - 4, y: f.y, w: sw + 8, h: 30 });
      thing(sy0 + 12, () => {
        R(sx0 + 1, sy0 + 12, sw - 2, 1, C.shadow);
        R(sx0, sy0, sw, 6, room.color); R(sx0, sy0, sw, 1, room.light);
        R(sx0 - 1, sy0 + 4, 4, 8, room.dark); R(sx0 + sw - 3, sy0 + 4, 4, 8, room.dark);
        R(sx0 + 3, sy0 + 6, sw - 6, 5, room.light); R(sx0 + sw / 2, sy0 + 6, 0.5, 5, room.color);
        R(sx0 + 5, sy0 + 2, 5, 4, '#7fb3e0'); R(sx0 + sw - 10, sy0 + 2, 5, 4, '#ff8fa3');
      });
      const tx = sx0 + 8, ty = sy0 + 18;
      block(tx, ty, 18, 6);
      thing(ty + 6, () => {
        R(tx + 1, ty + 6, 16, 1, C.shadow);
        R(tx, ty, 18, 4, '#c98d5a'); R(tx, ty, 18, 0.5, '#e8b98a'); R(tx + 1, ty + 4, 1, 2, C.leg); R(tx + 16, ty + 4, 1, 2, C.leg);
        R(tx + 3, ty - 2, 4, 2.5, '#ffd36b'); R(tx + 10, ty - 2, 3, 2.5, '#ffffff'); R(tx + 10, ty - 2, 3, 0.5, '#5bb36b');
      });
      const bx = sx0 + sw + 8, by = f.y + 8;
      block(bx, by + 8, 10, 4);
      thing(by + 13, () => {
        R(bx + 1, by + 13, 9, 1, C.shadow); R(bx + 2, by + 9, 1, 4, C.leg); R(bx + 7, by + 9, 1, 4, C.leg);
        R(bx - 0.5, by - 0.5, 11, 10, C.out); R(bx, by, 10, 9, room.color); R(bx, by, 10, 1, room.light);
        R(bx + 2, by + 2, 6, 1, C.out); R(bx + 2, by + 5, 6, 2.5, '#ffffff'); R(bx + 3, by + 5.5, 4, 0.5, room.dark); R(bx + 3, by + 6.5, 3, 0.5, room.dark);
      });
      r.keepClear.push({ x: bx - 2, y: by, w: 14, h: 16 });
      const sx = doorRight ? f.x + 6 : f.x + f.w - 32, sy = f.y + f.h - 14;
      block(sx, sy + 1, 26, 5);
      thing(sy + 6, () => {
        R(sx + 1, sy + 7, 24, 1, C.shadow);
        R(sx, sy - 3, 26, 3, room.dark); R(sx, sy, 26, 4, room.color); R(sx, sy, 26, 1, room.light);
        R(sx + 1, sy + 4, 1, 3, C.leg); R(sx + 24, sy + 4, 1, 3, C.leg);
      });
      r.keepClear.push({ x: sx - 2, y: sy - 6, w: 30, h: 16 });
      // 좁은 방(휴대폰 세로)에서는 자판기와 겹치지 않게 건의함 앞에 선다
      r.tpos = f.w < 120 ? { x: bx + 5, y: f.y + 31 } : { x: bx + 24, y: f.y + 24 };
      r.npcSeat = { x: sx + 13, y: sy + 2 };
      if (L.night) {
        // 저녁 자습실: 깔개 위에 개인 책상을 줄지어 놓는다(학생은 책상 뒤에서 앞을 본다)
        r.studySeats = [];
        const SX = 19, SY = 25, wide = f.w >= 120;
        const ax = f.x + 6, ay = f.y + 40, aw = f.w - 12, ah = f.h - 46;
        const nc = Math.floor(aw / SX), gx = ax + Math.round((aw - nc * SX) / 2) + 2;
        // 가로 화면(낮고 넓은 방): 탁자 아래로 두 줄, 문에서 선생님 자리까지 오른쪽(문 쪽) 통로를 비운다
        let rows;
        if (wide) rows = [f.y + 28, f.y + 28 + SY].filter((y) => y + 8 <= f.y + f.h - 4);
        else {
          const nr = Math.max(0, Math.floor(ah / SY)), gy = ay + Math.round((ah - nr * SY) / 2);
          rows = Array.from({ length: nr }, (_, j) => gy + j * SY + 16);
        }
        const ok = (x, y) => [[r.tpos, 17], [r.npcSeat, 20], [e, 18], [L.vend.spot, 14]].every(([q, d]) => Math.hypot(x + 7 - q.x, y + 2 - q.y) > d)
          && !(wide && Math.abs(x + 7 - e.x) < 16)
          && !r.keepClear.some((k) => hits(x - 1, y - 16, 16, 24, k));
        for (let j = 0; j < rows.length; j++) for (let i = 0; i < nc; i++) {
          const x = gx + i * SX, y = rows[j];
          if (!ok(x, y)) continue;
          block(x, y - 3, 14, 9);
          // 책상을 학생 허리 높이에 그려서(학생보다 나중에) 앉아 있는 것처럼 보이게
          thing(y + 7, () => {
            R(x + 1, y + 5, 12, 1, C.shadow);
            R(x, y - 3, 14, 5, '#d9b48a'); R(x, y - 3, 14, 0.5, '#f0d2a8'); R(x, y + 1.5, 14, 0.5, '#b08a60');
            R(x + 1, y + 2, 1, 3, C.leg); R(x + 12, y + 2, 1, 3, C.leg);
            studyBook(x + 4, y - 3.5, i + j * 3 + 1);
          });
          r.studySeats.push({ x: x + 7, y: y + 2, dir: 'down' });
        }
        r.talkSpots = r.studySeats; r.talkLines = STUDY.kid.crowd;
      }
    } else if (key === 'cafeteria') {
      // 배식대(밥·국·반찬)와 긴 식탁
      const cw = Math.min(f.w - 44, 96), cx = doorRight ? f.x + 6 : f.x + f.w - cw - 6, cy = f.y + 4;
      block(cx, cy, cw, 10);
      r.keepClear.push({ x: cx - 2, y: f.y, w: cw + 4, h: 18 });
      thing(cy + 11, () => {
        R(cx, cy + 10, cw, 1, C.shadow);
        R(cx, cy, cw, 10, '#c9ccd6'); R(cx, cy, cw, 1.5, '#ffffff'); R(cx, cy + 8, cw, 2, '#9aa0b0');
        const foods = ['#ffffff', '#ff9a52', '#6fbf5a', '#e0475a', '#f2c14e'];
        if (L.night) {
          // 야간 자습실: 배식대 셔터를 내리고 '자습실' 안내
          R(cx + 1, cy + 1, cw - 2, 7, '#aab0bf');
          for (let y = cy + 2; y < cy + 8; y += 2) R(cx + 1, y, cw - 2, 0.5, '#8a90a0');
        } else for (let x = cx + 3, k = 0; x + 9 < cx + cw; x += 12, k++) {
          R(x, cy + 2, 9, 4, '#7a7f8e'); R(x + 0.5, cy + 2.5, 8, 3, foods[k % foods.length]);
          if (!reduceMotion && k % 2 === 1) R(x + 3, cy - 1, 1, 2, 'rgba(255,255,255,.7)');
        }
        R(cx + cw - 7, cy - 4, 6, 4, '#7d9cc0'); R(cx + cw - 7, cy - 4, 6, 0.5, '#ffffff'); R(cx + cw - 7, cy - 2, 6, 0.5, '#58789c');
      });
      r.tpos = { x: doorRight ? cx + cw + 7 : cx - 7, y: cy + 9 };
      const tw = 40, x0 = doorRight ? f.x + 8 : f.x + 50, x1 = doorRight ? f.x + f.w - 50 : f.x + f.w - 8;
      const ncol = Math.max(1, Math.floor((x1 - x0 + 14) / (tw + 14)));
      const tx0 = Math.round(x0 + (x1 - x0 - (ncol * (tw + 14) - 14)) / 2);
      const tables = [];
      for (let y = f.y + 26; y + 18 < f.y + f.h; y += 26) for (let c = 0; c < ncol; c++) {
        const x = tx0 + c * (tw + 14);
        if (Math.abs(x + tw / 2 - e.x) < 34 && Math.abs(y + 4 - e.y) < 26) continue;
        tables.push({ x, y });
        block(x, y, tw, 8);
        thing(y + 8, () => {
          R(x, y - 4, tw, 3, room.dark); R(x, y - 4, tw, 0.5, room.light);
          R(x + 1, y + 9, tw - 2, 1, C.shadow);
          R(x, y, tw, 7, '#f4f1ea'); R(x, y, tw, 1, '#ffffff'); R(x, y + 6, tw, 1, '#d8d2c4');
          if (L.night) for (let k = 4, n = 0; k < tw - 6; k += 12, n++) studyBook(x + k, y + 1, n + x);
          else for (let k = 4; k < tw - 6; k += 12) { R(x + k, y + 2, 6, 3, '#9aa0b0'); R(x + k + 1, y + 2.5, 2, 2, '#ffffff'); R(x + k + 3.5, y + 2.5, 2, 2, '#ff9a52'); }
          R(x + 1, y + 7, 1, 2, C.leg); R(x + tw - 2, y + 7, 1, 2, C.leg);
        });
        thing(y + 13, () => { R(x, y + 10, tw, 3, room.dark); R(x, y + 10, tw, 0.5, room.light); });
      }
      const t = tables[0];
      r.npcSeat = t ? { x: t.x + 10, y: t.y + 14 } : null;
      // 점심시간에 학생들이 앉을 자리: 식탁마다 앞 의자 둘(위를 봄), 맨 윗줄 식탁은 뒤 의자 둘(아래를 봄)도
      r.lunchSeats = [];
      const top = tables.length ? Math.min(...tables.map((tb) => tb.y)) : 0;
      for (const tb of tables) for (const dx of [10, 30]) {
        if (tb.y === top) r.lunchSeats.push({ x: tb.x + dx, y: tb.y - 1, dir: 'down' });
        if (!(tb === t && dx === 10)) r.lunchSeats.push({ x: tb.x + dx, y: tb.y + 14, dir: 'up' });
      }
      if (L.night) { r.studySeats = r.lunchSeats; r.talkSpots = r.studySeats; r.talkLines = STUDY.kid.crowd; }
    } else if (key === 'gym') {
      // 농구 골대, 공 바구니, 굴러다니는 공
      const hx = f.x + f.w - 34, hy = f.y + 2;
      block(hx + 6, hy + 16, 4, 4);
      r.keepClear.push({ x: hx - 2, y: f.y, w: 20, h: 26 });
      thing(hy + 20, () => {
        R(hx + 4, hy + 19, 8, 1, C.shadow); R(hx + 7, hy + 9, 2, 11, '#7a7f8e'); R(hx + 4, hy + 18, 8, 2, '#5a5060');
        R(hx - 0.5, hy - 0.5, 17, 10, C.out); R(hx, hy, 16, 9, '#ffffff'); R(hx + 5, hy + 3, 6, 4, 'rgba(0,0,0,0)');
        R(hx + 5, hy + 3, 6, 0.5, '#e0475a'); R(hx + 5, hy + 3, 0.5, 4, '#e0475a'); R(hx + 10.5, hy + 3, 0.5, 4, '#e0475a');
        R(hx + 4, hy + 8, 8, 1, '#ff7a2a'); R(hx + 5, hy + 9, 1, 3, '#ffffff'); R(hx + 7.5, hy + 9, 1, 3, '#ffffff'); R(hx + 10, hy + 9, 1, 3, '#ffffff');
      });
      const cs = [{ x: f.x + 4, y: f.y + f.h - 18 }, { x: f.x + f.w - 22, y: f.y + f.h - 18 }, { x: f.x + 4, y: f.y + 4 }]
        .sort((a, b) => Math.hypot(b.x - e.x, b.y - e.y) - Math.hypot(a.x - e.x, a.y - e.y));
      const c = cs[0];
      block(c.x, c.y + 8, 16, 8);
      r.keepClear.push({ x: c.x - 2, y: c.y - 2, w: 20, h: 20 });
      thing(c.y + 16, () => {
        R(c.x + 1, c.y + 16, 14, 1, C.shadow);
        for (const [bx, by, col] of [[2, 2, '#ff7a2a'], [8, 1, '#ffffff'], [5, 5, '#ff7a2a'], [10, 5, '#f2c14e']]) {
          R(c.x + bx, c.y + by, 5, 5, col); R(c.x + bx + 1, c.y + by, 3, 0.5, 'rgba(255,255,255,.6)'); R(c.x + bx + 2, c.y + by, 0.5, 5, 'rgba(0,0,0,.35)');
        }
        R(c.x, c.y + 8, 16, 7, '#7a7f8e'); R(c.x, c.y + 8, 16, 1, '#c9ccd6');
        for (let x = c.x + 2; x < c.x + 15; x += 3) R(x, c.y + 9, 0.5, 6, '#5a5060');
        R(c.x + 1, c.y + 15, 2, 1.5, C.out); R(c.x + 13, c.y + 15, 2, 1.5, C.out);
      });
      r.tpos = { x: mid - (doorRight ? 18 : -18), y: Math.round(f.y + f.h * 0.6) };
      r.npcSeat = { x: hx + 8, y: hy + 32 };
      if (L.night) {
        // 저녁 레슬링부: 코트 위에 파란 매트를 깔고 두 명씩 짝지어 연습한다
        const mx = f.x + 10, my = f.y + 22, mw = f.w - 20, mh = f.h - 30;
        L.things.push({ y: -1, fn: () => {
          R(mx, my, mw, mh, '#3b6fb6'); R(mx, my, mw, 1, '#6f9be0'); R(mx, my + mh - 1, mw, 1, '#26487a');
          R(mx + 4, my + 4, mw - 8, mh - 8, '#4a80c8');
          const cx = mx + mw / 2, cy = my + mh / 2, rr = Math.min(mw, mh) / 2 - 6;
          for (let a = 0; a < 48; a++) R(Math.round(cx + Math.cos(a / 48 * Math.PI * 2) * rr), Math.round(cy + Math.sin(a / 48 * Math.PI * 2) * rr * 0.8), 1, 1, '#e8c547');
        } });
        r.wrestle = [];
        const clear = (x, y) => [[r.tpos, 20], [e, 22]].every(([q, d]) => Math.hypot(x - q.x, y - q.y) > d)
          && !r.keepClear.some((k) => hits(x - 12, y - 18, 24, 22, k));
        const SX = 34, SY = 28, nc = Math.max(1, Math.floor((mw - 4) / SX)), nr = Math.max(1, Math.floor((mh - 4) / SY));
        const gx = mx + Math.round((mw - nc * SX) / 2) + SX / 2, gy = my + Math.round((mh - nr * SY) / 2) + SY - 6;
        for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
          const x = Math.round(gx + i * SX), y = Math.round(gy + j * SY);
          if (!clear(x, y)) continue;
          block(x - 11, y - 4, 22, 5);
          r.wrestle.push({ x, y });
        }
        r.talkSpots = r.wrestle.flatMap((w) => [{ x: w.x - 6, y: w.y }, { x: w.x + 6, y: w.y }]);
        r.talkLines = WRESTLE.crowd;
      }
      for (const [bx, by] of L.night ? [] : [[mid - 30, f.y + f.h - 12], [mid + 22, f.y + 30]]) {
        if (Math.hypot(bx - e.x, by - e.y) < 22) continue;
        thing(by + 1, () => { R(bx + 0.5, by + 1, 4, 1, C.shadow); R(bx, by - 4, 5, 5, '#ff7a2a'); R(bx + 1, by - 4, 3, 0.5, 'rgba(255,255,255,.6)'); R(bx + 2, by - 4, 0.5, 5, 'rgba(0,0,0,.35)'); });
      }
    }
    for (const q of [r.tpos, r.npcSeat]) if (q) L.obst.push({ x: q.x - 4, y: q.y - 4, w: 8, h: 5 });
  }

  // 강아지 '뭉치'(12×11): o 테두리, E 귀·꼬리, W 털, P 얼룩, e 눈, n 코, m 혀
  const DOG = ['.oo......oo.', 'oEEooooooEEo', 'oEEWWWWWWEEo', '.oWWWWWWWWo.', '.oWeWWWWeWo.', '.oWWWnnWWWo.',
    '..oWWmmWWo..', '..oPWWWWWo..', '..oPWWWWWo..', '..oWoWWoWo..', '..oooooooo..'];
  const DOGPAL = { o: '#2b1d2e', E: '#b5835a', W: '#fff4e0', P: '#e8c49a', e: '#2b1d2e', n: '#2b1d2e', m: '#ff8fa3' };
  const dogCache = new Map();
  function dogSprite(happy, wag, blink) {
    const key = `${happy}${wag}${blink}`;
    if (dogCache.has(key)) return dogCache.get(key);
    const c = document.createElement('canvas'); c.width = 12; c.height = 11;
    const x = c.getContext('2d');
    DOG.forEach((row, j) => [...row].forEach((ch, i) => {
      let col = DOGPAL[ch];
      if (ch === 'm' && !happy) col = DOGPAL.W;
      if (ch === 'e' && blink) col = j === 4 ? '#b5835a' : col;
      if (!col) return;
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
    }));
    // 꼬리: 신나면 위아래로 흔든다
    x.fillStyle = DOGPAL.E; x.fillRect(10, 8, 1, 1); x.fillRect(11, wag ? 6 : 8, 1, 2);
    dogCache.set(key, c);
    return c;
  }
  function drawDog(dg) {
    const near = mode === 'play' && Math.hypot(P.x - dg.x, P.y - dg.y) < 34;
    const wag = !reduceMotion && Math.floor(clock * (near ? 8 : 1.5)) % 2 === 0;
    const bob = near && !reduceMotion && Math.floor(clock * 4) % 2 ? -1 : 0;
    shadowAt(dg.x, dg.y, 10);
    g.drawImage(dogSprite(near, wag, blinking(5)), rnd(dg.x - 6), rnd(dg.y - 11 + bob + hop(4)));
    if (near && !reduceMotion && Math.floor(clock * 2) % 2) { // 작은 하트
      const hx = rnd(dg.x + 4), hy = rnd(dg.y - 16);
      R(hx, hy, 1, 1, '#ff6f91'); R(hx + 2, hy, 1, 1, '#ff6f91'); R(hx - 0, hy + 1, 3, 1, '#ff6f91'); R(hx + 1, hy + 2, 1, 1, '#ff6f91');
    }
  }
  const DOG_LINES = ['멍! 위클래스 강아지 뭉치가 꼬리를 흔든다', '뭉치가 손바닥에 코를 콕 댄다. 마음이 조금 말랑해졌다', '뭉치가 "멍멍!" 하고 반겨 준다. 오늘도 수고했다는 뜻 같다', '뭉치가 배를 보이며 벌러덩 눕는다'];
  let dogN = 0;

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
      // 표지판은 같은 크기로 한 번씩: 1반 앞 '뛰지 맙시다', 2반 앞 '정숙', 진로카페 앞은 게시판
      if (r.i === 0) sign(r.x + 8, r.y + r.h - 12, 48, 11, L.f1 ? '복도 우측 통행' : '뛰지 맙시다');
      if (r.i === 1) sign(r.x + 8, r.y + r.h - 12, 48, 11, L.f1 ? '노크해 주세요' : '정숙');
      if (room.key === 'cafe') {
        // 복도 게시판: 가까이 가거나 누르면 진로 선생님께 메시지를 남긴다
        const nb = r.x + 6, by = r.y + r.h - 11, bw = 24;
        R(nb - 1, by - 1, bw + 2, 10, C.out); R(nb, by, bw, 8, C.frame); R(nb + 1, by + 1, bw - 2, 6, '#d9a86b');
        [['#ffffff', 2], ['#ffd36b', 7], ['#a8dcef', 12]].forEach(([c, ox], i) => {
          R(nb + ox, by + 2 + (i % 2), 4, 3, c); R(nb + ox + 1.5, by + 2 + (i % 2), 1, 1, '#e0475a');
        });
        // 편지 봉투
        R(nb + 17, by + 2, 5, 4, '#ffffff'); R(nb + 18, by + 3, 1, 1, '#e0475a'); R(nb + 20, by + 3, 1, 1, '#e0475a'); R(nb + 19, by + 4, 1, 1, '#e0475a');
        L.board = { x: nb - 1, y: by - 1, w: bw + 2, h: 10, spot: { x: nb + 12, y: L.walkHall.y + 6 } };
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
    // 소리 파일로 미리 만들 때(맥 사파리)는 tone·noise가 이 오프라인 오디오에 그린다
    let target = null, tmaster = null;
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
    // 사파리용: 누를 때마다 소리 없는 아주 짧은 버퍼를 재생해 오디오 출력을 깨워 둔다
    const out = () => master;
    function poke(a) {
      try {
        const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource();
        s.buffer = b; s.connect(a.destination); s.start(0);
      } catch (e) { /* 무시 */ }
    }
    function unlock() {
      // 맥 사파리는 켜 둔 오디오를 나중에 스스로 멈출 때가 있어서, 누를 때마다 확인한다(켜져 있으면 아무것도 안 함)
      if (ac && ac.state === 'running') { poke(ac); return; }
      if (ac && ac.state === 'closed') ac.__stale = true;
      // 지난번 누름에서 깨워 봤는데도 멈춘 채(suspended·interrupted)라면 버리고, 이번 누름 안에서 새로 만든다.
      // 처음엔 잘 켜졌다가 나중에(탭 전환·잠자기·다른 소리) 멈춘 오디오도 여기서 다시 살아난다.
      if (ac && ac.__stale) { try { ac.close(); } catch (e) { /* 무시 */ } ac = null; noiseBuf = null; }
      const a = ctx(true); if (!a) return;
      poke(a);
      // 잠깐 기다려도 켜지지 않으면 다음 누름 때 새로 만들도록 표시해 둔다
      setTimeout(() => { if (a === ac && a.state !== 'running') a.__stale = true; }, 250);
    }
    function tone(freq, t0, dur, type, vol, slide) {
      const a = target || ctx(); if (!a) return;
      const master = target ? tmaster : out();
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
      const a = target || ctx(); if (!a) return;
      const master = target ? tmaster : out();
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, Math.floor(a.sampleRate * 0.5), a.sampleRate);
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
    const FX = {
      step0: () => { noise(0, 0.045, 0.28, 1000, 2.5); tone(130, 0, 0.035, 'triangle', 0.25); },
      step1: () => { noise(0, 0.045, 0.28, 1400, 2.5); tone(150, 0, 0.035, 'triangle', 0.25); },
      bump: () => tone(110, 0, 0.09, 'square', 0.25, 0.6),
      move: () => tone(988, 0, 0.045, 'square', 0.28),
      select: () => seq([523, 659, 784, 1047], 0.055, 0.09, 'square', 0.32),
      chime: () => { tone(784, 0, 0.08, 'triangle', 0.5); tone(1175, 0.08, 0.16, 'triangle', 0.45); },
      type: () => tone(1320 + Math.random() * 120, 0, 0.018, 'square', 0.08),
      enter: () => { noise(0, 0.16, 0.35, 2200, 0.8); seq([392, 523, 659, 784, 1047], 0.06, 0.1, 'square', 0.32, 0.1); tone(1568, 0.42, 0.25, 'triangle', 0.3); },
      exit: () => { seq([784, 659, 523, 392], 0.065, 0.1, 'square', 0.28); noise(0.27, 0.14, 0.28, 1800, 0.8); },
      toggle: () => { tone(660, 0, 0.06, 'square', 0.3); tone(880, 0.06, 0.08, 'square', 0.3); },
      door: () => { noise(0, 0.12, 0.25, 2600, 0.9); tone(523, 0.05, 0.07, 'triangle', 0.3); tone(659, 0.11, 0.09, 'triangle', 0.3); },
      stamp: () => { noise(0, 0.07, 0.45, 500, 1.2); tone(196, 0, 0.08, 'square', 0.3); tone(784, 0.09, 0.12, 'triangle', 0.4); },
      pickup: () => seq([1047, 1319, 1568, 2093], 0.045, 0.08, 'square', 0.3),
      warn: () => { tone(880, 0, 0.12, 'square', 0.3); tone(698, 0.14, 0.18, 'square', 0.3); },
      party: () => { seq([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.08, 0.12, 'square', 0.3); seq([262, 0, 392, 0, 262, 0, 392, 523], 0.08, 0.14, 'triangle', 0.35); },
      ok: () => seq([659, 880, 1319], 0.07, 0.12, 'square', 0.3),
      no: () => { tone(330, 0, 0.14, 'square', 0.28, 0.7); tone(262, 0.15, 0.2, 'square', 0.28, 0.7); },
      bark: () => { tone(700, 0, 0.07, 'square', 0.3, 0.6); tone(640, 0.11, 0.09, 'square', 0.28, 0.55); },
      stairs: () => { for (let i = 0; i < 4; i++) { noise(i * 0.1, 0.05, 0.3, 1100 - i * 120, 2.5); tone(196 - i * 14, i * 0.1, 0.04, 'triangle', 0.25); } },
    };

    // 맥 사파리: 시험해 보니 Web Audio로 직접 내는 소리는 들리지 않고 audio 태그 소리만 들렸다(2026-11 Safari 27).
    // 그래서 효과음을 처음에 소리 파일(WAV)로 한 번 만들어 두고 audio 태그로 재생한다.
    // 아이폰은 Web Audio가 잘 되고 무음 모드도 지켜 주므로 그대로 둔다. 주소에 ?media / ?webaudio 를 붙이면 강제로 고를 수 있다.
    const ua = navigator.userAgent;
    const MEDIA = /[?&]media\b/.test(location.search) || (!/[?&]webaudio\b/.test(location.search) &&
      /Macintosh/.test(ua) && /Version\/[\d.]+.*Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua) && !(navigator.maxTouchPoints > 1));
    const pools = {};
    let primed = false, played = 0, failed = 0;
    function wavURL(buf, full) {
      const d = buf.getChannelData(0), sr = buf.sampleRate;
      let end = d.length; while (!full && end > 1 && Math.abs(d[end - 1]) < 1e-4) end--;
      const n = Math.min(d.length, end + Math.floor(sr * 0.02));
      const bytes = new Uint8Array(44 + n * 2), v = new DataView(bytes.buffer);
      const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
      let bin = ''; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      return 'data:audio/wav;base64,' + btoa(bin);
    }
    async function renderAll() {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC) return;
      for (const name of Object.keys(FX)) {
        await new Promise((r) => setTimeout(r, 0)); // 한 번에 몰아서 만들지 않아 화면이 멈추지 않게
        try {
          const oc = new OAC(1, 22050, 22050);
          target = oc; tmaster = oc.createGain(); tmaster.gain.value = 0.3; tmaster.connect(oc.destination);
          noiseBuf = null; FX[name]();
          target = null; tmaster = null; noiseBuf = null;
          const buf = await oc.startRendering();
          const url = wavURL(buf), n = name === 'type' || name.startsWith('step') ? 4 : 2;
          pools[name] = Array.from({ length: n }, () => { const el = new Audio(url); el.preload = 'auto'; return el; });
          pools[name].i = 0;
          if (primed) pools[name].forEach(prime);
        } catch (e) { target = null; tmaster = null; }
      }
    }
    // 처음 누를 때 모든 audio 태그를 소리 없이 한 번 재생해 두면, 그다음부터는 언제든 바로 소리가 난다
    function prime(el) {
      el.muted = true; el.__want = false;
      const p = el.play();
      // 그사이 진짜로 울리라고 한 태그(첫 선택음 등)는 멈추지 않는다
      const done = () => { if (!el.__want) { el.pause(); el.currentTime = 0; } el.muted = false; };
      if (p && p.then) p.then(done, () => { el.muted = false; }); else done();
    }
    function playMedia(name) {
      const pool = pools[name];
      if (!on || !pool) return false;
      const el = pool[pool.i = (pool.i + 1) % pool.length];
      try {
        el.__want = true; el.muted = false;
        el.currentTime = 0;
        const p = el.play();
        // audio 태그가 거절되면(보안 설정·권한) 그 소리만은 Web Audio로 낸다
        if (p && p.then) p.then(() => { played++; }, () => { failed++; FX[name](); }); else played++;
      } catch (e) { failed++; return false; }
      return true;
    }
    if (MEDIA) renderAll();
    const fx = (name) => () => { if (!(MEDIA && playMedia(name))) FX[name](); };

    // 배경 음악: 16초짜리 8마디 칩튠(직접 지은 곡, C–Am–F–G)을 한 번 소리 파일로 만들어 반복 재생한다.
    // 기본은 꺼 두고, 켜면 이 창(탭)에서는 켜 둔 채로 기억한다.
    const BEAT = 0.25, BARS = 8, BGM_LEN = BARS * 8 * BEAT;
    const NOTE = (n) => 440 * Math.pow(2, ({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[n[0]] + (+n[1] - 4) * 12) / 12);
    const MELODY = [
      [['E5', 1], ['G5', 1], ['C6', 2], ['B5', 1], ['A5', 1], ['G5', 2]],
      [['A5', 2], ['E5', 1], ['G5', 1], ['A5', 2], ['C6', 2]],
      [['C6', 1], ['A5', 1], ['F5', 2], ['G5', 1], ['A5', 1], ['F5', 2]],
      [['D5', 2], ['G5', 2], ['B5', 3], [null, 1]],
      [['E5', 1], ['G5', 1], ['C6', 2], ['D6', 1], ['C6', 1], ['B5', 2]],
      [['A5', 1], ['B5', 1], ['C6', 2], ['E5', 2], ['A5', 2]],
      [['F5', 1], ['A5', 1], ['C6', 1], ['A5', 1], ['G5', 1], ['B5', 1], ['D6', 2]],
      [['C6', 4], ['G5', 2], ['E5', 2]],
    ];
    const BASS = [['C3', 'G3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3'], ['C3', 'G3'], ['A2', 'E3'], ['F2', 'G2'], ['C3', 'G3']];
    function song() {
      MELODY.forEach((bar, b) => {
        let t = b * 8 * BEAT;
        for (const [n, len] of bar) { if (n) tone(NOTE(n), t, len * BEAT * 0.9, 'square', 0.09); t += len * BEAT; }
        for (let q = 0; q < 4; q++) tone(NOTE(BASS[b][q % 2]), b * 8 * BEAT + q * 2 * BEAT, BEAT * 1.6, 'triangle', 0.28);
        for (let h = 0; h < 8; h++) noise(b * 8 * BEAT + h * BEAT, 0.03, h % 2 ? 0.08 : 0.04, 7000, 1);
      });
    }
    let bgmBuf = null, bgmEl = null, bgmSrc = null, bgmBusy = false;
    let bgmWant = load('pixelSchoolBgm', sessionStorage) === true;
    async function renderBgm() {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OAC || bgmBuf || bgmBusy) return;
      bgmBusy = true;
      try {
        const oc = new OAC(1, Math.floor(22050 * BGM_LEN), 22050);
        target = oc; tmaster = oc.createGain(); tmaster.gain.value = 0.3; tmaster.connect(oc.destination);
        noiseBuf = null; song();
        target = null; tmaster = null; noiseBuf = null;
        bgmBuf = await oc.startRendering();
        if (MEDIA) { bgmEl = new Audio(wavURL(bgmBuf, true)); bgmEl.loop = true; bgmEl.preload = 'auto'; }
      } catch (e) { target = null; tmaster = null; noiseBuf = null; }
      bgmBusy = false;
      if (bgmWant) bgmStart();
    }
    function bgmStart() {
      if (!on || !bgmWant) return;
      if (!bgmBuf) { renderBgm(); return; }
      if (MEDIA && bgmEl && !bgmEl.__bad) {
        if (!bgmEl.paused) return;
        const p = bgmEl.play();
        // 누르기 전이라 거절된 것(NotAllowedError)은 다음 누름 때 다시, 그 밖의 거절은 Web Audio로
        if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') return; bgmEl.__bad = true; bgmStart(); });
        return;
      }
      const a = ctx(); if (!a || (bgmSrc && bgmSrc.__ac === a)) return;
      bgmStop();
      const s = a.createBufferSource(); s.buffer = bgmBuf; s.loop = true;
      s.connect(a.destination); s.__ac = a; s.start(); bgmSrc = s;
    }
    function bgmStop() {
      if (bgmEl) bgmEl.pause();
      if (bgmSrc) { try { bgmSrc.stop(); } catch (e) { /* 무시 */ } bgmSrc = null; }
    }
    // 곡은 페이지가 뜨고 조금 뒤에 미리 만들어 둔다(켜는 순간 바로 나오게)
    setTimeout(renderBgm, 1500);
    function unlockAll() {
      if (MEDIA && !primed) { primed = true; Object.values(pools).forEach((pl) => pl.forEach(prime)); }
      unlock();
      if (bgmWant) bgmStart();
    }
    return {
      get on() { return on; },
      set(v) { on = v; save('pixelSchoolSound', v, localStorage); if (v) unlockAll(); else bgmStop(); },
      get bgm() { return bgmWant; },
      setBgm(v) { bgmWant = v; save('pixelSchoolBgm', v, sessionStorage); if (v) { if (!on) this.set(true); unlockAll(); } else bgmStop(); },
      pauseBgm() { bgmStop(); },
      get bgmPlaying() { return MEDIA && bgmEl && !bgmEl.__bad ? !bgmEl.paused : !!(bgmSrc && ac && bgmSrc.__ac === ac && ac.state === 'running'); },
      unlock: unlockAll,
      // 뒤로 가기로 돌아온 페이지(bfcache)는 오디오가 멈춰 있을 수 있어 다음 누름 때 새로 만든다
      stale() { if (ac && ac.state !== 'running') ac.__stale = true; },
      get info() { return MEDIA ? `audio 태그 · 준비 ${Object.keys(pools).length}/${Object.keys(FX).length} · 재생 ${played} · 실패 ${failed}` : ac ? `${ac.state} · ${ac.sampleRate}Hz · t=${ac.currentTime.toFixed(2)}` : 'none'; },
      get state() { return MEDIA ? (primed ? 'media' : 'media-locked') : ac ? ac.state : 'none'; },
      get played() { return played; },
      step(alt) { fx(alt ? 'step1' : 'step0')(); },
      bump: fx('bump'), move: fx('move'), select: fx('select'), chime: fx('chime'), type: fx('type'), enter: fx('enter'), exit: fx('exit'),
      toggle: fx('toggle'), door: fx('door'), stamp: fx('stamp'), pickup: fx('pickup'), warn: fx('warn'), party: fx('party'), ok: fx('ok'), no: fx('no'), bark: fx('bark'), stairs: fx('stairs'),
    };
  })();


  /* ───────── 화면·상태 ───────── */
  const stage = $('#stage'), screen = $('#screen'), sctx = screen.getContext('2d');
  const buf = document.createElement('canvas'), g = buf.getContext('2d');
  const labels = $('#labels');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  let L = null, kid = null, mode = 'menu';
  // 지금 있는 층(2층: 교실, 1층: 보건실·급식실 등). 새로 고쳐도 같은 층에서 시작한다
  let floor = load('pixelSchoolFloor', sessionStorage) === 1 ? 1 : 2;
  const P = { x: 0, y: 0, dir: 'down', moving: false, anim: 0, path: [], lastStep: -1, quietRoom: null, room: null, runFor: 0, runBan: 0 };
  const keys = new Set();
  const padDirs = new Set();
  let dlg = null, armed = null, hoverRoom = null, scale = 2, k = 1, leaving = false, bumpAt = 0, party = 0, clock = 0;
  const found = new Set(load('pixelSchoolStars', localStorage) || []);

  /* ───────── 게임 요소: 출석 도장·심부름·시간대 ───────── */
  // 출석 도장: 1~6반 교실에 한 번씩 들어가면 도장. 6개를 모으면 진로카페에서 오늘의 음료
  const stamps = new Set(load('pixelSchoolStamps', localStorage) || []);
  const DRINKS = ['느긋한 일요일 코코아', '월요병 퇴치 아메리카노', '힘내라 화요 녹차라떼', '수요일의 꿀 유자차', '목요일의 딸기 우유', '불금 바닐라 라떼', '토요일의 초코 프라페'];
  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  // 심부름: 선생님이 맡긴 물건을 다른 반 선생님께 전하면서 사이트를 하나씩 알게 된다(방 번호 i: 0~5 교실, 6 진로카페)
  const QUESTS = [
    { from: 0, to: 3, item: '대입 가이드북', thanks: '마침 읽고 싶던 책이에요. 여기 4반에서는 읽은 책과 문장을 친구들과 나눠요.' },
    { from: 3, to: 6, item: '독서 감상문', thanks: '…흠, 감상문이군요. 잘 썼네요. 수고했으니 코코아 한 잔 줄게요.' },
  ];
  const quest = Object.assign({ q: 0, active: false }, load('pixelSchoolQuest', localStorage) || {});
  const saveQuest = () => save('pixelSchoolQuest', quest, localStorage);
  const roomName = (i) => (i < 6 ? (i + 1) + '반 ' : '진로카페 ') + (i < 6 ? TEACHERS[i] : SPECIAL[i - 6].staff).name;
  // 1층 미션: 한 번에 하나씩. 받는 사람은 '교실키:t'(선생님) / '교실키:s'(학생) / 'f2:번호'(2층 교실 선생님) / 'vend'(쉼터 자판기)
  const MISSIONS = [
    { id: 'notice', go: ['계단으로 2층 1반 김 선생님께 가자'], from: 'office:t', item: '가정통신문', to: ['f2:0'], hint: ['가정통신문 → 2층 1반 김 선생님'],
      ask: '2층 1반 김 선생님께 이 가정통신문 좀 전해 줄래요? 복도 끝 계단으로 올라가면 돼요.', thanks: '아, 가정통신문! 고마워요. 반 학생들에게 나눠 줄게요.' },
    { id: 'bandage', go: ['체육관 예준에게 반창고를 갖다주자'], from: 'nurse:t', item: '반창고', to: ['gym:s'], hint: ['반창고 → 체육관 예준'],
      ask: '체육관에서 예준이가 넘어져서 무릎이 까졌대요. 이 반창고 좀 갖다줄래요?', thanks: '반창고! 살았다… 고마워. 다음엔 조심해서 뛸게.' },
    { id: 'menu', go: ['봉쿱 가은에게 식단표를 전하자'], from: 'cafeteria:t', item: '이번 주 식단표', to: ['lounge:t'], hint: ['식단표 → 봉쿱 가은'],
      ask: '이번 주 식단표를 봉쿱 게시판에 붙이게 학생회장 가은이에게 전해 줄래요?', thanks: '식단표 왔다! 바로 붙일게. 와, 금요일에 치킨이네!' },
    { id: 'water', go: ['봉쿱 자판기에서 생수를 뽑자', '체육관 강 선생님께 생수를 갖다드리자'], from: 'gym:t', item: '생수', to: ['vend', 'gym:t'], hint: ['생수 → 봉쿱 자판기에서 뽑기', '생수 → 체육관 강 선생님'],
      ask: '목이 너무 마르네요. 봉쿱 안 자판기에서 물 한 병만 뽑아다 줄래요?', got: '자판기에서 생수 한 병을 뽑았다! 체육관 강 선생님께 가져가자.',
      thanks: '캬, 시원하다! 고마워요. 운동할 땐 물이 최고예요.' },
    { id: 'idea', go: ['교장실 교장 선생님께 가자'], from: 'lounge:t', item: '건의함 의견서', to: ['principal:t'], hint: ['건의함 의견서 → 교장 선생님'],
      ask: '건의함에 모인 의견서를 교장 선생님께 전해 줄래? 학생회 대표로 부탁해!', thanks: '학생들 의견이군요. "쉼터에 콘센트를 늘려 주세요"… 좋아요, 꼭 살펴볼게요.' },
  ];
  const ms = Object.assign({ done: [], cur: null, step: 0, fin: false }, load('pixelSchoolMissions', localStorage) || {});
  ms.done = (Array.isArray(ms.done) ? ms.done : []).filter((id) => MISSIONS.some((m) => m.id === id));
  const saveMs = () => save('pixelSchoolMissions', ms, localStorage);
  const curMission = () => MISSIONS.find((m) => m.id === ms.cur) || null;
  // 이 사람에게 말을 걸면 미션 대상이 되는지 가리는 열쇠
  const whoKey = (r, who) => (r.f1 ? `${r.room.key}:${who === 'student' ? 's' : 't'}` : who === 'student' ? null : 'f2:' + r.i);
  const giverOf = (wk) => (curMission() || isEve() ? null : MISSIONS.find((m) => m.from === wk && !ms.done.includes(m.id)) || null);
  // 받침 있으면 a(을), 없으면 b(를)
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return w + (c >= 0 && c < 11172 && c % 28 ? a : b); };
  // 시간대와 요일: 창밖 하늘 색과 선생님 한마디가 바뀐다
  function skyNow() {
    const h = new Date().getHours();
    if (h >= 20 || h < 5) return { top: '#1f2a5a', low: '#33407c', night: true };
    if (h < 7) return { top: '#f4b8a0', low: '#ffe1bf' };
    if (h >= 17) return { top: '#ff9a62', low: '#ffd08a' };
    return null; // 낮: 그려 둔 파란 하늘 그대로
  }
  // 진로 O/X 퀴즈: 진로카페(게시판 옆) 쿠리만쥬 쌤이 하루 한 문제
  const QUIZ = [
    { q: '일반대 수시 모집에는 최대 6번까지 지원할 수 있다.', a: true, why: '일반대 수시는 6회까지예요. 산업대·전문대와 KAIST 같은 특별법 대학은 횟수에 들어가지 않아요.' },
    { q: '정시 모집은 가·나·다 군마다 한 번씩 지원할 수 있다.', a: true, why: '군마다 한 곳씩, 모두 세 번 지원할 수 있어요.' },
    { q: '학생부종합전형은 내신 등급만 보고 뽑는다.', a: false, why: '교과 성적뿐 아니라 세부능력 특기사항, 창의적 체험활동 같은 학생부 전체를 함께 봐요.' },
    { q: '수시에 합격하면 등록하지 않아도 정시에 지원할 수 없다.', a: true, why: '수시 합격자는 등록 여부와 상관없이 그해 정시·추가모집에 지원할 수 없어요.' },
    { q: '수능 최저학력기준은 모든 전형에 있다.', a: false, why: '전형마다 달라요. 최저가 없는 전형도 많으니 모집요강을 꼭 확인해요.' },
    { q: '2028학년도 수능부터 국어·수학은 선택과목 없이 모두 같은 시험을 본다.', a: true, why: '2028 수능은 국어·수학·탐구 모두 선택과목 없이 공통으로 봐요.' },
    { q: '고교학점제에서는 진로에 맞춰 듣고 싶은 과목을 고를 수 있다.', a: true, why: '공통 과목 말고는 진로와 흥미에 맞춰 과목을 골라 들어요.' },
    { q: '지금도 대부분 대학 수시에서 자기소개서를 내야 한다.', a: false, why: '2024학년도 대입부터 자기소개서는 없어졌어요.' },
  ];
  const quiz = Object.assign({ day: '', right: 0 }, load('pixelSchoolQuiz', localStorage) || {});
  const quizToday = () => { const d = new Date(), start = new Date(d.getFullYear(), 0, 0); return QUIZ[Math.floor((d - start) / 864e5) % QUIZ.length]; };
  // 친구 도감과 칭호
  const met = new Set(load('pixelSchoolFriends', localStorage) || []);
  const metCount = () => new Set([...met, kid && kid.id].filter((id) => KIDS.some((k) => k.id === id))).size;
  const TITLES = [
    { id: 'star', name: '별 사냥꾼', how: '별 스티커 3개', ok: () => found.size >= 3 },
    { id: 'tour', name: '진로 탐험가', how: '출석 도장 6개', ok: () => stamps.size >= 6 },
    { id: 'errand', name: '심부름 달인', how: '심부름 끝내기', ok: () => quest.q >= QUESTS.length },
    { id: 'book', name: '독서왕', how: '4반 도장 + 책 심부름', ok: () => stamps.has(3) && quest.q >= 1 },
    { id: 'friend', name: '친구 부자', how: '친구 도감 채우기', ok: () => metCount() >= KIDS.length },
    { id: 'quiz', name: '퀴즈 박사', how: 'O/X 퀴즈 3번 맞히기', ok: () => quiz.right >= 3 },
    { id: 'floor1', name: '1층 탐험왕', how: '1층 미션 5개', ok: () => ms.done.length >= MISSIONS.length },
  ];
  const earned = load('pixelSchoolTitles', localStorage) || [];
  function checkTitles(quiet) {
    for (const t of TITLES) if (!earned.includes(t.id) && t.ok()) {
      earned.push(t.id); save('pixelSchoolTitles', earned, localStorage);
      if (!quiet) setTimeout(() => { SFX.party(); toast('칭호 획득!', `[${t.name}] 이제 이름 옆에 붙어요`); }, 1400);
    }
    paintTag();
  }
  const titleName = () => { const t = TITLES.find((x) => x.id === earned[earned.length - 1]); return t ? t.name : ''; };
  // 봉일천고 점심시간: 12:55 ~ 13:50 (이때만 친구들이 급식실로 이동)
  const isLunch = () => { const d = new Date(), m = d.getHours() * 60 + d.getMinutes(); return m >= 12 * 60 + 55 && m < 13 * 60 + 50; };
  // 등장인물 혼잣말(이따금 한 사람씩)
  const TEACH_MONO = ['커피 한 잔 해야겠다…', '창밖 날씨 좋다~', '오늘 점심 메뉴가 뭐더라?', '메일 확인해야지.', '회의가 몇 시였지?', '오늘도 힘내자!', '보드마커가 또 안 나오네.', '출석부 어디 뒀더라…'];
  const KID_MONO = ['배고프다…', '다음 시간 뭐더라?', '졸려…', '숙제 다 했나?', '오늘 급식 뭐지?', '쉬는 시간 언제 와…', '필통 어디 갔지?', '주말에 뭐 하지?', '이따 매점 갈래?', '수행평가 언제였지?'];
  const VEND_LINES = ['흠… 자판기 제품들의 영양성분을 비교해 볼까?', '당류가 가장 적은 음료는 뭘까? 표로 정리해 보자', '이온음료와 탄산음료, 나트륨은 얼마나 다를까?',
    '가격 대비 용량을 계산하면 어떤 게 제일 이득일까?', '캔과 페트병, 어느 쪽이 재활용하기 쉬울까?', '음료마다 카페인 양을 그래프로 그려 보면 재밌겠다'];
  let vendN = Math.floor(Math.random() * 6);
  function timeLine(r) {
    const d = new Date(), h = d.getHours(), wd = d.getDay();
    const cafe = r.room.key === 'cafe';
    if (wd === 1 && r.room.n === 5) return '월요일! 새 뉴스가 왔어요';
    if (isLunch()) return cafe ? '점심은 먹고 커피 마셔요' : r.room.key === 'cafeteria' ? '점심시간! 줄 서서 받아요' : '점심 맛있게 먹어요!';
    // 저녁 2층: 퇴근할 수 없는 NPC 선생님들
    if (!r.f1 && h >= 17 && !r.room.special) return NPC_EVE.bubble[(d.getMinutes() + r.i) % NPC_EVE.bubble.length];
    if (h >= 19 || h < 6) return cafe ? '이 시간까지? …얼른 집에 가요' : '늦었네요, 오늘은 여기까지!';
    if (wd === 0 || wd === 6) return '주말에도 들렀네요? 대단해요!';
    if (wd === 5) return '금요일이에요, 조금만 더 힘내요!';
    if (h < 9) return '좋은 아침이에요!';
    return null;
  }
  const said = new Set();

  function choosePortrait() { return innerWidth < 700 && innerHeight > innerWidth * 1.05; }

  function setLayout(portrait, atStairs) {
    const prevRoom = L && !atStairs && L.floor === floor ? nearestDoorRoom() : null;
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
    for (const r of L.rooms) put('chalk', studyRoom(r) ? '자습실' : r.room.short, r.board.x, r.board.y, r.board.w, r.board.h - 1);
    // 선생님 머리 위 말풍선(교실마다 성격에 맞게)
    const bubble = (cls, p, r, sp) => {
      const el = document.createElement('div');
      // 칠판 가까이 선 사람은 말풍선이 칠판(과 화면 위 끝)을 가리지 않게 발 아래에 띄운다
      const below = p.y - r.y < 62;
      el.className = 'bubble ' + cls + (below ? ' below' : '');
      el.hidden = true;
      Object.assign(el.style, { left: (p.x / L.W) * 100 + '%', top: ((below ? p.y + 2 : p.y - headUp(sp)) / L.H) * 100 + '%' });
      // 저녁 자습실·레슬링부 방의 말풍선은 이름 없는 학생 머리는 조금 가려도 되게(이름 있는 사람 얼굴을 덜 가리도록)
      el._at = { p, sp, below, soft: !!(L.night && r.talkSpots) };
      labels.appendChild(el);
      return el;
    };
    for (const r of L.rooms) {
      r.bubbleEl = bubble(r.room.special ? r.room.key : 'class', r.tpos, r, r.teacher);
      // 1층은 교실 학생에게도 말풍선
      if (r.f1 && r.npcSeat) r.npcBubbleEl = bubble('npc', r.npcSeat, r, r.npc);
      if (r.talkSpots && r.talkSpots.length) { r.studyEl = bubble('npc', r.talkSpots[0], r, null); r.studyEl._at.soft = true; }
    }
    // 일주일 안에 업데이트된 교실 문 위에 NEW!
    for (const r of L.rooms) {
      if (!r.room.el) continue;
      const gp = r.door.gap, el = document.createElement('div');
      el.className = 'newmark'; el.textContent = 'NEW!'; el.hidden = true;
      const x = gp.x + gp.w / 2, y = r.door.side === 'N' ? gp.y + 4 : gp.y - 1;
      Object.assign(el.style, { left: (x / L.W) * 100 + '%', top: (y / L.H) * 100 + '%' });
      labels.appendChild(el);
      r.newEl = el;
    }
    for (const sg of L.signs) put('sign' + (sg.dark ? ' dark' : ''), sg.text, sg.x, sg.y, sg.w, sg.h - 1);
    if (atStairs) placeAtStairs();
    else if (prevRoom != null) placeAtDoor(prevRoom);
    else placeCenter();
    paintQuest();
  }
  function placeAtStairs() {
    const h = L.walkHall;
    if (L.portrait) { P.x = Math.round(h.x + h.w / 2); P.y = h.y + 14; P.dir = 'down'; }
    else { P.x = h.x + 14; P.y = Math.round(h.y + h.h / 2 + 4); P.dir = 'right'; }
    P.path = []; said.add('stairs');
  }
  // 계단: 2층 ↔ 1층
  function changeFloor() {
    if (leaving) return;
    leaving = true;
    closeDialog(); keys.clear(); padDirs.clear();
    P.path = []; P.onArrive = null; P.moving = false;
    const to = floor === 2 ? 1 : 2;
    SFX.stairs();
    $('#fade-text').textContent = to === 1 ? '계단을 내려가는 중… 1층' : '계단을 올라가는 중… 2층';
    $('#fade').hidden = false;
    setTimeout(() => {
      floor = to;
      save('pixelSchoolFloor', floor, sessionStorage);
      save('pixelSchool', { kid: kid ? kid.id : null, room: null }, sessionStorage);
      armed = null; hoverRoom = null; P.room = null;
      setLayout(L.portrait, true);
      $('#fade').hidden = true;
      leaving = false;
      const M = curMission();
      hintAt = clock; idleT = 0; mono = null;
      if (M) setTimeout(() => { const h = nextHint(); if (h) sayMe(h, 4.5); }, 3600);
      toast(kid ? kid.name : '나', to === 1 ? (L.off ? '1층 도착! 선생님들은 퇴근하셨어요. 급식실·봉쿱은 자습실, 체육관은 레슬링부 연습 중!'
          : M ? '1층에 도착!' : '1층 도착! 교장실·교무실·봉쿱, 보건실·급식실·체육관이 있어요. 부탁할 일이 있는 사람을 찾아보자.')
        : '2층으로 올라왔다. 교실들이 보인다!');
    }, reduceMotion ? 120 : 520);
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
    // 가로로 놓은 터치 기기: 방향 패드와 A 버튼을 화면 양옆 아래에 둔다.
    // 휴대폰(높이가 낮음)은 제목을 숨기고 메시지창·버튼을 오른쪽 칸으로 옮겨 교실 화면을 키운다
    const cw = document.documentElement.clientWidth, vh = innerHeight;
    const land = isTouch && !portrait && innerWidth > vh, phone = land && vh < 560;
    const side = phone ? (cw < 640 ? 104 : 124) : 150;
    document.body.classList.toggle('land', land);
    document.body.classList.toggle('land-phone', phone);
    document.body.classList.toggle('overlay-pad', phone);
    document.body.style.setProperty('--side', side + 'px');
    let availW = Math.min(cw - 32 - 16, 1200);
    if (phone) availW = cw - 2 * side - 28;
    // 화면 아래 상태 줄(메시지창·버튼) 높이만큼 교실 화면을 줄인다
    const barMax = land && !phone ? cw - 2 * side - 24 : Infinity;
    hudbar.style.width = phone ? '' : Math.min(availW + 8, L.W * 4 + 8, barMax) + 'px';
    const barH = phone ? 0 : hudbar.offsetHeight + 12;
    const top = stage.getBoundingClientRect().top + scrollY;
    const reserve = phone ? top + 14 : land ? top + Math.max(barH, 150) + 12 : (isTouch ? 230 : 190) + barH;
    const byW = availW / L.W;
    const byH = (vh - reserve) / L.H;
    scale = Math.max(0.6, Math.min(byW, land ? byH : Math.max(byH, portrait ? byW * 0.8 : 0.6), 4));
    const cssW = Math.floor(L.W * scale), cssH = Math.floor(L.H * scale);
    stage.style.width = cssW + 8 + 'px';
    stage.style.height = cssH + 8 + 'px';
    hudbar.style.width = phone ? '' : Math.min(cssW + 8, barMax) + 'px';
    k = Math.max(1, Math.ceil(scale * (devicePixelRatio || 1)));
    screen.width = L.W * k; screen.height = L.H * k;
    stage.style.setProperty('--chalk', Math.max(9, Math.min(22, Math.round(scale * 5.4))) + 'px');
    stage.style.setProperty('--sign', Math.max(8, Math.min(18, Math.round(scale * 4.6))) + 'px');
    // 칠판보다 긴 교실 이름은 글자를 줄여 다 보이게
    for (const el of labels.querySelectorAll('.chalk')) {
      el.style.fontSize = '';
      if (el.scrollWidth > el.clientWidth + 1) el.style.fontSize = Math.floor(parseFloat(getComputedStyle(el).fontSize) * el.clientWidth / el.scrollWidth * 0.94) + 'px';
    }
    render();
  }
  // 휴대폰·태블릿을 돌렸을 때: resize가 늦거나 빠지는 브라우저가 있어 한 번 더 맞춘다
  let refitT = 0;
  const refit = () => { fit(); clearTimeout(refitT); refitT = setTimeout(fit, 350); };
  addEventListener('orientationchange', refit);
  if (window.IntersectionObserver) new IntersectionObserver(([en]) => document.body.classList.toggle('stage-off', en.intersectionRatio < 0.35), { threshold: [0, 0.35, 0.6, 1] }).observe(stage);
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { clearTimeout(refitT); refitT = setTimeout(fit, 120); });

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
    if (L.f1) { L.stickers = []; return; }
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
    const M = curMission();
    const mBubble = (wk) => (M && M.to[ms.step] === wk ? ['혹시 ' + M.item + ' 가져왔어요?'] : giverOf(wk) ? ['부탁할 게 있어요!'] : null);
    for (const r of L.rooms) {
      if (!r.bubbleEl) continue;
      const night = nightOffice(r) ? OVERTIME.bubble : studyRoom(r) ? (r.teacher.adult ? STUDY.bubble : STUDY.kid.bubble)
        : !L.f1 && isEve() && !r.room.special ? NPC_EVE.bubble : null;
      let list = night || (r.room.special ? specialOf(r).bubble : r.teacher.bubble);
      const tl = night ? null : timeLine(r), Q = L.f1 ? null : QUESTS[quest.q], mb = r.away ? null : mBubble(whoKey(r, 'teacher'));
      // 야간 자습실: 공부하는 학생들 가운데 한 명씩 돌아가며 말풍선
      if (r.studyEl) {
        const seats = r.talkSpots, lines = r.talkLines, step = Math.floor(clock / 3.2);
        const nearR = mode === 'play' && !(dlg && dlg.r === r) && !boardOpen && (roomOfPoint(P.x, P.y) === r || Math.hypot(P.x - r.door.front.x, P.y - r.door.front.y) < 60);
        if (nearR) {
          const text = lines[step % lines.length];
          if (r.studyEl.textContent !== text) r.studyEl.textContent = text;
          if (!r.studyPick || r.studyPick.step !== step) {
            // 말풍선이 다른 사람 얼굴을 가리지 않는 자리를 고른다(없으면 가장 덜 가리는 자리)
            let best = null;
            for (let k = 0; k < seats.length; k++) {
              const st = seats[(step * 7 + 3 + k * 5) % seats.length];
              r.studyEl._at = { p: st, sp: null, below: false, soft: true };
              const hit = fitAt(r.studyEl);
              if (!best || hit < best.hit) best = { st, hit };
              if (!hit) break;
            }
            r.studyPick = { step, st: best.st, ok: best.hit === 0 };
          }
          r.studyEl._at = { p: r.studyPick.st, sp: null, below: false, soft: true };
          if (fitAt(r.studyEl) > 0) r.studyPick.ok = false; // 그사이 누가 다가와 가리게 되면 이번 차례는 접는다
        }
        // 빈자리가 없으면(좁은 화면) 이번 차례는 말풍선을 쉬고 다음 학생에게 넘긴다
        const showS = nearR && r.studyPick && r.studyPick.ok;
        if (r.studyEl.hidden === showS) r.studyEl.hidden = !showS;
      }
      // 1층 학생 말풍선: 선생님보다 학생이 더 가까울 때
      if (r.npcBubbleEl) {
        const sl = mBubble(whoKey(r, 'student')) || (studyRoom(r) ? STUDY.kid.bubble : r.f1.npc.bubble);
        const closer = r.away || Math.hypot(P.x - r.npcSeat.x, P.y - r.npcSeat.y) < Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y);
        const nearS = mode === 'play' && !!r.npc && !(dlg && dlg.r === r) && roomOfPoint(P.x, P.y) === r && closer;
        if (nearS) { const text = sl[Math.floor(clock / 4) % sl.length]; if (r.npcBubbleEl.textContent !== text) r.npcBubbleEl.textContent = text; }
        if (r.npcBubbleEl.hidden === nearS) r.npcBubbleEl.hidden = !nearS;
        if (nearS) fitAt(r.npcBubbleEl);
        if (nearS) { if (!r.bubbleEl.hidden) r.bubbleEl.hidden = true; continue; }
      }
      if (r.away) { if (!r.bubbleEl.hidden) r.bubbleEl.hidden = true; continue; }
      if (mb) list = mb;
      else if (Q && quest.active && Q.to === r.i) list = ['혹시 ' + Q.item + ' 가져왔어요?'];
      else if (Q && !quest.active && Q.from === r.i && !isEve()) list = ['부탁할 게 있어요!'];
      else if (r.room.key === 'cafe' && stamps.size >= 6 && load('pixelSchoolDrink', localStorage) !== dayKey()) list = ['도장 6개? …이리 와 봐요'];
      else if (tl) list = [tl, ...list];
      const menu = !mb && r.f1 && r.f1.room.key === 'cafeteria' ? menuBubble() : null;
      if (menu) list = menu;
      const near = mode === 'play' && !(dlg && dlg.r === r) && (!!menu || roomOfPoint(P.x, P.y) === r || (r.room.special && Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y) < 70));
      if (near && list) {
        const text = list[Math.floor(clock / (menu ? 2.5 : 4)) % list.length];
        if (r.bubbleEl.textContent !== text) r.bubbleEl.textContent = text;
      }
      if (r.bubbleEl.hidden === near) r.bubbleEl.hidden = !near;
      if (near) fitAt(r.bubbleEl);
    }
  }
  function updateNew() {
    for (const r of L.rooms) if (r.newEl) { const f = !!r.room.el.querySelector('.upd.fresh'); if (r.newEl.hidden === f) r.newEl.hidden = !f; }
  }
  let newTick = 0;
  // 17시·0시가 되면 1층을 다시 꾸민다(자습실·레슬링부·퇴근 ↔ 낮). 서 있던 자리는 그대로
  function checkNight() {
    if (!L || !L.f1 || (isStudy() === L.night && isOff() === L.off)) return;
    if (dlg || memoOpen || boardOpen || leaving) return;
    const was = { night: L.night, off: L.off }, px = P.x, py = P.y, pd = P.dir;
    mono = null;
    setLayout(L.portrait, false);
    if (free(px, py)) { P.x = px; P.y = py; P.dir = pd; P.path = []; P.onArrive = null; armed = null; }
    render();
    if (mode !== 'play') return;
    if (!was.night && L.night) toast('저녁 5시', '1층 선생님들이 퇴근하셨어요. 급식실·봉쿱은 자습실, 체육관은 레슬링부 연습!');
    if (was.night && !L.night) toast('자정', '1층이 다시 낮 모습으로 돌아왔어요.');
  }
  function update(dt) {
    placed = placed.filter((b) => !b.el.hidden && b.el.isConnected);
    updateBubbles();
    updateSay(dt);
    if ((newTick += dt) > 1) { newTick = 0; updateNew(); checkNight(); }
    if (party > 0) party -= dt;
    if (mode !== 'play' || leaving || memoOpen || boardOpen) { P.moving = false; return; }
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
      if (nowRoom) addStamp(nowRoom);
    }
    // 계단 끝
    // 계단 가까이 가면 한마디(멀어졌다 다시 오면 또)
    const stairGap = !inRect(P.x, P.y, L.hall) ? 99 : (L.portrait ? P.y : P.x) - 18;
    if (stairGap < 0 && !said.has('stairs')) { said.add('stairs'); changeFloor(); return; }
    else if (stairGap > 20) said.delete('stairs');
    if (isLunch() && inHall && !said.has('lunch')) { said.add('lunch'); toast(kid ? kid.name : '나', '어디선가 급식 냄새가 난다… 오늘 메뉴는 뭘까?'); }
    // 자판기 가까이 가면 탐구 한마디(멀어졌다 다시 오면 다른 말)
    if (L.vend) {
      const dv = Math.hypot(P.x - L.vend.spot.x, P.y - L.vend.spot.y);
      if (dv < 20 && !said.has('vend')) {
        said.add('vend');
        const M = curMission();
        if (M && M.to[ms.step] === 'vend') { ms.step++; saveMs(); SFX.pickup(); toast(kid ? kid.name : '나', M.got); paintQuest(); hintAt = clock; }
        else { SFX.chime(); toast(kid ? kid.name : '나', VEND_LINES[vendN++ % VEND_LINES.length]); }
      }
      else if (dv > 38) said.delete('vend');
    }
    // 위클래스 강아지
    const dogR = L.rooms.find((r) => r.dog);
    if (dogR) {
      const dd = Math.hypot(P.x - dogR.dog.x, P.y - dogR.dog.y);
      if (dd < 16 && !said.has('dog')) { said.add('dog'); SFX.bark(); toast(kid ? kid.name : '나', DOG_LINES[dogN++ % DOG_LINES.length]); }
      else if (dd > 34) said.delete('dog');
    }
    // 복도 끝 창문 가까이 가면 한마디
    const winGap = !L.window || !inRect(P.x, P.y, L.hall) ? 99 : L.portrait ? L.walkHall.y + L.walkHall.h - P.y : L.walkHall.x + L.walkHall.w - P.x;
    if (winGap < 8 && !said.has('window')) { said.add('window'); SFX.bump(); toast(kid ? kid.name : '나', '창문에 기대면 안 되겠지…'); }
    else if (winGap > 24) said.delete('window');

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
      if (!r.away && Math.hypot(P.x - r.tpos.x, P.y - r.tpos.y) < 17) { hit = { id: 't' + r.i, r, who: 'teacher' }; break; }
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
    const lunch = isLunch();
    if (lunch && mode === 'play' && !L.f1) {
      // 점심시간: 친구들이 줄지어 계단(급식실) 쪽으로 걸어간다
      const h = L.walkHall, len = L.portrait ? h.h : h.w;
      others.forEach((o, k) => {
        const d = (clock * 16 + k * (len / others.length)) % len;
        const x = L.portrait ? h.x + 10 + (k % 2) * 18 : h.x + h.w - d, y = L.portrait ? h.y + h.h - d : h.y + 14 + (k % 2) * 16;
        const fr = ['a', 'idle', 'b', 'idle'][Math.floor(clock * 6 + k) % 4];
        list.push({ y, fn: () => { shadowAt(x, y, 10); drawSprite(personSprite(o, L.portrait ? 'up' : 'left', L.portrait ? fr : (fr === 'b' ? 'a' : fr), false), x, y); } });
      });
    }
    if (lunch && mode === 'play' && L.f1) {
      // 1층 점심시간: 급식실 식탁이 학생들로 가득 차고, 계단에서 내려온 친구들이 급식실로 줄지어 걸어간다
      const cr = L.rooms.find((r) => r.f1 && r.f1.room.key === 'cafeteria');
      if (cr) {
        const crowd = [...others, ...crowdList()];
        (cr.lunchSeats || []).forEach((st, k) => {
          const o = crowd[k % crowd.length];
          list.push({ y: st.y, fn: () => { shadowAt(st.x, st.y, 8); drawSprite(personSprite(o, st.dir, 'idle', blinking(k + 11)), st.x, st.y + hop(k + 13)); } });
        });
        const h = L.walkHall, df = cr.door.front, walkers = others.slice(0, 6);
        const len = Math.max(20, L.portrait ? df.y - 30 : df.x - 30);
        walkers.forEach((o, k) => {
          const d = (clock * 16 + k * (len / walkers.length)) % len;
          const x = L.portrait ? h.x + 10 + (k % 2) * 18 : 30 + d, y = L.portrait ? 30 + d : h.y + 14 + (k % 2) * 16;
          const fr = ['a', 'idle', 'b', 'idle'][Math.floor(clock * 6 + k) % 4];
          list.push({ y, fn: () => { shadowAt(x, y, 10); drawSprite(personSprite(o, L.portrait ? 'down' : 'right', L.portrait ? fr : (fr === 'b' ? 'a' : fr), false), x, y); } });
        });
      }
    }
    if (L.night && mode === 'play') {
      // 야간 자습실(17~24시): 자리마다 학생들이 앉아 공부한다
      const crowd = crowdList();
      let n = 0;
      for (const r of L.rooms) for (const [k, w] of (r.wrestle || []).entries()) {
        // 레슬링부: 두 명이 마주 보고 밀고 당긴다
        const a = crowd[(n + 2 * k) % crowd.length], c = crowd[(n + 2 * k + 1) % crowd.length];
        const t = reduceMotion ? 0 : Math.sin(clock * 4 + k * 1.7), push = Math.round(t * 1.5), dip = reduceMotion ? 0 : (Math.floor(clock * 3 + k) % 4 === 0 ? 1 : 0);
        list.push({ y: w.y, fn: () => {
          shadowAt(w.x - 6 + push, w.y, 9); shadowAt(w.x + 6 + push, w.y, 9);
          drawSprite(personSprite(a, 'right', dip ? 'a' : 'idle', false), w.x - 6 + push, w.y + dip);
          drawSprite(personSprite(c, 'left', dip ? 'idle' : 'a', false), w.x + 6 + push, w.y);
        } });
      }
      n = 16; // 자습 학생은 레슬링부와 다른 얼굴로
      for (const r of L.rooms) for (const st of r.studySeats || []) {
        const o = crowd[n++ % crowd.length], kk = n;
        list.push({ y: st.y, fn: () => { shadowAt(st.x, st.y, 8); drawSprite(personSprite(o, st.dir, 'idle', blinking(kk + 5)), st.x, st.y); } });
      }
    }
    L.rooms.forEach((r, i) => {
      const t = r.teacher, tp = r.tpos;
      let tdir = 'down';
      if (dlg && dlg.r === r || Math.hypot(P.x - tp.x, P.y - tp.y) < 40) {
        const vx = P.x - tp.x, vy = P.y - tp.y;
        tdir = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      }
      if (!r.away) list.push({ y: tp.y, fn: () => { shadowAt(tp.x, tp.y, 10); drawSprite(personSprite(t, tdir, 'idle', blinking(i + 3)), tp.x, tp.y + hop(i)); } });
      for (const [k, x] of (r.extras || []).entries()) {
        const q = x.pos, near = Math.hypot(P.x - q.x, P.y - q.y) < 30;
        let sd = 'up';
        if (near) { const vx = P.x - q.x, vy = P.y - q.y; sd = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down'); }
        list.push({ y: q.y, fn: () => { shadowAt(q.x, q.y, 10); drawSprite(personSprite(x.sp, sd, 'idle', near && blinking(k + 7)), q.x, q.y + hop(k + 4)); } });
      }
      const o = r.f1 ? r.f1.npc : others[i];
      r.npc = r.f1 ? (r.npcAway ? null : o) : lunch ? null : o || null; // 점심시간엔 다들 급식 먹으러 갔다(2층), 17시 넘으면 1층 어른은 퇴근
      if (o && r.npcSeat && !(r.f1 && !r.npc)) {
        const s = r.npcSeat;
        const near = Math.hypot(P.x - s.x, P.y - s.y) < 30;
        let sd = 'up';
        if (near) { const vx = P.x - s.x, vy = P.y - s.y; sd = Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down'); }
        list.push({ y: s.y, fn: () => { shadowAt(s.x, s.y, 10); drawSprite(personSprite(o, sd, 'idle', near && blinking(i)), s.x, s.y + hop(i + 1)); } });
      }
    });
    moveTag(); moveSay();
    if (kid && mode === 'play') {
      const frames = P.dir === 'left' || P.dir === 'right' ? ['a', 'idle'] : ['a', 'idle', 'b', 'idle'];
      const fr = P.moving ? frames[Math.floor(P.anim * 7) % frames.length] : 'idle';
      list.push({ y: P.y + 0.1, fn: () => {
        shadowAt(P.x, P.y, 11);
        drawSprite(personSprite(kid, P.dir, fr, !P.moving && blinking(0)), P.x, P.y - (P.moving && fr !== 'idle' ? 1 : 0) + hop(9));
      } });
    }
    list.sort((a, b) => a.y - b.y).forEach((it) => it.fn());
    // 모두 퇴근한 방(보건실·교장실)은 불이 꺼져 어둡다
    if (L.off) for (const r of L.rooms) if (r.locked) R(r.x + r.Wt, r.y + 4, r.w - r.Wt - r.Et, r.h - 4 - r.S, 'rgba(20,24,60,.32)');
    // 미션 대상(선생님·학생·자판기) 머리 위에 통통 튀는 느낌표
    const M = curMission(), tk = M && M.to[ms.step];
    if (tk && mode === 'play') {
      const marks = [];
      for (const r of L.rooms) {
        if (!r.away && whoKey(r, 'teacher') === tk) marks.push([r.tpos.x, r.tpos.y - 24]);
        if (r.f1 && r.npcSeat && whoKey(r, 'student') === tk) marks.push([r.npcSeat.x, r.npcSeat.y - 24]);
      }
      if (tk === 'vend' && L.vend) marks.push([L.vend.x + 7, L.vend.y - 2]);
      const up = !reduceMotion && Math.floor(clock * 3) % 2 ? 1 : 0;
      for (const [mx, my] of marks) {
        const x = rnd(mx) - 2, y = rnd(my) - 9 - up;
        R(x - 1, y - 1, 6, 8, C.out); R(x - 1, y + 8, 6, 5, C.out);
        R(x, y, 4, 6, '#ffd36b'); R(x, y, 4, 1, '#fff1b8'); R(x + 1, y + 6, 2, 1, '#e0a93a');
        R(x, y + 9, 4, 3, '#ffd36b');
      }
    }
    // 시간대에 맞춘 창밖 하늘(저녁 노을, 밤하늘)
    const sky = skyNow();
    if (sky) {
      if (sky.night) { g.fillStyle = 'rgba(16,20,60,0.3)'; g.fillRect(0, 0, L.W, L.H); }
      const paint = (x, y, w, h, vertical) => {
        R(x, y, w, h, sky.top);
        if (vertical) R(x + w - 1, y, 1, h, sky.low); else R(x, y + h - Math.min(4, h / 3), w, Math.min(4, h / 3), sky.low);
        if (sky.night) for (let k = 0; k < Math.max(1, (w * h) / 40); k++) {
          const sx = x + Math.floor(hash(x + k, y) * w), sy = y + Math.floor(hash(y, x + k * 7) * h * 0.7);
          if ((Math.floor(clock * 1.5) + k) % 5) R(sx, sy, 1, 1, '#fff6c0');
        }
      };
      for (const r of L.rooms) if (r.window) {
        const w = r.window;
        paint(w.x, w.y, w.w, w.h, false);
        R(w.x + w.w / 2 - 0.5, w.y, 1, w.h, '#ffffff'); R(w.x, w.y + w.h / 2 - 0.5, w.w, 1, '#ffffff');
      }
      for (const gl of L.hallGlass || []) paint(gl.x, gl.y, gl.w, gl.h, gl.v);
    }
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
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, Math.max(3200, (who.length + text.length) * 110));
    if (kid && who === kid.name) sayMe(text);
  }
  const starsEl = $('#stars'), hudbar = $('#hudbar'), hudRow = $('#hud-row');
  function paintStars() {
    starsEl.hidden = found.size === 0 && stamps.size === 0;
    starsEl.textContent = [found.size ? '★ ' + found.size + '/3' : '', stamps.size ? '도장 ' + stamps.size + '/6' : ''].filter(Boolean).join(' · ');
    starsEl.title = '찾은 별 스티커 · 출석 도장';
    paintQuest();
    paintNote();
    checkTitles();
  }
  // 이름표(칭호 + 이름)는 주인공 머리 위에 따라다닌다
  function paintTag() {
    const el = $('#nametag'); if (!el) return;
    const t = titleName();
    el.textContent = t && kid ? `[${t}] ${kid.name}` : '';
    el.hidden = !t || !kid;
  }
  // 내 캐릭터를 따라다니는 말풍선: 방금 한 말, 받은 미션, 다음 갈 곳
  let meSay = { text: '', until: 0 }, idleT = 0, hintAt = -99, mono = null, monoT = 6;
  // 내 말풍선은 짧게: 긴 문장은 앞 문장만(전체 내용은 메시지창에 그대로 남는다)
  function shortSay(text) {
    if (text.length <= 30) return text;
    let out = '';
    for (const part of text.split(/(?<=[.!?])\s+/)) { if (out && (out + ' ' + part).length > 30) break; out = out ? out + ' ' + part : part; }
    return out.length > 30 ? out.slice(0, 29) + '…' : out;
  }
  function sayMe(text, secs) { text = shortSay(text); meSay = { text, until: clock + (secs || Math.max(3.5, text.length * 0.12)) }; }
  function nextHint() {
    const M = curMission();
    if (M) {
      const tk = M.to[ms.step], tf = tk.startsWith('f2:') ? 2 : 1;
      if (isEve() && tf === 1) return `1층 선생님들은 퇴근하셨어. ${M.item} 미션은 내일 낮에!`;
      if (tf !== floor) return `계단으로 ${tf}층에 ${tf === 1 ? '내려' : '올라'}가자. (${M.item})`;
      return M.go[Math.min(ms.step, M.go.length - 1)];
    }
    const Q = QUESTS[quest.q];
    if (Q && quest.active) return floor === 2 ? `${josa(Q.item, '을', '를')} ${roomName(Q.to)}께!` : `${Q.item} 심부름은 2층이야. 계단으로 올라가자`;
    if (isEve()) return floor === 1 ? '선생님들은 퇴근하셨어. 부탁은 내일 낮에!' : null;
    if (floor === 1 && ms.done.length < MISSIONS.length) return '1층에 부탁할 게 있는 사람이 있대. 말풍선을 찾아보자';
    return null;
  }
  // 화면에 서 있는 사람들의 얼굴·몸 영역(게임 좌표)
  function faceBoxes() {
    const out = [];
    const add = (q, sp) => { if (q) out.push({ x0: q.x - 7, x1: q.x + 7, y0: q.y - headUp(sp) + 1, y1: q.y - 2 }); };
    for (const r of L.rooms) {
      if (!r.away) add(r.tpos, r.teacher);
      if (r.npc && r.npcSeat) add(r.npcSeat, r.npc);
      for (const x of r.extras || []) add(x.pos, x.sp);
      if (L.night && mode === 'play') for (const st of r.talkSpots || []) { add(st, null); out[out.length - 1].crowd = true; }
    }
    if (kid && mode === 'play') add(P, kid);
    return out;
  }
  // 말풍선을 말하는 사람(x, 발 y) 위나 아래에 띄우되, 누구의 얼굴도 가리지 않는 자리를 고른다.
  // 순서: 원래 쪽 → 원래 쪽에서 좌우로 비켜서 → 반대쪽. 다 막히면 원래 자리.
  // soft: 자습실 학생 말풍선. 이름 없는 자습 학생 머리는 조금 가려도 되지만(가볍게 친다), 다른 사람·말풍선은 안 된다
  function fitBubble(el, x, y, sp, below, up = 0, soft = false) {
    if (el._t !== el.textContent || el._sw !== screen.clientWidth || !el._w) {
      // 숨긴 채로는 크기가 0으로 재지므로, 보이지 않게 잠깐 펼쳐서 잰다
      const hid = el.hidden;
      if (hid) { el.style.visibility = 'hidden'; el.hidden = false; }
      el._t = el.textContent; el._sw = screen.clientWidth; el._w = el.offsetWidth; el._h = el.offsetHeight;
      if (hid) { el.hidden = true; el.style.visibility = ''; }
    }
    const sc = (screen.clientWidth || L.W) / L.W, w = el._w / sc, h = el._h / sc, tail = 9 / sc;
    const faces = faceBoxes(), lo = L.W * 0.17, hi = L.W * 0.83; // 말풍선 폭(최대 34%)이 화면 밖으로 나가지 않게
    // 이번 화면에서 먼저 자리 잡은 다른 말풍선도 피한다(얼굴을 가리는 것보다는 덜 나쁘게 친다)
    const bubs = placed.filter((b) => b.el !== el && !b.el.hidden);
    // 얼굴과 겹치는 넓이가 가장 작은 자리(같으면 앞 순서)를 고른다
    let pick = null;
    const s = w * 0.5 + 8;
    for (const [bel, dx] of [[below, 0], [below, -s], [below, s], [!below, 0], [!below, -s], [!below, s]]) {
      const cx = Math.max(lo, Math.min(hi, x + dx));
      const ay = bel ? y + 2 : y - headUp(sp) - up;
      const y0 = bel ? ay : ay - tail - h, y1 = bel ? ay + tail + h : ay;
      if (y0 < 0 || y1 > L.H) continue;
      const x0 = cx - w / 2, x1 = cx + w / 2;
      let hit = 0, hard = 0;
      const ov = (f) => Math.max(0, Math.min(x1, f.x1) - Math.max(x0, f.x0)) * Math.max(0, Math.min(y1, f.y1) - Math.max(y0, f.y0));
      for (const f of faces) { const o = ov(f); if (soft && f.crowd) hit += 0.3 * o; else { hit += 3 * o; hard += o; } }
      for (const f of bubs) { const o = ov(f); hit += o; hard += o; }
      if (!pick || hit < pick.hit) pick = { cx, ay, bel, hit, hard };
      if (!hit) break;
    }
    if (!pick) pick = { cx: Math.max(lo, Math.min(hi, x)), ay: below ? y + 2 : y - headUp(sp) - up, bel: below };
    {
      const y0 = pick.bel ? pick.ay : pick.ay - tail - h, i = placed.findIndex((b) => b.el === el);
      const box = { el, x0: pick.cx - w / 2 - 2, x1: pick.cx + w / 2 + 2, y0: y0 - 2, y1: y0 + tail + h + 2 };
      if (i >= 0) placed[i] = box; else placed.push(box);
    }
    el.classList.toggle('below', pick.bel);
    // 옆으로 비켜 선 말풍선은 꼬리가 말하는 사람을 가리키게
    const tx = Math.round((Math.max(lo, Math.min(hi, x)) - pick.cx) * sc);
    if (el._tx !== tx) { el._tx = tx; el.style.setProperty('--tx', tx + 'px'); }
    el.style.left = (pick.cx / L.W) * 100 + '%';
    el.style.top = (pick.ay / L.H) * 100 + '%';
    return soft ? pick.hard || 0 : pick.hit || 0;
  }
  let placed = []; // 이번에 자리 잡은 말풍선들(게임 좌표)
  const fitAt = (el) => { const a = el._at; return a ? fitBubble(el, a.p.x, a.p.y, a.sp, a.below, 0, !!a.soft) : 0; };
  function moveSay() {
    const el = $('#mebub'), mel = $('#monobub');
    if (!el || !L) return;
    const free = mode === 'play' && !dlg && !memoOpen && !boardOpen && !leaving;
    const show = free && clock < meSay.until && !!meSay.text;
    if (el.hidden === show) el.hidden = !show;
    if (show) {
      if (el.textContent !== meSay.text) el.textContent = meSay.text;
      const tagUp = $('#nametag') && !$('#nametag').hidden ? 6 : 0;
      fitBubble(el, P.x, P.y, kid, P.y < 52, tagUp);
    }
    const ms2 = free && mono && clock < mono.until;
    if (mel.hidden === ms2) mel.hidden = !ms2;
    if (ms2) {
      if (mel.textContent !== mono.text) mel.textContent = mono.text;
      const hit = fitBubble(mel, mono.x, mono.y, mono.sp, mono.below);
      // 혼잣말은 누구 얼굴도 가리지 않을 때만 띄운다(좁은 화면에서 자리가 없으면 이번 혼잣말은 건너뛴다)
      if (hit > 0 && !mono.ok) { mono = null; mel.hidden = true; monoT = 1.5; } else mono.ok = true;
    }
  }
  function updateSay(dt) {
    if (mode !== 'play' || dlg || leaving) { idleT = 0; return; }
    // 가만히 서 있으면 다음에 갈 곳을 혼자 중얼거린다
    idleT = P.moving ? 0 : idleT + dt;
    if (idleT > 4 && clock - hintAt > 14 && clock >= meSay.until) {
      const h = nextHint();
      if (h) { hintAt = clock; sayMe(h, 4.5); }
    }
    // 등장인물 혼잣말: 내가 멀리 있는 사람 가운데 한 명이 이따금
    if ((monoT -= dt) <= 0) {
      monoT = 6 + Math.random() * 6;
      const here = roomOfPoint(P.x, P.y), c = [];
      for (const r of L.rooms) {
        if (r === here) continue;
        const add = (q, lines, sp) => { if (q && lines && lines.length && Math.hypot(P.x - q.x, P.y - q.y) > 60) c.push({ q, lines, sp, below: q.y - r.y < 62 }); };
        const ot = nightOffice(r) ? OVERTIME.mono : null;
        const eve2 = !L.f1 && isEve() ? NPC_EVE.mono : null;
        if (!r.away) add(r.tpos, ot || eve2 || (studyRoom(r) ? (r.teacher.adult ? STUDY.bubble : STUDY.kid.bubble) : r.teacher.mono) || (r.teacher.adult ? TEACH_MONO : r.f1 ? r.f1.bubble : KID_MONO), r.teacher);
        if (r.npc && r.npcSeat) add(r.npcSeat, studyRoom(r) ? STUDY.kid.bubble : r.npc.mono || (r.f1 ? r.npc.bubble : KID_MONO), r.npc);
        for (const x of r.extras || []) add(x.pos, ot || x.sp.mono, x.sp);
      }
      if (c.length) {
        const pick = c[Math.floor(Math.random() * c.length)];
        const text = pick.lines[Math.floor(Math.random() * pick.lines.length)];
        mono = { text, x: pick.q.x, y: pick.q.y, sp: pick.sp, below: pick.below, until: clock + 3.5 };
      }
    }
  }
  function moveTag() {
    const el = $('#nametag'); if (!el || !L) return;
    const show = mode === 'play' && !!el.textContent;
    if (el.hidden === show) el.hidden = !show;
    if (show) { el.style.left = (P.x / L.W) * 100 + '%'; el.style.top = ((P.y - 19) / L.H) * 100 + '%'; }
  }
  // 수첩: 친구 도감과 칭호
  function paintNote() {
    const btn = $('#note'); if (btn) btn.textContent = `수첩 ${metCount()}/${KIDS.length}`;
    const box = $('#note-body'); if (!box) return;
    box.replaceChildren();
    const h = (tag, text, cls) => { const e = document.createElement(tag); e.textContent = text; if (cls) e.className = cls; box.appendChild(e); return e; };
    h('p', `친구 도감 ${metCount()}/${KIDS.length}`, 'note-h');
    const ul = h('ul', '', 'note-list');
    for (const k of KIDS) {
      const li = document.createElement('li'), seen = met.has(k.id) || k === kid, dr = DREAMS[k.id];
      li.appendChild(faceCanvas(k)); if (!seen) li.classList.add('unknown');
      const t = document.createElement('span');
      t.textContent = seen ? `${k.name}${k === kid ? ' (나)' : ''} · 꿈: ${dr[0]} · 관심 전공: ${dr[1]}` : '??? · 교실에서 이 친구를 찾아 말을 걸어 보세요';
      li.appendChild(t); ul.appendChild(li);
    }
    h('p', `칭호 ${earned.length}/${TITLES.length}`, 'note-h');
    const ul2 = h('ul', '', 'note-list titles');
    for (const t of TITLES) { const li = document.createElement('li'); li.textContent = earned.includes(t.id) ? `★ ${t.name}` : `· ??? (${t.how})`; ul2.appendChild(li); }
    h('p', `퀴즈 맞힌 수 ${quiz.right} · 진로카페에서 하루 한 문제 · 1층 미션 ${ms.done.length}/${MISSIONS.length}`, 'note-foot');
  }
  function paintQuest() {
    const questEl = $('#quest');
    if (!questEl || !L) return;
    const M = curMission();
    if (M) {
      const tag = document.createElement('b'); tag.className = 'mtag'; tag.textContent = '미션';
      questEl.replaceChildren(tag, document.createTextNode(' ' + M.hint[Math.min(ms.step, M.hint.length - 1)]));
      questEl.hidden = false; return;
    }
    const Q = QUESTS[quest.q];
    questEl.hidden = !Q;
    if (!Q) return;
    questEl.textContent = !Q ? '심부름 모두 끝! 고마워요'
      : quest.active ? `심부름: ${Q.item} → ${roomName(Q.to)}` : `심부름: ${roomName(Q.from)}께 말 걸기`;
  }
  // 다른 탭이나 뒤로 가기로 돌아왔을 때 저장된 도장·심부름을 다시 읽어 화면에 반영
  function syncGame() {
    (load('pixelSchoolStamps', localStorage) || []).forEach((i) => stamps.add(i));
    Object.assign(quest, load('pixelSchoolQuest', localStorage) || {});
    const m2 = load('pixelSchoolMissions', localStorage);
    if (m2 && Array.isArray(m2.done)) Object.assign(ms, m2, { done: m2.done.filter((id) => MISSIONS.some((m) => m.id === id)) });
    paintStars();
  }
  function addStamp(r) {
    if (!r || r.room.special || stamps.has(r.i)) return;
    stamps.add(r.i); save('pixelSchoolStamps', [...stamps], localStorage);
    SFX.stamp();
    toast('출석 도장 쾅!', stamps.size < 6 ? `${r.room.n}반 ${r.room.short} 교실 (${stamps.size}/6)` : '6개 완성! 진로카페 쿠리만쥬 쌤에게 가 보세요');
    paintStars();
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
    $('#dlg-go').firstChild.textContent = sp ? '▶ 이야기 더 듣기 ' : '▶ 사이트 열기 ';
    $('#dlg-go').hidden = !!r.locked; // 저녁에 잠긴 방은 더 들을 이야기가 없다
    $('#dlg-num').textContent = sp ? room.badge : room.n + '반';
    const study = studyRoom(r), wrestle = wrestleRoom(r);
    $('#dlg-title').textContent = study ? `야간 자습실 (${room.short})` : wrestle ? `레슬링부 연습 (${room.short})` : room.title;
    $('#dlg-desc').textContent = study ? STUDY.desc : wrestle ? WRESTLE.desc : r.locked ? '저녁에는 문을 잠가요. 내일 낮에 다시 와요.' : room.desc;
    $('#dlg-upd').textContent = room.el && room.el.dataset.upd ? '· ' + room.el.dataset.upd : '';
    const ik = infoKind(r), ib = $('#dlg-info');
    ib.hidden = !ik; if (ik) ib.textContent = ik === 'meal' ? '이번 주 식단표 보기' : '학사일정 달력 보기';
    const lk = $('#dlg-link'); lk.hidden = !room.link;
    if (room.link) { lk.href = room.link.url; lk.textContent = room.link.label + ' 열기 (새 창)'; }
    const me = kid ? kid.name : '친구';
    let face = t, say;
    const tl = timeLine(r), Q = L.f1 ? null : QUESTS[quest.q];
    const F = r.f1, asNpc = who === 'student' && r.npc, speaker = asNpc ? r.npc : t;
    // 1층 미션은 문 앞 인사가 아니라 그 사람에게 직접 말을 걸어야 주고받는다(2층 교실은 문 앞에서도)
    const wk = F && who === 'door' ? null : whoKey(r, who), M = curMission(), G = wk && giverOf(wk);
    if (asNpc) face = r.npc;
    if (r.away && !asNpc) face = kid || t;
    if (r.away && !asNpc && !(M && wk && M.to[ms.step] === wk)) {
      // 17시 이후: 선생님은 퇴근하셨다(미션은 내일 이어서)
      const tk = M && M.to[ms.step];
      const later = tk && tk === whoKey(r, 'teacher') ? ` ${M.item} 미션은 내일 낮에 이어 하자.` : '';
      say = r.locked ? `(${room.short} 문이 잠겨 있다. 불도 꺼져 있다. ${t.name}도 퇴근하셨나 보다.)${later}`
        : study ? `(${t.name}은 퇴근하셨다. 자습실 안은 사각사각 연필 소리뿐이다.)${later}`
          : wrestle ? `(${t.name}은 퇴근하셨다. 레슬링부 학생들의 기합 소리가 체육관을 울린다.)${later}`
            : `(${t.name}은 퇴근하셨다.)${later}`;
    } else if (M && wk && M.to[ms.step] === wk) {
      // 미션 완료
      ms.done.push(M.id); ms.cur = null; ms.step = 0; saveMs(); SFX.pickup();
      sayMe(`미션 완료! (${ms.done.length}/${MISSIONS.length})`, 4); hintAt = clock;
      const left = MISSIONS.length - ms.done.length;
      say = `${speaker.name}: ${M.thanks}`;
      setTimeout(() => toast('미션 완료!', left ? `1층 미션 ${ms.done.length}/${MISSIONS.length} · 1층에 부탁할 게 있는 사람이 또 있어요` : '1층 미션을 모두 끝냈어요! 교장 선생님께 가 보세요'), 400);
      paintQuest(); paintNote(); checkTitles();
    } else if (G) {
      // 미션 받기
      ms.cur = G.id; ms.step = 0; saveMs(); paintQuest();
      setTimeout(() => { sayMe('미션! ' + G.go[0], 5); hintAt = clock; }, 300);
      say = `${speaker.name}: ${me}, ${G.ask}`;
    } else if (F && F.room.key === 'principal' && !asNpc && !r.away && ms.done.length >= MISSIONS.length && !ms.fin) {
      // 1층 미션을 모두 끝내면 교장 선생님이 칭찬
      ms.fin = true; saveMs(); party = 6; SFX.party();
      say = `${t.name}: ${me}, 1층의 부탁을 모두 들어주었다고 들었어요. 정말 고마워요! 오늘부터 ${me} 학생은 우리 학교 "1층 탐험왕"이에요.`;
    } else if (F) {
      if (asNpc) say = `${r.npc.name}: ${pickLine(study ? STUDY.kid : r.npc)}`;
      else if (nightOffice(r)) say = `${t.name}: ${pickLine({ id: 'overtime', talk: OVERTIME.talk })}`;
      else if (study) say = `${t.name}: ${t.adult ? `${who === 'door' ? `어서 와요, ${me}! ` : ''}${pickLine({ id: 'study-t', talk: STUDY.talk })}` : pickLine(STUDY.kid)}`;
      else if (who === 'door' && giverOf(whoKey(r, 'teacher'))) say = `${t.name}: ${t.hi || `어서 와요, ${me}! 여기는 ${josa(room.short, '이에요', '예요')}. `}마침 잘 왔어요. 부탁할 게 있는데, 가까이 와 볼래요?`;
      else {
        // 급식실·교무실: 말을 걸 때마다 오늘의 정보와 평소 이야기를 번갈아
        const info = neisLine(F), useInfo = info && !((F.infoN = (F.infoN || 0) + 1) % 2 === 0 && who !== 'door');
        say = `${t.name}: ${who === 'door' ? (t.hi || `어서 와요, ${me}! 여기는 ${josa(room.short, '이에요', '예요')}. `) : ''}${tl && !useInfo ? tl + ' ' : ''}${useInfo ? info : specialTalk(F)}`;
      }
    } else if (who !== 'student' && Q && quest.active && Q.to === r.i) {
      // 심부름 완료
      say = `${t.name}: 아, ${Q.item}! 고마워요, ${me}. ${Q.thanks}`;
      quest.q++; quest.active = false; saveQuest(); SFX.pickup();
      setTimeout(() => toast('심부름 완료!', QUESTS[quest.q] ? `다음 심부름은 ${roomName(QUESTS[quest.q].from)}께` : '모든 심부름을 끝냈어요. 최고!'), 400);
      paintQuest();
    } else if (who !== 'student' && Q && !quest.active && Q.from === r.i && !isEve()) {
      // 심부름 받기
      say = `${t.name}: ${me}, 부탁 하나 해도 될까요? 이 ${josa(Q.item, '을', '를')} ${roomName(Q.to)}께 전해 주세요.`;
      quest.active = true; saveQuest(); paintQuest();
    } else if (sp && room.key === 'cafe' && stamps.size >= 6 && load('pixelSchoolDrink', localStorage) !== dayKey()) {
      // 출석 도장 6개 보상: 오늘의 음료
      const drink = DRINKS[new Date().getDay()];
      say = `${t.name}: …도장 6개를 다 모았네요. 흥, 대단하진 않지만. 자, 오늘의 음료 "${drink}". 식기 전에 마셔요.`;
      save('pixelSchoolDrink', dayKey(), localStorage); SFX.party();
      setTimeout(() => toast('오늘의 음료', `${josa(drink, '을', '를')} 받았어요!`), 400);
    }
    else if (sp && room.key === 'cafe' && quiz.day !== dayKey()) {
      // 오늘의 O/X 퀴즈
      dlg.quiz = quizToday();
      say = `${t.name}: …심심하면 퀴즈나 풀어요. "${dlg.quiz.q}" O일까요, X일까요?`;
    }
    else if (sp) say = `${t.name}: ${who === 'door' ? `어서 와요, ${me}! ` : ''}${specialTalk(sp)}`;
    else if (who === 'student' && r.npc) {
      face = r.npc;
      const first = !met.has(r.npc.id), dr = DREAMS[r.npc.id];
      if (first) { met.add(r.npc.id); save('pixelSchoolFriends', [...met], localStorage); setTimeout(() => { SFX.pickup(); toast('친구 도감', `${r.npc.name} 등록! (${metCount()}/${KIDS.length})`); paintStars(); }, 300); }
      say = first && dr ? `${r.npc.name}: 안녕, ${me}! 나는 ${r.npc.name}. 꿈은 ${dr[0]}이고, ${dr[1]}에 관심 있어. 여기 ${room.short} 사이트 같이 볼래?`
        : `${r.npc.name}: 안녕, ${me}! ${kidTalk(r.npc)} 여기 ${room.short} 사이트 같이 볼래?`;
    }
    else if (who === 'teacher') say = `${t.name}: 반가워요, ${me}! ${tl ? tl + ' ' : ''}${t.say}`;
    else say = `${t.name}: 어서 와요, ${me}! ${tl ? tl + ' ' : ''}여기는 ${room.n}반 ${room.short} 교실이에요.`;
    $('#dlg-face').replaceChildren(faceCanvas(face));
    $('#dlg-no').firstChild.textContent = sp ? '닫기 ' : '교실 둘러보기 ';
    $('#dlg-no kbd').textContent = 'Esc';
    if (dlg.quiz) { lk.hidden = true; ib.hidden = true; $('#dlg-go').firstChild.textContent = 'O 맞아요 '; $('#dlg-no').firstChild.textContent = 'X 아니에요 '; $('#dlg-no kbd').textContent = 'X'; }
    typeSay(say);
    // 위쪽 교실이면 대화창을 화면 아래에, 아래쪽 교실이면 위에 띄운다
    dlgEl.classList.toggle('top', r.y + r.h / 2 > L.H / 2);
    dlgEl.hidden = false;
  }
  function typeSay(say) {
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
  }
  function answerQuiz(o) {
    const qz = dlg && dlg.quiz; if (!qz) return;
    dlg.quiz = null;
    const right = o === qz.a, t = dlg.r.teacher;
    quiz.day = dayKey(); if (right) quiz.right++; save('pixelSchoolQuiz', quiz, localStorage);
    if (right) SFX.ok(); else SFX.no();
    $('#dlg-go').firstChild.textContent = '▶ 이야기 더 듣기 '; $('#dlg-no').firstChild.textContent = '닫기 '; $('#dlg-no kbd').textContent = 'Esc';
    typeSay(`${t.name}: ${right ? '…흥, 맞았네요.' : `땡, ${qz.a ? 'O' : 'X'}예요.`} ${qz.why} 내일 또 와요.`);
    checkTitles();
  }
  // 1층 학생 말: 같은 말을 연달아 하지 않게
  function pickLine(npc) {
    let line;
    do { line = npc.talk[Math.floor(Math.random() * npc.talk.length)]; } while (npc.talk.length > 1 && line === lastTalk[npc.id]);
    lastTalk[npc.id] = line;
    return line;
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
    if (leaving || r.locked) return;
    if (r.room.special) { openDialog(r, dlg && dlg.r === r && dlg.who === 'student' ? 'student' : 'teacher'); return; } // 사이트가 없는 칸: Enter를 누르면 다음 이야기
    leaving = true;
    if (!stamps.has(r.i)) { stamps.add(r.i); save('pixelSchoolStamps', [...stamps], localStorage); paintStars(); }
    SFX.enter();
    save('pixelSchool', { kid: kid ? kid.id : null, room: r.i }, sessionStorage);
    save('pixelSchoolFloor', 2, sessionStorage);
    $('#fade-text').textContent = `${r.room.n}반 ${r.room.short} 교실로 가는 중…`;
    $('#fade').hidden = false;
    setTimeout(() => { location.href = r.room.url; }, reduceMotion ? 120 : 560);
  }
  // 수첩 열고 닫기
  const noteEl = $('#notebook');
  function toggleNote(open) {
    if (!noteEl) return;
    open = open == null ? noteEl.hidden : open;
    if (open) { closeDialog(); paintNote(); SFX.chime(); }
    noteEl.hidden = !open;
    if (!open) stage.focus({ preventScroll: true });
  }
  $('#note').addEventListener('click', (e) => { e.stopPropagation(); toggleNote(); });
  $('#note-close').addEventListener('click', (e) => { e.stopPropagation(); toggleNote(false); });
  $('#dlg-go').addEventListener('click', () => { if (dlg && dlg.quiz) answerQuiz(true); else if (dlg) enter(dlg.r); });
  $('#dlg-no').addEventListener('click', () => { if (dlg && dlg.quiz) answerQuiz(false); else closeDialog(true); });

  /* ───────── 급식·학사일정: GitHub Actions가 매일 NEIS에서 받아 둔 data/meal.json, data/schedule.json ───────── */
  const NEIS = { meal: null, sch: null };
  const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const toDate = (s) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const mdw = (s) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})`; };
  function dday(s) {
    const n = Math.round((toDate(s) - toDate(ymd(new Date()))) / 864e5);
    return n === 0 ? '오늘' : n === 1 ? '내일' : 'D-' + n;
  }
  // 수집 스크립트가 지우지 못한 표시(^, (고)·(봉) 같은 꼬리표, -js 같은 코드)는 여기서도 한 번 더 지운다
  const dish = (x) => String(x).replace(/[*#^]+/g, '').replace(/\((?:고|중|초|봉)\)|\/(?:고|중|초|봉)$/g, '').replace(/-[a-zA-Z]+$/, '').trim();
  function lunchOf(day) {
    const d = NEIS.meal && NEIS.meal.days && NEIS.meal.days[day];
    const l = d ? d['중식'] || Object.values(d)[0] || null : null;
    return l && Array.isArray(l.menu) ? { ...l, menu: l.menu.map(dish).filter(Boolean) } : null;
  }
  const upcoming = (n) => (NEIS.sch && Array.isArray(NEIS.sch.events) ? NEIS.sch.events.filter((e) => e.date >= ymd(new Date())).slice(0, n) : []);
  async function loadNeis() {
    const get = async (u) => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
    [NEIS.meal, NEIS.sch] = await Promise.all([get('data/meal.json'), get('data/schedule.json')]);
    const caf = FLOOR1.find((x) => x.room.key === 'cafeteria'), off = FLOOR1.find((x) => x.room.key === 'office');
    const l = lunchOf(ymd(new Date()));
    if (caf) caf.bubble = caf.bubble.filter((b) => !b.startsWith('오늘은')); // 실제 메뉴는 menuBubble()이 11~13시에
    const e = upcoming(1)[0];
    if (off && e) off.bubble = [`${dday(e.date)} ${e.name}`, ...off.bubble];
  }
  // 급식실·교무실 선생님이 들려주는 오늘의 정보(자료가 없으면 null)
  function neisLine(F) {
    if (F.room.key === 'cafeteria' && NEIS.meal) {
      const l = lunchOf(ymd(new Date()));
      if (!l) return '오늘은 급식이 없는 날이에요. 아래에서 이번 주 식단표를 볼 수 있어요.';
      const m = l.menu.slice(0, 4).join(', ') + (l.menu.length > 4 ? ' 등' : '');
      return `오늘 점심은 ${m}이에요!${l.kcal ? ` (${l.kcal})` : ''} 이번 주 식단표도 볼래요?`;
    }
    if (F.room.key === 'office' && NEIS.sch) {
      const e = upcoming(1)[0];
      if (!e) return '당분간 등록된 학사일정이 없어요. 아래에서 학사일정 달력을 볼 수 있어요.';
      return `다음 학사일정은 ${mdw(e.date)} ${josa(e.name, '이에요', '예요')}(${dday(e.date)}). 학사일정 달력도 볼래요?`;
    }
    return null;
  }
  // 급식실 말풍선: 11:00~13:00에는 오늘의 식단을 두 가지씩 돌아가며(복도에서도 보이게)
  const menuTime = () => { const h = new Date().getHours(); return h >= 11 && h < 13; };
  function menuBubble() {
    const l = menuTime() && lunchOf(ymd(new Date()));
    if (!l || !l.menu.length) return null;
    const out = ['오늘의 식단!'];
    for (let i = 0; i < l.menu.length; i += 2) out.push(l.menu.slice(i, i + 2).join(' · '));
    return out;
  }
  const infoKind = (r) => (r && r.f1 ? { cafeteria: 'meal', office: 'cal' }[r.f1.room.key] : null);

  // 식단표·학사일정 판
  const boardEl = $('#board'), boardBody = $('#board-body');
  let boardOpen = false, boardKind = 'cal', boardAt = null;
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  function paintBoard() {
    boardBody.replaceChildren();
    const src = boardKind === 'meal' ? NEIS.meal : NEIS.sch, today = ymd(new Date());
    $('#board-foot').textContent = src ? `출처: NEIS 교육정보 개방 포털 · ${String(src.updated || '').replace('T', ' ').slice(0, 16)} 갱신` : '';
    if (boardKind === 'meal') {
      const mon = new Date(boardAt), fri = new Date(mon); fri.setDate(mon.getDate() + 4);
      $('#board-title').textContent = `${mon.getMonth() + 1}/${mon.getDate()} ~ ${fri.getMonth() + 1}/${fri.getDate()} 식단표`;
      if (!src) { boardBody.append(mk('p', 'board-empty', '아직 식단 자료를 받아 오지 못했어요. 내일 다시 와 주세요!')); return; }
      const wk = mk('div', 'board-week');
      for (let i = 0; i < 5; i++) {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        const k = ymd(d), l = lunchOf(k), card = mk('div', 'board-day' + (k === today ? ' today' : ''));
        card.append(mk('p', 'board-date', `${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]})${k === today ? ' 오늘' : ''}`));
        if (l) { const ul = mk('ul'); for (const m of l.menu) ul.append(mk('li', '', m)); card.append(ul); if (l.kcal) card.append(mk('p', 'board-kcal', l.kcal)); }
        else card.append(mk('p', 'board-none', '급식 없음'));
        wk.append(card);
      }
      boardBody.append(wk);
      return;
    }
    const m0 = new Date(boardAt), y = m0.getFullYear(), mo = m0.getMonth();
    $('#board-title').textContent = `${y}년 ${mo + 1}월 학사일정`;
    if (!src) { boardBody.append(mk('p', 'board-empty', '아직 학사일정 자료를 받아 오지 못했어요. 내일 다시 와 주세요!')); return; }
    const pre = `${y}${String(mo + 1).padStart(2, '0')}`, evs = (src.events || []).filter((e) => e.date.startsWith(pre));
    const grid = mk('div', 'board-cal');
    for (const w of WD) grid.append(mk('span', 'board-wd', w));
    for (let i = 0; i < m0.getDay(); i++) grid.append(mk('span', 'board-cell blank'));
    const last = new Date(y, mo + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const k = pre + String(d).padStart(2, '0'), es = evs.filter((e) => e.date === k), wd = (m0.getDay() + d - 1) % 7;
      const c = mk('span', 'board-cell' + (k === today ? ' today' : '') + (wd === 0 || es.some((e) => e.off) ? ' off' : wd === 6 ? ' sat' : '') + (es.length ? ' has' : ''));
      c.append(mk('b', '', String(d)));
      for (const e of es.slice(0, 2)) c.append(mk('i', '', e.name));
      if (es.length) c.title = es.map((e) => e.name).join(', ');
      grid.append(c);
    }
    boardBody.append(grid);
    const ul = mk('ul', 'board-list');
    if (!evs.length) ul.append(mk('li', 'board-none', '이 달에는 등록된 학사일정이 없어요.'));
    // 이어지는 같은 행사(겨울방학, 정기시험 등)는 한 줄로: '12월 31일(목) ~ 1월 8일(금)'
    const runs = [];
    for (const e of evs) {
      const p = runs[runs.length - 1];
      if (p && p.name === e.name && (toDate(e.date) - toDate(p.to)) / 864e5 <= 3) p.to = e.date;
      else runs.push({ ...e, to: e.date });
    }
    for (const e of runs) {
      const li = mk('li', e.off ? 'off' : '');
      li.append(mk('b', '', mdw(e.date) + (e.to !== e.date ? ' ~ ' + mdw(e.to) : '')), document.createTextNode(' ' + e.name + (e.grades && e.grades.length && e.grades.length < 3 ? ` (${e.grades.join('·')}학년)` : '')));
      ul.append(li);
    }
    boardBody.append(ul);
  }
  function openBoard(kind) {
    closeDialog();
    boardKind = kind; boardOpen = true; keys.clear(); padDirs.clear();
    const t = new Date(); t.setHours(0, 0, 0, 0);
    if (kind === 'meal') {
      // 주말이면 다음 주 식단을 보여 준다
      const k = (t.getDay() + 6) % 7; t.setDate(t.getDate() - k + (k >= 5 ? 7 : 0));
    } else t.setDate(1);
    boardAt = t;
    SFX.chime(); paintBoard();
    boardEl.hidden = false;
    $('#board-x').focus({ preventScroll: true });
  }
  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false; boardEl.hidden = true;
    stage.focus({ preventScroll: true });
  }
  function moveBoard(step) {
    const d = new Date(boardAt);
    if (boardKind === 'meal') d.setDate(d.getDate() + 7 * step); else d.setMonth(d.getMonth() + step);
    boardAt = d; SFX.move(); paintBoard();
  }
  $('#board-x').addEventListener('click', closeBoard);
  $('#board-prev').addEventListener('click', () => moveBoard(-1));
  $('#board-next').addEventListener('click', () => moveBoard(1));
  $('#dlg-info').addEventListener('click', () => { const k = dlg && infoKind(dlg.r); if (k) openBoard(k); });
  loadNeis();

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
  // 내 캐릭터 만들기: 이름·성별을 고르면 미리보기가 바로 바뀐다
  const meForm = $('#me-form'), meName = $('#me-name'), meMsg = $('#me-msg'), mePrev = $('#me-preview');
  const gBtns = [...document.querySelectorAll('.gbtn')];
  let meG = ME ? ME.gender : null;
  function paintMe() {
    gBtns.forEach((b) => b.setAttribute('aria-checked', b.dataset.g === meG ? 'true' : 'false'));
    const src = personSprite(makeMe(cleanName(meName.value) || '나', meG || 'm'), 'down', 'idle', false);
    mePrev.width = src.width; mePrev.height = src.height;
    mePrev.getContext('2d').drawImage(src, 0, 0);
    mePrev.style.opacity = meG ? 1 : 0.35;
  }
  gBtns.forEach((b) => b.addEventListener('click', () => { meG = b.dataset.g; SFX.move(); paintMe(); }));
  meName.addEventListener('input', paintMe);
  meForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nm = cleanName(meName.value);
    if (!nm) { meMsg.textContent = '이름을 한 글자 이상 적어 주세요.'; meMsg.classList.add('err'); SFX.bump(); meName.focus(); return; }
    if (!meG) { meMsg.textContent = '남학생·여학생 가운데 하나를 골라 주세요.'; meMsg.classList.add('err'); SFX.bump(); return; }
    meMsg.classList.remove('err');
    save('pixelSchoolMe', { name: nm, g: meG }, localStorage);
    ME = makeMe(nm, meG);
    start(ME);
  });
  function openMenu() {
    mode = 'menu';
    closeDialog();
    menu.hidden = false;
    $('#change').hidden = true;
    if (ME) { meName.value = ME.name; meG = ME.gender; }
    paintMe();
    const saved = load('pixelSchoolKid', localStorage);
    const btn = (saved && kidsEl.querySelector(`[data-id="${saved}"]`)) || (ME ? $('#me-go') : meName);
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
  const bgmBtn = $('#bgm');
  function paintBgm() {
    bgmBtn.textContent = SFX.bgm ? '♫ 음악 켬' : '♫ 음악 끔';
    bgmBtn.setAttribute('aria-pressed', SFX.bgm ? 'true' : 'false');
    bgmBtn.classList.toggle('off', !SFX.bgm);
  }
  bgmBtn.addEventListener('click', (e) => { e.stopPropagation(); SFX.setBgm(!SFX.bgm); paintBgm(); paintSound(); SFX.toggle(); });
  paintBgm();
  paintSound();
  const unlockEvents = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
  // 주소 끝에 ?sound 를 붙이면 누를 때마다 오디오 상태를 보여 준다(소리 문제 확인용)
  const soundDebug = /[?&]sound\b/.test(location.search);
  const unlockAudio = (e) => {
    SFX.unlock();
    if (soundDebug) setTimeout(() => toast('소리 점검', `${e.type} → ${SFX.info} · ${SFX.on ? '켬' : '끔'} · ${navigator.userAgent.match(/Version\/[\d.]+/) || ''}`), 150);
  };
  unlockEvents.forEach((t) => addEventListener(t, unlockAudio, true));


  /* ───────── 키보드 ───────── */
  const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konami = 0;
  function gameHasFocus() {
    const a = document.activeElement;
    return a === document.body || a === stage || hudbar.contains(a) || (stage.contains(a) && !menu.contains(a));
  }
  // 1층에 있을 때는 2층 교실 정보만 빌려 사이트로 간다
  const siteRoom = (i) => (L.f1 ? { i, room: ROOMS[i] } : L.rooms[i]);
  function openByNumber(n) {
    const r = ROOMS[n - 1] && siteRoom(n - 1);
    if (!r) return;
    closeDialog();
    if (mode === 'play' && !L.f1) { P.path = []; P.x = r.door.entry.x; P.y = r.door.entry.y; armed = 'door' + r.i; }
    enter(r);
  }
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (memoOpen) { if (e.key === 'Escape') { e.preventDefault(); closeMemo(); } return; }
    if (boardOpen) {
      if (e.key === 'Escape') { e.preventDefault(); closeBoard(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); moveBoard(e.key === 'ArrowLeft' ? -1 : 1); }
      return;
    }
    if (noteEl && !noteEl.hidden && (e.key === 'Escape' || KEYMAP[e.key])) { toggleNote(false); if (e.key === 'Escape') { e.preventDefault(); return; } }
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
    } else if (dlg && dlg.quiz && /^[oOxX]$/.test(e.key)) {
      e.preventDefault();
      answerQuiz(/^[oO]$/.test(e.key));
    } else if (e.key === 'Escape' && dlg) {
      e.preventDefault();
      closeDialog(true);
    }
  });
  addEventListener('keyup', (e) => { const dir = KEYMAP[e.key]; if (dir) keys.delete(dir); if (e.key === 'Shift') keys.delete('run'); });
  addEventListener('blur', () => { keys.clear(); padDirs.clear(); });
  document.addEventListener('visibilitychange', () => { keys.clear(); padDirs.clear(); if (document.hidden) SFX.pauseBgm(); else syncGame(); });
  addEventListener('pagehide', () => SFX.pauseBgm());

  // Enter·A: 대화창이 떠 있으면 사이트로, 아니면 가까운 문·선생님·학생에게 말을 건다
  function interact() {
    if (dlg && dlg.quiz) { answerQuiz(true); return; }
    if (dlg) { enter(dlg.r); return; }
    if (L.board && Math.hypot(P.x - L.board.spot.x, P.y - L.board.spot.y) < 20) { armed = 'board'; openMemo(); return; }
    let best = null, bd = 34;
    for (const r of L.rooms) {
      const cands = [[r.door.front, 'door'], [r.door.entry, 'door']];
      if (!r.away) cands.push([r.tpos, 'teacher']);
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
    if (boardOpen) { closeBoard(); return; }
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
    if (r.locked) {
      // 잠긴 방(저녁 교장실·보건실): 문 앞까지만 가서 잠겨 있다고 알려 준다
      armed = null;
      walkTo(r.door.front.x, r.door.front.y);
      P.onArrive = () => { if (!dlg) { armed = 'door' + r.i; openDialog(r, 'door'); } };
      return;
    }
    // 칠판·벽·문을 누르면 문으로 가서 대화창, 선생님·학생을 누르면 그 앞으로, 바닥은 그 자리로
    const onWall = y < r.y + r.F || inRect(x, y, r.door.gap);
    const nearT = !r.away && Math.hypot(x - r.tpos.x, y - (r.tpos.y - 8)) < 11;
    const nearS = r.npcSeat && r.npc && Math.hypot(x - r.npcSeat.x, y - (r.npcSeat.y - 8)) < 11;
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
    enter(siteRoom(i));
  }));

  addEventListener('resize', refit);
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    syncGame(); SFX.stale();
    $('#fade').hidden = true;
    closeDialog();
    const st = load('pixelSchool', sessionStorage);
    if (st && st.room != null && floor !== 2) { floor = 2; setLayout(L.portrait); }
    if (st && L.rooms[st.room]) { placeAtDoor(st.room); P.room = null; SFX.exit(); }
  });

  /* ───────── 시작 ───────── */
  { const s0 = load('pixelSchool', sessionStorage); if (s0 && s0.room != null) floor = 2; } // 사이트에서 돌아오면 2층
  fit();
  paintStars();
  const st = load('pixelSchool', sessionStorage);
  const back = st && (KIDS.find((x) => x.id === st.kid) || (ME && st.kid === ME.id ? ME : null));
  if (back) start(back, st.room, true);
  // 이름·성별을 한 번 적어 두었으면 다음부터는 메뉴 없이 내 캐릭터로 바로 시작
  else if (ME && load('pixelSchoolKid', localStorage) === ME.id) start(ME, null, true);
  else openMenu();
  requestAnimationFrame((t) => { last = t; loop(t); });

  // 화면 확인용(개발자 도구)
  window.pixelSchool = {
    go: (n) => { const r = L.rooms[n - 1]; walkTo(r.door.entry.x, r.door.entry.y); },
    walk: (x, y) => walkTo(x, y),
    floor: () => floor,
    stairs: () => changeFloor(),
    missions: () => ({ ...ms, done: [...ms.done] }),
    state: () => ({ mode, floor, x: P.x, y: P.y, dir: P.dir, dialog: dlg && dlg.r.room.n, who: dlg && dlg.who, portrait: L.portrait, sound: SFX.on, bgm: SFX.bgm, bgmPlaying: SFX.bgmPlaying, audio: SFX.state, played: SFX.played, info: SFX.info, stars: found.size, room: P.room && P.room.i }),
    layout: () => L,
    game: () => ({ stamps: [...stamps], quest: { ...quest }, sky: skyNow() }),
  };
})();
