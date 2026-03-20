/* ============================================================
   TASKMINT PRO v8 — Clean, Bug-Free Version
   ============================================================ */
'use strict';

const SESSION_KEY = 'taskmint_session';
const ADMIN_PIN   = 'admin123';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZSJfWPLRjxlfceUiUHQQ0JonunLVe2_c",
  authDomain:        "taskmint-pro.firebaseapp.com",
  databaseURL:       "https://taskmint-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "taskmint-pro",
  storageBucket:     "taskmint-pro.firebasestorage.app",
  messagingSenderId: "381437349027",
  appId:             "1:381437349027:web:8e6a98be52801423470316"
};

const DefaultConfig = {
  referralBonus: 500,
  referralTasksReq: 3,
  minWithdraw: 200,
  maintenanceMode: false,
  adTimer: 10,
  adCode: '',
  gameCooldown: 24,
  spinCost: 50,
  scratchCost: 20,
  slotCost: 100,
  withdrawMethods: ['bKash','Nagad','Rocket','DBBL Mobile'],
  coinToBDT: 0.01,
  videoAdEnabled: false,
  videoAdCode: '',
  shortsAdInterval: 60,
  longAdInterval: 300,
  shortsAdSkip: 5,
  longAdSkip: 10,
  viewCoinRate: 0.001,
  monetizationCoins: 1000000
};

/* ---- State ---- */
var _db          = null;
var _appConfig   = Object.assign({}, DefaultConfig);
var _currentUser = null;
var _allVideos   = [];
var _curCategory = 'All';
var _searchQuery = '';
var _prevPage    = 'home';
var _curPage     = 'auth';

/* ============================================================
   FIREBASE
   ============================================================ */
var FDB = {
  init: function() {
    return new Promise(function(resolve, reject) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        _db = firebase.database();
      } catch(e) {
        reject(new Error('Firebase init failed: ' + e.message));
        return;
      }
      var t = setTimeout(function() {
        reject(new Error('Connection timed out. Check Firebase rules and internet.'));
      }, 10000);
      _db.ref('config').get().then(function(snap) {
        clearTimeout(t);
        if (snap.exists()) {
          _appConfig = Object.assign({}, DefaultConfig, snap.val());
        } else {
          _appConfig = Object.assign({}, DefaultConfig);
          _db.ref('config').set(DefaultConfig);
        }
        resolve();
      }).catch(function(err) {
        clearTimeout(t);
        reject(new Error('DB read failed: ' + err.message));
      });
    });
  },

  read: function(path) {
    return new Promise(function(resolve) {
      var t = setTimeout(function() { resolve(null); }, 8000);
      _db.ref(path).once('value',
        function(s) { clearTimeout(t); resolve(s.exists() ? s.val() : null); },
        function()  { clearTimeout(t); resolve(null); }
      );
    });
  },

  write:  function(p, d) { return _db.ref(p).set(d).catch(function(){}); },
  update: function(p, d) { return _db.ref(p).update(d).catch(function(){}); },
  remove: function(p)    { return _db.ref(p).remove().catch(function(){}); },

  findUser: function(field, value) {
    return new Promise(function(resolve) {
      var t = setTimeout(function() { resolve(null); }, 8000);
      _db.ref('users').once('value',
        function(snap) {
          clearTimeout(t);
          if (!snap.exists()) { resolve(null); return; }
          var data  = snap.val();
          var keys  = Object.keys(data);
          var found = null;
          for (var i = 0; i < keys.length; i++) {
            if (data[keys[i]][field] === value) {
              found = Object.assign({}, data[keys[i]], { id: keys[i] });
              break;
            }
          }
          resolve(found);
        },
        function() { clearTimeout(t); resolve(null); }
      );
    });
  },

  getUser:    function(id) { return FDB.read('users/' + id); },
  updateUser: function(id, d) { return FDB.update('users/' + id, d); },
  saveUser:   function(u) {
    var clean = Object.assign({}, u);
    delete clean._fbKey;
    return _db.ref('users/' + u.id).set(clean);
  },

  getAllUsers: function() {
    return FDB.read('users').then(function(d) {
      if (!d) return [];
      return Object.keys(d).map(function(id) { return Object.assign({}, d[id], { id: id }); });
    });
  },

  getVideos: function() {
    return FDB.read('videos').then(function(d) {
      if (!d) return [];
      return Object.keys(d).map(function(id) { return Object.assign({}, d[id], { id: id }); });
    });
  },
  saveVideo:   function(v)  { return _db.ref('videos/' + v.id).set(v); },
  deleteVideo: function(id) { return FDB.remove('videos/' + id); },

  getTasks: function() {
    return FDB.read('tasks').then(function(d) {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      return Object.keys(d).map(function(id) { return Object.assign({}, d[id], { id: id }); });
    });
  },

  getWithdrawals: function() {
    return FDB.read('withdrawals').then(function(d) {
      if (!d) return [];
      return Object.keys(d).map(function(k) { return Object.assign({}, d[k], { _key: k }); });
    });
  },
  saveWithdrawal: function(w) { return _db.ref('withdrawals/w_' + w.id).set(w); },
  updateWithdrawalByWId: function(wId, changes) {
    return FDB.read('withdrawals').then(function(d) {
      if (!d) return;
      var keys = Object.keys(d);
      for (var i = 0; i < keys.length; i++) {
        if (d[keys[i]].id === wId) {
          return FDB.update('withdrawals/' + keys[i], changes);
        }
      }
    });
  }
};

/* ============================================================
   SESSION
   ============================================================ */
var Session = {
  get: function() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(e) { return null; }
  },
  set: function(u) {
    _currentUser = u;
    var safe = Object.assign({}, u);
    delete safe.videoData;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  },
  clear: function() {
    _currentUser = null;
    localStorage.removeItem(SESSION_KEY);
  },
  current: function() {
    return _currentUser || Session.get();
  }
};

/* ============================================================
   LOADING
   ============================================================ */
var Loading = {
  _n: 0,
  show: function(msg) {
    Loading._n++;
    var el = document.getElementById('globalLoading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalLoading';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,26,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;';
      el.innerHTML = '<div class="loading-spinner"></div><p id="loadingMsg" style="color:#ccc;font-size:0.9rem;margin:0;"></p>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    var m = document.getElementById('loadingMsg');
    if (m) m.textContent = msg || 'Loading...';
  },
  hide: function() {
    Loading._n = Math.max(0, Loading._n - 1);
    if (Loading._n === 0) {
      var el = document.getElementById('globalLoading');
      if (el) el.style.display = 'none';
    }
  },
  forceHide: function() {
    Loading._n = 0;
    var el = document.getElementById('globalLoading');
    if (el) el.style.display = 'none';
  }
};

/* ============================================================
   ROUTER
   ============================================================ */
var Router = {
  go: function(pageId) {
    _prevPage = _curPage;
    _curPage  = pageId;
    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.add('hidden');
    });
    var page = document.getElementById('page-' + pageId);
    if (page) page.classList.remove('hidden');
    var nav = document.getElementById('mainNav');
    if (pageId === 'auth' || pageId === 'admin') {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    document.querySelectorAll('.nav-item').forEach(function(el) {
      el.classList.remove('active');
    });
    var navEl = document.getElementById('nav-' + pageId);
    if (navEl) navEl.classList.add('active');
    UI.renderSync();
    setTimeout(function() { UI.renderAsync(pageId); }, 50);
    window.scrollTo(0, 0);
  },

  init: async function() {
    /* inject spinner CSS */
    var s = document.createElement('style');
    s.textContent = '@keyframes _spin{to{transform:rotate(360deg)}}.loading-spinner{width:44px;height:44px;border:3px solid rgba(255,255,255,0.1);border-top-color:#00f2ea;border-radius:50%;animation:_spin .75s linear infinite;}';
    document.head.appendChild(s);

    Loading.show('Connecting to database...');
    try {
      await FDB.init();
    } catch(err) {
      Loading.forceHide();
      document.body.innerHTML =
        '<div style="min-height:100vh;background:#0a0a1a;display:flex;align-items:center;justify-content:center;padding:20px;">' +
        '<div style="background:rgba(255,50,50,0.08);border:1px solid rgba(255,80,80,0.25);border-radius:20px;padding:30px;max-width:380px;width:100%;text-align:center;">' +
        '<div style="font-size:3rem;margin-bottom:15px;">⚠️</div>' +
        '<h2 style="color:#ff6b6b;margin-bottom:10px;">Database Failed</h2>' +
        '<p style="color:#aaa;font-size:0.85rem;margin-bottom:15px;">' + err.message + '</p>' +
        '<p style="color:#777;font-size:0.8rem;margin-bottom:20px;">Make sure Firebase rules allow read/write</p>' +
        '<button onclick="location.reload()" style="background:linear-gradient(90deg,#00f2ea,#7b2ff7);color:white;border:none;padding:12px 28px;border-radius:30px;font-weight:bold;cursor:pointer;">🔄 Retry</button>' +
        '</div></div>';
      return;
    }

    /* Auto login from cache */
    var saved = Session.get();
    if (saved && saved.id && saved.username) {
      _currentUser = saved;
      Loading.hide();
      Router.go('home');
      /* refresh in background */
      FDB.getUser(saved.id).then(function(u) {
        if (!u) return;
        if (u.isBanned) { Session.clear(); Router.go('auth'); UI.toast('Account suspended', 'error'); return; }
        _currentUser = Object.assign({}, u, { id: saved.id });
        Session.set(_currentUser);
        UI.renderSync();
      }).catch(function(){});
      return;
    }
    Loading.hide();
    Router.go('auth');
  }
};

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type) {
  var colors = {
    success: 'linear-gradient(90deg,#00d26a,#00a855)',
    error:   'linear-gradient(90deg,#ff4b4b,#cc2222)',
    warning: 'linear-gradient(90deg,#ffd700,#c8930a)',
    info:    'linear-gradient(90deg,#00f2ea,#b026ff)'
  };
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:' + (colors[type] || colors.info) + ';color:#fff;padding:12px 22px;' +
    'border-radius:30px;font-weight:700;z-index:99998;font-size:0.88rem;' +
    'box-shadow:0 4px 20px rgba(0,0,0,0.5);max-width:90%;text-align:center;transition:opacity .4s;';
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity = '0'; }, 2800);
  setTimeout(function() { t.remove(); }, 3200);
}

/* ============================================================
   UI
   ============================================================ */
var UI = {
  toast: toast,

  toggleAuth: function(mode) {
    if (mode === 'register') {
      document.getElementById('form-login').classList.add('hidden');
      document.getElementById('form-register').classList.remove('hidden');
    } else {
      document.getElementById('form-register').classList.add('hidden');
      document.getElementById('form-login').classList.remove('hidden');
    }
  },

  /* Fast sync render — cached user only */
  renderSync: function() {
    var u = Session.current();
    if (!u) return;
    var name = u.displayName || u.username || '';
    document.querySelectorAll('.u-name').forEach(function(e) { e.textContent = name; });
    document.querySelectorAll('.u-bal').forEach(function(e)  { e.textContent = '৳' + ((u.balance||0).toFixed(2)); });
    document.querySelectorAll('.u-coins').forEach(function(e){ e.textContent = (u.coins||0).toLocaleString(); });
    document.querySelectorAll('.u-avatar').forEach(function(e){ if (e.tagName==='IMG') e.src = u.avatar||''; });
  },

  /* Async render — fetches fresh data, no loading spinner */
  renderAsync: async function(pageId) {
    var u = Session.current();
    if (!u || !u.id) return;
    try {
      var fresh = await FDB.getUser(u.id);
      if (!fresh) return;
      _currentUser = Object.assign({}, fresh, { id: u.id });
      Session.set(_currentUser);
      UI.renderSync();

      if (pageId === 'home')     { UI._renderAd(); UI._renderTasks(); Games.initButtons(_currentUser, _appConfig); }
      if (pageId === 'referral') { UI._renderReferrals(_currentUser); }
      if (pageId === 'withdraw') { UI._checkWithdraw(_currentUser); UI._renderWithdrawals(_currentUser); UI._renderWithdrawMethods(); }
      if (pageId === 'videos')   { VideoSystem.loadAndRender(); }
      if (pageId === 'profile')  { UI._renderProfile(_currentUser); }
    } catch(e) { /* silent */ }
  },

  _renderAd: function() {
    var box = document.getElementById('homeAdContainer');
    if (!box || !_appConfig.adCode) return;
    box.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.innerHTML = _appConfig.adCode;
    box.appendChild(wrap);
    /* re-execute scripts so Adsterra works */
    box.querySelectorAll('script').forEach(function(old) {
      var ns = document.createElement('script');
      Array.from(old.attributes).forEach(function(a) { ns.setAttribute(a.name, a.value); });
      ns.textContent = old.textContent;
      old.parentNode.replaceChild(ns, old);
    });
  },

  _renderTasks: async function() {
    var l = document.getElementById('taskList');
    if (!l) return;
    var tasks = await FDB.getTasks();
    if (!tasks.length) { l.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">No active tasks right now.</p>'; return; }
    l.innerHTML = '';
    tasks.forEach(function(t) {
      var div = document.createElement('div');
      div.className = 'task-card glass';
      div.innerHTML =
        '<img src="' + (t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png') + '" class="task-icon" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
        '<div class="task-info"><b>' + t.title + '</b><span class="coin-badge">+' + t.reward + ' Coins</span></div>' +
        '<button class="btn btn-sm task-btn" onclick="Tasks.start(' + JSON.stringify(t.link||'#') + ',' + t.reward + ')"><i class="fas fa-play"></i> Start</button>';
      l.appendChild(div);
    });
  },

  _renderReferrals: function(u) {
    var codeEl = document.getElementById('myRefCode');
    if (codeEl) codeEl.textContent = u.refCode || '---';
    var locks    = u.lockedRewards || [];
    var unlocked = locks.filter(function(r) { return r.unlocked; }).length;
    var stats = document.getElementById('refStats');
    if (stats) stats.innerHTML =
      '<div class="ref-stat"><span>' + locks.length + '</span><small>Total Invites</small></div>' +
      '<div class="ref-stat"><span>' + unlocked + '</span><small>Unlocked</small></div>' +
      '<div class="ref-stat"><span>৳' + (unlocked*(_appConfig.referralBonus||500)*(_appConfig.coinToBDT||0.01)).toFixed(0) + '</span><small>Earned</small></div>';
    var l = document.getElementById('refList');
    if (!l) return;
    if (!locks.length) { l.innerHTML = '<p class="empty-msg">No referrals yet. Share your code!</p>'; return; }
    l.innerHTML = '';
    locks.forEach(function(r) {
      var pct = Math.min(100, (r.progress / (_appConfig.referralTasksReq||3)) * 100);
      l.innerHTML +=
        '<div class="glass ref-item"><div><b>' + r.sourceName + '</b>' +
        '<small style="color:#aaa;display:block;">Progress: ' + r.progress + '/' + (_appConfig.referralTasksReq||3) + '</small>' +
        '<div class="progress-bar"><div style="width:' + pct + '%"></div></div></div>' +
        '<span class="' + (r.unlocked?'badge-unlocked':'badge-locked') + '">' + (r.unlocked?'✅ ৳'+r.amount:'🔒 ৳'+r.amount) + '</span></div>';
    });
  },

  _checkWithdraw: function(u) {
    var lock = document.getElementById('withdrawLockNotice');
    var form = document.getElementById('withdrawForm');
    if (!lock || !form) return;
    if (u.monetized) { lock.classList.add('hidden'); form.classList.remove('hidden'); }
    else             { lock.classList.remove('hidden'); form.classList.add('hidden'); }
  },

  _renderWithdrawals: async function(u) {
    var l = document.getElementById('withdrawList');
    if (!l) return;
    var all  = await FDB.getWithdrawals();
    var mine = all.filter(function(w) { return w.userId === u.id; }).reverse();
    if (!mine.length) { l.innerHTML = '<p class="empty-msg">No withdrawal history yet.</p>'; return; }
    var icons = { bKash:'📱', Nagad:'🟠', Rocket:'🚀', 'DBBL Mobile':'🏦' };
    l.innerHTML = '';
    mine.forEach(function(w) {
      var sc = w.status==='Approved'?'status-approved':w.status==='Rejected'?'status-rejected':'status-pending';
      l.innerHTML +=
        '<div class="glass withdraw-history-item">' +
        '<div><b>' + (icons[w.method]||'💸') + ' ' + w.method + '</b>' +
        '<small style="color:#aaa;display:block;">' + w.number + ' • ' + new Date(w.id).toLocaleDateString('en-BD') + '</small></div>' +
        '<div style="text-align:right"><b style="color:var(--neon-gold)">৳' + w.amt.toFixed(2) + '</b>' +
        '<span class="status-badge ' + sc + '">' + w.status + '</span></div></div>';
    });
  },

  _renderWithdrawMethods: function() {
    var sel = document.getElementById('wMethod');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Method --</option>';
    (_appConfig.withdrawMethods||['bKash','Nagad','Rocket','DBBL Mobile']).forEach(function(m) {
      sel.innerHTML += '<option value="' + m + '">' + m + '</option>';
    });
  },

  _renderProfile: function(u) {
    var pa = document.getElementById('profileAvatar'); if (pa) pa.src = u.avatar||'';
    var pn = document.getElementById('profileName');   if (pn) pn.textContent = u.displayName||u.username;
    var pm = document.getElementById('profileMobile'); if (pm) pm.textContent = '📱 ' + u.mobile;
    var ps = document.getElementById('profileMonetizeStatus');
    if (ps) {
      if (u.monetized)                       ps.innerHTML = '<span class="monetized-badge">💰 Monetized Creator</span>';
      else if (u.monetizeStatus==='Pending') ps.innerHTML = '<span style="color:#f59e0b">⏳ Monetization Pending</span>';
      else                                   ps.innerHTML = '<span style="color:#555;font-size:0.78rem">Not monetized yet</span>';
    }
    var dn = document.getElementById('editDisplayName'); if (dn) dn.value = u.displayName||u.username;
    var pt = document.getElementById('profileTasks');    if (pt) pt.textContent = u.tasksCompleted||0;
    var pe = document.getElementById('profileEarned');   if (pe) pe.textContent = '৳'+(u.totalEarned||0).toFixed(2);
    var pj = document.getElementById('profileJoined');   if (pj) pj.textContent = new Date(u.joinedAt).toLocaleDateString('en-BD');
    var pv = document.getElementById('profileViews');    if (pv) pv.textContent = (u.totalVideoViews||0).toLocaleString();
  },

  copyRef: function() {
    var code = (document.getElementById('myRefCode')||{}).textContent || '';
    navigator.clipboard.writeText(code).then(function(){ toast('Copied!','success'); }).catch(function(){
      var el = document.createElement('textarea');
      el.value = code; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      toast('Copied!','success');
    });
  },

  shareRef: function() {
    var code = (document.getElementById('myRefCode')||{}).textContent || '';
    var msg  = 'Join TaskMint Pro! Use my code: ' + code;
    if (navigator.share) navigator.share({ title:'TaskMint Pro', text:msg });
    else { navigator.clipboard.writeText(msg); toast('Copied!','success'); }
  },

  requestWithdraw: async function() {
    var method = document.getElementById('wMethod').value;
    var number = document.getElementById('wNumber').value.trim();
    var amt    = parseFloat(document.getElementById('wAmt').value);
    if (!method)                 return toast('Select payment method','warning');
    if (!number||number.length<11) return toast('Enter valid mobile number','warning');
    if (isNaN(amt)||amt<=0)      return toast('Enter valid amount','warning');
    Loading.show('Processing...');
    try {
      var u   = await FDB.getUser(Session.current().id);
      var cfg = _appConfig;
      if (!u.monetized)          { Loading.hide(); return toast('Must be monetized to withdraw','error'); }
      if (amt>(u.balance||0))    { Loading.hide(); return toast('Insufficient balance','error'); }
      if (amt<cfg.minWithdraw)   { Loading.hide(); return toast('Minimum: ৳'+cfg.minWithdraw,'warning'); }
      var all = await FDB.getWithdrawals();
      if (all.some(function(w){ return w.userId===u.id && w.status==='Pending'; })) {
        Loading.hide(); return toast('Already have a pending request','warning');
      }
      var coinsDeduct = Math.ceil(amt / (cfg.coinToBDT||0.01));
      var newBal      = Math.max(0, (u.balance||0) - amt);
      var newCoins    = Math.max(0, (u.coins||0)   - coinsDeduct);
      await FDB.updateUser(u.id, { balance:newBal, coins:newCoins, totalWithdrawn:(u.totalWithdrawn||0)+amt });
      await FDB.saveWithdrawal({ id:Date.now(), userId:u.id, username:u.username, mobile:u.mobile, amt:amt, method:method, number:number, status:'Pending', coinsDeducted:coinsDeduct, requestedAt:new Date().toISOString(), processedAt:null });
      _currentUser = Object.assign({}, _currentUser, { balance:newBal, coins:newCoins });
      Session.set(_currentUser);
      Loading.hide();
      document.getElementById('wMethod').value = '';
      document.getElementById('wNumber').value = '';
      document.getElementById('wAmt').value    = '';
      toast('Withdrawal submitted!','success');
      UI.renderSync();
      UI._renderWithdrawals(Session.current());
    } catch(e) { Loading.hide(); toast('Failed. Try again.','error'); }
  }
};

/* ============================================================
   AUTH
   ============================================================ */
var Auth = {
  _uTimer: null,

  checkUsername: function(val) {
    var el = document.getElementById('usernameStatus');
    if (!el) return;
    clearTimeout(Auth._uTimer);
    if (!val || val.length < 3) { el.textContent = ''; return; }
    el.textContent = '⏳'; el.style.color = '#aaa';
    Auth._uTimer = setTimeout(async function() {
      var taken = await FDB.findUser('username', val);
      if (taken) { el.textContent = '✗ Taken';     el.style.color = '#ff6b6b'; }
      else        { el.textContent = '✓ Available'; el.style.color = '#00d26a'; }
    }, 700);
  },

  login: async function() {
    var username = document.getElementById('lUser').value.trim();
    var password = document.getElementById('lPass').value;
    if (!username || !password) return toast('Enter username and password','warning');
    Loading.show('Signing in...');
    var t = setTimeout(function() { Loading.forceHide(); toast('Timed out. Try again.','error'); }, 12000);
    try {
      if (_appConfig.maintenanceMode) { clearTimeout(t); Loading.forceHide(); return toast('Server under maintenance','warning'); }
      var user = await FDB.findUser('username', username);
      clearTimeout(t);
      if (!user)                     { Loading.forceHide(); return toast('Username not found','error'); }
      if (user.password !== password){ Loading.forceHide(); return toast('Wrong password','error'); }
      if (user.isBanned)             { Loading.forceHide(); return toast('Account suspended','error'); }
      _currentUser = user;
      Session.set(user);
      Loading.forceHide();
      Router.go('home');
    } catch(e) { clearTimeout(t); Loading.forceHide(); toast('Login failed. Try again.','error'); }
  },

  register: async function() {
    var username = document.getElementById('rUser').value.trim();
    var mobile   = document.getElementById('rMob').value.trim();
    var password = document.getElementById('rPass').value;
    var refCode  = document.getElementById('rRef').value.trim().toUpperCase();
    if (!username||!mobile||!password) return toast('Fill all required fields','warning');
    if (username.length < 3)  return toast('Username min 3 characters','warning');
    if (mobile.length   < 11) return toast('Enter valid mobile number','warning');
    if (password.length < 6)  return toast('Password min 6 characters','warning');
    Loading.show('Creating account...');
    var t = setTimeout(function() { Loading.forceHide(); toast('Timed out. Try again.','error'); }, 15000);
    try {
      var ex  = await FDB.findUser('username', username);
      if (ex)  { clearTimeout(t); Loading.forceHide(); return toast('Username already taken','error'); }
      var exM = await FDB.findUser('mobile', mobile);
      if (exM) { clearTimeout(t); Loading.forceHide(); return toast('Mobile already registered','error'); }
      var newId   = 'u_' + Date.now();
      var newUser = {
        id:newId, username:username, mobile:mobile, password:password, displayName:username,
        avatar:'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        balance:0, coins:100,
        refCode:'TM' + Math.floor(1000 + Math.random()*9000),
        referredBy:refCode||null,
        joinedAt:new Date().toISOString(),
        isBanned:false, tasksCompleted:0, lockedRewards:[],
        lastSpin:0, lastScratch:0, lastSlot:0,
        totalEarned:0, totalWithdrawn:0,
        videoHistory:[], subscriptions:[],
        monetized:false, monetizeStatus:null,
        totalVideoViews:0, videoEarnings:0,
        channelDesc:'', channelBanner:''
      };
      if (refCode) {
        var allU = await FDB.read('users');
        if (allU) {
          var rKey = Object.keys(allU).find(function(k){ return allU[k].refCode === refCode; });
          if (rKey) {
            var locks = (allU[rKey].lockedRewards||[]).slice();
            locks.push({ sourceId:newId, sourceName:username, amount:_appConfig.referralBonus, unlocked:false, progress:0 });
            await FDB.updateUser(rKey, { lockedRewards:locks });
          } else { newUser.referredBy = null; }
        }
      }
      await FDB.saveUser(newUser);
      clearTimeout(t);
      _currentUser = newUser; Session.set(newUser); Loading.forceHide();
      toast('Welcome! You got 100 free coins! 🎉','success');
      setTimeout(function(){ Router.go('home'); }, 1200);
    } catch(e) { clearTimeout(t); Loading.forceHide(); toast('Registration failed. Try again.','error'); }
  },

  logout: function() {
    if (confirm('Are you sure you want to logout?')) { Session.clear(); Router.go('auth'); }
  },

  adminLogin: function() {
    var pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('isAdmin','true');
      document.getElementById('admin-gate').classList.add('hidden');
      Router.go('admin');
      Admin.init();
    } else { toast('Wrong admin PIN','error'); }
  }
};

/* ============================================================
   PROFILE
   ============================================================ */
var Profile = {
  openMyChannel: function() {
    var u = Session.current();
    if (u) ChannelSystem.open(u.id);
  },

  uploadPic: function(input) {
    if (!input.files || !input.files[0]) return;
    var file = input.files[0];
    if (!file.type.startsWith('image/')) return toast('Select an image file','warning');
    if (file.size > 5*1024*1024)          return toast('Image too large. Max 5MB.','error');
    var reader = new FileReader();
    reader.onload = async function(e) {
      var src = e.target.result;
      var u   = Session.current(); if (!u) return;
      Loading.show('Updating...');
      await FDB.updateUser(u.id, { avatar:src });
      _currentUser = Object.assign({}, _currentUser, { avatar:src });
      Session.set(_currentUser);
      document.querySelectorAll('.u-avatar').forEach(function(el){ if(el.tagName==='IMG') el.src=src; });
      var pa = document.getElementById('profileAvatar'); if (pa) pa.src = src;
      Loading.hide(); toast('Profile picture updated!','success');
    };
    reader.readAsDataURL(file);
  },

  setAvatar: async function(src) {
    var u = Session.current(); if (!u) return;
    Loading.show('Updating...');
    await FDB.updateUser(u.id, { avatar:src });
    _currentUser = Object.assign({}, _currentUser, { avatar:src });
    Session.set(_currentUser);
    document.querySelectorAll('.u-avatar').forEach(function(el){ if(el.tagName==='IMG') el.src=src; });
    var pa = document.getElementById('profileAvatar'); if (pa) pa.src = src;
    Loading.hide(); toast('Avatar updated!','success');
  },

  saveChanges: async function() {
    var dn  = document.getElementById('editDisplayName').value.trim();
    var np  = document.getElementById('editNewPass').value;
    var cp2 = document.getElementById('editConfirmPass').value;
    var cp  = document.getElementById('editCurrentPass').value;
    if (!cp) return toast('Enter current password','warning');
    var u = Session.current(); if (!u) return;
    Loading.show('Saving...');
    var userData = await FDB.getUser(u.id);
    if (userData.password !== cp) { Loading.hide(); return toast('Incorrect current password','error'); }
    var updates = {};
    if (dn && dn.length >= 2) updates.displayName = dn;
    if (np) {
      if (np.length < 6)  { Loading.hide(); return toast('Password min 6 characters','warning'); }
      if (np !== cp2)     { Loading.hide(); return toast('Passwords do not match','error'); }
      updates.password = np;
    }
    if (!Object.keys(updates).length) { Loading.hide(); return toast('No changes to save','info'); }
    await FDB.updateUser(u.id, updates);
    _currentUser = Object.assign({}, _currentUser, updates);
    Session.set(_currentUser);
    Loading.hide();
    ['editCurrentPass','editNewPass','editConfirmPass'].forEach(function(id){
      var e = document.getElementById(id); if (e) e.value = '';
    });
    toast('Profile updated!','success');
    UI.renderSync();
  }
};

/* ============================================================
   TASKS
   ============================================================ */
var Tasks = {
  start: function(link, reward) {
    if (link && link !== '#') window.open(link, '_blank');
    var ov = document.getElementById('taskOverlay');
    var te = document.getElementById('taskTimer');
    ov.classList.remove('hidden');
    var left = _appConfig.adTimer || 10;
    te.textContent = left;
    var iv = setInterval(function() {
      left--; te.textContent = left;
      if (left <= 0) { clearInterval(iv); ov.classList.add('hidden'); Tasks.complete(reward); }
    }, 1000);
  },

  complete: async function(reward) {
    var u = Session.current(); if (!u) return;
    Loading.show('Claiming...');
    try {
      var ud  = await FDB.getUser(u.id);
      var cfg = _appConfig;
      var earned = reward * (cfg.coinToBDT||0.01);
      var upd = { coins:(ud.coins||0)+reward, tasksCompleted:(ud.tasksCompleted||0)+1, totalEarned:(ud.totalEarned||0)+earned };
      if (ud.monetized) upd.balance = (ud.balance||0) + earned;
      await FDB.updateUser(u.id, upd);
      /* referral progress */
      if (ud.referredBy) {
        var allU = await FDB.read('users');
        if (allU) {
          var rKey = Object.keys(allU).find(function(k){ return allU[k].refCode === ud.referredBy; });
          if (rKey) {
            var locks = (allU[rKey].lockedRewards||[]).slice();
            var lock  = locks.find(function(r){ return r.sourceId === u.id; });
            if (lock && !lock.unlocked) {
              lock.progress++;
              if (lock.progress >= (cfg.referralTasksReq||3)) {
                lock.unlocked = true;
                if (allU[rKey].monetized) await FDB.updateUser(rKey, { lockedRewards:locks, balance:(allU[rKey].balance||0)+lock.amount*(cfg.coinToBDT||0.01) });
                else                      await FDB.updateUser(rKey, { lockedRewards:locks });
              } else { await FDB.updateUser(rKey, { lockedRewards:locks }); }
            }
          }
        }
      }
      _currentUser = Object.assign({}, _currentUser, { coins:(_currentUser.coins||0)+reward });
      if (ud.monetized) _currentUser.balance = (_currentUser.balance||0) + earned;
      Session.set(_currentUser);
      Loading.hide(); UI.renderSync();
      toast('+' + reward + ' Coins' + (ud.monetized?' + ৳'+earned.toFixed(2):'') + '!','success');
    } catch(e) { Loading.hide(); toast('Could not claim. Try again.','error'); }
  }
};

/* ============================================================
   GAMES
   ============================================================ */
var Games = {
  fmtTime: function(ms) {
    return Math.floor(ms/3600000) + 'h ' + Math.floor((ms%3600000)/60000) + 'm';
  },
  checkCd: function(last, h) {
    var diff = Date.now() - (last||0), req = h*3600000;
    return diff < req ? { ok:false, wait:req-diff } : { ok:true };
  },
  initButtons: function(u, cfg) {
    Games._btn('btnSpin', u.lastSpin, cfg.gameCooldown||24, 'Spin (' + (cfg.spinCost||50) + ' Coins)');
    Games._btn('btnSlot', u.lastSlot, cfg.gameCooldown||24, 'Play (' + (cfg.slotCost||100) + ' Coins)');
  },
  _btn: function(id, last, cd, text) {
    var el = document.getElementById(id); if (!el) return;
    var st = Games.checkCd(last, cd);
    if (!st.ok) { el.innerHTML='<i class="fas fa-clock"></i> '+Games.fmtTime(st.wait); el.disabled=true; el.style.opacity='0.5'; }
    else         { el.innerHTML=text; el.disabled=false; el.style.opacity='1'; }
  },

  playSpin: async function() {
    var u = Session.current(); if (!u) return;
    var ud = await FDB.getUser(u.id);
    var st = Games.checkCd(ud.lastSpin, _appConfig.gameCooldown||24);
    if (!st.ok) return toast('Cooldown: ' + Games.fmtTime(st.wait),'warning');
    if ((ud.coins||0) < (_appConfig.spinCost||50)) return toast('Need ' + (_appConfig.spinCost||50) + ' coins','error');
    var wheel = document.getElementById('wheel');
    var deg   = 3600 + Math.floor(Math.random()*3600);
    wheel.style.transition = 'transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';
    wheel.style.transform  = 'rotate(' + deg + 'deg)';
    document.getElementById('btnSpin').disabled = true;
    var win = Math.floor(Math.random()*150) + 10;
    await FDB.updateUser(u.id, { coins:(ud.coins||0)-(_appConfig.spinCost||50)+win, lastSpin:Date.now() });
    _currentUser = Object.assign({}, _currentUser, { coins:(_currentUser.coins||0)-(_appConfig.spinCost||50)+win });
    Session.set(_currentUser);
    setTimeout(function() {
      UI.renderSync(); toast('You won ' + win + ' Coins!','success');
      Games._btn('btnSpin', Date.now(), _appConfig.gameCooldown||24, 'Spin (' + (_appConfig.spinCost||50) + ' Coins)');
      setTimeout(function(){ wheel.style.transition='none'; wheel.style.transform='rotate(0deg)'; }, 100);
    }, 4200);
  },

  playScratch: async function(el) {
    if (el.dataset.used === '1') return;
    var u  = Session.current(); if (!u) return;
    var ud = await FDB.getUser(u.id);
    var st = Games.checkCd(ud.lastScratch, _appConfig.gameCooldown||24);
    if (!st.ok) return toast('Cooldown: ' + Games.fmtTime(st.wait),'warning');
    if ((ud.coins||0) < (_appConfig.scratchCost||20)) return toast('Need ' + (_appConfig.scratchCost||20) + ' coins','error');
    var win = Math.floor(Math.random()*60) + 5;
    await FDB.updateUser(u.id, { coins:(ud.coins||0)-(_appConfig.scratchCost||20)+win, lastScratch:Date.now() });
    _currentUser = Object.assign({}, _currentUser, { coins:(_currentUser.coins||0)-(_appConfig.scratchCost||20)+win });
    Session.set(_currentUser); UI.renderSync();
    el.dataset.used='1'; el.style.background='linear-gradient(135deg,#1a1a2e,#16213e)'; el.style.border='2px solid var(--neon-gold)';
    el.innerHTML='<div style="text-align:center"><h2 style="color:var(--neon-gold);font-size:2rem">+'+win+'</h2><p style="color:#aaa">Coins Won!</p></div>';
    toast('+' + win + ' Coins!','success');
    setTimeout(function(){
      el.dataset.used='0'; el.style.background=''; el.style.border='';
      el.innerHTML='<div style="text-align:center;color:#aaa"><i class="fas fa-ticket-alt" style="font-size:2rem"></i><p>Tap to Scratch (' + (_appConfig.scratchCost||20) + ' Coins)</p></div>';
    }, 3000);
  },

  playSlot: async function() {
    var u  = Session.current(); if (!u) return;
    var ud = await FDB.getUser(u.id);
    var st = Games.checkCd(ud.lastSlot, _appConfig.gameCooldown||24);
    if (!st.ok) return toast('Cooldown: ' + Games.fmtTime(st.wait),'warning');
    if ((ud.coins||0) < (_appConfig.slotCost||100)) return toast('Need ' + (_appConfig.slotCost||100) + ' coins','error');
    var syms = ['🍋','🍒','💎','7️⃣','🔔','⭐'];
    var r    = [0,1,2].map(function(){ return Math.floor(Math.random()*syms.length); });
    var rand = Math.random();
    if (rand > 0.95) { r[0]=r[1]=r[2]=3; } else if (rand > 0.75) { r[2]=r[0]; }
    ['s1','s2','s3'].forEach(function(id,i){ document.getElementById(id).textContent = syms[r[i]]; });
    var win = 0;
    if (r[0]===3&&r[1]===3&&r[2]===3) win=1000;
    else if (r[0]===r[1]&&r[1]===r[2]) win=300;
    else if (r[0]===r[1]||r[1]===r[2]||r[0]===r[2]) win=60;
    await FDB.updateUser(u.id, { coins:(ud.coins||0)-(_appConfig.slotCost||100)+win, lastSlot:Date.now() });
    _currentUser = Object.assign({}, _currentUser, { coins:(_currentUser.coins||0)-(_appConfig.slotCost||100)+win });
    Session.set(_currentUser);
    setTimeout(function(){
      UI.renderSync();
      if (win>=1000) toast('JACKPOT! +'+win+' Coins!','success');
      else if (win>0) toast('+'+win+' Coins!','success');
      else            toast('No match. Try again!','info');
    }, 400);
  }
};

/* ============================================================
   VIDEO SYSTEM
   ============================================================ */
var VideoSystem = {
  _timer: null, _elapsed: 0, _video: null, _claimed: false,
  _adTimer: null, _pendingId: null, _adResume: null,

  extractYTId: function(input) {
    if (!input) return null;
    input = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    var patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];
    for (var i=0; i<patterns.length; i++) {
      var m = input.match(patterns[i]);
      if (m) return m[1];
    }
    return null;
  },

  isShorts: function(v) {
    return v.category === 'Shorts' || (v.watchDuration||15) < 60;
  },

  timeAgo: function(dateStr) {
    if (!dateStr) return '';
    var diff = Date.now() - new Date(dateStr).getTime();
    var m=Math.floor(diff/60000), h=Math.floor(diff/3600000), d=Math.floor(diff/86400000);
    if (d>0) return d+'d ago'; if (h>0) return h+'h ago'; if (m>0) return m+'m ago'; return 'Just now';
  },

  fmtViews: function(n) {
    if (n>=1000000) return (n/1000000).toFixed(1)+'M views';
    if (n>=1000)    return (n/1000).toFixed(1)+'K views';
    return n+' views';
  },

  loadAndRender: async function() {
    _allVideos = await FDB.getVideos();
    VideoSystem._applyFilter();
  },

  search: function(q) {
    _searchQuery = q.trim().toLowerCase();
    var btn = document.getElementById('searchClearBtn');
    if (btn) btn.classList.toggle('hidden', !_searchQuery);
    VideoSystem._applyFilter();
  },

  clearSearch: function() {
    _searchQuery = '';
    var inp = document.getElementById('videoSearchInput'); if (inp) inp.value = '';
    var btn = document.getElementById('searchClearBtn');   if (btn) btn.classList.add('hidden');
    VideoSystem._applyFilter();
  },

  filterCategory: function(cat, btnEl) {
    _curCategory = cat;
    document.querySelectorAll('.yt-cat-btn').forEach(function(b){ b.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');
    VideoSystem._applyFilter();
  },

  _applyFilter: async function() {
    var vids = _allVideos.slice();
    if (_curCategory !== 'All') vids = vids.filter(function(v){ return v.category === _curCategory; });
    if (_searchQuery) vids = vids.filter(function(v){
      return (v.title||'').toLowerCase().indexOf(_searchQuery) !== -1 ||
             (v.uploaderName||'').toLowerCase().indexOf(_searchQuery) !== -1;
    });
    VideoSystem._renderList(vids);
  },

  _renderList: async function(videos) {
    var l     = document.getElementById('videoList');
    var empty = document.getElementById('videoEmptyMsg');
    if (!l) return;
    if (!videos.length) {
      l.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    var u        = Session.current();
    var userData = u ? (await FDB.getUser(u.id)) : null;
    var today    = new Date().toDateString();
    l.innerHTML  = '';
    videos.forEach(function(v) {
      var ytId       = VideoSystem.extractYTId(v.url||'');
      var thumb      = v.thumbnail || (ytId ? 'https://img.youtube.com/vi/'+ytId+'/hqdefault.jpg' : '');
      var isShorts   = VideoSystem.isShorts(v);
      var views      = v.views || 0;
      var uploaderName = v.uploaderDisplayName || v.uploaderName || 'Admin';
      var card = document.createElement('div');
      card.className = 'yt-video-card';
      card.onclick   = function() { VideoSystem.openPlayer(v.id); };
      card.innerHTML =
        '<div class="yt-thumb-wrap">' +
        (thumb ? '<img src="'+thumb+'" class="yt-thumb" onerror="this.style.background=\'#1a1a2e\'">' :
                 '<div class="yt-thumb" style="background:#1a1a2e"></div>') +
        (isShorts ? '<span class="yt-shorts-badge">⚡ Shorts</span>' : '') +
        '<span class="yt-duration-badge">' + (v.watchDuration||15) + 's</span>' +
        '</div>' +
        '<div class="yt-card-info">' +
        '<div class="yt-card-avatar-wrap">' +
        '<img src="' + (v.uploaderAvatar||'https://cdn-icons-png.flaticon.com/512/149/149071.png') + '" class="yt-card-avatar" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
        '</div>' +
        '<div class="yt-card-meta">' +
        '<h4 class="yt-card-title">' + v.title + '</h4>' +
        '<p class="yt-card-uploader">' + uploaderName + '</p>' +
        '<p class="yt-card-stats">' + VideoSystem.fmtViews(views) + ' • ' + VideoSystem.timeAgo(v.addedAt) + '</p>' +
        '</div></div>';
      l.appendChild(card);
    });
  },

  switchTab: function(tab) {
    ['watch','upload','myvideos','monetize'].forEach(function(t) {
      var el  = document.getElementById('vtab-'+t);
      var btn = document.getElementById('vtab-btn-'+t);
      if (el)  el.classList.toggle('hidden', t !== tab);
      if (btn) btn.classList.toggle('active', t === tab);
    });
    var sb = document.querySelector('.yt-search-bar');
    var cb = document.getElementById('categoryBar');
    if (sb) sb.style.display = tab==='watch' ? '' : 'none';
    if (cb) cb.style.display = tab==='watch' ? '' : 'none';
    if (tab === 'watch')    VideoSystem.loadAndRender();
    if (tab === 'myvideos') VideoSystem.renderMyVideos();
    if (tab === 'monetize') MonetizeSystem.renderTab();
  },

  renderMyVideos: async function() {
    var l = document.getElementById('myVideosList'); if (!l) return;
    var u = Session.current(); if (!u) return;
    var vids = (await FDB.getVideos()).filter(function(v){ return v.uploaderId===u.id; }).reverse();
    if (!vids.length) {
      l.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#aaa"><i class="fas fa-video-slash" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:10px"></i><p>No videos yet. Go to Upload tab!</p></div>';
      return;
    }
    var ud  = await FDB.getUser(u.id);
    var cfg = _appConfig;
    l.innerHTML = '';
    vids.forEach(function(v) {
      var ytId  = VideoSystem.extractYTId(v.url||'');
      var thumb = v.thumbnail || (ytId?'https://img.youtube.com/vi/'+ytId+'/mqdefault.jpg':'');
      var views = v.views||0;
      var coins = (views*(cfg.viewCoinRate||0.001)).toFixed(4);
      var div   = document.createElement('div');
      div.className = 'yt-video-card';
      div.innerHTML =
        '<div class="yt-thumb-wrap" onclick="VideoSystem.openPlayer(\''+v.id+'\')">' +
        (thumb?'<img src="'+thumb+'" class="yt-thumb">':'<div class="yt-thumb" style="background:#1a1a2e"></div>') +
        '</div>' +
        '<div class="yt-card-info"><div class="yt-card-avatar-wrap"><i class="fas fa-eye" style="color:var(--neon-cyan);margin-top:8px"></i></div>' +
        '<div class="yt-card-meta">' +
        '<h4 class="yt-card-title">' + v.title + '</h4>' +
        '<p class="yt-card-stats">' + views.toLocaleString() + ' views • ' + coins + ' coins earned</p>' +
        (ud.monetized ? '<p style="color:var(--success);font-size:0.78rem">৳'+(views*(cfg.viewCoinRate||0.001)*(cfg.coinToBDT||0.01)).toFixed(6)+' BDT</p>' : '<p style="color:#555;font-size:0.78rem">Monetize to earn BDT</p>') +
        '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<button class="btn btn-sm btn-outline" onclick="event.stopPropagation();ChannelSystem.open(\''+u.id+'\')"><i class="fas fa-tv"></i> Channel</button>' +
        '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();VideoSystem.deleteMyVideo(\''+v.id+'\')"><i class="fas fa-trash"></i></button>' +
        '</div></div></div>';
      l.appendChild(div);
    });
  },

  openPlayer: async function(videoId) {
    var u = Session.current(); if (!u) return;
    var video = _allVideos.find(function(v){ return v.id===videoId; });
    if (!video) {
      var all = await FDB.getVideos();
      _allVideos = all;
      video = all.find(function(v){ return v.id===videoId; });
    }
    if (!video) return toast('Video not found','error');
    var cfg      = _appConfig;
    var isShorts = VideoSystem.isShorts(video);
    if (cfg.videoAdEnabled && cfg.videoAdCode) {
      VideoSystem._pendingId = videoId;
      VideoSystem._showAd(cfg.videoAdCode, isShorts ? (cfg.shortsAdSkip||5) : (cfg.longAdSkip||10));
      return;
    }
    VideoSystem._startPlayer(video, u);
  },

  _showAd: function(code, skipAfter) {
    var ov      = document.getElementById('videoAdOverlay');
    var content = document.getElementById('videoAdContent');
    var skipBtn = document.getElementById('adSkipBtn');
    var fill    = document.getElementById('adCountdownFill');
    var txt     = document.getElementById('adCountdownText');
    if (!ov || !content) { VideoSystem.skipAd(); return; }
    content.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.innerHTML = code;
    content.appendChild(wrap);
    content.querySelectorAll('script').forEach(function(old) {
      var ns = document.createElement('script');
      Array.from(old.attributes).forEach(function(a){ ns.setAttribute(a.name,a.value); });
      ns.textContent = old.textContent;
      old.parentNode.replaceChild(ns, old);
    });
    skipBtn.classList.add('hidden'); ov.classList.remove('hidden');
    var left = skipAfter;
    txt.textContent = left+'s'; fill.style.width = '100%';
    VideoSystem._adTimer = setInterval(function() {
      left--; txt.textContent = left+'s';
      fill.style.width = ((left/skipAfter)*100)+'%';
      if (left <= 0) { clearInterval(VideoSystem._adTimer); skipBtn.classList.remove('hidden'); fill.style.width='0%'; }
    }, 1000);
  },

  skipAd: function() {
    clearInterval(VideoSystem._adTimer);
    var ov = document.getElementById('videoAdOverlay'); if (ov) ov.classList.add('hidden');
    if (VideoSystem._adResume) {
      VideoSystem._adResume(); VideoSystem._adResume = null;
    } else if (VideoSystem._pendingId) {
      var vid = _allVideos.find(function(v){ return v.id===VideoSystem._pendingId; });
      if (vid) VideoSystem._startPlayer(vid, Session.current());
      VideoSystem._pendingId = null;
    }
  },

  _startPlayer: async function(video, u) {
    VideoSystem._video = video; VideoSystem._elapsed = 0; VideoSystem._claimed = false;
    var ytId    = VideoSystem.extractYTId(video.url||'');
    var isLocal = !!video.videoData;
    var frame   = document.getElementById('vpFrame');
    if (isLocal) {
      var ic = document.querySelector('.yt-video-frame');
      if (ic) ic.innerHTML = '<video src="'+video.videoData+'" controls autoplay style="position:absolute;inset:0;width:100%;height:100%;background:#000"></video>';
    } else if (ytId) {
      if (frame) frame.src = 'https://www.youtube.com/embed/'+ytId+'?autoplay=1&rel=0&modestbranding=1';
    }
    /* fill info */
    var setText = function(id,v){ var e=document.getElementById(id);if(e)e.textContent=v; };
    setText('vpTitle', video.title);
    setText('vpViewCount', VideoSystem.fmtViews(video.views||0));
    setText('vpCategory', video.category||'');
    setText('vpDesc', video.description||'');
    setText('vpTimeNeeded', (video.watchDuration||15)+'s');
    setText('vpTimeElapsed','0s');
    /* uploader */
    if (video.uploaderId) {
      var ud = await FDB.getUser(video.uploaderId);
      var un = document.getElementById('vpUploaderName');
      if (un) { un.textContent = (ud&&(ud.displayName||ud.username))||video.uploaderName||'Creator'; un.onclick=function(){ ChannelSystem.open(video.uploaderId); }; }
      var ua = document.getElementById('vpUploaderAvatar');
      if (ua) ua.src = (ud&&ud.avatar)||'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      var subCnt = await SubSystem.getCount(video.uploaderId);
      setText('vpSubCount', subCnt.toLocaleString()+' subscribers');
      var me     = Session.current();
      var meData = me ? await FDB.getUser(me.id) : null;
      var isSub  = meData ? (meData.subscriptions||[]).indexOf(video.uploaderId)!==-1 : false;
      var subBtn = document.getElementById('vpSubBtn');
      if (subBtn) {
        subBtn.textContent = isSub ? 'Subscribed' : 'Subscribe';
        subBtn.className   = 'btn btn-sm' + (isSub?' btn-outline':'');
        subBtn.style.display = (me && me.id===video.uploaderId) ? 'none' : '';
      }
    } else {
      var un2 = document.getElementById('vpUploaderName'); if(un2){un2.textContent='Admin';un2.onclick=null;}
      var ua2 = document.getElementById('vpUploaderAvatar'); if(ua2) ua2.src='https://cdn-icons-png.flaticon.com/512/149/149071.png';
      setText('vpSubCount','');
      var sb = document.getElementById('vpSubBtn'); if(sb) sb.style.display='none';
    }
    var claimBtn = document.getElementById('vpClaimBtn'); if(claimBtn) claimBtn.classList.add('hidden');
    var wm = document.getElementById('vpWatchMsg'); if(wm){wm.style.display='block';wm.textContent='Watching to support the creator...';}
    var fill = document.getElementById('vpProgressFill'); if(fill){fill.style.width='0%';fill.style.background='';}
    var pct  = document.getElementById('vpProgressText'); if(pct) pct.textContent='0%';
    document.getElementById('videoOverlay').classList.remove('hidden');
    VideoSystem._runTimer();
  },

  _runTimer: function() {
    clearInterval(VideoSystem._timer);
    var video = VideoSystem._video; if (!video) return;
    var cfg      = _appConfig;
    var isShorts = VideoSystem.isShorts(video);
    var interval = isShorts ? (cfg.shortsAdInterval||60) : (cfg.longAdInterval||300);
    VideoSystem._timer = setInterval(function() {
      VideoSystem._elapsed++;
      var dur = video.watchDuration||15;
      var p   = Math.min(100, Math.round((VideoSystem._elapsed/dur)*100));
      var fill = document.getElementById('vpProgressFill'); if(fill) fill.style.width=p+'%';
      var pct  = document.getElementById('vpProgressText'); if(pct) pct.textContent=p+'%';
      var te   = document.getElementById('vpTimeElapsed');  if(te)  te.textContent=VideoSystem._elapsed+'s';
      /* mid-roll ad */
      if (cfg.videoAdEnabled && cfg.videoAdCode && VideoSystem._elapsed>0 && VideoSystem._elapsed%interval===0) {
        clearInterval(VideoSystem._timer);
        VideoSystem._adResume = function(){ VideoSystem._runTimer(); };
        VideoSystem._showAd(cfg.videoAdCode, isShorts?(cfg.shortsAdSkip||5):(cfg.longAdSkip||10));
        return;
      }
      if (VideoSystem._elapsed >= dur && !VideoSystem._claimed) {
        clearInterval(VideoSystem._timer);
        var cb = document.getElementById('vpClaimBtn'); if(cb) cb.classList.remove('hidden');
        var wm = document.getElementById('vpWatchMsg'); if(wm) wm.style.display='none';
        if(fill) fill.style.background='linear-gradient(90deg,#00cc66,#00ff88)';
        toast('Done! Mark as watched.','success');
      }
    }, 1000);
  },

  closePlayer: function() {
    clearInterval(VideoSystem._timer);
    var frame = document.getElementById('vpFrame'); if(frame) frame.src='';
    var ic = document.querySelector('.yt-video-frame');
    if (ic && !ic.querySelector('iframe')) {
      ic.innerHTML = '<iframe id="vpFrame" src="" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>';
    }
    document.getElementById('videoOverlay').classList.add('hidden');
    VideoSystem._video=null; VideoSystem._elapsed=0; VideoSystem._claimed=false;
  },

  subscribeFromPlayer: async function() {
    var video = VideoSystem._video; if (!video||!video.uploaderId) return;
    await SubSystem.subscribe(video.uploaderId);
    var me    = Session.current();
    var meD   = me ? await FDB.getUser(me.id) : null;
    var isSub = meD ? (meD.subscriptions||[]).indexOf(video.uploaderId)!==-1 : false;
    var sb    = document.getElementById('vpSubBtn');
    if (sb) { sb.textContent=isSub?'Subscribed':'Subscribe'; sb.className='btn btn-sm'+(isSub?' btn-outline':''); }
    var cnt = await SubSystem.getCount(video.uploaderId);
    var sc  = document.getElementById('vpSubCount'); if(sc) sc.textContent=cnt.toLocaleString()+' subscribers';
  },

  claimReward: async function() {
    if (VideoSystem._claimed) return;
    var video = VideoSystem._video; if (!video) return;
    VideoSystem._claimed = true;
    var u = Session.current(); if (!u) return;
    Loading.show('Registering view...');
    try {
      var ud   = await FDB.getUser(u.id);
      var hist = (ud.videoHistory||[]).slice();
      hist.push({ vid:video.id, title:video.title, watchedAt:new Date().toISOString() });
      await FDB.updateUser(u.id, { videoHistory:hist });
      await FDB.update('videos/'+video.id, { views:(video.views||0)+1 });
      /* credit uploader */
      if (video.uploaderId && video.uploaderId !== u.id) {
        var up = await FDB.getUser(video.uploaderId);
        if (up) {
          var vc  = _appConfig.viewCoinRate||0.001;
          var upd = { coins:(up.coins||0)+vc, totalVideoViews:(up.totalVideoViews||0)+1 };
          if (up.monetized) {
            upd.balance       = (up.balance||0) + vc*(_appConfig.coinToBDT||0.01);
            upd.videoEarnings = (up.videoEarnings||0) + vc*(_appConfig.coinToBDT||0.01);
          }
          await FDB.updateUser(video.uploaderId, upd);
        }
      }
      Loading.hide(); VideoSystem.closePlayer();
      toast('View counted! Creator earned '+((_appConfig.viewCoinRate||0.001))+' coin.','success');
    } catch(e) { Loading.hide(); VideoSystem.closePlayer(); toast('View counted!','success'); }
  },

  submitVideo: async function() {
    var fi    = document.getElementById('uVFile');
    var title = document.getElementById('uVTitle').value.trim();
    var desc  = document.getElementById('uVDesc').value.trim();
    var cat   = document.getElementById('uVCategory').value;
    var u     = Session.current(); if (!u) return;
    if (!title)                          return toast('Enter video title','warning');
    if (!fi||!fi.files||!fi.files[0])    return toast('Select a video file','warning');
    var file = fi.files[0];
    if (file.size>100*1024*1024)          return toast('Max 100MB','error');
    if (!file.type.startsWith('video/')) return toast('Select a valid video file','error');
    var btn = document.getElementById('uploadSubmitBtn');
    if (btn) { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...'; }
    var reader = new FileReader();
    reader.onload = function(e) {
      var vel = document.createElement('video');
      vel.src = e.target.result; vel.currentTime = 1;
      vel.onloadeddata = async function() {
        var canvas = document.createElement('canvas');
        canvas.width=320; canvas.height=180;
        canvas.getContext('2d').drawImage(vel,0,0,320,180);
        var thumb = canvas.toDataURL('image/jpeg',0.7);
        Loading.show('Saving...');
        try {
          var cu = Session.current();
          await FDB.saveVideo({
            id:'v_'+Date.now(), title:title, description:desc, category:cat,
            uploaderId:cu.id, uploaderName:cu.username,
            uploaderDisplayName:cu.displayName||cu.username,
            uploaderAvatar:cu.avatar||'',
            videoData:e.target.result, thumbnail:thumb,
            watchDuration:15, views:0, addedAt:new Date().toISOString()
          });
          Loading.hide();
          if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}
          document.getElementById('uVTitle').value='';
          document.getElementById('uVDesc').value='';
          fi.value='';
          document.getElementById('uploadPreview').classList.add('hidden');
          VideoSystem.switchTab('myvideos');
          toast('Video uploaded! 🎉','success');
        } catch(err) {
          Loading.hide();
          if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}
          toast('Upload failed. Try again.','error');
        }
      };
      vel.onerror = function(){
        if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}
        toast('Error reading video file.','error');
      };
    };
    reader.onerror = function(){
      if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Upload Video';}
      toast('Error reading file.','error');
    };
    reader.readAsDataURL(file);
  },

  previewFile: function(input) {
    var preview = document.getElementById('uploadPreview');
    if (!input.files||!input.files[0]){ if(preview)preview.classList.add('hidden'); return; }
    var file = input.files[0];
    if (!file.type.startsWith('video/')){ toast('Select a video file','warning'); return; }
    var pv = document.getElementById('previewVidEl');
    if (pv) { pv.src=URL.createObjectURL(file); preview.classList.remove('hidden'); }
    var si = document.getElementById('uploadFileInfo');
    if (si) si.textContent = file.name + ' — ' + (file.size/1024/1024).toFixed(1) + 'MB';
  },

  deleteMyVideo: async function(videoId) {
    if (!confirm('Delete this video?')) return;
    Loading.show('Deleting...');
    await FDB.deleteVideo(videoId);
    Loading.hide();
    VideoSystem.renderMyVideos();
    toast('Deleted','info');
  }
};

/* ============================================================
   SUBSCRIBE
   ============================================================ */
var SubSystem = {
  subscribe: async function(targetId) {
    var me = Session.current(); if (!me) return;
    if (me.id===targetId) return toast('Cannot subscribe to yourself','warning');
    var meD  = await FDB.getUser(me.id);
    var subs = (meD.subscriptions||[]).slice();
    var idx  = subs.indexOf(targetId);
    if (idx !== -1) {
      subs.splice(idx,1);
      await FDB.updateUser(me.id, { subscriptions:subs });
      toast('Unsubscribed','info');
    } else {
      subs.push(targetId);
      await FDB.updateUser(me.id, { subscriptions:subs });
      toast('Subscribed! 🔔','success');
    }
  },
  getCount: async function(userId) {
    var all = await FDB.getAllUsers();
    return all.filter(function(u){ return (u.subscriptions||[]).indexOf(userId)!==-1; }).length;
  }
};

/* ============================================================
   CHANNEL
   ============================================================ */
var ChannelSystem = {
  open: async function(userId) {
    document.querySelectorAll('.page-section').forEach(function(el){ el.classList.add('hidden'); });
    document.getElementById('page-channel').classList.remove('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    _prevPage = _curPage; _curPage = 'channel';
    var me = Session.current();
    var eb = document.getElementById('channelEditBar');
    if (eb) eb.classList.toggle('hidden', !(me && me.id===userId));
    window.scrollTo(0,0);
    ChannelSystem.render(userId);
  },

  goBack: function() { Router.go(_prevPage||'home'); },

  saveChannelInfo: async function() {
    var desc   = document.getElementById('channelDescInput').value.trim();
    var banner = document.getElementById('channelBannerInput').value.trim();
    var u = Session.current(); if (!u) return;
    Loading.show('Saving...');
    await FDB.updateUser(u.id, { channelDesc:desc, channelBanner:banner });
    _currentUser = Object.assign({}, _currentUser, { channelDesc:desc, channelBanner:banner });
    Session.set(_currentUser);
    Loading.hide(); toast('Channel saved!','success');
    ChannelSystem.render(u.id);
  },

  render: async function(userId) {
    var me = Session.current();
    Loading.show('Loading channel...');
    var user, subCount, allVids;
    try {
      var results = await Promise.all([ FDB.getUser(userId), SubSystem.getCount(userId), FDB.getVideos() ]);
      user=results[0]; subCount=results[1]; allVids=results[2];
    } catch(e) { Loading.hide(); return; }
    var meData = me ? await FDB.getUser(me.id) : null;
    Loading.hide();
    if (!user) return;
    var isSub    = meData ? (meData.subscriptions||[]).indexOf(userId)!==-1 : false;
    var isMe     = me && me.id===userId;
    var userVids = allVids.filter(function(v){ return v.uploaderId===userId; });
    if (isMe) {
      var di = document.getElementById('channelDescInput');   if(di) di.value=user.channelDesc||'';
      var bi = document.getElementById('channelBannerInput'); if(bi) bi.value=user.channelBanner||'';
    }
    var bannerStyle = user.channelBanner ?
      'background-image:url('+user.channelBanner+');background-size:cover;background-position:center' :
      'background:linear-gradient(135deg,#0a0a1a,#1a1a3e,#0a2a1a)';
    var hdr = document.getElementById('channelHeader');
    if (hdr) hdr.innerHTML =
      '<div class="channel-banner" style="'+bannerStyle+'"></div>' +
      '<div class="channel-info-row">' +
      '<img src="'+user.avatar+'" class="channel-avatar">' +
      '<div class="channel-meta">' +
      '<h2>'+(user.displayName||user.username)+(user.monetized?' <span class="monetized-badge">💰 Monetized</span>':'')+'</h2>' +
      (user.channelDesc?'<p style="color:#aaa;font-size:0.82rem;margin:4px 0">'+user.channelDesc+'</p>':'') +
      '<div class="channel-stats-row">' +
      '<span><b>'+subCount.toLocaleString()+'</b> Subscribers</span>' +
      '<span><b>'+userVids.length+'</b> Videos</span>' +
      '<span><b>'+(user.totalVideoViews||0).toLocaleString()+'</b> Views</span>' +
      '</div>' +
      (!isMe ?
        '<button class="btn '+(isSub?'btn-outline':'')+' channel-sub-btn" onclick="SubSystem.subscribe(\''+userId+'\');ChannelSystem.render(\''+userId+'\')"><i class="fas fa-'+(isSub?'bell-slash':'bell')+'"></i> '+(isSub?'Subscribed':'Subscribe')+'</button>' :
        '<button class="btn btn-sm btn-outline" onclick="Router.go(\'profile\')"><i class="fas fa-cog"></i> Edit Profile</button>') +
      '</div></div>';
    var vl = document.getElementById('channelVideoList'); if (!vl) return;
    if (!userVids.length) { vl.innerHTML='<p style="color:#aaa;text-align:center;padding:30px">No videos yet.</p>'; return; }
    vl.innerHTML='';
    userVids.forEach(function(v) {
      var ytId  = VideoSystem.extractYTId(v.url||'');
      var thumb = v.thumbnail||(ytId?'https://img.youtube.com/vi/'+ytId+'/mqdefault.jpg':'');
      var div   = document.createElement('div');
      div.className='yt-video-card'; div.onclick=function(){ VideoSystem.openPlayer(v.id); };
      div.innerHTML=
        '<div class="yt-thumb-wrap">' +
        (thumb?'<img src="'+thumb+'" class="yt-thumb">':'<div class="yt-thumb" style="background:#1a1a2e"></div>') +
        '<span class="yt-duration-badge">'+(v.watchDuration||15)+'s</span>' +
        '</div>' +
        '<div class="yt-card-info"><div class="yt-card-avatar-wrap"></div>' +
        '<div class="yt-card-meta">' +
        '<h4 class="yt-card-title">'+v.title+'</h4>' +
        '<p class="yt-card-stats">'+VideoSystem.fmtViews(v.views||0)+' • '+VideoSystem.timeAgo(v.addedAt)+'</p>' +
        '</div></div>';
      vl.appendChild(div);
    });
  }
};

/* ============================================================
   MONETIZE
   ============================================================ */
var MonetizeSystem = {
  renderTab: async function() {
    var el = document.getElementById('monetizeContent'); if (!el) return;
    var u  = Session.current();
    if (!u||!u.id) { el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px">Please log in first.</p>'; return; }
    el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    var ud;
    try { ud = await FDB.getUser(u.id); }
    catch(e) { el.innerHTML='<p style="color:#f66;text-align:center;padding:30px">Failed to load. Try again.</p>'; return; }
    if (!ud) { el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px">User not found.</p>'; return; }
    var coins       = ud.coins||0;
    var isMonetized = ud.monetized===true;
    var hasPending  = ud.monetizeStatus==='Pending';
    var vcr         = _appConfig.viewCoinRate||0.001;
    el.innerHTML =
      '<div class="glass monetize-hero"><div class="monetize-icon">'+(isMonetized?'💰':'🚀')+'</div>' +
      '<h2>'+(isMonetized?'You are Monetized!':'Unlock Monetization')+'</h2>' +
      '<p style="color:#aaa;font-size:0.85rem">'+(isMonetized?'Your videos earn real BDT from every view!':'Reach 1,000,000 coins to apply')+'</p></div>' +

      (!isMonetized ?
        '<div class="glass">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
        '<span style="color:#aaa;font-size:0.85rem">Progress</span>' +
        '<span style="color:var(--neon-gold);font-weight:bold">'+coins.toLocaleString()+' / 1,000,000</span></div>' +
        '<div class="monetize-progress-bar"><div style="width:'+Math.min(100,(coins/1000000*100))+'%"></div></div>' +
        '<p style="color:#aaa;font-size:0.82rem;margin-top:8px;text-align:center">'+(coins>=1000000?'✅ Eligible! Apply now.':'Need '+(1000000-coins).toLocaleString()+' more coins')+'</p></div>'
        : '') +

      '<div class="glass monetize-benefits"><h3 style="margin-bottom:12px">💎 Benefits</h3>' +
      '<div class="benefit-item '+(isMonetized?'active':'')+'"><i class="fas fa-coins"></i><div><b>Coin Earnings</b><small>'+vcr+' coin per view — always active</small></div></div>' +
      '<div class="benefit-item '+(isMonetized?'active':'locked')+'"><i class="fas fa-'+(isMonetized?'check-circle':'lock')+'"></i><div><b>BDT from Views</b><small>'+(isMonetized?'Active!':'Unlocks after approval')+'</small></div></div>' +
      '<div class="benefit-item '+(isMonetized?'active':'locked')+'"><i class="fas fa-'+(isMonetized?'check-circle':'lock')+'"></i><div><b>Withdrawals</b><small>'+(isMonetized?'Enabled!':'Only monetized users can withdraw')+'</small></div></div>' +
      '</div>' +

      (!isMonetized && !hasPending ?
        '<div style="padding:0 0 15px"><button class="btn btn-success" onclick="MonetizeSystem.apply()" '+(coins<1000000?'disabled style="opacity:0.5"':'')+'>'+
        '<i class="fas fa-paper-plane"></i> Apply for Monetization</button></div>' : '') +

      (hasPending ?
        '<div class="glass" style="text-align:center;padding:20px;color:var(--neon-gold)"><i class="fas fa-clock" style="font-size:2rem;display:block;margin-bottom:10px"></i><b>Under Review</b><p style="color:#aaa;font-size:0.85rem;margin-top:5px">Admin will review within 48 hours.</p></div>' : '') +

      (isMonetized ?
        '<div class="glass monetize-stats"><h3 style="margin-bottom:12px">📊 Earnings</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        '<div class="monetize-stat-box"><i class="fas fa-eye" style="color:var(--neon-cyan)"></i><h3>'+(ud.totalVideoViews||0).toLocaleString()+'</h3><small>Total Views</small></div>' +
        '<div class="monetize-stat-box"><i class="fas fa-coins" style="color:gold"></i><h3>'+((ud.totalVideoViews||0)*vcr).toFixed(4)+'</h3><small>Coins from Views</small></div>' +
        '<div class="monetize-stat-box"><i class="fas fa-money-bill" style="color:var(--neon-gold)"></i><h3>৳'+(ud.videoEarnings||0).toFixed(4)+'</h3><small>BDT from Views</small></div>' +
        '<div class="monetize-stat-box"><i class="fas fa-video" style="color:var(--neon-purple)"></i><h3 id="myVidCount">--</h3><small>My Videos</small></div>' +
        '</div></div>' : '');
    if (isMonetized) {
      FDB.getVideos().then(function(vids){
        var el2 = document.getElementById('myVidCount');
        if (el2) el2.textContent = vids.filter(function(v){ return v.uploaderId===u.id; }).length;
      });
    }
  },

  apply: async function() {
    var u  = Session.current(); if (!u) return;
    var ud = await FDB.getUser(u.id);
    if ((ud.coins||0) < 1000000) return toast('Need 1,000,000 coins to apply!','error');
    await FDB.updateUser(u.id, { monetizeStatus:'Pending' });
    MonetizeSystem.renderTab();
    toast('Application submitted!','success');
  }
};

/* ============================================================
   ADMIN
   ============================================================ */
var Admin = {
  init: async function() {
    if (sessionStorage.getItem('isAdmin') !== 'true') { Router.go('auth'); return; }
    Admin.renderOverview(); Admin.renderTab('overview');
    var cfg = _appConfig;
    var set = function(id,v){ var e=document.getElementById(id);if(e)e.value=v; };
    var chk = function(id,v){ var e=document.getElementById(id);if(e)e.checked=v; };
    set('admCooldown',cfg.gameCooldown||24); set('admSpinCost',cfg.spinCost||50);
    set('admScratchCost',cfg.scratchCost||20); set('admSlotCost',cfg.slotCost||100);
    set('admMinWithdraw',cfg.minWithdraw||200); set('admCoinRate',cfg.coinToBDT||0.01);
    set('admRefBonus',cfg.referralBonus||500); set('admRefReq',cfg.referralTasksReq||3);
    set('admAdCode',cfg.adCode||''); chk('admMaintenance',!!cfg.maintenanceMode);
    chk('admVideoAdEnabled',!!cfg.videoAdEnabled); set('admVideoAdCode',cfg.videoAdCode||'');
    set('admShortsAdInterval',cfg.shortsAdInterval||60); set('admLongAdInterval',cfg.longAdInterval||300);
    set('admShortsAdSkip',cfg.shortsAdSkip||5); set('admLongAdSkip',cfg.longAdSkip||10);
    set('admViewCoinRate',cfg.viewCoinRate||0.001);
  },

  renderTab: function(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('.admin-tab-content').forEach(function(c){ c.classList.add('hidden'); });
    var btn = document.getElementById('tab-btn-'+tab);
    var con = document.getElementById('tab-'+tab);
    if (btn) btn.classList.add('active');
    if (con) con.classList.remove('hidden');
  },

  renderOverview: async function() {
    var users = await FDB.getAllUsers();
    var wds   = await FDB.getWithdrawals();
    var today = new Date().toDateString();
    var paid  = wds.filter(function(w){return w.status==='Approved';}).reduce(function(s,w){return s+w.amt;},0);
    var set   = function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
    set('admTotalUsers',users.length);
    set('admPending',  wds.filter(function(w){return w.status==='Pending';}).length);
    set('admApproved', wds.filter(function(w){return w.status==='Approved';}).length);
    set('admTotalPaid','৳'+paid.toFixed(2));
    set('admBanned',   users.filter(function(u){return u.isBanned;}).length);
    set('admNewToday', users.filter(function(u){return new Date(u.joinedAt).toDateString()===today;}).length);
  },

  renderWithdrawals: async function(filter) {
    filter = filter||'all';
    var l = document.getElementById('admWithdrawList'); if(!l) return;
    l.innerHTML = '<p style="color:#aaa;text-align:center;padding:10px">Loading...</p>';
    var all  = await FDB.getWithdrawals();
    var list = filter==='all' ? all.slice().reverse() : all.filter(function(w){return w.status===filter;}).reverse();
    if (!list.length) { l.innerHTML='<p style="color:#aaa;text-align:center;padding:20px">No withdrawals found.</p>'; return; }
    var icons={bKash:'📱',Nagad:'🟠',Rocket:'🚀','DBBL Mobile':'🏦'};
    l.innerHTML='';
    list.forEach(function(w){
      var sc=w.status==='Approved'?'status-approved':w.status==='Rejected'?'status-rejected':'status-pending';
      l.innerHTML+=
        '<div class="admin-withdraw-card">' +
        '<div class="admin-withdraw-info">' +
        '<b>'+(icons[w.method]||'💸')+' '+w.username+'</b>' +
        '<span style="color:#aaa">'+w.method+' • '+w.number+'</span>' +
        '<span style="color:var(--neon-gold)">৳'+w.amt.toFixed(2)+'</span>' +
        (w.coinsDeducted?'<small style="color:#888">-'+w.coinsDeducted.toLocaleString()+' coins</small>':'') +
        '<small style="color:#666">'+new Date(w.id).toLocaleString('en-BD')+'</small>' +
        '</div><div class="admin-withdraw-actions">' +
        '<span class="status-badge '+sc+'">'+w.status+'</span>' +
        (w.status==='Pending' ?
          '<button class="btn btn-sm btn-success" onclick="Admin.processWithdraw('+w.id+',\'Approved\')">✅ Approve</button>' +
          '<button class="btn btn-sm btn-danger"  onclick="Admin.processWithdraw('+w.id+',\'Rejected\')">❌ Reject</button>' : '') +
        '</div></div>';
    });
  },

  processWithdraw: async function(wId, status) {
    Loading.show('Processing...');
    var all = await FDB.getWithdrawals();
    var w   = all.find(function(x){return x.id===wId;});
    if (!w) { Loading.hide(); return; }
    if (status==='Rejected' && w.status==='Pending') {
      var user = await FDB.getUser(w.userId);
      if (user) {
        var restore = { balance:(user.balance||0)+w.amt };
        if (w.coinsDeducted) restore.coins = (user.coins||0)+w.coinsDeducted;
        await FDB.updateUser(w.userId, restore);
      }
    }
    await FDB.updateWithdrawalByWId(wId, { status:status, processedAt:new Date().toISOString() });
    Loading.hide(); Admin.renderWithdrawals('all'); Admin.renderOverview();
    toast('Withdrawal '+status,'success');
  },

  renderUsers: async function(search) {
    search = search||'';
    var l = document.getElementById('admUserList'); if(!l) return;
    l.innerHTML='<p style="color:#aaa;text-align:center;padding:10px">Loading...</p>';
    var users = await FDB.getAllUsers();
    if (search) users=users.filter(function(u){
      return u.username.toLowerCase().indexOf(search.toLowerCase())!==-1 || (u.mobile||'').indexOf(search)!==-1;
    });
    if (!users.length) { l.innerHTML='<p style="color:#aaa;text-align:center;padding:20px">No users found.</p>'; return; }
    l.innerHTML='';
    users.forEach(function(u){
      l.innerHTML+=
        '<div class="admin-user-card">' +
        '<img src="'+u.avatar+'" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--neon-cyan);object-fit:cover">' +
        '<div style="flex-grow:1;margin-left:10px">' +
        '<b>'+(u.displayName||u.username)+(u.isBanned?' <span style="color:red">[BANNED]</span>':'')+(u.monetized?' <span style="color:gold">💰</span>':'')+'</b>' +
        '<small style="color:#aaa;display:block">📱 '+u.mobile+' • @'+u.username+'</small>' +
        '<small style="color:#888">Coins: '+(u.coins||0).toLocaleString()+' | ৳'+(u.balance||0).toFixed(2)+'</small>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end">' +
        '<button class="btn btn-sm '+(u.isBanned?'btn-success':'btn-danger')+'" onclick="Admin.toggleBan(\''+u.id+'\')">'+(u.isBanned?'Unban':'Ban')+'</button>' +
        '<button class="btn btn-sm btn-outline" onclick="Admin.editBalance(\''+u.id+'\')">Edit ৳</button>' +
        '</div></div>';
    });
  },

  editBalance: async function(uid) {
    var u = await FDB.getUser(uid); if(!u) return;
    var val = prompt('Balance for '+(u.displayName||u.username)+'\nCurrent: ৳'+(u.balance||0).toFixed(2)+'\nNew value:');
    if (val===null) return;
    var num = parseFloat(val); if(isNaN(num)||num<0) return toast('Invalid amount','error');
    await FDB.updateUser(uid,{balance:num}); Admin.renderUsers(); toast('Updated','success');
  },

  toggleBan: async function(id) {
    var u = await FDB.getUser(id); if(!u) return;
    await FDB.updateUser(id,{isBanned:!u.isBanned}); Admin.renderUsers(); Admin.renderOverview();
    toast((u.isBanned?'Unbanned: ':'Banned: ')+(u.displayName||u.username), u.isBanned?'success':'warning');
  },

  renderTasks: async function() {
    var l = document.getElementById('admTaskList'); if(!l) return;
    var tasks = await FDB.getTasks();
    if (!tasks.length) { l.innerHTML='<p style="color:#aaa;text-align:center">No tasks yet.</p>'; return; }
    l.innerHTML='';
    tasks.forEach(function(t){
      l.innerHTML+=
        '<div class="admin-task-item">' +
        '<img src="'+(t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png')+'" style="width:35px;height:35px;border-radius:8px" onerror="this.src=\'https://cdn-icons-png.flaticon.com/512/149/149071.png\'">' +
        '<div style="flex-grow:1;margin-left:10px"><b>'+t.title+'</b><small style="color:#aaa;display:block">Reward: '+t.reward+' Coins</small></div>' +
        '<button class="btn btn-sm btn-danger" onclick="Admin.delTask(\''+t.id+'\')">🗑️</button></div>';
    });
  },

  addTask: async function() {
    var title  = document.getElementById('admTTitle').value.trim();
    var reward = parseInt(document.getElementById('admTReward').value);
    var link   = document.getElementById('admTLink').value.trim();
    var icon   = document.getElementById('admTIcon').value.trim();
    if (!title)           return toast('Task title required','warning');
    if (!reward||reward<1)return toast('Valid reward required','warning');
    var id = 't_'+Date.now();
    await FDB.write('tasks/'+id, { id:id, title:title, reward:reward, type:'link', icon:icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png', link:link||'#' });
    ['admTTitle','admTReward','admTLink','admTIcon'].forEach(function(eid){ var e=document.getElementById(eid);if(e)e.value=''; });
    Admin.renderTasks(); toast('Task created!','success');
  },

  delTask: async function(taskId) {
    if (!confirm('Delete this task?')) return;
    await FDB.remove('tasks/'+taskId); Admin.renderTasks(); toast('Deleted','info');
  },

  saveConfig: async function() {
    var gn = function(id,def){ var e=document.getElementById(id);return e?(parseFloat(e.value)||def):def; };
    var updates = {
      gameCooldown:gn('admCooldown',24), spinCost:gn('admSpinCost',50),
      scratchCost:gn('admScratchCost',20), slotCost:gn('admSlotCost',100),
      minWithdraw:gn('admMinWithdraw',200), coinToBDT:gn('admCoinRate',0.01),
      referralBonus:gn('admRefBonus',500), referralTasksReq:gn('admRefReq',3)
    };
    var adEl = document.getElementById('admAdCode');     if(adEl) updates.adCode=adEl.value;
    var mEl  = document.getElementById('admMaintenance');if(mEl)  updates.maintenanceMode=mEl.checked;
    await FDB.update('config',updates);
    _appConfig = Object.assign({},_appConfig,updates);
    toast('Saved!','success');
  },

  exportUsers: async function() {
    var users = await FDB.getAllUsers();
    var csv   = ['Username,Mobile,Balance,Coins,Tasks,Joined,Banned,Monetized'].concat(
      users.map(function(u){
        return u.username+','+u.mobile+','+(u.balance||0).toFixed(2)+','+(u.coins||0)+','+(u.tasksCompleted||0)+','+new Date(u.joinedAt).toLocaleDateString()+','+u.isBanned+','+(u.monetized||false);
      })
    ).join('\n');
    var a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'taskmint_users.csv'; a.click();
    toast('Exported!','success');
  },

  clearAllData: async function() {
    if (!confirm('DELETE ALL DATA?')) return;
    if (prompt('Type RESET to confirm:') !== 'RESET') return;
    await Promise.all([FDB.write('users',null),FDB.write('withdrawals',null),FDB.write('videos',null),FDB.write('tasks',null)]);
    toast('Cleared!','info'); setTimeout(function(){ location.reload(); },1500);
  },

  renderVideos: async function() {
    var l  = document.getElementById('admVideoList');
    var ce = document.getElementById('admVideoCount');
    if (!l) return;
    var videos = await FDB.getVideos();
    if (ce) ce.textContent = videos.length + ' video' + (videos.length!==1?'s':'');
    if (!videos.length) { l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px">No videos yet.</p>'; return; }
    l.innerHTML='';
    videos.forEach(function(v){
      var ytId  = VideoSystem.extractYTId(v.url||'');
      var thumb = v.thumbnail||(ytId?'https://img.youtube.com/vi/'+ytId+'/mqdefault.jpg':'');
      l.innerHTML+=
        '<div class="admin-video-item">' +
        '<img src="'+thumb+'" style="width:80px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.style.background=\'#1a1a2e\'">' +
        '<div style="flex-grow:1;margin-left:10px;min-width:0">' +
        '<b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+v.title+'</b>' +
        '<small style="color:#aaa">'+(v.uploaderId?'👤 '+v.uploaderName:'Admin')+' • 👁 '+(v.views||0).toLocaleString()+'</small>' +
        '</div>' +
        '<button class="btn btn-sm btn-danger" onclick="Admin.delVideo(\''+v.id+'\')" style="flex-shrink:0;margin-left:8px">🗑️</button>' +
        '</div>';
    });
  },

  addVideo: async function() {
    var title    = document.getElementById('admVTitle').value.trim();
    var url      = document.getElementById('admVUrl').value.trim();
    var duration = parseInt(document.getElementById('admVDuration').value)||30;
    var cat      = document.getElementById('admVCategory').value;
    var thumb    = document.getElementById('admVThumb').value.trim();
    if (!title) return toast('Title required','warning');
    if (!url)   return toast('YouTube URL required','warning');
    var ytId = VideoSystem.extractYTId(url);
    if (!ytId)  return toast('Invalid YouTube URL','error');
    await FDB.saveVideo({ id:'v_'+Date.now(), title:title, url:ytId, category:cat||'Other', watchDuration:duration, thumbnail:thumb, views:0, addedAt:new Date().toISOString() });
    ['admVTitle','admVUrl','admVDuration','admVThumb'].forEach(function(id){ var e=document.getElementById(id);if(e)e.value=''; });
    Admin.renderVideos(); toast('Video added!','success');
  },

  delVideo: async function(id) {
    if (!confirm('Delete?')) return;
    await FDB.deleteVideo(id); Admin.renderVideos(); toast('Deleted','info');
  },

  saveVideoAdConfig: async function() {
    var gi  = function(id,def){ var e=document.getElementById(id);return e?(parseInt(e.value)||def):def; };
    var en  = document.getElementById('admVideoAdEnabled');
    var code= document.getElementById('admVideoAdCode');
    var upd = {
      videoAdEnabled: en?en.checked:false,
      videoAdCode:    code?code.value:'',
      shortsAdInterval: gi('admShortsAdInterval',60),
      longAdInterval:   gi('admLongAdInterval',300),
      shortsAdSkip:     gi('admShortsAdSkip',5),
      longAdSkip:       gi('admLongAdSkip',10)
    };
    await FDB.update('config',upd);
    _appConfig = Object.assign({},_appConfig,upd);
    toast('Ad settings saved!','success');
  },

  saveViewCoinRate: async function() {
    var e = document.getElementById('admViewCoinRate'); if(!e) return;
    var rate = parseFloat(e.value)||0.001;
    await FDB.update('config',{viewCoinRate:rate});
    _appConfig.viewCoinRate = rate;
    toast('View coin rate saved!','success');
  },

  renderMonetizations: async function() {
    var l = document.getElementById('admMonetizeList'); if(!l) return;
    var users    = await FDB.getAllUsers();
    var pending  = users.filter(function(u){ return u.monetizeStatus==='Pending'; });
    var approved = users.filter(function(u){ return u.monetized===true; });
    if (!pending.length && !approved.length) {
      l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px">No requests.</p>'; return;
    }
    l.innerHTML='';
    pending.forEach(function(u){
      l.innerHTML+=
        '<div class="admin-user-card">' +
        '<img src="'+u.avatar+'" style="width:40px;height:40px;border-radius:50%;border:2px solid gold;object-fit:cover">' +
        '<div style="flex-grow:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span style="color:gold;font-size:0.8rem">[PENDING]</span></b>' +
        '<small style="color:#aaa;display:block">Coins: '+(u.coins||0).toLocaleString()+'</small></div>' +
        '<div style="display:flex;gap:5px;flex-direction:column;align-items:flex-end">' +
        '<button class="btn btn-sm btn-success" onclick="Admin.approveMonetize(\''+u.id+'\')">✅ Approve</button>' +
        '<button class="btn btn-sm btn-danger"  onclick="Admin.rejectMonetize(\''+u.id+'\')">❌ Reject</button>' +
        '</div></div>';
    });
    if (approved.length) {
      l.innerHTML+='<p style="color:var(--neon-gold);margin:10px 0 5px;font-size:0.85rem">✅ Monetized Creators</p>';
      approved.forEach(function(u){
        l.innerHTML+=
          '<div class="admin-user-card" style="border:1px solid rgba(255,215,0,0.2)">' +
          '<img src="'+u.avatar+'" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--neon-gold);object-fit:cover">' +
          '<div style="flex-grow:1;margin-left:10px"><b>'+(u.displayName||u.username)+' <span class="monetized-badge">💰</span></b>' +
          '<small style="color:#aaa;display:block">Views: '+(u.totalVideoViews||0).toLocaleString()+' • ৳'+(u.videoEarnings||0).toFixed(4)+'</small></div>' +
          '<button class="btn btn-sm btn-danger btn-outline" onclick="Admin.revokeMonetize(\''+u.id+'\')">Revoke</button>' +
          '</div>';
      });
    }
  },

  approveMonetize: async function(uid) {
    await FDB.updateUser(uid,{monetized:true,monetizeStatus:'Approved'});
    Admin.renderMonetizations(); toast('Approved! 💰','success');
  },
  rejectMonetize: async function(uid) {
    await FDB.updateUser(uid,{monetizeStatus:'Rejected'});
    Admin.renderMonetizations(); toast('Rejected','info');
  },
  revokeMonetize: async function(uid) {
    if (!confirm('Revoke monetization?')) return;
    await FDB.updateUser(uid,{monetized:false,monetizeStatus:null});
    Admin.renderMonetizations(); toast('Revoked','warning');
  }
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() { Router.init(); });
