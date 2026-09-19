(function(){
  "use strict";

  /* ============================================================
     DATA
  ============================================================ */
  var MONTHS = [
    {
      id:1, roman:'I', color:'var(--m1)', name:'Fundamentos',
      objective:'Construir una base sólida.',
      themes:['Presentación personal','Familia y trabajo','Rutina diaria','Presente y pasado básico','Futuro','Preguntas y vocabulario cotidiano'],
      tasks:[
        {key:'anki',    label:'Anki',              detail:'Repaso de tarjetas pendientes + 10–15 palabras o frases nuevas.'},
        {key:'bbc',     label:'BBC Learning English', detail:'Listening sencillo: escucha → lee la transcripción → repite en voz alta.'},
        {key:'council', label:'British Council',   detail:'Gramática y ejercicios.'},
        {key:'chatgpt', label:'ChatGPT',           detail:'Frases y conversaciones básicas.'}
      ]
    },
    {
      id:2, roman:'II', color:'var(--m2)', name:'Comprensión y conversación',
      objective:'Empezar a pensar y responder en inglés.',
      themes:['Experiencias','Opiniones','Situaciones cotidianas','Viajes','Trabajo','Conversación general'],
      tasks:[
        {key:'anki',    label:'Anki',                  detail:'Vocabulario y frases nuevas de la semana.'},
        {key:'bbc',     label:'BBC · 6 Minute English', detail:'Un episodio trabajado a lo largo de 2 días.'},
        {key:'council', label:'British Council',       detail:'Gramática y listening.'},
        {key:'chatgpt', label:'ChatGPT',               detail:'Conversaciones de 5 a 10 minutos.'}
      ]
    },
    {
      id:3, roman:'III', color:'var(--m3)', name:'Inglés profesional',
      objective:'Llevar el inglés a tu campo laboral.',
      themes:['Accounting','Finance','Costs','Excel','Data','Business','Technology','AI','Automation'],
      tasks:[
        {key:'anki',    label:'Anki',    detail:'Vocabulario profesional del área.'},
        {key:'bbc',     label:'BBC',     detail:'Tecnología, negocios, ciencia y trabajo.'},
        {key:'youtube', label:'YouTube', detail:'Contenido profesional en inglés.'},
        {key:'chatgpt', label:'ChatGPT', detail:'Entrevistas, reuniones y explicaciones profesionales.'}
      ]
    },
    {
      id:4, roman:'IV', color:'var(--m4)', name:'Inglés real',
      objective:'Utilizar el inglés profesionalmente.',
      themes:['Entrevistas','Reuniones','Presentaciones','Explicar problemas','Proponer soluciones'],
      tasks:[
        {key:'anki',    label:'Anki',             detail:'Consolidación de vocabulario.'},
        {key:'bbc',     label:'BBC + YouTube',    detail:'Escuchar contenido real, sin traducir.'},
        {key:'chatgpt', label:'ChatGPT',          detail:'Conversación diaria.'},
        {key:'writing', label:'Práctica escrita', detail:'Correos, mensajes, informes y respuestas profesionales.'}
      ]
    }
  ];
  var TASKS_PER_DAY = 4;

  var START_KEY = 'ruta_ingles_start_date_v1';
  var DATA_KEY  = 'ruta_ingles_data_v1';
  var THEME_KEY = 'ruta_ingles_theme_v1';

  /* ============================================================
     STORAGE HELPERS (all guarded — storage can throw or be absent)
  ============================================================ */
  function safeGet(key){
    try{ return window.localStorage.getItem(key); }catch(e){ return null; }
  }
  function safeSet(key, val){
    try{ window.localStorage.setItem(key, val); return true; }catch(e){ return false; }
  }
  function safeRemove(key){
    try{ window.localStorage.removeItem(key); }catch(e){}
  }

  function loadData(){
    var raw = safeGet(DATA_KEY);
    if(!raw) return {};
    try{ var parsed = JSON.parse(raw); return (parsed && typeof parsed === 'object') ? parsed : {}; }
    catch(e){ return {}; }
  }
  function saveData(data){ safeSet(DATA_KEY, JSON.stringify(data)); }

  function getStartKey(){ return safeGet(START_KEY); }
  function setStartKey(k){ safeSet(START_KEY, k); }

  function getTheme(){ return safeGet(THEME_KEY) || 'auto'; }
  function setTheme(t){
    safeSet(THEME_KEY, t);
    if(t === 'auto'){ document.documentElement.removeAttribute('data-theme'); }
    else{ document.documentElement.setAttribute('data-theme', t); }
  }

  /* ============================================================
     DATE HELPERS (local calendar dates, no timezone surprises)
  ============================================================ */
  function pad(n){ return n < 10 ? '0'+n : ''+n; }
  function dateToKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function keyToDate(k){
    var parts = k.split('-');
    return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
  }
  function todayKey(){ return dateToKey(new Date()); }
  function addDaysKey(k, n){
    var d = keyToDate(k);
    d.setDate(d.getDate()+n);
    return dateToKey(d);
  }
  function daysBetween(k1, k2){
    var a = keyToDate(k1), b = keyToDate(k2);
    return Math.round((b - a) / 86400000);
  }
  function formatLong(k){
    var d = keyToDate(k);
    var months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    var days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    return days[d.getDay()] + ' ' + d.getDate() + ' de ' + months[d.getMonth()];
  }

  /* ============================================================
     PLAN MATH
  ============================================================ */
  function dayIndexFor(dateKey){
    var start = getStartKey();
    if(!start) return null;
    return daysBetween(start, dateKey) + 1;
  }
  // Month boundaries follow real calendar months from the start date (so "Mes I..IV"
  // lines up with 4 actual months, whatever their length), while the weekly 6+1 rest
  // cadence is a simple day-count independent of month length.
  // Adds n calendar months to a date, clamping to the last valid day of the
  // target month instead of overflowing into the following month (the
  // standard "billing cycle" rule: Jan 31 + 1 month = Feb 28, not Mar 3).
  function addMonthsClamped(date, n){
    var y = date.getFullYear();
    var m = date.getMonth() + n;
    var targetYear = y + Math.floor(m/12);
    var targetMonth = ((m % 12) + 12) % 12;
    var lastDay = new Date(targetYear, targetMonth+1, 0).getDate();
    var day = Math.min(date.getDate(), lastDay);
    return new Date(targetYear, targetMonth, day);
  }
  function monthBoundaries(startKey){
    var start = keyToDate(startKey);
    var arr = [];
    for(var i=0;i<=MONTHS.length;i++){
      arr.push(dateToKey(addMonthsClamped(start, i)));
    }
    return arr; // length 5: arr[0]=start … arr[4]=end (exclusive)
  }
  function totalPlanDays(startKey){
    var b = monthBoundaries(startKey);
    return daysBetween(b[0], b[b.length-1]);
  }
  function monthForDateKey(dateKey, startKey){
    var b = monthBoundaries(startKey);
    for(var i=0;i<MONTHS.length;i++){
      if(dateKey >= b[i] && dateKey < b[i+1]) return MONTHS[i];
    }
    return null;
  }
  function weekInMonthByDate(dateKey, startKey, month){
    var b = monthBoundaries(startKey);
    return Math.floor(daysBetween(b[month.id-1], dateKey)/7) + 1;
  }
  function isRestDay(dayIndex){
    return ((dayIndex - 1) % 7) === 6;
  }
  function isPlanFinished(dayIndex, total){ return dayIndex > total; }

  /* ============================================================
     STATE
  ============================================================ */
  var state = {
    tab: 'hoy',
    viewedDateKey: todayKey(),
    heatMonthOffset: 0, // 0 = month containing today
    expandedTask: null,
    expandedPlanMonth: null,
    settingsBackupText: ''
  };

  /* ============================================================
     ICONS (inline, stroke = currentColor)
  ============================================================ */
  var ICONS = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 3v4M16 3v4"></path><path d="M8 14l2.5 2.5L16 11"></path></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"></path></svg>',
    guide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"></path></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>'
  };

  /* ============================================================
     TOAST
  ============================================================ */
  var toastTimer = null;
  function showToast(msg){
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    if(toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1800);
  }

  /* ============================================================
     RENDER: SHELL
  ============================================================ */
  function render(){
    renderHeader();
    renderNav();
    var view = document.getElementById('view');
    if(!getStartKey()){
      view.innerHTML = renderOnboarding();
      bindOnboarding();
      return;
    }
    if(state.tab === 'hoy') { view.innerHTML = renderHoy(); bindHoy(); }
    else if(state.tab === 'plan') { view.innerHTML = renderPlan(); bindPlan(); }
    else if(state.tab === 'progreso') { view.innerHTML = renderProgreso(); bindProgreso(); }
    else if(state.tab === 'guia') { view.innerHTML = renderGuia(); bindGuia(); }
    else if(state.tab === 'ajustes') { view.innerHTML = renderAjustes(); bindAjustes(); }
  }

  function renderHeader(){
    var meta = document.getElementById('headerMeta');
    var start = getStartKey();
    if(!start){ meta.textContent = 'Configura tu fecha de inicio para comenzar.'; return; }
    var total = totalPlanDays(start);
    var dayIndex = dayIndexFor(todayKey());
    if(isPlanFinished(dayIndex, total)){
      meta.innerHTML = '<strong>Plan completado</strong> · '+total+' días recorridos';
      return;
    }
    var m = monthForDateKey(todayKey(), start);
    var wk = weekInMonthByDate(todayKey(), start, m);
    meta.innerHTML = 'Día <strong>'+dayIndex+'</strong> de '+total+' · Semana '+wk+' · Mes <strong>'+m.roman+'</strong>';
  }

  function renderNav(){
    var items = [
      {id:'hoy', label:'Hoy', icon:ICONS.today},
      {id:'plan', label:'Plan', icon:ICONS.plan},
      {id:'progreso', label:'Progreso', icon:ICONS.progress},
      {id:'guia', label:'Guía', icon:ICONS.guide},
      {id:'ajustes', label:'Ajustes', icon:ICONS.settings}
    ];
    var html = items.map(function(it){
      return '<button data-tab="'+it.id+'" class="'+(state.tab===it.id?'active':'')+'">'+it.icon+'<span>'+it.label+'</span></button>';
    }).join('');
    var nav = document.getElementById('bottomNav');
    nav.innerHTML = html;
    Array.prototype.forEach.call(nav.querySelectorAll('button'), function(btn){
      btn.addEventListener('click', function(){
        state.tab = btn.getAttribute('data-tab');
        state.expandedTask = null;
        render();
        window.scrollTo(0,0);
      });
    });
  }

  /* ============================================================
     ONBOARDING
  ============================================================ */
  function renderOnboarding(){
    return ''+
      '<div class="empty-state">'+
        '<div class="big">Antes de empezar</div>'+
        '<p>Elige la fecha en la que arranca tu plan de 4 meses. Puedes cambiarla luego en Ajustes.</p>'+
      '</div>'+
      '<div class="card">'+
        '<label class="field-label">Fecha de inicio</label>'+
        '<input type="date" id="obStartDate" value="'+todayKey()+'">'+
        '<button class="btn" id="obStartBtn">Comenzar plan</button>'+
      '</div>';
  }
  function bindOnboarding(){
    document.getElementById('obStartBtn').addEventListener('click', function(){
      var v = document.getElementById('obStartDate').value || todayKey();
      setStartKey(v);
      state.viewedDateKey = todayKey();
      render();
    });
  }

  /* ============================================================
     HOY
  ============================================================ */
  function renderHoy(){
    var dayIndex = dayIndexFor(state.viewedDateKey);
    var start = getStartKey();

    if(dayIndex < 1){
      // shouldn't normally happen; guard
      return '<p class="screen-sub">Esta fecha es anterior al inicio de tu plan.</p>';
    }

    var html = '';
    html += '<div class="day-nav">'+
      '<button id="prevDay" '+(state.viewedDateKey===start?'disabled':'')+'>'+ICONS.arrowLeft+'</button>'+
      '<div class="screen-sub" style="margin:0;text-transform:capitalize;">'+formatLong(state.viewedDateKey)+'</div>'+
      '<button id="nextDay">'+ICONS.arrowRight+'</button>'+
    '</div>';

    var total = totalPlanDays(start);
    if(isPlanFinished(dayIndex, total)){
      html += '<div class="empty-state"><div class="big">Plan completado</div>'+
        '<p>Recorriste los '+total+' días del plan. Revisa tu progreso o define una nueva fecha de inicio en Ajustes para repasar desde cero.</p></div>';
      return html;
    }

    var month = monthForDateKey(state.viewedDateKey, start);
    var restDay = isRestDay(dayIndex);

    html += '<div class="card" style="border-left:3px solid '+month.color+';">'+
      '<div class="label">Mes '+month.roman+' · '+month.name+'</div>'+
      '<h3>'+month.objective+'</h3>'+
    '</div>';

    if(restDay){
      html += renderRestDay(dayIndex, month);
    } else {
      var entry = loadData()[state.viewedDateKey] || {};
      var doneCount = month.tasks.reduce(function(acc,t){ return acc + (entry[t.key] ? 1 : 0); }, 0);
      html += '<div class="screen-title" id="todayProgressTitle">Tareas de hoy · '+doneCount+'/'+TASKS_PER_DAY+'</div>';
      html += '<div id="taskList">'+ month.tasks.map(function(t){ return renderTaskRow(t, entry); }).join('') +'</div>';
      html += '<div class="bar-track" style="margin-top:6px;"><div class="bar-fill" id="todayProgressFill" style="width:'+(doneCount/TASKS_PER_DAY*100)+'%; background:'+month.color+';"></div></div>';
    }
    return html;
  }

  function renderTaskRow(t, entry){
    var done = !!entry[t.key];
    var expanded = state.expandedTask === t.key;
    return '<div class="task '+(done?'done':'')+' '+(expanded?'expanded':'')+'" data-task="'+t.key+'">'+
      '<div class="task-head">'+
        '<div class="task-check" data-check="'+t.key+'">'+ICONS.check+'</div>'+
        '<div class="task-title-wrap" data-expand="'+t.key+'">'+
          '<div class="task-title">'+t.label+'</div>'+
          '<div class="task-time">15 min</div>'+
        '</div>'+
        '<div class="task-chevron" data-expand="'+t.key+'">'+ICONS.chevron+'</div>'+
      '</div>'+
      '<div class="task-body"><p>'+t.detail+'</p></div>'+
    '</div>';
  }

  function renderRestDay(dayIndex, month){
    // weekly recap: the 6 preceding practice days
    var start = getStartKey();
    var data = loadData();
    var total = 0, done = 0;
    for(var i=6;i>=1;i--){
      var idx = dayIndex - i;
      if(idx < 1) continue;
      var key = addDaysKey(start, idx-1);
      var entry = data[key] || {};
      var m = monthForDateKey(key, start);
      if(!m) continue;
      total += TASKS_PER_DAY;
      done += m.tasks.reduce(function(acc,t){ return acc + (entry[t.key]?1:0); }, 0);
    }
    return '<div class="card">'+
      '<div class="label">Día de descanso</div>'+
      '<h3>Descansa o repasa el vocabulario de la semana.</h3>'+
      '<p style="color:var(--ink-soft); font-size:0.87rem; margin-top:8px;">No hay tareas obligatorias hoy. Es un buen momento para repasar tus tarjetas de Anki con calma.</p>'+
    '</div>'+
    '<div class="card">'+
      '<div class="label">Repaso de la semana</div>'+
      '<h3>'+done+' / '+total+' tareas completadas</h3>'+
    '</div>';
  }

  function bindHoy(){
    var prev = document.getElementById('prevDay');
    var next = document.getElementById('nextDay');
    if(prev) prev.addEventListener('click', function(){
      state.viewedDateKey = addDaysKey(state.viewedDateKey, -1);
      state.expandedTask = null;
      render();
    });
    if(next) next.addEventListener('click', function(){
      state.viewedDateKey = addDaysKey(state.viewedDateKey, 1);
      state.expandedTask = null;
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-check]'), function(el){
      el.addEventListener('click', function(e){
        e.stopPropagation();
        toggleTask(el.getAttribute('data-check'));
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-expand]'), function(el){
      el.addEventListener('click', function(){
        var key = el.getAttribute('data-expand');
        state.expandedTask = (state.expandedTask === key) ? null : key;
        render();
      });
    });
  }

  function toggleTask(taskKey){
    var data = loadData();
    var k = state.viewedDateKey;
    if(!data[k]) data[k] = {};
    data[k][taskKey] = !data[k][taskKey];
    saveData(data);

    // Surgical DOM update (rather than a full render()) so the checkbox's
    // own CSS transition actually plays instead of appearing pre-finished.
    var taskEl = document.querySelector('[data-task="'+taskKey+'"]');
    if(taskEl){ taskEl.classList.toggle('done', !!data[k][taskKey]); }

    var start = getStartKey();
    var month = start ? monthForDateKey(k, start) : null;
    if(month){
      var entry = data[k] || {};
      var doneCount = month.tasks.reduce(function(acc,t){ return acc + (entry[t.key]?1:0); }, 0);
      var titleEl = document.getElementById('todayProgressTitle');
      if(titleEl) titleEl.textContent = 'Tareas de hoy · '+doneCount+'/'+TASKS_PER_DAY;
      var fillEl = document.getElementById('todayProgressFill');
      if(fillEl) fillEl.style.width = (doneCount/TASKS_PER_DAY*100)+'%';
    }
    renderHeader();
  }

  /* ============================================================
     PLAN (roadmap)
  ============================================================ */
  function renderPlan(){
    var start = getStartKey();
    var currentMonthId = 1;
    if(start){
      var total = totalPlanDays(start);
      var dayIndex = dayIndexFor(todayKey());
      currentMonthId = isPlanFinished(dayIndex, total) ? MONTHS.length : monthForDateKey(todayKey(), start).id;
    }
    if(state.expandedPlanMonth === null) state.expandedPlanMonth = currentMonthId;

    var html = '<div class="screen-title">Ruta completa</div>';
    html += '<div class="roadmap">';
    MONTHS.forEach(function(m, i){
      var isOpen = state.expandedPlanMonth === m.id;
      html += '<div class="month-block">'+
        '<div class="month-rail">'+
          '<div class="roman" style="background:'+m.color+';">'+m.roman+'</div>'+
          (i < MONTHS.length-1 ? '<div class="rail-line"></div>' : '')+
        '</div>'+
        '<div class="month-content">'+
          '<button class="month-toggle" data-month="'+m.id+'">'+
            '<div class="m-name">'+m.name+'</div>'+
            '<div class="m-obj">'+m.objective+'</div>'+
          '</button>'+
          '<div class="month-detail '+(isOpen?'open':'')+'" id="monthDetail'+m.id+'">'+
            '<div class="chip-row">'+ m.themes.map(function(th){ return '<span class="chip">'+th+'</span>'; }).join('') +'</div>'+
            '<div style="margin-top:12px;">'+
              m.tasks.map(function(t){ return '<div class="tool-line"><span class="t-name">'+t.label+'</span><span class="t-detail">'+t.detail+'</span></div>'; }).join('')+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';
    });
    html += '</div>';
    return html;
  }
  function bindPlan(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-month]'), function(btn){
      btn.addEventListener('click', function(){
        var id = parseInt(btn.getAttribute('data-month'),10);
        state.expandedPlanMonth = (state.expandedPlanMonth === id) ? null : id;
        render();
      });
    });
  }

  /* ============================================================
     PROGRESO
  ============================================================ */
  function computeStreaks(){
    var data = loadData();
    var start = getStartKey();
    if(!start) return {current:0, longest:0, activeDays:0};
    var total = totalPlanDays(start);
    var todayIdx = dayIndexFor(todayKey());
    var lastIdx = Math.min(todayIdx, total);
    var current = 0, longest = 0, running = 0, activeDays = 0;

    for(var idx=1; idx<=lastIdx; idx++){
      var key = addDaysKey(start, idx-1);
      var entry = data[key] || {};
      var m = monthForDateKey(key, start);
      if(!m) continue;
      var rest = isRestDay(idx);
      var doneCount = m.tasks.reduce(function(acc,t){ return acc + (entry[t.key]?1:0); }, 0);
      if(doneCount > 0) activeDays++;

      var satisfied = rest || (doneCount === TASKS_PER_DAY);
      if(satisfied){
        running++;
        if(running > longest) longest = running;
      } else {
        running = 0;
      }
    }
    // current streak = the running streak counted up to and including the last fully-satisfied day,
    // walking backward from today (today itself may be partial and shouldn't zero out yesterday's streak)
    current = 0;
    for(var j=lastIdx; j>=1; j--){
      var key2 = addDaysKey(start, j-1);
      var entry2 = data[key2] || {};
      var m2 = monthForDateKey(key2, start);
      if(!m2) continue;
      var rest2 = isRestDay(j);
      var doneCount2 = m2.tasks.reduce(function(acc,t){ return acc + (entry2[t.key]?1:0); }, 0);
      var satisfied2 = rest2 || (doneCount2 === TASKS_PER_DAY);
      if(satisfied2){ current++; }
      else if(j === lastIdx){ continue; } // today not finished yet — don't break the streak on today
      else { break; }
    }
    return {current:current, longest:longest, activeDays:activeDays};
  }

  function computeTotals(){
    var data = loadData();
    var start = getStartKey();
    var totalDone = 0, totalPossible = 0;
    var perMonth = MONTHS.map(function(){ return {done:0, possible:0}; });
    if(!start) return {totalDone:0,totalPossible:0,perMonth:perMonth};
    var total = totalPlanDays(start);
    var todayIdx = Math.min(dayIndexFor(todayKey()), total);
    for(var idx=1; idx<=todayIdx; idx++){
      if(isRestDay(idx)) continue;
      var key = addDaysKey(start, idx-1);
      var m = monthForDateKey(key, start);
      if(!m) continue;
      var mi = m.id-1;
      var entry = data[key] || {};
      var doneCount = m.tasks.reduce(function(acc,t){ return acc + (entry[t.key]?1:0); }, 0);
      totalDone += doneCount;
      totalPossible += TASKS_PER_DAY;
      perMonth[mi].done += doneCount;
      perMonth[mi].possible += TASKS_PER_DAY;
    }
    return {totalDone:totalDone, totalPossible:totalPossible, perMonth:perMonth};
  }

  function renderProgreso(){
    var streaks = computeStreaks();
    var totals = computeTotals();
    var overallPct = totals.totalPossible ? Math.round(totals.totalDone/totals.totalPossible*100) : 0;

    var html = '<div class="screen-title">Tu progreso</div>';
    html += '<div class="stat-grid">'+
      '<div class="stat-box"><div class="num">'+streaks.current+'</div><div class="lbl">Racha actual</div></div>'+
      '<div class="stat-box"><div class="num">'+streaks.longest+'</div><div class="lbl">Mejor racha</div></div>'+
      '<div class="stat-box"><div class="num">'+overallPct+'%</div><div class="lbl">Avance total</div></div>'+
    '</div>';

    html += '<div class="card">';
    MONTHS.forEach(function(m, i){
      var pm = totals.perMonth[i];
      var pct = pm.possible ? Math.round(pm.done/pm.possible*100) : 0;
      html += '<div class="bar-row">'+
        '<div class="bar-top"><span>Mes '+m.roman+' · '+m.name+'</span><span style="color:var(--ink-soft);">'+pct+'%</span></div>'+
        '<div class="bar-track"><div class="bar-fill" style="width:'+pct+'%; background:'+m.color+';"></div></div>'+
      '</div>';
    });
    html += '</div>';

    html += renderHeatmap();
    return html;
  }

  function renderHeatmap(){
    var start = getStartKey();
    if(!start) return '';
    var totalDays = totalPlanDays(start);
    // the calendar-month being displayed, based on offset from the month containing "today"
    var base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + state.heatMonthOffset);
    var y = base.getFullYear(), mo = base.getMonth();
    var monthLabelFmt = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][mo]+' '+y;
    var firstOfMonth = new Date(y, mo, 1);
    var daysInMonth = new Date(y, mo+1, 0).getDate();
    var leadingBlanks = firstOfMonth.getDay(); // 0=Sun

    var data = loadData();
    var today = todayKey();

    var html = '<div class="card">'+
      '<div class="heatmap-nav">'+
        '<button id="heatPrev">'+ICONS.arrowLeft+'</button>'+
        '<div class="label" style="text-transform:capitalize;">'+monthLabelFmt+'</div>'+
        '<button id="heatNext">'+ICONS.arrowRight+'</button>'+
      '</div>'+
      '<div class="heat-grid">'+
        ['D','L','M','X','J','V','S'].map(function(d){ return '<div style="text-align:center;font-size:0.65rem;color:var(--ink-faint);">'+d+'</div>'; }).join('');

    for(var b=0;b<leadingBlanks;b++){ html += '<div></div>'; }

    for(var d=1; d<=daysInMonth; d++){
      var cellDate = new Date(y, mo, d);
      var key = dateToKey(cellDate);
      var cls = 'heat-cell';
      var label = d;
      if(key === today) cls += ' today';
      if(cellDate > new Date(today+'T23:59:59')) cls += ' future';
      var bg = 'var(--panel)';
      if(daysBetween(start, key) >= 0){
        var idx = daysBetween(start, key) + 1;
        if(idx <= totalDays){
          var m = monthForDateKey(key, start);
          if(isRestDay(idx)){
            cls += ' rest';
          } else {
            var entry = data[key] || {};
            var doneCount = m.tasks.reduce(function(acc,t){ return acc + (entry[t.key]?1:0); }, 0);
            if(doneCount > 0){
              var op = 0.28 + (doneCount/TASKS_PER_DAY)*0.72;
              bg = colorMix(m.color, op);
            }
          }
        }
      }
      html += '<div class="'+cls+'" style="background:'+bg+';">'+label+'</div>';
    }
    html += '</div></div>';
    return html;
  }

  // approximate alpha-blend of a css var color token against panel, using a fixed lookup
  var COLOR_HEX = { 'var(--m1)':'#2F5D50', 'var(--m2)':'#96731F', 'var(--m3)':'#A85526', 'var(--m4)':'#7A3434' };
  function colorMix(varColor, alpha){
    var hex = COLOR_HEX[varColor] || '#2F5D50';
    var r = parseInt(hex.substr(1,2),16), g = parseInt(hex.substr(3,2),16), b = parseInt(hex.substr(5,2),16);
    return 'rgba('+r+','+g+','+b+','+alpha.toFixed(2)+')';
  }

  function bindProgreso(){
    var p = document.getElementById('heatPrev');
    var n = document.getElementById('heatNext');
    if(p) p.addEventListener('click', function(){ state.heatMonthOffset--; render(); });
    if(n) n.addEventListener('click', function(){ state.heatMonthOffset++; render(); });
  }

  /* ============================================================
     GUÍA
  ============================================================ */
  var CHATGPT_PROMPT = 'Actúa como mi profesor de inglés. Hazme una pregunta en inglés relacionada con [tema]. Espera mi respuesta, corrige mis errores brevemente y hazme la siguiente pregunta.';
  var CORRECTION_PROMPT = 'Corrige mi texto. Muéstrame mis errores y la versión correcta. Explica brevemente los errores importantes.';

  function renderGuia(){
    var html = '<div class="screen-title">Cómo usar cada herramienta</div>';

    html += '<div class="card guide-card">'+
      '<div class="icon-row"><div class="icon-badge" style="background:var(--m1);color:var(--on-accent);">A</div><h3>Anki — 15 min</h3></div>'+
      '<p style="color:var(--ink-soft); font-size:0.88rem;">Objetivo: memorizar vocabulario y frases.</p>'+
      '<ol>'+
        '<li>Abre Anki.</li>'+
        '<li>Haz primero el repaso de tarjetas pendientes.</li>'+
        '<li>Agrega 5–10 frases nuevas.</li>'+
        '<li>Cada tarjeta: frente en inglés, reverso en español. Prioriza frases completas, no palabras sueltas.</li>'+
      '</ol>'+
      '<div class="example-box"><div class="ex-en">I have experience in cost accounting.</div><div class="ex-es">Tengo experiencia en contabilidad de costos.</div></div>'+
      '<p style="color:var(--ink-faint); font-size:0.8rem; margin-top:10px;">Las frases nuevas salen de lo que estudias en BBC, British Council y ChatGPT.</p>'+
    '</div>';

    html += '<div class="card guide-card">'+
      '<div class="icon-row"><div class="icon-badge" style="background:var(--m2);color:var(--on-accent);">B</div><h3>BBC Learning English — 15 min</h3></div>'+
      '<p style="color:var(--ink-soft); font-size:0.88rem;">Objetivo: entrenar el oído, principalmente con 6 Minute English.</p>'+
      '<ol>'+
        '<li>Primera escucha sin subtítulos: entiende la idea general.</li>'+
        '<li>Segunda escucha con transcripción: identifica lo que no entendiste.</li>'+
        '<li>Tercera escucha: repite en voz alta algunas frases.</li>'+
      '</ol>'+
      '<p style="color:var(--ink-faint); font-size:0.8rem; margin-top:10px;">No necesitas entender el 100%. Un episodio equivale a unos 2 días de trabajo.</p>'+
    '</div>';

    html += '<div class="card guide-card">'+
      '<div class="icon-row"><div class="icon-badge" style="background:var(--m3);color:var(--on-accent);">C</div><h3>ChatGPT — 15 min</h3></div>'+
      '<p style="color:var(--ink-soft); font-size:0.88rem;">Objetivo: aprender a expresarte. Copia este mensaje y reemplaza [tema] por el tema del día.</p>'+
      '<div class="prompt-box" id="promptBox">'+CHATGPT_PROMPT+'</div>'+
      '<button class="btn secondary small copy-btn" data-copy="'+encodeURIComponent(CHATGPT_PROMPT)+'">Copiar mensaje</button>'+
      '<p style="color:var(--ink-faint); font-size:0.8rem; margin-top:12px;">Progresión: Mes I preguntas sencillas · Mes II conversaciones · Mes III situaciones profesionales · Mes IV entrevistas y reuniones.<br>Intenta responder en inglés aunque cometas errores.</p>'+
    '</div>';

    html += '<div class="card guide-card">'+
      '<div class="icon-row"><div class="icon-badge" style="background:var(--m4);color:var(--on-accent);">E</div><h3>Práctica escrita — 10–15 min</h3></div>'+
      '<p style="color:var(--ink-soft); font-size:0.88rem;">No necesitas otra aplicación: usa ChatGPT. Escribe a diario 5–10 frases sobre algo que hiciste, tu trabajo, algo que aprendiste, una opinión o tus planes.</p>'+
      '<div class="example-box"><div class="ex-en">Today I worked until 9 p.m. I studied English for one hour. I learned some new words about finance.</div></div>'+
      '<p style="color:var(--ink-soft); font-size:0.88rem; margin-top:10px;">Luego pide una corrección:</p>'+
      '<div class="prompt-box">'+CORRECTION_PROMPT+'</div>'+
      '<button class="btn secondary small copy-btn" data-copy="'+encodeURIComponent(CORRECTION_PROMPT)+'">Copiar mensaje</button>'+
      '<p style="color:var(--ink-faint); font-size:0.8rem; margin-top:12px;">Guarda en Anki las frases o errores que quieras recordar.</p>'+
    '</div>';

    html += '<div class="card">'+
      '<h3 style="margin-bottom:2px;">Flujo diario</h3>'+
      '<p style="color:var(--ink-soft); font-size:0.86rem; margin-bottom:4px;">Las cuatro herramientas trabajan como un solo curso, no como cuatro cursos separados.</p>'+
      '<div class="flow">'+
        '<span class="pill">Anki</span><span class="arrow">→</span>'+
        '<span class="pill">BBC</span><span class="arrow">→</span>'+
        '<span class="pill">ChatGPT</span><span class="arrow">→</span>'+
        '<span class="pill">Escritura</span>'+
      '</div>'+
      '<p style="color:var(--ink-faint); font-size:0.8rem; margin-top:12px;">BBC / British Council te dan vocabulario nuevo → lo guardas en Anki → lo usas hablando y escribiendo con ChatGPT.</p>'+
    '</div>';

    return html;
  }

  function bindGuia(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function(btn){
      btn.addEventListener('click', function(){
        var text = decodeURIComponent(btn.getAttribute('data-copy'));
        copyText(text);
        showToast('Mensaje copiado');
      });
    });
  }

  function copyText(text){
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text);
        return;
      }
    }catch(e){}
    try{
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }catch(e){}
  }

  /* ============================================================
     AJUSTES
  ============================================================ */
  function renderAjustes(){
    var start = getStartKey() || todayKey();
    var theme = getTheme();
    var html = '<div class="screen-title">Ajustes</div>';

    html += '<div class="card">'+
      '<label class="field-label">Fecha de inicio del plan</label>'+
      '<input type="date" id="setStartDate" value="'+start+'">'+
      '<label class="field-label">Tema</label>'+
      '<div class="segmented">'+
        '<button data-theme-opt="auto" class="'+(theme==='auto'?'active':'')+'">Automático</button>'+
        '<button data-theme-opt="light" class="'+(theme==='light'?'active':'')+'">Claro</button>'+
        '<button data-theme-opt="dark" class="'+(theme==='dark'?'active':'')+'">Oscuro</button>'+
      '</div>'+
    '</div>';

    html += '<div class="card">'+
      '<h3 style="margin-bottom:10px;">Copia de seguridad</h3>'+
      '<p style="color:var(--ink-soft); font-size:0.85rem; margin-bottom:10px;">Genera un texto con todo tu progreso y guárdalo donde quieras. Puedes pegarlo aquí luego para restaurarlo.</p>'+
      '<button class="btn secondary small" id="genBackup" style="margin-bottom:10px;">Generar copia</button>'+
      '<textarea class="io-box" id="backupBox" placeholder="Tu copia de seguridad aparecerá aquí…" readonly></textarea>'+
      '<button class="btn ghost small" id="copyBackup" style="margin-bottom:16px;">Copiar texto</button>'+
      '<div class="divider"></div>'+
      '<label class="field-label">Restaurar desde una copia</label>'+
      '<textarea class="io-box" id="restoreBox" placeholder="Pega aquí tu copia de seguridad…"></textarea>'+
      '<button class="btn secondary small" id="restoreBtn">Restaurar</button>'+
    '</div>';

    html += '<div class="card settings-actions">'+
      '<button class="btn danger" id="resetProgressBtn">Reiniciar progreso (mantiene la fecha)</button>'+
      '<button class="btn ghost" id="resetAllBtn">Empezar de nuevo desde cero</button>'+
    '</div>';

    html += '<p class="footnote">Tus datos se guardan únicamente en este dispositivo, en el almacenamiento local del navegador. No se envían a ningún servidor.</p>';
    return html;
  }

  function bindAjustes(){
    document.getElementById('setStartDate').addEventListener('change', function(e){
      setStartKey(e.target.value);
      state.viewedDateKey = (todayKey() < e.target.value) ? e.target.value : todayKey();
      state.expandedPlanMonth = null;
      showToast('Fecha de inicio actualizada');
      render();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-opt]'), function(btn){
      btn.addEventListener('click', function(){
        setTheme(btn.getAttribute('data-theme-opt'));
        render();
      });
    });
    document.getElementById('genBackup').addEventListener('click', function(){
      var payload = {
        start: getStartKey(),
        data: loadData(),
        theme: getTheme(),
        exportedAt: todayKey()
      };
      document.getElementById('backupBox').value = JSON.stringify(payload);
    });
    document.getElementById('copyBackup').addEventListener('click', function(){
      var box = document.getElementById('backupBox');
      if(!box.value){ showToast('Primero genera la copia'); return; }
      box.removeAttribute('readonly');
      box.select();
      copyText(box.value);
      box.setAttribute('readonly','readonly');
      showToast('Copiado al portapapeles');
    });
    document.getElementById('restoreBtn').addEventListener('click', function(){
      var raw = document.getElementById('restoreBox').value.trim();
      if(!raw){ showToast('Pega primero una copia de seguridad'); return; }
      try{
        var parsed = JSON.parse(raw);
        if(parsed.start) setStartKey(parsed.start);
        if(parsed.data) saveData(parsed.data);
        if(parsed.theme) setTheme(parsed.theme);
        showToast('Progreso restaurado');
        state.tab = 'hoy';
        state.viewedDateKey = todayKey();
        render();
      }catch(e){
        showToast('El texto no es una copia válida');
      }
    });
    document.getElementById('resetProgressBtn').addEventListener('click', function(){
      if(window.confirm('¿Borrar todo el progreso registrado? La fecha de inicio se mantiene.')){
        safeRemove(DATA_KEY);
        showToast('Progreso reiniciado');
        render();
      }
    });
    document.getElementById('resetAllBtn').addEventListener('click', function(){
      if(window.confirm('¿Borrar todo, incluida la fecha de inicio, y empezar de cero?')){
        safeRemove(DATA_KEY);
        safeRemove(START_KEY);
        state.viewedDateKey = todayKey();
        showToast('Todo listo para empezar de nuevo');
        render();
      }
    });
  }

  /* ============================================================
     INIT
  ============================================================ */
  function init(){
    var theme = getTheme();
    if(theme !== 'auto'){ document.documentElement.setAttribute('data-theme', theme); }
    render();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
