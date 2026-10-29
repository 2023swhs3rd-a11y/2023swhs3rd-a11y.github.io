#!/usr/bin/env python3
"""대입·진로 추천 자료(jinhak/resources.json) 검사와 정리.

  python3 scripts/jinhak_data.py          검사만 (오류가 있으면 종료 코드 1, CI가 쓴다)
  python3 scripts/jinhak_data.py --fix    빠진 id 채우기·학년 순서·칸 순서·줄 모양을 정리한 뒤 검사

자료 한 건의 모양 (* 는 꼭 있어야 하는 칸)
  id*     10자리 영문·숫자. 미리보기 그림 jinhak/thumbs/<id>.jpg 의 이름. 비우면 --fix 가 주소로 만든다
  cat*    categories 의 id
  title* url*(https://…) src*(펴낸 곳) desc*(해설)
  kind*   웹사이트 · PDF · 영상 · 시트 · 온라인 책자 · 폴더
  who*    st(학생) · t(선생님용)
  grade   ["고1", "고2"] 처럼 볼 만한 학년 (없으면 전 학년)
  year    2028 처럼 대입 학년도 숫자
  added   "2026-10-28" 처럼 목록에 넣은 날. 넣은 지 30일 동안 화면에 NEW 가 붙는다
표준 라이브러리만 쓴다.
"""
import datetime
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "jinhak" / "resources.json"
THUMBS = ROOT / "jinhak" / "thumbs"

KEYS = ["id", "cat", "title", "url", "src", "desc", "kind", "who", "grade", "year", "added"]
REQUIRED = {"id", "cat", "title", "url", "src", "desc", "kind", "who"}
KINDS = {"웹사이트", "PDF", "영상", "시트", "온라인 책자", "폴더"}
WHO = {"st", "t"}
GRADES = ["고1", "고2", "고3"]
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def make_id(url):
    return hashlib.sha1(url.encode()).hexdigest()[:10]


def dumps(value, level=0):
    """들여쓰기 1칸 JSON. 글자·숫자만 든 짧은 배열은 한 줄로 쓴다(학년 등)."""
    pad, inner = " " * level, " " * (level + 1)
    if isinstance(value, dict):
        if not value:
            return "{}"
        items = [f"{inner}{json.dumps(k, ensure_ascii=False)}: {dumps(v, level + 1)}" for k, v in value.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    if isinstance(value, list):
        if all(not isinstance(v, (dict, list)) for v in value):
            return "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
        return "[\n" + ",\n".join(inner + dumps(v, level + 1) for v in value) + "\n" + pad + "]"
    return json.dumps(value, ensure_ascii=False)


def fix(data):
    for it in data["items"]:
        if not it.get("id") and it.get("url"):
            it["id"] = make_id(it["url"])
        if isinstance(it.get("grade"), list):
            it["grade"] = [g for g in GRADES if g in it["grade"]] + [g for g in it["grade"] if g not in GRADES]
        order = {k: i for i, k in enumerate(KEYS)}
        it_sorted = dict(sorted(it.items(), key=lambda kv: order.get(kv[0], len(KEYS))))
        it.clear()
        it.update(it_sorted)
    return data


def check(data):
    errors, warnings = [], []
    if not DATE.match(str(data.get("updated", ""))):
        errors.append('맨 위 "updated" 가 YYYY-MM-DD 날짜가 아닙니다')
    cats = [c.get("id") for c in data.get("categories", [])]
    if len(cats) != len(set(cats)):
        errors.append("categories 의 id 가 겹칩니다")
    for c in data.get("categories", []):
        for k in ("id", "name", "desc"):
            if not c.get(k):
                errors.append(f"분류 {c.get('id', '?')}: {k} 가 비었습니다")

    seen_id, seen_url, latest_added = {}, {}, ""
    today = datetime.date.today().isoformat()
    for n, it in enumerate(data.get("items", []), 1):
        where = f"{n}번째 자료({it.get('title', '제목 없음')[:30]})"
        for k in sorted(REQUIRED - set(it)):
            errors.append(f"{where}: {k} 칸이 없습니다")
        for k in sorted(set(it) - set(KEYS)):
            errors.append(f"{where}: 모르는 칸 {k}")
        for k in REQUIRED & set(it):
            if not str(it[k]).strip():
                errors.append(f"{where}: {k} 가 비었습니다")
        i = it.get("id", "")
        if i and not re.fullmatch(r"[0-9a-z]{10}", i):
            errors.append(f"{where}: id 는 영문 소문자·숫자 10자리여야 합니다 ({i})")
        if i in seen_id:
            errors.append(f"{where}: id {i} 가 {seen_id[i]}번째 자료와 겹칩니다")
        seen_id.setdefault(i, n)
        url = it.get("url", "")
        if url and not url.startswith("https://"):
            errors.append(f"{where}: 주소는 https:// 로 시작해야 합니다")
        if url in seen_url:
            errors.append(f"{where}: 주소가 {seen_url[url]}번째 자료와 같습니다")
        seen_url.setdefault(url, n)
        if it.get("cat") and it["cat"] not in cats:
            errors.append(f"{where}: 분류 {it['cat']} 가 categories 에 없습니다")
        if it.get("kind") and it["kind"] not in KINDS:
            errors.append(f"{where}: 형태 {it['kind']} 는 {'·'.join(sorted(KINDS))} 가운데 하나여야 합니다")
        if it.get("who") and it["who"] not in WHO:
            errors.append(f"{where}: who 는 st(학생) 또는 t(선생님용)입니다")
        if "grade" in it:
            g = it["grade"]
            if not isinstance(g, list) or not g or any(x not in GRADES for x in g):
                errors.append(f'{where}: grade 는 ["고1", "고2"] 처럼 고1~고3 목록이어야 합니다')
        if "year" in it and not (isinstance(it["year"], int) and 2020 <= it["year"] <= 2040):
            errors.append(f"{where}: year 는 2028 처럼 학년도 숫자여야 합니다")
        if "added" in it:
            if not DATE.match(str(it["added"])):
                errors.append(f'{where}: added 는 "YYYY-MM-DD" 날짜여야 합니다')
            else:
                latest_added = max(latest_added, it["added"])
                if it["added"] > today:
                    warnings.append(f"{where}: added 가 오늘보다 뒤입니다 ({it['added']})")
        if i and not (THUMBS / f"{i}.jpg").is_file():
            warnings.append(f"{where}: 미리보기 그림 thumbs/{i}.jpg 가 없습니다 (node scripts/jinhak_thumbs.mjs 로 만들기, 없으면 화면에 기본 그림)")

    if latest_added and str(data.get("updated", "")) < latest_added:
        warnings.append(f'맨 위 "updated"({data.get("updated")})가 가장 최근 added({latest_added})보다 앞섭니다')
    used = set(seen_id)
    for f in sorted(THUMBS.glob("*.jpg")):
        if f.stem not in used:
            warnings.append(f"쓰지 않는 미리보기 그림: thumbs/{f.name}")
    return errors, warnings


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    if "--fix" in sys.argv:
        DATA.write_text(dumps(fix(data)) + "\n", encoding="utf-8")
        print(f"정리함: {DATA.relative_to(ROOT)}")
    errors, warnings = check(data)
    for w in warnings:
        print("경고:", w)
    for e in errors:
        print("오류:", e)
    n = len(data.get("items", []))
    if errors:
        print(f"검사 실패: 오류 {len(errors)}개 (자료 {n}개)")
        sys.exit(1)
    print(f"검사 통과: 자료 {n}개, 분류 {len(data.get('categories', []))}개" + (f", 경고 {len(warnings)}개" if warnings else ""))


if __name__ == "__main__":
    main()
