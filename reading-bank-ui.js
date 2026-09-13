(function(){
 'use strict';
 const bank=window.BIBLE_READING_BANK,core=window.BibleReadingCore,i18n=window.BibleReadingI18n,cfg=window.BIBLE_READING_CONFIG||{},translations=window.BIBLE_READING_TRANSLATIONS;
 const $=id=>document.getElementById(id),t=(key,values)=>i18n.text($('language').value,key,values);
 let queue=[],index=0,seen=new Set(),requestId=0,controller,selected=null;
 const option=(value,text)=>{const e=document.createElement('option');e.value=value;e.textContent=text;return e;};
 const initial=new URLSearchParams(location.search).get('lang');
 try {const saved=JSON.parse(localStorage.getItem('bible-reading-preferences')||'{}');if(['ko','en','ms'].includes(initial||saved.language))$('language').value=initial||saved.language;if(['multiple_choice','short_answer','mixed'].includes(saved.format))$('format').value=saved.format;}catch{if(['ko','en','ms'].includes(initial))$('language').value=initial;}
 const now=new Date();$('date').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const fields=q=>[q.prompt,q.answer,q.explanation,...(q.choices||[])];
 function available(q){const lang=$('language').value;return lang==='ko'||fields(q).every(s=>typeof translations?.strings?.[lang]?.[s]==='string'&&translations.strings[lang][s].trim());}
 function localize(q){const lang=$('language').value;if(lang==='ko')return q;const tr=s=>translations.strings[lang][s];return {...q,prompt:tr(q.prompt),answer:tr(q.answer),explanation:tr(q.explanation),choices:q.choices.map(tr)};}
 function bookName(id){const b=bank.books.find(b=>b.id===id);return translations?.books?.[id]?.[$('language').value]||($('language').value==='ko'?b.name:b.english);}
 function applyLanguage(){
  document.documentElement.lang=$('language').value;document.title=t('title');
  document.querySelector('.startup').setAttribute('aria-label',t('language')+' · '+t('format'));
  document.querySelector('.filters').setAttribute('aria-label',t('book')+' · '+t('theme'));
  $('card').setAttribute('aria-label',t('format'));
  for(const e of document.querySelectorAll('[data-i18n]'))e.textContent=t(e.dataset.i18n);
  $('thought').setAttribute('aria-label',t('thought'));$('thought').placeholder=t('placeholder');
  const selectedBook=$('book').value,selectedTheme=$('theme').value;
  $('book').replaceChildren(option('',t('allBooks')),...bank.books.map(b=>option(b.id,bookName(b.id))));$('book').value=selectedBook;
  $('theme').replaceChildren(option('',t('allThemes')),...Object.entries(i18n.themes[$('language').value]).map(([k,v])=>option(k,v)));$('theme').value=selectedTheme;
  $('summary').textContent=t('summary',{new:bank.metadata.new_questions.toLocaleString(),total:bank.metadata.total_questions.toLocaleString()});
  $('translationNote').hidden=$('language').value==='ko';refresh();
 }
 function filters(){return {book:$('book').value,theme:$('theme').value,difficulty:$('difficulty').value,origin:$('origin').value,format:$('format').value,day:$('mode').value==='mcheyne'?core.calendarDay(bank,$('date').value)?.day:null};}
 function link(r){
  const a=document.createElement('a'),b=bank.books.find(b=>b.id===r.book_id),lang=$('language').value;
  a.textContent=(lang==='ko'?r.label:r.label.replace(b.name,bookName(b.id)).replace(/장/g,''))+' ↗';
  const url=new URL(r.url);url.searchParams.set('version',lang==='ko'?'KRV':'KJV');
  const verse=r.verse_start?'.'+r.verse_start+(r.verse_end!==r.verse_start?'-'+r.verse_end:''):'';
  a.href=lang==='ms'?`https://www.bible.com/ms/bible/2271/${r.book_id}.${r.chapter||r.chapter_start}${verse}.AVB`:url.href;a.target='_blank';a.rel='noopener noreferrer';return a;
 }
 function savePreferences(){try{localStorage.setItem('bible-reading-preferences',JSON.stringify({language:$('language').value,format:$('format').value}));const url=new URL(location.href);if(url.searchParams.has('lang')){url.searchParams.set('lang',$('language').value);history.replaceState(null,'',url);}}catch{}}
 function refresh(){
  requestId++;controller?.abort();queue=[];index=0;seen.clear();$('card').hidden=true;$('empty').hidden=false;$('empty').querySelector('h2').textContent=t('emptyTitle');$('status').textContent='';$('start').textContent=t('start');
  const f=filters();$('dateField').hidden=$('mode').value!=='mcheyne';$('daily').hidden=!f.day;$('dailyReadings').replaceChildren();if(f.day)for(const r of bank.days[f.day-1].readings)$('dailyReadings').append(link(r));
  const pool=bank.questions.filter(q=>core.matches(q,f)&&available(q));$('pool').textContent=t('pool',{count:pool.length.toLocaleString()});$('start').disabled=pool.length===0;
  $('formatNotice').hidden=f.format!=='mixed'||pool.some(core.hasChoices)||pool.length===0;
  if($('language').value!=='ko'&&!translations)$('status').textContent=t('noTranslation');savePreferences();
 }
 function show(){
  const original=queue[index];if(!original){$('card').hidden=true;$('empty').hidden=false;$('empty').querySelector('h2').textContent=t('finished');return;}
  const q=localize(original),mc=q.presentation==='multiple_choice';selected=null;
  seen.add(q.id);$('empty').hidden=true;$('card').hidden=false;$('badge').textContent=`${bookName(q.book_id)} · ${t(q.difficulty)} · ${t(q.presentation)}`;$('progress').textContent=`${index+1} / ${queue.length}`;
  $('connection').textContent=i18n.connections[$('language').value][q.connection];$('prompt').textContent=q.prompt;$('references').replaceChildren(...q.references.map(link));$('thought').value='';$('thought').hidden=mc;$('choices').replaceChildren();$('questionHint').textContent=t(mc?'mcHint':'hint');$('selfCheck').hidden=mc;$('feedback').textContent='';
  if(mc)for(const choice of core.shuffle(original.choices.map((value,key)=>({key,label:q.choices[key]})))){
   const b=document.createElement('button');b.type='button';b.textContent=choice.label;b.setAttribute('aria-pressed','false');
   b.onclick=()=>{for(const c of $('choices').children)c.setAttribute('aria-pressed','false');b.setAttribute('aria-pressed','true');selected=choice.key;$('feedback').textContent='';};$('choices').append(b);
  }
  $('answer').hidden=true;$('reveal').hidden=false;$('next').hidden=true;$('answerText').textContent=q.answer;$('explanation').textContent=q.explanation;$('prompt').focus();
 }
 function valid(q,f){return q&&typeof q.id==='string'&&typeof q.prompt==='string'&&typeof q.answer==='string'&&typeof q.explanation==='string'&&Array.isArray(q.references)&&q.references.every(r=>bank.books.some(b=>b.id===r.book_id)&&typeof r.label==='string'&&typeof r.url==='string'&&r.url.startsWith('https://www.biblegateway.com/'))&&Array.isArray(q.tags)&&Array.isArray(q.mcheyne_days)&&Array.isArray(q.choices)&&q.choices.every(c=>typeof c==='string')&&core.matches(q,{...f,format:''})&&!q.arithmetic;}
 async function start(){
  const f=filters();if($('mode').value==='mcheyne'&&!f.day){$('status').textContent=t('dateRequired');return;}
  const seq=++requestId;controller?.abort();const activeController=new AbortController();controller=activeController;const timeout=setTimeout(()=>activeController.abort(),7000);$('start').disabled=true;$('status').textContent=t('loading');
  try{
   let remote=[],source=t('localStatus');
   if($('source').value==='online'&&cfg.url&&cfg.publishableKey){try{
    const res=await fetch(`${cfg.url}/rest/v1/rpc/bible_quiz_random`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_book:f.book||null,p_theme:f.theme||null,p_difficulty:f.difficulty||null,p_day:f.day||null,p_origin:f.origin||null,p_exclude:[...seen],p_count:50}),signal:activeController.signal});if(!res.ok)throw Error('rpc');const data=await res.json();if(!Array.isArray(data)||data.some(q=>!valid(q,f)))throw Error('data');remote=data.filter(available);source=t('onlineStatus');
   }catch{if(seq!==requestId)return;source=t('fallback');}}
   if(seq!==requestId)return;
   const count=Number($('count').value),local=core.session({questions:bank.questions.filter(available)},f,[...seen],50);
   // Prefer fresh RPC candidates; supplement from the exact same filters when needed.
   const candidates=[...new Map([...remote,...local].filter(q=>!seen.has(q.id)).map(q=>[q.id,q])).values()];
   const result=core.session({questions:candidates},f,[...seen],count);
   if(!result.length){$('status').textContent=t('exhausted');$('start').textContent=t('restart');seen.clear();$('card').hidden=true;$('empty').hidden=false;return;}
   queue=result;index=0;$('formatNotice').hidden=f.format!=='mixed'||result.some(q=>q.presentation==='multiple_choice');$('status').textContent=t('sessionStatus',{source,count:result.length});$('start').textContent=t('newStart');show();
  }finally{clearTimeout(timeout);if(seq===requestId)$('start').disabled=false;}
 }
 for(const id of ['book','theme','difficulty','origin','mode','date','count','source','format'])$(id).addEventListener('change',refresh);
 $('language').addEventListener('change',applyLanguage);$('start').onclick=start;
 $('reveal').onclick=()=>{const q=queue[index];if(q.presentation==='multiple_choice'){
  if(selected===null){$('feedback').textContent=t('chooseFirst');return;}
  $('feedback').textContent=t(q.choices[selected]===q.answer?'correct':'incorrect')+' '+t('selected',{answer:localize(q).choices[selected]});for(const b of $('choices').children)b.disabled=true;
 }$('answer').hidden=false;$('reveal').hidden=true;$('next').hidden=false;};
 $('next').onclick=()=>{index++;show();};applyLanguage();
})();
