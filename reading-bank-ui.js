(function(){
 'use strict';const bank=window.BIBLE_READING_BANK,core=window.BibleReadingCore,cfg=window.BIBLE_READING_CONFIG||{};
 const $=id=>document.getElementById(id),labels={easy:'초급',medium:'중급',hard:'고급'};
 const themes={pentateuch:'모세오경',history:'구약 역사서',wisdom:'시가·지혜서',majorProphets:'대선지서',minorProphets:'소선지서',gospels:'4복음서',acts:'사도행전',pauline:'바울서신',general:'히브리서·공동서신',prophecy:'요한계시록',ot_nt:'구약 ↔ 신약 연결',christ_fulfillment:'그리스도 · 예언과 성취·예표'};
 const connections={observation:'본문 관찰과 이해',nt_explicit:'신약에서 직접 인용·적용한 연결',nt_typology:'신약이 제시한 예표·대조',thematic_comparison:'주제 비교 · 직접 예언 성취라는 뜻은 아닙니다'};
 let queue=[],index=0,seen=new Set(),requestId=0,controller;
 const option=(value,text)=>{const e=document.createElement('option');e.value=value;e.textContent=text;return e;};
 for(const b of bank.books)$('book').append(option(b.id,b.name));for(const [k,v] of Object.entries(themes))$('theme').append(option(k,v));
 const now=new Date();$('date').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 $('summary').textContent=`66권 · 신규 ${bank.metadata.new_questions.toLocaleString()}문제 · 전체 ${bank.metadata.total_questions.toLocaleString()}문제 · 산수형 0문제`;
 function filters(){return {book:$('book').value,theme:$('theme').value,difficulty:$('difficulty').value,origin:$('origin').value,day:$('mode').value==='mcheyne'?core.calendarDay(bank,$('date').value)?.day:null};}
 function link(r){const a=document.createElement('a');a.textContent=r.label+' ↗';a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function refresh(){requestId++;controller?.abort();$('start').disabled=false;queue=[];index=0;seen.clear();$('card').hidden=true;$('empty').hidden=false;$('status').textContent='';const f=filters();$('dateField').hidden=$('mode').value!=='mcheyne';$('daily').hidden=!f.day;$('dailyReadings').replaceChildren();if(f.day)for(const r of bank.days[f.day-1].readings)$('dailyReadings').append(link(r));const n=bank.questions.filter(q=>core.matches(q,f)).length;$('pool').textContent=`조건에 맞는 문제 ${n.toLocaleString()}개 · 선택 조건은 함께 적용됩니다.`;$('start').disabled=n===0;}
 function show(){
  const q=queue[index];if(!q){$('card').hidden=true;$('empty').hidden=false;$('empty').querySelector('h2').textContent='이번 읽기를 마쳤습니다.';return;}
  seen.add(q.id);$('empty').hidden=true;$('card').hidden=false;$('badge').textContent=`${q.book} · ${labels[q.difficulty]}`;$('progress').textContent=`${index+1} / ${queue.length}`;$('connection').textContent=connections[q.connection];$('prompt').textContent=q.prompt;$('references').replaceChildren(...q.references.map(link));$('thought').value='';$('choices').replaceChildren();
  for(const choice of core.shuffle(q.choices||[])){const b=document.createElement('button');b.type='button';b.textContent=choice;b.setAttribute('aria-pressed','false');b.onclick=()=>{for(const c of $('choices').children)c.setAttribute('aria-pressed','false');b.setAttribute('aria-pressed','true');$('thought').value=choice;};$('choices').append(b);}
  $('answer').hidden=true;$('reveal').hidden=false;$('next').hidden=true;$('answerText').textContent=q.answer;$('explanation').textContent=q.explanation;$('prompt').focus();
 }
 function valid(q,f){return q&&typeof q.id==='string'&&typeof q.prompt==='string'&&typeof q.answer==='string'&&Array.isArray(q.references)&&q.references.every(r=>typeof r.label==='string'&&typeof r.url==='string'&&r.url.startsWith('https://www.biblegateway.com/'))&&Array.isArray(q.tags)&&Array.isArray(q.mcheyne_days)&&(!q.choices||Array.isArray(q.choices))&&core.matches(q,f)&&!q.arithmetic;}
 async function start(){
  const f=filters();if($('mode').value==='mcheyne'&&!f.day){$('status').textContent='읽을 날짜를 선택해 주세요.';return;}
  const seq=++requestId;controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);$('start').disabled=true;$('status').textContent='선택한 범위에서 문제를 고르고 있습니다…';
  try{
   let result,source='로컬 문제은행';
   if($('source').value==='online'&&cfg.url&&cfg.publishableKey){try{const res=await fetch(`${cfg.url}/rest/v1/rpc/bible_quiz_random`,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_book:f.book||null,p_theme:f.theme||null,p_difficulty:f.difficulty||null,p_day:f.day||null,p_origin:f.origin||null,p_exclude:[...seen],p_count:Number($('count').value)}),signal:controller.signal});if(!res.ok)throw Error('rpc');const data=await res.json();if(!Array.isArray(data)||data.some(q=>!valid(q,f)))throw Error('data');result=[...new Map(data.filter(q=>!seen.has(q.id)).map(q=>[q.id,q])).values()];source='Supabase 실시간 무작위 출제';}catch{if(seq!==requestId)return;source='온라인 연결 실패 · 로컬 문제은행으로 전환';}}
   if(seq!==requestId)return;
   if(!result)result=core.select(bank,f,[...seen],Number($('count').value));
   if(!result.length){$('status').textContent='이 조건의 문제를 모두 풀었습니다. 조건을 바꾸거나 다시 복습해 주세요.';$('start').textContent='같은 범위 다시 복습 →';seen.clear();$('card').hidden=true;$('empty').hidden=false;return;}
   queue=result;index=0;$('status').textContent=`${source} · ${result.length}문제`;$('start').textContent='새 랜덤 문제 시작 →';show();
  }finally{clearTimeout(timeout);if(seq===requestId)$('start').disabled=false;}
 }
 for(const id of ['book','theme','difficulty','origin','mode','date','count','source'])$(id).addEventListener('change',refresh);
 $('start').onclick=start;$('reveal').onclick=()=>{$('answer').hidden=false;$('reveal').hidden=true;$('next').hidden=false;};$('next').onclick=()=>{index++;show();};refresh();
})();
