#!/usr/bin/env python3
"""대입·진로 추천 자료(jinhak/resources.json)의 링크가 아직 열리는지 점검한다.

  python3 scripts/jinhak_links.py              결과를 화면에 쓴다
  python3 scripts/jinhak_links.py --md 파일    결과를 마크다운으로도 저장한다(주간 작업이 이슈 본문으로 쓴다)

판정
  깨짐       없는 주소(404·410), 이름을 찾을 수 없는 사이트, 지워진 유튜브 영상
  확인 필요  로그인·권한을 요구함(구글 드라이브 공유 해제 등), 비공개·퍼가기 막힌 영상,
             봇을 막는 사이트(403·429), 서버 오류(5xx), 시간 초과
  열림       그 밖의 정상 응답
깨짐이 하나라도 있으면 종료 코드 2. 표준 라이브러리만 쓴다.
"""
import concurrent.futures
import json
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "jinhak" / "resources.json"
UA = "Mozilla/5.0 (compatible; bongilcheon-jinhak-linkcheck/1.0; +https://2023swhs3rd-a11y.github.io/jinhak/)"
TIMEOUT = 25

OK, CHECK, BROKEN = "열림", "확인 필요", "깨짐"


def fetch(url):
    """(상태 코드, 마지막 주소). 연결 자체가 안 되면 상태 코드 대신 오류 이름."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            r.read(2048)
            return r.status, r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.geturl() or url
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, socket.gaierror):
            return "dns", url
        if isinstance(reason, (socket.timeout, TimeoutError)):
            return "timeout", url
        return f"error:{type(reason).__name__}", url
    except (socket.timeout, TimeoutError):
        return "timeout", url
    except Exception as e:  # 연결 끊김 등
        return f"error:{type(e).__name__}", url


def youtube_oembed(url):
    host = urllib.parse.urlparse(url).netloc
    if host.endswith("youtube.com") or host == "youtu.be":
        return "https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(url, safe="")
    return None


def classify(url, get=fetch):
    """(판정, 설명). get 은 시험할 때 바꿔 끼운다."""
    oembed = youtube_oembed(url)
    if oembed:
        code, _ = get(oembed)
        if code == 200:
            return OK, ""
        if code in (400, 404):
            return BROKEN, "지워졌거나 없는 영상"
        if code in (401, 403):
            return CHECK, "비공개이거나 퍼가기를 막은 영상"
        return CHECK, f"유튜브 응답 {code}"

    code, final = get(url)
    if code in ("timeout",) or str(code).startswith("error:"):
        code, final = get(url)  # 한 번 더
    final_host = urllib.parse.urlparse(final).netloc
    if final_host == "accounts.google.com" or "ServiceLogin" in final:
        return CHECK, "구글 로그인 화면으로 넘어감(공유 권한 확인)"
    if code == 200 or (isinstance(code, int) and 200 <= code < 400):
        return OK, ""
    if code in (404, 410):
        return BROKEN, f"없는 주소({code})"
    if code == "dns":
        return BROKEN, "사이트 이름을 찾을 수 없음"
    if code in (401, 403, 429):
        return CHECK, f"접속을 막음({code})"
    if code == "timeout":
        return CHECK, "응답 없음(시간 초과)"
    if isinstance(code, int) and code >= 500:
        return CHECK, f"서버 오류({code})"
    return CHECK, f"응답 {code}"


def run(items, get=fetch, workers=8):
    with concurrent.futures.ThreadPoolExecutor(workers) as ex:
        results = list(ex.map(lambda it: (it, *classify(it["url"], get)), items))
    return results


def report(results, cats):
    bad = [r for r in results if r[1] != OK]
    lines = []
    for label in (BROKEN, CHECK):
        rows = [r for r in bad if r[1] == label]
        if not rows:
            continue
        lines.append(f"### {label} {len(rows)}개\n")
        lines.append("| 분류 | 자료 | 이유 | id |\n|---|---|---|---|")
        for it, _, why in rows:
            title = it["title"].replace("|", "\\|")
            lines.append(f"| {cats.get(it['cat'], it['cat'])} | [{title}]({it['url']}) | {why} | `{it['id']}` |")
        lines.append("")
    n_ok = len(results) - len(bad)
    head = f"자료 {len(results)}개 중 열림 {n_ok}개 · 확인 필요 {sum(r[1] == CHECK for r in bad)}개 · 깨짐 {sum(r[1] == BROKEN for r in bad)}개"
    return head, "\n".join(lines)


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    cats = {c["id"]: c["name"] for c in data["categories"]}
    results = run(data["items"])
    head, body = report(results, cats)
    print(head)
    print(body)
    if "--md" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--md") + 1])
        note = ("깨짐은 주소를 고치거나 목록에서 빼야 합니다. 확인 필요는 직접 열어 보고, 정상이면 그대로 두어도 됩니다"
                "(일부 사이트는 자동 점검을 막습니다).")
        out.write_text(f"{head}\n\n{body}\n{note}\n\n이 이슈는 매주 '추천 자료 링크 점검' 작업이 고쳐 씁니다.\n", encoding="utf-8")
    sys.exit(2 if any(r[1] == BROKEN for r in results) else 0)


if __name__ == "__main__":
    main()
