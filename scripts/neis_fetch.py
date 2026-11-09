#!/usr/bin/env python3
"""NEIS 교육정보 개방 포털에서 봉일천고 급식 식단과 학사일정을 받아 data/meal.json, data/schedule.json으로 저장한다.

GitHub Actions가 매일 새벽 실행한다(.github/workflows/neis.yml). 인증키는 저장소 비밀값 NEIS_KEY.
받아 오지 못하면 기존 파일을 그대로 두고 0이 아닌 코드로 끝난다(빈 파일로 덮어쓰지 않는다).

  NEIS_KEY=... python3 scripts/neis_fetch.py            # 저장
  NEIS_KEY=... python3 scripts/neis_fetch.py --dry-run  # 결과만 출력
"""
import datetime as dt
import json
import os
import re
import sys
import urllib.parse
import urllib.request

API = 'https://open.neis.go.kr/hub/'
OFFICE = 'J10'            # 경기도교육청
SCHOOL_NAME = '봉일천고등학교'
KST = dt.timezone(dt.timedelta(hours=9))
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def call(service, key, **params):
    """한 서비스의 모든 행을 받는다(1000행씩)."""
    rows, page = [], 1
    while True:
        q = {'KEY': key, 'Type': 'json', 'pIndex': page, 'pSize': 1000, **params}
        url = API + service + '?' + urllib.parse.urlencode(q)
        req = urllib.request.Request(url, headers={'User-Agent': 'pixel-school-neis/1.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
        if service not in data:
            res = data.get('RESULT', {})
            if res.get('CODE') == 'INFO-200':   # 해당하는 데이터 없음
                return rows
            raise RuntimeError(f"{service}: {res.get('CODE')} {res.get('MESSAGE')}")
        head, body = data[service][0]['head'], data[service][1].get('row', [])
        code = head[1]['RESULT']['CODE']
        if code != 'INFO-000':
            raise RuntimeError(f'{service}: {code}')
        rows += body
        total = head[0]['list_total_count']
        if len(rows) >= total or not body:
            return rows
        page += 1


def school_code(key):
    rows = call('schoolInfo', key, ATPT_OFCDC_SC_CODE=OFFICE, SCHUL_NM=SCHOOL_NAME)
    for r in rows:
        if r.get('SCHUL_NM') == SCHOOL_NAME:
            return r['SD_SCHUL_CODE']
    raise RuntimeError(f'{SCHOOL_NAME} 학교 코드를 찾지 못했어요')


def clean_dish(s):
    """'잡곡밥 (5.6.)' → '잡곡밥'. 알레르기 번호, 별표·^ 같은 표시, 학교급 꼬리표((고)·(봉)·/고), -js 같은 영문 코드를 지운다."""
    s = re.sub(r'\(\s*[\d.\s]+\)', '', s)
    s = re.sub(r'[*#^]+', '', s)
    s = re.sub(r'\((?:고|중|초|봉)\)|/(?:고|중|초|봉)$', '', s.strip())
    s = re.sub(r'-[a-zA-Z]+$', '', s.strip())
    return re.sub(r'\s+', ' ', s).strip()


def meals(key, code, start, end):
    rows = call('mealServiceDietInfo', key, ATPT_OFCDC_SC_CODE=OFFICE, SD_SCHUL_CODE=code,
                MLSV_FROM_YMD=start.strftime('%Y%m%d'), MLSV_TO_YMD=end.strftime('%Y%m%d'))
    days = {}
    for r in rows:
        d = r['MLSV_YMD']
        dishes = [clean_dish(x) for x in re.split(r'<br\s*/?>', r.get('DDISH_NM', '')) if clean_dish(x)]
        days.setdefault(d, {})[r.get('MMEAL_SC_NM', '중식')] = {'menu': dishes, 'kcal': (r.get('CAL_INFO') or '').strip()}
    return dict(sorted(days.items()))


def schedule(key, code, start, end):
    rows = call('SchoolSchedule', key, ATPT_OFCDC_SC_CODE=OFFICE, SD_SCHUL_CODE=code,
                AA_FROM_YMD=start.strftime('%Y%m%d'), AA_TO_YMD=end.strftime('%Y%m%d'))
    out = []
    for r in rows:
        name = (r.get('EVENT_NM') or '').strip()
        if not name or name == '토요휴업일':
            continue
        grades = [g for g, k in (('1', 'ONE_GRADE_EVENT_YN'), ('2', 'TW_GRADE_EVENT_YN'), ('3', 'THREE_GRADE_EVENT_YN')) if r.get(k) == 'Y']
        out.append({'date': r['AA_YMD'], 'name': name, 'off': r.get('SBTR_DD_SC_NM') in ('휴업일', '공휴일'), 'grades': grades})
    out.sort(key=lambda e: (e['date'], e['name']))
    # 같은 날 같은 행사가 두 번 오면 하나만
    seen, uniq = set(), []
    for e in out:
        k = (e['date'], e['name'])
        if k not in seen:
            seen.add(k); uniq.append(e)
    return uniq


def month_start(d, add=0):
    m = d.month - 1 + add
    return dt.date(d.year + m // 12, m % 12 + 1, 1)


def write(name, obj, field):
    """내용(field)이 그대로면 파일을 건드리지 않는다(updated 시각만 바뀌는 커밋을 막는다)."""
    path = os.path.join(ROOT, 'data', name)
    try:
        with open(path, encoding='utf-8') as f:
            if json.load(f).get(field) == obj[field]:
                print(name, '바뀐 내용 없음')
                return
    except (OSError, ValueError):
        pass
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def main():
    key = os.environ.get('NEIS_KEY', '').strip()
    if not key:
        print('NEIS_KEY가 없어요. open.neis.go.kr에서 발급받아 저장소 Settings → Secrets → Actions에 넣어 주세요.', file=sys.stderr)
        return 2
    today = dt.datetime.now(KST).date()
    code = school_code(key)
    # 급식: 지난달 1일 ~ 다음 달 말일, 학사일정: 지난달 1일 ~ 석 달 뒤 말일
    m0 = month_start(today, -1)
    meal = meals(key, code, m0, month_start(today, 2) - dt.timedelta(days=1))
    sch = schedule(key, code, m0, month_start(today, 4) - dt.timedelta(days=1))
    stamp = dt.datetime.now(KST).isoformat(timespec='minutes')
    meta = {'school': SCHOOL_NAME, 'source': 'NEIS 교육정보 개방 포털(open.neis.go.kr)', 'updated': stamp}
    print(f'급식 {len(meal)}일, 학사일정 {len(sch)}건')
    if '--dry-run' in sys.argv:
        print(json.dumps({'meal': dict(list(meal.items())[:3]), 'schedule': sch[:5]}, ensure_ascii=False, indent=1))
        return 0
    write('meal.json', {**meta, 'days': meal}, 'days')
    write('schedule.json', {**meta, 'events': sch}, 'events')
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as e:  # 받아 오지 못하면 기존 파일을 지킨다
        print('NEIS에서 받아 오지 못했어요:', e, file=sys.stderr)
        sys.exit(1)
