# 봉일천고 진로진학부 사이트 (2023swhs3rd-a11y.github.io)

GitHub Pages로 배포하는 진로진학부 첫 화면(픽셀 학교)과 공통 파일, 대입·진로 추천 자료 저장소입니다.
다른 사이트는 각자 저장소가 있고, 같은 주소 아래 `/저장소이름/`으로 열립니다.

## 바로 가기

- 첫 화면: <https://2023swhs3rd-a11y.github.io/>
- 대입·진로 추천 자료: <https://2023swhs3rd-a11y.github.io/jinhak/>

## 사이트와 첫 화면 연결

| 사이트 | 저장소 | 첫 화면에서 여는 곳 |
| --- | --- | --- |
| 2028 대입전형 시행계획 요약 | `2028plan` | 2층 1반 (카드 1) |
| 대입·진로 추천 자료 | 이 저장소 `jinhak/` | 2층 2반 (카드 2) |
| 경기도 고등학교 학생수 추이 | `gg-highschool-students` | 2층 3반 (카드 3) |
| 독서나눔 릴레이 | `book` | 2층 4반 (카드 4) |
| 뉴스 읽고 진로 확장하기 | `news` | 2층 5반 (카드 5) |
| 블룸 교과탐구활동 매트릭스 | `matrix` | 2층 6반 (카드 6) |
| 진로 빌드업 맵 탐구 보고서 | `report` | 2층 진로카페 대화창 버튼 |
| 진로진학 상담 예약 | `reserve` | 2층 진로카페 대화창 버튼 |
| 봉일천고 골든벨 퀴즈 | `quiz` | 1층 체육관 대화창 버튼 |
| 생태탐구반 보고서, 기후 진로 특강 과제 | `eco-report`, `climate` | 연결 없음 (동아리·특강 과제라 선생님이 주소를 따로 나눠 줌) |

- 2층 교실 여섯 칸은 `index.html`의 교실 바로가기 목록(`a.card`) 순서 그대로다. 교실은 여섯 칸이 꽉 차 있으므로, 사이트를 더할 때는 교실을 늘리지 않고 어울리는 방의 대화창 버튼으로 단다. 버튼은 `assets/school/school.js`의 방 자료에 `link: { url, label }`(두 번째 버튼은 `link2`)로 적는다.
- 사이트를 더하거나 빼면 `404.html`의 사이트 목록도 고친다. 검색에 내보낼 사이트면 `sitemap.xml`에도 넣는다(noindex 사이트와 개인정보를 받는 신청서는 넣지 않는다).

## 사이트 공통 약속

각 사이트 저장소의 README가 따르는 약속이다. 새 사이트를 만들 때도 같게 맞춘다.

- **공통 스타일**: `<head>`에 `<link rel="stylesheet" href="/assets/site.css?v=1">`을 사이트 CSS보다 먼저 넣는다. 변수는 `--bon-*`, 클래스는 `.bon-*`만 쓴다. 자세한 규칙은 `assets/site.css` 첫머리 주석.
- **맨 위 경로 줄과 바닥글**: `<nav class="bon-bar">`에 "봉일천고등학교 진로진학부"(첫 화면 `/`로 가는 링크)와 지금 사이트 이름, 아래에 `<footer class="bon-footer">`.
- **고유색**: 사이트마다 색 하나를 정해 `--bon-accent`로 쓰고, 첫 화면 카드·교실 색과 맞춘다.
- **README**: 제목 아래에 사이트 주소(학생용·선생님용이 다르면 둘 다)를 먼저 적고, 파일 구성, 처음 설정, 보안·개인정보 순으로 쓴다.
- **개인정보**: 학생 정보를 받는 사이트는 받는 항목과 저장 위치(구글 시트 등)를 README와 화면에 적는다. 인증키·비밀번호는 저장소 Secrets나 Apps Script 속성에만 두고 코드에 넣지 않는다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `index.html` | 첫 화면 픽셀 학교. 학생을 골라 복도를 걷고 교실 여섯 칸(숫자키 1~6)에서 사이트를 연다. 진로카페·체육관 같은 방에서는 대화창 버튼으로 다른 사이트를 연다. 아래 교실 바로가기 목록(`a.card`)에 각 사이트가 공개한 파일에서 읽은 최신 업데이트 날짜를 붙인다 |
| `assets/site.css` | 사이트 공통 스타일(글꼴·색·맨 위 경로 줄·바닥글). 쓰는 법은 파일 첫머리 주석 |
| `assets/fonts/pretendard/` | Pretendard 글꼴(SIL OFL). `site.css`가 불러온다 |
| `jinhak/` | 대입·진로 추천 자료: `index.html`(화면), `resources.json`(자료 목록), `thumbs/`(미리보기 그림) |
| `assets/school/` | 첫 화면 픽셀 학교의 그림·움직임·효과음(`school.js`), 화면 틀(`school.css`), 갈무리 글꼴 일부(`fonts/`). 교실 주소·이름·설명·색은 `index.html`의 교실 바로가기 목록 하나만 고치면 된다 |
| `school/` | 예전 픽셀 학교 주소. 첫 화면으로 보낸다 |
| `scripts/` | 추천 자료 검사, 주간 상태 점검(사이트·링크), 미리보기 그림 만들기 |
| `og.png` | 첫 화면 주소를 카톡·SNS로 보낼 때 뜨는 미리보기 그림(1200×630). 교실 이름이나 그림이 바뀌면 `node scripts/og_image.mjs`로 다시 만들고(`python3 -m http.server 8765`를 켜 둔 채), `index.html`의 `og:image` 주소 `?v=`를 올린다 |
| `404.html`, `sitemap.xml`, `robots.txt` | 없는 주소 안내, 검색엔진용 목록 |

## 추천 자료 더하기

1. `jinhak/resources.json`의 `items`에 자료를 넣는다. 칸의 뜻과 허용값은 `scripts/jinhak_data.py` 첫머리에 있다.
   새로 넣은 자료에는 `"added": "YYYY-MM-DD"`를 적으면 30일 동안 NEW가 붙는다. 맨 위 `updated`도 그날로 바꾼다.
2. `python3 scripts/jinhak_data.py --fix`: 빠진 `id`를 주소로 만들어 채우고 모양을 정리한 뒤 검사한다.
3. `node scripts/jinhak_thumbs.mjs`: 그림이 없는 자료의 미리보기 그림(`jinhak/thumbs/<id>.jpg`, 640×400)을 만든다(playwright 필요).
   PDF 파일을 바로 가리키는 주소는 캡처할 수 없으니 첫 쪽 그림을 직접 넣는다. 그림이 없어도 화면에는 형태 아이콘이 대신 보인다.
4. 커밋하면 Actions의 **추천 자료 검사**가 같은 검사를 다시 돌린다.

### 이슈로 더하기 (권장)

저장소 Issues › New issue › **추천 자료 더하기** 양식을 채워 만들면, Actions의 **추천 자료 이슈로 더하기**(`.github/workflows/jinhak-issue.yml`)가 몇 분 안에 다음을 한다.

1. `scripts/jinhak_issue.py`가 양식을 읽어 `resources.json`에 자료를 넣는다(`added`와 맨 위 `updated`는 그날, `id`는 주소로). 위 검사를 통과해야만 넣는다.
2. 미리보기 그림을 만든다(실패해도 자료는 들어가고, 화면에는 형태 아이콘이 보인다).
3. `main`에 커밋하고 이슈에 결과를 댓글로 단 뒤 이슈를 닫는다. 넣지 못하면 이유를 댓글로 알리고 이슈를 열어 둔다. 이슈 본문을 고쳐 저장하면 다시 시도한다.

- 공개 저장소라 누구나 이슈를 열 수 있으므로, 저장소 주인·협업자가 연 이슈만 처리한다. 제목은 `[추천 자료]`로 시작해야 한다.
- 이미 있는 주소로 다시 올리면(이슈를 고친 경우 등) 새로 넣지 않고 그 자료의 내용을 바꾼다.
- 분류를 더하거나 바꾸면 `.github/ISSUE_TEMPLATE/jinhak-resource.yml`의 분류 목록도 맞춘다.

## 주간 상태 점검

매주 월요일 아침(05:23 KST) Actions의 **주간 상태 점검**이 다음이 열리는지 확인한다(Actions 탭에서 바로 돌릴 수도 있다).

- 첫 화면과 카드마다 걸린 사이트, 첫 화면이 업데이트 날짜를 읽는 사이트별 공개 파일, 대화창 버튼으로 여는 사이트(`scripts/site_status.py`). 대상은 `index.html`의 교실 바로가기 목록(`a.card`)·`UPD`와 `school.js`의 `link`·`link2`에서 읽으므로 교실이나 버튼을 더하거나 빼도 고칠 곳이 없다.
- 대입·진로 추천 자료의 링크 전부(`scripts/jinhak_links.py`).

문제가 있을 때만 이슈 '주간 상태 점검'에 결과를 쓰고, 깨진 것이 새로 생기면 댓글로 알린다. 모두 정상이면 이슈를 닫는다.

## 게시판 메시지 받기

첫 화면 복도 게시판에 가까이 가거나 누르면 "진로 선생님께 메시지 남기기" 창이 뜬다. 보낸 글은 구글 시트에 한 줄씩 쌓인다.

1. 메시지를 모을 구글 시트를 열고 확장 프로그램 › Apps Script 에 `scripts/memo-apps-script.gs` 내용을 붙여 넣고 저장한다.
2. 배포 › 새 배포 › 유형 **웹 앱**, 실행 사용자 **나**, 액세스 권한 **모든 사용자**로 배포하고 권한을 허용한다.
3. 나온 웹 앱 주소(`https://script.google.com/macros/s/…/exec`)를 `index.html`의 `<form id="memo-form" data-endpoint="">`에 넣는다.

주소가 비어 있으면 창에 "준비하고 있어요"가 뜨고 보내지 않는다. 스크립트를 고치면 배포 › 배포 관리에서 새 버전으로 다시 배포해야 반영된다.

## 급식 식단·학사일정 (NEIS)

1층 급식실 하은 쌤이 오늘 점심을 알려 주고 '이번 주 식단표'를, 교무실 오 선생님이 다음 학사일정을 알려 주고 '학사일정 달력'을 보여 준다. 자료는 `data/meal.json`, `data/schedule.json`이고 손으로 올리지 않는다.

- GitHub Actions `NEIS 급식·학사일정`(`.github/workflows/neis.yml`)이 매일 05:07(KST)에 `scripts/neis_fetch.py`로 NEIS 교육정보 개방 포털(open.neis.go.kr)의 급식식단정보·학사일정을 받아, 바뀐 내용이 있을 때만 커밋한다. 급식은 지난달~다음 달, 학사일정은 지난달~석 달 뒤.
- 인증키는 저장소 Settings › Secrets and variables › Actions의 `NEIS_KEY`. 키는 페이지에 들어가지 않는다.
- 바로 받으려면 Actions 탭 › NEIS 급식·학사일정 › Run workflow. 받아 오지 못하면 기존 파일을 그대로 두고 실행이 실패로 표시된다.
- 메뉴·행사 이름은 날마다 바뀌므로 자주 쓰는 한글 2,350자 글꼴(`fonts/galmuri11-ko.woff2`)을 따로 둔다.

## 픽셀 학교 글꼴

`assets/school/fonts/galmuri11-subset.woff2`는 갈무리11(SIL OFL)에서 페이지에 쓰는 글자만 남긴 파일이다. 화면 글자를 바꾸면 다시 만들고, `school.css`의 `@font-face` 주소와 `index.html`의 preload 주소에 붙은 `?v=`를 함께 올린다(안 올리면 브라우저가 예전 글꼴 파일을 써서 새 글자만 다른 글꼴로 보인다)(fonttools·brotli 필요, 원본은 npm `galmuri` 패키지의 `dist/Galmuri11.woff2`).

```
cat index.html assets/school/school.js > /tmp/text.txt
pyftsubset Galmuri11.woff2 --text-file=/tmp/text.txt --unicodes="U+0020-007E,U+00B7,U+2026,U+2190-2193,U+25B2-25C0,U+25CF,U+2605,U+266A,U+266B,U+2709" --flavor=woff2 --output-file=assets/school/fonts/galmuri11-subset.woff2
```

## 보안·개인정보

- 게시판 메시지는 이름 없이 받을 수 있고, 보낸 글은 선생님 구글 시트에만 쌓인다. Apps Script가 같은 글 거듭 보내기를 막고 10분에 60개, 하루 300개까지만 받는다. `=`·`+`·`-`·`@`·탭·줄바꿈으로 시작하는 글은 앞에 `'`를 붙여 수식으로 실행되지 않게 한다.
- 화면은 Apps Script 응답(`ok`·`dup`·`busy`·`error`)을 읽어 실제로 접수됐을 때만 "보냈어요"라고 알린다.
- 첫 화면은 `index.html`의 CSP(`connect-src`)로 같은 주소와 구글 Apps Script에만 요청을 보낸다. 바깥 자원을 더하면 CSP도 함께 고친다.
- 픽셀 학교의 진행 상황(도장, 친구 도감, 퀴즈 기록, 고른 학생)은 각 브라우저의 localStorage에만 남고 어디로도 보내지 않는다.
- NEIS 인증키는 저장소 Secrets(`NEIS_KEY`)에만 둔다.
