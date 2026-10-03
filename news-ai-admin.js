(function () {
  'use strict';
  const byId=id=>document.getElementById(id);
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={queued:'Sırada',text_wait:'Başlık üretiliyor',image_start:'Görsel sırasına hazırlanıyor',image_wait:'Görsel sırasında bekliyor / hazırlanıyor',ready:'Editör kontrolüne hazır',applied:'Taslağa uygulandı',failed:'Üretim tamamlanamadı'};
  const coverLabel=j=>j.generated_image_url?.includes('-photo-v2.png')?'Kaynak fotoğrafı ve yapay zekâ başlığıyla hazırlanan 1200 × 675 kapak':'Yapay zekâ ile üretilmiş temsili görsel';
  let client,initialized=false,loading=false;
  const message=(text,error=false)=>{byId('aiStatus').textContent=text;byId('aiStatus').style.color=error?'#b91c1c':'';};
  async function refresh() {
    if(loading)return;loading=true;
    try {
      const [settings,jobs,drafts]=await Promise.all([
        client.from('news_bot_settings').select('ai_enabled,ai_titles,ai_images').eq('id',true).single(),
        client.from('news_ai_jobs').select('id,news_id,status,original_title,title_suggestion,generated_image_url,error_message,created_at').order('created_at',{ascending:false}).limit(30),
        client.from('news').select('id,title').eq('status','draft').eq('origin_type','automated').order('created_at',{ascending:false}).limit(30)
      ]);
      if(settings.error||jobs.error||drafts.error)throw Error('Üretim bilgileri okunamadı.');
      if(!initialized){byId('aiEnabled').checked=settings.data.ai_enabled;byId('aiTitles').checked=settings.data.ai_titles;byId('aiImages').checked=settings.data.ai_images;initialized=true;}
      const selected=byId('aiDraft').value;
      byId('aiDraft').innerHTML='<option value="">Bir bot taslağı seçin</option>'+drafts.data.map(n=>`<option value="${esc(n.id)}">${esc(n.title)}</option>`).join('');
      if(drafts.data.some(n=>n.id===selected))byId('aiDraft').value=selected;
      byId('aiJobs').innerHTML=jobs.data.length?jobs.data.map(j=>`<article class="ai-job"><div class="ai-job-text"><span class="source-badge ${j.status==='ready'?'live':'draft'}">${esc(labels[j.status]||j.status)}</span><p><small>Kaynak başlığı</small><br><strong>${esc(j.original_title)}</strong></p>${j.title_suggestion?`<p><small>Yapay zekâ başlık önerisi</small><br><strong>${esc(j.title_suggestion)}</strong></p>`:''}${j.error_message?`<p class="ai-error">${esc(j.error_message)}</p>`:''}<a href="yeni-haber.html?edit=${esc(j.news_id)}">Haberi düzenle</a>${j.status==='failed'?` <button type="button" data-ai-retry="${esc(j.id)}">Yeniden üret</button>`:''}${j.status==='ready'?` <button type="button" data-ai-apply="${esc(j.id)}">Başlık ve görseli taslağa uygula</button> <button type="button" data-ai-cover="${esc(j.id)}">Manşet kapağını yenile</button>`:''}</div>${j.generated_image_url?`<figure><img src="${esc(j.generated_image_url)}" alt="${esc(coverLabel(j))}" loading="lazy"><figcaption>${esc(coverLabel(j))}</figcaption></figure>`:''}</article>`).join(''):'<p>Henüz üretim yok. Yeni bot haberleri otomatik sıraya alınır veya yukarıdan bir taslak seçebilirsiniz.</p>';
    }catch(e){message(e.message,true);}finally{loading=false;}
  }
  async function invoke(body={}) {
    const {data}=await client.auth.getSession();
    if(!data.session)throw Error('Oturumunuzu yenileyin.');
    const response=await fetch(window.AKCAABAT_SUPABASE.url+'/functions/v1/news-ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Üretim başlatılamadı.');
    if(result.status==='disabled')throw Error('Önce yapay zekâ üretimini açıp ayarları kaydedin.');
    return result;
  }
  byId('aiSettingsForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(byId('aiEnabled').checked&&!byId('aiTitles').checked&&!byId('aiImages').checked){message('Başlık veya görsel üretimini seçin.',true);return;}
    const {error}=await client.from('news_bot_settings').update({ai_enabled:byId('aiEnabled').checked,ai_titles:byId('aiTitles').checked,ai_images:byId('aiImages').checked}).eq('id',true);
    message(error?'Ayarlar kaydedilemedi.':'Yapay zekâ ayarları kaydedildi.',!!error);
  });
  byId('aiQueue').addEventListener('click',async()=>{
    const button=byId('aiQueue'),id=byId('aiDraft').value;if(!id){message('Önce bir bot taslağı seçin.',true);return;}
    button.disabled=true;try{await invoke({news_id:id});message('Taslak üretim sırasına alındı. Sonuçlar otomatik kontrol edilir.');await refresh();}catch(e){message(e.message,true);}finally{button.disabled=false;}
  });
  byId('aiRefresh').addEventListener('click',async()=>{try{await invoke();message('Üretim sırası kontrol edildi.');await refresh();}catch(e){message(e.message,true);}});
  byId('aiJobs').addEventListener('click',async event=>{
    const cover=event.target.closest('[data-ai-cover]');
    if(cover){cover.disabled=true;try{await invoke({rebuild_id:cover.dataset.aiCover});message('1200 × 675 manşet kapağı yenilendi.');await refresh();}catch(e){message(e.message,true);}finally{cover.disabled=false;}return;}
    const retry=event.target.closest('[data-ai-retry]');
    if(retry){retry.disabled=true;try{await invoke({retry_id:retry.dataset.aiRetry});message('Üretim yeniden sıraya alındı.');await refresh();}catch(e){message(e.message,true);}finally{retry.disabled=false;}return;}
    const button=event.target.closest('[data-ai-apply]');if(!button)return;
    button.disabled=true;
    try{const {error}=await client.rpc('apply_news_ai_job',{p_job:button.dataset.aiApply});if(error)throw error;message('Öneri taslağa uygulandı. Haber düzenleme ekranından kontrol edip yayımlayabilirsiniz.');await refresh();}catch(e){message(e.message||'Öneri uygulanamadı.',true);}finally{button.disabled=false;}
  });
  async function init() {
    if(!window.supabase||!window.AKCAABAT_SUPABASE)return;
    client=window.supabase.createClient(window.AKCAABAT_SUPABASE.url,window.AKCAABAT_SUPABASE.key);
    const {data}=await client.auth.getSession();if(!data.session)return;
    const {data:profile}=await client.from('profiles').select('role,is_active').eq('id',data.session.user.id).maybeSingle();
    if(!profile?.is_active||!['admin','editor'].includes(profile.role))return;
    await refresh();message('Başlık ve görsel üretim paneli hazır.');
    setInterval(()=>{if(!document.hidden)refresh();},30000);
  }
  init().catch(()=>message('Yapay zekâ paneli yüklenemedi.',true));
})();
