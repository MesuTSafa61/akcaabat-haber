/* Capture only visible cards, at most two streams at once. Never persist camera footage. */
(function () {
  'use strict';
  const cache = new Map(), visible = new Set(), jobs = new Map();
  const interval = 60000;
  function paint(id) {
    const card = document.querySelector(`[data-preview="${id}"]`), item = cache.get(id);
    if (!card || !item) return;
    const img = card.querySelector('img'), caption = card.querySelector('.camera-preview-caption');
    if (item.image) { img.src = item.image; img.hidden = false; }
    card.dataset.error = String(!!item.error);
    const time = item.captured ? new Date(item.captured).toLocaleTimeString('tr-TR', {timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}) : '';
    caption.textContent = item.image ? `Son görüntü ${time}${item.error ? ' · Yenilenemedi' : ''}` : 'Önizleme alınamadı · Yayını açmak için dokunun';
  }
  function finish(id, image) {
    const job = jobs.get(id);
    if (!job) return;
    clearTimeout(job.timer); job.frame.remove(); jobs.delete(id);
    const previous = cache.get(id) || {};
    cache.set(id, {image:image || previous.image, captured:image ? Date.now() : previous.captured, error:!image, next:Date.now()+interval});
    paint(id); pump();
  }
  function pump() {
    if (document.hidden || document.getElementById('cameraDialog')?.open) return;
    for (const id of visible) {
      if (jobs.size >= 2) break;
      if (jobs.has(id) || (cache.get(id)?.next || 0) > Date.now()) continue;
      const frame = document.createElement('iframe');
      frame.className = 'camera-preview-worker'; frame.tabIndex = -1; frame.setAttribute('aria-hidden','true'); frame.title = 'Kamera önizlemesi hazırlanıyor';
      frame.allow = 'autoplay'; frame.src = `kamera-oynatici.html?v=3&id=${id}&snapshot=1`;
      const job = {frame, timer:setTimeout(()=>finish(id,null),22000)};
      jobs.set(id,job); document.body.append(frame);
    }
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'camera-snapshot') return;
    const id = String(event.data.id), job = jobs.get(id);
    if (!job || event.source !== job.frame.contentWindow) return;
    const image = event.data.image;
    finish(id, typeof image === 'string' && image.startsWith('data:image/jpeg;base64,') && image.length < 2000000 ? image : null);
  });
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const id = entry.target.dataset.preview;
      if (entry.isIntersecting) visible.add(id); else visible.delete(id);
    }
    pump();
  }, {rootMargin:'100px'});
  window.cameraPreviews = {observe() {
    observer.disconnect(); visible.clear();
    document.querySelectorAll('[data-preview]').forEach(card=>{paint(card.dataset.preview);observer.observe(card);});
  }};
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      for (const job of jobs.values()) { clearTimeout(job.timer); job.frame.remove(); }
      jobs.clear();
    } else pump();
  });
  setInterval(pump,5000);
})();
