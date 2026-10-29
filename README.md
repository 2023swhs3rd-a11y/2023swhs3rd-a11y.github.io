# 봉일천고 진로진학부 사이트 (2023swhs3rd-a11y.github.io)

GitHub Pages로 배포하는 진로진학부 첫 화면과 공통 파일, 대입·진로 추천 자료 저장소입니다.
여섯 사이트 가운데 다섯 개(2028plan, gg-highschool-students, news, book, matrix)는 각자 저장소가 있고, 같은 주소 아래 `/저장소이름/`으로 열립니다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `index.html` | 첫 화면. 사이트 카드 여섯 장과, 각 사이트가 공개한 파일에서 읽은 최신 업데이트 날짜 |
| `assets/site.css` | 사이트 공통 스타일(글꼴·색·맨 위 경로 줄·바닥글). 쓰는 법은 파일 첫머리 주석 |
| `assets/fonts/pretendard/` | Pretendard 글꼴(SIL OFL). `site.css`가 불러온다 |
| `jinhak/` | 대입·진로 추천 자료: `index.html`(화면), `resources.json`(자료 목록), `thumbs/`(미리보기 그림) |
| `scripts/` | 추천 자료 검사·링크 점검·미리보기 그림 만들기 |
| `404.html`, `sitemap.xml`, `robots.txt` | 없는 주소 안내, 검색엔진용 목록 |

## 추천 자료 더하기

1. `jinhak/resources.json`의 `items`에 자료를 넣는다. 칸의 뜻과 허용값은 `scripts/jinhak_data.py` 첫머리에 있다.
   새로 넣은 자료에는 `"added": "YYYY-MM-DD"`를 적으면 30일 동안 NEW가 붙는다. 맨 위 `updated`도 그날로 바꾼다.
2. `python3 scripts/jinhak_data.py --fix`: 빠진 `id`를 주소로 만들어 채우고 모양을 정리한 뒤 검사한다.
3. `node scripts/jinhak_thumbs.mjs`: 그림이 없는 자료의 미리보기 그림(`jinhak/thumbs/<id>.jpg`, 640×400)을 만든다(playwright 필요).
   PDF 파일을 바로 가리키는 주소는 캡처할 수 없으니 첫 쪽 그림을 직접 넣는다. 그림이 없어도 화면에는 형태 아이콘이 대신 보인다.
4. 커밋하면 Actions의 **추천 자료 검사**가 같은 검사를 다시 돌린다.

링크는 매주 월요일 아침 **추천 자료 링크 점검**이 확인해, 깨지거나 확인이 필요한 링크를 이슈 '추천 자료 링크 점검'에 정리한다(Actions 탭에서 바로 돌릴 수도 있다).
