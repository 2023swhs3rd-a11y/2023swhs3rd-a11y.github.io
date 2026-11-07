# 봉일천고 진로진학부 사이트 (2023swhs3rd-a11y.github.io)

GitHub Pages로 배포하는 진로진학부 첫 화면과 공통 파일, 대입·진로 추천 자료 저장소입니다.
여섯 사이트 가운데 다섯 개(2028plan, gg-highschool-students, news, book, matrix)는 각자 저장소가 있고, 같은 주소 아래 `/저장소이름/`으로 열립니다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `index.html` | 첫 화면 픽셀 학교. 학생을 골라 복도를 걷고 교실 여섯 칸(숫자키 1~6)에서 사이트를 연다. 아래 교실 바로가기 목록(`a.card`)에 각 사이트가 공개한 파일에서 읽은 최신 업데이트 날짜를 붙인다 |
| `assets/site.css` | 사이트 공통 스타일(글꼴·색·맨 위 경로 줄·바닥글). 쓰는 법은 파일 첫머리 주석 |
| `assets/fonts/pretendard/` | Pretendard 글꼴(SIL OFL). `site.css`가 불러온다 |
| `jinhak/` | 대입·진로 추천 자료: `index.html`(화면), `resources.json`(자료 목록), `thumbs/`(미리보기 그림) |
| `assets/school/` | 첫 화면 픽셀 학교의 그림·움직임·효과음(`school.js`), 화면 틀(`school.css`), 갈무리 글꼴 일부(`fonts/`). 교실 주소·이름·설명·색은 `index.html`의 교실 바로가기 목록 하나만 고치면 된다 |
| `school/` | 예전 픽셀 학교 주소. 첫 화면으로 보낸다 |
| `scripts/` | 추천 자료 검사, 주간 상태 점검(사이트·링크), 미리보기 그림 만들기 |
| `404.html`, `sitemap.xml`, `robots.txt` | 없는 주소 안내, 검색엔진용 목록 |

## 추천 자료 더하기

1. `jinhak/resources.json`의 `items`에 자료를 넣는다. 칸의 뜻과 허용값은 `scripts/jinhak_data.py` 첫머리에 있다.
   새로 넣은 자료에는 `"added": "YYYY-MM-DD"`를 적으면 30일 동안 NEW가 붙는다. 맨 위 `updated`도 그날로 바꾼다.
2. `python3 scripts/jinhak_data.py --fix`: 빠진 `id`를 주소로 만들어 채우고 모양을 정리한 뒤 검사한다.
3. `node scripts/jinhak_thumbs.mjs`: 그림이 없는 자료의 미리보기 그림(`jinhak/thumbs/<id>.jpg`, 640×400)을 만든다(playwright 필요).
   PDF 파일을 바로 가리키는 주소는 캡처할 수 없으니 첫 쪽 그림을 직접 넣는다. 그림이 없어도 화면에는 형태 아이콘이 대신 보인다.
4. 커밋하면 Actions의 **추천 자료 검사**가 같은 검사를 다시 돌린다.

## 주간 상태 점검

매주 월요일 아침(05:23 KST) Actions의 **주간 상태 점검**이 다음이 열리는지 확인한다(Actions 탭에서 바로 돌릴 수도 있다).

- 첫 화면과 카드마다 걸린 사이트, 첫 화면이 업데이트 날짜를 읽는 사이트별 공개 파일(`scripts/site_status.py`). 대상은 `index.html`의 교실 바로가기 목록(`a.card`)과 `UPD`에서 읽으므로 교실을 더하거나 빼도 고칠 곳이 없다.
- 대입·진로 추천 자료의 링크 전부(`scripts/jinhak_links.py`).

문제가 있을 때만 이슈 '주간 상태 점검'에 결과를 쓰고, 깨진 것이 새로 생기면 댓글로 알린다. 모두 정상이면 이슈를 닫는다.

## 픽셀 학교 글꼴

`assets/school/fonts/galmuri11-subset.woff2`는 갈무리11(SIL OFL)에서 페이지에 쓰는 글자만 남긴 파일이다. 화면 글자를 바꾸면 다시 만든다(fonttools·brotli 필요, 원본은 npm `galmuri` 패키지의 `dist/Galmuri11.woff2`).

```
cat index.html assets/school/school.js > /tmp/text.txt
pyftsubset Galmuri11.woff2 --text-file=/tmp/text.txt --unicodes="U+0020-007E,U+00B7,U+2026,U+2190-2193,U+25B2-25C0,U+25CF,U+266A" --flavor=woff2 --output-file=assets/school/fonts/galmuri11-subset.woff2
```
