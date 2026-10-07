(function(){
var $=function(s,r){return(r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var T=['Cardiology','Orthopedics','Oncology','Neurology','General Surgery'];
var H=[{n:'Apollo Hospitals',c:'Chennai',k:1,m:[94,92,90,91,93]},{n:'Fortis Healthcare',c:'Gurugram',k:.95,m:[91,95,93,89,90]},{n:'Manipal Hospitals',c:'Bengaluru',k:.9,m:[88,89,91,94,92]}];
var BASE=[500000,420000,650000,550000,350000],RATE={Standard:3500,Comfort:5500,Premium:8500};
var S={t:0,h:0},timers={};
var inr=function(n){return'₹'+Math.round(n).toLocaleString('en-IN')};
var esc=function(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML};
/* Gemini */
var DEF='gemini-3.5-flash';
var G={key:function(){try{return sessionStorage.getItem('mp-key')||''}catch(e){return''}},model:function(){try{return sessionStorage.getItem('mp-model')||DEF}catch(e){return DEF}}};
var SYS='You are MediPath, a patient-friendly assistant in a medical tourism demo app. Help with finding hospitals, understanding reports in plain language, cost estimates and travel planning in India. Never diagnose or prescribe; suggest consulting a qualified doctor. Hospital data in this app is sample data. Keep answers under 90 words, in simple language.';
function clean(t){return t.replace(/^```(?:json)?\s*|\s*```$/g,'').trim()}
function gem(parts,o){
  o=o||{};
  var body={systemInstruction:{parts:[{text:o.sys||SYS}]},contents:o.contents||[{role:'user',parts:parts}],generationConfig:{temperature:.4}};
  if(o.json)body.generationConfig.responseMimeType='application/json';
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/'+G.model()+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':G.key()},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){
    if(!r.ok)throw new Error(d.error&&d.error.message||'request failed ('+r.status+')');
    var p=d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts;
    if(!p)throw new Error('no answer returned, try again');
    return p.map(function(x){return x.text||''}).join('');
  })});
}
function setAI(){var on=!!G.key();$$('[data-ai]').forEach(function(b){b.textContent=on?'AI: Gemini on':'AI: demo mode'})}
function openAI(){$('#ak').value=G.key();$('#am').value=G.model();$('#aid').showModal()}
function fill(el,a,v){el.innerHTML=a.map(function(x,i){return'<option value="'+i+'">'+x+'</option>'}).join('');el.value=v}

/* navigation */
function go(v){
  if(v==='start'){go('report');setTimeout(function(){$('#treats').scrollIntoView({behavior:'smooth',block:'center'})},60);return}
  $$('.view').forEach(function(e){e.classList.toggle('on',e.id==='v-'+v)});
  $$('#menu a').forEach(function(a){a.classList.toggle('on',a.dataset.go===v)});
  $('#menu').classList.remove('open');$('#burger').setAttribute('aria-expanded','false');
  window.scrollTo(0,0);
  if(v==='dashboard'){$('#pb').style.width='0';setTimeout(function(){$('#pb').style.width='65%'},80)}
  if(v==='assistant')$('#chat').scrollTop=1e5;
}
document.addEventListener('click',function(e){
  var g=e.target.closest('[data-go]');
  if(g){e.preventDefault();go(g.dataset.go);return}
  if(e.target.closest('[data-ai]')){openAI();return}
  if(e.target.closest('[data-da]')){demoAnalyze();return}
  var q=e.target.closest('[data-q]');if(q){ask(q.dataset.q);return}
  var v=e.target.closest('[data-v]');
  if(v){var d=v.closest('.hc').querySelector('.dt');d.hidden=!d.hidden;return}
  var m=e.target.closest('[data-m]');if(m)match(+m.dataset.m);
});
$('#burger').onclick=function(){var o=$('#menu').classList.toggle('open');this.setAttribute('aria-expanded',o)};

/* theme (same behaviour as the CES page) */
var root=document.documentElement,tg=$('#theme');
function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches}
function paint(){var d=isDark();tg.textContent=d?'Light':'Dark';tg.setAttribute('aria-pressed',d)}
try{var sv=localStorage.getItem('medipath-theme');if(sv)root.setAttribute('data-theme',sv)}catch(e){}
tg.onclick=function(){var n=isDark()?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('medipath-theme',n)}catch(e){}paint()};
paint();

/* treatment selection */
function setT(i){
  S.t=i;$('#f-t').value=i;$('#c-t').value=i;
  $$('#treats button').forEach(function(b,j){b.classList.toggle('on',j===i);b.setAttribute('aria-pressed',j===i)});
  renderH();renderCost();
}
fill($('#f-t'),T,0);fill($('#c-t'),T,0);fill($('#c-h'),H.map(function(h){return h.n}),0);
$('#treats').innerHTML=T.map(function(t,i){return'<button type="button">'+t+'</button>'}).join('');
$$('#treats button').forEach(function(b,i){b.onclick=function(){setT(i)}});

/* chat */
function say(c,h){var d=document.createElement('div');d.className='msg '+c;d.innerHTML=h;$('#chat').appendChild(d);$('#chat').scrollTop=1e5;return d}
function btn(g,t){return'<br><button class="btn sm" type="button" data-go="'+g+'">'+t+'</button>'}
function reply(q){
  var s=q.toLowerCase();
  if(/hospital|heart|doctor/.test(s))return'I found 3 sample hospitals for '+T[S.t]+'. The top sample match is '+H[0].n+' at 94%.'+btn('hospital','Open Find Hospital');
  if(/report|analy|scan|result/.test(s))return'Upload a report and I will explain it in simple language. Try the demo report to see how it works.'+btn('report','Open Medical Report');
  if(/cost|price|estimate|budget/.test(s))return'I can estimate treatment, stay, travel and local transport together. Change any option and the total updates.'+btn('cost','Open Cost Estimator');
  if(/travel|flight|hotel|trip|plan/.test(s))return'I can build a plan from arrival to return home, including hotel, transport and follow-up.'+btn('travel','Open Travel Planner');
  return'I can help you find suitable hospitals, understand your report, estimate costs, and plan your journey.';
}
function tail(q){var r=reply(q),i=r.indexOf('<br>');return i<0?'':r.slice(i)}
function ask(q){
  say('u',esc(q));var tp=say('a','<span class="dots"><i></i><i></i><i></i></span>');
  if(!G.key()){setTimeout(function(){tp.innerHTML=reply(q);$('#chat').scrollTop=1e5},800);return}
  hist.push({role:'user',parts:[{text:q}]});
  gem(null,{contents:hist,sys:SYS+' The patient has selected '+T[S.t]+'.'}).then(function(t){
    hist.push({role:'model',parts:[{text:t}]});
    tp.innerHTML=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>')+tail(q);
  }).catch(function(e){hist.pop();tp.innerHTML='Gemini is unavailable ('+esc(e.message)+'). Here is a demo reply instead.<br>'+reply(q)}).then(function(){$('#chat').scrollTop=1e5});
}
say('u','I want to find a hospital for heart treatment in India.');
say('a','I can help you find suitable hospitals, understand your report, estimate costs, and plan your journey.');
var hist=[{role:'user',parts:[{text:'I want to find a hospital for heart treatment in India.'}]},{role:'model',parts:[{text:'I can help you find suitable hospitals, understand your report, estimate costs, and plan your journey.'}]}];
$('#cf').onsubmit=function(e){e.preventDefault();var v=$('#ci').value.trim();if(v){ask(v);$('#ci').value=''}};

/* report */
$('#file').onchange=function(){$('#fn').textContent=this.files[0]?this.files[0].name+(G.key()?' selected. Gemini will analyze it.':' selected. Add a Gemini key in AI settings to analyze it.'):'Choose a PDF, image or text file, or use the demo report below.'};
function demoAnalyze(){
  var r=$('#rep');r.hidden=false;
  r.innerHTML='<div class="ld"><i class="sp"></i>Analyzing your report with AI...</div>';
  clearTimeout(timers.a);
  timers.a=setTimeout(function(){
    r.innerHTML='<h3>AI Summary</h3><dl><dt>Condition</dt><dd>Sample Cardiac Condition</dd><dt>Summary</dt><dd>This is a demonstration summary showing how MediPath could explain medical information in simpler language.</dd><dt>Suggested next step</dt><dd>Consult a qualified specialist for further evaluation.</dd></dl><p class="note">This is a prototype demonstration and is not medical advice.</p><div class="row"><button class="btn" type="button" data-go="hospital">Find Hospital</button></div>';
  },1700);
}
function analyze(){
  var f=$('#file').files[0];
  if(!f||!G.key())return demoAnalyze();
  var r=$('#rep');r.hidden=false;
  var fail=function(m){r.innerHTML='<p>Could not analyze this file: '+esc(m)+'</p><div class="row"><button class="btn alt" type="button" data-da>Show demo result</button></div>'};
  if(f.size>10485760)return fail('files must be under 10 MB.');
  if(!/^(application\/pdf|image\/|text\/)/.test(f.type))return fail('use a PDF, image or text file.');
  r.innerHTML='<div class="ld"><i class="sp"></i>Analyzing your report with Gemini...</div>';
  var rd=new FileReader();
  rd.onerror=function(){fail('the file could not be read.')};
  rd.onload=function(){
    var q='Explain this medical report to the patient in simple language. Reply with JSON only: {"condition":"main condition or finding in plain words","summary":"2-3 simple sentences","findings":["up to 4 key points, with values if present"],"specialist":"type of specialist to consult","treatment":"one of Cardiology, Orthopedics, Oncology, Neurology, General Surgery, Other","nextStep":"one sentence"}. Do not diagnose or give treatment advice. If this is not a medical report, set condition to "Not a medical report" and explain in summary.';
    gem([{inline_data:{mime_type:f.type,data:rd.result.split(',')[1]}},{text:q}],{json:1}).then(function(t){
      var d=JSON.parse(clean(t)),i=T.indexOf(d.treatment);
      r.innerHTML='<h3>AI Summary</h3><dl><dt>Condition</dt><dd>'+esc(d.condition||'')+'</dd><dt>Summary</dt><dd>'+esc(d.summary||'')+'</dd>'+(d.findings&&d.findings.length?'<dt>Key findings</dt><dd><ul>'+d.findings.map(function(x){return'<li>'+esc(String(x))+'</li>'}).join('')+'</ul></dd>':'')+'<dt>Suggested next step</dt><dd>'+esc(d.nextStep||'Consult a qualified specialist for further evaluation.')+(d.specialist?' Suggested specialist: '+esc(d.specialist)+'.':'')+'</dd></dl><p class="note">This is a prototype demonstration and is not medical advice.</p><div class="row"><button class="btn" type="button" data-go="hospital">Find Hospital</button></div>';
      if(i>=0)setT(i);
    }).catch(function(e){fail(e.message)});
  };
  rd.readAsDataURL(f);
}
$('#an').onclick=analyze;

/* hospitals */
function renderH(){
  var t=+$('#f-t').value,loc=$('#f-l').value,bg=+$('#f-b').value;
  var L=H.map(function(h,i){return{h:h,i:i,m:h.m[t]}}).filter(function(x){return(!loc||x.h.c===loc)&&(!bg||BASE[t]*x.h.k<=bg)}).sort(function(a,b){return b.m-a.m});
  $('#hl').innerHTML=L.length?L.map(function(x){return'<article class="card hc"><span class="tag">Sample</span><h3>'+x.h.n+'</h3><p>India · '+x.h.c+'</p><p>'+T[t]+'</p><div class="mt"><b>'+x.m+'%</b> AI Match</div><div class="row"><button class="btn alt sm" type="button" data-v="'+x.i+'">View Hospital</button><button class="btn sm" type="button" data-m="'+x.i+'">Get Match</button></div><p class="dt" hidden>Sample profile: specialist team, international patient desk and multilingual support. Demo information only.</p></article>'}).join(''):'<p class="empty">No sample hospitals match these filters. Try another location or a higher budget.</p>';
  $('#mx').hidden=true;
}
function match(i){
  var t=+$('#f-t').value,h=H[i],loc=$('#f-l').value||'Any location in India',bg=$('#f-b').selectedOptions[0].text;
  S.h=i;$('#c-h').value=i;renderCost();
  var m=$('#mx');m.hidden=false;
  m.innerHTML='<h3>AI Match Explanation</h3><p><b>'+h.n+' — '+h.m[t]+'%</b></p><p id="mxt">Strong match based on treatment type, location, and your selected preferences.</p><ul><li>Treatment: '+T[t]+'</li><li>Location: '+loc+'</li><li>Budget: '+bg+'</li><li>Language: '+$('#f-g').value+'</li></ul><p class="note">Sample match for demonstration only.</p><div class="row"><button class="btn" type="button" data-go="cost">Estimate Cost</button></div>';
  if(G.key()){var mt=$('#mxt');mt.textContent='Writing your explanation with Gemini...';
    gem([{text:'In 2-3 short sentences, tell the patient why '+h.n+' ('+h.m[t]+'% AI match) is a sample match for '+T[t]+'. Use these preferences: location '+loc+', budget '+bg+', language '+$('#f-g').value+'. Say it is sample/demo data. No medical advice.'}]).then(function(x){mt.textContent=x.trim()}).catch(function(){mt.textContent='Strong match based on treatment type, location, and your selected preferences.'})}
  if(!document.body.classList.contains('demo-on'))m.scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('#f-t').onchange=function(){setT(+this.value)};
['f-l','f-b'].forEach(function(id){$('#'+id).onchange=renderH});
$('#f-g').onchange=function(){$('#mx').hidden=true};

/* cost */
function renderCost(){
  var t=+$('#c-t').value,h=H[+$('#c-h').value],n=+$('#c-s').value,a=$('#c-a').value;
  var tr=Math.round(BASE[t]*h.k/1000)*1000,ac=RATE[a]*n,tv=40000,lt=1500*n;
  $('#cr').innerHTML=[['Treatment',tr],['Accommodation',ac],['Travel',tv],['Local Transport',lt]].map(function(r){return'<li><span>'+r[0]+'</span><b>'+inr(r[1])+'</b></li>'}).join('');
  $('#ct').textContent=inr(tr+ac+tv+lt);
}
$('#c-t').onchange=function(){setT(+this.value)};
['c-h','c-s','c-a'].forEach(function(id){$('#'+id).onchange=renderCost});

/* travel plan */
function plan(){
  var P=[['12 Oct','Arrival','Airport pickup and hotel check-in'],['15 Oct','Hospital Consultation','10:30 AM at '+H[S.h].n+' (sample)'],['17 Oct','Treatment','Sample '+T[S.t]+' procedure'],['18–26 Oct','Recovery','Hotel stay with daily check-ins'],['28 Oct','Follow-up','Final check-up and report review'],['29 Oct','Return Home','Airport transfer and flight']];
  var r=$('#plan');r.hidden=false;
  if(G.key()){
    r.innerHTML='<div class="ld"><i class="sp"></i>Creating your plan with Gemini...</div>';
    gem([{text:'A patient is traveling to '+H[S.h].c+', India for '+T[S.t]+' care at '+H[S.h].n+' (sample hospital) and will stay '+$('#c-s').value+' nights. Return a JSON array of exactly 6 short practical tips (max 14 words each) for these stages in order: Arrival, Hospital Consultation, Treatment, Recovery, Follow-up, Return Home. No medical advice.'}],{json:1}).then(function(t){
      JSON.parse(clean(t)).forEach(function(x,i){if(P[i]&&typeof x==='string')P[i][2]=esc(x)});draw();
    }).catch(function(){draw()});
  }else draw();
  function draw(){r.innerHTML='<h3>Your Sample Journey Plan</h3>'+P.map(function(p){return'<div class="pl"><b>'+p[0]+'</b><span><b>'+p[1]+'</b><br><small>'+p[2]+'</small></span></div>'}).join('')+'<p class="note">Sample plan for demonstration only.</p><div class="row"><button class="btn" type="button" data-go="dashboard">View My Dashboard</button></div>';}
  $$('#tl li').forEach(function(li,i){li.classList.remove('on');setTimeout(function(){li.classList.add('on')},i*180)});
}
$('#mk').onclick=plan;

/* demo mode */
var D=[
 ['Ask the AI assistant',function(){go('assistant')}],
 ['Understand your report',function(){go('report');analyze()}],
 ['Match with a hospital',function(){go('hospital');var f=$('#hl [data-m]');if(f)match(+f.dataset.m)}],
 ['Estimate the cost',function(){go('cost')}],
 ['Plan the trip',function(){go('travel');plan()}],
 ['Track your journey',function(){go('dashboard')}]
];
var di=-1;
function demo(i){
  if(i<0||i>=D.length){di=-1;$('#demo').hidden=true;$('#dbtn').hidden=false;document.body.classList.remove('demo-on');return}
  di=i;document.body.classList.add('demo-on');$('#dbtn').hidden=true;$('#demo').hidden=false;
  $('#ds').textContent='Step '+(i+1)+' of '+D.length;$('#dt').textContent=D[i][0];
  $('#dp').style.width=((i+1)/D.length*100)+'%';
  $('#dnext').textContent=i===D.length-1?'Finish':'Next';$('#dback').disabled=i===0;
  D[i][1]();
}
$('#dbtn').onclick=function(){demo(0)};
$('#dnext').onclick=function(){demo(di+1)};
$('#dback').onclick=function(){demo(di-1)};
$('#dx').onclick=function(){demo(-1)};

$('#asave').onclick=function(){try{sessionStorage.setItem('mp-key',$('#ak').value.trim());sessionStorage.setItem('mp-model',$('#am').value.trim()||DEF)}catch(e){}setAI();$('#aid').close()};
$('#aclr').onclick=function(){try{sessionStorage.removeItem('mp-key')}catch(e){}$('#ak').value='';setAI()};
$('#aclose').onclick=function(){$('#aid').close()};
setAI();setT(0);
})();