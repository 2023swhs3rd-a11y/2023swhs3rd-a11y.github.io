#!/usr/bin/env python3
"""'추천 자료 더하기' 이슈(.github/ISSUE_TEMPLATE/jinhak-resource.yml)를 읽어 jinhak/resources.json 에 넣는다.

  python3 scripts/jinhak_issue.py 이슈본문.md 이슈번호

GitHub Actions(jinhak-issue.yml)가 이슈 본문을 파일로 넘겨 부른다. 이슈 본문은 누구나 쓸 수 있는 글이므로
셸에 넣지 않고 이 스크립트가 파일로만 읽는다. 결과는 표준 출력의 마지막 줄에 JSON 으로 쓴다.
  {"ok": true, "id": "...", "title": "..."}   넣었다
  {"ok": false, "error": "..."}               넣지 않았다(이슈 댓글로 알린다)
같은 이슈를 고쳐 다시 돌리면(이슈 수정) 그 이슈로 넣었던 자료를 새 내용으로 바꾼다(같은 주소의 자료).
"""
import datetime
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import jinhak_data as jd  # noqa: E402

LABELS = {"분류": "cat", "제목": "title", "주소": "url", "펴낸 곳": "src", "해설": "desc",
          "형태": "kind", "대상": "who", "볼 만한 학년": "grade", "대입 학년도": "year"}
LIMITS = {"title": 120, "src": 60, "desc": 600, "url": 1000}


def parse(body):
    """이슈 양식 본문(### 칸 이름 + 값) → {칸: 값}"""
    out, key, buf = {}, None, []
    for line in body.replace("\r\n", "\n").split("\n") + ["### "]:
        m = re.match(r"^###\s+(.*)$", line)
        if m:
            if key:
                out[key] = "\n".join(buf).strip()
            key, buf = LABELS.get(m.group(1).strip()), []
        elif key:
            buf.append(line)
    return {k: ("" if v == "_No response_" else v) for k, v in out.items()}


def build(form, data):
    def need(k, name):
        v = form.get(k, "").strip()
        if not v:
            raise ValueError(f"'{name}' 칸이 비었습니다.")
        if k in LIMITS and len(v) > LIMITS[k]:
            raise ValueError(f"'{name}' 칸이 너무 깁니다({LIMITS[k]}자 이내).")
        return v

    cat = need("cat", "분류").split("·")[0].strip()
    if cat not in [c["id"] for c in data["categories"]]:
        raise ValueError(f"분류 '{cat}' 를 찾을 수 없습니다.")
    url = need("url", "주소")
    if not re.fullmatch(r"https://[^\s<>\"']+", url):
        raise ValueError("주소는 https:// 로 시작하고 빈칸이 없어야 합니다.")
    kind = need("kind", "형태")
    if kind not in jd.KINDS:
        raise ValueError(f"형태 '{kind}' 는 {'·'.join(sorted(jd.KINDS))} 가운데 하나여야 합니다.")
    who = {"학생": "st", "선생님용": "t"}.get(need("who", "대상"))
    if not who:
        raise ValueError("대상은 학생 또는 선생님용입니다.")
    item = {"cat": cat, "title": need("title", "제목"), "url": url, "src": need("src", "펴낸 곳"),
            "desc": re.sub(r"\s*\n\s*", " ", need("desc", "해설")), "kind": kind, "who": who}
    grades = re.findall(r"- \[[xX]\] (고[123])", form.get("grade", ""))
    if grades and len(grades) < 3:
        item["grade"] = grades
    year = form.get("year", "").strip()
    if year:
        if not re.fullmatch(r"20[2-4]\d", year):
            raise ValueError("대입 학년도는 2028 처럼 네 자리 숫자입니다.")
        item["year"] = int(year)
    return item


def main():
    body = Path(sys.argv[1]).read_text(encoding="utf-8")
    data = json.loads(jd.DATA.read_text(encoding="utf-8"))
    try:
        item = build(parse(body), data)
    except ValueError as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        return
    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).date().isoformat()
    old = next((it for it in data["items"] if it["url"] == item["url"]), None)
    if old:
        # 같은 주소가 이미 있으면 내용을 바꾼다(이슈를 고쳐 다시 돌린 경우). 넣은 날·id 는 그대로 둔다
        keep = {k: old[k] for k in ("id", "added") if k in old}
        old.clear()
        old.update(item, **keep)
        item = old
    else:
        item["added"] = today
        data["items"].append(item)
    data["updated"] = max(str(data.get("updated", "")), today)
    jd.fix(data)
    errors, _ = jd.check(data)
    if errors:
        print(json.dumps({"ok": False, "error": " / ".join(errors[:3])}, ensure_ascii=False))
        return
    jd.DATA.write_text(jd.dumps(data) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "id": item["id"], "title": item["title"], "updated": bool(old)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
