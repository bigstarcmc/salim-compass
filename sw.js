// 이 서비스워커는 두 가지 역할을 합니다.
// 1) "홈화면에 앱으로 설치 가능"하게 만드는 것 (원래 있던 역할)
// 2) 앱 "껍데기"(index.html/manifest/아이콘 — 이 앱 자체의 정적 파일)를
//    stale-while-revalidate로 캐싱해서, 앱을 여는 순간 자체를 빠르게 만드는 것.
//
// 중요: Apps Script API 호출(script.google.com)은 여기서 절대 건드리지 않습니다.
// - 다른 출처(cross-origin)라 응답 내용을 들여다볼 수도 없고,
// - 그건 이미 index.html 안의 localStorage 캐시(cache-first 렌더링)가 담당하고 있어서,
//   여기서 또 캐싱하면 득 없이 복잡해지기만 합니다.
// 그래서 아래 fetch 핸들러는 "같은 출처의 GET 요청"만 다루고, 나머지는 그냥
// 원래대로(SW 없는 것처럼) 네트워크로 흘려보냅니다.
//
// stale-while-revalidate: 캐시가 있으면 그걸 즉시 보여주고, 그와 동시에 백그라운드로
// 최신 버전을 받아서 캐시를 갱신합니다. 즉 "코드를 고쳐도 반영이 영원히 안 되는" 문제는
// 생기지 않습니다 — 늦어도 그 다음 실행부터는 최신 버전이 보입니다.
const SHELL_CACHE = 'salim-shell-v1';
const SHELL_URLS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => { /* 오프라인 설치 등으로 일부 실패해도 무시 — 다음 fetch 때 보충됨 */ })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== SHELL_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST 등은 그냥 흘려보냄
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // 다른 출처(Apps Script API 등)는 절대 가로채지 않음

  e.respondWith(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached); // 네트워크 실패(오프라인 등) 시 캐시라도 반환
        return cached || network; // 캐시 있으면 즉시 반환(체감속도 핵심) — 그와 별개로 network는 항상 백그라운드에서 캐시를 갱신함
      })
    )
  );
});
