'use strict';

/* ===== SAFE API HELPERS (SPCK/WebView compatible) ===== */
function safeCopy(text) {
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ T('Copied!','success'); }).catch(function(){_fallbackCopy(text);});
    } else { _fallbackCopy(text); }
  } catch(e) { _fallbackCopy(text); }
}
function _fallbackCopy(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    T('Copied!','success');
  } catch(e) { T('Copy failed','error'); }
}
function safeShare(title, text, url) {
  try {
    if (navigator && navigator.share) {
      navigator.share({title:title, text:text, url:url}).catch(function(){safeCopy(url);});
    } else { safeCopy(url); }
  } catch(e) { safeCopy(url); }
}
/* ============================================================
   TASKMINT PRO v10 — YouTube Advanced + Super Ad System
   ============================================================ */
var SK='taskmint_session', AP='admin123';
var FC={apiKey:"AIzaSyDZSJfWPLRjxlfceUiUHQQ0JonunLVe2_c",authDomain:"taskmint-pro.firebaseapp.com",databaseURL:"https://taskmint-pro-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"taskmint-pro",storageBucket:"taskmint-pro.firebasestorage.app",messagingSenderId:"381437349027",appId:"1:381437349027:web:8e6a98be52801423470316"};
var DC={referralBonus:1000,referralTasksReq:3,minWithdraw:500,maintenanceMode:false,adTimer:10,adCode:'',gameCooldown:24,spinCost:50,scratchCost:20,slotCost:100,withdrawMethods:['bKash','Bank Transfer (BDT)','Bank Transfer (USD)'],coinToBDT:0.05,coinToUSD:0.0005,videoAdEnabled:false,videoAdCode:'',adSkipTime:5,adFrequency:1,adUnskippable:false,adType:'preroll',adMidAt:30,viewCoinRate:5,viewerCoinRate:1,uploadBonus:50,monetizationCoins:10000000,dailyLoginBonus:80};
var _db=null,_cfg=Object.assign({},DC),_me=null,_allVids=[],_curCat='All',_srch='',_prevPage='home',_curPage='auth',_adPlays=0,_selectedAdType='preroll';

/* ===== DB ===== */
var DB={
  init:function(){return new Promise(function(ok,err){try{if(!firebase.apps.length)firebase.initializeApp(FC);_db=firebase.database();}catch(e){err(new Error('Firebase init failed: '+e.message));return;}var t=setTimeout(function(){err(new Error('Connection timeout'));},3000);_db.ref('config').get().then(function(s){clearTimeout(t);_cfg=s.exists()?Object.assign({},DC,s.val()):Object.assign({},DC);if(!s.exists())_db.ref('config').set(DC);ok();}).catch(function(e){clearTimeout(t);err(new Error('DB error: '+e.message));});});},
  r:function(p){return new Promise(function(res){if(!_db){res(null);return;}var t=setTimeout(function(){res(null);},3000);_db.ref(p).once('value',function(s){clearTimeout(t);res(s.exists()?s.val():null);},function(){clearTimeout(t);res(null);});});},
  w:function(p,d){if(!_db)return Promise.resolve();return _db.ref(p).set(d).catch(function(){});},
  u:function(p,d){if(!_db)return Promise.resolve();return _db.ref(p).update(d).catch(function(){});},
  del:function(p){if(!_db)return Promise.resolve();return _db.ref(p).remove().catch(function(){});},
  findUser:function(f,v){return new Promise(function(res){if(!_db){res(null);return;}var t=setTimeout(function(){res(null);},3000);_db.ref('users').once('value',function(s){clearTimeout(t);if(!s.exists()){res(null);return;}var d=s.val(),ks=Object.keys(d),found=null;for(var i=0;i<ks.length;i++){if(d[ks[i]][f]===v){found=Object.assign({},d[ks[i]],{id:ks[i]});break;}}res(found);},function(){clearTimeout(t);res(null);});});},
  getUser:function(id){if(!id)return Promise.resolve(null);return DB.r('users/'+id);},
  uu:function(id,d){if(!id)return Promise.resolve();return DB.u('users/'+id,d);},
  saveUser:function(u){var c=Object.assign({},u);delete c._fbKey;if(!_db)return Promise.resolve();return _db.ref('users/'+u.id).set(c);},
  users:function(){return DB.r('users').then(function(d){return d?Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}):[];});},
  vids:function(){return DB.r('videos').then(function(d){return d?Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});}):[];});},
  saveVid:function(v){if(!_db)return Promise.resolve();return _db.ref('videos/'+v.id).set(v);},
  delVid:function(id){return DB.del('videos/'+id);},
  tasks:function(){return DB.r('tasks').then(function(d){if(!d)return[];if(Array.isArray(d))return d;return Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});});});},
  wds:function(){return DB.r('withdrawals').then(function(d){return d?Object.keys(d).map(function(k){return Object.assign({},d[k],{_key:k});}):[];});},
  saveWD:function(w){if(!_db)return Promise.resolve();return _db.ref('withdrawals/w_'+w.id).set(w);},
  updWD:function(wId,ch){return DB.r('withdrawals').then(function(d){if(!d)return;var ks=Object.keys(d);for(var i=0;i<ks.length;i++){if(d[ks[i]].id===wId)return DB.u('withdrawals/'+ks[i],ch);}});},
  coms:function(vid){return DB.r('comments/'+vid).then(function(d){if(!d)return[];return Object.keys(d).map(function(id){return Object.assign({},d[id],{id:id});});});},
  saveCom:function(vid,c){if(!_db)return Promise.resolve();return _db.ref('comments/'+vid+'/'+c.id).set(c);},
  updCom:function(vid,cid,d){return DB.u('comments/'+vid+'/'+cid,d);}
};

/* ===== SESSION ===== */
var S={
  get:function(){try{return JSON.parse(localStorage.getItem(SK));}catch(e){return null;}},
  set:function(u){_me=u;var s=Object.assign({},u);delete s.videoData;localStorage.setItem(SK,JSON.stringify(s));},
  clear:function(){_me=null;localStorage.removeItem(SK);},
  me:function(){return _me||S.get();}
};

/* ===== LOADING ===== */
var L={
  _n:0,
  show:function(m){L._n++;var el=document.getElementById('gLoad');if(!el){el=document.createElement('div');el.id='gLoad';el.style.cssText='position:fixed;inset:0;background:rgba(10,10,26,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;';el.innerHTML='<div class="spinner"></div><p id="gLoadMsg" style="color:#ccc;font-size:0.9rem;margin:0;"></p>';document.body.appendChild(el);}el.style.display='flex';var p=document.getElementById('gLoadMsg');if(p)p.textContent=m||'Loading...';},
  hide:function(){L._n=Math.max(0,L._n-1);if(L._n===0){var el=document.getElementById('gLoad');if(el)el.style.display='none';}},
  off:function(){L._n=0;var el=document.getElementById('gLoad');if(el)el.style.display='none';}
};

/* ===== TOAST ===== */
function T(msg,type){var c={success:'linear-gradient(90deg,#00d26a,#00a855)',error:'linear-gradient(90deg,#ff4b4b,#cc2222)',warning:'linear-gradient(90deg,#ffd700,#c8930a)',info:'linear-gradient(90deg,#00f2ea,#b026ff)'};var t=document.createElement('div');t.textContent=msg;t.style.cssText='position:fixed;top:18px;left:50%;transform:translateX(-50%);background:'+(c[type]||c.info)+';color:#fff;padding:11px 20px;border-radius:28px;font-weight:700;z-index:99998;font-size:0.86rem;box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:90%;text-align:center;transition:opacity .4s;';document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';},2800);setTimeout(function(){t.remove();},3200);}

/* ===== ROUTER ===== */
var Router={
  go:function(pid){_prevPage=_curPage;_curPage=pid;document.querySelectorAll('.page-section').forEach(function(el){el.classList.add('hidden');});var pg=document.getElementById('page-'+pid);if(pg)pg.classList.remove('hidden');var nav=document.getElementById('mainNav');if(pid==='auth'||pid==='admin')nav.classList.add('hidden');else nav.classList.remove('hidden');document.querySelectorAll('.nav-i').forEach(function(el){el.classList.remove('active');});var ni=document.getElementById('nav-'+pid);if(ni)ni.classList.add('active');UI.sync();setTimeout(function(){UI.load(pid);},60);window.scrollTo(0,0);},
  init:async function(){
    /* Inject spinner style */
    var s=document.createElement('style');
    s.textContent='@keyframes _sp{to{transform:rotate(360deg)}}.spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,0.08);border-top-color:#00f2ea;border-radius:50%;animation:_sp .75s linear infinite;}';
    document.head.appendChild(s);

    /* Helper: hide splash and go to page */
    function hideSplash(page){
      var sp=document.getElementById('splash');
      if(sp){sp.style.opacity='0';setTimeout(function(){sp.style.display='none';},300);}
      Router.go(page||'auth');
    }

    /* ---- INSTANT: cached session → show home NOW ---- */
    var saved=S.get();
    if(saved&&saved.id&&saved.username){
      _me=saved;
      hideSplash('home');
      /* Background refresh — don't block UI */
      setTimeout(function(){
        DB.init().then(function(){return DB.getUser(saved.id);})
        .then(function(u){
          if(!u)return;
          if(u.isBanned){S.clear();hideSplash('auth');T('Account suspended','error');return;}
          _me=Object.assign({},u,{id:saved.id});
          S.set(_me);UI.sync();
        }).catch(function(){});
      },300);
      return;
    }

    /* ---- No session: try Firebase, but ALWAYS show auth within 4s ---- */
    var fill=document.getElementById('splashFill');
    var pct=0;
    var barAnim=setInterval(function(){
      pct=Math.min(pct+6,90);
      if(fill)fill.style.width=pct+'%';
    },80);

    /* Hard timeout — if Firebase takes >4s, show auth anyway */
    var hardTimer=setTimeout(function(){
      clearInterval(barAnim);
      if(fill)fill.style.width='100%';
      hideSplash('auth');
      T('Connecting to server...','info');
      /* Keep trying in background */
      DB.init().catch(function(){});
    },4000);

    try{
      await DB.init();
      clearTimeout(hardTimer);
      clearInterval(barAnim);
      if(fill)fill.style.width='100%';
      hideSplash('auth');
    }catch(e){
      clearTimeout(hardTimer);
      clearInterval(barAnim);
      if(fill)fill.style.width='100%';
      hideSplash('auth');
      T('Could not connect to server. Check internet.','warning');
    }
  }
};

/* ===== AUTH ===== */
var Auth={
  _ut:null,
  checkUser:function(v){var el=document.getElementById('uStatus');if(!el)return;clearTimeout(Auth._ut);if(!v||v.length<3){el.textContent='';return;}el.textContent='⏳';el.style.color='#888';Auth._ut=setTimeout(async function(){var tk=await DB.findUser('username',v);el.textContent=tk?'✗ Taken':'✓ Available';el.style.color=tk?'#ff6b6b':'#00d26a';},700);},
  login:async function(){var u=document.getElementById('lUser').value.trim(),p=document.getElementById('lPass').value;if(!u||!p)return T('Enter username and password','warning');L.show('Signing in...');var t=setTimeout(function(){L.off();T('Timed out. Try again.','error');},12000);try{if(_cfg.maintenanceMode){clearTimeout(t);L.off();return T('Server under maintenance','warning');}var user=await DB.findUser('username',u);clearTimeout(t);if(!user){L.off();return T('Username not found','error');}if(user.password!==p){L.off();return T('Wrong password','error');}if(user.isBanned){L.off();return T('Account suspended','error');}_me=user;S.set(user);L.off();Router.go('home');}catch(e){clearTimeout(t);L.off();T('Login failed. Try again.','error');}},
  register:async function(){var u=document.getElementById('rUser').value.trim(),m=document.getElementById('rMob').value.trim(),p=document.getElementById('rPass').value,r=document.getElementById('rRef').value.trim().toUpperCase();if(!u||!m||!p)return T('Fill all required fields','warning');if(u.length<3)return T('Username min 3 chars','warning');if(m.length<11)return T('Enter valid mobile number','warning');if(p.length<6)return T('Password min 6 chars','warning');L.show('Creating account...');var t=setTimeout(function(){L.off();T('Timed out. Try again.','error');},15000);try{var ex=await DB.findUser('username',u);if(ex){clearTimeout(t);L.off();return T('Username already taken','error');}var em=await DB.findUser('mobile',m);if(em){clearTimeout(t);L.off();return T('Mobile already registered','error');}var nid='u_'+Date.now(),nu={id:nid,username:u,mobile:m,password:p,displayName:u,avatar:'https://cdn-icons-png.flaticon.com/512/149/149071.png',balance:0,balanceUSD:0,coins:100,refCode:'TM'+Math.floor(1000+Math.random()*9000),referredBy:r||null,joinedAt:new Date().toISOString(),isBanned:false,tasksCompleted:0,lockedRewards:[],lastSpin:0,lastScratch:0,lastSlot:0,totalEarned:0,totalEarnedUSD:0,totalWithdrawn:0,totalWithdrawnUSD:0,videoHistory:[],subscriptions:[],notifChannels:[],savedVideos:[],likedVideos:[],dislikedVideos:[],playlists:[],monetized:false,monetizeStatus:null,totalVideoViews:0,videoEarnings:0,videoEarningsUSD:0,channelDesc:'',channelBanner:'',channelLink:''};if(r){var au=await DB.r('users');if(au){var rk=Object.keys(au).find(function(k){return au[k].refCode===r;});if(rk){var lks=(au[rk].lockedRewards||[]).slice();lks.push({sourceId:nid,sourceName:u,amount:_cfg.referralBonus,unlocked:false,progress:0});await DB.uu(rk,{lockedRewards:lks});}else nu.referredBy=null;}}await DB.saveUser(nu);clearTimeout(t);_me=nu;S.set(nu);L.off();T('Welcome! You got 100 free coins! 🎉','success');setTimeout(function(){Router.go('home');},1200);}catch(e){clearTimeout(t);L.off();T('Registration failed. Try again.','error');}},
  logout:function(){if(confirm('Logout?')){S.clear();Router.go('auth');}},
  adminLogin:function(){var p=document.getElementById('adminPin').value;if(p===AP){sessionStorage.setItem('isAdmin','true');document.getElementById('agate').classList.add('hidden');Router.go('admin');Admin.init();}else T('Wrong admin PIN','error');}
};

/* ===== PROFILE ===== */
var Profile={
  myChannel:function(){var u=S.me();if(u)ChanSys.open(u.id);},
  uploadPic:function(input){if(!input.files||!input.files[0])return;var f=input.files[0];if(!f.type.startsWith('image/'))return T('Select an image file','warning');if(f.size>5*1024*1024)return T('Max 5MB','error');var r=new FileReader();r.onload=async function(e){var src=e.target.result,u=S.me();if(!u)return;L.show('Updating...');await DB.uu(u.id,{avatar:src});_me=Object.assign({},_me,{avatar:src});S.set(_me);document.querySelectorAll('.u-avatar').forEach(function(el){if(el.tagName==='IMG')el.src=src;});var pa=document.getElementById('profileAvatar');if(pa)pa.src=src;L.hide();T('Profile picture updated!','success');};r.readAsDataURL(f);},
  setAvatar:async function(src){var u=S.me();if(!u)return;L.show('Updating...');await DB.uu(u.id,{avatar:src});_me=Object.assign({},_me,{avatar:src});S.set(_me);document.querySelectorAll('.u-avatar').forEach(function(el){if(el.tagName==='IMG')el.src=src;});var pa=document.getElementById('profileAvatar');if(pa)pa.src=src;L.hide();T('Avatar updated!','success');},
  save:async function(){var dn=document.getElementById('editName').value.trim(),np=document.getElementById('editNewPass').value,cp2=document.getElementById('editConfPass').value,cp=document.getElementById('editCurPass').value;if(!cp)return T('Enter current password','warning');var u=S.me();if(!u)return;L.show('Saving...');var ud=await DB.getUser(u.id);if(ud.password!==cp){L.hide();return T('Incorrect current password','error');}var upd={};if(dn&&dn.length>=2)upd.displayName=dn;if(np){if(np.length<6){L.hide();return T('Password min 6 chars','warning');}if(np!==cp2){L.hide();return T('Passwords do not match','error');}upd.password=np;}if(!Object.keys(upd).length){L.hide();return T('No changes to save','info');}await DB.uu(u.id,upd);_me=Object.assign({},_me,upd);S.set(_me);L.hide();['editCurPass','editNewPass','editConfPass'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});T('Profile updated!','success');UI.sync();}
};

/* ===== UI ===== */
var UI={
  toggleAuth:function(m){if(m==='register'){document.getElementById('form-login').classList.add('hidden');document.getElementById('form-register').classList.remove('hidden');}else{document.getElementById('form-register').classList.add('hidden');document.getElementById('form-login').classList.remove('hidden');}},
  sync:function(){var u=S.me();if(!u)return;var n=u.displayName||u.username||'';document.querySelectorAll('.u-name').forEach(function(e){e.textContent=n;});document.querySelectorAll('.u-bal').forEach(function(e){e.textContent='৳'+(u.balance||0).toFixed(2);});document.querySelectorAll('.u-bal-usd').forEach(function(e){e.textContent='$'+(u.balanceUSD||0).toFixed(4);});document.querySelectorAll('.u-coins').forEach(function(e){e.textContent=(u.coins||0).toLocaleString();});document.querySelectorAll('.u-avatar').forEach(function(e){if(e.tagName==='IMG')e.src=u.avatar||'';});},
  load:async function(pid){var u=S.me();if(!u||!u.id)return;try{var fresh=await DB.getUser(u.id);if(!fresh)return;_me=Object.assign({},fresh,{id:u.id});S.set(_me);UI.sync();if(pid==='home'){UI._ad();UI._tasks();Games.initBtns(_me,_cfg);}if(pid==='referral')UI._refs(_me);if(pid==='withdraw'){UI._wChk(_me);UI._wList(_me);UI._wMethods();}if(pid==='videos')VidSys.load();if(pid==='profile')UI._profile(_me);}catch(e){}},
  _ad:function(){var b=document.getElementById('homeAd');if(!b||!_cfg.adCode)return;b.innerHTML='';var w=document.createElement('div');w.innerHTML=_cfg.adCode;b.appendChild(w);b.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');Array.from(o.attributes).forEach(function(a){n.setAttribute(a.name,a.value);});n.textContent=o.textContent;o.parentNode.replaceChild(n,o);});},
  _tasks:async function(){var l=document.getElementById('taskList');if(!l)return;var ts=await DB.tasks();if(!ts.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No active tasks right now.</p>';return;}l.innerHTML='';ts.forEach(function(t){var d=document.createElement('div');d.className='task-card card';var sl=(t.link||'#').replace(/'/g,"\\'");d.innerHTML='<img src="'+(t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="t-icon" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'"><div class="t-info"><b>'+t.title+'</b><span class="cbadge">+'+t.reward+' Coins</span></div><button class="btn btn-sm" style="min-width:70px" onclick="Tasks.start(\''+sl+'\','+t.reward+')"><i class="fas fa-play"></i> Start</button>';l.appendChild(d);});},
  _refs:function(u){var c=document.getElementById('myRefCode');if(c)c.textContent=u.refCode||'---';var lks=u.lockedRewards||[],unl=lks.filter(function(r){return r.unlocked;}).length;var s=document.getElementById('refStats');if(s)s.innerHTML='<div><span>'+lks.length+'</span><small>Invites</small></div><div><span>'+unl+'</span><small>Unlocked</small></div><div><span>৳'+(unl*(_cfg.referralBonus||500)*(_cfg.coinToBDT||0.01)).toFixed(0)+'</span><small>Earned</small></div>';var l=document.getElementById('refList');if(!l)return;if(!lks.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No referrals yet. Share your code!</p>';return;}l.innerHTML='';lks.forEach(function(r){var p=Math.min(100,(r.progress/(_cfg.referralTasksReq||3))*100);l.innerHTML+='<div class="card ref-item"><div><b>'+r.sourceName+'</b><small style="color:#888;display:block">Progress: '+r.progress+'/'+(_cfg.referralTasksReq||3)+'</small><div class="prog-bar"><div style="width:'+p+'%"></div></div></div><span style="'+(r.unlocked?'color:var(--green)':'color:#888')+'">'+(r.unlocked?'✅ ৳'+r.amount:'🔒 ৳'+r.amount)+'</span></div>';});},
  _wChk:function(u){var ln=document.getElementById('wdLock'),fm=document.getElementById('wdForm');if(!ln||!fm)return;if(u.monetized){ln.classList.add('hidden');fm.classList.remove('hidden');}else{ln.classList.remove('hidden');fm.classList.add('hidden');}},
  _wList:async function(u){var l=document.getElementById('wdList');if(!l)return;var all=await DB.wds(),my=all.filter(function(w){return w.userId===u.id;}).reverse();if(!my.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No withdrawal history yet.</p>';return;}l.innerHTML='';my.forEach(function(w){var sc=w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';var isBDT=w.currency==='BDT'||!w.currency;var valStr=isBDT?'৳'+w.amt.toFixed(2):'$'+(w.amtUSD||w.amt||0).toFixed(4);var flag=isBDT?'🇧🇩':'🇺🇸';l.innerHTML+='<div class="card wd-item"><div><b>'+flag+' Bank Transfer ('+(w.currency||'BDT')+')</b><small style="color:#888;display:block">'+(w.bank||w.method||'')+(w.account||w.number?(' • '+(w.account||w.number)):'')+'</small><small style="color:#555">'+new Date(w.id).toLocaleDateString('en-BD')+'</small></div><div style="text-align:right"><b style="color:var(--gold)">'+valStr+'</b><br><span class="sbadge '+sc+'">'+w.status+'</span></div></div>';});},
  _wMethods:function(){var s=document.getElementById('wMethod');if(!s)return;s.innerHTML='<option value="">-- Select Method --</option>';(_cfg.withdrawMethods||['bKash','Bank Transfer (BDT)','Bank Transfer (USD)']).forEach(function(m){s.innerHTML+='<option value="'+m+'">'+m+'</option>';});},
  _profile:function(u){var pa=document.getElementById('profileAvatar');if(pa)pa.src=u.avatar||'';var pn=document.getElementById('profileName');if(pn)pn.textContent=u.displayName||u.username;var pm=document.getElementById('profileMobile');if(pm)pm.textContent='📱 '+u.mobile;var ps=document.getElementById('profileMonetize');if(ps){if(u.monetized)ps.innerHTML='<span class="mon-badge">💰 Monetized Creator</span>';else if(u.monetizeStatus==='Pending')ps.innerHTML='<span style="color:#f59e0b">⏳ Pending Review</span>';else ps.innerHTML='<span style="color:#444;font-size:0.78rem">Not monetized</span>';}var en=document.getElementById('editName');if(en)en.value=u.displayName||u.username;var pt=document.getElementById('pTasks');if(pt)pt.textContent=u.tasksCompleted||0;var pe=document.getElementById('pEarned');if(pe)pe.textContent='৳'+(u.totalEarned||0).toFixed(2);var pj=document.getElementById('pJoined');if(pj)pj.textContent=new Date(u.joinedAt).toLocaleDateString('en-BD');var pv=document.getElementById('pViews');if(pv)pv.textContent=(u.totalVideoViews||0).toLocaleString();},
  copyRef:function(){var c=(document.getElementById('myRefCode')||{}).textContent||'';safeCopy(c);},
  shareRef:function(){var c=(document.getElementById('myRefCode')||{}).textContent||'';var m='Join TaskMint Pro! Use my code: '+c;safeShare('TaskMint Pro',m,m);},
  withdraw:async function(){var mt=document.getElementById('wMethod').value,nb=document.getElementById('wNumber').value.trim(),am=parseFloat(document.getElementById('wAmt').value);if(!mt)return T('Select payment method','warning');if(!nb||nb.length<11)return T('Enter valid mobile number','warning');if(isNaN(am)||am<=0)return T('Enter valid amount','warning');L.show('Processing...');try{var u=await DB.getUser(S.me().id);if(!u.monetized){L.hide();return T('Must be monetized to withdraw','error');}if(am>(u.balance||0)){L.hide();return T('Insufficient balance','error');}if(am<_cfg.minWithdraw){L.hide();return T('Minimum: ৳'+_cfg.minWithdraw,'warning');}var all=await DB.wds();if(all.some(function(w){return w.userId===u.id&&w.status==='Pending';})){L.hide();return T('Already have pending request','warning');}var cd=Math.ceil(am/(_cfg.coinToBDT||0.01)),nb2=Math.max(0,(u.balance||0)-am),nc=Math.max(0,(u.coins||0)-cd);await DB.uu(u.id,{balance:nb2,coins:nc,totalWithdrawn:(u.totalWithdrawn||0)+am});await DB.saveWD({id:Date.now(),userId:u.id,username:u.username,mobile:u.mobile,amt:am,method:mt,number:nb,status:'Pending',coinsDeducted:cd,requestedAt:new Date().toISOString(),processedAt:null});_me=Object.assign({},_me,{balance:nb2,coins:nc});S.set(_me);L.hide();document.getElementById('wMethod').value='';document.getElementById('wNumber').value='';document.getElementById('wAmt').value='';T('Withdrawal submitted!','success');UI.sync();UI._wList(S.me());}catch(e){L.hide();T('Failed. Try again.','error');}}
};

/* ===== TASKS ===== */
var Tasks={
  start:function(link,reward){if(link&&link!=='#')window.open(link,'_blank');var ov=document.getElementById('taskOv'),te=document.getElementById('taskTimer');ov.classList.remove('hidden');var left=_cfg.adTimer||10;te.textContent=left;var iv=setInterval(function(){left--;te.textContent=left;if(left<=0){clearInterval(iv);ov.classList.add('hidden');Tasks.complete(reward);}},1000);},
  complete:async function(reward){var u=S.me();if(!u)return;L.show('Claiming...');try{var ud=await DB.getUser(u.id),bdtRate=_cfg.coinToBDT||0.05,usdRate=_cfg.coinToUSD||0.0005,earnedBDT=reward*bdtRate,earnedUSD=reward*usdRate,upd={coins:(ud.coins||0)+reward,tasksCompleted:(ud.tasksCompleted||0)+1,totalEarned:(ud.totalEarned||0)+earnedBDT,totalEarnedUSD:(ud.totalEarnedUSD||0)+earnedUSD};if(ud.monetized){upd.balance=(ud.balance||0)+earnedBDT;upd.balanceUSD=(ud.balanceUSD||0)+earnedUSD;}await DB.uu(u.id,upd);if(ud.referredBy){var au=await DB.r('users');if(au){var rk=Object.keys(au).find(function(k){return au[k].refCode===ud.referredBy;});if(rk){var lks=(au[rk].lockedRewards||[]).slice(),lk=lks.find(function(r){return r.sourceId===u.id;});if(lk&&!lk.unlocked){lk.progress++;if(lk.progress>=(_cfg.referralTasksReq||3)){lk.unlocked=true;if(au[rk].monetized)await DB.uu(rk,{lockedRewards:lks,balance:(au[rk].balance||0)+lk.amount*(_cfg.coinToBDT||0.01)});else await DB.uu(rk,{lockedRewards:lks});}else await DB.uu(rk,{lockedRewards:lks});}}}_me=Object.assign({},_me,{coins:(_me.coins||0)+reward});if(ud.monetized)_me.balance=(_me.balance||0)+earned;S.set(_me);L.hide();UI.sync();T('+'+reward+' Coins'+(ud.monetized?' + ৳'+earned.toFixed(2):'')+'!','success');}}catch(e){L.hide();T('Could not claim. Try again.','error');}}
};

/* ===== GAMES ===== */
var Games={
  fmt:function(ms){return Math.floor(ms/3600000)+'h '+Math.floor((ms%3600000)/60000)+'m';},
  cd:function(last,h){var d=Date.now()-(last||0),r=h*3600000;return d<r?{ok:false,wait:r-d}:{ok:true};},
  initBtns:function(u,c){Games._btn('btnSpin',u.lastSpin,c.gameCooldown||24,'Spin ('+(c.spinCost||50)+' Coins)');Games._btn('btnSlot',u.lastSlot,c.gameCooldown||24,'Play ('+(c.slotCost||100)+' Coins)');},
  _btn:function(id,last,cd,txt){var el=document.getElementById(id);if(!el)return;var st=Games.cd(last,cd);if(!st.ok){el.innerHTML='<i class="fas fa-clock"></i> '+Games.fmt(st.wait);el.disabled=true;el.style.opacity='0.5';}else{el.innerHTML=txt;el.disabled=false;el.style.opacity='1';}},
  spin:async function(){var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),st=Games.cd(ud.lastSpin,_cfg.gameCooldown||24);if(!st.ok)return T('Cooldown: '+Games.fmt(st.wait),'warning');if((ud.coins||0)<(_cfg.spinCost||50))return T('Need '+(_cfg.spinCost||50)+' coins','error');var w=document.getElementById('wheel'),deg=3600+Math.floor(Math.random()*3600);w.style.transition='transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';w.style.transform='rotate('+deg+'deg)';document.getElementById('btnSpin').disabled=true;var win=Math.floor(Math.random()*150)+10;await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.spinCost||50)+win,lastSpin:Date.now()});_me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.spinCost||50)+win});S.set(_me);setTimeout(function(){UI.sync();T('Won '+win+' Coins!','success');Games._btn('btnSpin',Date.now(),_cfg.gameCooldown||24,'Spin ('+((_cfg.spinCost)||50)+' Coins)');setTimeout(function(){w.style.transition='none';w.style.transform='rotate(0deg)';},100);},4200);},
  scratch:async function(el){if(el.dataset.used==='1')return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),st=Games.cd(ud.lastScratch,_cfg.gameCooldown||24);if(!st.ok)return T('Cooldown: '+Games.fmt(st.wait),'warning');if((ud.coins||0)<(_cfg.scratchCost||20))return T('Need '+(_cfg.scratchCost||20)+' coins','error');var win=Math.floor(Math.random()*60)+5;await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.scratchCost||20)+win,lastScratch:Date.now()});_me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.scratchCost||20)+win});S.set(_me);UI.sync();el.dataset.used='1';el.style.background='linear-gradient(135deg,#1a1a2e,#16213e)';el.style.border='2px solid var(--gold)';el.innerHTML='<div style="text-align:center"><h2 style="color:var(--gold);font-size:2rem">+'+win+'</h2><p style="color:#888">Coins Won!</p></div>';T('+'+win+' Coins!','success');setTimeout(function(){el.dataset.used='0';el.style.background='';el.style.border='';el.innerHTML='<div style="text-align:center;color:#888"><i class="fas fa-ticket-alt" style="font-size:2rem"></i><p>Tap to Scratch ('+((_cfg.scratchCost)||20)+' Coins)</p></div>';},3000);},
  slot:async function(){var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),st=Games.cd(ud.lastSlot,_cfg.gameCooldown||24);if(!st.ok)return T('Cooldown: '+Games.fmt(st.wait),'warning');if((ud.coins||0)<(_cfg.slotCost||100))return T('Need '+(_cfg.slotCost||100)+' coins','error');var sy=['🍋','🍒','💎','7️⃣','🔔','⭐'],r=[0,1,2].map(function(){return Math.floor(Math.random()*sy.length);}),rand=Math.random();if(rand>0.95){r[0]=r[1]=r[2]=3;}else if(rand>0.75){r[2]=r[0];}['s1','s2','s3'].forEach(function(id,i){document.getElementById(id).textContent=sy[r[i]];});var win=0;if(r[0]===3&&r[1]===3&&r[2]===3)win=1000;else if(r[0]===r[1]&&r[1]===r[2])win=300;else if(r[0]===r[1]||r[1]===r[2]||r[0]===r[2])win=60;await DB.uu(u.id,{coins:(ud.coins||0)-(_cfg.slotCost||100)+win,lastSlot:Date.now()});_me=Object.assign({},_me,{coins:(_me.coins||0)-(_cfg.slotCost||100)+win});S.set(_me);setTimeout(function(){UI.sync();if(win>=1000)T('JACKPOT! +'+win+'!','success');else if(win>0)T('+'+win+' Coins!','success');else T('No match!','info');},400);}
};

/* ===== VIDEO HELPERS ===== */
function ytId(s){if(!s)return null;s=s.trim();if(/^[a-zA-Z0-9_-]{11}$/.test(s))return s;var pp=[/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,/youtu\.be\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/];for(var i=0;i<pp.length;i++){var m=s.match(pp[i]);if(m)return m[1];}return null;}
function isShorts(v){return v.category==='Shorts'||(v.watchDuration||15)<60;}
function timeAgo(d){if(!d)return '';var df=Date.now()-new Date(d).getTime(),m=Math.floor(df/60000),h=Math.floor(df/3600000),dy=Math.floor(df/86400000),mo=Math.floor(df/2592000000),y=Math.floor(df/31536000000);if(y>0)return y+'y ago';if(mo>0)return mo+'mo ago';if(dy>0)return dy+'d ago';if(h>0)return h+'h ago';if(m>0)return m+'m ago';return 'Just now';}
function fmtViews(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M views';if(n>=1000)return(n/1000).toFixed(1)+'K views';return n+' views';}
function makeVideoCard(v,onclick){var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/hqdefault.jpg':''),sh=isShorts(v),views=v.views||0,uname=v.uploaderDisplayName||v.uploaderName||'Admin',isNew=(Date.now()-new Date(v.addedAt||0).getTime())<86400000*3;var div=document.createElement('div');div.className='vcard';div.onclick=onclick||function(){VidSys.open(v.id);};div.innerHTML='<div class="vth-wrap">'+(th?'<img src="'+th+'" class="vth" onerror="this.style.background=\'#1a1a2e\'">':'<div class="vth" style="background:#1a1a2e;display:flex;align-items:center;justify-content:center"><i class="fas fa-play-circle" style="position:absolute;font-size:3rem;color:#333"></i></div>')+(sh?'<span class="vbadge-sh">⚡ Shorts</span>':'')+(isNew?'<span class="vbadge-new">NEW</span>':'')+'<span class="vbadge-dur">'+(v.watchDuration||15)+'s</span></div><div class="vcard-info"><div class="vcard-av"><img src="'+(v.uploaderAvatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'" onclick="event.stopPropagation();'+(v.uploaderId?'ChanSys.open(\''+v.uploaderId+'\')':'void(0)')+'" style="cursor:pointer"></div><div class="vcard-meta"><h4 class="vcard-title">'+v.title+'</h4><p class="vcard-ch">'+uname+(v.uploaderMonetized?'<span class="vc">✓</span>':'')+'</p><p class="vcard-stats">'+fmtViews(views)+' • '+timeAgo(v.addedAt)+'</p></div></div>';return div;}

/* ===== VIDEO SYSTEM ===== */
var VidSys={
  _timer:null, _el:0, _vid:null, _claimed:false,
  _adT:null, _pendId:null, _adCb:null, _midFired:false,

  load:async function(){_allVids=await DB.vids();VidSys._applyFilter();},

  /* ---- FILTER / SEARCH ---- */
  search:function(q){_srch=q.toLowerCase().trim();var cl=document.getElementById('searchClear');if(cl)cl.classList.toggle('hidden',!_srch);VidSys._applyFilter();},
  clearSearch:function(){_srch='';var i=document.getElementById('searchInp');if(i)i.value='';var cl=document.getElementById('searchClear');if(cl)cl.classList.add('hidden');VidSys._applyFilter();},
  doSearch:function(){VidSys._applyFilter();},
  toggleSearch:function(){var sb=document.getElementById('searchBar'),cb=document.getElementById('chipBar');if(!sb)return;var hidden=sb.classList.toggle('hidden');if(cb)cb.style.display=hidden?'':'none';if(!hidden){var inp=document.getElementById('searchInp');if(inp){inp.value='';inp.focus();}}else{VidSys.clearSearch();}},
  cat:function(c,btn){_curCat=c;document.querySelectorAll('.chip').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');VidSys._applyFilter();},
  _applyFilter:function(){var vids=_allVids.slice();if(_curCat!=='All')vids=vids.filter(function(v){return v.category===_curCat;});if(_srch)vids=vids.filter(function(v){var haystack=((v.title||'')+' '+(v.uploaderName||'')+' '+(v.description||'')+' '+(v.tags||'')).toLowerCase();return haystack.indexOf(_srch)!==-1;});VidSys._renderList(vids,'vidList','vidEmpty');},

  /* ---- RENDER LIST ---- */
  _renderList:function(vids,listId,emptyId){var l=document.getElementById(listId),em=document.getElementById(emptyId);if(!l)return;if(!vids.length){l.innerHTML='';if(em)em.classList.remove('hidden');return;}if(em)em.classList.add('hidden');l.innerHTML='';vids.forEach(function(v,idx){if(idx>0&&idx%4===0){var div=document.createElement('div');div.className='vdiv';l.appendChild(div);}l.appendChild(makeVideoCard(v));});},

  /* ---- TABS ---- */
  tab:function(tabId){['home','subs','trending','upload','myvideos','saved','history','monetize'].forEach(function(t){var el=document.getElementById('vtab-'+t),btn=document.getElementById('vtab-btn-'+t);if(el)el.classList.toggle('hidden',t!==tabId);if(btn)btn.classList.toggle('active',t===tabId);});var sb=document.getElementById('searchBar'),cb=document.getElementById('chipBar');if(sb&&tabId!=='home')sb.classList.add('hidden');if(cb)cb.style.display=(tabId==='home'||tabId==='trending')?'':'none';if(tabId==='home')VidSys.load();else if(tabId==='subs')VidSys.loadSubs();else if(tabId==='trending')VidSys.loadTrending();else if(tabId==='myvideos')VidSys.myVideos();else if(tabId==='saved')VidSys.savedVideos();else if(tabId==='history')VidSys.watchHistory();else if(tabId==='monetize')MonSys.render();},

  loadSubs:async function(){var l=document.getElementById('subsList'),em=document.getElementById('subsEmpty');if(!l)return;var u=S.me();if(!u){if(em)em.classList.remove('hidden');return;}var ud=await DB.getUser(u.id),subs=(ud.subscriptions||[]);if(!subs.length){l.innerHTML='';if(em)em.classList.remove('hidden');return;}if(em)em.classList.add('hidden');var all=await DB.vids(),sv=all.filter(function(v){return v.uploaderId&&subs.indexOf(v.uploaderId)!==-1;}).sort(function(a,b){return new Date(b.addedAt)-new Date(a.addedAt);});if(!sv.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No recent videos from your subscriptions.</p>';return;}l.innerHTML='';sv.forEach(function(v){l.appendChild(makeVideoCard(v));});},

  loadTrending:async function(){var l=document.getElementById('trendingList');if(!l)return;var all=await DB.vids(),sorted=all.slice().sort(function(a,b){return(b.views||0)-(a.views||0);}).slice(0,30);if(!sorted.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No videos yet.</p>';return;}l.innerHTML='<div style="padding:10px 14px 5px"><h3>🔥 Trending Videos</h3></div>';sorted.forEach(function(v,i){var card=makeVideoCard(v);if(i===0)card.querySelector('.vth-wrap').innerHTML+='<span class="vbadge-live" style="background:var(--gold);color:#000">🔥 #1 Trending</span>';l.appendChild(card);});},

  myVideos:async function(){var l=document.getElementById('myVidList');if(!l)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),all=await DB.vids(),mine=all.filter(function(v){return v.uploaderId===u.id;}).reverse();if(!mine.length){l.innerHTML='<div style="text-align:center;padding:40px;color:#555"><i class="fas fa-video-slash" style="font-size:3rem;display:block;margin-bottom:14px;opacity:0.3"></i><p>No videos yet. Go upload one!</p></div>';return;}l.innerHTML='';mine.forEach(function(v){var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':''),vw=v.views||0;var div=document.createElement('div');div.className='vcard';div.innerHTML='<div class="vth-wrap" onclick="VidSys.open(\''+v.id+'\')">'+(th?'<img src="'+th+'" class="vth">':'<div class="vth" style="background:#1a1a2e"></div>')+'<span class="vbadge-dur">'+vw.toLocaleString()+' views</span></div><div class="vcard-info"><div class="vcard-av"><i class="fas fa-chart-bar" style="color:var(--cyan);font-size:1.2rem;margin-top:5px"></i></div><div class="vcard-meta"><h4 class="vcard-title">'+v.title+'</h4><p class="vcard-stats">'+(vw*((_cfg.viewCoinRate)||0.001)).toFixed(4)+' coins earned'+(ud.monetized?' • ৳'+(vw*((_cfg.viewCoinRate)||0.001)*((_cfg.coinToBDT)||0.01)).toFixed(6):'')+'</p><div style="display:flex;gap:6px;margin-top:6px"><button class="btn btn-sm btn-o" onclick="event.stopPropagation();ChanSys.open(\''+u.id+'\')"><i class="fas fa-tv"></i> Channel</button><button class="btn btn-sm btn-r" onclick="event.stopPropagation();VidSys.delMine(\''+v.id+'\')"><i class="fas fa-trash"></i></button></div></div></div>';l.appendChild(div);});},

  savedVideos:async function(){var l=document.getElementById('savedList');if(!l)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),saved=(ud.savedVideos||[]),all=await DB.vids(),sv=all.filter(function(v){return saved.indexOf(v.id)!==-1;});if(!sv.length){l.innerHTML='<div style="text-align:center;padding:40px;color:#555"><i class="fas fa-bookmark" style="font-size:3rem;display:block;margin-bottom:14px;opacity:0.3"></i><p>No saved videos yet.</p></div>';return;}l.innerHTML='';sv.forEach(function(v){l.appendChild(makeVideoCard(v));});},

  watchHistory:async function(){var l=document.getElementById('historyList');if(!l)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),hist=(ud.videoHistory||[]).slice().reverse(),all=await DB.vids();if(!hist.length){l.innerHTML='<div style="text-align:center;padding:40px;color:#555"><i class="fas fa-history" style="font-size:3rem;display:block;margin-bottom:14px;opacity:0.3"></i><p>No watch history yet.</p></div>';return;}l.innerHTML='';hist.slice(0,50).forEach(function(h){var v=all.find(function(x){return x.id===h.vid;});if(!v)return;var card=makeVideoCard(v);var meta=card.querySelector('.vcard-stats');if(meta)meta.textContent='Watched '+timeAgo(h.watchedAt)+' • '+fmtViews(v.views||0);l.appendChild(card);});},

  clearHistory:async function(){if(!confirm('Clear all watch history?'))return;var u=S.me();if(!u)return;await DB.uu(u.id,{videoHistory:[]});_me=Object.assign({},_me,{videoHistory:[]});S.set(_me);VidSys.watchHistory();T('History cleared','info');},

  /* ---- UPLOAD ---- */
  previewUp:function(input){var pv=document.getElementById('upPrev');if(!input.files||!input.files[0]){if(pv)pv.classList.add('hidden');return;}var f=input.files[0];if(!f.type.startsWith('video/')){T('Select a video file','warning');return;}var ve=document.getElementById('upVidEl');if(ve){ve.src=URL.createObjectURL(f);pv.classList.remove('hidden');}var si=document.getElementById('upInfo');if(si)si.textContent=f.name+' — '+(f.size/1024/1024).toFixed(1)+'MB';},

  upload:async function(){var fi=document.getElementById('upFile'),title=document.getElementById('upTitle').value.trim(),desc=document.getElementById('upDesc').value.trim(),tags=document.getElementById('upTags').value.trim(),cat=document.getElementById('upCat').value,u=S.me();if(!u)return;if(!title)return T('Enter video title','warning');if(!fi||!fi.files||!fi.files[0])return T('Select a video file','warning');var file=fi.files[0];if(!file.type.startsWith('video/'))return T('Invalid video file','error');var btn=document.getElementById('upBtn');if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...';}var reader=new FileReader();reader.onload=function(e){var vel=document.createElement('video');vel.src=e.target.result;vel.currentTime=1;vel.onloadeddata=async function(){var canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;canvas.getContext('2d').drawImage(vel,0,0,320,180);var thumb=canvas.toDataURL('image/jpeg',0.7);L.show('Saving video...');try{var cu=S.me();await DB.saveVid({id:'v_'+Date.now(),title:title,description:desc,tags:tags,category:cat,uploaderId:cu.id,uploaderName:cu.username,uploaderDisplayName:cu.displayName||cu.username,uploaderAvatar:cu.avatar||'',uploaderMonetized:cu.monetized||false,videoData:e.target.result,thumbnail:thumb,watchDuration:15,views:0,likes:0,dislikes:0,addedAt:new Date().toISOString()});L.off();if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}document.getElementById('upTitle').value='';document.getElementById('upDesc').value='';document.getElementById('upTags').value='';fi.value='';document.getElementById('upPrev').classList.add('hidden');VidSys.tab('myvideos');T('Video uploaded! 🎉','success');}catch(er){L.off();if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}T('Upload failed. Try again.','error');}};vel.onerror=function(){if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}T('Error reading video.','error');};};reader.onerror=function(){if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}T('Error reading file.','error');};reader.readAsDataURL(file);},

  delMine:async function(id){if(!confirm('Delete this video?'))return;L.show('Deleting...');await DB.delVid(id);L.off();VidSys.myVideos();T('Deleted','info');},

  /* ---- OPEN PLAYER ---- */
  open:async function(videoId){var u=S.me();if(!u)return;var video=_allVids.find(function(v){return v.id===videoId;});if(!video){var all=await DB.vids();_allVids=all;video=all.find(function(v){return v.id===videoId;});}if(!video)return T('Video not found','error');/* AD decision */var freq=_cfg.adFrequency||1;_adPlays++;var showAd=_cfg.videoAdEnabled&&_cfg.videoAdCode&&(_adPlays%freq===0);if(showAd){VidSys._pendId=videoId;VidSys._playAd(_cfg.videoAdCode,_cfg.adSkipTime||5,_cfg.adUnskippable||false);}else{VidSys._startPlayer(video,u);}},

  /* ---- AD SYSTEM — Advanced ---- */
  _playAd:function(code,skip,unskip){var ov=document.getElementById('adOverlay'),inner=document.getElementById('adInner'),sb=document.getElementById('adSkipBtn'),fill=document.getElementById('adFill'),txt=document.getElementById('adTxt');if(!ov||!inner){VidSys.skipAd();return;}inner.innerHTML='';var w=document.createElement('div');w.innerHTML=code;inner.appendChild(w);inner.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');Array.from(o.attributes).forEach(function(a){n.setAttribute(a.name,a.value);});n.textContent=o.textContent;o.parentNode.replaceChild(n,o);});/* Overlay type banner */var atype=_cfg.adType||'preroll';if(atype==='overlay'){var ob=document.getElementById('adOverlayBanner');if(ob){ob.classList.remove('hidden');ob.innerHTML=code;ob.querySelectorAll('script').forEach(function(o){var n=document.createElement('script');Array.from(o.attributes).forEach(function(a){n.setAttribute(a.name,a.value);});n.textContent=o.textContent;o.parentNode.replaceChild(n,o);});}}if(unskip){sb.style.display='none';}else{sb.classList.add('hidden');sb.style.display='';}ov.classList.remove('hidden');var left=skip;txt.textContent=left+'s';fill.style.width='100%';clearInterval(VidSys._adT);VidSys._adT=setInterval(function(){left--;txt.textContent=left+'s';fill.style.width=((left/skip)*100)+'%';if(left<=0){clearInterval(VidSys._adT);if(!unskip){sb.classList.remove('hidden');}else{VidSys.skipAd();}}},1000);},

  skipAd:function(){clearInterval(VidSys._adT);var ov=document.getElementById('adOverlay');if(ov)ov.classList.add('hidden');var ob=document.getElementById('adOverlayBanner');if(ob)ob.classList.add('hidden');if(VidSys._adCb){VidSys._adCb();VidSys._adCb=null;}else if(VidSys._pendId){var vid=_allVids.find(function(v){return v.id===VidSys._pendId;});if(vid)VidSys._startPlayer(vid,S.me());VidSys._pendId=null;}},

  _startPlayer:async function(video,u){VidSys._vid=video;VidSys._el=0;VidSys._claimed=false;VidSys._midFired=false;var vid=ytId(video.url||''),isLocal=!!video.videoData,frame=document.getElementById('vpFrame');if(isLocal){var ic=document.getElementById('ytVF');if(ic)ic.innerHTML='<video src="'+video.videoData+'" controls autoplay style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>';}else if(vid){if(frame)frame.src='https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0&modestbranding=1';}
    /* Fill UI */
    var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    set('vpTitle',video.title);set('vpViews',fmtViews(video.views||0));set('vpDate',timeAgo(video.addedAt));set('vpCat',video.category||'');set('vpNeeded',(video.watchDuration||15)+'s');set('vpElapsed','0s');
    /* Like/dislike */
    var lb=document.getElementById('vpLikeBtn'),db=document.getElementById('vpDislikeBtn'),svb=document.getElementById('vpSaveBtn');if(lb)lb.classList.remove('on');if(db)db.classList.remove('on');if(svb)svb.classList.remove('on');set('vpLikeN',(video.likes||0)||'0');set('vpDislikeN','');
    /* Description */
    var dt=document.getElementById('vpDescTxt');if(dt){dt.classList.remove('exp');dt.textContent=video.description||'No description.';}var dm=document.getElementById('vpDescMore');if(dm)dm.textContent='Show more';
    /* Tags */
    var tg=document.getElementById('vpTags');if(tg){tg.innerHTML='';if(video.tags){video.tags.split(',').forEach(function(tag){tag=tag.trim();if(tag){var sp=document.createElement('span');sp.className='vtag';sp.textContent='#'+tag;sp.onclick=function(){VidSys.clearSearch();document.getElementById('searchInp').value=tag;VidSys.search(tag);VidSys.tab('home');};tg.appendChild(sp);}});}}
    /* Progress */
    var pf=document.getElementById('vpProgFill');if(pf){pf.style.width='0%';pf.style.background='';}set('vpPct','0%');
    var cb=document.getElementById('vpClaimBtn');if(cb)cb.classList.add('hidden');var wm=document.getElementById('vpMsg');if(wm)wm.textContent='Watching to support the creator...';
    /* Open overlay */
    var ov=document.getElementById('vpOverlay');ov.classList.remove('hidden');ov.scrollTop=0;
    /* My avatar */
    var ma=document.getElementById('vpMyAv');if(ma&&u)ma.src=u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    /* Load uploader, comments, related */
    await VidSys._fillUploader(video,u);
    VidSys.loadComments(video.id,'top');
    VidSys._loadRelated(video);
    /* Check like/save state */
    if(u)DB.getUser(u.id).then(function(ud){if(!ud)return;if((ud.likedVideos||[]).indexOf(video.id)!==-1){if(lb)lb.classList.add('on');}if((ud.dislikedVideos||[]).indexOf(video.id)!==-1){if(db)db.classList.add('on');}if((ud.savedVideos||[]).indexOf(video.id)!==-1){if(svb)svb.classList.add('on');}});
    VidSys._runTimer();},

  _fillUploader:async function(video,me){if(!video.uploaderId){var un2=document.getElementById('vpChName');if(un2)un2.textContent='Admin';var ua2=document.getElementById('vpChAv');if(ua2)ua2.src='https://cdn-icons-png.flaticon.com/512/149/149071.png';var sc2=document.getElementById('vpChSubs');if(sc2)sc2.textContent='';var sb2=document.getElementById('vpSubBtn');if(sb2)sb2.style.display='none';var bb2=document.getElementById('vpBellBtn');if(bb2)bb2.style.display='none';return;}var ud=await DB.getUser(video.uploaderId),cnt=await SubSys.count(video.uploaderId);var un=document.getElementById('vpChName');if(un)un.textContent=(ud&&(ud.displayName||ud.username))||video.uploaderName||'Creator';var ua=document.getElementById('vpChAv');if(ua)ua.src=(ud&&ud.avatar)||'https://cdn-icons-png.flaticon.com/512/149/149071.png';var sc=document.getElementById('vpChSubs');if(sc)sc.textContent=cnt.toLocaleString()+' subscribers';var sb=document.getElementById('vpSubBtn'),bell=document.getElementById('vpBellBtn');if(sb)sb.style.display='';if(bell)bell.style.display='';if(me){var meD=await DB.getUser(me.id),isSub=meD&&(meD.subscriptions||[]).indexOf(video.uploaderId)!==-1;if(sb){sb.textContent=isSub?'Subscribed':'Subscribe';sb.className='vp-sub-btn'+(isSub?' on':'');}if(bell&&meD){var bon=(meD.notifChannels||[]).indexOf(video.uploaderId)!==-1;if(bon)bell.classList.add('on');else bell.classList.remove('on');}if(sb&&me.id===video.uploaderId)sb.style.display='none';}},

  _loadRelated:function(video){var l=document.getElementById('vpRelated');if(!l)return;var rel=_allVids.filter(function(v){return v.id!==video.id&&(v.category===video.category||v.uploaderId===video.uploaderId);}).slice(0,8);if(!rel.length)rel=_allVids.filter(function(v){return v.id!==video.id;}).slice(0,8);l.innerHTML='';rel.forEach(function(v){var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':'');var d=document.createElement('div');d.className='rel-card';d.onclick=function(){VidSys.open(v.id);};d.innerHTML='<img src="'+(th||'')+'" class="rel-th" onerror="this.style.background=\'#1a1a2e\'"><div class="rel-info"><div class="rel-title">'+v.title+'</div><div class="rel-ch">'+(v.uploaderDisplayName||v.uploaderName||'Admin')+'</div><div style="font-size:0.72rem;color:#555">'+fmtViews(v.views||0)+' • '+timeAgo(v.addedAt)+'</div></div>';l.appendChild(d);});},

  _runTimer:function(){clearInterval(VidSys._timer);var video=VidSys._vid;if(!video)return;VidSys._timer=setInterval(function(){VidSys._el++;var dur=video.watchDuration||15,p=Math.min(100,Math.round((VidSys._el/dur)*100));var pf=document.getElementById('vpProgFill');if(pf)pf.style.width=p+'%';var pc=document.getElementById('vpPct');if(pc)pc.textContent=p+'%';var te=document.getElementById('vpElapsed');if(te)te.textContent=VidSys._el+'s';/* Mid-roll ad */if(_cfg.adType==='midroll'&&_cfg.videoAdEnabled&&_cfg.videoAdCode&&!VidSys._midFired&&VidSys._el>=(_cfg.adMidAt||30)){VidSys._midFired=true;clearInterval(VidSys._timer);VidSys._adCb=function(){VidSys._runTimer();};VidSys._playAd(_cfg.videoAdCode,_cfg.adSkipTime||5,_cfg.adUnskippable||false);return;}if(VidSys._el>=dur&&!VidSys._claimed){clearInterval(VidSys._timer);var cb=document.getElementById('vpClaimBtn');if(cb)cb.classList.remove('hidden');var wm=document.getElementById('vpMsg');if(wm)wm.textContent='';if(pf)pf.style.background='linear-gradient(90deg,#00cc66,#00ff88)';T('Watch complete! Mark as watched.','success');}},1000);},

  close:function(){clearInterval(VidSys._timer);var f=document.getElementById('vpFrame');if(f)f.src='';var ic=document.getElementById('ytVF');if(ic&&!ic.querySelector('iframe'))ic.innerHTML='<iframe id="vpFrame" src="" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>';document.getElementById('vpOverlay').classList.add('hidden');VidSys._vid=null;VidSys._el=0;VidSys._claimed=false;},

  claim:async function(){if(VidSys._claimed)return;var video=VidSys._vid;if(!video)return;VidSys._claimed=true;var u=S.me();if(!u)return;L.show('Registering view...');try{var ud=await DB.getUser(u.id),hist=(ud.videoHistory||[]).slice();hist.push({vid:video.id,title:video.title,watchedAt:new Date().toISOString()});if(hist.length>200)hist=hist.slice(-200);await DB.uu(u.id,{videoHistory:hist});await DB.u('videos/'+video.id,{views:(video.views||0)+1});if(video.uploaderId&&video.uploaderId!==u.id){var up=await DB.getUser(video.uploaderId);if(up){var vc=_cfg.viewCoinRate||5,bdtR=_cfg.coinToBDT||0.05,usdR=_cfg.coinToUSD||0.0005,upd={coins:(up.coins||0)+vc,totalVideoViews:(up.totalVideoViews||0)+1};if(up.monetized){upd.balance=(up.balance||0)+vc*bdtR;upd.balanceUSD=(up.balanceUSD||0)+vc*usdR;upd.videoEarnings=(up.videoEarnings||0)+vc*bdtR;upd.videoEarningsUSD=(up.videoEarningsUSD||0)+vc*usdR;}await DB.uu(video.uploaderId,upd);VidSys._notify(video.uploaderId,{type:'view',text:(u.displayName||u.username)+' watched your video "'+video.title+'"',avatar:u.avatar||'',thumb:video.thumbnail||'',time:new Date().toISOString(),unread:true});}}L.off();VidSys.close();T('View counted! Creator earned '+((_cfg.viewCoinRate)||0.001)+' coin.','success');}catch(e){L.off();VidSys.close();T('View counted!','success');}},

  /* ---- INTERACTIONS ---- */
  like:async function(){var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),liked=(ud.likedVideos||[]).slice(),idx=liked.indexOf(v.id),lb=document.getElementById('vpLikeBtn');if(idx!==-1){liked.splice(idx,1);await DB.uu(u.id,{likedVideos:liked});await DB.u('videos/'+v.id,{likes:Math.max(0,(v.likes||0)-1)});v.likes=Math.max(0,(v.likes||0)-1);if(lb)lb.classList.remove('on');document.getElementById('vpLikeN').textContent=v.likes||'0';}else{liked.push(v.id);var disliked=(ud.dislikedVideos||[]).filter(function(x){return x!==v.id;});await DB.uu(u.id,{likedVideos:liked,dislikedVideos:disliked});await DB.u('videos/'+v.id,{likes:(v.likes||0)+1});v.likes=(v.likes||0)+1;if(lb)lb.classList.add('on');document.getElementById('vpLikeN').textContent=v.likes;var db=document.getElementById('vpDislikeBtn');if(db)db.classList.remove('on');VidSys._notify(v.uploaderId||'',{type:'like',text:(u.displayName||u.username)+' liked "'+v.title+'"',avatar:u.avatar||'',thumb:v.thumbnail||'',time:new Date().toISOString(),unread:true});}},

  dislike:async function(){var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),dis=(ud.dislikedVideos||[]).slice(),idx=dis.indexOf(v.id),db=document.getElementById('vpDislikeBtn');if(idx!==-1){dis.splice(idx,1);await DB.uu(u.id,{dislikedVideos:dis});if(db)db.classList.remove('on');}else{dis.push(v.id);var liked=(ud.likedVideos||[]).filter(function(x){return x!==v.id;});if(liked.length<(ud.likedVideos||[]).length){await DB.u('videos/'+v.id,{likes:Math.max(0,(v.likes||0)-1)});v.likes=Math.max(0,(v.likes||0)-1);document.getElementById('vpLikeN').textContent=v.likes||'0';var lb=document.getElementById('vpLikeBtn');if(lb)lb.classList.remove('on');}await DB.uu(u.id,{dislikedVideos:dis,likedVideos:liked});if(db)db.classList.add('on');}},

  share:function(){var v=VidSys._vid;if(!v)return;var url=window.location.href.split('?')[0]+'?v='+v.id,msg='Watch "'+v.title+'" on TaskMint Pro!\n'+url;safeShare(v.title,msg,url);},

  save:async function(){var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),saved=(ud.savedVideos||[]).slice(),idx=saved.indexOf(v.id),sb=document.getElementById('vpSaveBtn');if(idx!==-1){saved.splice(idx,1);await DB.uu(u.id,{savedVideos:saved});if(sb)sb.classList.remove('on');T('Removed from saved','info');}else{saved.push(v.id);await DB.uu(u.id,{savedVideos:saved});if(sb)sb.classList.add('on');T('Saved! 🔖','success');}},

  download:function(){var v=VidSys._vid;if(!v)return;if(v.videoData){var a=document.createElement('a');a.href=v.videoData;a.download=(v.title||'video').replace(/[^a-z0-9]/gi,'_')+'.mp4';a.click();T('Downloading...','success');}else T('Download unavailable for YouTube videos','info');},

  addToPlaylist:async function(){var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),playlists=(ud.playlists||[]),modal=document.getElementById('playlistModal'),l=document.getElementById('playlistList');if(!modal||!l)return;l.innerHTML='';if(!playlists.length){l.innerHTML='<p style="color:#888;text-align:center;padding:10px">No playlists yet. Create one below!</p>';}else{playlists.forEach(function(pl,i){var d=document.createElement('div');d.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:10px;cursor:pointer;transition:background .2s;margin-bottom:6px';d.onmouseover=function(){this.style.background='rgba(255,255,255,0.05)';};d.onmouseout=function(){this.style.background='';};var inPl=(pl.videos||[]).indexOf(v.id)!==-1;d.innerHTML='<span><i class="fas fa-list" style="color:var(--cyan);margin-right:8px"></i>'+pl.name+' ('+((pl.videos||[]).length)+')</span><span style="color:'+(inPl?'var(--cyan)':'#555')+'">'+(inPl?'✓':'+'+'')+'</span>';d.onclick=async function(){if(inPl){pl.videos=(pl.videos||[]).filter(function(x){return x!==v.id;});T('Removed from '+pl.name,'info');}else{pl.videos=pl.videos||[];pl.videos.push(v.id);T('Added to '+pl.name,'success');}await DB.uu(u.id,{playlists:playlists});modal.classList.add('hidden');};l.appendChild(d);});}modal.classList.remove('hidden');},

  createPlaylist:async function(){var name=document.getElementById('newPlaylistName').value.trim();if(!name)return T('Enter playlist name','warning');var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),playlists=(ud.playlists||[]).slice();playlists.push({id:'pl_'+Date.now(),name:name,videos:[],createdAt:new Date().toISOString()});await DB.uu(u.id,{playlists:playlists});_me=Object.assign({},_me,{playlists:playlists});S.set(_me);document.getElementById('newPlaylistName').value='';VidSys.addToPlaylist();T('Playlist created!','success');},

  report:function(){if(confirm('Report this video for inappropriate content?'))T('Video reported. We will review it.','info');},
  expandTitle:function(){var t=document.getElementById('vpTitle');if(t)t.style.webkitLineClamp=t.style.webkitLineClamp==='unset'?'3':'unset';},
  toggleDesc:function(){var dt=document.getElementById('vpDescTxt'),dm=document.getElementById('vpDescMore');if(!dt)return;var exp=dt.classList.toggle('exp');if(dm)dm.textContent=exp?'Show less':'Show more';},
  goChannel:function(){var v=VidSys._vid;if(v&&v.uploaderId){VidSys.close();ChanSys.open(v.uploaderId);}},

  subscribe:async function(){var v=VidSys._vid;if(!v||!v.uploaderId)return;await SubSys.toggle(v.uploaderId);await VidSys._fillUploader(v,S.me());VidSys._notify(v.uploaderId,{type:'sub',text:(S.me().displayName||S.me().username)+' subscribed to your channel!',avatar:S.me().avatar||'',thumb:'',time:new Date().toISOString(),unread:true});},

  bell:async function(){var v=VidSys._vid;if(!v||!v.uploaderId)return;var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),nc=(ud.notifChannels||[]).slice(),idx=nc.indexOf(v.uploaderId),bell=document.getElementById('vpBellBtn');if(idx!==-1){nc.splice(idx,1);await DB.uu(u.id,{notifChannels:nc});if(bell)bell.classList.remove('on');T('Notifications off','info');}else{nc.push(v.uploaderId);await DB.uu(u.id,{notifChannels:nc});if(bell)bell.classList.add('on');T('Notifications on 🔔','success');}},

  /* ---- NOTIFICATIONS ---- */
  _notify:async function(uid,notif){if(!uid)return;var ud=await DB.getUser(uid);if(!ud)return;var notifs=(ud.notifications||[]).slice();notifs.unshift(notif);if(notifs.length>100)notifs=notifs.slice(0,100);await DB.uu(uid,{notifications:notifs});},

  toggleNotif:async function(){var panel=document.getElementById('notifPanel'),bg=document.getElementById('notifBg');if(!panel)return;var open=panel.style.transform==='translateX(0px)';if(open){panel.style.transform='translateX(100%)';if(bg)bg.classList.add('hidden');}else{panel.style.transform='translateX(0px)';if(bg)bg.classList.remove('hidden');VidSys._loadNotifs();}},

  _loadNotifs:async function(){var u=S.me();if(!u)return;var l=document.getElementById('notifList');if(!l)return;var ud=await DB.getUser(u.id),notifs=(ud.notifications||[]);var dot=document.getElementById('notifDot');if(dot)dot.classList.toggle('hidden',!notifs.some(function(n){return n.unread;}));if(!notifs.length){l.innerHTML='<p style="color:#555;text-align:center;padding:30px;font-size:0.9rem">No notifications yet.</p>';return;}l.innerHTML='';notifs.forEach(function(n){if(typeof n==='string')return;var d=document.createElement('div');d.className='notif-item'+(n.unread?' unread':'');d.innerHTML='<img src="'+(n.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="notif-av" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'"><div style="flex:1"><div class="notif-txt">'+n.text+'</div><div class="notif-time">'+timeAgo(n.time)+'</div></div>'+(n.thumb?'<img src="'+n.thumb+'" class="notif-th">':'');l.appendChild(d);});},

  markAllRead:async function(){var u=S.me();if(!u)return;var ud=await DB.getUser(u.id),notifs=(ud.notifications||[]).map(function(n){return typeof n==='string'?n:Object.assign({},n,{unread:false});});await DB.uu(u.id,{notifications:notifs});var dot=document.getElementById('notifDot');if(dot)dot.classList.add('hidden');VidSys._loadNotifs();},

  /* ---- COMMENTS ---- */
  postComment:async function(){var inp=document.getElementById('vpComInput');if(!inp)return;var text=inp.value.trim();if(!text)return T('Write something first','warning');var v=VidSys._vid;if(!v)return;var u=S.me();if(!u)return;var c={id:'c_'+Date.now(),userId:u.id,username:u.displayName||u.username,avatar:u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png',text:text,likes:0,likedBy:[],pinned:false,createdAt:new Date().toISOString()};await DB.saveCom(v.id,c);inp.value='';inp.style.height='auto';T('Comment posted!','success');VidSys.loadComments(v.id,'top');if(v.uploaderId&&v.uploaderId!==u.id)VidSys._notify(v.uploaderId,{type:'comment',text:(u.displayName||u.username)+' commented: '+text.substring(0,60),avatar:u.avatar||'',thumb:v.thumbnail||'',time:new Date().toISOString(),unread:true});},

  loadComments:async function(videoId,sort){var vid=videoId||(VidSys._vid&&VidSys._vid.id);if(!vid)return;sort=sort||'top';var l=document.getElementById('vpComList'),ce=document.getElementById('vpComCnt');if(!l)return;var coms=await DB.coms(vid);if(ce)ce.textContent=coms.length;if(!coms.length){l.innerHTML='<p style="color:#555;font-size:0.85rem;padding:10px 0">No comments yet. Be the first!</p>';return;}var u=S.me();coms.sort(function(a,b){if(a.pinned&&!b.pinned)return -1;if(!a.pinned&&b.pinned)return 1;return sort==='new'?new Date(b.createdAt)-new Date(a.createdAt):(b.likes||0)-(a.likes||0);});var uploaderIds=VidSys._vid?[VidSys._vid.uploaderId]:[];l.innerHTML='';coms.forEach(function(c){var ml=(c.likedBy||[]).indexOf(u?u.id:'')!==-1,isOp=uploaderIds.indexOf(c.userId)!==-1;var d=document.createElement('div');d.className='vp-com-item';d.innerHTML='<img src="'+c.avatar+'" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'"><div class="vp-com-body"><div class="vp-com-name">'+c.username+(c.pinned?' <span style="color:var(--cyan);font-size:0.68rem">📌</span>':'')+(isOp?' <span class="op">Creator</span>':'')+' <span>'+timeAgo(c.createdAt)+'</span></div><div class="vp-com-txt">'+c.text.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')+'</div><div class="vp-com-act"><button class="vp-com-lbtn '+(ml?'on':'')+'" onclick="VidSys.likeComment(\''+vid+'\',\''+c.id+'\')"><i class="fas fa-thumbs-up"></i> '+(c.likes||0)+'</button><button class="vp-com-rbtn" onclick="VidSys.replyTo(\''+c.username+'\')">Reply</button>'+(u&&VidSys._vid&&VidSys._vid.uploaderId===u.id?'<button class="vp-com-rbtn" onclick="VidSys.pinComment(\''+vid+'\',\''+c.id+'\',\''+(c.pinned?'false':'true')+'\')">'+(c.pinned?'Unpin':'📌 Pin')+'</button>':'')+'</div></div>';l.appendChild(d);});},

  likeComment:async function(vid,cid){var u=S.me();if(!u)return;var c=await DB.r('comments/'+vid+'/'+cid);if(!c)return;var lb=(c.likedBy||[]).slice(),idx=lb.indexOf(u.id);if(idx!==-1){lb.splice(idx,1);await DB.updCom(vid,cid,{likes:Math.max(0,(c.likes||0)-1),likedBy:lb});}else{lb.push(u.id);await DB.updCom(vid,cid,{likes:(c.likes||0)+1,likedBy:lb});}VidSys.loadComments(vid);},
  pinComment:async function(vid,cid,pin){await DB.updCom(vid,cid,{pinned:pin==='true'});VidSys.loadComments(vid);T(pin==='true'?'Comment pinned!':'Unpinned','info');},
  replyTo:function(username){var inp=document.getElementById('vpComInput');if(inp){inp.value='@'+username+' ';inp.focus();}},
  sortComments:function(val){VidSys.loadComments(null,val);}
};

/* ===== SUBSCRIBE SYSTEM ===== */
var SubSys={
  toggle:async function(tid){var me=S.me();if(!me)return;if(me.id===tid)return T('Cannot subscribe to yourself','warning');var md=await DB.getUser(me.id),subs=(md.subscriptions||[]).slice(),idx=subs.indexOf(tid);if(idx!==-1){subs.splice(idx,1);await DB.uu(me.id,{subscriptions:subs});T('Unsubscribed','info');}else{subs.push(tid);await DB.uu(me.id,{subscriptions:subs});T('Subscribed! 🔔','success');}},
  count:async function(uid){var all=await DB.users();return all.filter(function(u){return(u.subscriptions||[]).indexOf(uid)!==-1;}).length;}
};

/* ===== CHANNEL SYSTEM ===== */
var ChanSys={
  _uid:null,
  open:async function(uid){ChanSys._uid=uid;document.querySelectorAll('.page-section').forEach(function(el){el.classList.add('hidden');});document.getElementById('page-channel').classList.remove('hidden');document.getElementById('mainNav').classList.remove('hidden');_prevPage=_curPage;_curPage='channel';var me=S.me(),eb=document.getElementById('chEditBar');if(eb)eb.classList.toggle('hidden',!(me&&me.id===uid));window.scrollTo(0,0);ChanSys.render(uid,'videos');},
  back:function(){Router.go(_prevPage||'home');},
  save:async function(){var desc=document.getElementById('chDescIn').value.trim(),banner=document.getElementById('chBannerIn').value.trim(),link=document.getElementById('chLinkIn').value.trim(),u=S.me();if(!u)return;L.show('Saving...');await DB.uu(u.id,{channelDesc:desc,channelBanner:banner,channelLink:link});_me=Object.assign({},_me,{channelDesc:desc,channelBanner:banner,channelLink:link});S.set(_me);L.off();T('Channel saved!','success');ChanSys.render(u.id,'videos');},
  showTab:function(tab,btn){document.querySelectorAll('#chTabs .vtab').forEach(function(b){b.classList.remove('active');});if(btn)btn.classList.add('active');ChanSys.render(ChanSys._uid,tab);},
  render:async function(uid,tab){tab=tab||'videos';var me=S.me();L.show('Loading channel...');var user,cnt,allVids;try{var res=await Promise.all([DB.getUser(uid),SubSys.count(uid),DB.vids()]);user=res[0];cnt=res[1];allVids=res[2];}catch(e){L.off();return;}var meData=me?await DB.getUser(me.id):null;L.off();if(!user)return;var isSub=meData&&(meData.subscriptions||[]).indexOf(uid)!==-1,isMe=me&&me.id===uid,uvids=allVids.filter(function(v){return v.uploaderId===uid;});if(isMe){var di=document.getElementById('chDescIn');if(di)di.value=user.channelDesc||'';var bi=document.getElementById('chBannerIn');if(bi)bi.value=user.channelBanner||'';var li=document.getElementById('chLinkIn');if(li)li.value=user.channelLink||'';}var bs=user.channelBanner?'background-image:url('+user.channelBanner+');background-size:cover;background-position:center':'background:linear-gradient(135deg,#0a0a1a,#1a1a3e,#0a2a1a)',hdr=document.getElementById('chHeader');if(hdr)hdr.innerHTML='<div class="ch-banner" style="'+bs+'"></div><div class="ch-info-row"><img src="'+user.avatar+'" class="ch-av"><div class="ch-meta"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><h2>'+(user.displayName||user.username)+'</h2>'+(user.monetized?'<span class="mon-badge">💰</span>':'')+'</div>'+(user.channelDesc?'<p style="color:#888;font-size:0.82rem;margin:4px 0">'+user.channelDesc+'</p>':'')+(user.channelLink?'<a href="'+user.channelLink+'" target="_blank" style="color:var(--cyan);font-size:0.8rem;margin:4px 0;display:block"><i class="fas fa-link" style="margin-right:4px"></i>'+user.channelLink+'</a>':'')+'<div class="ch-stats"><span><b>'+cnt.toLocaleString()+'</b> Subscribers</span><span><b>'+uvids.length+'</b> Videos</span><span><b>'+(user.totalVideoViews||0).toLocaleString()+'</b> Views</span></div>'+(isMe?'<div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-sm btn-o" onclick="Router.go(\'profile\')"><i class="fas fa-cog"></i> Edit</button><button class="btn btn-sm" onclick="VidSys.tab(\'upload\');Router.go(\'videos\')"><i class="fas fa-upload"></i> Upload</button></div>':'<div style="display:flex;gap:8px;margin-top:8px"><button class="vp-sub-btn'+(isSub?' on':'')+'" onclick="SubSys.toggle(\''+uid+'\');ChanSys.render(\''+uid+'\')"><i class="fas fa-'+(isSub?'bell-slash':'bell')+'"></i> '+(isSub?'Subscribed':'Subscribe')+'</button></div>')+'</div></div>';var ct=document.getElementById('chContent');if(!ct)return;if(tab==='videos'||tab==='shorts'){var fv=uvids.filter(function(v){return tab==='shorts'?isShorts(v):!isShorts(v);});if(!fv.length){ct.innerHTML='<p style="color:#888;text-align:center;padding:30px">No '+tab+' yet.</p>';return;}ct.innerHTML='';fv.forEach(function(v){ct.appendChild(makeVideoCard(v));});}else if(tab==='playlists'){if(!meData||!meData.playlists||!meData.playlists.length){ct.innerHTML='<p style="color:#888;text-align:center;padding:30px">No playlists yet.</p>';return;}ct.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px">';(meData.playlists||[]).forEach(function(pl){ct.innerHTML+='<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;cursor:pointer" onclick=""><div style="font-weight:700;margin-bottom:4px">'+pl.name+'</div><small style="color:#888">'+((pl.videos||[]).length)+' videos</small></div>';});}else if(tab==='about'){ct.innerHTML='<div style="padding:14px"><div class="card" style="margin:0 0 12px"><h3 style="margin-bottom:10px">About</h3><p style="color:#ccc;font-size:0.9rem">'+(user.channelDesc||'No description.')+'</p></div><div class="card" style="margin:0"><h3 style="margin-bottom:10px">Stats</h3><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:#888">Joined</span><span>'+new Date(user.joinedAt).toLocaleDateString('en-BD')+'</span></div><div style="display:flex;justify-content:space-between"><span style="color:#888">Total Views</span><span>'+(user.totalVideoViews||0).toLocaleString()+'</span></div><div style="display:flex;justify-content:space-between"><span style="color:#888">Videos</span><span>'+uvids.length+'</span></div>'+(user.channelLink?'<div style="display:flex;justify-content:space-between"><span style="color:#888">Website</span><a href="'+user.channelLink+'" target="_blank" style="color:var(--cyan)">'+user.channelLink+'</a></div>':'')+'</div></div></div>';}}
};

/* ===== MONETIZE SYSTEM ===== */
var MonSys={
  render:async function(){var el=document.getElementById('monetizeContent');if(!el)return;var u=S.me();if(!u||!u.id){el.innerHTML='<p style="color:#888;text-align:center;padding:30px">Please log in first.</p>';return;}el.innerHTML='<p style="color:#888;text-align:center;padding:30px"><i class="fas fa-spinner fa-spin"></i></p>';var ud=await DB.getUser(u.id);if(!ud){el.innerHTML='<p style="color:#888;text-align:center;padding:30px">Failed to load.</p>';return;}var coins=ud.coins||0,isM=ud.monetized,hp=ud.monetizeStatus==='Pending',vcr=_cfg.viewCoinRate||0.001;el.innerHTML='<div class="card mon-hero"><div class="mon-icon">'+(isM?'💰':'🚀')+'</div><h2 style="margin-bottom:6px">'+(isM?'You are Monetized!':'Unlock Monetization')+'</h2><p style="color:#888;font-size:0.85rem">'+(isM?'Earn real BDT from every view!':'Reach 10,000,000 coins to apply')+'</p></div>'+(!isM?'<div class="card"><div style="display:flex;justify-content:space-between;margin-bottom:7px"><span style="color:#888;font-size:0.83rem">Progress</span><span style="color:var(--gold);font-weight:700">'+coins.toLocaleString()+' / 10,000,000</span></div><div class="mon-bar"><div style="width:'+Math.min(100,(coins/10000000*100))+'%"></div></div><p style="color:#888;font-size:0.8rem;text-align:center;margin-top:7px">'+(coins>=10000000?'✅ Eligible! Apply now.':'Need '+(10000000-coins).toLocaleString()+' more coins')+'</p></div>':'')+'<div class="card"><h3 style="margin-bottom:12px">💎 Benefits</h3><div class="ben-item '+(isM?'on':'')+'"><i class="fas fa-coins"></i><div><b>Coin Earnings</b><small>'+vcr+' coin per view — always on</small></div></div><div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>BDT from Views</b><small>'+(isM?'Active!':'Unlocks after approval')+'</small></div></div><div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>Withdrawals</b><small>'+(isM?'Enabled!':'Only monetized users')+'</small></div></div><div class="ben-item '+(isM?'on':'lk')+'"><i class="fas fa-'+(isM?'check-circle':'lock')+'"></i><div><b>Creator Badge</b><small>'+(isM?'Shown on your channel':'After approval')+'</small></div></div></div>'+(!isM&&!hp?'<div style="padding:0 0 14px"><button class="btn btn-g" onclick="MonSys.apply()" '+(coins<10000000?'disabled style="opacity:0.5"':'')+'>Apply for Monetization</button></div>':'')+(hp?'<div class="card" style="text-align:center;padding:22px;color:var(--gold)"><i class="fas fa-clock" style="font-size:2rem;display:block;margin-bottom:10px"></i><b>Under Review</b><p style="color:#888;font-size:0.85rem;margin-top:5px">Admin will review within 48 hours.</p></div>':'')+(isM?'<div class="card"><h3 style="margin-bottom:12px">📊 Earnings</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="stat-box"><i class="fas fa-eye" style="color:var(--cyan)"></i><h3>'+(ud.totalVideoViews||0).toLocaleString()+'</h3><small>Total Views</small></div><div class="stat-box"><i class="fas fa-coins" style="color:gold"></i><h3>'+((ud.totalVideoViews||0)*vcr).toFixed(4)+'</h3><small>Coins from Views</small></div><div class="stat-box"><i class="fas fa-money-bill" style="color:var(--gold)"></i><h3>৳'+(ud.videoEarnings||0).toFixed(4)+'</h3><small>BDT Earned</small></div><div class="stat-box"><i class="fas fa-video" style="color:var(--purple)"></i><h3 id="mVCnt">--</h3><small>My Videos</small></div></div></div>':'');if(isM)DB.vids().then(function(vids){var e=document.getElementById('mVCnt');if(e)e.textContent=vids.filter(function(v){return v.uploaderId===u.id;}).length;});},
  apply:async function(){var u=S.me();if(!u)return;var ud=await DB.getUser(u.id);if((ud.coins||0)<10000000)return T('Need 10,000,000 coins!','error');await DB.uu(u.id,{monetizeStatus:'Pending'});MonSys.render();T('Application submitted!','success');}
};

/* ===== ADMIN ===== */
var Admin={
  init:async function(){if(sessionStorage.getItem('isAdmin')!=='true'){Router.go('auth');return;}Admin.renderOverview();Admin.tab('overview');var c=_cfg,set=function(id,v){var e=document.getElementById(id);if(e)e.value=v;},chk=function(id,v){var e=document.getElementById(id);if(e)e.checked=v;};set('cfCooldown',c.gameCooldown||24);set('cfSpin',c.spinCost||50);set('cfScratch',c.scratchCost||20);set('cfSlot',c.slotCost||100);set('cfMinWD',c.minWithdraw||200);set('cfRate',c.coinToBDT||0.01);set('cfRefBonus',c.referralBonus||500);set('cfRefReq',c.referralTasksReq||3);set('cfHomeAd',c.adCode||'');chk('cfMaint',!!c.maintenanceMode);chk('adEnabled',!!c.videoAdEnabled);set('adCode',c.videoAdCode||'');set('adSkip',c.adSkipTime||5);set('adFreq',c.adFrequency||1);chk('adUnskip',!!c.adUnskippable);set('adMidAt',c.adMidAt||30);set('viewRate',c.viewCoinRate||0.001);_selectedAdType=c.adType||'preroll';Admin._highlightAdType(_selectedAdType);},
  tab:function(t){document.querySelectorAll('.atab').forEach(function(b){b.classList.remove('active');});document.querySelectorAll('.atab-c').forEach(function(c){c.classList.add('hidden');});var btn=document.getElementById('tab-btn-'+t),con=document.getElementById('tab-'+t);if(btn)btn.classList.add('active');if(con)con.classList.remove('hidden');},
  renderOverview:async function(){var users=await DB.users(),wds=await DB.wds(),today=new Date().toDateString(),paid=wds.filter(function(w){return w.status==='Approved';}).reduce(function(s,w){return s+w.amt;},0),set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};set('aTU',users.length);set('aP',wds.filter(function(w){return w.status==='Pending';}).length);set('aA',wds.filter(function(w){return w.status==='Approved';}).length);set('aTP','৳'+paid.toFixed(2));set('aBan',users.filter(function(u){return u.isBanned;}).length);set('aNew',users.filter(function(u){return new Date(u.joinedAt).toDateString()===today;}).length);},
  wdList:async function(filter){filter=filter||'all';var l=document.getElementById('aWDList');if(!l)return;l.innerHTML='<p style="color:#888;text-align:center;padding:10px">Loading...</p>';var all=await DB.wds(),list=filter==='all'?all.slice().reverse():all.filter(function(w){return w.status===filter;}).reverse();if(!list.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No withdrawals found.</p>';return;}var ic={'bKash':'📱','Bank Transfer (BDT)':'🇧🇩','Bank Transfer (USD)':'🇺🇸'};l.innerHTML='';list.forEach(function(w){var sc=w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';var isBDT=w.currency==='BDT'||w.method==='bKash'||(!w.currency&&!w.amtUSD);var valStr=w.currency==='USD'?'$'+(w.amtUSD||w.amt||0).toFixed(4):'৳'+w.amt.toFixed(2);l.innerHTML+='<div class="awd-card"><div class="awd-info"><b>'+(ic[w.method]||'💸')+' '+w.username+'</b><span style="color:#888">'+w.method+' • '+(w.account||w.number||'')+'</span><span style="color:var(--gold)">'+valStr+'</span>'+(w.coinsDeducted?'<small style="color:#666">-'+w.coinsDeducted.toLocaleString()+' coins</small>':'')+'<small style="color:#555">'+new Date(w.id).toLocaleString('en-BD')+'</small></div><div class="awd-act"><span class="sbadge '+sc+'">'+w.status+'</span>'+(w.status==='Pending'?'<button class="btn btn-sm btn-g" onclick="Admin.procWD('+w.id+',\'Approved\')">✅</button><button class="btn btn-sm btn-r" onclick="Admin.procWD('+w.id+',\'Rejected\')">❌</button>':'')+'</div></div>';});},
  procWD:async function(wId,status){L.show('Processing...');var all=await DB.wds(),w=all.find(function(x){return x.id===wId;});if(!w){L.off();return;}if(status==='Rejected'&&w.status==='Pending'){var user=await DB.getUser(w.userId);if(user){var r={balance:(user.balance||0)+w.amt};if(w.coinsDeducted)r.coins=(user.coins||0)+w.coinsDeducted;await DB.uu(w.userId,r);}}await DB.updWD(wId,{status:status,processedAt:new Date().toISOString()});L.off();Admin.wdList('all');Admin.renderOverview();T('Withdrawal '+status,'success');},
  users:async function(search){search=search||'';var l=document.getElementById('aUserList');if(!l)return;l.innerHTML='<p style="color:#888;text-align:center;padding:10px">Loading...</p>';var users=await DB.users();if(search)users=users.filter(function(u){return u.username.toLowerCase().indexOf(search.toLowerCase())!==-1||(u.mobile||'').indexOf(search)!==-1;});if(!users.length){l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No users found.</p>';return;}l.innerHTML='';users.forEach(function(u){l.innerHTML+='<div class="au-card"><img src="'+u.avatar+'" style="width:38px;height:38px;border-radius:50%;border:2px solid var(--cyan);object-fit:cover"><div style="flex-grow:1;margin-left:10px"><b>'+(u.displayName||u.username)+(u.isBanned?' <span style="color:red">[BAN]</span>':'')+(u.monetized?' <span style="color:gold">💰</span>':'')+'</b><small style="color:#888;display:block">📱 '+u.mobile+' • @'+u.username+'</small><small style="color:#666">'+((u.coins||0).toLocaleString())+' coins | ৳'+(u.balance||0).toFixed(2)+'</small></div><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end"><button class="btn btn-sm '+(u.isBanned?'btn-g':'btn-r')+'" onclick="Admin.ban(\''+u.id+'\')">'+(u.isBanned?'Unban':'Ban')+'</button><button class="btn btn-sm btn-o" onclick="Admin.editBal(\''+u.id+'\')">Edit ৳</button></div></div>';});},
  editBal:async function(uid){var u=await DB.getUser(uid);if(!u)return;var v=prompt('Balance for '+(u.displayName||u.username)+'\nCurrent: ৳'+(u.balance||0).toFixed(2)+'\nNew value:');if(v===null)return;var n=parseFloat(v);if(isNaN(n)||n<0)return T('Invalid','error');await DB.uu(uid,{balance:n});Admin.users();T('Updated','success');},
  ban:async function(id){var u=await DB.getUser(id);if(!u)return;await DB.uu(id,{isBanned:!u.isBanned});Admin.users();Admin.renderOverview();T((u.isBanned?'Unbanned: ':'Banned: ')+(u.displayName||u.username),u.isBanned?'success':'warning');},
  renderTasks:async function(){var l=document.getElementById('aTaskList');if(!l)return;var ts=await DB.tasks();if(!ts.length){l.innerHTML='<p style="color:#888;text-align:center">No tasks.</p>';return;}l.innerHTML='';ts.forEach(function(t){l.innerHTML+='<div class="at-item"><img src="'+(t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:34px;height:34px;border-radius:8px" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'"><div style="flex-grow:1;margin-left:10px"><b>'+t.title+'</b><small style="color:#888;display:block">Reward: '+t.reward+' Coins</small></div><button class="btn btn-sm btn-r" onclick="Admin.delTask(\''+t.id+'\')">🗑️</button></div>';});},
  addTask:async function(){var title=document.getElementById('tTitle').value.trim(),reward=parseInt(document.getElementById('tReward').value),link=document.getElementById('tLink').value.trim(),icon=document.getElementById('tIcon').value.trim();if(!title)return T('Title required','warning');if(!reward||reward<1)return T('Valid reward required','warning');var id='t_'+Date.now();await DB.w('tasks/'+id,{id:id,title:title,reward:reward,type:'link',icon:icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png',link:link||'#'});['tTitle','tReward','tLink','tIcon'].forEach(function(eid){var e=document.getElementById(eid);if(e)e.value='';});Admin.renderTasks();T('Task created!','success');},
  delTask:async function(id){if(!confirm('Delete?'))return;await DB.del('tasks/'+id);Admin.renderTasks();T('Deleted','info');},
  saveConfig:async function(){var gn=function(id,def){var e=document.getElementById(id);return e?(parseFloat(e.value)||def):def;},upd={gameCooldown:gn('cfCooldown',24),spinCost:gn('cfSpin',50),scratchCost:gn('cfScratch',20),slotCost:gn('cfSlot',100),minWithdraw:gn('cfMinWD',200),coinToBDT:gn('cfRate',0.01),referralBonus:gn('cfRefBonus',500),referralTasksReq:gn('cfRefReq',3)};var ad=document.getElementById('cfHomeAd');if(ad)upd.adCode=ad.value;var mn=document.getElementById('cfMaint');if(mn)upd.maintenanceMode=mn.checked;await DB.u('config',upd);_cfg=Object.assign({},_cfg,upd);T('Saved!','success');},
  export:async function(){var users=await DB.users(),csv=['Username,Mobile,Balance,Coins,Tasks,Joined,Banned,Monetized'].concat(users.map(function(u){return u.username+','+u.mobile+','+(u.balance||0).toFixed(2)+','+(u.coins||0)+','+(u.tasksCompleted||0)+','+new Date(u.joinedAt).toLocaleDateString()+','+u.isBanned+','+(u.monetized||false);})).join('\n'),a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(csv);a.download='taskmint_users.csv';a.click();T('Exported!','success');},
  reset:async function(){if(!confirm('DELETE ALL DATA?'))return;if(prompt('Type RESET:')!=='RESET')return;await Promise.all([DB.w('users',null),DB.w('withdrawals',null),DB.w('videos',null),DB.w('tasks',null),DB.w('comments',null)]);T('Cleared!','info');setTimeout(function(){location.reload();},1500);},
  vidList:async function(){var l=document.getElementById('aVidList'),ce=document.getElementById('aVidCnt');if(!l)return;var vids=await DB.vids();if(ce)ce.textContent=vids.length+' video'+(vids.length!==1?'s':'');if(!vids.length){l.innerHTML='<p style="color:#888;text-align:center;padding:14px">No videos yet.</p>';return;}l.innerHTML='';vids.forEach(function(v){var vid=ytId(v.url||''),th=v.thumbnail||(vid?'https://img.youtube.com/vi/'+vid+'/mqdefault.jpg':'');l.innerHTML+='<div class="av-item"><img src="'+th+'" style="width:78px;height:48px;object-fit:cover;border-radius:7px;flex-shrink:0" onerror="this.style.background=\'#1a1a2e\'"><div style="flex-grow:1;margin-left:10px;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+v.title+'</b><small style="color:#888">'+(v.uploaderId?'👤 '+v.uploaderName:'Admin')+' • 👁 '+(v.views||0).toLocaleString()+' • ❤️ '+(v.likes||0)+'</small></div><button class="btn btn-sm btn-r" onclick="Admin.delVid(\''+v.id+'\')" style="flex-shrink:0;margin-left:8px">🗑️</button></div>';});},
  addVid:async function(){var title=document.getElementById('vTitle').value.trim(),url=document.getElementById('vUrl').value.trim(),dur=parseInt(document.getElementById('vDur').value)||30,cat=document.getElementById('vCat').value,th=document.getElementById('vThumb').value.trim();if(!title)return T('Title required','warning');if(!url)return T('YouTube URL required','warning');var vid=ytId(url);if(!vid)return T('Invalid YouTube URL','error');await DB.saveVid({id:'v_'+Date.now(),title:title,url:vid,category:cat||'Other',watchDuration:dur,thumbnail:th,views:0,likes:0,dislikes:0,addedAt:new Date().toISOString()});['vTitle','vUrl','vDur','vThumb'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});Admin.vidList();T('Video added!','success');},
  delVid:async function(id){if(!confirm('Delete?'))return;await DB.delVid(id);Admin.vidList();T('Deleted','info');},
  _highlightAdType:function(type){['preroll','midroll','overlay','all'].forEach(function(t){var el=document.getElementById('adType'+t.charAt(0).toUpperCase()+t.slice(1));if(el)el.classList.toggle('selected',t===type);});},
  setAdType:function(type){_selectedAdType=type;Admin._highlightAdType(type);},
  saveAds:async function(){var en=document.getElementById('adEnabled'),code=document.getElementById('adCode'),usk=document.getElementById('adUnskip'),gi=function(id,def){var e=document.getElementById(id);return e?(parseInt(e.value)||def):def;},upd={videoAdEnabled:en?en.checked:false,videoAdCode:code?code.value:'',adSkipTime:gi('adSkip',5),adFrequency:gi('adFreq',1),adUnskippable:usk?usk.checked:false,adType:_selectedAdType,adMidAt:gi('adMidAt',30)};await DB.u('config',upd);_cfg=Object.assign({},_cfg,upd);T('Ad settings saved!','success');},
  saveViewRate:async function(){var e=document.getElementById('viewRate');if(!e)return;var r=parseFloat(e.value)||0.001;await DB.u('config',{viewCoinRate:r});_cfg.viewCoinRate=r;T('View coin rate saved!','success');},
  monetizeList:async function(){var l=document.getElementById('aMonList');if(!l)return;var users=await DB.users(),pend=users.filter(function(u){return u.monetizeStatus==='Pending';}),appr=users.filter(function(u){return u.monetized===true;});if(!pend.length&&!appr.length){l.innerHTML='<p style="color:#888;text-align:center;padding:14px">No requests.</p>';return;}l.innerHTML='';pend.forEach(function(u){l.innerHTML+='<div class="au-card"><img src="'+u.avatar+'" style="width:38px;height:38px;border-radius:50%;border:2px solid gold;object-fit:cover"><div style="flex-grow:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span style="color:gold;font-size:0.78rem">[PENDING]</span></b><small style="color:#888;display:block">'+((u.coins||0).toLocaleString())+' coins</small></div><div style="display:flex;gap:5px;flex-direction:column;align-items:flex-end"><button class="btn btn-sm btn-g" onclick="Admin.approveM(\''+u.id+'\')">✅ Approve</button><button class="btn btn-sm btn-r" onclick="Admin.rejectM(\''+u.id+'\')">❌ Reject</button></div></div>';});if(appr.length){l.innerHTML+='<p style="color:var(--gold);margin:10px 0 5px;font-size:0.83rem">✅ Monetized</p>';appr.forEach(function(u){l.innerHTML+='<div class="au-card" style="border:1px solid rgba(255,215,0,0.2)"><img src="'+u.avatar+'" style="width:38px;height:38px;border-radius:50%;border:2px solid var(--gold);object-fit:cover"><div style="flex-grow:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span class="mon-badge">💰</span></b><small style="color:#888;display:block">Views: '+(u.totalVideoViews||0).toLocaleString()+' • ৳'+(u.videoEarnings||0).toFixed(4)+'</small></div><button class="btn btn-sm btn-r btn-o" onclick="Admin.revokeM(\''+u.id+'\')">Revoke</button></div>';});}},
  approveM:async function(uid){await DB.uu(uid,{monetized:true,monetizeStatus:'Approved'});Admin.monetizeList();T('Approved! 💰','success');},
  rejectM:async function(uid){await DB.uu(uid,{monetizeStatus:'Rejected'});Admin.monetizeList();T('Rejected','info');},
  revokeM:async function(uid){if(!confirm('Revoke?'))return;await DB.uu(uid,{monetized:false,monetizeStatus:null});Admin.monetizeList();T('Revoked','warning');}
};

/* ===== INIT — moved to bottom ===== */

/* ================================================================
   ULTRA ADVANCED VIDEO + AD SYSTEM — Beyond YouTube
   ================================================================ */

/* ---------- AD SYSTEM (AdSys) ---------- */
var AdSys = {
  _pendVid: null,
  _skipTime: 5,
  _timer: null,
  _coinReward: 2,
  _cardUrl: null,

  play: function(videoId) {
    var cfg = _cfg;
    _adPlays++;
    var freq = cfg.adFrequency || 1;
    var show = cfg.videoAdEnabled && cfg.videoAdCode && (_adPlays % freq === 0);
    if (show) {
      AdSys._pendVid = videoId;
      AdSys._show(cfg.videoAdCode, cfg.adSkipTime || 5, cfg.adUnskippable || false, cfg.adType || 'preroll');
    } else {
      AdSys._launch(videoId);
    }
  },

  _show: function(code, skip, unskip, type) {
    var ov = document.getElementById('adOverlay');
    if (!ov) { AdSys.skip(); return; }
    ov.classList.remove('hidden');

    /* coin reward */
    var cb = document.getElementById('adCoinBadge');
    var ca = document.getElementById('adCoinAmt');
    var coins = AdSys._coinReward || 2;
    if (cb) { cb.style.display = 'flex'; }
    if (ca) ca.textContent = coins;

    /* type badge */
    var tb = document.getElementById('adTypeBadge');
    var types = {preroll:'Pre-roll',midroll:'Mid-roll',bumper:'Bumper Ad',overlay:'Overlay'};
    if (tb) tb.textContent = types[type] || 'Pre-roll';

    /* inject ad content */
    var inner = document.getElementById('adInner');
    if (inner) {
      inner.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center';
      wrap.innerHTML = code;
      inner.appendChild(wrap);
      wrap.querySelectorAll('script').forEach(function(o) {
        var n = document.createElement('script');
        Array.from(o.attributes).forEach(function(a) { n.setAttribute(a.name, a.value); });
        n.textContent = o.textContent;
        o.parentNode.replaceChild(n, o);
      });
    }

    /* skip button */
    var skipBtn = document.getElementById('adSkipBtn');
    var skipTxt = document.getElementById('adSkipTxt');
    var skipIcon = document.getElementById('adSkipIcon');
    if (skipBtn) {
      skipBtn.classList.remove('hidden');
      skipBtn.classList.add('locked');
      skipBtn.style.display = 'flex';
    }

    /* bumper */
    var bTimer = document.getElementById('bumperTimer');
    if (type === 'bumper') {
      if (bTimer) bTimer.classList.remove('hidden');
      if (skipBtn) skipBtn.classList.add('hidden');
    } else {
      if (bTimer) bTimer.classList.add('hidden');
    }

    /* countdown */
    var fill = document.getElementById('adFill');
    var txt = document.getElementById('adCountdown');
    var old = document.getElementById('adTxt');
    var bumperSecs = document.getElementById('bumperSecs');
    var left = (type === 'bumper') ? 6 : skip;
    var total = left;
    if (txt) txt.textContent = left + 's';
    if (old) old.textContent = left;
    if (fill) fill.style.width = '100%';

    clearInterval(AdSys._timer);
    AdSys._timer = setInterval(function() {
      left--;
      var pct = Math.max(0, (left / total) * 100);
      if (fill) fill.style.width = pct + '%';
      if (txt) txt.textContent = left + 's';
      if (old) old.textContent = left;
      if (bumperSecs) bumperSecs.textContent = left;
      if (type === 'bumper' && left <= 0) {
        clearInterval(AdSys._timer);
        AdSys._giveCoins();
        AdSys.skip();
        return;
      }
      if (left <= 0 && !unskip) {
        clearInterval(AdSys._timer);
        if (skipBtn) {
          skipBtn.classList.remove('locked');
          var st = document.getElementById('adSkipTxt'); if(st) st.style.display='none';
          if (skipIcon) skipIcon.style.display = '';
        }
        var vb = document.getElementById('adVisitBtn'); if(vb) vb.classList.remove('hidden');
        AdSys._giveCoins();
      }
      if (left <= 0 && unskip) {
        clearInterval(AdSys._timer);
        AdSys._giveCoins();
        AdSys.skip();
      }
      /* show skip after skip time */
      if (!unskip && left === (total - skip) && left > 0) {
        /* already handled above */
      }
    }, 1000);
  },

  _giveCoins: async function() {
    var u = S.me();
    if (!u) return;
    var coins = AdSys._coinReward || 2;
    try {
      await DB.uu(u.id, { coins: ((_me && _me.coins) || 0) + coins });
      _me = Object.assign({}, _me, { coins: ((_me && _me.coins) || 0) + coins });
      S.set(_me);
      T('+' + coins + ' coins for watching ad! 🪙', 'success');
    } catch(e) {}
  },

  skip: function() {
    clearInterval(AdSys._timer);
    var ov = document.getElementById('adOverlay');
    if (ov) ov.classList.add('hidden');
    var inner = document.getElementById('adInner');
    if (inner) inner.innerHTML = '';
    if (AdSys._pendVid) {
      AdSys._launch(AdSys._pendVid);
      AdSys._pendVid = null;
    } else if (VidSys._adCb) {
      VidSys._adCb();
      VidSys._adCb = null;
    }
  },

  _launch: async function(videoId) {
    var v = _allVids.find(function(x){return x.id===videoId;});
    if (!v) {
      var all = await DB.vids(); _allVids = all;
      v = all.find(function(x){return x.id===videoId;});
    }
    if (v) VidSys._startPlayer(v, S.me());
  },

  visitAd: function() {
    if (AdSys._cardUrl) window.open(AdSys._cardUrl, '_blank');
  },

  visitCardboard: function() {
    if (AdSys._cardUrl) window.open(AdSys._cardUrl, '_blank');
  },

  closeOverlay: function() {
    var ob = document.getElementById('adOverlayBanner');
    if (ob) ob.classList.add('hidden');
  },

  whyAd: function() {
    T('Ads keep TaskMint Pro free. You earn coins for watching! 🪙', 'info');
  }
};

/* Override VidSys.open to use AdSys */
VidSys.open = async function(videoId) {
  var u = S.me();
  if (!u) return T('Login to watch videos', 'warning');
  if (!_allVids.length) {
    var all = await DB.vids(); _allVids = all;
  }
  AdSys.play(videoId);
};

/* Also override VidSys.skipAd */
VidSys.skipAd = function() { AdSys.skip(); };

/* ---------- SHARE SYSTEM ---------- */
VidSys.share = function() {
  var v = VidSys._vid; if (!v) return;
  var url = window.location.href.split('?')[0] + '?v=' + v.id;
  var sheet = document.getElementById('shareSheet');
  var su = document.getElementById('shareUrl');
  var st = document.getElementById('shareVideoTitle');
  if (su) su.textContent = url;
  if (st) st.textContent = v.title;
  if (sheet) sheet.classList.remove('hidden');
};

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
    sms:      'sms:?body=' + encodeURIComponent(text),
    embed:    null,
    copy:     null,
    native:   null
  };
  if (platform === 'copy') {
    safeCopy(url);
    document.getElementById('shareSheet').classList.add('hidden');
    return;
  }
  if (platform === 'embed') {
    var embed = '<iframe src="' + url + '" width="560" height="315" frameborder="0" allowfullscreen></iframe>';
    safeCopy(embed);
    document.getElementById('shareSheet').classList.add('hidden');
    return;
  }
  if (platform === 'native') {
    safeShare(title,text,url);
    document.getElementById('shareSheet').classList.add('hidden');
    return;
  }
  if (map[platform]) {
    window.open(map[platform], '_blank');
    document.getElementById('shareSheet').classList.add('hidden');
  }
};

/* ---------- REPORT SYSTEM ---------- */
VidSys.report = function() {
  var u = S.me(); if (!u) return T('Login to report', 'warning');
  document.getElementById('reportModal').classList.remove('hidden');
};

VidSys.submitReport = async function(reason) {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  var report = {
    id: 'rp_' + Date.now(),
    videoId: v.id, videoTitle: v.title,
    reportedBy: u.id, reporterName: u.username,
    reason: reason,
    createdAt: new Date().toISOString()
  };
  try {
    await firebase.database().ref('reports/' + report.id).set(report);
  } catch(e) {}
  document.getElementById('reportModal').classList.add('hidden');
  T('Report submitted. Thank you! 🙏', 'success');
};

/* ---------- EMOJI REACTIONS ---------- */
VidSys.react = async function(emoji) {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  var path = 'reactions/' + v.id + '/' + emoji;
  var data = await DB.r(path);
  var users = (data && data.users) ? data.users : [];
  var idx = users.indexOf(u.id);
  if (idx !== -1) {
    users.splice(idx, 1);
  } else {
    users.push(u.id);
  }
  try {
    await firebase.database().ref(path).set({count: users.length, users: users});
  } catch(e) {}
  /* update UI */
  var rc = document.getElementById('rc-' + emoji);
  var rb = document.getElementById('rr-' + emoji);
  if (rc) rc.textContent = users.length;
  if (rb) {
    if (idx === -1) rb.classList.add('active'); else rb.classList.remove('active');
  }
};

VidSys._loadReactions = async function(videoId) {
  var emojis = ['fire','love','wow','haha'];
  var u = S.me();
  for (var i=0; i<emojis.length; i++) {
    var em = emojis[i];
    try {
      var data = await DB.r('reactions/' + videoId + '/' + em);
      var count = (data && data.count) ? data.count : 0;
      var users = (data && data.users) ? data.users : [];
      var rc = document.getElementById('rc-' + em);
      var rb = document.getElementById('rr-' + em);
      if (rc) rc.textContent = count;
      if (rb && u && users.indexOf(u.id) !== -1) rb.classList.add('active');
      else if (rb) rb.classList.remove('active');
    } catch(e) {}
  }
};

/* ---------- SUPER CHAT ---------- */
VidSys._scAmt = 20;
VidSys.scSelect = function(btn, amt) {
  document.querySelectorAll('.sc-amt-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  VidSys._scAmt = amt;
};

VidSys.sendSuperChat = async function() {
  var v = VidSys._vid; if (!v) return;
  var u = S.me(); if (!u) return;
  var msg = document.getElementById('scMessage');
  if (!msg || !msg.value.trim()) return T('Write a message first', 'warning');
  var amt = VidSys._scAmt || 20;
  var ud = await DB.getUser(u.id);
  if ((ud.coins||0) < amt) return T('Not enough coins!', 'error');
  var sc = {
    id: 'sc_' + Date.now(),
    userId: u.id, username: ud.displayName||ud.username,
    avatar: ud.avatar||'', message: msg.value.trim(),
    amount: amt, color: amt>=500?'red':amt>=200?'gold':amt>=100?'green':'blue',
    createdAt: new Date().toISOString()
  };
  L.show('Sending Super Chat...');
  try {
    await firebase.database().ref('superchats/' + v.id + '/' + sc.id).set(sc);
    await DB.uu(u.id, {coins:(ud.coins||0)-amt});
    _me = Object.assign({},_me,{coins:(_me.coins||0)-amt});
    S.set(_me);
    /* give 80% to uploader */
    if (v.uploaderId && v.uploaderId !== u.id) {
      var up = await DB.getUser(v.uploaderId);
      if (up) {
        var earn = Math.floor(amt * 0.8);
        await DB.uu(v.uploaderId, {coins:(up.coins||0)+earn});
        VidSys._notify(v.uploaderId, {
          type:'superchat',
          text: (ud.displayName||ud.username) + ' sent a ' + amt + '-coin Super Chat!',
          avatar: ud.avatar||'', thumb:'', time:new Date().toISOString(), unread:true
        });
      }
    }
    L.off();
    document.getElementById('superChatModal').classList.add('hidden');
    msg.value = '';
    T('Super Chat sent! ⭐ Creator gets ' + Math.floor(amt*0.8) + ' coins!', 'success');
  } catch(e) {
    L.off();
    T('Failed. Try again.', 'error');
  }
};

/* ---------- MINI PLAYER ---------- */
VidSys._miniActive = false;

VidSys.toggleMini = function() {
  var v = VidSys._vid; if (!v) return;
  var mp = document.getElementById('miniPlayer');
  var mf = document.getElementById('miniFrame');
  var mt = document.getElementById('miniTitle');
  var ov = document.getElementById('vpOverlay');
  if (!mp) return;
  if (VidSys._miniActive) {
    VidSys.expandMini();
    return;
  }
  var vid = ytId(v.url||'');
  if (!vid) return T('Mini player only works with YouTube videos', 'info');
  if (mf) mf.innerHTML = '<iframe src="https://www.youtube.com/embed/'+vid+'?autoplay=1&rel=0" frameborder="0" allow="autoplay" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%"></iframe>';
  if (mt) mt.textContent = v.title;
  mp.classList.add('show');
  VidSys._miniActive = true;
  if (ov) ov.classList.add('hidden');
};

VidSys.expandMini = function() {
  var mp = document.getElementById('miniPlayer');
  var ov = document.getElementById('vpOverlay');
  if (mp) mp.classList.remove('show');
  VidSys._miniActive = false;
  if (ov) ov.classList.remove('hidden');
};

VidSys.closeMini = function() {
  var mp = document.getElementById('miniPlayer');
  var mf = document.getElementById('miniFrame');
  if (mp) mp.classList.remove('show');
  if (mf) mf.innerHTML = '';
  VidSys._miniActive = false;
  VidSys.close();
};

/* ---------- CLIP / SCREENSHOT ---------- */
VidSys.clip = function() {
  /* create flash effect */
  var flash = document.createElement('div');
  flash.className = 'clip-flash';
  document.body.appendChild(flash);
  setTimeout(function(){ flash.remove(); }, 400);
  var v = VidSys._vid;
  if (v) T('Clip captured! 📸 (Feature: share your favourite moment)', 'success');
};

/* ---------- CHAPTERS ---------- */
VidSys._loadChapters = function(video) {
  var wrap = document.getElementById('vpChaptersWrap');
  var list = document.getElementById('vpChaptersList');
  if (!wrap || !list) return;
  var chapters = video.chapters;
  if (!chapters || !chapters.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  list.innerHTML = '';
  chapters.forEach(function(ch, i) {
    var div = document.createElement('div');
    div.className = 'chapter-item' + (i===0?' active':'');
    div.innerHTML = '<span class="chapter-time">' + ch.time + '</span><span class="chapter-name">' + ch.name + '</span>';
    div.onclick = function() {
      document.querySelectorAll('.chapter-item').forEach(function(x){x.classList.remove('active');});
      div.classList.add('active');
      T('Chapter: ' + ch.name, 'info');
    };
    list.appendChild(div);
  });
};

/* ---------- POLL SYSTEM ---------- */
VidSys._loadPoll = async function(videoId) {
  var wrap = document.getElementById('vpPollWrap');
  if (!wrap) return;
  try {
    var poll = await DB.r('polls/' + videoId);
    if (!poll) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    var q = document.getElementById('vpPollQ');
    var opts = document.getElementById('vpPollOpts');
    var vots = document.getElementById('vpPollVotes');
    if (q) q.textContent = poll.question;
    if (!opts) return;
    var u = S.me();
    var totalVotes = 0;
    (poll.options||[]).forEach(function(o){ totalVotes += (o.votes||0); });
    opts.innerHTML = '';
    (poll.options||[]).forEach(function(o, idx) {
      var pct = totalVotes > 0 ? Math.round((o.votes||0)/totalVotes*100) : 0;
      var voted = poll.votedBy && u && (poll.votedBy[u.id] === idx);
      var div = document.createElement('div');
      div.className = 'poll-opt' + (voted?' voted':'');
      div.innerHTML = '<div class="poll-fill" style="width:'+pct+'%"></div>' +
        '<span class="poll-opt-label">'+o.text+'</span>' +
        '<span class="poll-pct">'+pct+'%</span>';
      div.onclick = function() { VidSys._votePoll(videoId, idx, poll); };
      opts.appendChild(div);
    });
    if (vots) vots.textContent = totalVotes.toLocaleString() + ' votes';
  } catch(e) {
    var wrap2 = document.getElementById('vpPollWrap');
    if (wrap2) wrap2.classList.add('hidden');
  }
};

VidSys._votePoll = async function(videoId, optIdx, poll) {
  var u = S.me(); if (!u) return T('Login to vote', 'warning');
  if (poll.votedBy && poll.votedBy[u.id] !== undefined) return T('Already voted!', 'info');
  var opts = (poll.options||[]).slice();
  opts[optIdx] = Object.assign({}, opts[optIdx], {votes:(opts[optIdx].votes||0)+1});
  var vb = poll.votedBy || {};
  vb[u.id] = optIdx;
  try {
    await firebase.database().ref('polls/'+videoId).update({options:opts, votedBy:vb});
    poll.options = opts; poll.votedBy = vb;
    VidSys._loadPoll(videoId);
    T('Vote counted! 🗳️', 'success');
  } catch(e) {}
};

/* ---------- AUTOPLAY ---------- */
VidSys._autoplayTimer = null;
VidSys._autoplaySecs = 5;

VidSys._startAutoplay = function() {
  var v = VidSys._vid;
  if (!v || !_allVids.length) return;
  var rel = _allVids.filter(function(x){ return x.id !== v.id && x.category === v.category; });
  if (!rel.length) rel = _allVids.filter(function(x){ return x.id !== v.id; });
  if (!rel.length) return;
  var next = rel[0];
  var ov = document.getElementById('ytVF');
  if (!ov) return;
  var div = document.createElement('div');
  div.className = 'autoplay-overlay';
  div.id = 'autoplayOv';
  var secs = VidSys._autoplaySecs;
  div.innerHTML = '<div class="autoplay-circle" id="autoplaySecs">'+secs+'</div>' +
    '<p style="color:#ddd;font-size:0.9rem">Up Next: <b>'+(next.title||'')+'</b></p>' +
    '<button class="autoplay-cancel" onclick="VidSys._cancelAutoplay()">Cancel</button>';
  ov.style.position = 'relative';
  ov.appendChild(div);
  clearInterval(VidSys._autoplayTimer);
  VidSys._autoplayTimer = setInterval(function() {
    secs--;
    var el = document.getElementById('autoplaySecs');
    if (el) el.textContent = secs;
    if (secs <= 0) {
      clearInterval(VidSys._autoplayTimer);
      var aov = document.getElementById('autoplayOv');
      if (aov) aov.remove();
      VidSys.open(next.id);
    }
  }, 1000);
};

VidSys._cancelAutoplay = function() {
  clearInterval(VidSys._autoplayTimer);
  var aov = document.getElementById('autoplayOv');
  if (aov) aov.remove();
};

/* ---------- LIKE / DISLIKE + RATING BAR ---------- */
VidSys._updateRatingBar = function(likes, dislikes) {
  var bar = document.getElementById('vpRatingBar');
  var fill = document.getElementById('vpRatingFill');
  var total = (likes||0) + (dislikes||0);
  if (!total) { if(bar) bar.style.display='none'; return; }
  if (bar) bar.style.display = 'block';
  var pct = Math.round((likes||0)/total*100);
  if (fill) fill.style.width = pct + '%';
};

/* Extend _startPlayer to load reactions, poll, chapters */
var _origSP = VidSys._startPlayer.bind(VidSys);
VidSys._startPlayer = async function(video, u) {
  await _origSP(video, u);
  VidSys._loadReactions(video.id);
  VidSys._loadPoll(video.id);
  VidSys._loadChapters(video);
  VidSys._updateRatingBar(video.likes, video.dislikes);
  /* reset reaction btns */
  ['fire','love','wow','haha'].forEach(function(e){ var rb=document.getElementById('rr-'+e); if(rb)rb.classList.remove('active'); });
  /* set share url in sheet */
  var su = document.getElementById('shareUrl');
  if (su) su.textContent = window.location.href.split('?')[0] + '?v=' + video.id;
};

/* after watch complete, start autoplay */
var _origRunTimer = VidSys._runTimer.bind(VidSys);
VidSys._runTimer = function() {
  _origRunTimer();
};

/* Patch claim to start autoplay */
var _origClaim = VidSys.claim.bind(VidSys);
VidSys.claim = async function() {
  await _origClaim();
  setTimeout(function(){ VidSys._startAutoplay(); }, 500);
};

/* ---------- ADMIN POLL CREATION (for channel owners) ---------- */
VidSys.createPoll = async function(videoId, question, options) {
  var poll = {
    question: question,
    options: options.map(function(o){ return {text:o, votes:0}; }),
    votedBy: {},
    createdAt: new Date().toISOString()
  };
  try {
    await firebase.database().ref('polls/'+videoId).set(poll);
    T('Poll created!', 'success');
  } catch(e) { T('Failed', 'error'); }
};

/* sc-amt-btn style injection */
(function(){
  var style = document.createElement('style');
  style.textContent = '.sc-amt-btn{background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#ddd;border-radius:8px;padding:8px;font-size:0.82rem;cursor:pointer;transition:.2s;}.sc-amt-btn.active{background:rgba(255,215,0,0.15);border-color:#ffd700;color:#ffd700;font-weight:700;}';
  document.head.appendChild(style);
})();

/* ================================================================
   VIDEO COIN SYSTEM — Complete Fix
   Uploader পাবে: upload bonus + per view coins
   Viewer পাবে: প্রতিটি ভিডিও watch করলে coins
   ================================================================ */

/* Default config তে upload bonus যোগ করি */
DC.uploadBonus     = 50;   /* প্রতি upload এ coins */
DC.viewerCoinRate  = 1;    /* viewer প্রতি watch এ coins */
DC.viewCoinRate    = 5;    /* uploader প্রতি view এ coins */

/* Override VidSys.claim — সঠিক coin system */
VidSys.claim = async function() {
  if (VidSys._claimed) return;
  var video = VidSys._vid; if (!video) return;
  VidSys._claimed = true;
  var u = S.me(); if (!u) return;
  L.show('Registering view...');
  try {
    var ud = await DB.getUser(u.id);
    var viewerCoins = _cfg.viewerCoinRate || DC.viewerCoinRate;
    var uploaderCoins = _cfg.viewCoinRate || DC.viewCoinRate;

    /* ===== VIEWER পাবে ===== */
    var hist = (ud.videoHistory || []).slice();
    /* already watched check */
    var alreadyWatched = hist.some(function(h){ return h.vid === video.id; });
    hist.push({ vid:video.id, title:video.title, watchedAt:new Date().toISOString() });
    if (hist.length > 200) hist = hist.slice(-200);

    var viewerUpdate = { videoHistory: hist };
    if (!alreadyWatched) {
      viewerUpdate.coins = (ud.coins || 0) + viewerCoins;
      _me = Object.assign({}, _me, { coins: (_me.coins || 0) + viewerCoins });
      S.set(_me);
    }
    await DB.uu(u.id, viewerUpdate);

    /* ===== VIDEO view count বাড়াও ===== */
    await DB.u('videos/' + video.id, { views: (video.views || 0) + 1 });

    /* ===== UPLOADER পাবে (নিজের ভিডিও দেখলে না) ===== */
    if (video.uploaderId && video.uploaderId !== u.id) {
      var up = await DB.getUser(video.uploaderId);
      if (up) {
        var upUpdate = {
          coins: (up.coins || 0) + uploaderCoins,
          totalVideoViews: (up.totalVideoViews || 0) + 1
        };
        if (up.monetized) {
          var bdtEarned = uploaderCoins * (_cfg.coinToBDT || 0.01);
          upUpdate.balance = (up.balance || 0) + bdtEarned;
          upUpdate.videoEarnings = (up.videoEarnings || 0) + bdtEarned;
        }
        await DB.uu(video.uploaderId, upUpdate);
        /* Notify uploader */
        VidSys._notify(video.uploaderId, {
          type: 'view',
          text: (u.displayName || u.username) + ' watched your video "' + video.title + '" — +' + uploaderCoins + ' coins!',
          avatar: u.avatar || '',
          thumb:  video.thumbnail || '',
          time:   new Date().toISOString(),
          unread: true
        });
      }
    }

    L.off();
    UI.sync();

    /* Show toast with earnings */
    var msg = '✅ View counted!';
    if (!alreadyWatched) msg += ' You got +' + viewerCoins + ' coins! 🪙';
    if (video.uploaderId && video.uploaderId !== u.id) msg += ' Creator got +' + uploaderCoins + ' coins!';
    T(msg, 'success');

    /* Autoplay next */
    setTimeout(function(){ VidSys._startAutoplay(); }, 600);

  } catch(e) {
    L.off();
    VidSys.close();
    T('View counted!', 'success');
  }
};

/* Override VidSys upload — upload bonus দাও */
var _origUpload = VidSys.upload ? VidSys.upload.bind(VidSys) : null;

VidSys.upload = async function() {
  var fi    = document.getElementById('upFile');
  var title = document.getElementById('upTitle') ? document.getElementById('upTitle').value.trim() : '';
  var desc  = document.getElementById('upDesc')  ? document.getElementById('upDesc').value.trim()  : '';
  var tags  = document.getElementById('upTags')  ? document.getElementById('upTags').value.trim()  : '';
  var cat   = document.getElementById('upCat')   ? document.getElementById('upCat').value           : 'General';
  var u     = S.me(); if (!u) return;

  if (!title)               return T('Enter video title', 'warning');
  if (!fi || !fi.files || !fi.files[0]) return T('Select a video file', 'warning');
  var file = fi.files[0];
  if (!file.type.startsWith('video/')) return T('Invalid video file', 'error');

  var btn = document.getElementById('upBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'; }

  var reader = new FileReader();
  reader.onload = function(e) {
    var vel = document.createElement('video');
    vel.src = e.target.result;
    vel.currentTime = 1;
    vel.onloadeddata = async function() {
      var canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d').drawImage(vel, 0, 0, 320, 180);
      var thumb = canvas.toDataURL('image/jpeg', 0.7);
      L.show('Saving video...');
      try {
        var cu = S.me();
        var vid = {
          id: 'v_' + Date.now(),
          title: title, description: desc, tags: tags, category: cat,
          uploaderId: cu.id, uploaderName: cu.username,
          uploaderDisplayName: cu.displayName || cu.username,
          uploaderAvatar: cu.avatar || '',
          uploaderMonetized: cu.monetized || false,
          videoData: e.target.result,
          thumbnail: thumb,
          watchDuration: 15,
          views: 0, likes: 0, dislikes: 0,
          addedAt: new Date().toISOString()
        };
        await DB.saveVid(vid);

        /* ===== UPLOAD BONUS ===== */
        var bonus = _cfg.uploadBonus || DC.uploadBonus || 50;
        var ud = await DB.getUser(cu.id);
        await DB.uu(cu.id, { coins: (ud.coins || 0) + bonus });
        _me = Object.assign({}, _me, { coins: (_me.coins || 0) + bonus });
        S.set(_me);
        UI.sync();

        L.off();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Upload Video'; }

        /* Clear form */
        if (document.getElementById('upTitle')) document.getElementById('upTitle').value = '';
        if (document.getElementById('upDesc'))  document.getElementById('upDesc').value  = '';
        if (document.getElementById('upTags'))  document.getElementById('upTags').value  = '';
        fi.value = '';
        var prev = document.getElementById('upPrev'); if (prev) prev.classList.add('hidden');

        VidSys.tab('myvideos');
        T('Video uploaded! 🎉 You got +' + bonus + ' coins!', 'success');

      } catch(er) {
        L.off();
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Upload Video'; }
        T('Upload failed. Try again.', 'error');
      }
    };
    vel.onerror = function() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Upload Video'; }
      T('Error reading video.', 'error');
    };
  };
  reader.onerror = function() {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Upload Video'; }
    T('Error reading file.', 'error');
  };
  reader.readAsDataURL(file);
};

/* Admin config save — upload bonus + viewer coin rate যোগ করা */
var _origAdminSaveCfg = Admin && Admin.saveCfg ? Admin.saveCfg.bind(Admin) : null;
if (Admin) {
  Admin.saveCfg = async function() {
    var g = function(id){ var e=document.getElementById(id); return e?e.value:''; };
    var chk = function(id){ var e=document.getElementById(id); return e?e.checked:false; };
    var cfg = {
      gameCooldown:   parseInt(g('cfCooldown'))||24,
      spinCost:       parseInt(g('cfSpin'))||50,
      scratchCost:    parseInt(g('cfScratch'))||20,
      slotCost:       parseInt(g('cfSlot'))||100,
      minWithdraw:    parseInt(g('cfMinWD'))||200,
      coinToBDT:      parseFloat(g('cfRate'))||0.01,
      referralBonus:  parseInt(g('cfRefBonus'))||500,
      referralTasksReq:parseInt(g('cfRefReq'))||3,
      adCode:         g('cfHomeAd'),
      maintenanceMode:chk('cfMaint'),
      videoAdEnabled: chk('adEnabled'),
      videoAdCode:    g('adCode'),
      adSkipTime:     parseInt(g('adSkip'))||5,
      adFrequency:    parseInt(g('adFreq'))||1,
      adUnskippable:  chk('adUnskip'),
      adType:         _selectedAdType||'preroll',
      adMidAt:        parseInt(g('adMidAt'))||30,
      viewCoinRate:   parseFloat(g('viewRate'))||5,
      viewerCoinRate: parseFloat(g('viewerRate')||'1')||1,
      uploadBonus:    parseInt(g('uploadBonus')||'50')||50,
      monetizationCoins: parseInt(g('monCoins')||'1000000')||1000000
    };
    L.show('Saving...');
    try {
      await DB.u('config', cfg);
      Object.assign(_cfg, cfg);
      L.off();
      T('Config saved! ✅', 'success');
    } catch(e) {
      L.off();
      T('Save failed', 'error');
    }
  };
}

/* Admin video coin config save */
Admin.saveVideoCoinCfg = async function() {
  var vr  = parseFloat((document.getElementById('viewRate')   ||{}).value) || 5;
  var vwr = parseFloat((document.getElementById('viewerRate') ||{}).value) || 1;
  var ub  = parseInt( (document.getElementById('uploadBonus') ||{}).value) || 50;
  L.show('Saving...');
  try {
    await DB.u('config', { viewCoinRate:vr, viewerCoinRate:vwr, uploadBonus:ub });
    _cfg.viewCoinRate = vr; _cfg.viewerCoinRate = vwr; _cfg.uploadBonus = ub;
    /* update summary */
    var su = document.getElementById('summUpload');   if(su) su.textContent = ub;
    var sv = document.getElementById('summViewer');   if(sv) sv.textContent = vwr;
    var sc = document.getElementById('summCreator');  if(sc) sc.textContent = vr;
    L.off(); T('Coin settings saved! ✅', 'success');
  } catch(e) { L.off(); T('Save failed', 'error'); }
};

/* Admin.init — load new fields */
var _origAdminInit = Admin.init.bind(Admin);
Admin.init = async function() {
  await _origAdminInit();
  var set = function(id, v){ var e=document.getElementById(id); if(e) e.value=v; };
  set('viewRate',   _cfg.viewCoinRate   || 5);
  set('viewerRate', _cfg.viewerCoinRate || 1);
  set('uploadBonus',_cfg.uploadBonus    || 50);
  /* summary */
  var su = document.getElementById('summUpload');  if(su) su.textContent = _cfg.uploadBonus    || 50;
  var sv = document.getElementById('summViewer');  if(sv) sv.textContent = _cfg.viewerCoinRate || 1;
  var sc = document.getElementById('summCreator'); if(sc) sc.textContent = _cfg.viewCoinRate   || 5;
};

/* DC defaults update */
DC.viewCoinRate   = 5;
DC.viewerCoinRate = 1;
DC.uploadBonus    = 50;

/* ================================================================
   PWA SYSTEM — Service Worker + Install + Push Notifications
   ================================================================ */

var PWA = {
  _deferredPrompt: null,    /* beforeinstallprompt event */
  _swReg: null,             /* Service Worker registration */
  _isInstalled: false,
  _notifGranted: false,

  /* ---- INIT (call after page loads) ---- */
  init: function() {
    try {
    PWA._checkInstalled();
    PWA._registerSW();
    PWA._listenInstallPrompt();
    PWA._listenOnlineStatus();
    PWA._checkNotifStatus();
    /* Show install banner after 3s if not installed */
    setTimeout(function() {
      if (!PWA._isInstalled && PWA._deferredPrompt) {
        PWA.showBanner();
      }
    }, 3000);
    /* Show notif prompt after 8s if not granted */
    setTimeout(function() {
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          var np = document.getElementById('notifPrompt');
          if (np) np.style.display = 'block';
        }
      } catch(e) {}
    }, 8000);
    } catch(e) { console.log('PWA init error:', e); }
  },

  /* ---- SERVICE WORKER REGISTER ---- */
  _registerSW: function() {
    try {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      PWA._swReg = reg;
      /* Check for updates */
      reg.addEventListener('updatefound', function() {
        var newWorker = reg.installing;
        newWorker.addEventListener('statechange', function() {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            /* New version available */
            var toast = document.getElementById('pwaUpdateToast');
            if (toast) toast.style.display = 'flex';
          }
        });
      });
    }).catch(function(e) {
      console.log('SW registration failed:', e);
    });
    } catch(e) { console.log('SW error:', e); }
  },

  /* ---- CHECK IF ALREADY INSTALLED ---- */
  _checkInstalled: function() {
    if ((typeof window.matchMedia==='function'&&window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true) {
      PWA._isInstalled = true;
      document.body.classList.add('pwa-standalone');
    }
  },

  /* ---- LISTEN FOR INSTALL PROMPT ---- */
  _listenInstallPrompt: function() {
    try {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      PWA._deferredPrompt = e;
      /* Show install button in UI */
      var installBtn = document.getElementById('navInstallBtn');
      if (installBtn) installBtn.style.display = 'flex';
    });
    /* Hide banner after successful install */
    window.addEventListener('appinstalled', function() {
      PWA._isInstalled = true;
      PWA.dismissBanner();
      T('🎉 TaskMint Pro installed! Check your home screen.', 'success');
      var installBtn = document.getElementById('navInstallBtn');
      if (installBtn) installBtn.style.display = 'none';
    });
    } catch(e) {}
  },

  /* ---- SHOW INSTALL BANNER ---- */
  showBanner: function() {
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.style.display = 'block';
  },

  /* ---- INSTALL APP ---- */
  install: function() {
    if (!PWA._deferredPrompt) {
      T('Install prompt not available. Try Settings > Add to Home Screen.', 'info');
      return;
    }
    PWA._deferredPrompt.prompt();
    PWA._deferredPrompt.userChoice.then(function(choice) {
      if (choice.outcome === 'accepted') {
        T('Installing TaskMint Pro... 🚀', 'success');
      }
      PWA._deferredPrompt = null;
      PWA.dismissBanner();
    });
  },

  /* ---- DISMISS BANNER ---- */
  dismissBanner: function() {
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transition = 'opacity .3s';
      setTimeout(function(){ banner.style.display = 'none'; banner.style.opacity = '1'; }, 300);
    }
  },

  /* ---- UPDATE APP ---- */
  updateApp: function() {
    if (PWA._swReg && PWA._swReg.waiting) {
      PWA._swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    var toast = document.getElementById('pwaUpdateToast');
    if (toast) toast.style.display = 'none';
    window.location.reload();
  },

  /* ---- ONLINE / OFFLINE STATUS ---- */
  _listenOnlineStatus: function() {
    function updateStatus() {
      try {
        var offline = !navigator.onLine;
        if (offline) {
          var badge = document.createElement('div');
          badge.className = 'offline-badge show';
          badge.textContent = '📡 Offline';
          document.body.appendChild(badge);
          setTimeout(function(){ if(badge.parentNode)badge.remove(); }, 3000);
        } else {
          T('✅ Back online!', 'success');
        }
      } catch(e) {}
    }
    window.addEventListener('online',  updateStatus);
    window.addEventListener('offline', updateStatus);
  },

  /* ---- PUSH NOTIFICATION PERMISSION ---- */
  requestNotifPermission: async function() {
    var np = document.getElementById('notifPrompt');
    /* Safe check — some browsers/WebViews don't have Notification */
    try {
      if (typeof Notification === 'undefined' || !('Notification' in window)) {
        T('Notifications not supported on this device/browser.', 'warning');
        if (np) np.style.display = 'none';
        return;
      }
    } catch(e) {
      if (np) np.style.display = 'none';
      return;
    }
    var perm;
    try { perm = await Notification.requestPermission(); }
    catch(e) { T('Could not request notification permission.', 'warning'); return; }
    if (perm === 'granted') {
      PWA._notifGranted = true;
      if (np) np.style.display = 'none';
      T('🔔 Notifications enabled!', 'success');
      PWA._subscribeUserToPush();
      /* Show a test notification */
      setTimeout(function() { PWA.sendLocalNotif('Welcome! 🎉', 'TaskMint Pro notifications are now active. Complete tasks to earn coins!'); }, 1500);
    } else {
      T('Please grant notification permission from browser settings.', 'warning');
      if (np) np.style.display = 'none';
    }
  },

  /* ---- CHECK NOTIF STATUS ---- */
  _checkNotifStatus: function() {
    try {
      if (typeof Notification !== 'undefined' && Notification && Notification.permission === 'granted') {
        PWA._notifGranted = true;
      }
    } catch(e) {}
  },

  /* ---- SUBSCRIBE TO PUSH (VAPID) ---- */
  _subscribeUserToPush: async function() {
    if (!PWA._swReg) return;
    try {
      /* Public VAPID key — replace with your own from Firebase Console */
      /* For now using a placeholder — real key needed for server-side push */
      var sub = await PWA._swReg.pushManager.getSubscription();
      if (!sub) {
        /* Push subscription requires VAPID key from server */
        /* Storing subscription info in Firebase for admin to use */
        var u = S.me();
        if (u) {
          await firebase.database().ref('pushSubs/' + u.id).set({
            userId:   u.id,
            username: u.username,
            notifEnabled: true,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch(e) {
      /* VAPID not configured — local notifications still work */
    }
  },

  /* ---- SEND LOCAL NOTIFICATION (no server needed) ---- */
  sendLocalNotif: function(title, body, icon, url) {
    try {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    } catch(e) { return; }
    var options = {
      body:    body  || 'New update from TaskMint Pro!',
      icon:    icon  || 'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',
      badge:   'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',
      vibrate: [100, 50, 100],
      tag:     'taskmint-' + Date.now(),
      data:    { url: url || '/' }
    };
    if (PWA._swReg) {
      PWA._swReg.showNotification(title || 'TaskMint Pro', options);
    } else {
      try { new Notification(title || 'TaskMint Pro', options); } catch(e) {}
    }
  },

  /* ---- NOTIFY: COINS EARNED ---- */
  notifyCoins: function(amount) {
    PWA.sendLocalNotif(
      '🪙 Coins earned!',
      '+' + amount + ' coins added to your wallet!',
      null, '/?page=home'
    );
  },

  /* ---- NOTIFY: NEW TASK ---- */
  notifyNewTask: function(taskTitle) {
    PWA.sendLocalNotif(
      '📋 New Task!',
      '"' + taskTitle + '" — Complete it now to earn coins!',
      null, '/?page=home'
    );
  },

  /* ---- NOTIFY: NEW SUBSCRIBER ---- */
  notifySubscriber: function(username) {
    PWA.sendLocalNotif(
      '🔔 New Subscriber!',
      username + ' subscribed to your channel!',
      null, '/?page=videos'
    );
  },

  /* ---- NOTIFY: WITHDRAWAL STATUS ---- */
  notifyWithdrawal: function(status, amount) {
    var msg = status === 'approved'
      ? '✅ Withdrawal approved! ৳' + amount + ' has been sent.'
      : '❌ Withdrawal rejected. Please contact admin.';
    PWA.sendLocalNotif('💰 Withdrawal Update', msg, null, '/?page=withdraw');
  },

  /* ---- NOTIFY: NEW COMMENT ---- */
  notifyComment: function(username, videoTitle) {
    PWA.sendLocalNotif(
      '💬 New Comment!',
      username + ' watched your video "' + videoTitle + '" commented on your video.',
      null, '/?page=videos'
    );
  }
};

/* ---- Hook into existing events ---- */

/* Notify when coins earned via task */
var _origTaskComplete = Tasks.complete ? Tasks.complete.bind(Tasks) : null;
if (Tasks && Tasks.complete) {
  Tasks.complete = async function(reward) {
    await _origTaskComplete(reward);
    if (reward && PWA._notifGranted) {
      setTimeout(function(){ PWA.notifyCoins(reward); }, 2000);
    }
  };
}

/* Notify uploader when someone subscribes */
var _origVidSubscribe = VidSys && VidSys.subscribe ? VidSys.subscribe.bind(VidSys) : null;
if (VidSys && VidSys.subscribe) {
  VidSys.subscribe = async function() {
    await _origVidSubscribe();
    /* The uploader gets local notif if they are current user */
    var v = VidSys._vid; var me = S.me();
    if (v && v.uploaderId && v.uploaderId !== (me && me.id)) {
      /* Already handled by _notify in VidSys */
    }
  };
}

/* PWA init — handled in main DOMContentLoaded below */

/* ---- Profile page: show PWA status ---- */
var _origUIProfile = UI && UI._profile ? UI._profile.bind(UI) : null;
if (UI && UI._profile) {
  UI._profile = function(u) {
    _origUIProfile(u);
    /* Add PWA section to profile */
    var prof = document.getElementById('page-profile');
    if (!prof) return;
    var existing = document.getElementById('pwaProfileCard');
    if (existing) existing.remove();
    var installed = PWA._isInstalled;
    var notifOk   = PWA._notifGranted;
    var card = document.createElement('div');
    card.id = 'pwaProfileCard';
    card.style.cssText = 'margin:10px 14px;background:rgba(0,229,255,0.04);border:1px solid rgba(0,229,255,0.15);border-radius:14px;padding:14px';
    card.innerHTML =
      '<h3 style="font-size:0.92rem;margin-bottom:12px"><i class="fas fa-mobile-alt" style="color:var(--neon-cyan);margin-right:6px"></i>App Settings</h3>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
      /* Install row */
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-size:0.85rem;color:white">📲 App Install</div>' +
        '<div style="font-size:0.75rem;color:#888">' + (installed ? 'Installed ✅' : 'Add to home screen') + '</div></div>' +
        (installed
          ? '<span style="color:#00e5ff;font-size:0.8rem;font-weight:700">✓ Done</span>'
          : '<button onclick="PWA.install()" style="background:linear-gradient(135deg,#00e5ff,#b026ff);border:none;color:white;padding:7px 16px;border-radius:16px;font-size:0.78rem;font-weight:700;cursor:pointer">Install</button>') +
      '</div>' +
      /* Notification row */
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-size:0.85rem;color:white">🔔 Push Notifications</div>' +
        '<div style="font-size:0.75rem;color:#888">' + (notifOk ? 'Active ✅' : 'Task, coin, subscriber alert') + '</div></div>' +
        (notifOk
          ? '<button onclick="PWA.sendLocalNotif(\'🔔 Test\',\'Notification is working!\')" style="background:rgba(255,255,255,0.07);border:1px solid #444;color:#aaa;padding:7px 14px;border-radius:16px;font-size:0.78rem;cursor:pointer">Test</button>'
          : '<button onclick="PWA.requestNotifPermission()" style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:#00e5ff;padding:7px 14px;border-radius:16px;font-size:0.78rem;font-weight:700;cursor:pointer">Enable</button>') +
      '</div>' +
      /* Offline row */
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<div><div style="font-size:0.85rem;color:white">📡 Offline Mode</div>' +
        '<div style="font-size:0.75rem;color:#888">Works offline too</div></div>' +
        '<span style="color:#00e5ff;font-size:0.8rem;font-weight:700">✓ Active</span>' +
      '</div>' +
      '</div>';
    var firstCard = prof.querySelector('.card');
    if (firstCard) firstCard.parentNode.insertBefore(card, firstCard);
    else prof.appendChild(card);
  };
}
'use strict';
/* ================================================================
   TASKMINT PRO — ADVANCED SYSTEMS v11
   Streak · Leaderboard · Achievements · Level · Missions
   Daily Wheel · Push Notifications · Dark/Light Mode
   ================================================================ */

/* ===== STREAK SYSTEM ===== */
var StreakSys = {
  REWARDS: [80,80,80,80,80,80,80,80,80,80],

  init: async function() {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var today     = new Date().toDateString();
    var lastLogin = ud.lastLoginDate || '';
    var yesterday = new Date(Date.now() - 86400000).toDateString();
    var streak    = ud.loginStreak || 0;
    var banner    = document.getElementById('streakBanner');
    var claimedToday = ud.streakClaimedDate === today;

    if (lastLogin !== today) {
      /* new day */
      if (lastLogin === yesterday) {
        streak = Math.min(streak + 1, 30);
      } else if (lastLogin !== today) {
        streak = 1;
      }
      await DB.uu(u.id, { lastLoginDate: today, loginStreak: streak });
      _me = Object.assign({}, _me, { lastLoginDate: today, loginStreak: streak });
      S.set(_me);
      if (!claimedToday && banner) {
        banner.classList.remove('hidden');
        var sd = banner.querySelector('#streakDay');
        if (sd) sd.textContent = 'Day ' + streak;
        var reward = _cfg.dailyLoginBonus || 80;
        var sr = banner.querySelector('#streakReward');
        if (sr) sr.textContent = '+' + reward + ' coins';
      }
    } else {
      if (claimedToday && banner) banner.classList.add('hidden');
    }
    /* Update level */
    LvSys.update(ud);
  },

  claim: async function() {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var today = new Date().toDateString();
    if (ud.streakClaimedDate === today) return T('Already claimed today!', 'info');
    var streak = ud.loginStreak || 1;
    var reward = _cfg.dailyLoginBonus || 80;
    L.show('Claiming...');
    await DB.uu(u.id, {
      coins: (ud.coins||0) + reward,
      streakClaimedDate: today,
      totalDailyRewards: (ud.totalDailyRewards||0) + reward
    });
    _me = Object.assign({}, _me, { coins: (_me.coins||0) + reward, streakClaimedDate: today });
    S.set(_me);
    L.off();
    var banner = document.getElementById('streakBanner');
    if (banner) banner.classList.add('hidden');
    T('🔥 Day ' + streak + ' Streak! +' + reward + ' coins!', 'success');
    AchSys.check('streak', streak);
    UI.sync();
    StreakSys.show();
  },

  show: function() {
    var modal = document.getElementById('streakModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var u = S.me(); if (!u) return;
    DB.getUser(u.id).then(function(ud) {
      if (!ud) return;
      var streak = ud.loginStreak || 0;
      var grid = document.getElementById('streakDayGrid');
      if (grid) {
        grid.innerHTML = '';
        for (var i = 1; i <= 10; i++) {
          var reward = _cfg.dailyLoginBonus || 80;
          var done = i < streak || (i === streak && ud.streakClaimedDate === new Date().toDateString());
          var active = i === streak && ud.streakClaimedDate !== new Date().toDateString();
          var d = document.createElement('div');
          d.className = 'streak-day' + (done?' done':'') + (active?' active':'');
          d.innerHTML = '<div class="sd-num">D' + i + '</div><div class="sd-coin"><i class="fas fa-coins"></i></div><div class="sd-reward">+' + reward + '</div>';
          grid.appendChild(d);
        }
      }
      var ri = document.getElementById('streakRewardInfo');
      if (ri) {
        var today = new Date().toDateString();
        var claimed = ud.streakClaimedDate === today;
        var nextReward = StreakSys.REWARDS[Math.min(streak, StreakSys.REWARDS.length-1)];
        ri.innerHTML = claimed
          ? '<span style="color:#34d399">✅ Today claimed! Come back tomorrow.</span>'
          : '<span style="color:#fbbf24">🎁 Today\'s reward: <b>+' + StreakSys.REWARDS[Math.min(streak-1,9)] + ' coins</b></span>';
      }
    });
  },

  close: function() {
    var modal = document.getElementById('streakModal');
    if (modal) modal.classList.add('hidden');
  }
};

/* ===== LEVEL SYSTEM ===== */
var LvSys = {
  LEVELS: [
    {n:1,xp:0,   title:'Newcomer',  icon:'🌱'},
    {n:2,xp:500, title:'Explorer',  icon:'🔍'},
    {n:3,xp:1500,title:'Earner',    icon:'💰'},
    {n:4,xp:3000,title:'Creator',   icon:'🎬'},
    {n:5,xp:6000,title:'Pro',       icon:'⭐'},
    {n:6,xp:12000,title:'Elite',    icon:'💎'},
    {n:7,xp:25000,title:'Legend',   icon:'👑'},
    {n:8,xp:50000,title:'Master',   icon:'🏆'},
    {n:9,xp:100000,title:'Champion',icon:'🌟'},
    {n:10,xp:200000,title:'God',    icon:'🔱'}
  ],

  getLevel: function(xp) {
    var lvs = LvSys.LEVELS;
    for (var i = lvs.length-1; i >= 0; i--) {
      if (xp >= lvs[i].xp) return lvs[i];
    }
    return lvs[0];
  },

  getNextLevel: function(xp) {
    var lvs = LvSys.LEVELS;
    for (var i = 0; i < lvs.length; i++) {
      if (xp < lvs[i].xp) return lvs[i];
    }
    return null;
  },

  getXP: function(ud) {
    return (ud.coins||0) + (ud.tasksCompleted||0)*100 + (ud.totalVideoViews||0)*10;
  },

  update: function(ud) {
    var xp   = LvSys.getXP(ud);
    var lv   = LvSys.getLevel(xp);
    var next = LvSys.getNextLevel(xp);
    var pct  = next ? Math.round((xp - lv.xp) / (next.xp - lv.xp) * 100) : 100;

    /* Header level display */
    var lvEl  = document.getElementById('lvBadge');
    var xpBar = document.getElementById('lvXPFill');
    var lvTxt = document.getElementById('lvTitle');
    if (lvEl) lvEl.textContent = lv.icon + ' Lv.' + lv.n;
    if (xpBar) xpBar.style.width = pct + '%';
    if (lvTxt) lvTxt.textContent = lv.title;

    /* Check level up */
    var oldLv = _me && _me._lvCache;
    if (oldLv && oldLv < lv.n) {
      LvSys._levelUp(lv);
    }
    if (_me) { _me._lvCache = lv.n; S.set(_me); }
  },

  _levelUp: function(lv) {
    var modal = document.getElementById('levelUpModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var el = document.getElementById('lupNewLevel');
    if (el) el.innerHTML = lv.icon + '<br>Level ' + lv.n + '<br><small>' + lv.title + '</small>';
    setTimeout(function(){ modal.classList.add('hidden'); }, 4000);
  }
};

/* ===== ACHIEVEMENT SYSTEM ===== */
var AchSys = {
  LIST: [
    {id:'first_task',   title:'First Task!',      desc:'Complete your first task',         icon:'📋', xp:100,  check:function(ud){return(ud.tasksCompleted||0)>=1;}},
    {id:'tasks_10',     title:'Task Warrior',      desc:'Complete 10 tasks',                icon:'⚔️', xp:300,  check:function(ud){return(ud.tasksCompleted||0)>=10;}},
    {id:'tasks_50',     title:'Task Master',       desc:'Complete 50 tasks',                icon:'🏅', xp:1000, check:function(ud){return(ud.tasksCompleted||0)>=50;}},
    {id:'first_video',  title:'First Upload!',     desc:'Upload your first video',          icon:'🎬', xp:200,  check:function(ud,extra){return extra.type==='upload';}},
    {id:'views_100',    title:'Popular Creator',   desc:'Get 100 video views',              icon:'👁️', xp:500,  check:function(ud){return(ud.totalVideoViews||0)>=100;}},
    {id:'views_1000',   title:'Viral Video',       desc:'Get 1000 video views',             icon:'🔥', xp:2000, check:function(ud){return(ud.totalVideoViews||0)>=1000;}},
    {id:'coins_1000',   title:'Coin Collector',    desc:'Earn 1,000 coins',                 icon:'🪙', xp:200,  check:function(ud){return(ud.coins||0)>=1000;}},
    {id:'coins_10000',  title:'Coin Hoarder',      desc:'Earn 10,000 coins',                icon:'💰', xp:500,  check:function(ud){return(ud.coins||0)>=10000;}},
    {id:'streak_7',     title:'Week Warrior',      desc:'7-day login streak',               icon:'🗓️', xp:400,  check:function(ud,e){return e.type==='streak'&&e.val>=7;}},
    {id:'streak_30',    title:'Dedication',        desc:'30-day login streak',              icon:'🌟', xp:2000, check:function(ud,e){return e.type==='streak'&&e.val>=30;}},
    {id:'referral_1',   title:'Connector',         desc:'Refer 1 friend',                   icon:'🤝', xp:300,  check:function(ud){return(ud.lockedRewards||[]).length>=1;}},
    {id:'referral_5',   title:'Influencer',        desc:'Refer 5 friends',                  icon:'📢', xp:1000, check:function(ud){return(ud.lockedRewards||[]).length>=5;}},
    {id:'subscriber',   title:'First Subscriber',  desc:'Get your first subscriber',        icon:'🔔', xp:300,  check:function(ud,e){return e.type==='sub';}},
    {id:'withdraw_1',   title:'First Payout!',     desc:'Complete first withdrawal',        icon:'💸', xp:500,  check:function(ud,e){return e.type==='withdraw';}},
    {id:'monetized',    title:'Monetized!',        desc:'Get monetization approved',        icon:'💎', xp:5000, check:function(ud){return ud.monetized===true;}}
  ],

  check: async function(type, val) {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var earned = ud.achievements || [];
    var extra  = { type:type, val:val };
    var newOnes = [];

    AchSys.LIST.forEach(function(a) {
      if (earned.indexOf(a.id) !== -1) return;
      if (a.check(ud, extra)) {
        newOnes.push(a);
      }
    });

    if (!newOnes.length) return;
    var updEarned = earned.concat(newOnes.map(function(a){return a.id;}));
    var xpGain = newOnes.reduce(function(s,a){return s+a.xp;}, 0);
    await DB.uu(u.id, {
      achievements: updEarned,
      coins: (ud.coins||0) + xpGain
    });
    _me = Object.assign({}, _me, { achievements: updEarned, coins: (_me.coins||0) + xpGain });
    S.set(_me);

    newOnes.forEach(function(a) {
      AchSys._showUnlock(a);
    });
    UI.sync();
  },

  _showUnlock: function(a) {
    var toast = document.createElement('div');
    toast.className = 'achieve-toast';
    toast.innerHTML = '<span class="at-icon">'+a.icon+'</span><div><b>Achievement Unlocked!</b><div class="at-title">'+a.title+'</div><small>+'+a.xp+' XP</small></div>';
    document.body.appendChild(toast);
    setTimeout(function(){ toast.classList.add('show'); }, 50);
    setTimeout(function(){ toast.classList.remove('show'); }, 3500);
    setTimeout(function(){ toast.remove(); }, 4000);
  },

  renderHome: async function() {
    var row = document.getElementById('achieveRow');
    if (!row) return;
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var earned = ud.achievements || [];
    row.innerHTML = '';
    AchSys.LIST.slice(0,8).forEach(function(a) {
      var done = earned.indexOf(a.id) !== -1;
      var d = document.createElement('div');
      d.className = 'achieve-chip' + (done ? ' done' : '');
      d.title = a.title + '\n' + a.desc;
      d.textContent = a.icon;
      row.appendChild(d);
    });
  },

  showAll: async function() {
    var modal = document.getElementById('achieveModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    var list = document.getElementById('allAchievements');
    if (!list) return;
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var earned = ud.achievements || [];
    list.innerHTML = '';
    AchSys.LIST.forEach(function(a) {
      var done = earned.indexOf(a.id) !== -1;
      var d = document.createElement('div');
      d.className = 'ach-item' + (done?' done':'');
      d.innerHTML = '<span class="ach-icon">'+a.icon+'</span><div class="ach-info"><b>'+a.title+'</b><small>'+a.desc+'</small></div><span class="ach-xp'+(done?' earned':'')+'">+'+a.xp+(done?' ✓':'')+' XP</span>';
      list.appendChild(d);
    });
  }
};

/* ===== MISSION SYSTEM ===== */
var MissionSys = {
  DAILY: [
    {id:'watch3',   title:'Watch 3 Videos',     target:3,  reward:50,  type:'watch', icon:'▶️'},
    {id:'task2',    title:'Complete 2 Tasks',    target:2,  reward:80,  type:'task',  icon:'✅'},
    {id:'login',    title:'Daily Login',         target:1,  reward:30,  type:'login', icon:'🌞'},
    {id:'comment1', title:'Post a Comment',      target:1,  reward:40,  type:'comment',icon:'💬'},
    {id:'share1',   title:'Share a Video',       target:1,  reward:60,  type:'share', icon:'🔗'}
  ],

  getToday: function() {
    return new Date().toDateString();
  },

  getProgress: function(ud) {
    var today = MissionSys.getToday();
    var mp = ud.missionProgress || {};
    if (mp.date !== today) return { date:today, tasks:{}, done:[] };
    return mp;
  },

  render: async function() {
    var list = document.getElementById('missionList');
    if (!list) return;
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var mp = MissionSys.getProgress(ud);
    list.innerHTML = '';
    MissionSys.DAILY.forEach(function(m) {
      var prog = (mp.tasks && mp.tasks[m.id]) || 0;
      var done = mp.done && mp.done.indexOf(m.id) !== -1;
      var pct  = Math.min(100, Math.round(prog/m.target*100));
      var d = document.createElement('div');
      d.className = 'mission-item' + (done?' done':'');
      d.innerHTML =
        '<span class="mi-icon">'+m.icon+'</span>' +
        '<div class="mi-body">' +
          '<div class="mi-title">'+m.title+'</div>' +
          '<div class="mi-bar"><div style="width:'+pct+'%"></div></div>' +
          '<div class="mi-stat">'+prog+'/'+m.target+' • +'+m.reward+' coins</div>' +
        '</div>' +
        (done ? '<span class="mi-check">✅</span>' : '<span class="mi-pct">'+pct+'%</span>');
      list.appendChild(d);
    });
  },

  progress: async function(type, amount) {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var mp = MissionSys.getProgress(ud);
    var changed = false;
    var coinsEarned = 0;

    MissionSys.DAILY.forEach(function(m) {
      if (m.type !== type) return;
      if (mp.done && mp.done.indexOf(m.id) !== -1) return;
      mp.tasks = mp.tasks || {};
      mp.tasks[m.id] = (mp.tasks[m.id]||0) + (amount||1);
      if (mp.tasks[m.id] >= m.target) {
        mp.done = mp.done || [];
        if (mp.done.indexOf(m.id) === -1) {
          mp.done.push(m.id);
          coinsEarned += m.reward;
          T('🎯 Mission Done: ' + m.title + ' +' + m.reward + ' coins!', 'success');
        }
      }
      changed = true;
    });

    if (!changed && coinsEarned === 0) return;
    await DB.uu(u.id, {
      missionProgress: mp,
      coins: (ud.coins||0) + coinsEarned
    });
    if (coinsEarned > 0) {
      _me = Object.assign({}, _me, { coins: (_me.coins||0) + coinsEarned });
      S.set(_me);
      UI.sync();
    }
    MissionSys.render();
  }
};

/* ===== LEADERBOARD SYSTEM ===== */
var LbSys = {
  _type: 'coins',
  _period: 'all',

  show: async function(type, btn) {
    LbSys._type = type || 'coins';
    document.querySelectorAll('.lb-tab').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    await LbSys._render();
  },

  period: async function(p, btn) {
    LbSys._period = p;
    document.querySelectorAll('.lb-period-btn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    await LbSys._render();
  },

  _render: async function() {
    var list = document.getElementById('lbList');
    var myCard = document.getElementById('myRankCard');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="color:#7c3aed;font-size:1.5rem"></i></div>';

    var users = await DB.users();
    var me = S.me();

    /* Sort by type */
    var sortKey = LbSys._type === 'earners' ? 'totalEarned'
                : LbSys._type === 'creators' ? 'totalVideoViews'
                : LbSys._type === 'referrals' ? '_refCount'
                : 'coins';

    /* Add ref count */
    users.forEach(function(u) {
      u._refCount = (u.lockedRewards || []).filter(function(r){ return r.unlocked; }).length;
    });

    users.sort(function(a, b) { return (b[sortKey]||0) - (a[sortKey]||0); });

    var top = users.slice(0, 50);
    list.innerHTML = '';

    top.forEach(function(u, i) {
      var rank = i+1;
      var val  = sortKey === 'totalEarned' ? '৳'+(u.totalEarned||0).toFixed(0)
               : sortKey === 'totalVideoViews' ? (u.totalVideoViews||0).toLocaleString()+' views'
               : sortKey === '_refCount' ? (u._refCount||0)+' refs'
               : (u.coins||0).toLocaleString()+' coins';
      var medal = rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
      var isMe = me && u.id === me.id;
      var d = document.createElement('div');
      d.className = 'lb-item' + (isMe?' me':'');
      d.innerHTML =
        '<div class="lb-rank">'+(medal||'#'+rank)+'</div>' +
        '<img src="'+(u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="lb-av" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
        '<div class="lb-info">' +
          '<div class="lb-name">'+(u.displayName||u.username)+(u.monetized?'<span class="vc">✓</span>':'')+'</div>' +
          '<div class="lb-val">'+val+'</div>' +
        '</div>' +
        (isMe ? '<span class="lb-you">You</span>' : '');
      list.appendChild(d);
    });

    /* My rank card */
    if (me && myCard) {
      var myIdx = users.findIndex(function(u){ return u.id === me.id; });
      if (myIdx >= 0) {
        myCard.classList.remove('hidden');
        var myVal = sortKey === 'coins' ? (_me&&_me.coins||0).toLocaleString()+' coins' : '';
        myCard.innerHTML =
          '<div class="mrc-rank">#'+(myIdx+1)+'</div>' +
          '<img src="'+(_me&&_me.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" class="lb-av">' +
          '<div class="lb-info"><div class="lb-name">You</div><div class="lb-val">'+myVal+'</div></div>';
      }
    }
  }
};

/* ===== NOTIFICATION SYSTEM ===== */
var NotifSys = {
  toggle: async function() {
    var panel = document.getElementById('notifPanel');
    var bg    = document.getElementById('notifBg');
    if (!panel) return;
    var isOpen = panel.classList.contains('open');
    if (isOpen) {
      panel.classList.remove('open');
      if (bg) bg.classList.add('hidden');
    } else {
      panel.classList.add('open');
      if (bg) bg.classList.remove('hidden');
      NotifSys.load();
      NotifSys.markRead();
    }
  },

  load: async function() {
    var list = document.getElementById('notifList');
    if (!list) return;
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id);
    var notifs = (ud && ud.notifications) || [];
    if (!notifs.length) {
      list.innerHTML = '<p style="text-align:center;color:#555;padding:30px;font-size:0.9rem">No notifications yet.<br><small style="color:#444">Complete tasks and watch videos!</small></p>';
      return;
    }
    list.innerHTML = '';
    notifs.slice(0,50).forEach(function(n) {
      if (typeof n === 'string') return;
      var icons = {view:'👁️',like:'❤️',comment:'💬',sub:'🔔',superchat:'⭐',withdraw:'💸',task:'✅',coins:'🪙',streak:'🔥'};
      var d = document.createElement('div');
      d.className = 'notif-item' + (n.unread?' unread':'');
      d.innerHTML =
        '<span class="notif-ic">'+(icons[n.type]||'📣')+'</span>' +
        '<div class="notif-body"><div class="notif-txt">'+n.text+'</div><div class="notif-time">'+timeAgo(n.time)+'</div></div>' +
        (n.thumb ? '<img src="'+n.thumb+'" class="notif-th">' : '');
      list.appendChild(d);
    });
  },

  markRead: async function() {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var notifs = (ud.notifications||[]).map(function(n){ return typeof n==='string'?n:Object.assign({},n,{unread:false}); });
    await DB.uu(u.id, { notifications: notifs });
    NotifSys.updateDot(0);
  },

  updateDot: function(count) {
    var dot = document.getElementById('notifDot');
    if (!dot) return;
    dot.classList.toggle('hidden', count === 0);
    if (count > 0) dot.textContent = count > 9 ? '9+' : count;
  },

  checkUnread: async function() {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    var count = (ud.notifications||[]).filter(function(n){ return n && n.unread; }).length;
    NotifSys.updateDot(count);
  }
};

/* ===== DAILY WHEEL SYSTEM ===== */
var WheelSys = {
  PRIZES: [
    {label:'50',   coins:50,   color:'#7c3aed'},
    {label:'20',   coins:20,   color:'#2563eb'},
    {label:'100',  coins:100,  color:'#059669'},
    {label:'10',   coins:10,   color:'#d97706'},
    {label:'200',  coins:200,  color:'#dc2626'},
    {label:'30',   coins:30,   color:'#7c3aed'},
    {label:'500',  coins:500,  color:'#0891b2'},
    {label:'5',    coins:5,    color:'#9333ea'}
  ],

  canSpin: function(ud) {
    var today = new Date().toDateString();
    return ud.dailyWheelDate !== today;
  },

  spin: async function() {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud) return;
    if (!WheelSys.canSpin(ud)) return T('Already spun today! Come back tomorrow 🌅', 'info');

    var prizes = WheelSys.PRIZES;
    var idx = Math.floor(Math.random() * prizes.length);
    var prize = prizes[idx];
    var deg = 360 - (idx * (360/prizes.length)) - (360/(prizes.length*2));
    var totalDeg = 1440 + deg;

    var wheel = document.getElementById('dailyWheelEl');
    var btn   = document.getElementById('dailySpinBtn');
    var cd    = document.getElementById('dailyWheelCd');
    if (btn) btn.disabled = true;
    if (wheel) {
      wheel.style.transition = 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';
      wheel.style.transform  = 'rotate(' + totalDeg + 'deg)';
    }

    setTimeout(async function() {
      await DB.uu(u.id, {
        coins: (ud.coins||0) + prize.coins,
        dailyWheelDate: new Date().toDateString()
      });
      _me = Object.assign({}, _me, { coins: (_me.coins||0) + prize.coins, dailyWheelDate: new Date().toDateString() });
      S.set(_me);
      UI.sync();
      T('🎡 Daily Wheel: +' + prize.coins + ' coins!', 'success');
      if (cd) cd.textContent = 'Come back tomorrow!';
      if (btn) { btn.disabled = true; btn.textContent = 'Spun Today ✓'; }
      AchSys.check('wheel', prize.coins);
      MissionSys.progress('wheel', 1);
    }, 4200);
  },

  renderWheel: function() {
    var canvas = document.getElementById('dailyWheelEl');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var prizes = WheelSys.PRIZES;
    var n = prizes.length;
    var arc = (2 * Math.PI) / n;
    var r = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    prizes.forEach(function(p, i) {
      var start = i * arc - Math.PI/2;
      ctx.beginPath();
      ctx.moveTo(r, r);
      ctx.arc(r, r, r-2, start, start+arc);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      /* label */
      ctx.save();
      ctx.translate(r, r);
      ctx.rotate(start + arc/2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(p.label, r-12, 5);
      ctx.restore();
    });
    /* center circle */
    ctx.beginPath();
    ctx.arc(r, r, 18, 0, 2*Math.PI);
    ctx.fillStyle = '#0a0014';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  initCd: function(ud) {
    var cd  = document.getElementById('dailyWheelCd');
    var btn = document.getElementById('dailySpinBtn');
    if (!cd || !btn) return;
    if (WheelSys.canSpin(ud)) {
      cd.textContent = '';
      btn.disabled = false;
      btn.textContent = 'Spin! (Free Daily)';
    } else {
      cd.textContent = 'Come back tomorrow!';
      btn.disabled = true;
      btn.textContent = 'Spun Today ✓';
    }
  }
};

/* ===== ADMIN PUSH NOTIFICATION ===== */
var AdminPush = {
  send: async function() {
    var title = (document.getElementById('pushTitle')||{}).value || '';
    var body  = (document.getElementById('pushBody') ||{}).value || '';
    var icon  = (document.getElementById('pushIcon') ||{}).value || '';
    if (!title || !body) return T('Title and body required', 'warning');

    L.show('Sending...');
    /* Save to Firebase — clients poll this */
    var msg = {
      id: 'push_' + Date.now(),
      title: title, body: body, icon: icon||'',
      sentAt: new Date().toISOString()
    };
    await DB.w('pushMessages/' + msg.id, msg);

    /* If PWA registered, try browser push */
    if (window.PWA && PWA._notifGranted) {
      PWA.sendLocalNotif(title, body, icon);
    }

    L.off();
    var msgEl = document.getElementById('pushSentMsg');
    if (msgEl) { msgEl.textContent = '✅ Notification sent!'; setTimeout(function(){ msgEl.textContent=''; }, 3000); }
    T('Push notification sent!', 'success');
  }
};

/* ===== THEME SYSTEM ===== */
var ThemeSys = {
  THEMES: {
    dark:   { '--bg':     '#0a0014', '--bg2': '#120022', '--bg3': '#1a0030', '--card': 'rgba(255,255,255,0.04)', '--border': 'rgba(255,255,255,0.08)', '--text': '#ffffff', '--text2': '#aaaaaa', '--accent': '#7c3aed', '--cyan': '#00e5ff', '--gold': '#fbbf24', '--green': '#34d399' },
    purple: { '--bg':     '#0d0018', '--bg2': '#1a0035', '--bg3': '#250050', '--card': 'rgba(255,255,255,0.05)', '--border': 'rgba(200,150,255,0.15)', '--text': '#ffffff', '--text2': '#c4b5fd', '--accent': '#8b5cf6', '--cyan': '#a78bfa', '--gold': '#fcd34d', '--green': '#6ee7b7' },
    ocean:  { '--bg':     '#000d1a', '--bg2': '#001933', '--bg3': '#00264d', '--card': 'rgba(0,150,255,0.06)',   '--border': 'rgba(0,200,255,0.15)',   '--text': '#ffffff', '--text2': '#93c5fd', '--accent': '#0ea5e9', '--cyan': '#38bdf8', '--gold': '#fbbf24', '--green': '#34d399' },
    amoled: { '--bg':     '#000000', '--bg2': '#0a0a0a', '--bg3': '#111111', '--card': 'rgba(255,255,255,0.03)', '--border': 'rgba(255,255,255,0.06)', '--text': '#ffffff', '--text2': '#888888', '--accent': '#7c3aed', '--cyan': '#00e5ff', '--gold': '#fbbf24', '--green': '#34d399' }
  },

  apply: function(name) {
    var t = ThemeSys.THEMES[name];
    if (!t) return;
    var root = document.documentElement;
    Object.keys(t).forEach(function(k){ root.style.setProperty(k, t[k]); });
    localStorage.setItem('tm_theme', name);
    /* highlight active btn */
    document.querySelectorAll('.theme-btn').forEach(function(b){ b.classList.remove('active'); });
    var btn = document.getElementById('theme-' + name);
    if (btn) btn.classList.add('active');
  },

  init: function() {
    var saved = localStorage.getItem('tm_theme') || 'dark';
    ThemeSys.apply(saved);
  }
};

/* ===== HOOK INTO EXISTING SYSTEMS ===== */

/* Patch Tasks.complete to trigger missions + achievements */
var _origTC = Tasks.complete ? Tasks.complete.bind(Tasks) : null;
if (_origTC) {
  Tasks.complete = async function(reward) {
    await _origTC(reward);
    MissionSys.progress('task', 1);
    var u = S.me();
    if (u) {
      DB.getUser(u.id).then(function(ud){
        if (ud) AchSys.check('task', ud.tasksCompleted||0);
      });
    }
  };
}

/* Patch VidSys.claim to trigger missions */
var _origVC = VidSys && VidSys.claim ? VidSys.claim.bind(VidSys) : null;
if (_origVC) {
  VidSys.claim = async function() {
    await _origVC();
    MissionSys.progress('watch', 1);
  };
}

/* Patch VidSys.postComment */
var _origPC = VidSys && VidSys.postComment ? VidSys.postComment.bind(VidSys) : null;
if (_origPC) {
  VidSys.postComment = async function() {
    await _origPC();
    MissionSys.progress('comment', 1);
    AchSys.check('comment', 1);
  };
}

/* Patch VidSys.share */
var _origVS = VidSys && VidSys.share ? VidSys.share.bind(VidSys) : null;
if (_origVS) {
  VidSys.share = async function() {
    _origVS();
    MissionSys.progress('share', 1);
  };
}

/* Patch SubSys.toggle to check achievements */
var _origST = SubSys && SubSys.toggle ? SubSys.toggle.bind(SubSys) : null;
if (_origST) {
  SubSys.toggle = async function(tid) {
    await _origST(tid);
    AchSys.check('sub', 1);
  };
}

/* Patch Router.go to trigger daily systems */
var _origRG = Router.go ? Router.go.bind(Router) : null;
if (_origRG) {
  Router.go = function(pid) {
    _origRG(pid);
    if (pid === 'home') {
      setTimeout(function(){
        StreakSys.init();
        MissionSys.render();
        AchSys.renderHome();
        NotifSys.checkUnread();
      }, 100);
    }
    if (pid === 'games') {
      setTimeout(function(){
        DB.getUser((S.me()||{}).id||'').then(function(ud){
          if (ud) WheelSys.initCd(ud);
          WheelSys.renderWheel();
        });
      }, 100);
    }
    if (pid === 'leaderboard') {
      setTimeout(function(){ LbSys.show('coins'); }, 100);
    }
  };
}

/* ThemeSys init — handled in main DOMContentLoaded below */

/* ================================================================
   WITHDRAW SYSTEM v2 — BDT + USD Bank Transfer Only
   ================================================================ */
var WD = {
  _curr: 'BDT',

  setCurr: function(curr, btn) {
    WD._curr = curr;
    document.querySelectorAll('.curr-btn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var bkash = document.getElementById('wFormBKash');
    var bdt   = document.getElementById('wFormBDT');
    var usd   = document.getElementById('wFormUSD');
    if (bkash) bkash.style.display = curr === 'bKash' ? '' : 'none';
    if (bdt)   bdt.style.display   = curr === 'BDT'   ? '' : 'none';
    if (usd)   usd.style.display   = curr === 'USD'   ? '' : 'none';
  },

  submit: async function(curr) {
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id);
    if (!ud) return;
    if (!ud.monetized) return T('Monetization not enabled. Reach 10M coins first.', 'error');

    if (curr === 'BDT') {
      var amt     = parseFloat((document.getElementById('wAmtBDT')||{}).value) || 0;
      var bank    = (document.getElementById('wBankName')||{}).value  || '';
      var acc     = (document.getElementById('wBankAcc') ||{}).value  || '';
      var branch  = (document.getElementById('wBranchName')||{}).value|| '';
      var holder  = (document.getElementById('wAccHolder')||{}).value || '';
      if (!amt || amt < 500)      return T('Minimum ৳500', 'warning');
      if (amt > (ud.balance||0)) return T('Insufficient BDT balance (৳'+(ud.balance||0).toFixed(2)+')', 'error');
      if (!bank || !acc || !holder) return T('Please fill in all bank details.', 'warning');

      var all = await DB.wds();
      if (all.some(function(w){ return w.userId===u.id && w.status==='Pending'; }))
        return T('You already have a pending request.', 'warning');

      L.show('Submitting...');
      var newBal = Math.max(0, (ud.balance||0) - amt);
      await DB.uu(u.id, { balance:newBal, totalWithdrawn:(ud.totalWithdrawn||0)+amt });
      await DB.saveWD({
        id: Date.now(), userId:u.id, username:u.username,
        type:'BDT', currency:'BDT', amt:amt,
        bank:bank, account:acc, branch:branch, holder:holder,
        method:'Bank Transfer (BDT)', number:acc,
        status:'Pending', requestedAt:new Date().toISOString()
      });
      _me = Object.assign({}, _me, { balance:newBal });
      S.set(_me); L.off(); UI.sync();
      /* clear form */
      ['wAmtBDT','wBankName','wBankAcc','wBranchName','wAccHolder'].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=''; });
      T('✅ BDT Withdrawal request submitted! 3–5 business days.', 'success');
      UI._wList(S.me());

    if (curr === 'bKash') {
      var amtBK   = parseFloat((document.getElementById('wAmtBKash')   ||{}).value) || 0;
      var numBK   = (document.getElementById('wBKashNumber')  ||{}).value || '';
      var holdBK  = (document.getElementById('wBKashHolder')  ||{}).value || '';
      if (!amtBK || amtBK < 200)         return T('Minimum ৳200 for bKash', 'warning');
      if (amtBK > (ud.balance||0))       return T('Insufficient BDT balance (৳'+(ud.balance||0).toFixed(2)+')', 'error');
      if (!numBK || numBK.length < 11)   return T('Enter valid bKash number', 'warning');
      if (!holdBK)                        return T('Enter account holder name', 'warning');

      var allBK = await DB.wds();
      if (allBK.some(function(w){ return w.userId===u.id && w.status==='Pending'; }))
        return T('You already have a pending request.', 'warning');

      L.show('Submitting...');
      var newBalBK = Math.max(0, (ud.balance||0) - amtBK);
      await DB.uu(u.id, { balance:newBalBK, totalWithdrawn:(ud.totalWithdrawn||0)+amtBK });
      await DB.saveWD({
        id: Date.now(), userId:u.id, username:u.username,
        type:'bKash', currency:'BDT', amt:amtBK,
        method:'bKash', number:numBK, holder:holdBK,
        status:'Pending', requestedAt:new Date().toISOString()
      });
      _me = Object.assign({}, _me, { balance:newBalBK });
      S.set(_me); L.off(); UI.sync();
      ['wAmtBKash','wBKashNumber','wBKashHolder'].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=''; });
      T('✅ bKash withdrawal request submitted! Within 24 hours.', 'success');
      UI._wList(S.me());
      return;
    }

        } else {
      var amtUSD   = parseFloat((document.getElementById('wAmtUSD')||{}).value) || 0;
      var bankU    = (document.getElementById('wBankNameUSD')||{}).value  || '';
      var accU     = (document.getElementById('wBankAccUSD') ||{}).value  || '';
      var swift    = (document.getElementById('wSwiftCode')  ||{}).value  || '';
      var country  = (document.getElementById('wBankCountry')||{}).value  || '';
      var holderU  = (document.getElementById('wAccHolderUSD')||{}).value || '';
      if (!amtUSD || amtUSD < 5)           return T('Minimum $5.00', 'warning');
      if (amtUSD > (ud.balanceUSD||0))     return T('Insufficient USD balance ($'+(ud.balanceUSD||0).toFixed(4)+')', 'error');
      if (!bankU || !accU || !holderU)     return T('Please fill in all bank details.', 'warning');

      var allW = await DB.wds();
      if (allW.some(function(w){ return w.userId===u.id && w.status==='Pending'; }))
        return T('You already have a pending request.', 'warning');

      L.show('Submitting...');
      var newUSD = Math.max(0, (ud.balanceUSD||0) - amtUSD);
      await DB.uu(u.id, { balanceUSD:newUSD, totalWithdrawnUSD:(ud.totalWithdrawnUSD||0)+amtUSD });
      await DB.saveWD({
        id: Date.now(), userId:u.id, username:u.username,
        type:'USD', currency:'USD', amt:amtUSD,
        bank:bankU, account:accU, swift:swift, country:country, holder:holderU,
        method:'Bank Transfer (USD)', number:accU,
        status:'Pending', requestedAt:new Date().toISOString()
      });
      _me = Object.assign({}, _me, { balanceUSD:newUSD });
      S.set(_me); L.off(); UI.sync();
      ['wAmtUSD','wBankNameUSD','wBankAccUSD','wSwiftCode','wBankCountry','wAccHolderUSD'].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=''; });
      T('✅ USD Withdrawal request submitted! 5–7 business days.', 'success');
      UI._wList(S.me());
    }
  }
};

/* Patch UI._wChk to also show rates */
var _origWChk = UI._wChk ? UI._wChk.bind(UI) : null;
if (_origWChk) {
  UI._wChk = function(u) {
    _origWChk(u);
    /* update rate display */
    var rb = document.getElementById('rateShowBDT');
    var ru = document.getElementById('rateShowUSD');
    if (rb) rb.textContent = '৳' + (_cfg.coinToBDT||0.05).toFixed(4);
    if (ru) ru.textContent = '$' + (_cfg.coinToUSD||0.0005).toFixed(6);
  };
}

/* Patch UI._wList to show BDT/USD badge */
var _origWList = UI._wList ? UI._wList.bind(UI) : null;
if (_origWList) {
  UI._wList = async function(u) {
    var l = document.getElementById('wdList'); if (!l) return;
    var all = await DB.wds();
    var my  = all.filter(function(w){ return w.userId === u.id; }).reverse();
    if (!my.length) {
      l.innerHTML = '<p style="color:#888;text-align:center;padding:20px">No withdrawal history yet.</p>';
      return;
    }
    l.innerHTML = '';
    my.forEach(function(w) {
      var sc  = w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';
      var isBDT = w.currency === 'BDT' || !w.currency;
      var amtStr = isBDT ? '৳'+w.amt.toFixed(2) : '$'+w.amt.toFixed(4);
      var flag   = isBDT ? '🇧🇩' : '🇺🇸';
      l.innerHTML +=
        '<div class="card wd-item">' +
          '<div>' +
            '<b>'+flag+' '+w.method+'</b>' +
            '<small style="color:#888;display:block">'+w.account+' | '+w.holder+'</small>' +
            '<small style="color:#666">'+new Date(w.id).toLocaleDateString('en-BD')+'</small>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<b style="color:var(--gold)">'+amtStr+'</b><br>' +
            '<span class="sbadge '+sc+'">'+w.status+'</span>' +
          '</div>' +
        '</div>';
    });
  };
}

/* Patch Admin.wdList to show BDT/USD */
var _origAdmWD = Admin.wdList ? Admin.wdList.bind(Admin) : null;
if (_origAdmWD) {
  Admin.wdList = async function(filter) {
    filter = filter || 'all';
    var l = document.getElementById('aWDList'); if (!l) return;
    l.innerHTML = '<p style="color:#888;text-align:center;padding:10px">Loading...</p>';
    var all  = await DB.wds();
    var list = filter==='all' ? all.slice().reverse() : all.filter(function(w){ return w.status===filter; }).reverse();
    if (!list.length) { l.innerHTML='<p style="color:#888;text-align:center;padding:20px">No withdrawals found.</p>'; return; }
    l.innerHTML = '';
    list.forEach(function(w) {
      var sc     = w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';
      var isBDT  = w.currency==='BDT'||!w.currency;
      var amtStr = isBDT ? '৳'+w.amt.toFixed(2) : '$'+w.amt.toFixed(4);
      var flag   = isBDT ? '🇧🇩' : '🇺🇸';
      l.innerHTML +=
        '<div class="awd-card">' +
          '<div class="awd-info">' +
            '<b>'+flag+' '+w.username+'</b>' +
            '<span style="color:#888">'+w.method+' • '+w.holder+'</span>' +
            '<span style="color:#aaa;font-size:0.78rem">'+w.account+'</span>' +
            (w.swift ? '<span style="color:#666;font-size:0.75rem">SWIFT: '+w.swift+'</span>' : '') +
            '<span style="color:var(--gold);font-weight:700">'+amtStr+'</span>' +
            '<small style="color:#555">'+new Date(w.id).toLocaleString('en-BD')+'</small>' +
          '</div>' +
          '<div class="awd-act">' +
            '<span class="sbadge '+sc+'">'+w.status+'</span>' +
            (w.status==='Pending'
              ? '<button class="btn btn-sm btn-g" onclick="Admin.procWD('+w.id+',\'Approved\')">✅</button>'
              + '<button class="btn btn-sm btn-r" onclick="Admin.procWD('+w.id+',\'Rejected\')">❌</button>'
              : '') +
          '</div>' +
        '</div>';
    });
  };
}

/* Admin.procWD — restore correct currency on reject */
var _origProcWD = Admin.procWD ? Admin.procWD.bind(Admin) : null;
if (_origProcWD) {
  Admin.procWD = async function(wId, status) {
    L.show('Processing...');
    var all = await DB.wds();
    var w   = all.find(function(x){ return x.id===wId; });
    if (!w) { L.off(); return; }
    if (status === 'Rejected' && w.status === 'Pending') {
      var user = await DB.getUser(w.userId);
      if (user) {
        var restore = {};
        if (w.currency === 'USD') {
          restore.balanceUSD = (user.balanceUSD||0) + w.amt;
        } else {
          restore.balance = (user.balance||0) + w.amt;
        }
        await DB.uu(w.userId, restore);
      }
    }
    await DB.updWD(wId, { status:status, processedAt:new Date().toISOString() });
    L.off();
    Admin.wdList('all');
    Admin.renderOverview();
    T('Withdrawal ' + status, 'success');
    /* PWA notify user */
    if (typeof PWA !== 'undefined' && PWA.notifyWithdrawal) {
      PWA.notifyWithdrawal(status, w.amt);
    }
  };
}

/* Monetize render — add USD earnings */
var _origMonRender = MonSys.render ? MonSys.render.bind(MonSys) : null;
if (_origMonRender) {
  MonSys.render = async function() {
    await _origMonRender();
    /* Append USD balance info after render */
    var u = S.me(); if (!u) return;
    var ud = await DB.getUser(u.id); if (!ud || !ud.monetized) return;
    var el = document.getElementById('monetizeContent'); if (!el) return;
    /* Find earnings card and inject USD */
    var usdBox = document.createElement('div');
    usdBox.className = 'card';
    usdBox.style.marginTop = '10px';
    usdBox.innerHTML =
      '<h3 style="margin-bottom:12px">💱 USD Earnings</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="stat-box"><i class="fas fa-dollar-sign" style="color:#3b82f6"></i><h3>$'+(ud.balanceUSD||0).toFixed(4)+'</h3><small>USD Balance</small></div>' +
        '<div class="stat-box"><i class="fas fa-chart-line" style="color:#60a5fa"></i><h3>$'+(ud.videoEarningsUSD||0).toFixed(4)+'</h3><small>Total USD Earned</small></div>' +
        '<div class="stat-box"><i class="fas fa-bangladeshi-taka-sign" style="color:#10b981"></i><h3>৳'+(ud.balance||0).toFixed(2)+'</h3><small>BDT Balance</small></div>' +
        '<div class="stat-box"><i class="fas fa-coins" style="color:#fbbf24"></i><h3>'+((ud.coins||0).toLocaleString())+'</h3><small>Coins</small></div>' +
      '</div>';
    el.appendChild(usdBox);
  };
}


/* ===== MISSING FUNCTION STUBS ===== */
function togglePass(inputId, iconEl) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  var isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  if (iconEl) iconEl.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
}

/* LevelSys.show — show level info modal or toast */
if (typeof LvSys !== 'undefined') {
  LvSys.show = function() {
    var u = S.me(); if (!u) return;
    DB.getUser(u.id).then(function(ud) {
      if (!ud) return;
      var xp  = LvSys.getXP(ud);
      var lv  = LvSys.getLevel(xp);
      var next = LvSys.getNextLevel(xp);
      var pct  = next ? Math.round((xp - lv.xp) / (next.xp - lv.xp) * 100) : 100;
      T(lv.icon + ' Level ' + lv.n + ' — ' + lv.title + ' | XP: ' + xp.toLocaleString() + (next ? ' / ' + next.xp.toLocaleString() : ' (MAX)'), 'info');
    });
  };
}
/* LevelSys alias */
var LevelSys = typeof LvSys !== 'undefined' ? LvSys : { show: function(){} };

/* AchieveSys alias for AchSys */
var AchieveSys = typeof AchSys !== 'undefined' ? AchSys : { showAll: function(){} };

/* ================================================================
   SINGLE INIT — One DOMContentLoaded to rule them all
   ================================================================ */
document.addEventListener('DOMContentLoaded', function() {
  /* Theme first — before anything renders */
  if (typeof ThemeSys !== 'undefined') ThemeSys.init();

  /* Main app init */
  Router.init();

  /* PWA — after app loads */
  setTimeout(function() {
    if (typeof PWA !== 'undefined') PWA.init();
  }, 1000);
});

/* ================================================================
   MISSING FUNCTIONS — Complete Fix v12.1
   All missing methods added. All English.
   ================================================================ */

/* ---- Profile ---- */
Profile.saveChanges = Profile.save; /* alias */
Profile.uploadPicFile = function(input) {
  if (!input || !input.files || !input.files[0]) return;
  var f = input.files[0];
  if (!f.type.startsWith('image/')) return T('Please select an image file', 'warning');
  if (f.size > 5 * 1024 * 1024) return T('Max file size is 5MB', 'error');
  var reader = new FileReader();
  reader.onload = async function(e) {
    var src = e.target.result;
    var u = S.me(); if (!u) return;
    L.show('Updating avatar...');
    try {
      await DB.uu(u.id, { avatar: src });
      _me = Object.assign({}, _me, { avatar: src });
      S.set(_me);
      /* Update all avatar images on page */
      document.querySelectorAll('.u-avatar, #profAvImg, #profileAvatar, #vpMyAv').forEach(function(el) {
        if (el.tagName === 'IMG') el.src = src;
      });
      L.off();
      T('Avatar updated! 📷', 'success');
    } catch(err) { L.off(); T('Failed to update avatar', 'error'); }
  };
  reader.onerror = function() { T('Could not read file', 'error'); };
  reader.readAsDataURL(f);
};

/* ---- Games ---- */
Games.doSpin = Games.spin; /* alias */
Games.initBtns = function(u, c) {
  /* Spin button */
  var spinBtn = document.getElementById('btnSpin');
  if (spinBtn) {
    var spinSt = Games.cd(u.lastSpin, c.gameCooldown || 24);
    if (!spinSt.ok) {
      spinBtn.innerHTML = '<i class="fas fa-clock"></i> ' + Games.fmt(spinSt.wait);
      spinBtn.disabled = true; spinBtn.style.opacity = '0.5';
    } else {
      spinBtn.innerHTML = 'Spin (' + (c.spinCost || 50) + ' Coins)';
      spinBtn.disabled = false; spinBtn.style.opacity = '1';
    }
  }
  /* Slot button */
  var slotBtn = document.getElementById('btnSlot');
  if (slotBtn) {
    var slotSt = Games.cd(u.lastSlot, c.gameCooldown || 24);
    if (!slotSt.ok) {
      slotBtn.innerHTML = '<i class="fas fa-clock"></i> ' + Games.fmt(slotSt.wait);
      slotBtn.disabled = true; slotBtn.style.opacity = '0.5';
    } else {
      slotBtn.innerHTML = 'Play (' + (c.slotCost || 100) + ' Coins)';
      slotBtn.disabled = false; slotBtn.style.opacity = '1';
    }
  }
  /* Scratch cooldown */
  var scratchCd = document.getElementById('scratchCd');
  if (scratchCd) {
    var scrSt = Games.cd(u.lastScratch, c.gameCooldown || 24);
    scratchCd.textContent = scrSt.ok ? '' : 'Ready in ' + Games.fmt(scrSt.wait);
  }
  /* Daily wheel */
  if (typeof WheelSys !== 'undefined') WheelSys.initCd(u);
};

/* ---- Admin: missing methods ---- */
Admin.logout = function() {
  sessionStorage.removeItem('isAdmin');
  Router.go('auth');
};

Admin.tab = function(t, btn) {
  document.querySelectorAll('.atab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.atab-content').forEach(function(c) { c.classList.add('hidden'); });
  var btnEl = btn || document.querySelector('.atab[onclick*="' + t + '"]');
  if (btnEl) btnEl.classList.add('active');
  var con = document.getElementById('aTab-' + t);
  if (con) con.classList.remove('hidden');
  /* Load content */
  if (t === 'overview')    Admin.renderOverview();
  if (t === 'users')       Admin.searchUsers('');
  if (t === 'videos')      Admin.vidList();
  if (t === 'tasks')       Admin.renderTasks();
  if (t === 'withdrawals') Admin.filterWD('pending', null);
  if (t === 'monetize')    Admin.monetizeList();
  if (t === 'config')      Admin.loadConfig();
};

Admin.renderOverview = async function() {
  var grid = document.getElementById('adminStatsGrid');
  if (!grid) return;
  grid.innerHTML = '<p style="color:#888;text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
  try {
    var users = await DB.users();
    var wds   = await DB.wds();
    var vids  = await DB.vids();
    var today = new Date().toDateString();
    var pending  = wds.filter(function(w){ return w.status === 'Pending'; }).length;
    var approved = wds.filter(function(w){ return w.status === 'Approved'; });
    var totalPaid = approved.reduce(function(s,w){ return s + (w.amt||0); }, 0);
    var newToday  = users.filter(function(u){ return new Date(u.joinedAt||0).toDateString()===today; }).length;
    var banned    = users.filter(function(u){ return u.isBanned; }).length;
    var monetized = users.filter(function(u){ return u.monetized; }).length;
    grid.innerHTML =
      '<div class="astat"><i class="fas fa-users"></i><h3>' + users.length + '</h3><small>Total Users</small></div>' +
      '<div class="astat"><i class="fas fa-user-plus" style="color:#34d399"></i><h3>+' + newToday + '</h3><small>New Today</small></div>' +
      '<div class="astat"><i class="fas fa-clock" style="color:#fbbf24"></i><h3>' + pending + '</h3><small>Pending WD</small></div>' +
      '<div class="astat"><i class="fas fa-money-bill" style="color:#34d399"></i><h3>৳' + totalPaid.toFixed(0) + '</h3><small>Total Paid</small></div>' +
      '<div class="astat"><i class="fas fa-video" style="color:#8b5cf6"></i><h3>' + vids.length + '</h3><small>Videos</small></div>' +
      '<div class="astat"><i class="fas fa-coins" style="color:#ffd700"></i><h3>' + monetized + '</h3><small>Monetized</small></div>' +
      '<div class="astat"><i class="fas fa-ban" style="color:#ef4444"></i><h3>' + banned + '</h3><small>Banned</small></div>' +
      '<div class="astat" style="cursor:pointer" onclick="Admin.export()"><i class="fas fa-download" style="color:#06b6d4"></i><h3>CSV</h3><small>Export Users</small></div>';
  } catch(e) {
    if (grid) grid.innerHTML = '<p style="color:#ef4444;text-align:center;padding:20px">Failed to load stats</p>';
  }
};

Admin.searchUsers = async function(query) {
  var list = document.getElementById('aUserList');
  if (!list) return;
  list.innerHTML = '<p style="color:#888;text-align:center;padding:14px"><i class="fas fa-spinner fa-spin"></i></p>';
  try {
    var users = await DB.users();
    var q = (query || '').toLowerCase().trim();
    if (q) users = users.filter(function(u) {
      return (u.username||'').toLowerCase().includes(q) ||
             (u.displayName||'').toLowerCase().includes(q) ||
             (u.mobile||'').includes(q);
    });
    if (!users.length) { list.innerHTML = '<p style="color:#888;text-align:center;padding:20px">No users found</p>'; return; }
    list.innerHTML = '';
    users.forEach(function(u) {
      var d = document.createElement('div');
      d.className = 'au-card';
      d.innerHTML =
        '<img src="' + (u.avatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png') + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);flex-shrink:0">' +
        '<div style="flex:1;margin-left:10px;min-width:0">' +
          '<div style="font-weight:700;font-size:0.9rem">' + (u.displayName||u.username) + (u.isBanned?' <span style="color:#ef4444">[BANNED]</span>':'') + (u.monetized?' <span style="color:#ffd700">💰</span>':'') + '</div>' +
          '<small style="color:#888">@' + u.username + ' • ' + (u.mobile||'') + '</small><br>' +
          '<small style="color:#666">' + (u.coins||0).toLocaleString() + ' coins | ৳' + (u.balance||0).toFixed(2) + ' | $' + (u.balanceUSD||0).toFixed(4) + '</small>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">' +
          '<button class="btn btn-sm ' + (u.isBanned?'btn-g':'btn-r') + '" onclick="Admin.ban(\'' + u.id + '\')">' + (u.isBanned?'Unban':'Ban') + '</button>' +
          '<button class="btn btn-sm btn-o" onclick="Admin.editUser(\'' + u.id + '\')">Edit</button>' +
        '</div>';
      list.appendChild(d);
    });
  } catch(e) {
    if (list) list.innerHTML = '<p style="color:#ef4444;text-align:center;padding:20px">Error loading users</p>';
  }
};

Admin.editUser = async function(uid) {
  var u = await DB.getUser(uid);
  if (!u) return;
  var coins = prompt('Edit coins for ' + (u.displayName||u.username) + '\nCurrent: ' + (u.coins||0) + '\nEnter new value:');
  if (coins === null) return;
  var c = parseInt(coins);
  if (isNaN(c) || c < 0) return T('Invalid value', 'error');
  var bal = prompt('Edit BDT balance\nCurrent: ৳' + (u.balance||0).toFixed(2) + '\nEnter new value:');
  if (bal === null) return;
  var b = parseFloat(bal);
  if (isNaN(b) || b < 0) return T('Invalid value', 'error');
  await DB.uu(uid, { coins: c, balance: b });
  T('User updated!', 'success');
  Admin.searchUsers('');
};

Admin.filterWD = async function(status, btn) {
  if (btn) {
    document.querySelectorAll('.afilter').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
  }
  var list = document.getElementById('aWDList');
  if (!list) return;
  list.innerHTML = '<p style="color:#888;text-align:center;padding:14px"><i class="fas fa-spinner fa-spin"></i></p>';
  try {
    var all = await DB.wds();
    var filtered = status === 'all' ? all : all.filter(function(w){ return (w.status||'').toLowerCase() === status; });
    filtered = filtered.slice().reverse();
    if (!filtered.length) { list.innerHTML = '<p style="color:#888;text-align:center;padding:20px">No ' + status + ' withdrawals</p>'; return; }
    var icons = { 'bKash':'📱', 'Bank Transfer (BDT)':'🇧🇩', 'Bank Transfer (USD)':'🇺🇸' };
    list.innerHTML = '';
    filtered.forEach(function(w) {
      var sc = w.status==='Approved'?'sa':w.status==='Rejected'?'sr':'sp';
      var valStr = w.currency==='USD' ? '$'+(w.amtUSD||w.amt||0).toFixed(4) : '৳'+(w.amt||0).toFixed(2);
      var d = document.createElement('div');
      d.className = 'awd-card';
      d.innerHTML =
        '<div class="awd-info">' +
          '<b>' + (icons[w.method]||'💸') + ' ' + (w.username||'') + '</b>' +
          '<span style="color:#888">' + (w.method||'') + ' • ' + (w.account||w.number||w.holder||'') + '</span>' +
          '<span style="color:var(--gold)">' + valStr + '</span>' +
          (w.bank ? '<small style="color:#666">' + w.bank + (w.branch?' — '+w.branch:'') + '</small>' : '') +
          '<small style="color:#555">' + new Date(w.id||0).toLocaleString('en-BD') + '</small>' +
        '</div>' +
        '<div class="awd-act">' +
          '<span class="sbadge ' + sc + '">' + (w.status||'Pending') + '</span>' +
          (w.status==='Pending' ?
            '<button class="btn btn-sm btn-g" onclick="Admin.procWD(' + w.id + ',\'Approved\')">✅</button>' +
            '<button class="btn btn-sm btn-r" onclick="Admin.procWD(' + w.id + ',\'Rejected\')">❌</button>'
          : '') +
        '</div>';
      list.appendChild(d);
    });
  } catch(e) {
    if (list) list.innerHTML = '<p style="color:#ef4444;text-align:center;padding:20px">Error loading withdrawals</p>';
  }
};

Admin.loadConfig = function() {
  var set = function(id,v){ var e=document.getElementById(id); if(e)e.value=v; };
  var chk = function(id,v){ var e=document.getElementById(id); if(e)e.checked=v; };
  set('cfCooldown', _cfg.gameCooldown||24);
  set('cfSpin',     _cfg.spinCost||50);
  set('cfScratch',  _cfg.scratchCost||20);
  set('cfSlot',     _cfg.slotCost||100);
  set('cfMinWD',    _cfg.minWithdraw||500);
  set('cfRate',     _cfg.coinToBDT||0.05);
  set('cfRefBonus', _cfg.referralBonus||1000);
  set('cfRefReq',   _cfg.referralTasksReq||3);
  set('cfHomeAd',   _cfg.adCode||'');
  set('viewRate',   _cfg.viewCoinRate||5);
  set('viewerRate', _cfg.viewerCoinRate||1);
  set('uploadBonus',_cfg.uploadBonus||50);
  set('monCoins',   _cfg.monetizationCoins||10000000);
  set('adSkip',     _cfg.adSkipTime||5);
  set('adFreq',     _cfg.adFrequency||1);
  set('adCode',     _cfg.videoAdCode||'');
  chk('adEnabled',  !!_cfg.videoAdEnabled);
  chk('cfMaint',    !!_cfg.maintenanceMode);
};

Admin.saveConfig = async function() {
  var g = function(id,def){ var e=document.getElementById(id); return e?(parseFloat(e.value)||def):def; };
  var chk = function(id){ var e=document.getElementById(id); return e?e.checked:false; };
  var upd = {
    gameCooldown:    g('cfCooldown',24),
    spinCost:        g('cfSpin',50),
    scratchCost:     g('cfScratch',20),
    slotCost:        g('cfSlot',100),
    minWithdraw:     g('cfMinWD',500),
    coinToBDT:       g('cfRate',0.05),
    referralBonus:   g('cfRefBonus',1000),
    referralTasksReq:g('cfRefReq',3),
    maintenanceMode: chk('cfMaint'),
    adCode:          (document.getElementById('cfHomeAd')||{}).value||''
  };
  L.show('Saving...');
  try {
    await DB.u('config', upd);
    Object.assign(_cfg, upd);
    L.off();
    T('Config saved! ✅', 'success');
  } catch(e) { L.off(); T('Save failed', 'error'); }
};

Admin.saveVideoCoinCfg = async function() {
  var g = function(id,def){ var e=document.getElementById(id); return e?(parseFloat(e.value)||def):def; };
  var upd = {
    viewCoinRate:     g('viewRate',5),
    viewerCoinRate:   g('viewerRate',1),
    uploadBonus:      g('uploadBonus',50),
    monetizationCoins:g('monCoins',10000000)
  };
  L.show('Saving...');
  try {
    await DB.u('config', upd);
    Object.assign(_cfg, upd);
    L.off();
    T('Video coin settings saved! ✅', 'success');
  } catch(e) { L.off(); T('Save failed', 'error'); }
};

Admin.saveAds = async function() {
  var g = function(id,def){ var e=document.getElementById(id); return e?(parseFloat(e.value)||def):def; };
  var upd = {
    videoAdEnabled: (document.getElementById('adEnabled')||{}).checked||false,
    videoAdCode:    (document.getElementById('adCode')||{}).value||'',
    adSkipTime:     g('adSkip',5),
    adFrequency:    g('adFreq',1),
    adType:         typeof _selectedAdType!=='undefined' ? _selectedAdType : 'preroll'
  };
  L.show('Saving...');
  try {
    await DB.u('config', upd);
    Object.assign(_cfg, upd);
    L.off();
    T('Ad settings saved! ✅', 'success');
  } catch(e) { L.off(); T('Save failed', 'error'); }
};

Admin.setAdType = function(type, btn) {
  if (typeof _selectedAdType !== 'undefined') _selectedAdType = type;
  document.querySelectorAll('.atype-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
};

Admin.sendPushAll = async function() {
  var title = (document.getElementById('pushTitle')||{}).value||'';
  var body  = (document.getElementById('pushBody') ||{}).value||'';
  if (!title || !body) return T('Title and message are required', 'warning');
  L.show('Sending to all users...');
  try {
    /* Save broadcast to Firebase — all clients poll this */
    var msg = { id:'push_'+Date.now(), title:title, body:body, sentAt:new Date().toISOString(), target:'all' };
    await DB.w('broadcasts/' + msg.id, msg);
    /* Also notify via PWA if available */
    if (typeof PWA !== 'undefined' && PWA._notifGranted) PWA.sendLocalNotif(title, body);
    L.off();
    var el = document.getElementById('pushSentMsg');
    if (el) { el.textContent = '✅ Broadcast sent to all users!'; setTimeout(function(){ el.textContent=''; }, 4000); }
    T('Push sent to all users! 📢', 'success');
  } catch(e) { L.off(); T('Failed to send push', 'error'); }
};

Admin.sendPushTest = function() {
  var title = (document.getElementById('pushTitle')||{}).value||'Test Notification';
  var body  = (document.getElementById('pushBody') ||{}).value||'This is a test notification from admin.';
  if (typeof PWA !== 'undefined') {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      PWA.sendLocalNotif(title, body);
      T('Test notification sent! 🔔', 'success');
    } else {
      PWA.requestNotifPermission().then(function(){
        PWA.sendLocalNotif(title, body);
      });
    }
  } else {
    T('Push notifications not available on this device', 'info');
  }
};

Admin.export = async function() {
  try {
    var users = await DB.users();
    var rows  = ['Username,DisplayName,Mobile,Coins,BDT Balance,USD Balance,Tasks,Videos Views,Monetized,Banned,Joined'];
    users.forEach(function(u) {
      rows.push([
        u.username, u.displayName||u.username, u.mobile||'',
        u.coins||0, (u.balance||0).toFixed(2), (u.balanceUSD||0).toFixed(4),
        u.tasksCompleted||0, u.totalVideoViews||0,
        u.monetized?'Yes':'No', u.isBanned?'Yes':'No',
        new Date(u.joinedAt||0).toLocaleDateString()
      ].join(','));
    });
    var csv = rows.join('\n');
    var a   = document.createElement('a');
    a.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'taskmint_users_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    T('Users exported! ✅', 'success');
  } catch(e) { T('Export failed', 'error'); }
};

/* ---- Router.back ---- */
Router.back = function() {
  Router.go(_prevPage || 'home');
};

/* ---- UI._profile — fix for new HTML IDs ---- */
var _origUIProfile2 = UI._profile ? UI._profile.bind(UI) : null;
UI._profile = function(u) {
  /* New HTML IDs */
  var setEl = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  var setVal = function(id, val) { var e = document.getElementById(id); if (e) e.value = val; };
  var setSrc = function(id, val) { var e = document.getElementById(id); if (e && e.tagName==='IMG') e.src = val; };

  setSrc('profAvImg', u.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png');
  setEl('profName', u.displayName || u.username);
  setEl('profBio',  u.bio || '');
  setEl('psCoin',   (u.coins||0).toLocaleString());
  setEl('psBal',    '৳' + (u.balance||0).toFixed(2));
  setEl('psLevel',  'Lv' + (typeof LvSys!=='undefined' ? LvSys.getLevel(LvSys.getXP(u)).n : 1));
  setEl('psVideos', '');
  setVal('editName', u.displayName || u.username);
  setVal('editBio',  u.bio || '');

  /* Count user videos */
  DB.vids().then(function(vids) {
    var cnt = vids.filter(function(v){ return v.uploaderId===u.id; }).length;
    setEl('psVideos', cnt);
  }).catch(function(){});

  /* Avatar grid */
  var grid = document.getElementById('avatarGrid');
  if (grid && !grid.children.length) {
    var avatars = [
      'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140051.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140061.png',
      'https://cdn-icons-png.flaticon.com/512/1326/1326405.png',
      'https://cdn-icons-png.flaticon.com/512/1326/1326377.png',
      'https://cdn-icons-png.flaticon.com/512/2922/2922510.png',
      'https://cdn-icons-png.flaticon.com/512/2922/2922656.png',
      'https://cdn-icons-png.flaticon.com/512/2922/2922561.png',
      'https://cdn-icons-png.flaticon.com/512/2922/2922688.png',
      'https://cdn-icons-png.flaticon.com/512/2922/2922522.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140047.png'
    ];
    avatars.forEach(function(av) {
      var img = document.createElement('img');
      img.src = av;
      img.className = 'av-opt';
      img.onclick = function() { Profile.setAvatar(av); };
      grid.appendChild(img);
    });
  }

  /* Level badge */
  if (typeof LvSys !== 'undefined') LvSys.update(u);

  /* Old profile IDs for backward compat */
  if (_origUIProfile2) {
    try { _origUIProfile2(u); } catch(e) {}
  }
};

/* ---- UI.load: also load leaderboard ---- */
var _origUILoad = UI.load ? UI.load.bind(UI) : null;
UI.load = async function(pid) {
  if (_origUILoad) await _origUILoad(pid);
  if (pid === 'leaderboard') setTimeout(function(){ LbSys.show('coins'); }, 100);
  if (pid === 'home') {
    setTimeout(function(){
      if (typeof StreakSys !== 'undefined') StreakSys.init();
      if (typeof MissionSys !== 'undefined') MissionSys.render();
      if (typeof AchSys !== 'undefined') AchSys.renderHome();
      if (typeof NotifSys !== 'undefined') NotifSys.checkUnread();
    }, 200);
  }
  if (pid === 'games') {
    setTimeout(function(){
      var u = S.me();
      if (u) DB.getUser(u.id).then(function(ud){
        if (ud) { Games.initBtns(ud, _cfg); if (typeof WheelSys!=='undefined'){WheelSys.initCd(ud);WheelSys.renderWheel();} }
      }).catch(function(){});
    }, 100);
  }
};

