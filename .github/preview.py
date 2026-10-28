import json, hashlib, re, subprocess, urllib.request, urllib.parse, pathlib, sys, asyncio
from playwright.async_api import async_playwright
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
d = json.load(open("jinhak/resources.json"))
out = pathlib.Path("jinhak/thumbs"); out.mkdir(parents=True, exist_ok=True)
tmp = pathlib.Path("/tmp/pv"); tmp.mkdir(exist_ok=True)
report = {}
def key(u): return hashlib.sha1(u.encode()).hexdigest()[:10]
def get(u, timeout=60):
    req = urllib.request.Request(u, headers={"user-agent": UA, "accept-language": "ko-KR,ko;q=0.9"})
    r = urllib.request.urlopen(req, timeout=timeout)
    return r.status, r.headers.get("content-type", ""), r.read(), r.geturl()
def resize(src, dst):
    subprocess.run(["convert", str(src), "-resize", "640x", "-gravity", "north", "-crop", "640x400+0+0", "+repage", "-quality", "78", "-strip", str(dst)], check=True)
def drive_id(u):
    m = re.search(r"/file/d/([^/]+)", u); return m and m.group(1)
def pdf_thumb(data, k):
    p = tmp / f"{k}.pdf"; p.write_bytes(data)
    subprocess.run(["pdftoppm", "-f", "1", "-l", "1", "-r", "60", "-jpeg", "-singlefile", str(p), str(tmp / k)], check=True, timeout=120)
    resize(tmp / f"{k}.jpg", out / f"{k}.jpg")
def yt(u):
    s, ct, body, _ = get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(u, safe=""))
    j = json.loads(body); return j
async def shot(pw_browser, u, k):
    ctx = await pw_browser.new_context(viewport={"width": 1280, "height": 800}, user_agent=UA, locale="ko-KR")
    pg = await ctx.new_page()
    try:
        resp = await pg.goto(u, wait_until="load", timeout=45000)
        await pg.wait_for_timeout(2500)
        st = resp.status if resp else None
        title = await pg.title()
        await pg.screenshot(path=str(tmp / f"{k}.png"))
        resize(tmp / f"{k}.png", out / f"{k}.jpg")
        return {"status": st, "title": title, "final": pg.url}
    finally:
        await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for it in d["items"]:
            u = it["url"]; k = key(u); r = {"title": it["title"], "kind": it.get("kind")}
            try:
                did = drive_id(u)
                if it.get("kind") == "영상":
                    j = yt(u); r.update(ok=True, yt_title=j.get("title"), author=j.get("author_name"))
                    tu = j.get("thumbnail_url")
                    if tu:
                        _, _, img, _ = get(tu); (tmp / f"{k}.img").write_bytes(img)
                        subprocess.run(["convert", str(tmp / f"{k}.img"), "-resize", "640x360^", "-gravity", "center", "-extent", "640x360", "-quality", "78", "-strip", str(out / f"{k}.jpg")], check=True)
                        r["thumb"] = f"{k}.jpg"
                elif did:
                    s, ct, data, fin = get(f"https://drive.usercontent.google.com/download?id={did}&export=download&confirm=t", 180)
                    r.update(status=s, ct=ct, size=len(data))
                    if data[:4] == b"%PDF":
                        pdf_thumb(data, k); r.update(ok=True, thumb=f"{k}.jpg")
                    else:
                        r.update(ok=False, note="not pdf", head=data[:300].decode("utf-8", "replace"))
                elif it.get("kind") == "PDF":
                    s, ct, data, fin = get(u, 180)
                    r.update(status=s, ct=ct, size=len(data))
                    if data[:4] == b"%PDF":
                        pdf_thumb(data, k); r.update(ok=True, thumb=f"{k}.jpg")
                    else:
                        r.update(ok=False, note="not pdf", head=data[:300].decode("utf-8", "replace"))
                else:
                    info = await shot(b, u, k); r.update(info); r["ok"] = (info["status"] or 0) < 400; r["thumb"] = f"{k}.jpg"
            except Exception as e:
                r.update(ok=False, error=repr(e)[:300])
            report[u] = r; print(r.get("ok"), it["title"], r.get("error", ""), flush=True)
        await b.close()
asyncio.run(main())
json.dump(report, open("jinhak/preview-report.json", "w"), ensure_ascii=False, indent=1)
