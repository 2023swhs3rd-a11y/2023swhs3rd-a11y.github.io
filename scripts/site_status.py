#!/usr/bin/env python3
"""진로진학부 사이트들이 열리는지 점검한다.

  python3 scripts/site_status.py              결과를 화면에 쓴다
  python3 scripts/site_status.py --md 파일    결과를 마크다운으로도 저장한다(주간 상태 점검이 이슈 본문으로 쓴다)

점검 대상은 첫 화면(index.html)에서 읽는다. 카드를 더하거나 빼면 따로 고칠 곳이 없다.
  - 첫 화면과 카드마다 걸린 사이트 주소
  - 첫 화면이 '최신 업데이트 날짜'를 읽는 사이트별 공개 파일(UPD). 이 파일이 안 열리면 배포가 빠졌을 수 있다
판정은 jinhak_links.py 와 같다(열림 / 확인 필요 / 깨짐). 깨짐이 하나라도 있으면 종료 코드 2.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jinhak_links import BROKEN, CHECK, OK, classify  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://2023swhs3rd-a11y.github.io"


def targets(html):
    """[(사이트 이름, 점검할 것, 주소)]"""
    names = {}
    for href, inner in re.findall(r'<a class="card" href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
        h = re.search(r"<h3[^>]*>(.*?)</h3>", inner, re.S)
        names[href] = re.sub(r"<[^>]+>|\s+", " ", h.group(1)).strip() if h else href
    out = [("첫 화면", "화면", BASE + "/")]
    for href, name in names.items():
        out.append((name, "화면", BASE + href))
    for href, path in re.findall(r"'(/[^']+/)':\s*\['(/[^']+)'", html):
        out.append((names.get(href, href), "업데이트 날짜 파일", BASE + path))
    return out


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    rows = [(site, what, url, *classify(url)) for site, what, url in targets(html)]
    sites = {r[0] for r in rows}
    bad_sites = {r[0] for r in rows if r[3] != OK}
    head = f"사이트 {len(sites)}곳 중 정상 {len(sites) - len(bad_sites)}곳 · 문제 {len(bad_sites)}곳"
    lines = []
    bad = [r for r in rows if r[3] != OK]
    if bad:
        lines.append("| 사이트 | 점검 | 판정 | 이유 |\n|---|---|---|---|")
        for site, what, url, label, why in bad:
            lines.append(f"| {site} | [{what}]({url}) | {label} | {why} |")
    print(head)
    print("\n".join(lines))
    if "--md" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--md") + 1])
        out.write_text(f"{head}\n\n" + ("\n".join(lines) + "\n" if lines else ""), encoding="utf-8")
    sys.exit(2 if any(r[3] == BROKEN for r in rows) else 0)


if __name__ == "__main__":
    main()
