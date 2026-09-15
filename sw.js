// 이 서비스워커는 "홈화면에 앱으로 설치 가능"하게 만들기 위해서만 존재합니다.
// 아무것도 캐싱하지 않습니다 — 예전에 겪었던 "코드 고쳐도 화면에 반영 안 되는" 캐싱 버그가
// 재발하지 않도록, fetch를 가로채지 않고 전부 그냥 네트워크로 흘려보냅니다.
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
// fetch 이벤트 리스너를 아예 등록하지 않음 = 브라우저가 항상 평소처럼(네트워크로) 요청 처리.
