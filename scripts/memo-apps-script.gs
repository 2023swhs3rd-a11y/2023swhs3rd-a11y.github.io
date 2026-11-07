/**
 * 픽셀 학교 복도 게시판 → "진로 선생님께 메시지"를 구글 시트에 모으는 Apps Script.
 *
 * 쓰는 법(README의 "게시판 메시지 받기" 참고)
 * 1. 메시지를 모을 구글 시트에서 확장 프로그램 › Apps Script 를 열고 이 파일 내용을 붙여 넣는다.
 * 2. 배포 › 새 배포 › 유형: 웹 앱, 실행: 나, 액세스: 모든 사용자 → 배포.
 * 3. 나온 웹 앱 주소(https://script.google.com/macros/s/…/exec)를 index.html 의
 *    <form id="memo-form" data-endpoint="…"> 에 넣는다.
 */
const HEADER = ['받은 때', '이름·학번', '메시지', '고른 캐릭터', '확인'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.website) return out_('ok'); // 사람 눈에 안 보이는 칸을 채운 것은 스팸 봇
    const msg = String(d.msg || '').trim();
    if (msg.length < 2) return out_('empty');
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) sh.appendRow(HEADER);
    sh.appendRow([new Date(), clean_(d.who, 30), clean_(msg, 500), clean_(d.kid, 10), false]);
    return out_('ok');
  } catch (err) {
    return out_('error');
  } finally {
    lock.releaseLock();
  }
}

// 너무 긴 글은 자르고, =·+·-·@ 로 시작하는 글은 수식으로 읽히지 않게 앞에 ' 를 붙인다
function clean_(v, n) {
  const s = String(v || '').trim().slice(0, n);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function out_(s) {
  return ContentService.createTextOutput(s);
}
