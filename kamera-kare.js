/* One fresh, silent frame from the municipal player. The parent then destroys this player. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.get('snapshot') !== '1') return;
  let done = false, timer;
  function send(image) {
    if (done) return;
    done = true; clearInterval(timer); observer.disconnect();
    parent.postMessage({type:'camera-snapshot',id:params.get('id'),image}, location.origin);
  }
  function mute() {
    document.querySelectorAll('video').forEach(video=>{video.muted=true;video.defaultMuted=true;video.playsInline=true;});
  }
  const observer = new MutationObserver(mute);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const started = Date.now();
  timer = setInterval(() => {
    mute();
    const video = document.querySelector('video');
    if (video?.readyState >= 2 && video.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640,video.videoWidth);
        canvas.height = Math.round(canvas.width*video.videoHeight/video.videoWidth);
        canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
        send(canvas.toDataURL('image/jpeg',0.78));
      } catch (_) { send(null); }
    } else if (document.querySelector('.jw-state-error') || Date.now()-started > 20000) send(null);
    else if (video?.paused) video.play().catch(()=>{});
  },250);
})();
