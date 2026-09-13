(function(root){
 'use strict';
 function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function matches(q,f={}){return (!f.book||q.book_id===f.book)&&(!f.theme||q.tags.includes(f.theme))&&(!f.difficulty||q.difficulty===f.difficulty)&&(!f.day||q.mcheyne_days.includes(Number(f.day)))&&(!f.origin||q.origin===f.origin);}
 function select(bank,f={},exclude=[],count=10,random=Math.random){const seen=new Set(exclude);return shuffle(bank.questions.filter(q=>matches(q,f)&&!seen.has(q.id)),random).slice(0,Math.max(1,Math.min(50,count)));}
 function calendarDay(bank,date){let key=typeof date==='string'?date.slice(-5):`${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;if(key==='02-29')key='02-28';return bank.days.find(d=>d.date===key)||null;}
 function numericPrompt(q){const p=q.prompt||q.question||q.question_text||'';const s=typeof p==='string'?p:Object.values(p).join(' ');return /몇|얼마|계산|합계|합하면|총합|빼면|곱하|나누면|berapa|how many|how much|subtract|multiply|divide|\d\s*[+×÷=]/i.test(s);}
 function limitNumeric(list,limit=20){let count=0;return list.filter(q=>!numericPrompt(q)||++count<=limit);}
 const api={shuffle,matches,select,calendarDay,numericPrompt,limitNumeric};root.BibleReadingCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
