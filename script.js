'use strict';
/* ================================================================
   TASKMINT PRO — Complete Script
   All features: Videos, Ads, Games, Leaderboard, Streak,
   Achievements, Missions, Level, Channel, Admin, PWA, Withdraw
   ================================================================ */

/* ---- Firebase Config ---- */
var SK = 'taskmint_session', AP = 'admin@01757098701';
var FC = {
  apiKey:"AIzaSyDZSJfWPLRjxlfceUiUHQQ0JonunLVe2_c",
  authDomain:"taskmint-pro.firebaseapp.com",
  databaseURL:"https://taskmint-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:"taskmint-pro",
  storageBucket:"taskmint-pro.firebasestorage.app",
  messagingSenderId:"381437349027",
  appId:"1:381437349027:web:8e6a98be52801423470316"
};

/* ---- Default Config ---- */
var DC = {
  referralBonus:1000, referralTasksReq:3, minWithdraw:500,
  maintenanceMode:false, adTimer:10, adCode:'', gameCooldown:24,
  spinCost:50, scratchCost:20, slotCost:100,
  withdrawMethods:['bKash','Bank Transfer (BDT)','Bank Transfer (USD)'],
  coinToBDT:0.05, coinToUSD:0.0005,
  videoAdEnabled:false, videoAdCode:'', adSkipTime:5, adFrequency:1,
  adUnskippable:false, adType:'preroll', adMidAt:30,
  viewCoinRate:5, viewerCoinRate:1, uploadBonus:50,
  monetizationCoins:10000000, dailyLoginBonus:80
};

var _db=null, _cfg=Object.assign({},DC), _me=null;
var _allVids=[], _curCat='All', _srch='';
var _prevPage='home', _curPage='auth', _adPlays=0, _selAdType='preroll';

/* ================================================================
   SAFE API HELPERS
   ================================================================ */
function safeCopy(text) {
  try {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function(){ T('Copied! 🔗','success'); }).catch(function(){ _fbCopy(text); });
    } else { _fbCopy(text); }
  } catch(e) { _fbCopy(text); }
}
function _fbCopy(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    T('Copied! 🔗','success');
  } catch(e) { T('Could not copy','error'); }
}
function safeShare(title, text, url) {
  try {
    if (navigator && navigator.share) {
      navigator.share({title:title,text:text,url:url}).catch(function(){ safeCopy(url); });
    } else { safeCopy(url); }
  } catch(e) { safeCopy(url); }
}

/* ================================================================
   DATABASE
   ================================================================ */
var DB = {
  init: function() {
    return new Promise(function(ok, err) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(FC);
        _db = firebase.database();
      } catch(e) { err(new Error('Firebase init failed: ' + e.message)); return; }
      /* If already connected (re-init after timeout), just return ok */
      if (_db && firebase.apps.length) {
        var t2 = setTimeout(function(){ ok(); }, 100);
        _db.ref('config').get().then(function(s) {
          clearTimeout(t2);
          if(s.exists()) _cfg = Object.assign({},DC,s.val());
          ok();
        }).catch(function(){ clearTimeout(t2); ok(); /* Use default config */ });
        return;
      }
      var t = setTimeout(function(){ err(new Error('Connection timeout')); }, 8000);
      _db.ref('config').get().then(function(s) {
        clearTimeout(t);
        _cfg = s.exists() ? Object.assign({},DC,s.val()) : Object.assign({},DC);
        if (!s.exists()) _db.ref('config').set(DC);
        ok();
      }).catch(function(e){ clearTimeout(t); err(new Error('DB error: '+e.message)); });
    });
  },
  r:   function(p){ return new Promise(function(res){ if(!_db){res(null);return;} var t=setTimeout(function(){res(null);},8000); _db.ref(p).once('value',function(s){clearTimeout(t);res(s.exists()?s.val():null);},function(){clearTimeout(t);res(null);}); }); },
  w:   function(p,d){ if(!_db) return Promise.resolve(); return _db.ref(p).set(d).catch(function(){}); },
  u:   function(p,d){ if(!_db) return Promise.resolve(); return _db.ref(p).update(d).catch(function(){}); },
  del: function(p){   if(!_db) return Promise.resolve(); return _db.ref(p).remove().catch(function(){}); },
  getUser:  function(id){ if(!id) return Promise.resolve(null); return DB.r('users/'+id); },
  uu:       function(id,d){ if(!id) return Promise.resolve(); return DB.u('users/'+id,d); },
  saveUser: function(u){ if(!_db) return Promise.resolve(); var c=Object.assign({},u); delete c.videoData; return _db.ref('users/'+u.id).set(c); },
  users:    function(){ return DB.r('users').then(function(d){ return d?Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}):[];}); },
  findUser: function(f,v){ return new Promise(function(res){ if(!_db){res(null);return;} var t=setTimeout(function(){res(null);},8000); _db.ref('users').once('value',function(s){clearTimeout(t);if(!s.exists()){res(null);return;}var d=s.val(),ks=Object.keys(d),found=null;for(var i=0;i<ks.length;i++){if(d[ks[i]][f]===v){found=Object.assign({},d[ks[i]],{id:ks[i]});break;}}res(found);},function(){clearTimeout(t);res(null);}); }); },
  vids:     function(){ return DB.r('videos').then(function(d){ return d?Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}):[];}); },
  saveVid:  function(v){ if(!_db) return Promise.resolve(); return _db.ref('videos/'+v.id).set(v); },
  delVid:   function(id){ return DB.del('videos/'+id); },
  tasks:    function(){ return DB.r('tasks').then(function(d){ if(!d)return[]; if(Array.isArray(d))return d; return Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}); }); },
  wds:      function(){ return DB.r('withdrawals').then(function(d){ return d?Object.keys(d).map(function(k){return Object.assign({},d[k],{_key:k});}):[];}); },
  saveWD:   function(w){ if(!_db) return Promise.resolve(); return _db.ref('withdrawals/w_'+w.id).set(w); },
  updWD:    function(wId,ch){ return DB.r('withdrawals').then(function(d){ if(!d)return; var ks=Object.keys(d); for(var i=0;i<ks.length;i++){if(d[ks[i]].id===wId)return DB.u('withdrawals/'+ks[i],ch);} }); },
  coms:     function(vid){ return DB.r('comments/'+vid).then(function(d){ if(!d)return[]; return Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}); }); },
  saveCom:  function(vid,c){ if(!_db) return Promise.resolve(); return _db.ref('comments/'+vid+'/'+c.id).set(c); },
  updCom:   function(vid,cid,d){ return DB.u('comments/'+vid+'/'+cid,d); }
};

/* ================================================================
   SESSION + LOADING + TOAST
   ================================================================ */
var S = {
  get:   function(){ try{ return JSON.parse(localStorage.getItem(SK)); }catch(e){ return null; } },
  set:   function(u){ _me=u; var s=Object.assign({},u); delete s.videoData; localStorage.setItem(SK,JSON.stringify(s)); },
  clear: function(){ _me=null; localStorage.removeItem(SK); },
  me:    function(){ return _me||S.get(); }
};

var L = {
  _n:0,
  show: function(m){ L._n++; var el=document.getElementById('gLoad'); if(!el){el=document.createElement('div');el.id='gLoad';el.style.cssText='position:fixed;inset:0;background:rgba(10,0,20,.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;';el.innerHTML='<div class="spinner"></div><p id="gLoadMsg" style="color:#ccc;font-size:.9rem;margin:0"></p>';document.body.appendChild(el);} el.style.display='flex'; var p=document.getElementById('gLoadMsg'); if(p)p.textContent=m||'Loading...'; },
  hide: function(){ L._n=Math.max(0,L._n-1); if(L._n===0){var el=document.getElementById('gLoad');if(el)el.style.display='none';} },
  off:  function(){ L._n=0; var el=document.getElementById('gLoad'); if(el)el.style.display='none'; }
};

function T(msg,type){
  var c={success:'linear-gradient(90deg,#00d26a,#00a855)',error:'linear-gradient(90deg,#ff4b4b,#cc2222)',warning:'linear-gradient(90deg,#ffd700,#c8930a)',info:'linear-gradient(90deg,#00e5ff,#7c3aed)'};
  var t=document.createElement('div');
  t.textContent=msg;
  t.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);background:'+(c[type]||c.info)+';color:#fff;padding:11px 22px;border-radius:28px;font-weight:700;z-index:99998;font-size:.86rem;box-shadow:0 4px 20px rgba(0,0,0,.5);max-width:90%;text-align:center;transition:opacity .4s;pointer-events:none';
  document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0';},2800);
  setTimeout(function(){t.remove();},3200);
}

/* ================================================================
   ROUTER
   ================================================================ */
var Router = {
  go: function(pid) {
    _prevPage = _curPage; _curPage = pid;
    document.querySelectorAll('.page-section').forEach(function(el){ el.classList.add('hidden'); });
    var pg = document.getElementById('page-'+pid);
    if (pg) pg.classList.remove('hidden');
    var nav = document.getElementById('mainNav');
    if (nav) { if(pid==='auth'||pid==='admin') nav.classList.add('hidden'); else nav.classList.remove('hidden'); }
    document.querySelectorAll('.nav-btn').forEach(function(el){ el.classList.remove('active'); });
    var ni = document.getElementById('nav-'+pid); if(ni) ni.classList.add('active');
    UI.sync();
    setTimeout(function(){ UI.load(pid); }, 60);
    window.scrollTo(0,0);
  },
  back: function(){ Router.go(_prevPage||'home'); },
  init: async function() {
    /* Spinner style */
    var s=document.createElement('style');
    s.textContent='@keyframes _sp{to{transform:rotate(360deg)}}.spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,.08);border-top-color:#00e5ff;border-radius:50%;animation:_sp .75s linear infinite}';
    document.head.appendChild(s);

    /* Cached session → instant home */
    var saved = S.get();
    if (saved && saved.id && saved.username) {
      _me = saved;
      var sp=document.getElementById('splash'); if(sp){sp.style.opacity='0';setTimeout(function(){sp.style.display='none';},300);}
      Router.go('home');
      setTimeout(function(){
        DB.init().then(function(){ return DB.getUser(saved.id); })
        .then(function(u){
          if(!u)return;
          if(u.isBanned){S.clear();Router.go('auth');T('Account suspended','error');return;}
          _me=Object.assign({},u,{id:saved.id}); S.set(_me); UI.sync();
        }).catch(function(){});
      },300);
      return;
    }

    /* No session → connect then show auth */
    var fill=document.getElementById('splashFill'); var pct=0;
    var bar=setInterval(function(){pct=Math.min(pct+6,90);if(fill)fill.style.width=pct+'%';},80);
    var hard=setTimeout(function(){ clearInterval(bar); if(fill)fill.style.width='100%'; var sp2=document.getElementById('splash');if(sp2){sp2.style.opacity='0';setTimeout(function(){sp2.style.display='none';},300);} Router.go('auth'); DB.init().catch(function(){}); },4000);
    try {
      await DB.init();
      clearTimeout(hard); clearInterval(bar);
      if(fill)fill.style.width='100%';
      var sp3=document.getElementById('splash');if(sp3){sp3.style.opacity='0';setTimeout(function(){sp3.style.display='none';},400);}
      Router.go('auth');
    } catch(e) {
      clearTimeout(hard); clearInterval(bar);
      if(fill)fill.style.width='100%';
      var sp4=document.getElementById('splash');if(sp4){sp4.style.opacity='0';setTimeout(function(){sp4.style.display='none';},300);}
      Router.go('auth');
      T('Could not connect. Check internet.','warning');
    }
  }
};

/* ================================================================
   AUTH
   ================================================================ */
var Auth = {
  toggle: function(showLogin) {
    /* showLogin=true → show login, hide register */
    /* showLogin=false → show register, hide login */
    var login = document.getElementById('form-login');
    var reg   = document.getElementById('form-register');
    if(showLogin) {
      if(login) login.classList.remove('hidden');
      if(reg)   reg.classList.add('hidden');
    } else {
      if(login) login.classList.add('hidden');
      if(reg)   reg.classList.remove('hidden');
    }
  },
  checkUser: function(v) {
    var el=document.getElementById('uStatus'); if(!el)return;
    clearTimeout(Auth._ut);
    if(!v||v.length<3){el.textContent='';return;}
    el.textContent='⏳'; el.style.color='#888';
    Auth._ut=setTimeout(async function(){
      var tk=await DB.findUser('username',v);
      el.textContent=tk?'✗ Taken':'✓ Available';
      el.style.color=tk?'#ff4444':'#00d26a';
    },700);
  },
  login: async function() {
    var u=document.getElementById('lUser').value.trim(), p=document.getElementById('lPass').value;
    if(!u||!p) return T('Enter username and password','warning');
    /* Connect to database if not yet connected */
    if(!_db) {
      L.show('Connecting to server...');
      try { await DB.init(); } catch(e) { L.off(); return T('No internet connection. Please try again.','error'); }
      L.off();
    }
    if(!_db) return T('Could not connect. Please check internet.','error');
    L.show('Signing in...');
    var t=setTimeout(function(){L.off();T('Timed out. Please check your internet connection and try again.','error');},20000);
    try {
      if(_cfg.maintenanceMode){clearTimeout(t);L.off();return T('Server under maintenance','warning');}
      var user=await DB.findUser('username',u);
      clearTimeout(t);
      if(!user){L.off();return T('Username not found','error');}
      if(user.password!==p){L.off();return T('Wrong password','error');}
      if(user.isBanned){L.off();return T('Account suspended','error');}
      _me=user; S.set(user); L.off(); Router.go('home');
    } catch(e){clearTimeout(t);L.off();T('Login failed. Try again.','error');}
  },
  register: async function() {
    var u=document.getElementById('rUser').value.trim(), m=document.getElementById('rMob').value.trim(), p=document.getElementById('rPass').value, r=document.getElementById('rRef').value.trim().toUpperCase();
    if(!u||!m||!p) return T('Fill all required fields','warning');
    if(u.length<3) return T('Username min 3 chars','warning');
    if(m.length<11) return T('Enter valid mobile number','warning');
    if(p.length<6) return T('Password min 6 chars','warning');
    /* Connect to database if not yet connected */
    if(!_db) {
      L.show('Connecting to server... (may take a few seconds)');
      try {
        await DB.init();
      } catch(e) {
        L.off();
        return T('No internet connection. Make sure you have internet and try again.','error');
      }
      L.off();
    }
    if(!_db) return T('Could not connect. Please check internet and try again.','error');
    L.show('Creating your account...');
    var t=setTimeout(function(){L.off();T('Timed out. Please check your internet and try again.','error');},20000);
    try {
      var ex=await DB.findUser('username',u); if(ex){clearTimeout(t);L.off();return T('Username already taken','error');}
      var em=await DB.findUser('mobile',m);   if(em){clearTimeout(t);L.off();return T('Mobile already registered','error');}
      var nid='u_'+Date.now();
      var nu={id:nid,username:u,mobile:m,password:p,displayName:u,bio:'',
        avatar:'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        balance:0,balanceUSD:0,coins:100,
        refCode:'TM'+Math.floor(1000+Math.random()*9000),
        referredBy:r||null, joinedAt:new Date().toISOString(),
        isBanned:false, tasksCompleted:0, lockedRewards:[],
        lastSpin:0, lastScratch:0, lastSlot:0,
        totalEarned:0, totalEarnedUSD:0, totalWithdrawn:0,
        videoHistory:[], subscriptions:[], notifChannels:[],
        savedVideos:[], likedVideos:[], dislikedVideos:[], playlists:[],
        monetized:false, monetizeStatus:null,
        totalVideoViews:0, videoEarnings:0, videoEarningsUSD:0,
        channelDesc:'', channelBanner:'', channelLink:'',
        loginStreak:0, lastLoginDate:'', streakClaimedDate:'',
        achievements:[], missionProgress:{}
      };
      if(r){var au=await DB.r('users');if(au){var rk=Object.keys(au).find(function(k){return au[k].refCode===r;});if(rk){var lks=(au[rk].lockedRewards||[]).slice();lks.push({sourceId:nid,sourceName:u,amount:_cfg.referralBonus,unlocked:false,progress:0});await DB.uu(rk,{lockedRewards:lks});}else nu.referredBy=null;}}
      await DB.saveUser(nu);
      clearTimeout(t); _me=nu; S.set(nu); L.off();
      T('Welcome! You got 100 free coins! 🎉','success');
      setTimeout(function(){Router.go('home');},1200);
    } catch(e){clearTimeout(t);L.off();T('Registration failed. Try again.','error');}
  },
  logout: function(){ if(confirm('Logout?')){S.clear();Router.go('auth');} },
  adminLogin: function(){
    var p=(document.getElementById('adminPin')||{}).value||'';
    if(!p) return T('Enter admin PIN','warning');
    if(p===AP){
      sessionStorage.setItem('isAdmin','true');
      var box=document.getElementById('adminPinBox');if(box)box.classList.add('hidden');
      Router.go('admin');Admin.init();
    } else { T('Wrong admin PIN','error'); var inp=document.getElementById('adminPin');if(inp){inp.value='';inp.focus();} }
  },
  /* adminLogin2 — used on /admin page gate */
  adminLogin2: function(){
    var p=document.getElementById('adminPin2').value||document.getElementById('adminPin')&&document.getElementById('adminPin').value;
    if(!p)p='';
    if(p===AP){
      sessionStorage.setItem('isAdmin','true');
      var gate=document.getElementById('agate'); if(gate)gate.classList.add('hidden');
      var panel=document.getElementById('adminPanel'); if(panel)panel.classList.remove('hidden');
      Admin.init();
    } else T('Wrong admin PIN','error');
  }
};

/* ================================================================
   PROFILE
   ================================================================ */
var Profile = {
  myChannel: function(){ var u=S.me(); if(u) ChanSys.open(u.id); },
  uploadPic: function(){ var f=document.getElementById('profPicFile'); if(f) f.click(); },
  uploadPicFile: function(input) {
    if(!input||!input.files||!input.files[0]) return;
    var f=input.files[0];
    if(!f.type.startsWith('image/')) return T('Select an image file','warning');
    if(f.size>5*1024*1024) return T('Max 5MB','error');
    var reader=new FileReader();
    reader.onload=async function(e){
      var src=e.target.result, u=S.me(); if(!u)return;
      L.show('Updating...');
      try{
        await DB.uu(u.id,{avatar:src});
        _me=Object.assign({},_me,{avatar:src}); S.set(_me);
        document.querySelectorAll('.u-avatar,[data-avatar]').forEach(function(el){if(el.tagName==='IMG')el.src=src;});
        var pa=document.getElementById('profAvImg'); if(pa)pa.src=src;
        L.off(); T('Avatar updated! 📷','success');
      }catch(err){L.off();T('Failed to update avatar','error');}
    };
    reader.readAsDataURL(f);
  },
  setAvatar: async function(src){
    var u=S.me(); if(!u)return;
    L.show('Updating...');
    try{
      await DB.uu(u.id,{avatar:src});
      _me=Object.assign({},_me,{avatar:src}); S.set(_me);
      document.querySelectorAll('.u-avatar,[data-avatar]').forEach(function(el){if(el.tagName==='IMG')el.src=src;});
      var pa=document.getElementById('profAvImg'); if(pa)pa.src=src;
      L.off(); T('Avatar updated!','success');
    }catch(e){L.off();T('Failed','error');}
  },
  saveChanges: async function(){
    var dn=document.getElementById('editName').value.trim();
    var bio=document.getElementById('editBio')?document.getElementById('editBio').value.trim():'';
    var cp=document.getElementById('editCurPass').value;
    var np=document.getElementById('editNewPass').value;
    var cp2=document.getElementById('editConfPass').value;
    if(!cp) return T('Enter current password','warning');
    var u=S.me(); if(!u)return;
    L.show('Saving...');
    var ud=await DB.getUser(u.id);
    if(!ud||ud.password!==cp){L.off();return T('Incorrect current password','error');}
    var upd={};
    if(dn&&dn.length>=2) upd.displayName=dn;
    if(bio!==undefined) upd.bio=bio;
    if(np){if(np.length<6){L.off();return T('Password min 6 chars','warning');}if(np!==cp2){L.off();return T('Passwords do not match','error');}upd.password=np;}
    if(!Object.keys(upd).length){L.off();return T('No changes to save','info');}
    await DB.uu(u.id,upd);
    _me=Object.assign({},_me,upd); S.set(_me);
    L.off();
    document.querySelectorAll('#editCurPass,#editNewPass,#editConfPass').forEach(function(el){if(el)el.value='';});
    T('Profile updated!','success'); UI.sync();
  }
};

/* ================================================================
   UI
   ================================================================ */
var UI = {
  sync: function(){
    var u=S.me(); if(!u)return;
    var n=u.displayName||u.username||'';
    document.querySelectorAll('.u-name').forEach(function(e){e.textContent=n;});
    document.querySelectorAll('.u-bal').forEach(function(e){e.textContent='৳'+(u.balance||0).toFixed(2);});
    document.querySelectorAll('.u-bal-usd').forEach(function(e){e.textContent='$'+(u.balanceUSD||0).toFixed(4);});
    document.querySelectorAll('.u-coins').forEach(function(e){e.textContent=(u.coins||0).toLocaleString();});
    document.querySelectorAll('.u-avatar,[data-avatar]').forEach(function(e){if(e.tagName==='IMG')e.src=u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png';});
    /* top bar avatar */
    var tbAv=document.getElementById('tbAvatar'); if(tbAv)tbAv.src=u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    /* notif dot */
    NotifSys.checkUnread();
  },
  load: async function(pid){
    var u=S.me(); if(!u||!u.id)return;
    if(_db){
      try{
        var fresh=await DB.getUser(u.id);
        if(fresh){_me=Object.assign({},fresh,{id:u.id}); S.set(_me); UI.sync();}
      }catch(e){}
    }
    if(pid==='home')  { UI._loadHome(); }
    if(pid==='videos'){ VidSys.load(); }
    if(pid==='referral'){ UI._loadReferral(); }
    if(pid==='withdraw'){ WD.loadPage(); }
    if(pid==='profile'){ UI._loadProfile(); }
    if(pid==='leaderboard'){ LbSys.load('coins'); }
    if(pid==='games'){ UI._loadGames(); }
  },
  _loadHome: async function(){
    UI._renderAd();
    UI._renderTasks();
    StreakSys.checkAndShow();
    MissionSys.render();
    AchSys.renderRow();
    UI._loadGames();
  },
  _loadGames: async function(){
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return _me;})||_me;
    if(!ud)return;
    Games.updateBtns(ud);
    WheelSys.init(ud);
    WheelSys.draw();
  },
  _renderAd: function(){
    var b=document.getElementById('homeAd'); if(!b||!_cfg.adCode)return;
    b.innerHTML='';
    var w=document.createElement('div'); w.innerHTML=_cfg.adCode;
    b.appendChild(w);
    b.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');Array.from(o.attributes).forEach(function(a){n.setAttribute(a.name,a.value);});n.textContent=o.textContent;o.parentNode.replaceChild(n,o);});
  },
  _renderTasks: async function(){
    var l=document.getElementById('taskList'); if(!l)return;
    var ts=await DB.tasks().catch(function(){return[];});
    if(!ts.length){l.innerHTML='<p style="color:#888;text-align:center;padding:24px">No tasks available right now.</p>';return;}
    l.innerHTML='';
    ts.forEach(function(t){
      var d=document.createElement('div'); d.className='task-card';
      var sl=(t.link||'#').replace(/'/g,"\\'");
      d.innerHTML='<img src="'+(t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="t-icon" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">'+
        '<div class="t-info"><b>'+t.title+'</b><span class="t-reward">+'+t.reward+' Coins</span></div>'+
        '<button class="btn-start" onclick="Tasks.start(\''+sl+'\','+t.reward+')"><i class="fas fa-play"></i> Start</button>';
      l.appendChild(d);
    });
  },
  _loadReferral: function(){
    var u=S.me(); if(!u)return;
    var c=document.getElementById('myRefCode'); if(c)c.textContent=u.refCode||'---';
    var lks=u.lockedRewards||[], unl=lks.filter(function(r){return r.unlocked;}).length;
    var s=document.getElementById('refStats');
    if(s)s.innerHTML='<div><span>'+lks.length+'</span><small>Invites</small></div><div><span>'+unl+'</span><small>Unlocked</small></div><div><span>৳'+(unl*(_cfg.referralBonus||1000)*(_cfg.coinToBDT||0.05)).toFixed(0)+'</span><small>Earned</small></div>';
    var l=document.getElementById('refList'); if(!l)return;
    if(!lks.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No referrals yet. Share your code!</p>';return;}
    l.innerHTML='';
    lks.forEach(function(r){
      var p=Math.min(100,(r.progress/(_cfg.referralTasksReq||3))*100);
      l.innerHTML+='<div class="ref-item"><div class="ri-info"><b>'+r.sourceName+'</b><small>Progress: '+r.progress+'/'+(_cfg.referralTasksReq||3)+'</small><div class="ri-bar"><div style="width:'+p+'%"></div></div></div><span class="ri-amt '+(r.unlocked?'unlocked':'locked')+'">'+(r.unlocked?'✅':'🔒')+' ৳'+r.amount+'</span></div>';
    });
  },
  _loadProfile: async function(){
    var u=S.me(); if(!u)return;
    var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    var setV=function(id,v){var e=document.getElementById(id);if(e)e.value=v;};
    var setSrc=function(id,v){var e=document.getElementById(id);if(e&&e.tagName==='IMG')e.src=v;};
    setSrc('profAvImg',u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png');
    set('profName',u.displayName||u.username);
    set('profBio',u.bio||'');
    set('psCoin',(u.coins||0).toLocaleString());
    set('psBal','৳'+(u.balance||0).toFixed(2)+'<br><small style="font-size:.65rem;color:#888">$'+(u.balanceUSD||0).toFixed(4)+'</small>');
    set('psLevel','Lv'+LvSys.getLevel(LvSys.getXP(u)).n);
    setV('editName',u.displayName||u.username);
    setV('editBio',u.bio||'');
    /* Count videos */
    DB.vids().then(function(vids){set('psVideos',vids.filter(function(v){return v.uploaderId===u.id;}).length);}).catch(function(){});
    /* Level bar */
    LvSys.render(u);
    /* Avatar grid */
    UI._buildAvatarGrid();
    /* Monetize badge */
    var pb=document.getElementById('profBadgeRow');
    if(pb){pb.innerHTML='';if(u.monetized)pb.innerHTML='<span class="badge-monetized">💰 Monetized</span>';else if(u.monetizeStatus==='Pending')pb.innerHTML='<span class="badge-pending">⏳ Pending Review</span>';}
  },
  _buildAvatarGrid: function(){
    var grid=document.getElementById('avatarGrid'); if(!grid||grid.children.length>0)return;
    var avs=['https://cdn-icons-png.flaticon.com/512/4140/4140048.png','https://cdn-icons-png.flaticon.com/512/4140/4140051.png','https://cdn-icons-png.flaticon.com/512/4140/4140037.png','https://cdn-icons-png.flaticon.com/512/4140/4140061.png','https://cdn-icons-png.flaticon.com/512/1326/1326405.png','https://cdn-icons-png.flaticon.com/512/1326/1326377.png','https://cdn-icons-png.flaticon.com/512/2922/2922510.png','https://cdn-icons-png.flaticon.com/512/2922/2922656.png','https://cdn-icons-png.flaticon.com/512/2922/2922561.png','https://cdn-icons-png.flaticon.com/512/2922/2922688.png','https://cdn-icons-png.flaticon.com/512/2922/2922522.png','https://cdn-icons-png.flaticon.com/512/4140/4140047.png'];
    avs.forEach(function(av){var img=document.createElement('img');img.src=av;img.className='av-opt';img.onclick=function(){Profile.setAvatar(av);};grid.appendChild(img);});
  },
  copyRef: function(){ safeCopy((document.getElementById('myRefCode')||{}).textContent||''); },
  shareRef: function(){ var c=(document.getElementById('myRefCode')||{}).textContent||''; safeShare('TaskMint Pro','Join TaskMint Pro! My code: '+c,'https://taskmintpro.netlify.app'); }
};

/* ================================================================
   TASKS
   ================================================================ */
var Tasks = {
  start: function(link,reward){
    if(link&&link!=='#'){try{window.open(link,'_blank');}catch(e){}}
    var ov=document.getElementById('taskOv'),te=document.getElementById('taskTimer');
    if(!ov||!te)return;
    ov.classList.remove('hidden');
    var left=_cfg.adTimer||10; te.textContent=left;
    var iv=setInterval(function(){left--;te.textContent=left;if(left<=0){clearInterval(iv);ov.classList.add('hidden');Tasks.complete(reward);}},1000);
  },
  complete: async function(reward){
    var u=S.me(); if(!u)return;
    L.show('Claiming...');
    try{
      var ud=await DB.getUser(u.id);
      var bdtR=_cfg.coinToBDT||0.05, usdR=_cfg.coinToUSD||0.0005;
      var upd={coins:(ud.coins||0)+reward, tasksCompleted:(ud.tasksCompleted||0)+1, totalEarned:(ud.totalEarned||0)+reward*bdtR, totalEarnedUSD:(ud.totalEarnedUSD||0)+reward*usdR};
      if(ud.monetized){upd.balance=(ud.balance||0)+reward*bdtR; upd.balanceUSD=(ud.balanceUSD||0)+reward*usdR;}
      await DB.uu(u.id,upd);
      /* Referral progress */
      if(ud.referredBy){var au=await DB.r('users');if(au){var rk=Object.keys(au).find(function(k){return au[k].refCode===ud.referredBy;});if(rk){var lks=(au[rk].lockedRewards||[]).slice(),lk=lks.find(function(r){return r.sourceId===u.id;});if(lk&&!lk.unlocked){lk.progress++;if(lk.progress>=(_cfg.referralTasksReq||3)){lk.unlocked=true;}await DB.uu(rk,{lockedRewards:lks});}}}}
      _me=Object.assign({},_me,{coins:(_me.coins||0)+reward}); S.set(_me);
      L.off(); UI.sync();
      T('+'+reward+' Coins'+(ud.monetized?' + ৳'+(reward*bdtR).toFixed(4):'')+'!','success');
      MissionSys.progress('task',1);
      AchSys.check('task',upd.tasksCompleted);
    }catch(e){L.off();T('Could not claim. Try again.','error');}
  }
};

/* ================================================================
   GAMES
   ================================================================ */
var Games = {
  fmt: function(ms){ return Math.floor(ms/3600000)+'h '+Math.floor((ms%3600000)/60000)+'m'; },
  cd:  function(last,h){ var d=Date.now()-(last||0),r=h*3600000; return d<r?{ok:false,wait:r-d}:{ok:true}; },
  updateBtns: function(ud){
    var c=_cfg;
    var setBtn=function(id,last,cost,label){var el=document.getElementById(id);if(!el)return;var st=Games.cd(last,c.gameCooldown||24);if(!st.ok){el.textContent='⏰ '+Games.fmt(st.wait);el.disabled=true;el.style.opacity='0.5';}else{el.textContent=label+' ('+cost+' coins)';el.disabled=false;el.style.opacity='1';}};
    setBtn('btnSpin',ud.lastSpin,c.spinCost||50,'Spin');
    setBtn('btnSlot',ud.lastSlot,c.slotCost||100,'Play Slots');
    var scCd=document.getElementById('scratchCd');if(scCd){var ss=Games.cd(ud.lastScratch,c.gameCooldown||24);scCd.textContent=ss.ok?'':'Ready in '+Games.fmt(ss.wait);}
  },
  spin: async function(){
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id);
    var st=Games.cd(ud.lastSpin,_cfg.gameCooldown||24);
    if(!st.ok) return T('Cooldown: '+Games.fmt(st.wait),'warning');
    if((ud.coins||0)<(_cfg.spinCost||50)) return T('Need '+(_cfg.spinCost||50)+' coins','error');
    var w=document.getElementById('wheel'),btn=document.getElementById('btnSpin');
    if(w){var deg=3600+Math.floor(Math.random()*3600);w.style.transition='transform 4s cubic-bezier(.17,.67,.12,.99)';w.style.transform='rotate('+deg+'deg)';}
    if(btn)btn.disabled=true;
    var win=Math.floor(Math.random()*150)+10;
    await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.spinCost||50)+win,lastSpin:Date.now()});
    _me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.spinCost||50)+win}); S.set(_me);
    setTimeout(function(){UI.sync();T('Won '+win+' Coins! 🎉','success');Games.updateBtns(Object.assign({},ud,{lastSpin:Date.now()}));if(w){setTimeout(function(){w.style.transition='none';w.style.transform='rotate(0deg)';},100);}},4200);
  },
  scratch: async function(el){
    if(el.dataset.used==='1')return;
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id);
    var st=Games.cd(ud.lastScratch,_cfg.gameCooldown||24);
    if(!st.ok) return T('Cooldown: '+Games.fmt(st.wait),'warning');
    if((ud.coins||0)<(_cfg.scratchCost||20)) return T('Need '+(_cfg.scratchCost||20)+' coins','error');
    var win=Math.floor(Math.random()*60)+5;
    await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.scratchCost||20)+win,lastScratch:Date.now()});
    _me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.scratchCost||20)+win}); S.set(_me);
    UI.sync();
    el.dataset.used='1';
    el.innerHTML='<div style="text-align:center"><div style="font-size:2.5rem;font-weight:900;color:#fbbf24">+'+win+'</div><p style="color:#888">Coins Won!</p></div>';
    T('+'+win+' Coins!','success');
    setTimeout(function(){el.dataset.used='0';el.innerHTML='<div style="text-align:center;color:#555"><i class="fas fa-ticket-alt" style="font-size:2rem;display:block;margin-bottom:6px"></i><p>Tap to Scratch ('+(_cfg.scratchCost||20)+' coins)</p></div>';},3000);
  },
  slot: async function(){
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id);
    var st=Games.cd(ud.lastSlot,_cfg.gameCooldown||24);
    if(!st.ok) return T('Cooldown: '+Games.fmt(st.wait),'warning');
    if((ud.coins||0)<(_cfg.slotCost||100)) return T('Need '+(_cfg.slotCost||100)+' coins','error');
    var sy=['🍋','🍒','💎','7️⃣','🔔','⭐'],r=[0,1,2].map(function(){return Math.floor(Math.random()*sy.length);});
    var rnd=Math.random();if(rnd>.95)r[0]=r[1]=r[2]=3;else if(rnd>.75)r[2]=r[0];
    ['s1','s2','s3'].forEach(function(id,i){var el=document.getElementById(id);if(el)el.textContent=sy[r[i]];});
    var win=0;if(r[0]===3&&r[1]===3&&r[2]===3)win=1000;else if(r[0]===r[1]&&r[1]===r[2])win=300;else if(r[0]===r[1]||r[1]===r[2]||r[0]===r[2])win=60;
    await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.slotCost||100)+win,lastSlot:Date.now()});
    _me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.slotCost||100)+win}); S.set(_me);
    setTimeout(function(){UI.sync();if(win>=1000)T('🎰 JACKPOT! +'+win+'!','success');else if(win>0)T('+'+win+' Coins!','success');else T('No match. Try again!','info');},400);
  }
};

/* ================================================================
   VIDEO HELPERS
   ================================================================ */
function ytId(s){if(!s)return null;s=s.trim();if(/^[a-zA-Z0-9_-]{11}$/.test(s))return s;var pp=[/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,/youtu\.be\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/];for(var i=0;i<pp.length;i++){var m=s.match(pp[i]);if(m)return m[1];}return null;}
function isShorts(v){return v.category==='Shorts'||(v.watchDuration||15)<60;}
function timeAgo(d){if(!d)return '';var df=Date.now()-new Date(d).getTime(),m=Math.floor(df/60000),h=Math.floor(df/3600000),dy=Math.floor(df/86400000),mo=Math.floor(df/2592000000),y=Math.floor(df/31536000000);if(y>0)return y+'y ago';if(mo>0)return mo+'mo ago';if(dy>0)return dy+'d ago';if(h>0)return h+'h ago';if(m>0)return m+'m ago';return 'Just now';}
function fmtViews(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return n+'';}
function makeVCard(v,cb){
  var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/hqdefault.jpg':'');
  var sh=isShorts(v),views=v.views||0,uname=v.uploaderDisplayName||v.uploaderName||'Admin';
  var isNew=(Date.now()-new Date(v.addedAt||0).getTime())<86400000*3;
  var div=document.createElement('div'); div.className='vcard';
  div.onclick=cb||function(){VidSys.open(v.id);};
  div.innerHTML='<div class="vth-wrap">'+(th?'<img src="'+th+'" class="vth" loading="lazy" onerror="this.style.background=\'#1a1a2e\'">':'<div class="vth" style="background:#1a1a2e;display:flex;align-items:center;justify-content:center;"><i class="fas fa-play-circle" style="font-size:2.5rem;color:#333;position:absolute"></i></div>')+
    (sh?'<span class="vbadge-sh">⚡ Shorts</span>':'')+(isNew?'<span class="vbadge-new">NEW</span>':'')+'<span class="vbadge-dur">'+(v.watchDuration||15)+'s</span></div>'+
    '<div class="vcard-info"><div class="vcard-av"><img src="'+(v.uploaderAvatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'" onclick="event.stopPropagation();'+(v.uploaderId?'ChanSys.open(\''+v.uploaderId+'\')':'void(0)')+'" style="cursor:pointer"></div>'+
    '<div class="vcard-meta"><h4 class="vcard-title">'+v.title+'</h4><p class="vcard-ch">'+uname+(v.uploaderMonetized?'<span class="vc">✓</span>':'')+'</p><p class="vcard-stats">'+fmtViews(views)+' views · '+timeAgo(v.addedAt)+'</p></div></div>';
  return div;
}

/* ================================================================
   VIDEO SYSTEM
   ================================================================ */
var VidSys = {
  _timer:null, _el:0, _vid:null, _claimed:false,

  load: async function(){
    try{ _allVids=await DB.vids(); }catch(e){ _allVids=[]; }
    VidSys._applyFilter();
  },
  search: function(q){ _srch=q.toLowerCase().trim(); var cl=document.getElementById('searchClear');if(cl)cl.classList.toggle('hidden',!_srch); VidSys._applyFilter(); },
  clearSearch: function(){ _srch=''; var i=document.getElementById('searchInp');if(i)i.value=''; var cl=document.getElementById('searchClear');if(cl)cl.classList.add('hidden'); VidSys._applyFilter(); },
  cat: function(c,btn){ _curCat=c; document.querySelectorAll('.chip').forEach(function(b){b.classList.remove('active');}); if(btn)btn.classList.add('active'); VidSys._applyFilter(); },
  _applyFilter: function(){
    var vids=_allVids.slice();
    if(_curCat!=='All') vids=vids.filter(function(v){return v.category===_curCat;});
    if(_srch) vids=vids.filter(function(v){return((v.title||'')+' '+(v.uploaderName||'')+' '+(v.tags||'')).toLowerCase().includes(_srch);});
    vids.sort(function(a,b){return new Date(b.addedAt||0)-new Date(a.addedAt||0);});
    var l=document.getElementById('vidList'),em=document.getElementById('vidEmpty');
    if(!l)return;
    if(!vids.length){l.innerHTML='';if(em)em.classList.remove('hidden');return;}
    if(em)em.classList.add('hidden');
    l.innerHTML=''; vids.forEach(function(v){l.appendChild(makeVCard(v));});
  },
  tab: function(tabId,btn){
    document.querySelectorAll('[id^="vtab-"]:not([id^="vtab-btn"])').forEach(function(el){el.classList.add('hidden');});
    document.querySelectorAll('[id^="vtab-btn"]').forEach(function(b){b.classList.remove('active');});
    var el=document.getElementById('vtab-'+tabId); if(el)el.classList.remove('hidden');
    if(btn)btn.classList.add('active');
    if(tabId==='home')VidSys.load();
    else if(tabId==='subs')VidSys._loadSubs();
    else if(tabId==='trending')VidSys._loadTrending();
    else if(tabId==='saved')VidSys._loadSaved();
    else if(tabId==='history')VidSys._loadHistory();
    else if(tabId==='myvideos')VidSys._loadMine();
    else if(tabId==='monetize')MonSys.render();
  },
  _loadSubs: async function(){
    var l=document.getElementById('subsList'),em=document.getElementById('subsEmpty'); if(!l)return;
    var u=S.me(); if(!u){if(em)em.classList.remove('hidden');return;}
    var ud=await DB.getUser(u.id).catch(function(){return null;}); var subs=(ud&&ud.subscriptions)||[];
    if(!subs.length){l.innerHTML='';if(em)em.classList.remove('hidden');return;}
    if(em)em.classList.add('hidden');
    var all=await DB.vids().catch(function(){return[];});
    var sv=all.filter(function(v){return v.uploaderId&&subs.includes(v.uploaderId);}).sort(function(a,b){return new Date(b.addedAt)-new Date(a.addedAt);});
    l.innerHTML=''; if(!sv.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No recent videos from subscriptions.</p>';return;}
    sv.forEach(function(v){l.appendChild(makeVCard(v));});
  },
  _loadTrending: async function(){
    var l=document.getElementById('trendingList'); if(!l)return;
    var all=await DB.vids().catch(function(){return[];});
    all.sort(function(a,b){return(b.views||0)-(a.views||0);}); all=all.slice(0,30);
    l.innerHTML=''; if(!all.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No videos yet.</p>';return;}
    all.forEach(function(v,i){var c=makeVCard(v);if(i===0){var wr=c.querySelector('.vth-wrap');if(wr)wr.innerHTML+='<span class="vbadge-sh" style="background:#ffd700;color:#000">🔥 Trending</span>';}l.appendChild(c);});
  },
  _loadSaved: async function(){
    var l=document.getElementById('savedList'); if(!l)return;
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return null;}); var saved=(ud&&ud.savedVideos)||[];
    var all=await DB.vids().catch(function(){return[];}); var sv=all.filter(function(v){return saved.includes(v.id);});
    l.innerHTML=''; if(!sv.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No saved videos.</p>';return;}
    sv.forEach(function(v){l.appendChild(makeVCard(v));});
  },
  _loadHistory: async function(){
    var l=document.getElementById('historyList'); if(!l)return;
    var u=S.me(); if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return null;}); var hist=(ud&&ud.videoHistory)||[];
    var all=await DB.vids().catch(function(){return[];});
    l.innerHTML=''; if(!hist.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No watch history yet.</p>';return;}
    hist.slice().reverse().slice(0,50).forEach(function(h){var v=all.find(function(x){return x.id===h.vid;});if(!v)return;var c=makeVCard(v);var st=c.querySelector('.vcard-stats');if(st)st.textContent='Watched '+timeAgo(h.watchedAt);l.appendChild(c);});
  },
  clearHistory: async function(){
    if(!confirm('Clear all watch history?'))return;
    var u=S.me(); if(!u)return;
    await DB.uu(u.id,{videoHistory:[]}); _me=Object.assign({},_me,{videoHistory:[]});S.set(_me);
    VidSys._loadHistory(); T('History cleared','info');
  },
  _loadMine: async function(){
    var l=document.getElementById('myVidList'); if(!l)return;
    var u=S.me(); if(!u)return;
    var all=await DB.vids().catch(function(){return[];}); var mine=all.filter(function(v){return v.uploaderId===u.id;}).reverse();
    l.innerHTML=''; if(!mine.length){l.innerHTML='<div style="text-align:center;padding:40px;color:#555"><i class="fas fa-video-slash" style="font-size:3rem;display:block;margin-bottom:14px;opacity:.3"></i><p>No videos yet. Upload one!</p></div>';return;}
    var ud=await DB.getUser(u.id).catch(function(){return null;})||{};
    mine.forEach(function(v){
      var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':''),vw=v.views||0;
      var div=document.createElement('div'); div.className='vcard';
      div.innerHTML='<div class="vth-wrap" onclick="VidSys.open(\''+v.id+'\')">'+(th?'<img src="'+th+'" class="vth">':'<div class="vth" style="background:#1a1a2e"></div>')+'<span class="vbadge-dur">'+vw+' views</span></div>'+
        '<div class="vcard-info"><div class="vcard-av"><i class="fas fa-chart-bar" style="color:var(--primary);font-size:1.2rem;margin-top:6px"></i></div><div class="vcard-meta"><h4 class="vcard-title">'+v.title+'</h4>'+
        '<p class="vcard-stats">'+(vw*(_cfg.viewCoinRate||5)).toFixed(1)+' coins earned'+(ud.monetized?' · ৳'+(vw*(_cfg.viewCoinRate||5)*(_cfg.coinToBDT||0.05)).toFixed(4):'')+'</p>'+
        '<div style="display:flex;gap:6px;margin-top:6px"><button class="btn-sm btn-o" onclick="event.stopPropagation();ChanSys.open(\''+u.id+'\')"><i class="fas fa-tv"></i> Channel</button><button class="btn-sm btn-r" onclick="event.stopPropagation();VidSys.delMine(\''+v.id+'\')"><i class="fas fa-trash"></i></button></div></div></div>';
      l.appendChild(div);
    });
  },
  delMine: async function(id){ if(!confirm('Delete this video?'))return; L.show('Deleting...'); await DB.delVid(id); L.off(); VidSys._loadMine(); T('Deleted','info'); },
  previewUp: function(input){
    var pv=document.getElementById('upPrev'); if(!input.files||!input.files[0]){if(pv)pv.classList.add('hidden');return;}
    var f=input.files[0]; if(!f.type.startsWith('video/')){T('Select a video file','warning');return;}
    var ve=document.getElementById('upVidEl');if(ve){ve.src=URL.createObjectURL(f);if(pv)pv.classList.remove('hidden');}
    var si=document.getElementById('upInfo');if(si)si.textContent=f.name+' — '+(f.size/1024/1024).toFixed(1)+'MB';
  },
  upload: async function(){
    var fi=document.getElementById('upFile');
    var title=(document.getElementById('upTitle')||{}).value||'';
    var desc=(document.getElementById('upDesc')||{}).value||'';
    var tags=(document.getElementById('upTags')||{}).value||'';
    var cat=(document.getElementById('upCat')||{}).value||'Other';
    var u=S.me(); if(!u)return;
    title=title.trim();
    if(!title)return T('Enter video title','warning');
    if(!fi||!fi.files||!fi.files[0])return T('Select a video file','warning');
    var file=fi.files[0]; if(!file.type.startsWith('video/'))return T('Invalid video file','error');
    var btn=document.getElementById('upBtn');if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...';}
    var reader=new FileReader();
    reader.onload=function(e){
      var vel=document.createElement('video'); vel.src=e.target.result; vel.currentTime=1;
      vel.onloadeddata=async function(){
        var canvas=document.createElement('canvas'); canvas.width=320;canvas.height=180;
        canvas.getContext('2d').drawImage(vel,0,0,320,180);
        var thumb=canvas.toDataURL('image/jpeg',0.7);
        L.show('Saving video...');
        try{
          var cu=S.me();
          await DB.saveVid({id:'v_'+Date.now(),title:title,description:desc,tags:tags,category:cat,
            uploaderId:cu.id,uploaderName:cu.username,uploaderDisplayName:cu.displayName||cu.username,
            uploaderAvatar:cu.avatar||'',uploaderMonetized:cu.monetized||false,
            videoData:e.target.result,thumbnail:thumb,watchDuration:15,
            views:0,likes:0,dislikes:0,addedAt:new Date().toISOString()});
          /* Upload bonus */
          var bonus=_cfg.uploadBonus||50; var ud2=await DB.getUser(cu.id);
          await DB.uu(cu.id,{coins:(ud2.coins||0)+bonus});
          _me=Object.assign({},_me,{coins:(_me.coins||0)+bonus}); S.set(_me); UI.sync();
          L.off(); if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload';}
          if(document.getElementById('upTitle'))document.getElementById('upTitle').value='';
          if(document.getElementById('upDesc'))document.getElementById('upDesc').value='';
          if(document.getElementById('upTags'))document.getElementById('upTags').value='';
          fi.value=''; var pv=document.getElementById('upPrev');if(pv)pv.classList.add('hidden');
          VidSys.tab('myvideos');
          T('Video uploaded! +'+bonus+' coins! 🎉','success');
          AchSys.check('upload',1);
        }catch(er){L.off();if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload';}T('Upload failed. Try again.','error');}
      };
      vel.onerror=function(){if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload';}T('Error reading video.','error');};
    };
    reader.onerror=function(){if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload';}T('Error reading file.','error');};
    reader.readAsDataURL(file);
  },

  /* ---- Player ---- */
  open: async function(videoId){
    var u=S.me(); if(!u) return T('Login to watch videos','warning');
    if(!_allVids.length){try{_allVids=await DB.vids();}catch(e){_allVids=[];}}
    var video=_allVids.find(function(v){return v.id===videoId;});
    if(!video){try{_allVids=await DB.vids();video=_allVids.find(function(v){return v.id===videoId;});}catch(e){}}
    if(!video) return T('Video not found','error');
    /* Ad logic */
    _adPlays++;
    if(_cfg.videoAdEnabled&&_cfg.videoAdCode&&(_adPlays%(_cfg.adFrequency||1)===0)){
      AdSys.play(_cfg.videoAdCode,_cfg.adSkipTime||5,_cfg.adUnskippable||false,video);
    } else {
      VidSys._startPlayer(video,u);
    }
  },
  close: function(){
    clearInterval(VidSys._timer);
    var f=document.getElementById('vpFrame');if(f)f.src='';
    /* Restore iframe if replaced by video element */
    var vf=document.getElementById('ytVF');
    if(vf&&!vf.querySelector('iframe')){
      vf.innerHTML='<iframe id="vpFrame" src="" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%"></iframe>';
    }
    var ov=document.getElementById('vpOverlay');if(ov)ov.classList.add('hidden');
    /* Cancel autoplay */
    if(window._acT){clearInterval(window._acT);var cnt=document.getElementById('autoplayCnt');if(cnt)cnt.remove();}
    VidSys._vid=null; VidSys._el=0; VidSys._claimed=false;
  },
  _startPlayer: async function(video,u){
    VidSys._vid=video; VidSys._el=0; VidSys._claimed=false;
    var ov=document.getElementById('vpOverlay'); if(ov){ov.classList.remove('hidden');ov.scrollTop=0;}
    /* Video frame */
    var vid=ytId(video.url||''),frame=document.getElementById('vpFrame');
    if(video.videoData){var vf=document.getElementById('ytVF');if(vf)vf.innerHTML='<video src="'+video.videoData+'" controls autoplay style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>';}
    else if(vid&&frame)frame.src='https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0&modestbranding=1';
    /* Fill info */
    var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    set('vpTitle',video.title); set('vpViews',fmtViews(video.views||0)+' views'); set('vpDate',timeAgo(video.addedAt)); set('vpCat',video.category||'');
    set('vpNeeded',(video.watchDuration||15)+'s'); set('vpElapsed','0s');
    /* Like/save state reset */
    var lb=document.getElementById('vpLikeBtn'),db=document.getElementById('vpDislikeBtn'),sb=document.getElementById('vpSaveBtn');
    if(lb)lb.classList.remove('on');if(db)db.classList.remove('on');if(sb)sb.classList.remove('on');
    set('vpLikeN',(video.likes||0).toString());
    /* Description */
    var dt=document.getElementById('vpDescTxt');if(dt){dt.classList.remove('exp');dt.textContent=video.description||'No description.';}
    var dm=document.getElementById('vpDescMore');if(dm)dm.textContent='Show more';
    /* Progress reset */
    var pf=document.getElementById('vpProgFill');if(pf){pf.style.width='0%';pf.style.background='';}
    set('vpPct','0%');
    var cb=document.getElementById('vpClaimBtn');if(cb)cb.classList.add('hidden');
    set('vpMsg','Watching to support the creator...');
    /* Tags */
    var tg=document.getElementById('vpTags');if(tg){tg.innerHTML='';if(video.tags){video.tags.split(',').forEach(function(tag){tag=tag.trim();if(tag){var sp=document.createElement('span');sp.className='vtag';sp.textContent='#'+tag;sp.onclick=function(){VidSys.clearSearch();var inp=document.getElementById('searchInp');if(inp){inp.value=tag;VidSys.search(tag);}VidSys.tab('home');};tg.appendChild(sp);}});}}
    /* My avatar */
    var ma=document.getElementById('vpMyAv');if(ma&&u)ma.src=u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    /* Load uploader, comments, related */
    VidSys._fillUploader(video,u);
    VidSys._loadComments(video.id);
    VidSys._loadRelated(video);
    /* Like/save state */
    if(u)DB.getUser(u.id).then(function(ud){if(!ud)return;if((ud.likedVideos||[]).includes(video.id)&&lb)lb.classList.add('on');if((ud.dislikedVideos||[]).includes(video.id)&&db)db.classList.add('on');if((ud.savedVideos||[]).includes(video.id)&&sb)sb.classList.add('on');}).catch(function(){});
    /* Rating bar */
    var rb=document.getElementById('vpRatingBar'),rf=document.getElementById('vpRatingFill');
    var tot=(video.likes||0)+(video.dislikes||0);
    if(rb&&tot>0){rb.style.display='block';if(rf)rf.style.width=Math.round((video.likes||0)/tot*100)+'%';}
    else if(rb)rb.style.display='none';
    /* Start timer */
    VidSys._runTimer();
  },
  _fillUploader: async function(video,me){
    var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    var setSrc=function(id,v){var e=document.getElementById(id);if(e&&e.tagName==='IMG')e.src=v;};
    if(!video.uploaderId){set('vpChName','Admin');setSrc('vpChAv','https://cdn-icons-png.flaticon.com/512/149/149071.png');set('vpChSubs','');var sb2=document.getElementById('vpSubBtn');if(sb2)sb2.style.display='none';return;}
    try{
      var ud=await DB.getUser(video.uploaderId);
      var cnt=await SubSys.count(video.uploaderId);
      set('vpChName',(ud&&(ud.displayName||ud.username))||video.uploaderName||'Creator');
      setSrc('vpChAv',(ud&&ud.avatar)||'https://cdn-icons-png.flaticon.com/512/149/149071.png');
      set('vpChSubs',cnt.toLocaleString()+' subscribers');
      var sb=document.getElementById('vpSubBtn'),bell=document.getElementById('vpBellBtn');
      if(sb)sb.style.display='';if(bell)bell.style.display='';
      if(me){
        var meD=await DB.getUser(me.id);
        var isSub=meD&&(meD.subscriptions||[]).includes(video.uploaderId);
        if(sb){sb.textContent=isSub?'Subscribed':'Subscribe';sb.className='vp-sub-btn'+(isSub?' on':'');}
        if(bell&&meD){var bon=(meD.notifChannels||[]).includes(video.uploaderId);if(bon)bell.classList.add('on');else bell.classList.remove('on');}
        if(sb&&me.id===video.uploaderId)sb.style.display='none';
      }
    }catch(e){}
  },
  _loadRelated: function(video){
    var l=document.getElementById('vpRelated'); if(!l)return;
    var rel=_allVids.filter(function(v){return v.id!==video.id&&(v.category===video.category||v.uploaderId===video.uploaderId);}).slice(0,8);
    if(!rel.length)rel=_allVids.filter(function(v){return v.id!==video.id;}).slice(0,8);
    l.innerHTML='';
    rel.forEach(function(v){
      var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':'');
      var d=document.createElement('div');d.className='rel-card';d.onclick=function(){VidSys.open(v.id);};
      d.innerHTML='<img src="'+(th||'')+'" class="rel-th" loading="lazy" onerror="this.style.background=\'#1a1a2e\'"><div class="rel-info"><div class="rel-title">'+v.title+'</div><div class="rel-ch">'+(v.uploaderDisplayName||v.uploaderName||'Admin')+'</div><div style="font-size:.72rem;color:#555">'+fmtViews(v.views||0)+' · '+timeAgo(v.addedAt)+'</div></div>';
      l.appendChild(d);
    });
  },
  _runTimer: function(){
    clearInterval(VidSys._timer);
    var video=VidSys._vid; if(!video)return;
    VidSys._timer=setInterval(function(){
      VidSys._el++;
      var dur=video.watchDuration||15, p=Math.min(100,Math.round(VidSys._el/dur*100));
      var pf=document.getElementById('vpProgFill');if(pf)pf.style.width=p+'%';
      var pc=document.getElementById('vpPct');if(pc)pc.textContent=p+'%';
      var te=document.getElementById('vpElapsed');if(te)te.textContent=VidSys._el+'s';
      if(VidSys._el>=dur&&!VidSys._claimed){
        clearInterval(VidSys._timer);
        var cb=document.getElementById('vpClaimBtn');if(cb)cb.classList.remove('hidden');
        var wm=document.getElementById('vpMsg');if(wm)wm.textContent='';
        if(pf)pf.style.background='linear-gradient(90deg,#00cc66,#00ff88)';
        T('Watch complete! Claim your reward!','success');
      }
    },1000);
  },
  claim: async function(){
    if(VidSys._claimed)return;
    var video=VidSys._vid; if(!video)return;
    VidSys._claimed=true;
    var u=S.me(); if(!u)return;
    L.show('Registering view...');
    try{
      var ud=await DB.getUser(u.id);
      var viewerCoins=_cfg.viewerCoinRate||1;
      var hist=(ud.videoHistory||[]).slice();
      var alreadyWatched=hist.some(function(h){return h.vid===video.id;});
      hist.push({vid:video.id,title:video.title,watchedAt:new Date().toISOString()});
      if(hist.length>200)hist=hist.slice(-200);
      var viewerUpd={videoHistory:hist};
      if(!alreadyWatched)viewerUpd.coins=(ud.coins||0)+viewerCoins;
      await DB.uu(u.id,viewerUpd);
      await DB.u('videos/'+video.id,{views:(video.views||0)+1});
      if(!alreadyWatched){_me=Object.assign({},_me,{coins:(_me.coins||0)+viewerCoins});S.set(_me);}
      /* Uploader earnings */
      if(video.uploaderId&&video.uploaderId!==u.id){
        var up=await DB.getUser(video.uploaderId);
        if(up){
          var vc=_cfg.viewCoinRate||5;
          var upUpd={coins:(up.coins||0)+vc,totalVideoViews:(up.totalVideoViews||0)+1};
          if(up.monetized){upUpd.balance=(up.balance||0)+vc*(_cfg.coinToBDT||0.05);upUpd.balanceUSD=(up.balanceUSD||0)+vc*(_cfg.coinToUSD||0.0005);upUpd.videoEarnings=(up.videoEarnings||0)+vc*(_cfg.coinToBDT||0.05);}
          await DB.uu(video.uploaderId,upUpd);
          VidSys._notify(video.uploaderId,{type:'view',text:(u.displayName||u.username)+' watched "'+video.title+'" — +'+vc+' coins!',avatar:u.avatar||'',thumb:video.thumbnail||'',time:new Date().toISOString(),unread:true});
        }
      }
      L.off(); UI.sync(); VidSys.close();
      var msg='✅ View counted!';
      if(!alreadyWatched)msg+=' You got +'+viewerCoins+' coin!';
      T(msg,'success');
      MissionSys.progress('watch',1);
      /* Autoplay */
      setTimeout(function(){VidSys._autoplay(video);},600);
    }catch(e){L.off();VidSys.close();T('View counted!','success');}
  },
  _autoplay: function(video){
    var next=_allVids.find(function(v){return v.id!==video.id&&v.category===video.category;});
    if(!next)next=_allVids.find(function(v){return v.id!==video.id;});
    if(!next)return;
    var secs=5; var countDiv=document.createElement('div');
    countDiv.id='autoplayCnt';
    countDiv.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1a0035;border:1px solid rgba(124,58,237,.5);border-radius:12px;padding:12px 20px;z-index:8000;display:flex;align-items:center;gap:12px;color:white;font-size:.85rem';
    countDiv.innerHTML='<span>▶️ Next: '+next.title.substring(0,30)+'</span><span id="acSecs" style="font-weight:700;color:var(--primary)">'+secs+'s</span><button onclick="document.getElementById(\'autoplayCnt\').remove();clearInterval(window._acT);" style="background:none;border:none;color:#888;cursor:pointer">✕</button>';
    document.body.appendChild(countDiv);
    window._acT=setInterval(function(){secs--;var el=document.getElementById('acSecs');if(el)el.textContent=secs+'s';if(secs<=0){clearInterval(window._acT);var cnt=document.getElementById('autoplayCnt');if(cnt)cnt.remove();VidSys.open(next.id);}},1000);
  },

  /* ---- Interactions ---- */
  like: async function(){
    var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id); var liked=(ud.likedVideos||[]).slice(),idx=liked.indexOf(v.id),lb=document.getElementById('vpLikeBtn');
    if(idx!==-1){liked.splice(idx,1);await DB.uu(u.id,{likedVideos:liked});await DB.u('videos/'+v.id,{likes:Math.max(0,(v.likes||0)-1)});v.likes=Math.max(0,(v.likes||0)-1);if(lb)lb.classList.remove('on');}
    else{liked.push(v.id);var dis=(ud.dislikedVideos||[]).filter(function(x){return x!==v.id;});await DB.uu(u.id,{likedVideos:liked,dislikedVideos:dis});await DB.u('videos/'+v.id,{likes:(v.likes||0)+1});v.likes=(v.likes||0)+1;if(lb)lb.classList.add('on');var db=document.getElementById('vpDislikeBtn');if(db)db.classList.remove('on');VidSys._notify(v.uploaderId||'',{type:'like',text:(u.displayName||u.username)+' liked "'+v.title+'"',avatar:u.avatar||'',thumb:v.thumbnail||'',time:new Date().toISOString(),unread:true});}
    var ln=document.getElementById('vpLikeN');if(ln)ln.textContent=v.likes;
  },
  dislike: async function(){
    var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id); var dis=(ud.dislikedVideos||[]).slice(),idx=dis.indexOf(v.id),db=document.getElementById('vpDislikeBtn');
    if(idx!==-1){dis.splice(idx,1);await DB.uu(u.id,{dislikedVideos:dis});if(db)db.classList.remove('on');}
    else{dis.push(v.id);var liked=(ud.likedVideos||[]).filter(function(x){return x!==v.id;});if(liked.length<(ud.likedVideos||[]).length){await DB.u('videos/'+v.id,{likes:Math.max(0,(v.likes||0)-1)});v.likes=Math.max(0,(v.likes||0)-1);var lb=document.getElementById('vpLikeBtn');if(lb)lb.classList.remove('on');var ln=document.getElementById('vpLikeN');if(ln)ln.textContent=v.likes;}await DB.uu(u.id,{dislikedVideos:dis,likedVideos:liked});if(db)db.classList.add('on');}
  },
  share: function(){
    var v=VidSys._vid;if(!v)return;
    var url=window.location.href.split('?')[0]+'?v='+v.id;
    safeShare(v.title,'Watch "'+v.title+'" on TaskMint Pro!\n'+url,url);
    MissionSys.progress('share',1);
  },
  save: async function(){
    var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id); var saved=(ud.savedVideos||[]).slice(),idx=saved.indexOf(v.id),sb=document.getElementById('vpSaveBtn');
    if(idx!==-1){saved.splice(idx,1);await DB.uu(u.id,{savedVideos:saved});if(sb)sb.classList.remove('on');T('Removed from saved','info');}
    else{saved.push(v.id);await DB.uu(u.id,{savedVideos:saved});if(sb)sb.classList.add('on');T('Saved! 🔖','success');}
  },
  toggleDesc: function(){var dt=document.getElementById('vpDescTxt'),dm=document.getElementById('vpDescMore');if(!dt)return;var exp=dt.classList.toggle('exp');if(dm)dm.textContent=exp?'Show less':'Show more';},
  goChannel: function(){var v=VidSys._vid;if(v&&v.uploaderId){VidSys.close();ChanSys.open(v.uploaderId);}},
  subscribe: async function(){var v=VidSys._vid;if(!v||!v.uploaderId)return;await SubSys.toggle(v.uploaderId);VidSys._fillUploader(v,S.me());VidSys._notify(v.uploaderId,{type:'sub',text:(S.me().displayName||S.me().username)+' subscribed to your channel!',avatar:S.me().avatar||'',thumb:'',time:new Date().toISOString(),unread:true});},
  bell: async function(){
    var v=VidSys._vid;if(!v||!v.uploaderId)return;var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id);var nc=(ud.notifChannels||[]).slice(),idx=nc.indexOf(v.uploaderId),bell=document.getElementById('vpBellBtn');
    if(idx!==-1){nc.splice(idx,1);await DB.uu(u.id,{notifChannels:nc});if(bell)bell.classList.remove('on');T('Notifications off','info');}
    else{nc.push(v.uploaderId);await DB.uu(u.id,{notifChannels:nc});if(bell)bell.classList.add('on');T('Notifications on 🔔','success');}
  },
  report: function(){ if(confirm('Report this video for inappropriate content?'))T('Video reported. We will review it.','info'); },
  addToPlaylist: async function(){
    var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id); var pls=(ud.playlists||[]),modal=document.getElementById('playlistModal'),l=document.getElementById('playlistList');
    if(!modal||!l)return;
    l.innerHTML='';
    if(!pls.length){l.innerHTML='<p style="color:#888;text-align:center;padding:10px">No playlists. Create one below!</p>';}
    else{pls.forEach(function(pl,i){var d=document.createElement('div');d.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.04);margin-bottom:6px';var inPl=(pl.videos||[]).includes(v.id);d.innerHTML='<span><i class="fas fa-list" style="color:var(--primary);margin-right:8px"></i>'+pl.name+' ('+((pl.videos||[]).length)+')</span><span style="color:'+(inPl?'var(--primary)':'#555')+'">'+( inPl?'✓':'+')+'</span>';d.onclick=async function(){if(inPl){pl.videos=(pl.videos||[]).filter(function(x){return x!==v.id;});T('Removed from '+pl.name,'info');}else{pl.videos=pl.videos||[];pl.videos.push(v.id);T('Added to '+pl.name,'success');}await DB.uu(u.id,{playlists:pls});modal.classList.add('hidden');};l.appendChild(d);});}
    modal.classList.remove('hidden');
  },
  createPlaylist: async function(){
    var name=(document.getElementById('newPlaylistName')||{}).value||'';
    name=name.trim(); if(!name)return T('Enter playlist name','warning');
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id); var pls=(ud.playlists||[]).slice();
    pls.push({id:'pl_'+Date.now(),name:name,videos:[],createdAt:new Date().toISOString()});
    await DB.uu(u.id,{playlists:pls}); _me=Object.assign({},_me,{playlists:pls});S.set(_me);
    if(document.getElementById('newPlaylistName'))document.getElementById('newPlaylistName').value='';
    VidSys.addToPlaylist(); T('Playlist created!','success');
  },

  /* ---- Comments ---- */
  postComment: async function(){
    var inp=document.getElementById('vpComInput');if(!inp)return;
    var text=inp.value.trim(); if(!text)return T('Write something first','warning');
    var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;
    var c={id:'c_'+Date.now(),userId:u.id,username:u.displayName||u.username,avatar:u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png',text:text,likes:0,likedBy:[],pinned:false,createdAt:new Date().toISOString()};
    await DB.saveCom(v.id,c); inp.value=''; inp.style.height='auto';
    T('Comment posted!','success'); VidSys._loadComments(v.id);
    if(v.uploaderId&&v.uploaderId!==u.id)VidSys._notify(v.uploaderId,{type:'comment',text:(u.displayName||u.username)+' commented: '+text.substring(0,60),avatar:u.avatar||'',thumb:v.thumbnail||'',time:new Date().toISOString(),unread:true});
    MissionSys.progress('comment',1);
  },
  _loadComments: async function(videoId){
    var vid=videoId||(VidSys._vid&&VidSys._vid.id); if(!vid)return;
    var l=document.getElementById('vpComList'),ce=document.getElementById('vpComCnt'); if(!l)return;
    var coms=await DB.coms(vid).catch(function(){return[];});
    if(ce)ce.textContent=coms.length;
    if(!coms.length){l.innerHTML='<p style="color:#555;font-size:.85rem;padding:10px 0">No comments yet. Be the first!</p>';return;}
    var u=S.me();
    coms.sort(function(a,b){if(a.pinned&&!b.pinned)return -1;if(!a.pinned&&b.pinned)return 1;return new Date(b.createdAt)-new Date(a.createdAt);});
    var uploaderIds=VidSys._vid?[VidSys._vid.uploaderId]:[];
    l.innerHTML='';
    coms.forEach(function(c){
      var ml=(c.likedBy||[]).includes(u?u.id:''),isOp=uploaderIds.includes(c.userId);
      var d=document.createElement('div'); d.className='vp-com-item';
      d.innerHTML='<img src="'+c.avatar+'" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">'+
        '<div class="vp-com-body"><div class="vp-com-name">'+c.username+(c.pinned?' <span style="color:var(--primary);font-size:.68rem">📌</span>':'')+(isOp?' <span class="op-badge">Creator</span>':'')+' <span style="color:#555;font-weight:400">'+timeAgo(c.createdAt)+'</span></div>'+
        '<div class="vp-com-txt">'+c.text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')+'</div>'+
        '<div class="vp-com-act"><button class="vp-com-lbtn'+(ml?' on':'')+'" onclick="VidSys._likeComment(\''+vid+'\',\''+c.id+'\')"><i class="fas fa-thumbs-up"></i> '+(c.likes||0)+'</button>'+
        '<button class="vp-com-rbtn" onclick="VidSys._replyTo(\''+c.username+'\')">Reply</button>'+
        (u&&VidSys._vid&&VidSys._vid.uploaderId===u.id?'<button class="vp-com-rbtn" onclick="VidSys._pinComment(\''+vid+'\',\''+c.id+'\','+(!c.pinned)+')">'+(c.pinned?'Unpin':'📌 Pin')+'</button>':'')+
        '</div></div>';
      l.appendChild(d);
    });
  },
  _likeComment: async function(vid,cid){var u=S.me();if(!u)return;var c=await DB.r('comments/'+vid+'/'+cid);if(!c)return;var lb=(c.likedBy||[]).slice(),idx=lb.indexOf(u.id);if(idx!==-1){lb.splice(idx,1);await DB.updCom(vid,cid,{likes:Math.max(0,(c.likes||0)-1),likedBy:lb});}else{lb.push(u.id);await DB.updCom(vid,cid,{likes:(c.likes||0)+1,likedBy:lb});}VidSys._loadComments(vid);},
  _pinComment: async function(vid,cid,pin){await DB.updCom(vid,cid,{pinned:!!pin});VidSys._loadComments(vid);T(pin?'Comment pinned!':'Unpinned','info');},
  _replyTo: function(username){var inp=document.getElementById('vpComInput');if(inp){inp.value='@'+username+' ';inp.focus();}},
  sortComments: function(val){VidSys._loadComments(null);},

  /* ---- Notifications ---- */
  _notify: async function(uid,notif){
    if(!uid)return;
    try{var ud=await DB.getUser(uid);if(!ud)return;var notifs=(ud.notifications||[]).slice();notifs.unshift(notif);if(notifs.length>100)notifs=notifs.slice(0,100);await DB.uu(uid,{notifications:notifs});}catch(e){}
  }
};

/* ================================================================
   AD SYSTEM
   ================================================================ */
var AdSys = {
  _pendVideo: null,
  play: function(code,skip,unskip,video){
    AdSys._pendVideo=video;
    var ov=document.getElementById('adOverlay'),inner=document.getElementById('adInner');
    if(!ov||!inner){VidSys._startPlayer(video,S.me());return;}
    inner.innerHTML='';
    var w=document.createElement('div');w.innerHTML=code;inner.appendChild(w);
    w.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');Array.from(o.attributes).forEach(function(a){n.setAttribute(a.name,a.value);});n.textContent=o.textContent;o.parentNode.replaceChild(n,o);});
    ov.classList.remove('hidden');
    var sb=document.getElementById('adSkipBtn'),fill=document.getElementById('adFill'),txt=document.getElementById('adTxt');
    if(unskip&&sb)sb.classList.add('hidden'); else if(sb){sb.classList.add('hidden');}
    var left=skip; if(txt)txt.textContent=left+'s'; if(fill)fill.style.width='100%';
    clearInterval(AdSys._t);
    AdSys._t=setInterval(function(){left--;if(txt)txt.textContent=left+'s';if(fill)fill.style.width=((left/skip)*100)+'%';if(left<=0){clearInterval(AdSys._t);if(!unskip&&sb)sb.classList.remove('hidden');else if(unskip)AdSys.skip();}},1000);
    /* Coin reward for watching */
    setTimeout(function(){try{var u=S.me();if(u&&_me){DB.getUser(u.id).then(function(ud){if(ud){DB.uu(u.id,{coins:(ud.coins||0)+2});_me=Object.assign({},_me,{coins:(_me.coins||0)+2});S.set(_me);UI.sync();}}).catch(function(){});}T('+2 coins for watching ad! 🪙','success');}catch(e){}},1000);
  },
  skip: function(){
    clearInterval(AdSys._t);
    var ov=document.getElementById('adOverlay');if(ov)ov.classList.add('hidden');
    var inner=document.getElementById('adInner');if(inner)inner.innerHTML='';
    if(AdSys._pendVideo){VidSys._startPlayer(AdSys._pendVideo,S.me());AdSys._pendVideo=null;}
  }
};

/* ================================================================
   SUBSCRIBE SYSTEM
   ================================================================ */
var SubSys = {
  toggle: async function(tid){
    var me=S.me();if(!me)return;
    if(me.id===tid)return T('Cannot subscribe to yourself','warning');
    var md=await DB.getUser(me.id); var subs=(md.subscriptions||[]).slice(),idx=subs.indexOf(tid);
    if(idx!==-1){subs.splice(idx,1);await DB.uu(me.id,{subscriptions:subs});T('Unsubscribed','info');}
    else{subs.push(tid);await DB.uu(me.id,{subscriptions:subs});T('Subscribed! 🔔','success');AchSys.check('sub',1);}
  },
  count: async function(uid){
    try{var all=await DB.users();return all.filter(function(u){return(u.subscriptions||[]).includes(uid);}).length;}catch(e){return 0;}
  }
};

/* ================================================================
   CHANNEL SYSTEM
   ================================================================ */
var ChanSys = {
  _uid: null,
  open: async function(uid){
    ChanSys._uid=uid;
    document.querySelectorAll('.page-section').forEach(function(el){el.classList.add('hidden');});
    var pg=document.getElementById('page-channel');if(pg)pg.classList.remove('hidden');
    var nav=document.getElementById('mainNav');if(nav)nav.classList.remove('hidden');
    _prevPage=_curPage; _curPage='channel';
    var me=S.me(),eb=document.getElementById('chEditBar');
    if(eb)eb.classList.toggle('hidden',!(me&&me.id===uid));
    window.scrollTo(0,0);
    ChanSys.render(uid,'videos');
  },
  back: function(){ Router.go(_prevPage||'home'); },
  save: async function(){
    var desc=(document.getElementById('chDescIn')||{}).value||'';
    var banner=(document.getElementById('chBannerIn')||{}).value||'';
    var link=(document.getElementById('chLinkIn')||{}).value||'';
    var u=S.me();if(!u)return;
    L.show('Saving...');
    await DB.uu(u.id,{channelDesc:desc,channelBanner:banner,channelLink:link});
    _me=Object.assign({},_me,{channelDesc:desc,channelBanner:banner,channelLink:link});S.set(_me);
    L.off(); T('Channel saved!','success'); ChanSys.render(u.id,'videos');
  },
  showTab: function(tab,btn){
    document.querySelectorAll('#chTabs .vtab').forEach(function(b){b.classList.remove('active');});
    if(btn)btn.classList.add('active');
    ChanSys.render(ChanSys._uid,tab);
  },
  render: async function(uid,tab){
    tab=tab||'videos';
    var me=S.me(); L.show('Loading channel...');
    try{
      var res=await Promise.all([DB.getUser(uid),SubSys.count(uid),DB.vids()]);
      var user=res[0],cnt=res[1],allVids=res[2];
      L.off(); if(!user)return;
      var meData=me?await DB.getUser(me.id).catch(function(){return null;}):null;
      var isSub=meData&&(meData.subscriptions||[]).includes(uid);
      var isMe=me&&me.id===uid;
      var uvids=allVids.filter(function(v){return v.uploaderId===uid;});
      if(isMe){var di=document.getElementById('chDescIn');if(di)di.value=user.channelDesc||'';var bi=document.getElementById('chBannerIn');if(bi)bi.value=user.channelBanner||'';var li=document.getElementById('chLinkIn');if(li)li.value=user.channelLink||'';}
      var bs=user.channelBanner?'background-image:url('+user.channelBanner+');background-size:cover;background-position:center':'background:linear-gradient(135deg,#0a0014,#1a0035,#0a1a35)';
      var hdr=document.getElementById('chHeader');
      if(hdr)hdr.innerHTML='<div class="ch-banner" style="'+bs+'"></div>'+
        '<div class="ch-info-row">'+
        '<img src="'+(user.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="ch-av">'+
        '<div class="ch-meta">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h2>'+(user.displayName||user.username)+'</h2>'+(user.monetized?'<span class="badge-monetized">💰</span>':'')+'</div>'+
        (user.channelDesc?'<p style="color:#888;font-size:.82rem;margin:4px 0">'+user.channelDesc+'</p>':'')+
        (user.channelLink?'<a href="'+user.channelLink+'" target="_blank" style="color:var(--primary);font-size:.8rem;display:block;margin:4px 0"><i class="fas fa-link" style="margin-right:4px"></i>'+user.channelLink+'</a>':'')+
        '<div class="ch-stats"><span><b>'+cnt.toLocaleString()+'</b> Subscribers</span><span><b>'+uvids.length+'</b> Videos</span><span><b>'+(user.totalVideoViews||0).toLocaleString()+'</b> Views</span></div>'+
        (isMe?'<div style="display:flex;gap:8px;margin-top:10px"><button class="btn-sm btn-o" onclick="Router.go(\'profile\')"><i class="fas fa-cog"></i> Edit</button><button class="btn-sm" style="background:var(--primary);border:none;color:white;border-radius:8px;padding:6px 12px;cursor:pointer" onclick="VidSys.tab(\'upload\');Router.go(\'videos\')"><i class="fas fa-upload"></i> Upload</button></div>':
        '<div style="display:flex;gap:8px;margin-top:10px"><button class="vp-sub-btn'+(isSub?' on':'')+'" onclick="SubSys.toggle(\''+uid+'\');ChanSys.render(\''+uid+'\')"><i class="fas fa-'+(isSub?'bell-slash':'bell')+'"></i> '+(isSub?'Subscribed':'Subscribe')+'</button></div>')+
        '</div></div>';
      var ct=document.getElementById('chContent'); if(!ct)return;
      if(tab==='videos'||tab==='shorts'){
        var fv=uvids.filter(function(v){return tab==='shorts'?isShorts(v):!isShorts(v);});
        ct.innerHTML=''; if(!fv.length){ct.innerHTML='<p style="color:#888;text-align:center;padding:30px">No '+tab+' yet.</p>';return;}
        fv.forEach(function(v){ct.appendChild(makeVCard(v));});
      } else if(tab==='playlists'){
        var pls=meData&&meData.playlists;
        if(!pls||!pls.length){ct.innerHTML='<p style="color:#888;text-align:center;padding:30px">No playlists yet.</p>';return;}
        ct.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px">';
        pls.forEach(function(pl){ct.innerHTML+='<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;cursor:pointer"><div style="font-weight:700;margin-bottom:4px">'+pl.name+'</div><small style="color:#888">'+((pl.videos||[]).length)+' videos</small></div>';});
      } else if(tab==='about'){
        ct.innerHTML='<div style="padding:14px"><div class="card" style="margin:0 0 12px"><h3 style="margin-bottom:10px">About</h3><p style="color:#ccc;font-size:.9rem">'+(user.channelDesc||'No description.')+'</p></div><div class="card" style="margin:0"><h3 style="margin-bottom:10px">Stats</h3><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:#888">Joined</span><span>'+new Date(user.joinedAt||0).toLocaleDateString('en-BD')+'</span></div><div style="display:flex;justify-content:space-between"><span style="color:#888">Total Views</span><span>'+(user.totalVideoViews||0).toLocaleString()+'</span></div><div style="display:flex;justify-content:space-between"><span style="color:#888">Videos</span><span>'+uvids.length+'</span></div></div></div></div>';
      }
    }catch(e){L.off();}
  }
};

/* ================================================================
   MONETIZE SYSTEM
   ================================================================ */
var MonSys = {
  render: async function(){
    var el=document.getElementById('monetizeContent'); if(!el)return;
    var u=S.me(); if(!u){el.innerHTML='<p style="color:#888;text-align:center;padding:30px">Please log in first.</p>';return;}
    el.innerHTML='<p style="color:#888;text-align:center;padding:30px"><i class="fas fa-spinner fa-spin"></i></p>';
    var ud=await DB.getUser(u.id).catch(function(){return null;});
    if(!ud){el.innerHTML='<p style="color:#888;text-align:center;padding:30px">Failed to load.</p>';return;}
    var coins=ud.coins||0,isM=ud.monetized,hp=ud.monetizeStatus==='Pending',limit=_cfg.monetizationCoins||10000000;
    el.innerHTML=
      '<div class="card mon-hero"><div class="mon-icon">'+(isM?'💰':'🚀')+'</div><h2>'+(isM?'You are Monetized!':'Unlock Monetization')+'</h2><p style="color:#888;font-size:.85rem">'+(isM?'Earning BDT & USD from every view!':'Reach '+limit.toLocaleString()+' coins to apply')+'</p></div>'+
      (!isM?'<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:7px"><span style="color:#888;font-size:.83rem">Progress to Monetization</span><span style="color:var(--gold);font-weight:700">'+coins.toLocaleString()+' / '+limit.toLocaleString()+'</span></div><div class="mon-bar"><div style="width:'+Math.min(100,coins/limit*100)+'%"></div></div><p style="color:#888;font-size:.8rem;text-align:center;margin-top:7px">'+(coins>=limit?'✅ Eligible! Apply now.':'Need '+(limit-coins).toLocaleString()+' more coins')+'</p></div>':'')+
      '<div class="card"><h3 style="margin-bottom:12px">💎 Benefits</h3>'+
      '<div class="ben-item '+(isM?'on':'')+'"><i class="fas fa-coins"></i><div><b>Coin Earnings</b><small>'+(_cfg.viewCoinRate||5)+' coins per view — always active</small></div></div>'+
      '<div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>BDT + USD Earnings</b><small>'+(isM?'Active! Every view earns real money':'Unlocks after approval')+'</small></div></div>'+
      '<div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>Withdrawals</b><small>'+(isM?'Enabled!':'Only for monetized creators')+'</small></div></div>'+
      '<div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>Creator Badge ✓</b><small>'+(isM?'Shown on all your videos':'After approval')+'</small></div></div></div>'+
      (!isM&&!hp?'<div style="padding:0 14px 14px"><button class="btn-primary" onclick="MonSys.apply()" '+(coins<limit?'disabled style="opacity:.5"':'')+'>Apply for Monetization</button></div>':'')+
      (hp?'<div class="card" style="text-align:center;padding:22px;color:var(--gold)"><i class="fas fa-clock" style="font-size:2rem;display:block;margin-bottom:10px"></i><b>Under Review</b><p style="color:#888;font-size:.85rem;margin-top:5px">Admin will review within 48 hours.</p></div>':'')+
      (isM?'<div class="card"><h3 style="margin-bottom:12px">📊 My Earnings</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+
        '<div class="stat-box"><i class="fas fa-eye" style="color:var(--primary)"></i><h3>'+(ud.totalVideoViews||0).toLocaleString()+'</h3><small>Total Views</small></div>'+
        '<div class="stat-box"><i class="fas fa-money-bill" style="color:#10b981"></i><h3>৳'+(ud.videoEarnings||0).toFixed(4)+'</h3><small>BDT Earned</small></div>'+
        '<div class="stat-box"><i class="fas fa-dollar-sign" style="color:#3b82f6"></i><h3>$'+(ud.videoEarningsUSD||0).toFixed(6)+'</h3><small>USD Earned</small></div>'+
        '<div class="stat-box"><i class="fas fa-video" style="color:var(--gold)"></i><h3 id="mVCnt">--</h3><small>My Videos</small></div></div></div>':'');
    if(isM)DB.vids().then(function(vids){var e=document.getElementById('mVCnt');if(e)e.textContent=vids.filter(function(v){return v.uploaderId===u.id;}).length;}).catch(function(){});
  },
  apply: async function(){
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id);
    if((ud.coins||0)<(_cfg.monetizationCoins||10000000)) return T('Need '+(_cfg.monetizationCoins||10000000).toLocaleString()+' coins!','error');
    await DB.uu(u.id,{monetizeStatus:'Pending'}); MonSys.render(); T('Application submitted! We will review soon.','success');
  }
};

/* ================================================================
   WITHDRAW SYSTEM — bKash + Bank Transfer (BDT/USD)
   ================================================================ */
var WD = {
  _curr: 'bKash',
  loadPage: function(){
    var u=S.me();if(!u)return;
    if(!_db){/* No DB yet — show lock */var lock=document.getElementById('wdLock'),form=document.getElementById('wdForm');if(lock)lock.classList.remove('hidden');if(form)form.classList.add('hidden');return;}
    DB.getUser(u.id).then(function(ud){
      if(!ud)return;
      var lock=document.getElementById('wdLock'),form=document.getElementById('wdForm');
      if(lock&&form){if(ud.monetized){lock.classList.add('hidden');form.classList.remove('hidden');}else{lock.classList.remove('hidden');form.classList.add('hidden');}}
      var rb=document.getElementById('rateShowBDT');if(rb)rb.textContent='৳'+(_cfg.coinToBDT||0.05);
      var ru=document.getElementById('rateShowUSD');if(ru)ru.textContent='$'+(_cfg.coinToUSD||0.0005);
      WD._loadHistory(ud);
    }).catch(function(){});
  },
  setCurr: function(curr,btn){
    WD._curr=curr;
    document.querySelectorAll('.curr-btn').forEach(function(b){b.classList.remove('active');});
    if(btn)btn.classList.add('active');
    var fBK=document.getElementById('wFormBKash'),fBDT=document.getElementById('wFormBDT'),fUSD=document.getElementById('wFormUSD');
    if(fBK)fBK.style.display=curr==='bKash'?'':'none';
    if(fBDT)fBDT.style.display=curr==='BDT'?'':'none';
    if(fUSD)fUSD.style.display=curr==='USD'?'':'none';
  },
  submit: async function(curr){
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id);if(!ud)return;
    if(!ud.monetized) return T('Monetization required to withdraw','error');
    var all=await DB.wds().catch(function(){return[];});
    if(all.some(function(w){return w.userId===u.id&&w.status==='Pending';})) return T('You already have a pending request','warning');
    if(curr==='bKash'){
      var amt=parseFloat((document.getElementById('wAmtBKash')||{}).value)||0;
      var num=(document.getElementById('wBKashNumber')||{}).value||'';
      var holder=(document.getElementById('wBKashHolder')||{}).value||'';
      if(!amt||amt<200) return T('Minimum ৳200 for bKash','warning');
      if(amt>(ud.balance||0)) return T('Insufficient BDT balance (৳'+(ud.balance||0).toFixed(2)+')','error');
      if(!num||num.length<11) return T('Enter valid bKash number','warning');
      if(!holder) return T('Enter account holder name','warning');
      L.show('Submitting...');
      var newBal=Math.max(0,(ud.balance||0)-amt);
      await DB.uu(u.id,{balance:newBal,totalWithdrawn:(ud.totalWithdrawn||0)+amt});
      await DB.saveWD({id:Date.now(),userId:u.id,username:u.username,type:'bKash',currency:'BDT',amt:amt,method:'bKash',number:num,holder:holder,status:'Pending',requestedAt:new Date().toISOString()});
      _me=Object.assign({},_me,{balance:newBal});S.set(_me);L.off();UI.sync();
      ['wAmtBKash','wBKashNumber','wBKashHolder'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
      T('✅ bKash request submitted! Within 24 hours.','success'); WD.loadPage();
    } else if(curr==='BDT'){
      var amtB=parseFloat((document.getElementById('wAmtBDT')||{}).value)||0;
      var bank=(document.getElementById('wBankName')||{}).value||'';
      var acc=(document.getElementById('wBankAcc')||{}).value||'';
      var branch=(document.getElementById('wBranchName')||{}).value||'';
      var holderB=(document.getElementById('wAccHolder')||{}).value||'';
      if(!amtB||amtB<500) return T('Minimum ৳500 for bank transfer','warning');
      if(amtB>(ud.balance||0)) return T('Insufficient BDT balance','error');
      if(!bank||!acc||!holderB) return T('Fill in all bank details','warning');
      L.show('Submitting...');
      var newBalB=Math.max(0,(ud.balance||0)-amtB);
      await DB.uu(u.id,{balance:newBalB,totalWithdrawn:(ud.totalWithdrawn||0)+amtB});
      await DB.saveWD({id:Date.now(),userId:u.id,username:u.username,type:'BDT',currency:'BDT',amt:amtB,method:'Bank Transfer (BDT)',bank:bank,account:acc,branch:branch,holder:holderB,status:'Pending',requestedAt:new Date().toISOString()});
      _me=Object.assign({},_me,{balance:newBalB});S.set(_me);L.off();UI.sync();
      ['wAmtBDT','wBankName','wBankAcc','wBranchName','wAccHolder'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
      T('✅ BDT bank transfer request submitted! 3–5 business days.','success'); WD.loadPage();
    } else if(curr==='USD'){
      var amtU=parseFloat((document.getElementById('wAmtUSD')||{}).value)||0;
      var bankU=(document.getElementById('wBankNameUSD')||{}).value||'';
      var accU=(document.getElementById('wBankAccUSD')||{}).value||'';
      var swift=(document.getElementById('wSwiftCode')||{}).value||'';
      var holderU=(document.getElementById('wAccHolderUSD')||{}).value||'';
      if(!amtU||amtU<5) return T('Minimum $5.00 for USD transfer','warning');
      if(amtU>(ud.balanceUSD||0)) return T('Insufficient USD balance ($'+(ud.balanceUSD||0).toFixed(4)+')','error');
      if(!bankU||!accU||!holderU) return T('Fill in all bank details','warning');
      L.show('Submitting...');
      var newBalU=Math.max(0,(ud.balanceUSD||0)-amtU);
      await DB.uu(u.id,{balanceUSD:newBalU,totalWithdrawnUSD:(ud.totalWithdrawnUSD||0)+amtU});
      await DB.saveWD({id:Date.now(),userId:u.id,username:u.username,type:'USD',currency:'USD',amtUSD:amtU,amt:amtU,method:'Bank Transfer (USD)',bank:bankU,account:accU,swift:swift,holder:holderU,status:'Pending',requestedAt:new Date().toISOString()});
      _me=Object.assign({},_me,{balanceUSD:newBalU});S.set(_me);L.off();UI.sync();
      ['wAmtUSD','wBankNameUSD','wBankAccUSD','wSwiftCode','wBankCountry','wAccHolderUSD'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
      T('✅ USD transfer request submitted! 5–7 business days.','success'); WD.loadPage();
    }
  },
  _loadHistory: async function(ud){
    var l=document.getElementById('wdList');if(!l)return;
    var all=await DB.wds().catch(function(){return[];}); var my=all.filter(function(w){return w.userId===(ud&&ud.id);}).reverse();
    if(!my.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No withdrawal history yet.</p>';return;}
    l.innerHTML='';
    my.forEach(function(w){
      var sc=w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';
      var icons={'bKash':'📱','Bank Transfer (BDT)':'🇧🇩','Bank Transfer (USD)':'🇺🇸'};
      var valStr=w.currency==='USD'?'$'+(w.amtUSD||w.amt||0).toFixed(4):'৳'+(w.amt||0).toFixed(2);
      l.innerHTML+='<div class="wd-item"><div class="wi-info"><b>'+(icons[w.method]||'💸')+' '+(w.method||'')+'</b><small>'+(w.account||w.number||'')+' · '+(w.holder||'')+'</small><small style="color:#555">'+new Date(w.id||0).toLocaleDateString('en-BD')+'</small></div><div style="text-align:right"><b style="color:var(--gold)">'+valStr+'</b><br><span class="sbadge '+sc+'">'+w.status+'</span></div></div>';
    });
  }
};

/* ================================================================
   ADMIN
   ================================================================ */
var Admin = {
  init: async function(){
    if(sessionStorage.getItem('isAdmin')!=='true'){Router.go('auth');return;}
    /* Show panel, hide gate */
    var gate=document.getElementById('agate'); if(gate)gate.classList.add('hidden');
    var panel=document.getElementById('adminPanel'); if(panel)panel.classList.remove('hidden');
    Admin.tab('overview');
    Admin.renderOverview();
    Admin._loadConfig();
  },
  tab: function(t,btn){
    document.querySelectorAll('.atab').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.atab-content').forEach(function(c){c.classList.add('hidden');});
    if(btn)btn.classList.add('active');
    else{var b2=document.querySelector('.atab[onclick*="\''+t+'\'"]');if(b2)b2.classList.add('active');}
    var con=document.getElementById('aTab-'+t);if(con)con.classList.remove('hidden');
    if(t==='overview')Admin.renderOverview();
    if(t==='users')Admin.loadUsers('');
    if(t==='videos')Admin.loadVids();
    if(t==='tasks')Admin.loadTasks();
    if(t==='withdrawals')Admin.loadWDs('pending');
    if(t==='monetize')Admin.loadMonetize();
  },
  logout: function(){ sessionStorage.removeItem('isAdmin'); Router.go('auth'); },
  renderOverview: async function(){
    var grid=document.getElementById('adminStatsGrid');if(!grid)return;
    grid.innerHTML='<p style="color:#888;text-align:center;padding:20px;grid-column:1/-1"><i class="fas fa-spinner fa-spin"></i></p>';
    try{
      var users=await DB.users(),wds=await DB.wds(),vids=await DB.vids();
      var today=new Date().toDateString();
      var pending=wds.filter(function(w){return w.status==='Pending';}).length;
      var paid=wds.filter(function(w){return w.status==='Approved';}).reduce(function(s,w){return s+(w.amt||0);},0);
      var newToday=users.filter(function(u){return new Date(u.joinedAt||0).toDateString()===today;}).length;
      var banned=users.filter(function(u){return u.isBanned;}).length;
      var monetized=users.filter(function(u){return u.monetized;}).length;
      grid.innerHTML=
        '<div class="astat" style="cursor:pointer" onclick="Admin.loadUsers(\'\')"><i class="fas fa-users" style="color:var(--primary)"></i><h3>'+users.length+'</h3><small>Total Users</small></div>'+
        '<div class="astat"><i class="fas fa-user-plus" style="color:#34d399"></i><h3>+'+newToday+'</h3><small>New Today</small></div>'+
        '<div class="astat" style="cursor:pointer" onclick="Admin.tab(\'withdrawals\')"><i class="fas fa-clock" style="color:#fbbf24"></i><h3>'+pending+'</h3><small>Pending WD</small></div>'+
        '<div class="astat"><i class="fas fa-money-bill" style="color:#34d399"></i><h3>৳'+paid.toFixed(0)+'</h3><small>Total Paid</small></div>'+
        '<div class="astat"><i class="fas fa-video" style="color:var(--primary)"></i><h3>'+vids.length+'</h3><small>Videos</small></div>'+
        '<div class="astat"><i class="fas fa-coins" style="color:#ffd700"></i><h3>'+monetized+'</h3><small>Monetized</small></div>'+
        '<div class="astat"><i class="fas fa-ban" style="color:#ef4444"></i><h3>'+banned+'</h3><small>Banned</small></div>'+
        '<div class="astat" style="cursor:pointer" onclick="Admin.export()"><i class="fas fa-download" style="color:#06b6d4"></i><h3>Export</h3><small>CSV</small></div>';
    }catch(e){if(grid)grid.innerHTML='<p style="color:#ef4444;text-align:center;padding:20px;grid-column:1/-1">Failed to load stats</p>';}
  },
  loadUsers: async function(q){
    var l=document.getElementById('aUserList');if(!l)return;
    l.innerHTML='<p style="color:#888;text-align:center;padding:14px"><i class="fas fa-spinner fa-spin"></i></p>';
    try{
      var users=await DB.users(); q=(q||'').toLowerCase().trim();
      if(q)users=users.filter(function(u){return(u.username||'').toLowerCase().includes(q)||(u.mobile||'').includes(q);});
      if(!users.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No users found</p>';return;}
      l.innerHTML='';
      users.forEach(function(u){
        var d=document.createElement('div');d.className='au-card';
        d.innerHTML='<img src="'+(u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);flex-shrink:0">'+
          '<div style="flex:1;margin-left:10px;min-width:0"><div style="font-weight:700;font-size:.9rem">'+(u.displayName||u.username)+(u.isBanned?' <span style="color:#ef4444">[BANNED]</span>':'')+(u.monetized?' <span style="color:#ffd700">💰</span>':'')+'</div>'+
          '<small style="color:#888">@'+u.username+' · '+(u.mobile||'')+'</small><br>'+
          '<small style="color:#666">'+(u.coins||0).toLocaleString()+' coins | ৳'+(u.balance||0).toFixed(2)+' | $'+(u.balanceUSD||0).toFixed(4)+'</small></div>'+
          '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">'+
          '<button class="btn-sm '+(u.isBanned?'btn-g':'btn-r')+'" onclick="Admin.ban(\''+u.id+'\')">'+(u.isBanned?'Unban':'Ban')+'</button>'+
          '<button class="btn-sm btn-o" onclick="Admin.editCoins(\''+u.id+'\')">Edit</button></div>';
        l.appendChild(d);
      });
    }catch(e){if(l)l.innerHTML='<p style="color:#ef4444;text-align:center;padding:20px">Error loading users</p>';}
  },
  searchUsers: function(q){ clearTimeout(Admin._sT); Admin._sT=setTimeout(function(){Admin.loadUsers(q);},400); },
  ban: async function(id){var u=await DB.getUser(id);if(!u)return;await DB.uu(id,{isBanned:!u.isBanned});Admin.loadUsers('');T((u.isBanned?'Unbanned: ':'Banned: ')+(u.displayName||u.username),u.isBanned?'success':'warning');},
  editCoins: async function(uid){
    var u=await DB.getUser(uid);if(!u)return;
    var c=prompt('Coins for '+(u.displayName||u.username)+'\nCurrent: '+(u.coins||0));
    if(c===null)return; var cv=parseInt(c); if(isNaN(cv)||cv<0)return T('Invalid value','error');
    var b=prompt('BDT Balance\nCurrent: ৳'+(u.balance||0).toFixed(2));
    if(b===null)return; var bv=parseFloat(b); if(isNaN(bv)||bv<0)return T('Invalid value','error');
    await DB.uu(uid,{coins:cv,balance:bv}); Admin.loadUsers(''); T('User updated!','success');
  },
  loadVids: async function(){
    var l=document.getElementById('aVidList'),ce=document.getElementById('aVidCnt');if(!l)return;
    var vids=await DB.vids().catch(function(){return[];});
    if(ce)ce.textContent=vids.length+' video'+(vids.length!==1?'s':'');
    if(!vids.length){l.innerHTML='<p style="color:#888;text-align:center;padding:14px">No videos yet.</p>';return;}
    l.innerHTML='';
    vids.reverse().forEach(function(v){
      var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':'');
      l.innerHTML+='<div class="av-item"><img src="'+th+'" loading="lazy" style="width:78px;height:48px;object-fit:cover;border-radius:7px;flex-shrink:0" onerror="this.style.background=\'#1a1a2e\'">'+
        '<div style="flex:1;margin-left:10px;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+v.title+'</b>'+
        '<small style="color:#888">'+(v.uploaderId?'👤 '+v.uploaderName:'Admin')+' · 👁 '+(v.views||0)+' · ❤️ '+(v.likes||0)+'</small></div>'+
        '<button class="btn-sm btn-r" onclick="Admin.delVid(\''+v.id+'\')" style="flex-shrink:0;margin-left:8px">🗑️</button></div>';
    });
  },
  addVid: async function(){
    var title=(document.getElementById('vTitle')||{}).value||''; var url=(document.getElementById('vUrl')||{}).value||'';
    var dur=parseInt((document.getElementById('vDur')||{}).value)||30; var cat=(document.getElementById('vCat')||{}).value||'Other';
    var desc=(document.getElementById('vDesc')||{}).value||''; var th=(document.getElementById('vThumb')||{}).value||'';
    if(!title.trim())return T('Title required','warning');
    if(!url.trim())return T('YouTube URL required','warning');
    var vid=ytId(url); if(!vid)return T('Invalid YouTube URL. Use full URL or 11-char ID.','error');
    await DB.saveVid({id:'v_'+Date.now(),title:title.trim(),description:desc,category:cat,url:vid,watchDuration:dur,thumbnail:th||(vid?'https://img.youtube.com/vi/'+vid+'/hqdefault.jpg':''),views:0,likes:0,dislikes:0,addedAt:new Date().toISOString()});
    ['vTitle','vUrl','vDur','vDesc','vThumb'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
    Admin.loadVids(); T('Video added!','success');
  },
  delVid: async function(id){if(!confirm('Delete this video?'))return;await DB.delVid(id);Admin.loadVids();T('Deleted','info');},
  loadTasks: async function(){
    var l=document.getElementById('aTaskList');if(!l)return;
    var ts=await DB.tasks().catch(function(){return[];});
    if(!ts.length){l.innerHTML='<p style="color:#888;text-align:center;padding:14px">No tasks yet.</p>';return;}
    l.innerHTML='';
    ts.forEach(function(t){
      l.innerHTML+='<div class="at-item"><img src="'+(t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:36px;height:36px;border-radius:8px" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">'+
        '<div style="flex:1;margin-left:10px"><b>'+t.title+'</b><small style="color:#888;display:block">Reward: '+t.reward+' Coins</small></div>'+
        '<button class="btn-sm btn-r" onclick="Admin.delTask(\''+t.id+'\')">🗑️</button></div>';
    });
  },
  addTask: async function(){
    var title=(document.getElementById('tTitle')||{}).value||''; var reward=parseInt((document.getElementById('tReward')||{}).value)||0;
    var url=(document.getElementById('tUrl')||{}).value||''; var icon=(document.getElementById('tIcon')||{}).value||'';
    if(!title.trim())return T('Title required','warning');
    if(!reward||reward<1)return T('Valid reward required','warning');
    var id='t_'+Date.now();
    await DB.w('tasks/'+id,{id:id,title:title.trim(),reward:reward,type:'link',icon:icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png',link:url||'#'});
    ['tTitle','tReward','tUrl','tIcon'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
    Admin.loadTasks(); T('Task added!','success');
  },
  delTask: async function(id){if(!confirm('Delete?'))return;await DB.del('tasks/'+id);Admin.loadTasks();T('Deleted','info');},
  loadWDs: async function(filter,btn){
    if(btn){document.querySelectorAll('.afilter').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');}
    var l=document.getElementById('aWDList');if(!l)return;
    l.innerHTML='<p style="color:#888;text-align:center;padding:14px"><i class="fas fa-spinner fa-spin"></i></p>';
    try{
      var all=await DB.wds();
      var filtered=filter==='all'?all:all.filter(function(w){return(w.status||'pending').toLowerCase()===filter;});
      filtered=filtered.slice().reverse();
      if(!filtered.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No '+filter+' withdrawals</p>';return;}
      var icons={'bKash':'📱','Bank Transfer (BDT)':'🇧🇩','Bank Transfer (USD)':'🇺🇸'};
      l.innerHTML='';
      filtered.forEach(function(w){
        var sc=w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';
        var valStr=w.currency==='USD'?'$'+(w.amtUSD||w.amt||0).toFixed(4):'৳'+(w.amt||0).toFixed(2);
        var d=document.createElement('div');d.className='awd-card';
        d.innerHTML='<div class="awd-info"><b>'+(icons[w.method]||'💸')+' '+(w.username||'')+'</b>'+
          '<span style="color:#888">'+(w.method||'')+' · '+(w.account||w.number||w.holder||'')+'</span>'+
          '<span style="color:var(--gold)">'+valStr+'</span>'+
          (w.bank?'<small style="color:#666">'+w.bank+(w.branch?' — '+w.branch:'')+'</small>':'')+
          '<small style="color:#555">'+new Date(w.id||0).toLocaleString('en-BD')+'</small></div>'+
          '<div class="awd-act"><span class="sbadge '+sc+'">'+(w.status||'Pending')+'</span>'+
          (w.status==='Pending'?'<button class="btn-sm btn-g" onclick="Admin.procWD('+w.id+',\'Approved\')">✅</button><button class="btn-sm btn-r" onclick="Admin.procWD('+w.id+',\'Rejected\')">❌</button>':'')+
          '</div>';
        l.appendChild(d);
      });
    }catch(e){if(l)l.innerHTML='<p style="color:#ef4444;text-align:center;padding:20px">Error</p>';}
  },
  procWD: async function(wId,status){
    L.show('Processing...');
    var all=await DB.wds(); var w=all.find(function(x){return x.id===wId;});
    if(!w){L.off();return;}
    if(status==='Rejected'&&w.status==='Pending'){
      var user=await DB.getUser(w.userId);
      if(user){
        var restore={};
        if(w.currency==='USD')restore.balanceUSD=(user.balanceUSD||0)+(w.amtUSD||w.amt||0);
        else restore.balance=(user.balance||0)+(w.amt||0);
        await DB.uu(w.userId,restore);
      }
    }
    await DB.updWD(wId,{status:status,processedAt:new Date().toISOString()});
    L.off(); Admin.loadWDs('all'); Admin.renderOverview(); T('Withdrawal '+status,'success');
  },
  loadMonetize: async function(){
    var l=document.getElementById('aMonList');if(!l)return;
    var users=await DB.users().catch(function(){return[];});
    var pend=users.filter(function(u){return u.monetizeStatus==='Pending';}),appr=users.filter(function(u){return u.monetized===true;});
    if(!pend.length&&!appr.length){l.innerHTML='<p style="color:#888;text-align:center;padding:14px">No monetization requests.</p>';return;}
    l.innerHTML='';
    pend.forEach(function(u){l.innerHTML+='<div class="au-card"><img src="'+(u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:38px;height:38px;border-radius:50%;border:2px solid #ffd700;object-fit:cover"><div style="flex:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span style="color:#ffd700;font-size:.78rem">[PENDING]</span></b><small style="color:#888;display:block">'+((u.coins||0).toLocaleString())+' coins</small></div><div style="display:flex;gap:5px;flex-direction:column;align-items:flex-end"><button class="btn-sm btn-g" onclick="Admin.approveM(\''+u.id+'\')">✅ Approve</button><button class="btn-sm btn-r" onclick="Admin.rejectM(\''+u.id+'\')">❌ Reject</button></div></div>';});
    if(appr.length){l.innerHTML+='<p style="color:var(--gold);margin:10px 0 5px;font-size:.83rem">✅ Monetized Creators</p>';appr.forEach(function(u){l.innerHTML+='<div class="au-card"><img src="'+(u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:38px;height:38px;border-radius:50%;border:2px solid var(--gold);object-fit:cover"><div style="flex:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span class="badge-monetized">💰</span></b><small style="color:#888;display:block">Views: '+(u.totalVideoViews||0).toLocaleString()+' · ৳'+(u.videoEarnings||0).toFixed(4)+'</small></div><button class="btn-sm btn-r" onclick="Admin.revokeM(\''+u.id+'\')">Revoke</button></div>';});}
  },
  approveM: async function(uid){await DB.uu(uid,{monetized:true,monetizeStatus:'Approved'});Admin.loadMonetize();T('Monetization approved! 💰','success');},
  rejectM:  async function(uid){await DB.uu(uid,{monetizeStatus:'Rejected'});Admin.loadMonetize();T('Rejected','info');},
  revokeM:  async function(uid){if(!confirm('Revoke monetization?'))return;await DB.uu(uid,{monetized:false,monetizeStatus:null});Admin.loadMonetize();T('Revoked','warning');},
  sendPushAll: async function(){
    var title=(document.getElementById('pushTitle')||{}).value||'';var body=(document.getElementById('pushBody')||{}).value||'';
    if(!title||!body)return T('Title and message required','warning');
    L.show('Sending...');
    try{await DB.w('broadcasts/push_'+Date.now(),{title:title,body:body,sentAt:new Date().toISOString(),target:'all'});L.off();var el=document.getElementById('pushSentMsg');if(el){el.textContent='✅ Broadcast sent!';setTimeout(function(){el.textContent='';},4000);}T('Push sent! 📢','success');}
    catch(e){L.off();T('Failed to send','error');}
  },
  sendPushTest: function(){
    var title=(document.getElementById('pushTitle')||{}).value||'Test';var body=(document.getElementById('pushBody')||{}).value||'Test notification.';
    try{if(typeof Notification!=='undefined'&&Notification.permission==='granted'){new Notification(title,{body:body});T('Test sent! 🔔','success');}else{T('Enable notifications first','info');}}catch(e){T('Push not supported on this device','info');}
  },
  _loadConfig: function(){
    var set=function(id,v){var e=document.getElementById(id);if(e)e.value=v;};
    var chk=function(id,v){var e=document.getElementById(id);if(e)e.checked=v;};
    set('cfCooldown',_cfg.gameCooldown||24);set('cfSpin',_cfg.spinCost||50);set('cfScratch',_cfg.scratchCost||20);set('cfSlot',_cfg.slotCost||100);
    set('cfMinWD',_cfg.minWithdraw||500);set('cfRate',_cfg.coinToBDT||0.05);set('cfRefBonus',_cfg.referralBonus||1000);set('cfRefReq',_cfg.referralTasksReq||3);
    set('cfHomeAd',_cfg.adCode||'');chk('cfMaint',!!_cfg.maintenanceMode);
    set('viewRate',_cfg.viewCoinRate||5);set('viewerRate',_cfg.viewerCoinRate||1);set('uploadBonus',_cfg.uploadBonus||50);set('monCoins',_cfg.monetizationCoins||10000000);
    chk('adEnabled',!!_cfg.videoAdEnabled);set('adSkip',_cfg.adSkipTime||5);set('adFreq',_cfg.adFrequency||1);set('adCode',_cfg.videoAdCode||'');
  },
  saveConfig: async function(){
    var g=function(id,def){var e=document.getElementById(id);return e?(parseFloat(e.value)||def):def;};
    var chk=function(id){var e=document.getElementById(id);return e?e.checked:false;};
    var upd={gameCooldown:g('cfCooldown',24),spinCost:g('cfSpin',50),scratchCost:g('cfScratch',20),slotCost:g('cfSlot',100),minWithdraw:g('cfMinWD',500),coinToBDT:g('cfRate',0.05),referralBonus:g('cfRefBonus',1000),referralTasksReq:g('cfRefReq',3),maintenanceMode:chk('cfMaint'),adCode:(document.getElementById('cfHomeAd')||{}).value||''};
    L.show('Saving...'); try{await DB.u('config',upd);Object.assign(_cfg,upd);L.off();T('Config saved! ✅','success');}catch(e){L.off();T('Save failed','error');}
  },
  saveVideoCoinCfg: async function(){
    var g=function(id,def){var e=document.getElementById(id);return e?(parseFloat(e.value)||def):def;};
    var upd={viewCoinRate:g('viewRate',5),viewerCoinRate:g('viewerRate',1),uploadBonus:g('uploadBonus',50),monetizationCoins:g('monCoins',10000000)};
    L.show('Saving...'); try{await DB.u('config',upd);Object.assign(_cfg,upd);L.off();T('Coin settings saved! ✅','success');}catch(e){L.off();T('Save failed','error');}
  },
  saveAds: async function(){
    var g=function(id,def){var e=document.getElementById(id);return e?(parseFloat(e.value)||def):def;};
    var upd={videoAdEnabled:(document.getElementById('adEnabled')||{}).checked||false,videoAdCode:(document.getElementById('adCode')||{}).value||'',adSkipTime:g('adSkip',5),adFrequency:g('adFreq',1),adType:_selAdType||'preroll'};
    L.show('Saving...'); try{await DB.u('config',upd);Object.assign(_cfg,upd);L.off();T('Ad settings saved! ✅','success');}catch(e){L.off();T('Save failed','error');}
  },
  setAdType: function(type,btn){_selAdType=type;document.querySelectorAll('.atype-btn').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');},
  export: async function(){
    try{
      var users=await DB.users();
      var csv=['Username,DisplayName,Mobile,Coins,BDT,USD,Tasks,Views,Monetized,Banned,Joined'];
      users.forEach(function(u){csv.push([u.username,u.displayName||u.username,u.mobile||'',u.coins||0,(u.balance||0).toFixed(2),(u.balanceUSD||0).toFixed(4),u.tasksCompleted||0,u.totalVideoViews||0,u.monetized?'Yes':'No',u.isBanned?'Yes':'No',new Date(u.joinedAt||0).toLocaleDateString()].join(','));});
      var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv.join('\n'));a.download='taskmint_users_'+new Date().toISOString().slice(0,10)+'.csv';a.click();T('Exported!','success');
    }catch(e){T('Export failed','error');}
  },
  reset: async function(){if(!confirm('DELETE ALL DATA?'))return;if(prompt('Type RESET:')!=='RESET')return;await Promise.all([DB.w('users',null),DB.w('withdrawals',null),DB.w('videos',null),DB.w('tasks',null),DB.w('comments',null)]);T('All data cleared!','info');setTimeout(function(){location.reload();},2000);}
};

/* ================================================================
   LEADERBOARD
   ================================================================ */
var LbSys = {
  load: async function(type,btn){
    document.querySelectorAll('.lb-tab').forEach(function(b){b.classList.remove('active');});
    if(btn)btn.classList.add('active');
    var list=document.getElementById('lbList'),myCard=document.getElementById('myRankCard');
    if(!list)return;
    list.innerHTML='<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--primary)"></i></div>';
    try{
      var users=await DB.users(); var me=S.me();
      var key=type==='earners'?'totalEarned':type==='creators'?'totalVideoViews':type==='referrals'?'_refCnt':'coins';
      users.forEach(function(u){u._refCnt=(u.lockedRewards||[]).filter(function(r){return r.unlocked;}).length;});
      users.sort(function(a,b){return(b[key]||0)-(a[key]||0);});
      var top=users.slice(0,50);
      list.innerHTML='';
      top.forEach(function(u,i){
        var rank=i+1,medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
        var val=key==='totalEarned'?'৳'+(u.totalEarned||0).toFixed(0):key==='totalVideoViews'?(u.totalVideoViews||0).toLocaleString()+' views':key==='_refCnt'?(u._refCnt||0)+' refs':(u.coins||0).toLocaleString()+' coins';
        var isMe=me&&u.id===me.id;
        var d=document.createElement('div');d.className='lb-item'+(isMe?' me':'');
        d.innerHTML='<div class="lb-rank">'+(medal||'#'+rank)+'</div><img src="'+(u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="lb-av" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'"><div class="lb-info"><div class="lb-name">'+(u.displayName||u.username)+(u.monetized?'<span class="vc">✓</span>':'')+'</div><div class="lb-val">'+val+'</div></div>'+(isMe?'<span class="lb-you">You</span>':'');
        list.appendChild(d);
      });
      if(me&&myCard){var myIdx=users.findIndex(function(u){return u.id===me.id;});if(myIdx>=0){myCard.classList.remove('hidden');myCard.innerHTML='<div class="mrc-rank">#'+(myIdx+1)+'</div><img src="'+(_me&&_me.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="lb-av"><div class="lb-info"><div class="lb-name">You</div><div class="lb-val">'+(_me?(_me.coins||0).toLocaleString():'')+' coins</div></div>';}}
    }catch(e){if(list)list.innerHTML='<p style="color:#888;text-align:center;padding:20px">Could not load leaderboard</p>';}
  }
};

/* ================================================================
   STREAK SYSTEM
   ================================================================ */
var StreakSys = {
  checkAndShow: async function(){
    var u=S.me();if(!u)return;
    try{
      var ud=await DB.getUser(u.id);if(!ud)return;
      var today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();
      var streak=ud.loginStreak||0,last=ud.lastLoginDate||'';
      if(last!==today){
        streak=last===yesterday?Math.min(streak+1,30):1;
        await DB.uu(u.id,{lastLoginDate:today,loginStreak:streak});
        _me=Object.assign({},_me,{lastLoginDate:today,loginStreak:streak});S.set(_me);
        if(ud.streakClaimedDate!==today){
          var banner=document.getElementById('streakBanner');
          if(banner){banner.classList.remove('hidden');var sd=banner.querySelector('#streakDay');if(sd)sd.textContent='Day '+streak;var sr=banner.querySelector('#streakReward');if(sr)sr.textContent='+'+(_cfg.dailyLoginBonus||80)+' coins';}
        }
      }
    }catch(e){}
  },
  claim: async function(){
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id);if(!ud)return;
    var today=new Date().toDateString();
    if(ud.streakClaimedDate===today)return T('Already claimed today!','info');
    var reward=_cfg.dailyLoginBonus||80;
    L.show('Claiming daily reward...');
    await DB.uu(u.id,{coins:(ud.coins||0)+reward,streakClaimedDate:today});
    _me=Object.assign({},_me,{coins:(_me.coins||0)+reward,streakClaimedDate:today});S.set(_me);
    L.off(); var banner=document.getElementById('streakBanner');if(banner)banner.classList.add('hidden');
    T('🔥 Daily Login Bonus! +'+reward+' coins!','success'); UI.sync();
    StreakSys.showModal();
  },
  showModal: function(){
    var modal=document.getElementById('streakModal');if(!modal)return;
    modal.classList.remove('hidden');
    var u=S.me();if(!u)return;
    DB.getUser(u.id).then(function(ud){
      if(!ud)return;
      var streak=ud.loginStreak||0,grid=document.getElementById('streakDayGrid');
      if(grid){grid.innerHTML='';for(var i=1;i<=10;i++){var done=i<streak||(i===streak&&ud.streakClaimedDate===new Date().toDateString()),active=i===streak&&ud.streakClaimedDate!==new Date().toDateString();var d=document.createElement('div');d.className='streak-day'+(done?' done':'')+(active?' active':'');d.innerHTML='<div class="sd-num">Day '+i+'</div><div class="sd-coin">🪙</div><div class="sd-reward">+'+(_cfg.dailyLoginBonus||80)+'</div>';grid.appendChild(d);}}
      var ri=document.getElementById('streakRewardInfo');if(ri){var claimed=ud.streakClaimedDate===new Date().toDateString();ri.innerHTML=claimed?'<span style="color:#34d399">✅ Claimed today! Come back tomorrow.</span>':'<span style="color:#fbbf24">🎁 Today\'s reward: <b>+'+(_cfg.dailyLoginBonus||80)+' coins</b></span>';}
    }).catch(function(){});
  },
  close: function(){var m=document.getElementById('streakModal');if(m)m.classList.add('hidden');}
};

/* ================================================================
   LEVEL SYSTEM
   ================================================================ */
var LvSys = {
  LEVELS:[{n:1,xp:0,title:'Newcomer',icon:'🌱'},{n:2,xp:500,title:'Explorer',icon:'🔍'},{n:3,xp:1500,title:'Earner',icon:'💰'},{n:4,xp:3000,title:'Creator',icon:'🎬'},{n:5,xp:6000,title:'Pro',icon:'⭐'},{n:6,xp:12000,title:'Elite',icon:'💎'},{n:7,xp:25000,title:'Legend',icon:'👑'},{n:8,xp:50000,title:'Master',icon:'🏆'},{n:9,xp:100000,title:'Champion',icon:'🌟'},{n:10,xp:200000,title:'God',icon:'🔱'}],
  getXP: function(ud){return(ud.coins||0)+(ud.tasksCompleted||0)*100+(ud.totalVideoViews||0)*10;},
  getLevel: function(xp){var lvs=LvSys.LEVELS;for(var i=lvs.length-1;i>=0;i--){if(xp>=lvs[i].xp)return lvs[i];}return lvs[0];},
  getNext:  function(xp){var lvs=LvSys.LEVELS;for(var i=0;i<lvs.length;i++){if(xp<lvs[i].xp)return lvs[i];}return null;},
  render: function(ud){
    var xp=LvSys.getXP(ud),lv=LvSys.getLevel(xp),next=LvSys.getNext(xp);
    var pct=next?Math.round((xp-lv.xp)/(next.xp-lv.xp)*100):100;
    var badge=document.getElementById('lvBadge');if(badge)badge.textContent=lv.icon+' Lv.'+lv.n;
    var fill=document.getElementById('lvXPFill');if(fill)fill.style.width=pct+'%';
    var title=document.getElementById('lvTitle');if(title)title.textContent=lv.title;
    var lvEl=document.getElementById('psLevel');if(lvEl)lvEl.textContent='Lv'+lv.n+' '+lv.icon;
  }
};
var LevelSys=LvSys; /* alias */

/* ================================================================
   ACHIEVEMENTS
   ================================================================ */
var AchSys = {
  LIST:[
    {id:'first_task',icon:'📋',title:'First Task',desc:'Complete your first task',xp:100,check:function(ud,e){return e.type==='task'&&(ud.tasksCompleted||0)>=1;}},
    {id:'tasks_10',icon:'⚔️',title:'Task Warrior',desc:'Complete 10 tasks',xp:300,check:function(ud,e){return e.type==='task'&&(ud.tasksCompleted||0)>=10;}},
    {id:'tasks_50',icon:'🏅',title:'Task Master',desc:'Complete 50 tasks',xp:1000,check:function(ud,e){return e.type==='task'&&(ud.tasksCompleted||0)>=50;}},
    {id:'first_upload',icon:'🎬',title:'First Upload',desc:'Upload your first video',xp:200,check:function(ud,e){return e.type==='upload';}},
    {id:'views_100',icon:'👁️',title:'Popular Creator',desc:'Get 100 views',xp:500,check:function(ud){return(ud.totalVideoViews||0)>=100;}},
    {id:'coins_1000',icon:'🪙',title:'Coin Collector',desc:'Earn 1,000 coins',xp:200,check:function(ud){return(ud.coins||0)>=1000;}},
    {id:'coins_10000',icon:'💰',title:'Coin Hoarder',desc:'Earn 10,000 coins',xp:500,check:function(ud){return(ud.coins||0)>=10000;}},
    {id:'streak_7',icon:'🔥',title:'Week Warrior',desc:'7-day login streak',xp:400,check:function(ud,e){return e.type==='streak'&&(e.val||0)>=7;}},
    {id:'referral_1',icon:'🤝',title:'Connector',desc:'Refer 1 friend',xp:300,check:function(ud){return(ud.lockedRewards||[]).length>=1;}},
    {id:'subscriber',icon:'🔔',title:'First Subscriber',desc:'Get subscribed',xp:300,check:function(ud,e){return e.type==='sub';}},
    {id:'monetized',icon:'💎',title:'Monetized!',desc:'Get monetization approved',xp:5000,check:function(ud){return ud.monetized===true;}}
  ],
  check: async function(type,val){
    var u=S.me();if(!u)return;
    try{
      var ud=await DB.getUser(u.id);if(!ud)return;
      var earned=ud.achievements||[],extra={type:type,val:val},newOnes=[];
      AchSys.LIST.forEach(function(a){if(earned.includes(a.id))return;if(a.check(ud,extra))newOnes.push(a);});
      if(!newOnes.length)return;
      var xpGain=newOnes.reduce(function(s,a){return s+a.xp;},0);
      await DB.uu(u.id,{achievements:earned.concat(newOnes.map(function(a){return a.id;})),coins:(ud.coins||0)+xpGain});
      _me=Object.assign({},_me,{coins:(_me.coins||0)+xpGain});S.set(_me);
      newOnes.forEach(function(a){AchSys._toast(a);});UI.sync();
    }catch(e){}
  },
  _toast: function(a){
    var t=document.createElement('div');t.style.cssText='position:fixed;bottom:90px;right:-280px;background:linear-gradient(135deg,#1a0035,#250050);border:1px solid rgba(124,58,237,.5);border-radius:14px;padding:12px 16px;display:flex;align-items:center;gap:10px;z-index:9998;transition:right .4s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:220px;pointer-events:none';
    t.innerHTML='<span style="font-size:1.6rem">'+a.icon+'</span><div><div style="font-weight:700;color:white;font-size:.88rem">Achievement Unlocked!</div><div style="color:#c4b5fd;font-size:.82rem">'+a.title+'</div><div style="color:#888;font-size:.72rem">+'+a.xp+' XP</div></div>';
    document.body.appendChild(t);
    setTimeout(function(){t.style.right='14px';},50);
    setTimeout(function(){t.style.right='-280px';},3500);
    setTimeout(function(){t.remove();},4000);
  },
  renderRow: async function(){
    var row=document.getElementById('achieveRow');if(!row)return;
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return null;}); var earned=(ud&&ud.achievements)||[];
    row.innerHTML='';
    AchSys.LIST.slice(0,8).forEach(function(a){var done=earned.includes(a.id);var d=document.createElement('div');d.className='achieve-chip'+(done?' done':'');d.textContent=a.icon;d.title=a.title+'\n'+a.desc;row.appendChild(d);});
  },
  showAll: async function(){
    var modal=document.getElementById('achieveModal');if(!modal)return;
    modal.classList.remove('hidden');
    var list=document.getElementById('allAchievements');if(!list)return;
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return null;}); var earned=(ud&&ud.achievements)||[];
    list.innerHTML='';
    AchSys.LIST.forEach(function(a){var done=earned.includes(a.id);var d=document.createElement('div');d.className='ach-item'+(done?' done':'');d.innerHTML='<span class="ach-icon">'+a.icon+'</span><div class="ach-info"><b>'+a.title+'</b><small>'+a.desc+'</small></div><span class="ach-xp'+(done?' earned':'')+'">+'+(done?'✓ ':''+a.xp)+' XP</span>';list.appendChild(d);});
  }
};
var AchieveSys=AchSys; /* alias */

/* ================================================================
   MISSIONS
   ================================================================ */
var MissionSys = {
  DAILY:[
    {id:'watch3',icon:'▶️',title:'Watch 3 Videos',target:3,reward:50,type:'watch'},
    {id:'task2', icon:'✅',title:'Complete 2 Tasks',target:2,reward:80,type:'task'},
    {id:'login', icon:'🌞',title:'Daily Login',target:1,reward:30,type:'login'},
    {id:'comment1',icon:'💬',title:'Post a Comment',target:1,reward:40,type:'comment'},
    {id:'share1',icon:'🔗',title:'Share a Video',target:1,reward:60,type:'share'}
  ],
  render: async function(){
    var list=document.getElementById('missionList');if(!list)return;
    var u=S.me();if(!u)return;
    try{
      var ud=await DB.getUser(u.id);if(!ud)return;
      var today=new Date().toDateString(),mp=ud.missionProgress||{};
      if(mp.date!==today)mp={date:today,tasks:{},done:[]};
      list.innerHTML='';
      MissionSys.DAILY.forEach(function(m){
        var prog=(mp.tasks&&mp.tasks[m.id])||0,done=(mp.done||[]).includes(m.id);
        var pct=Math.min(100,Math.round(prog/m.target*100));
        var d=document.createElement('div');d.className='mission-item'+(done?' done':'');
        d.innerHTML='<span class="mi-icon">'+m.icon+'</span><div class="mi-body"><div class="mi-title">'+m.title+'</div><div class="mi-bar"><div style="width:'+pct+'%"></div></div><div class="mi-stat">'+prog+'/'+m.target+' · +'+m.reward+' coins</div></div>'+(done?'<span class="mi-check">✅</span>':'<span class="mi-pct">'+pct+'%</span>');
        list.appendChild(d);
      });
    }catch(e){}
  },
  progress: async function(type,amount){
    var u=S.me();if(!u)return;
    try{
      var ud=await DB.getUser(u.id);if(!ud)return;
      var today=new Date().toDateString(),mp=ud.missionProgress||{};
      if(mp.date!==today)mp={date:today,tasks:{},done:[]};
      var changed=false,coins=0;
      MissionSys.DAILY.forEach(function(m){
        if(m.type!==type)return;if((mp.done||[]).includes(m.id))return;
        mp.tasks=mp.tasks||{};mp.tasks[m.id]=(mp.tasks[m.id]||0)+(amount||1);
        if(mp.tasks[m.id]>=m.target){mp.done=mp.done||[];if(!mp.done.includes(m.id)){mp.done.push(m.id);coins+=m.reward;T('🎯 Mission: '+m.title+' +'+m.reward+' coins!','success');}}
        changed=true;
      });
      if(!changed&&!coins)return;
      var upd={missionProgress:mp};if(coins>0){upd.coins=(ud.coins||0)+coins;_me=Object.assign({},_me,{coins:(_me.coins||0)+coins});S.set(_me);UI.sync();}
      await DB.uu(u.id,upd); MissionSys.render();
    }catch(e){}
  }
};

/* ================================================================
   DAILY WHEEL
   ================================================================ */
var WheelSys = {
  PRIZES:[{label:'50',coins:50,color:'#7c3aed'},{label:'20',coins:20,color:'#2563eb'},{label:'100',coins:100,color:'#059669'},{label:'10',coins:10,color:'#d97706'},{label:'200',coins:200,color:'#dc2626'},{label:'30',coins:30,color:'#7c3aed'},{label:'500',coins:500,color:'#0891b2'},{label:'5',coins:5,color:'#9333ea'}],
  init: function(ud){
    var btn=document.getElementById('dailySpinBtn'),cd=document.getElementById('dailyWheelCd');
    var canSpin=ud.dailyWheelDate!==new Date().toDateString();
    if(btn){btn.disabled=!canSpin;btn.textContent=canSpin?'🎡 FREE Spin!':'Spun Today ✓';}
    if(cd)cd.textContent=canSpin?'':'Come back tomorrow!';
  },
  draw: function(){
    var canvas=document.getElementById('dailyWheelEl');if(!canvas||!canvas.getContext)return;
    var ctx=canvas.getContext('2d'),prizes=WheelSys.PRIZES,n=prizes.length,arc=(2*Math.PI)/n,r=canvas.width/2;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    prizes.forEach(function(p,i){var start=i*arc-Math.PI/2;ctx.beginPath();ctx.moveTo(r,r);ctx.arc(r,r,r-2,start,start+arc);ctx.closePath();ctx.fillStyle=p.color;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.stroke();ctx.save();ctx.translate(r,r);ctx.rotate(start+arc/2);ctx.textAlign='right';ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText(p.label,r-12,5);ctx.restore();});
    ctx.beginPath();ctx.arc(r,r,18,0,2*Math.PI);ctx.fillStyle='#0a0014';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.stroke();
  },
  spin: async function(){
    var u=S.me();if(!u)return;
    var ud=await DB.getUser(u.id).catch(function(){return null;});if(!ud)return;
    if(ud.dailyWheelDate===new Date().toDateString())return T('Already spun today! Come back tomorrow 🌅','info');
    var idx=Math.floor(Math.random()*WheelSys.PRIZES.length),prize=WheelSys.PRIZES[idx];
    var deg=360-(idx*(360/WheelSys.PRIZES.length))-(360/(WheelSys.PRIZES.length*2));
    var wheel=document.getElementById('dailyWheelEl'),btn=document.getElementById('dailySpinBtn');
    if(wheel){wheel.style.transition='transform 4s cubic-bezier(.17,.67,.12,.99)';wheel.style.transform='rotate('+(1440+deg)+'deg)';}
    if(btn)btn.disabled=true;
    setTimeout(async function(){
      await DB.uu(u.id,{coins:(ud.coins||0)+prize.coins,dailyWheelDate:new Date().toDateString()});
      _me=Object.assign({},_me,{coins:(_me.coins||0)+prize.coins,dailyWheelDate:new Date().toDateString()});S.set(_me);
      UI.sync(); T('🎡 Daily Wheel: +'+prize.coins+' coins!','success');
      var cd=document.getElementById('dailyWheelCd');if(cd)cd.textContent='Come back tomorrow!';
      if(btn)btn.textContent='Spun Today ✓';
    },4200);
  }
};

/* ================================================================
   NOTIFICATIONS
   ================================================================ */
var NotifSys = {
  toggle: async function(){
    var panel=document.getElementById('notifPanel'),bg=document.getElementById('notifBg');if(!panel)return;
    var isOpen=panel.classList.contains('open');
    if(isOpen){panel.classList.remove('open');if(bg)bg.classList.add('hidden');}
    else{panel.classList.add('open');if(bg)bg.classList.remove('hidden');NotifSys.load();NotifSys.markRead();}
  },
  load: async function(){
    var list=document.getElementById('notifList');if(!list)return;
    var u=S.me();if(!u)return;
    try{
      var ud=await DB.getUser(u.id); var notifs=(ud&&ud.notifications)||[];
      if(!notifs.length){list.innerHTML='<p style="text-align:center;color:#555;padding:30px;font-size:.9rem">No notifications yet.<br><small style="color:#444">Complete tasks and watch videos!</small></p>';return;}
      list.innerHTML='';
      var icons={view:'👁️',like:'❤️',comment:'💬',sub:'🔔',superchat:'⭐',withdraw:'💸',task:'✅',coins:'🪙',streak:'🔥'};
      notifs.slice(0,50).forEach(function(n){if(typeof n==='string')return;var d=document.createElement('div');d.className='notif-item'+(n.unread?' unread':'');d.innerHTML='<span class="notif-ic">'+(icons[n.type]||'📣')+'</span><div class="notif-body"><div class="notif-txt">'+n.text+'</div><div class="notif-time">'+timeAgo(n.time)+'</div></div>'+(n.thumb?'<img src="'+n.thumb+'" class="notif-th">':'');list.appendChild(d);});
    }catch(e){}
  },
  markRead: async function(){
    var u=S.me();if(!u)return;
    try{var ud=await DB.getUser(u.id);if(!ud)return;var notifs=(ud.notifications||[]).map(function(n){return typeof n==='string'?n:Object.assign({},n,{unread:false});});await DB.uu(u.id,{notifications:notifs});NotifSys.updateDot(0);}catch(e){}
  },
  updateDot: function(count){var dot=document.getElementById('notifDot');if(!dot)return;dot.classList.toggle('hidden',count===0);if(count>0)dot.textContent=count>9?'9+':count;},
  checkUnread: async function(){var u=S.me();if(!u)return;if(!_db)return;try{var ud=await DB.getUser(u.id);if(!ud)return;NotifSys.updateDot((ud.notifications||[]).filter(function(n){return n&&n.unread;}).length);}catch(e){}},
  markAllRead: function(){ NotifSys.markRead(); }
};

/* ================================================================
   THEME SYSTEM
   ================================================================ */
var ThemeSys = {
  THEMES:{
    dark:  {'--bg':'#0a0014','--bg2':'#120022','--bg3':'#1a0030','--primary':'#7c3aed','--primary-light':'rgba(124,58,237,.15)','--text':'#ffffff','--text2':'#aaaaaa','--gold':'#fbbf24','--green':'#34d399','--border':'rgba(255,255,255,.08)','--card':'rgba(255,255,255,.04)'},
    purple:{'--bg':'#0d0018','--bg2':'#1a0035','--bg3':'#250050','--primary':'#8b5cf6','--primary-light':'rgba(139,92,246,.15)','--text':'#ffffff','--text2':'#c4b5fd','--gold':'#fcd34d','--green':'#6ee7b7','--border':'rgba(200,150,255,.15)','--card':'rgba(255,255,255,.05)'},
    ocean: {'--bg':'#000d1a','--bg2':'#001933','--bg3':'#00264d','--primary':'#0ea5e9','--primary-light':'rgba(14,165,233,.15)','--text':'#ffffff','--text2':'#93c5fd','--gold':'#fbbf24','--green':'#34d399','--border':'rgba(0,200,255,.15)','--card':'rgba(0,150,255,.06)'},
    amoled:{'--bg':'#000000','--bg2':'#0a0a0a','--bg3':'#111111','--primary':'#7c3aed','--primary-light':'rgba(124,58,237,.15)','--text':'#ffffff','--text2':'#888888','--gold':'#fbbf24','--green':'#34d399','--border':'rgba(255,255,255,.06)','--card':'rgba(255,255,255,.03)'}
  },
  apply: function(name){
    var t=ThemeSys.THEMES[name];if(!t)return;
    var root=document.documentElement;Object.keys(t).forEach(function(k){root.style.setProperty(k,t[k]);});
    localStorage.setItem('tm_theme',name);
    document.querySelectorAll('.theme-btn').forEach(function(b){b.classList.remove('active');});
    var btn=document.getElementById('theme-'+name);if(btn)btn.classList.add('active');
  },
  init: function(){ThemeSys.apply(localStorage.getItem('tm_theme')||'dark');}
};

/* ================================================================
   PWA SYSTEM
   ================================================================ */
var PWA = {
  _prompt:null, _sw:null, _installed:false, _notifOk:false,
  init: function(){
    try{PWA._checkInstalled();PWA._registerSW();PWA._listenInstall();PWA._listenOnline();PWA._checkNotif();}catch(e){}
    setTimeout(function(){try{if(!PWA._installed&&PWA._prompt){var b=document.getElementById('pwaInstallBanner');if(b)b.style.display='block';}}catch(e){}},3000);
    setTimeout(function(){try{if(typeof Notification!=='undefined'&&Notification.permission==='default'){var np=document.getElementById('notifPrompt');if(np)np.style.display='block';}}catch(e){}},8000);
  },
  _checkInstalled: function(){try{if(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches){PWA._installed=true;}}catch(e){}},
  _registerSW: function(){try{if(!('serviceWorker' in navigator))return;navigator.serviceWorker.register('/sw.js').then(function(r){PWA._sw=r;}).catch(function(){});}catch(e){}},
  _listenInstall: function(){try{window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();PWA._prompt=e;});window.addEventListener('appinstalled',function(){PWA._installed=true;PWA.dismissBanner();T('TaskMint Pro installed! ✅','success');});}catch(e){}},
  _listenOnline: function(){try{window.addEventListener('offline',function(){T('You are offline. Showing cached data.','warning');});window.addEventListener('online',function(){T('Back online! ✅','success');});}catch(e){}},
  _checkNotif: function(){try{if(typeof Notification!=='undefined'&&Notification.permission==='granted')PWA._notifOk=true;}catch(e){}},
  install: function(){
    try{if(!PWA._prompt){T('Try Settings > Add to Home Screen','info');return;}PWA._prompt.prompt();PWA._prompt.userChoice.then(function(c){if(c.outcome==='accepted')T('Installing...','success');PWA._prompt=null;PWA.dismissBanner();});} catch(e){}
  },
  dismissBanner: function(){var b=document.getElementById('pwaInstallBanner');if(b)b.style.display='none';},
  requestNotifPermission: async function(){
    var np=document.getElementById('notifPrompt');
    try{
      if(typeof Notification==='undefined'){T('Notifications not supported on this device','warning');if(np)np.style.display='none';return;}
      var perm=await Notification.requestPermission();
      if(perm==='granted'){PWA._notifOk=true;if(np)np.style.display='none';T('Notifications enabled! 🔔','success');setTimeout(function(){PWA.sendLocalNotif('Welcome! 🎉','TaskMint Pro notifications are now active.');},1500);}
      else{T('Please allow notifications from browser settings','warning');if(np)np.style.display='none';}
    }catch(e){if(np)np.style.display='none';}
  },
  sendLocalNotif: function(title,body){
    try{if(typeof Notification==='undefined'||Notification.permission!=='granted')return;var opts={body:body,icon:'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',badge:'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',vibrate:[100,50,100]};if(PWA._sw)PWA._sw.showNotification(title,opts);else new Notification(title,opts);}catch(e){}
  }
};

/* ================================================================
   MISC HELPERS
   ================================================================ */
function togglePass(inputId,iconEl){
  var inp=document.getElementById(inputId);if(!inp)return;
  var isPass=inp.type==='password';inp.type=isPass?'text':'password';
  if(iconEl)iconEl.className=isPass?'fas fa-eye-slash':'fas fa-eye';
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded',function(){
  ThemeSys.init();
  Router.init();
  setTimeout(function(){ try{PWA.init();}catch(e){} },1000);
});

/* ================================================================
   ADDITIONAL METHODS — called from HTML
   ================================================================ */

/* Admin.filterWD alias */
Admin.filterWD = Admin.loadWDs;
Admin.searchUsers = function(q){ clearTimeout(Admin._sT); Admin._sT=setTimeout(function(){Admin.loadUsers(q||'');},300); };

/* Auth.showAdminPin */
Auth.showAdminPin = function() {
  var box = document.getElementById('adminPinBox');
  if (box) {
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
      var inp = document.getElementById('adminPin');
      if (inp) inp.focus();
    }
  }
};

/* LbSys.period — filter by time (all/week/month) */
LbSys.period = function(p, btn) {
  document.querySelectorAll('.lb-period-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  /* For now reload — future: filter by joinedAt/period */
  LbSys.load('coins');
};

/* VidSys.toggleSearch */
VidSys.toggleSearch = function() {
  var sb = document.getElementById('vidSearchBar');
  if (!sb) return;
  var hidden = sb.classList.toggle('hidden');
  if (!hidden) { var inp = document.getElementById('searchInp'); if (inp) inp.focus(); }
  else VidSys.clearSearch();
};

/* VidSys.shareTo — platform-specific sharing */
VidSys.shareTo = function(platform) {
  var v = VidSys._vid;
  var url = v ? (window.location.href.split('?')[0] + '?v=' + v.id) : window.location.href;
  var title = v ? v.title : 'TaskMint Pro';
  var text = 'Watch "' + title + '" on TaskMint Pro! ' + url;
  var map = {
    whatsapp: 'https://wa.me/?text=' + encodeURIComponent(text),
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
    twitter:  'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text),
    telegram: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
    sms:      'sms:?body=' + encodeURIComponent(text)
  };
  var sheet = document.getElementById('shareSheet');
  if (platform === 'copy') { safeCopy(url); if (sheet) sheet.classList.add('hidden'); return; }
  if (platform === 'embed') { safeCopy('<iframe src="' + url + '" width="560" height="315" frameborder="0" allowfullscreen></iframe>'); if (sheet) sheet.classList.add('hidden'); return; }
  if (platform === 'native') { safeShare(title, text, url); if (sheet) sheet.classList.add('hidden'); return; }
  if (map[platform]) { try { window.open(map[platform], '_blank'); } catch(e) {} if (sheet) sheet.classList.add('hidden'); }
};

/* VidSys.submitReport */
VidSys.submitReport = async function(reason) {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  try {
    await DB.w('reports/rp_' + Date.now(), { videoId:v.id, videoTitle:v.title, reportedBy:u.id, reason:reason, createdAt:new Date().toISOString() });
  } catch(e) {}
  var modal = document.getElementById('reportModal'); if (modal) modal.classList.add('hidden');
  T('Report submitted. Thank you! 🙏', 'success');
};

/* VidSys.react — emoji reactions */
VidSys.react = async function(emoji) {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  try {
    var path = 'reactions/' + v.id + '/' + emoji;
    var data = await DB.r(path); var users = (data && data.users) ? data.users : [];
    var idx = users.indexOf(u.id);
    if (idx !== -1) users.splice(idx, 1); else users.push(u.id);
    await DB.w(path, { count: users.length, users: users });
    var rc = document.getElementById('rc-' + emoji); if (rc) rc.textContent = users.length;
    var rb = document.getElementById('rr-' + emoji); if (rb) { if (idx === -1) rb.classList.add('active'); else rb.classList.remove('active'); }
  } catch(e) {}
};

/* VidSys.scSelect — super chat amount */
VidSys._scAmt = 20;
VidSys.scSelect = function(btn, amt) {
  document.querySelectorAll('.sc-amt-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  VidSys._scAmt = amt;
};

/* VidSys.sendSuperChat */
VidSys.sendSuperChat = async function() {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  var msg = document.getElementById('scMessage');
  if (!msg || !msg.value.trim()) return T('Write a message first', 'warning');
  var amt = VidSys._scAmt || 20;
  var ud = await DB.getUser(u.id);
  if ((ud.coins || 0) < amt) return T('Not enough coins!', 'error');
  L.show('Sending Super Chat...');
  try {
    var sc = { id:'sc_'+Date.now(), userId:u.id, username:u.displayName||u.username, avatar:u.avatar||'', message:msg.value.trim(), amount:amt, createdAt:new Date().toISOString() };
    await DB.w('superchats/'+v.id+'/'+sc.id, sc);
    await DB.uu(u.id, { coins:(ud.coins||0)-amt });
    _me = Object.assign({}, _me, { coins:(_me.coins||0)-amt }); S.set(_me);
    if (v.uploaderId && v.uploaderId !== u.id) {
      var up = await DB.getUser(v.uploaderId);
      if (up) { var earn = Math.floor(amt * 0.8); await DB.uu(v.uploaderId, { coins:(up.coins||0)+earn }); }
    }
    L.off(); var modal = document.getElementById('superChatModal'); if (modal) modal.classList.add('hidden');
    if (msg) msg.value = ''; UI.sync();
    T('Super Chat sent! ⭐ Creator gets ' + Math.floor(amt*0.8) + ' coins!', 'success');
  } catch(e) { L.off(); T('Failed. Try again.', 'error'); }
};
