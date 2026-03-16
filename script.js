/* ============================================================
   TASKMINT PRO v6 — Firebase + Full Feature Set
   ============================================================ */

const SESSION_KEY = 'taskmint_session';
const ADMIN_PIN   = 'admin@246';

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZSJfWPLRjxlfceUiUHQQ0JonunLVe2_c",
  authDomain:        "taskmint-pro.firebaseapp.com",
  databaseURL:       "https://taskmint-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "taskmint-pro",
  storageBucket:     "taskmint-pro.firebasestorage.app",
  messagingSenderId: "381437349027",
  appId:             "1:381437349027:web:8e6a98be52801423470316",
  measurementId:     "G-NZPR4758EE"
};

const DefaultConfig = {
  referralBonus:     500,
  referralTasksReq:  3,
  minWithdraw:       200,
  maintenanceMode:   false,
  adTimer:           10,
  adCode:            '<div style="color:#555;text-align:center;padding:20px;">ADMIN: PASTE ADS CODE HERE</div>',
  gameCooldown:      24,
  spinCost:          50,
  scratchCost:       20,
  slotCost:          100,
  withdrawMethods:   ['bKash', 'Nagad', 'Rocket', 'DBBL Mobile'],
  coinToBDT:         0.01,
  // Video ad system
  videoAdEnabled:    false,
  videoAdCode:       '',
  shortsAdInterval:  60,    // show ad every N seconds in shorts
  longAdInterval:    300,   // show ad every N seconds in long videos
  shortsAdSkip:      5,     // skip allowed after N seconds for shorts
  longAdSkip:        10,    // skip allowed after N seconds for long videos
  viewCoinRate:      0.001,
  monetizationCoins: 1000000,
  uploadReward:      50
};

/* ============================================================
   STATE
   ============================================================ */
let _db          = null;
let _appConfig   = { ...DefaultConfig };
let _currentUser = null;

/* ============================================================
   FIREBASE
   ============================================================ */
const FDB = {
  init: () => {
    return new Promise((resolve, reject) => {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      _db = firebase.database();

      const timer = setTimeout(() => {
        reject(new Error('Connection timed out. Check Firebase rules and internet.'));
      }, 10000);

      _db.ref('config').once('value', (snap) => {
        clearTimeout(timer);
        _appConfig = snap.exists() ? { ...DefaultConfig, ...snap.val() } : { ...DefaultConfig };
        if (!snap.exists()) _db.ref('config').set(DefaultConfig).catch(() => {});
        resolve();
      }, (err) => {
        clearTimeout(timer);
        reject(new Error(err.message || 'Database read failed'));
      });
    });
  },

  read: (path) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 8000);
      _db.ref(path).once('value',
        (snap) => { clearTimeout(timer); resolve(snap.exists() ? snap.val() : null); },
        (err)  => { clearTimeout(timer); resolve(null); }
      );
    });
  },
  write:  (path, data) => _db.ref(path).set(data).catch(() => {}),
  update: (path, data) => _db.ref(path).update(data).catch(() => {}),
  remove: (path)       => _db.ref(path).remove().catch(() => {}),

  getConfig: async () => {
    if (_appConfig && Object.keys(_appConfig).length > 5) return _appConfig;
    const c = await FDB.read('config');
    _appConfig = c ? { ...DefaultConfig, ...c } : { ...DefaultConfig };
    return _appConfig;
  },

  getUser:     (id)    => FDB.read('users/' + id),
  updateUser:  (id, d) => FDB.update('users/' + id, d),

  getAllUsers: async () => {
    const d = await FDB.read('users');
    if (!d) return [];
    return Object.entries(d).map(([id, u]) => ({ ...u, id }));
  },

  // Find user by field — with hard 8s timeout, never gets stuck
  findUser: (field, value) => {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 8000);
      _db.ref('users').once('value', (snap) => {
        clearTimeout(timer);
        if (!snap.exists()) { resolve(null); return; }
        const data = snap.val();
        const entry = Object.entries(data).find(([, u]) => u[field] === value);
        resolve(entry ? { ...entry[1], id: entry[0] } : null);
      }, (err) => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  },

  saveUser:   (u)  => { const { _fbKey, ...c } = u; return _db.ref('users/' + u.id).set(c); },
  getVideos:  ()   => FDB.read('videos').then(d => d ? Object.entries(d).map(([id,v]) => ({...v,id})) : []),
  saveVideo:  (v)  => _db.ref('videos/' + v.id).set(v),
  deleteVideo:(id) => FDB.remove('videos/' + id),
  getTasks:   ()   => FDB.read('tasks').then(d => {
    if (!d) return [];
    if (Array.isArray(d)) return d;
    return Object.entries(d).map(([id,t]) => ({...t,id}));
  }),

  getWithdrawals: () => FDB.read('withdrawals').then(d =>
    d ? Object.entries(d).map(([k,w]) => ({...w,_key:k})) : []
  ),
  saveWithdrawal: (w) => _db.ref('withdrawals/w_' + w.id).set(w),
  updateWithdrawalByWId: async (wId, changes) => {
    const d = await FDB.read('withdrawals');
    if (!d) return;
    for (const [key, w] of Object.entries(d)) {
      if (w.id === wId) { await FDB.update('withdrawals/' + key, changes); return; }
    }
  }
};

/* ============================================================
   SESSION
   ============================================================ */
const Session = {
  get: () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } },
  set: (u) => {
    _currentUser = u;
    const { videoData, ...safe } = u;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
  },
  clear: () => { _currentUser = null; localStorage.removeItem(SESSION_KEY); },
  current: () => _currentUser || Session.get()
};

/* ============================================================
   LOADING
   ============================================================ */
const Loading = {
  _n: 0,
  show: (msg) => {
    Loading._n++;
    let el = document.getElementById('globalLoading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'globalLoading';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,26,0.93);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;';
      el.innerHTML = '<div class="loading-spinner"></div><p id="loadingMsg" style="color:#ccc;font-size:0.9rem;"></p>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    const m = document.getElementById('loadingMsg');
    if (m) m.textContent = msg || 'Loading...';
  },
  hide: () => {
    Loading._n = Math.max(0, Loading._n - 1);
    if (Loading._n === 0) { const el = document.getElementById('globalLoading'); if (el) el.style.display = 'none'; }
  },
  forceHide: () => { Loading._n = 0; const el = document.getElementById('globalLoading'); if (el) el.style.display = 'none'; }
};

/* ============================================================
   ROUTER
   ============================================================ */
const Router = {
  _prev: null,
  go: (pageId) => {
    Router._prev = Router._current;
    Router._current = pageId;
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    const page = document.getElementById('page-' + pageId);
    if (page) page.classList.remove('hidden');
    const nav = document.getElementById('mainNav');
    if (pageId === 'auth' || pageId === 'admin') nav.classList.add('hidden');
    else nav.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById('nav-' + pageId);
    if (navEl) navEl.classList.add('active');
    UI.renderPage(pageId);
    window.scrollTo(0, 0);
  },

  init: async () => {
    // Inject CSS
    const s = document.createElement('style');
    s.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      .loading-spinner { width:44px;height:44px;border:3px solid rgba(255,255,255,0.08);border-top:3px solid #00f2ea;border-radius:50%;animation:spin 0.75s linear infinite; }
    `;
    document.head.appendChild(s);

    Loading.show('Connecting to database...');
    try {
      await FDB.init();
    } catch (err) {
      Loading.forceHide();
      document.body.innerHTML = `<div style="min-height:100vh;background:#0a0a1a;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:rgba(255,50,50,0.08);border:1px solid rgba(255,80,80,0.25);border-radius:20px;padding:30px;max-width:380px;width:100%;text-align:center;">
          <div style="font-size:3rem;margin-bottom:15px;">⚠️</div>
          <h2 style="color:#ff6b6b;margin-bottom:10px;">Database Connection Failed</h2>
          <p style="color:#aaa;font-size:0.82rem;margin-bottom:20px;">${err.message}</p>
          <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;text-align:left;margin-bottom:20px;font-size:0.8rem;color:#aaa;">
            <b style="color:#ffd700;display:block;margin-bottom:8px;">Check:</b>
            <p>1. Firebase Realtime Database is enabled</p>
            <p>2. Rules: .read and .write = true</p>
            <p>3. FIREBASE_CONFIG in script.js is correct</p>
          </div>
          <button onclick="location.reload()" style="background:linear-gradient(90deg,#00f2ea,#7b2ff7);color:white;border:none;padding:12px 28px;border-radius:30px;font-weight:bold;cursor:pointer;">🔄 Retry</button>
        </div></div>`;
      return;
    }

    const s2 = Session.get();
    if (s2 && s2.id && s2.username) {
      // Use cached session directly — no Firebase verify on startup
      _currentUser = s2;
      Loading.hide();
      Router.go('home');
      // Verify in background silently (does not block UI)
      FDB.getUser(s2.id).then(u => {
        if (u && !u.isBanned) {
          _currentUser = { ...u, id: s2.id };
          Session.set(_currentUser);
          UI.render();
        } else if (u && u.isBanned) {
          Session.clear();
          Router.go('auth');
          UI.toast('Your account has been suspended', 'error');
        }
      }).catch(() => { /* silent — user stays logged in */ });
      return;
    }
    Loading.hide();
    Router.go('auth');
  }
};

/* ============================================================
   AUTH
   ============================================================ */
const Auth = {
  _usernameTimer: null,

  checkUsername: (val) => {
    const el = document.getElementById('usernameStatus');
    if (!el) return;
    clearTimeout(Auth._usernameTimer);
    if (!val || val.length < 3) { el.textContent = ''; return; }
    el.textContent = '⏳';
    el.style.color = '#aaa';
    Auth._usernameTimer = setTimeout(async () => {
      const taken = await FDB.findUser('username', val);
      if (taken) {
        el.textContent = '✗ Taken';
        el.style.color = '#ff6b6b';
      } else {
        el.textContent = '✓ Available';
        el.style.color = '#00d26a';
      }
    }, 600);
  },

  login: async () => {
    const username = document.getElementById('lUser').value.trim();
    const password = document.getElementById('lPass').value;
    if (!username || !password) return UI.toast('Enter username and password', 'warning');

    Loading.show('Signing in...');

    const timeout = setTimeout(() => {
      Loading.forceHide();
      UI.toast('Connection timed out. Please try again.', 'error');
    }, 12000);

    try {
      if (_appConfig.maintenanceMode) {
        clearTimeout(timeout); Loading.forceHide();
        return UI.toast('Server is under maintenance', 'warning');
      }

      const user = await FDB.findUser('username', username);
      clearTimeout(timeout);

      if (!user || user.password !== password) {
        Loading.forceHide();
        return UI.toast('Invalid username or password', 'error');
      }
      if (user.isBanned) {
        Loading.forceHide();
        return UI.toast('Your account has been suspended', 'error');
      }

      _currentUser = user;
      Session.set(user);
      Loading.forceHide();
      Router.go('home');
    } catch (err) {
      clearTimeout(timeout);
      Loading.forceHide();
      UI.toast('Login failed. Please try again.', 'error');
    }
  },

  register: async () => {
    const username = document.getElementById('rUser').value.trim();
    const mobile   = document.getElementById('rMob').value.trim();
    const password = document.getElementById('rPass').value;
    const refCode  = document.getElementById('rRef').value.trim().toUpperCase();
    if (!username || !mobile || !password) return UI.toast('Please fill all required fields', 'warning');
    if (username.length < 3)  return UI.toast('Username must be at least 3 characters', 'warning');
    if (mobile.length < 11)   return UI.toast('Enter a valid mobile number (11 digits)', 'warning');
    if (password.length < 6)  return UI.toast('Password must be at least 6 characters', 'warning');

    Loading.show('Creating account...');

    const timeout = setTimeout(() => {
      Loading.forceHide();
      UI.toast('Connection timed out. Check your internet and try again.', 'error');
    }, 15000);

    try {
      const existing = await FDB.findUser('username', username);
      if (existing) { clearTimeout(timeout); Loading.hide(); return UI.toast('Username already taken', 'error'); }
      const existMob = await FDB.findUser('mobile', mobile);
      if (existMob) { clearTimeout(timeout); Loading.hide(); return UI.toast('Mobile already registered', 'error'); }
      const newId = 'u_' + Date.now();
      const newUser = {
        id: newId, username, mobile, password,
        displayName: username,
        avatar: 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        balance: 0, coins: 100,
        refCode: 'TM' + Math.floor(1000 + Math.random() * 9000),
        referredBy: refCode || null,
        joinedAt: new Date().toISOString(),
        isBanned: false, tasksCompleted: 0, lockedRewards: [],
        lastSpin: 0, lastScratch: 0, lastSlot: 0,
        totalEarned: 0, totalWithdrawn: 0,
        videoHistory: [], subscriptions: [],
        monetized: false, monetizeStatus: null,
        totalVideoViews: 0, videoEarnings: 0,
        channelDesc: '', channelBanner: ''
      };
      if (refCode) {
        const allUsers = await FDB.read('users');
        if (allUsers) {
          const entry = Object.entries(allUsers).find(([, u]) => u.refCode === refCode);
          if (entry) {
            const [refId, refData] = entry;
            const locks = refData.lockedRewards || [];
            locks.push({ sourceId: newId, sourceName: username, amount: _appConfig.referralBonus, unlocked: false, progress: 0 });
            await FDB.updateUser(refId, { lockedRewards: locks });
          } else {
            newUser.referredBy = null;
          }
        }
      }
      await FDB.saveUser(newUser);
      clearTimeout(timeout);
      _currentUser = newUser;
      Session.set(newUser);
      Loading.hide();
      UI.toast('Welcome to TaskMint Pro! You received 100 free coins!', 'success');
      setTimeout(() => Router.go('home'), 1200);
    } catch (err) {
      clearTimeout(timeout);
      Loading.forceHide();
      UI.toast('Registration failed: ' + (err.message || 'Please try again.'), 'error');
    }
  },

  logout: () => {
    if (confirm('Are you sure you want to logout?')) { Session.clear(); Router.go('auth'); }
  },

  adminLogin: () => {
    const pin = document.getElementById('adminPin').value;
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem('isAdmin', 'true');
      document.getElementById('admin-gate').classList.add('hidden');
      Router.go('admin');
      Admin.init();
    } else {
      UI.toast('Wrong admin PIN', 'error');
    }
  }
};

/* ============================================================
   PROFILE SYSTEM
   ============================================================ */
const Profile = {
  openMyChannel: () => {
    const u = Session.current(); if (!u) return;
    ChannelSystem.openChannel(u.id);
  },

  uploadPic: (input) => {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) return UI.toast('Please select an image file', 'warning');
    if (file.size > 5 * 1024 * 1024) return UI.toast('Image too large. Max 5MB.', 'error');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      const u = Session.current(); if (!u) return;
      Loading.show('Updating profile picture...');
      await FDB.updateUser(u.id, { avatar: base64 });
      _currentUser = { ..._currentUser, avatar: base64 };
      Session.set(_currentUser);
      document.querySelectorAll('.u-avatar').forEach(el => { if (el.tagName === 'IMG') el.src = base64; });
      const pa = document.getElementById('profileAvatar'); if (pa) pa.src = base64;
      Loading.hide();
      UI.toast('Profile picture updated!', 'success');
    };
    reader.readAsDataURL(file);
  },

  setAvatar: async (src) => {
    const u = Session.current(); if (!u) return;
    Loading.show('Updating avatar...');
    await FDB.updateUser(u.id, { avatar: src });
    _currentUser = { ..._currentUser, avatar: src };
    Session.set(_currentUser);
    document.querySelectorAll('.u-avatar').forEach(el => { if (el.tagName === 'IMG') el.src = src; });
    const pa = document.getElementById('profileAvatar'); if (pa) pa.src = src;
    Loading.hide();
    UI.toast('Avatar updated!', 'success');
  },

  saveChanges: async () => {
    const displayName  = document.getElementById('editDisplayName').value.trim();
    const newPass      = document.getElementById('editNewPass').value;
    const confirmPass  = document.getElementById('editConfirmPass').value;
    const currentPass  = document.getElementById('editCurrentPass').value;
    if (!currentPass) return UI.toast('Enter your current password to save changes', 'warning');
    const u = Session.current(); if (!u) return;
    Loading.show('Verifying...');
    const userData = await FDB.getUser(u.id);
    if (userData.password !== currentPass) { Loading.hide(); return UI.toast('Incorrect current password', 'error'); }
    const updates = {};
    if (displayName && displayName.length >= 2) updates.displayName = displayName;
    if (newPass) {
      if (newPass.length < 6) { Loading.hide(); return UI.toast('New password must be at least 6 characters', 'warning'); }
      if (newPass !== confirmPass) { Loading.hide(); return UI.toast('Passwords do not match', 'error'); }
      updates.password = newPass;
    }
    if (!Object.keys(updates).length) { Loading.hide(); return UI.toast('No changes to save', 'info'); }
    await FDB.updateUser(u.id, updates);
    _currentUser = { ..._currentUser, ...updates };
    Session.set(_currentUser);
    Loading.hide();
    document.getElementById('editCurrentPass').value = '';
    document.getElementById('editNewPass').value = '';
    document.getElementById('editConfirmPass').value = '';
    UI.toast('Profile updated successfully!', 'success');
    UI.render();
  }
};

/* ============================================================
   UI CONTROLLER
   ============================================================ */
const UI = {
  toast: (msg, type) => {
    type = type || 'info';
    const colors = { success:'linear-gradient(90deg,#00d26a,#00a855)', error:'linear-gradient(90deg,#ff4b4b,#cc2222)', warning:'linear-gradient(90deg,#ffd700,#c8930a)', info:'linear-gradient(90deg,#00f2ea,#b026ff)' };
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + (colors[type]||colors.info) + ';color:white;padding:12px 24px;border-radius:30px;font-weight:bold;z-index:99998;font-size:0.9rem;box-shadow:0 4px 20px rgba(0,0,0,0.4);max-width:90%;text-align:center;transition:opacity 0.4s;';
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2800);
    setTimeout(() => t.remove(), 3200);
  },

  toggleAuth: (mode) => {
    if (mode === 'register') {
      document.getElementById('form-login').classList.add('hidden');
      document.getElementById('form-register').classList.remove('hidden');
    } else {
      document.getElementById('form-login').classList.remove('hidden');
      document.getElementById('form-register').classList.add('hidden');
    }
  },

  // Fast sync render — uses cached user only
  render: () => {
    const u = Session.current(); if (!u) return;
    document.querySelectorAll('.u-name').forEach(e => e.innerText = u.displayName || u.username || '');
    document.querySelectorAll('.u-bal').forEach(e => e.innerText = '৳' + (u.balance||0).toFixed(2));
    document.querySelectorAll('.u-coins').forEach(e => e.innerText = (u.coins||0).toLocaleString());
    document.querySelectorAll('.u-avatar').forEach(e => { if (e.tagName==='IMG') e.src = u.avatar || ''; });
  },

  // Full async render for a specific page
  renderPage: async (pageId) => {
    const u = Session.current(); if (!u || !u.id) return;
    try {
      const fresh = await FDB.getUser(u.id);
      if (!fresh) return;
      _currentUser = { ...fresh, id: u.id };
      Session.set(_currentUser);
      const fu = _currentUser;
      document.querySelectorAll('.u-name').forEach(e => e.innerText = fu.displayName || fu.username || '');
      document.querySelectorAll('.u-bal').forEach(e => e.innerText = '৳' + (fu.balance||0).toFixed(2));
      document.querySelectorAll('.u-coins').forEach(e => e.innerText = (fu.coins||0).toLocaleString());
      document.querySelectorAll('.u-avatar').forEach(e => { if (e.tagName==='IMG') e.src = fu.avatar || ''; });
      const cfg = await FDB.getConfig();
      if (pageId === 'home') {
        const adBox = document.getElementById('homeAdContainer');
        if (adBox) adBox.innerHTML = cfg.adCode || '';
        UI._renderTasks();
        Games.initButtons(fu, cfg);
      }
      if (pageId === 'referral') UI._renderReferrals(fu, cfg);
      if (pageId === 'withdraw') {
        UI._checkWithdrawAccess(fu);
        UI._renderWithdrawals(fu);
        UI._renderWithdrawOptions(cfg);
      }
      if (pageId === 'videos') {
        VideoSystem.renderVideoList();
        VideoSystem.renderVideoStats(fu);
      }
      if (pageId === 'profile') UI._renderProfile(fu);
    } catch (e) { /* silent */ }
  },

  _checkWithdrawAccess: (u) => {
    const lockEl = document.getElementById('withdrawLockNotice');
    const formEl = document.getElementById('withdrawForm');
    if (!lockEl || !formEl) return;
    if (!u.monetized) {
      lockEl.classList.remove('hidden');
      formEl.classList.add('hidden');
    } else {
      lockEl.classList.add('hidden');
      formEl.classList.remove('hidden');
    }
  },

  _renderProfile: (u) => {
    const pa = document.getElementById('profileAvatar');
    if (pa) pa.src = u.avatar || '';
    const pn = document.getElementById('profileName');
    if (pn) pn.innerText = u.displayName || u.username;
    const pm = document.getElementById('profileMobile');
    if (pm) pm.innerText = '📱 ' + u.mobile;
    const pms = document.getElementById('profileMonetizeStatus');
    if (pms) {
      if (u.monetized) pms.innerHTML = '<span class="monetized-badge">💰 Monetized Creator</span>';
      else if (u.monetizeStatus === 'Pending') pms.innerHTML = '<span style="color:#f59e0b;">⏳ Monetization Pending</span>';
      else pms.innerHTML = '<span style="color:#555;font-size:0.78rem;">Not monetized — coins earned but no BDT from views</span>';
    }
    const dn = document.getElementById('editDisplayName');
    if (dn) dn.value = u.displayName || u.username;
    const pt = document.getElementById('profileTasks');   if (pt) pt.innerText = u.tasksCompleted || 0;
    const pe = document.getElementById('profileEarned');  if (pe) pe.innerText = '৳' + (u.totalEarned||0).toFixed(2);
    const pj = document.getElementById('profileJoined');  if (pj) pj.innerText = new Date(u.joinedAt).toLocaleDateString('en-BD');
    const pv = document.getElementById('profileViews');   if (pv) pv.innerText = (u.totalVideoViews||0).toLocaleString();
  },

  _renderTasks: async () => {
    const l = document.getElementById('taskList'); if (!l) return;
    const tasks = await FDB.getTasks();
    if (!tasks.length) { l.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">No active tasks right now.</p>'; return; }
    l.innerHTML = '';
    tasks.forEach(t => {
      l.innerHTML += `<div class="task-card glass">
        <img src="${t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" class="task-icon" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
        <div class="task-info"><b>${t.title}</b><span class="coin-badge">+${t.reward} Coins</span></div>
        <button class="btn btn-sm task-btn" onclick="Tasks.start('${t.link||'#'}',${t.reward},'${t.id}')"><i class="fas fa-play"></i> Start</button>
      </div>`;
    });
  },

  _renderReferrals: (u, cfg) => {
    const l = document.getElementById('refList'); if (!l) return;
    const codeEl = document.getElementById('myRefCode');
    if (codeEl) codeEl.innerText = u.refCode || '---';
    const locks = u.lockedRewards || [];
    const unlocked = locks.filter(r => r.unlocked).length;
    const statsEl = document.getElementById('refStats');
    if (statsEl) statsEl.innerHTML = `<div class="ref-stat"><span>${locks.length}</span><small>Total Invites</small></div><div class="ref-stat"><span>${unlocked}</span><small>Unlocked</small></div><div class="ref-stat"><span>৳${(unlocked*(cfg.referralBonus||500)*(cfg.coinToBDT||0.01)).toFixed(0)}</span><small>Earned</small></div>`;
    if (!locks.length) { l.innerHTML = '<p class="empty-msg">No referrals yet. Share your code!</p>'; return; }
    l.innerHTML = '';
    locks.forEach(r => {
      const prog = Math.min(100, (r.progress / (cfg.referralTasksReq||3)) * 100);
      l.innerHTML += `<div class="glass ref-item"><div><b>${r.sourceName}</b><small style="color:#aaa;display:block;">Progress: ${r.progress}/${cfg.referralTasksReq||3} tasks</small><div class="progress-bar"><div style="width:${prog}%"></div></div></div><span class="${r.unlocked?'badge-unlocked':'badge-locked'}">${r.unlocked?'✅ ৳'+r.amount:'🔒 ৳'+r.amount}</span></div>`;
    });
  },

  _renderWithdrawals: async (u) => {
    const l = document.getElementById('withdrawList'); if (!l) return;
    const all = await FDB.getWithdrawals();
    const myW = all.filter(w => w.userId === u.id).reverse();
    if (!myW.length) { l.innerHTML = '<p class="empty-msg">No withdrawal history yet.</p>'; return; }
    const icons = { bKash:'📱', Nagad:'🟠', Rocket:'🚀', 'DBBL Mobile':'🏦' };
    l.innerHTML = '';
    myW.forEach(w => {
      const sc = w.status==='Approved'?'status-approved':w.status==='Rejected'?'status-rejected':'status-pending';
      l.innerHTML += `<div class="glass withdraw-history-item"><div><b>${icons[w.method]||'💸'} ${w.method}</b><small style="color:#aaa;display:block;">${w.number} &bull; ${new Date(w.id).toLocaleDateString('en-BD')}</small></div><div style="text-align:right;"><b style="color:var(--neon-gold);">৳${w.amt.toFixed(2)}</b><span class="status-badge ${sc}">${w.status}</span></div></div>`;
    });
  },

  _renderWithdrawOptions: (cfg) => {
    const sel = document.getElementById('wMethod'); if (!sel) return;
    sel.innerHTML = '<option value="">-- Select Method --</option>';
    (cfg.withdrawMethods||['bKash','Nagad','Rocket','DBBL Mobile']).forEach(m => {
      sel.innerHTML += `<option value="${m}">${m}</option>`;
    });
  },

  copyRef: () => {
    const code = document.getElementById('myRefCode').innerText;
    navigator.clipboard.writeText(code).then(() => UI.toast('Referral code copied!','success')).catch(() => {
      const el = document.createElement('textarea'); el.value = code; document.body.appendChild(el);
      el.select(); document.execCommand('copy'); document.body.removeChild(el);
      UI.toast('Referral code copied!','success');
    });
  },

  shareRef: () => {
    const code = document.getElementById('myRefCode').innerText;
    const msg = 'Join TaskMint Pro! Use my code: ' + code;
    if (navigator.share) navigator.share({ title:'TaskMint Pro', text:msg });
    else { navigator.clipboard.writeText(msg); UI.toast('Share message copied!','success'); }
  },

  requestWithdraw: async () => {
    const method = document.getElementById('wMethod').value;
    const number = document.getElementById('wNumber').value.trim();
    const amt    = parseFloat(document.getElementById('wAmt').value);
    if (!method) return UI.toast('Please select a withdrawal method', 'warning');
    if (!number || number.length < 11) return UI.toast('Enter a valid mobile number', 'warning');
    if (isNaN(amt) || amt <= 0) return UI.toast('Enter a valid amount', 'warning');
    Loading.show('Processing withdrawal...');
    try {
      const u   = await FDB.getUser(Session.current().id);
      const cfg = _appConfig;
      if (!u.monetized) { Loading.hide(); return UI.toast('You must be monetized to withdraw', 'error'); }
      if (amt > (u.balance||0)) { Loading.hide(); return UI.toast('Insufficient balance', 'error'); }
      if (amt < cfg.minWithdraw) { Loading.hide(); return UI.toast('Minimum withdrawal: ৳' + cfg.minWithdraw, 'warning'); }
      const all = await FDB.getWithdrawals();
      if (all.find(w => w.userId === u.id && w.status === 'Pending')) { Loading.hide(); return UI.toast('You already have a pending request', 'warning'); }
      // Deduct BDT and equivalent coins
      const coinsToDeduct = Math.ceil(amt / (cfg.coinToBDT||0.01));
      const newBal   = Math.max(0, (u.balance||0) - amt);
      const newCoins = Math.max(0, (u.coins||0) - coinsToDeduct);
      await FDB.updateUser(u.id, { balance: newBal, coins: newCoins, totalWithdrawn: (u.totalWithdrawn||0)+amt });
      await FDB.saveWithdrawal({ id: Date.now(), userId: u.id, username: u.username, mobile: u.mobile, amt, method, number, status: 'Pending', coinsDeducted: coinsToDeduct, requestedAt: new Date().toISOString(), processedAt: null });
      _currentUser = { ..._currentUser, balance: newBal, coins: newCoins };
      Session.set(_currentUser);
      Loading.hide();
      document.getElementById('wMethod').value = '';
      document.getElementById('wNumber').value = '';
      document.getElementById('wAmt').value = '';
      UI.toast('Withdrawal submitted! Processing in 24-48 hours.', 'success');
      UI.render();
      UI._renderWithdrawals(Session.current());
    } catch (e) {
      Loading.hide();
      UI.toast('Request failed. Please try again.', 'error');
    }
  }
};

/* ============================================================
   TASK ENGINE
   ============================================================ */
const Tasks = {
  start: (link, reward, taskId) => {
    if (link && link !== '#') window.open(link, '_blank');
    const overlay = document.getElementById('taskOverlay');
    const timerEl = document.getElementById('taskTimer');
    overlay.classList.remove('hidden');
    let left = _appConfig.adTimer || 10;
    timerEl.innerText = left;
    const interval = setInterval(() => {
      left--; timerEl.innerText = left;
      if (left <= 0) { clearInterval(interval); overlay.classList.add('hidden'); Tasks.complete(reward); }
    }, 1000);
  },

  complete: async (reward) => {
    const u = Session.current(); if (!u) return;
    Loading.show('Claiming reward...');
    try {
      const userData = await FDB.getUser(u.id);
      const cfg = _appConfig;
      const earned = reward * (cfg.coinToBDT||0.01);
      // Only add BDT if monetized
      const updates = {
        coins:          (userData.coins||0) + reward,
        tasksCompleted: (userData.tasksCompleted||0) + 1,
        totalEarned:    (userData.totalEarned||0) + earned
      };
      if (userData.monetized) updates.balance = (userData.balance||0) + earned;
      await FDB.updateUser(u.id, updates);
      // Referral progress
      if (userData.referredBy) {
        const allUsers = await FDB.read('users');
        if (allUsers) {
          const entry = Object.entries(allUsers).find(([, x]) => x.refCode === userData.referredBy);
          if (entry) {
            const [refId, refData] = entry;
            const locks = refData.lockedRewards || [];
            const lock = locks.find(r => r.sourceId === u.id);
            if (lock && !lock.unlocked) {
              lock.progress++;
              if (lock.progress >= (cfg.referralTasksReq||3)) {
                lock.unlocked = true;
                if (refData.monetized) await FDB.updateUser(refId, { balance: (refData.balance||0)+(lock.amount*(cfg.coinToBDT||0.01)), lockedRewards: locks });
                else await FDB.updateUser(refId, { lockedRewards: locks });
              } else {
                await FDB.updateUser(refId, { lockedRewards: locks });
              }
            }
          }
        }
      }
      _currentUser = { ..._currentUser, coins: (_currentUser.coins||0)+reward };
      if (userData.monetized) _currentUser.balance = (_currentUser.balance||0) + earned;
      Session.set(_currentUser);
      Loading.hide(); UI.render();
      if (userData.monetized) UI.toast('+' + reward + ' Coins + ৳' + earned.toFixed(2) + ' earned!', 'success');
      else UI.toast('+' + reward + ' Coins earned! (Monetize to earn BDT)', 'success');
    } catch (e) {
      Loading.hide();
      UI.toast('Could not claim reward. Try again.', 'error');
    }
  }
};

/* ============================================================
   GAMES
   ============================================================ */
const Games = {
  fmtTime: (ms) => Math.floor(ms/3600000) + 'h ' + Math.floor((ms%3600000)/60000) + 'm',
  checkCd: (last, hours) => { const diff=Date.now()-(last||0); const req=hours*3600000; return diff<req?{ok:false,wait:req-diff}:{ok:true}; },
  initButtons: (u, cfg) => {
    Games._setBtn('btnSpin', u.lastSpin, cfg.gameCooldown||24, 'Spin ('+(cfg.spinCost||50)+' Coins)');
    Games._setBtn('btnSlot', u.lastSlot, cfg.gameCooldown||24, 'Play ('+(cfg.slotCost||100)+' Coins)');
  },
  _setBtn: (id, last, cd, text) => {
    const el = document.getElementById(id); if (!el) return;
    const st = Games.checkCd(last, cd);
    if (!st.ok) { el.innerHTML='<i class="fas fa-clock"></i> '+Games.fmtTime(st.wait); el.disabled=true; el.style.opacity='0.5'; }
    else { el.innerHTML=text; el.disabled=false; el.style.opacity='1'; }
  },
  playSpin: async () => {
    const u=Session.current(); if(!u) return;
    const cfg=_appConfig; const userData=await FDB.getUser(u.id);
    const st=Games.checkCd(userData.lastSpin,cfg.gameCooldown||24);
    if(!st.ok) return UI.toast('Cooldown: '+Games.fmtTime(st.wait),'warning');
    if((userData.coins||0)<(cfg.spinCost||50)) return UI.toast('Need '+(cfg.spinCost||50)+' coins','error');
    const w=document.getElementById('wheel');
    const deg=3600+Math.floor(Math.random()*3600);
    w.style.transition='transform 4s cubic-bezier(0.17,0.67,0.12,0.99)';
    w.style.transform='rotate('+deg+'deg)';
    document.getElementById('btnSpin').disabled=true;
    const win=Math.floor(Math.random()*150)+10;
    await FDB.updateUser(u.id,{coins:(userData.coins||0)-(cfg.spinCost||50)+win, lastSpin:Date.now()});
    _currentUser={..._currentUser,coins:(_currentUser.coins||0)-(cfg.spinCost||50)+win};
    Session.set(_currentUser);
    setTimeout(()=>{ UI.render(); UI.toast('You won '+win+' Coins!','success'); Games._setBtn('btnSpin',Date.now(),cfg.gameCooldown||24,'Spin ('+(cfg.spinCost||50)+' Coins)'); setTimeout(()=>{w.style.transition='none';w.style.transform='rotate(0deg)';},100); },4200);
  },
  playScratch: async (el) => {
    if(el.dataset.used==='1') return;
    const u=Session.current(); if(!u) return;
    const cfg=_appConfig; const userData=await FDB.getUser(u.id);
    const st=Games.checkCd(userData.lastScratch,cfg.gameCooldown||24);
    if(!st.ok) return UI.toast('Cooldown: '+Games.fmtTime(st.wait),'warning');
    if((userData.coins||0)<(cfg.scratchCost||20)) return UI.toast('Need '+(cfg.scratchCost||20)+' coins','error');
    const win=Math.floor(Math.random()*60)+5;
    await FDB.updateUser(u.id,{coins:(userData.coins||0)-(cfg.scratchCost||20)+win, lastScratch:Date.now()});
    _currentUser={..._currentUser,coins:(_currentUser.coins||0)-(cfg.scratchCost||20)+win};
    Session.set(_currentUser); UI.render();
    el.dataset.used='1'; el.style.background='linear-gradient(135deg,#1a1a2e,#16213e)'; el.style.border='2px solid var(--neon-gold)';
    el.innerHTML='<div style="text-align:center;"><h2 style="color:var(--neon-gold);font-size:2rem;">+'+win+'</h2><p style="color:#aaa;">Coins Won!</p></div>';
    UI.toast('Scratch Card: +'+win+' Coins!','success');
    setTimeout(()=>{ el.dataset.used='0'; el.style.background=''; el.style.border=''; el.innerHTML='<div style="text-align:center;color:#aaa;"><i class="fas fa-ticket-alt" style="font-size:2rem;"></i><p>Tap to Scratch ('+(cfg.scratchCost||20)+' Coins)</p></div>'; },3000);
  },
  playSlot: async () => {
    const u=Session.current(); if(!u) return;
    const cfg=_appConfig; const userData=await FDB.getUser(u.id);
    const st=Games.checkCd(userData.lastSlot,cfg.gameCooldown||24);
    if(!st.ok) return UI.toast('Cooldown: '+Games.fmtTime(st.wait),'warning');
    if((userData.coins||0)<(cfg.slotCost||100)) return UI.toast('Need '+(cfg.slotCost||100)+' coins','error');
    const symbols=['🍋','🍒','💎','7️⃣','🔔','⭐'];
    const r=[0,1,2].map(()=>Math.floor(Math.random()*symbols.length));
    const rand=Math.random();
    if(rand>0.95){r[0]=r[1]=r[2]=3;} else if(rand>0.75){r[2]=r[0];}
    ['s1','s2','s3'].forEach((id,i)=>{document.getElementById(id).innerText=symbols[r[i]];});
    let win=0;
    if(r[0]===3&&r[1]===3&&r[2]===3) win=1000;
    else if(r[0]===r[1]&&r[1]===r[2]) win=300;
    else if(r[0]===r[1]||r[1]===r[2]||r[0]===r[2]) win=60;
    await FDB.updateUser(u.id,{coins:(userData.coins||0)-(cfg.slotCost||100)+win, lastSlot:Date.now()});
    _currentUser={..._currentUser,coins:(_currentUser.coins||0)-(cfg.slotCost||100)+win};
    Session.set(_currentUser);
    setTimeout(()=>{ UI.render(); if(win>=1000) UI.toast('JACKPOT! +'+win+' Coins!','success'); else if(win>0) UI.toast('Nice! +'+win+' Coins!','success'); else UI.toast('No match. Try again!','info'); },400);
  }
};

/* ============================================================
   VIDEO SYSTEM
   ============================================================ */
const VideoSystem = {
  _timer:null, _elapsed:0, _currentVideo:null, _claimed:false,
  _adTimer:null, _pendingVideoId:null, _adShownAt:0,

  extractYTId: (input) => {
    if(!input) return null; input=input.trim();
    if(/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const pp=[/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,/youtu\.be\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/];
    for(const p of pp){const m=input.match(p);if(m) return m[1];}
    return null;
  },

  isShorts: (video) => {
    return video.category === 'Shorts' || (video.watchDuration||15) < 60;
  },

  switchTab: (tab) => {
    ['watch','upload','myvideos','monetize'].forEach(t=>{
      const el=document.getElementById('vtab-'+t); const btn=document.getElementById('vtab-btn-'+t);
      if(el) el.classList.toggle('hidden',t!==tab);
      if(btn) btn.classList.toggle('active',t===tab);
    });
    if(tab==='watch')    VideoSystem.renderVideoList();
    if(tab==='myvideos') VideoSystem.renderMyVideos();
    if(tab==='monetize') MonetizeSystem.renderMonetizeTab();
  },

  renderVideoList: async () => {
    const l=document.getElementById('videoList'); const empty=document.getElementById('videoEmptyMsg'); if(!l) return;
    const u=Session.current(); if(!u) return;
    const [userData, videos] = await Promise.all([FDB.getUser(u.id), FDB.getVideos()]);
    if(!videos.length){l.innerHTML='';if(empty)empty.classList.remove('hidden');return;}
    if(empty) empty.classList.add('hidden');
    const today=new Date().toDateString();
    l.innerHTML='';
    videos.forEach(v=>{
      const watched=!!((userData.videoHistory||[]).find(h=>h.vid===v.id&&new Date(h.watchedAt).toDateString()===today));
      const ytId=VideoSystem.extractYTId(v.url||'');
      const thumb=v.thumbnail||(ytId?'https://img.youtube.com/vi/'+ytId+'/mqdefault.jpg':'');
      const isShorts=VideoSystem.isShorts(v);
      const typeBadge=isShorts?'<span style="background:#ff0060;color:white;font-size:0.7rem;padding:2px 6px;border-radius:4px;margin-left:4px;">⚡ Shorts</span>':'';
      const uploaderBadge=v.uploaderId?'<span class="user-upload-badge"><i class="fas fa-user"></i> User</span>':'';
      l.innerHTML+=`<div class="video-card glass">
        <div class="video-thumb-wrap" onclick="${watched?"UI.toast('Already watched today!','warning')":"VideoSystem.startVideoFlow('"+v.id+"')"}">
          ${thumb?`<img src="${thumb}" class="video-thumb" onerror="this.style.background='#1a1a2e'">`:'<div class="video-thumb" style="position:absolute;inset:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;"><i class="fas fa-play-circle" style="font-size:3rem;color:#333;"></i></div>'}
          <div class="video-play-icon ${watched?'video-watched':''}"><i class="fas fa-${watched?'check-circle':'play'}"></i></div>
        </div>
        <div class="video-card-info">
          <h4 class="video-title">${v.title}${typeBadge}${uploaderBadge}</h4>
          <div class="video-meta"><span class="coin-badge"><i class="fas fa-eye"></i> ${(v.views||0).toLocaleString()}</span>${v.category?'<span class="video-cat-badge">'+v.category+'</span>':''}</div>
          ${watched?'<div class="video-done-badge"><i class="fas fa-check"></i> Watched Today</div>':`<button class="btn btn-sm video-watch-btn" onclick="VideoSystem.startVideoFlow('${v.id}')"><i class="fas fa-play"></i> Watch</button>`}
        </div>
      </div>`;
    });
  },

  renderVideoStats: (u) => {
    const today=new Date().toDateString(); const hist=(u.videoHistory||[]);
    const todayH=hist.filter(h=>new Date(h.watchedAt).toDateString()===today);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
    set('vidTodayEarned',todayH.reduce((s,h)=>s+(h.reward||0),0));
    set('vidTodayCount',todayH.length);
    set('vidTotalWatched',hist.length);
  },

  renderMyVideos: async () => {
    const l=document.getElementById('myVideosList'); if(!l) return;
    const u=Session.current(); if(!u) return;
    const [userData, videos]=await Promise.all([FDB.getUser(u.id),FDB.getVideos()]);
    const myVids=videos.filter(v=>v.uploaderId===u.id).reverse();
    if(!myVids.length){l.innerHTML='<div style="text-align:center;padding:40px 20px;color:#aaa;"><i class="fas fa-video-slash" style="font-size:2.5rem;opacity:0.3;display:block;margin-bottom:10px;"></i><p>No videos uploaded yet.</p></div>';return;}
    const cfg=_appConfig; l.innerHTML='';
    myVids.forEach(v=>{
      l.innerHTML+=`<div class="video-card glass">
        <div class="video-thumb-wrap" onclick="ChannelSystem.openChannel('${u.id}')">
          ${v.thumbnail?`<img src="${v.thumbnail}" class="video-thumb">`:'<div class="video-thumb" style="position:absolute;inset:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;"><i class="fas fa-film" style="font-size:2rem;color:#444;"></i></div>'}
          <div class="video-play-icon" style="background:rgba(0,0,0,0.4);cursor:default;"><i class="fas fa-eye" style="color:var(--neon-cyan);font-size:1.5rem;"></i></div>
        </div>
        <div class="video-card-info">
          <h4 class="video-title">${v.title} <span class="user-upload-badge"><i class="fas fa-user"></i> Mine</span></h4>
          <div class="video-meta"><span class="coin-badge"><i class="fas fa-eye"></i> ${(v.views||0).toLocaleString()} views</span><span class="video-cat-badge">${v.category||'Video'}</span></div>
          <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;">
            <span style="color:var(--neon-gold);font-size:0.82rem;"><i class="fas fa-coins"></i> ${((v.views||0)*0.001).toFixed(3)} coins</span>
            ${userData.monetized?`<span style="color:var(--success);font-size:0.82rem;">৳${((v.views||0)*0.001*(cfg.coinToBDT||0.01)).toFixed(6)}</span>`:'<span style="color:#666;font-size:0.78rem;">Monetize to earn BDT</span>'}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button class="btn btn-sm btn-outline" onclick="ChannelSystem.openChannel('${u.id}')"><i class="fas fa-external-link-alt"></i> Channel</button>
            <button class="btn btn-sm btn-danger" onclick="VideoSystem.deleteMyVideo('${v.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    });
  },

  startVideoFlow: async (videoId) => {
    const cfg = _appConfig;
    // Fetch video to determine type
    const videos = await FDB.getVideos();
    const video  = videos.find(v => v.id === videoId);
    if (!video) return UI.toast('Video not found', 'error');
    if (cfg.videoAdEnabled && cfg.videoAdCode) {
      VideoSystem._pendingVideoId = videoId;
      const isShorts  = VideoSystem.isShorts(video);
      const skipAfter = isShorts ? (cfg.shortsAdSkip||5) : (cfg.longAdSkip||10);
      VideoSystem._showAd(cfg.videoAdCode, skipAfter);
    } else {
      VideoSystem.openPlayer(videoId);
    }
  },

  _showAd: (adCode, skipAfter) => {
    const overlay=document.getElementById('videoAdOverlay');
    const content=document.getElementById('videoAdContent');
    const skipBtn=document.getElementById('adSkipBtn');
    const fill=document.getElementById('adCountdownFill');
    const text=document.getElementById('adCountdownText');
    if(!overlay||!content){VideoSystem.skipAd();return;}
    content.innerHTML=adCode;
    skipBtn.classList.add('hidden');
    overlay.classList.remove('hidden');
    let left=skipAfter;
    text.innerText=left+'s'; fill.style.width='100%';
    VideoSystem._adTimer=setInterval(()=>{
      left--; text.innerText=left+'s'; fill.style.width=((left/skipAfter)*100)+'%';
      if(left<=0){clearInterval(VideoSystem._adTimer);skipBtn.classList.remove('hidden');fill.style.width='0%';}
    },1000);
  },

  // Mid-roll ad during video playback
  _showMidRollAd: (cfg, isShorts) => {
    const adCode    = cfg.videoAdCode;
    const skipAfter = isShorts ? (cfg.shortsAdSkip||5) : (cfg.longAdSkip||10);
    if (!adCode) return;
    // Pause the timer
    clearInterval(VideoSystem._timer);
    VideoSystem._showAd(adCode, skipAfter);
    // After ad skip, resume timer
    VideoSystem._pendingVideoId = null;
    VideoSystem._adResumeCallback = () => VideoSystem._resumeTimer();
  },

  _resumeTimer: () => {
    const video = VideoSystem._currentVideo; if (!video) return;
    VideoSystem._timer = setInterval(() => {
      VideoSystem._elapsed++;
      const p=Math.min(100,Math.round((VideoSystem._elapsed/(video.watchDuration||15))*100));
      const fill=document.getElementById('vpProgressFill'); if(fill) fill.style.width=p+'%';
      const pct=document.getElementById('vpProgressText'); if(pct) pct.innerText=p+'%';
      const el=document.getElementById('vpTimeElapsed'); if(el) el.innerText=VideoSystem._elapsed+'s';
      // Check for mid-roll ad
      const cfg=_appConfig;
      const isShorts=VideoSystem.isShorts(video);
      const interval=isShorts?(cfg.shortsAdInterval||60):(cfg.longAdInterval||300);
      if(cfg.videoAdEnabled&&cfg.videoAdCode&&VideoSystem._elapsed>0&&VideoSystem._elapsed%interval===0){
        VideoSystem._showMidRollAd(cfg,isShorts);
        return;
      }
      if(VideoSystem._elapsed>=(video.watchDuration||15)&&!VideoSystem._claimed){
        clearInterval(VideoSystem._timer);
        const claimBtn=document.getElementById('vpClaimBtn'); if(claimBtn) claimBtn.classList.remove('hidden');
        const watchMsg=document.getElementById('vpWatchMsg'); if(watchMsg) watchMsg.style.display='none';
        if(fill) fill.style.background='linear-gradient(90deg,#00cc66,#00ff88)';
        UI.toast('Done! Claim your view.','success');
      }
    },1000);
  },

  skipAd: () => {
    clearInterval(VideoSystem._adTimer);
    const ov=document.getElementById('videoAdOverlay'); if(ov) ov.classList.add('hidden');
    if(VideoSystem._adResumeCallback){
      VideoSystem._adResumeCallback();
      VideoSystem._adResumeCallback=null;
    } else if(VideoSystem._pendingVideoId){
      VideoSystem.openPlayer(VideoSystem._pendingVideoId);
      VideoSystem._pendingVideoId=null;
    }
  },

  openPlayer: async (videoId) => {
    const u=Session.current(); if(!u) return;
    Loading.show('Loading video...');
    const [userData,videos]=await Promise.all([FDB.getUser(u.id),FDB.getVideos()]);
    const video=videos.find(v=>v.id===videoId);
    Loading.hide();
    if(!video) return UI.toast('Video not found','error');
    const today=new Date().toDateString();
    if((userData.videoHistory||[]).find(h=>h.vid===videoId&&new Date(h.watchedAt).toDateString()===today))
      return UI.toast('Already watched today! Come back tomorrow.','warning');
    const isLocal=!!video.videoData;
    const ytId=isLocal?null:VideoSystem.extractYTId(video.url||'');
    if(!isLocal&&!ytId) return UI.toast('Invalid video','error');
    VideoSystem._currentVideo=video; VideoSystem._elapsed=0; VideoSystem._claimed=false;
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
    set('vpTitle',video.title); set('vpReward','Creator earns 0.001 coin from your view');
    const claimBtn=document.getElementById('vpClaimBtn'); if(claimBtn) claimBtn.classList.add('hidden');
    const watchMsg=document.getElementById('vpWatchMsg'); if(watchMsg){watchMsg.style.display='block';watchMsg.innerText='Keep watching to support the creator...';}
    const fill=document.getElementById('vpProgressFill'); if(fill){fill.style.width='0%';fill.style.background='';}
    const pct=document.getElementById('vpProgressText'); if(pct) pct.innerText='0%';
    set('vpTimeElapsed','0s'); set('vpTimeNeeded',(video.watchDuration||15)+'s');
    if(isLocal){
      const ic=document.querySelector('.video-iframe-container');
      if(ic) ic.innerHTML='<video id="vpLocalVideo" src="'+video.videoData+'" controls autoplay style="position:absolute;inset:0;width:100%;height:100%;background:#000;"></video>';
    } else {
      const frame=document.getElementById('vpFrame'); if(frame) frame.src='https://www.youtube.com/embed/'+ytId+'?autoplay=1&rel=0&modestbranding=1';
    }
    document.getElementById('videoOverlay').classList.remove('hidden');
    VideoSystem._resumeTimer();
  },

  closePlayer: () => {
    clearInterval(VideoSystem._timer);
    const frame=document.getElementById('vpFrame'); if(frame) frame.src='';
    const ic=document.querySelector('.video-iframe-container');
    if(ic&&!ic.querySelector('iframe')) ic.innerHTML='<iframe id="vpFrame" src="" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    document.getElementById('videoOverlay').classList.add('hidden');
    VideoSystem._currentVideo=null; VideoSystem._elapsed=0; VideoSystem._claimed=false;
  },

  claimReward: async () => {
    if(VideoSystem._claimed) return;
    const video=VideoSystem._currentVideo; if(!video) return;
    VideoSystem._claimed=true;
    const u=Session.current(); if(!u) return;
    Loading.show('Registering view...');
    try {
      const userData=await FDB.getUser(u.id);
      const hist=userData.videoHistory||[];
      hist.push({vid:video.id,title:video.title,reward:0,watchedAt:new Date().toISOString()});
      await FDB.updateUser(u.id,{videoHistory:hist});
      await FDB.update('videos/'+video.id,{views:(video.views||0)+1});
      if(video.uploaderId&&video.uploaderId!==u.id){
        const uploader=await FDB.getUser(video.uploaderId);
        if(uploader){
          const cfg=_appConfig; const vc=cfg.viewCoinRate||0.001;
          const updates={coins:(uploader.coins||0)+vc, totalVideoViews:(uploader.totalVideoViews||0)+1};
          if(uploader.monetized){ updates.balance=(uploader.balance||0)+vc*(cfg.coinToBDT||0.01); updates.videoEarnings=(uploader.videoEarnings||0)+vc*(cfg.coinToBDT||0.01); }
          await FDB.updateUser(video.uploaderId,updates);
        }
      }
      Loading.hide(); VideoSystem.closePlayer();
      UI.toast('View registered! Creator earned 0.001 coin.','success');
    } catch(e){ Loading.hide(); VideoSystem.closePlayer(); UI.toast('View registered!','success'); }
  },

  submitVideo: async () => {
    const fileInput=document.getElementById('uVFile');
    const title=document.getElementById('uVTitle').value.trim();
    const category=document.getElementById('uVCategory').value;
    const u=Session.current(); if(!u) return;
    if(!title) return UI.toast('Please enter a video title','warning');
    if(!fileInput||!fileInput.files||!fileInput.files[0]) return UI.toast('Please select a video file','warning');
    const file=fileInput.files[0];
    if(file.size>100*1024*1024) return UI.toast('File too large! Max 100MB.','error');
    if(!file.type.startsWith('video/')) return UI.toast('Please select a valid video file.','error');
    const submitBtn=document.getElementById('uploadSubmitBtn');
    if(submitBtn){submitBtn.disabled=true;submitBtn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Uploading...';}
    const reader=new FileReader();
    reader.onload=(e)=>{
      const videoEl=document.createElement('video');
      videoEl.src=e.target.result; videoEl.currentTime=1;
      videoEl.onloadeddata=async()=>{
        const canvas=document.createElement('canvas'); canvas.width=320; canvas.height=180;
        canvas.getContext('2d').drawImage(videoEl,0,0,320,180);
        const thumb=canvas.toDataURL('image/jpeg',0.7);
        Loading.show('Saving video...');
        try{
          await FDB.saveVideo({id:'v_'+Date.now(),title,category,uploaderId:u.id,uploaderName:Session.current()?.username||'',videoData:e.target.result,thumbnail:thumb,watchDuration:15,views:0,addedAt:new Date().toISOString()});
          Loading.hide();
          if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Video';}
          document.getElementById('uVTitle').value=''; fileInput.value='';
          document.getElementById('uploadPreview').classList.add('hidden');
          VideoSystem.switchTab('myvideos');
          UI.toast('Video uploaded! 🎉','success');
        }catch(err){
          Loading.hide();
          if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Video';}
          UI.toast('Upload failed. Try again.','error');
        }
      };
      videoEl.onerror=()=>{if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Video';}UI.toast('Error reading video.','error');};
    };
    reader.onerror=()=>{if(submitBtn){submitBtn.disabled=false;submitBtn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Video';}UI.toast('Error reading file.','error');};
    reader.readAsDataURL(file);
  },

  previewFile: (input) => {
    const preview=document.getElementById('uploadPreview');
    if(!input.files||!input.files[0]){if(preview)preview.classList.add('hidden');return;}
    const file=input.files[0];
    if(!file.type.startsWith('video/')){UI.toast('Please select a video file','warning');return;}
    const previewVid=document.getElementById('previewVidEl');
    if(previewVid){previewVid.src=URL.createObjectURL(file);preview.classList.remove('hidden');}
    const sizeEl=document.getElementById('uploadFileInfo');
    if(sizeEl) sizeEl.innerText=file.name+' — '+(file.size/1024/1024).toFixed(1)+'MB';
  },

  deleteMyVideo: async (videoId) => {
    if(!confirm('Delete this video?')) return;
    Loading.show('Deleting...');
    await FDB.deleteVideo(videoId); Loading.hide();
    VideoSystem.renderMyVideos(); UI.toast('Video deleted','info');
  }
};

/* ============================================================
   SUBSCRIBE SYSTEM
   ============================================================ */
const SubSystem = {
  subscribe: async (targetUserId) => {
    const me=Session.current(); if(!me) return;
    if(me.id===targetUserId) return UI.toast('Cannot subscribe to yourself','warning');
    const meData=await FDB.getUser(me.id);
    const subs=meData.subscriptions||[];
    const already=subs.includes(targetUserId);
    if(already){
      await FDB.updateUser(me.id,{subscriptions:subs.filter(id=>id!==targetUserId)});
      UI.toast('Unsubscribed','info');
    } else {
      subs.push(targetUserId);
      await FDB.updateUser(me.id,{subscriptions:subs});
      UI.toast('Subscribed! 🔔','success');
    }
    ChannelSystem.renderChannel(targetUserId);
  },
  getCount: async (userId) => {
    const all=await FDB.getAllUsers();
    return all.filter(u=>(u.subscriptions||[]).includes(userId)).length;
  }
};

/* ============================================================
   CHANNEL SYSTEM
   ============================================================ */
const ChannelSystem = {
  _currentChannelId: null,

  openChannel: async (userId) => {
    ChannelSystem._currentChannelId = userId;
    document.querySelectorAll('.page-section').forEach(el=>el.classList.add('hidden'));
    document.getElementById('page-channel').classList.remove('hidden');
    document.getElementById('mainNav').classList.remove('hidden');
    window.scrollTo(0,0);
    // Show edit bar only to owner
    const me = Session.current();
    const editBar = document.getElementById('channelEditBar');
    if (editBar) editBar.classList.toggle('hidden', !(me && me.id === userId));
    ChannelSystem.renderChannel(userId);
  },

  saveChannelInfo: async () => {
    const desc   = document.getElementById('channelDescInput').value.trim();
    const banner = document.getElementById('channelBannerInput').value.trim();
    const u = Session.current(); if (!u) return;
    Loading.show('Saving...');
    await FDB.updateUser(u.id, { channelDesc: desc, channelBanner: banner });
    _currentUser = { ..._currentUser, channelDesc: desc, channelBanner: banner };
    Session.set(_currentUser);
    Loading.hide();
    UI.toast('Channel info saved!', 'success');
    ChannelSystem.renderChannel(u.id);
  },

  renderChannel: async (userId) => {
    const me=Session.current();
    Loading.show('Loading channel...');
    const [user,subCount,allVids]=await Promise.all([FDB.getUser(userId),SubSystem.getCount(userId),FDB.getVideos()]);
    const meData=me?await FDB.getUser(me.id):null;
    Loading.hide();
    if(!user) return;
    const isSub=meData?(meData.subscriptions||[]).includes(userId):false;
    const isMe=me&&me.id===userId;
    const userVids=allVids.filter(v=>v.uploaderId===userId);
    const bannerStyle=user.channelBanner?`background-image:url(${user.channelBanner});background-size:cover;background-position:center;`:'background:linear-gradient(135deg,#0a0a1a,#1a1a3e,#0a2a1a);';
    // Fill edit bar with current values
    if (isMe) {
      const di = document.getElementById('channelDescInput');   if (di) di.value = user.channelDesc || '';
      const bi = document.getElementById('channelBannerInput'); if (bi) bi.value = user.channelBanner || '';
    }
    const hdr=document.getElementById('channelHeader');
    if(hdr) hdr.innerHTML=`
      <div class="channel-banner" style="${bannerStyle}"></div>
      <div class="channel-info-row">
        <img src="${user.avatar}" class="channel-avatar">
        <div class="channel-meta">
          <h2>${user.displayName||user.username} ${user.monetized?'<span class="monetized-badge">💰 Monetized</span>':''}</h2>
          ${user.channelDesc?`<p style="color:#aaa;font-size:0.82rem;margin:4px 0;">${user.channelDesc}</p>`:''}
          <div class="channel-stats-row">
            <span><b>${subCount.toLocaleString()}</b> Subscribers</span>
            <span><b>${userVids.length}</b> Videos</span>
            <span><b>${(user.totalVideoViews||0).toLocaleString()}</b> Views</span>
          </div>
          ${!isMe?`<button class="btn ${isSub?'btn-outline':''} channel-sub-btn" onclick="SubSystem.subscribe('${userId}')"><i class="fas fa-${isSub?'bell-slash':'bell'}"></i> ${isSub?'Subscribed':'Subscribe'}</button>`:`<button class="btn btn-sm btn-outline" onclick="Router.go('profile')"><i class="fas fa-cog"></i> Edit Profile</button>`}
        </div>
      </div>`;
    const vl=document.getElementById('channelVideoList'); if(!vl) return;
    if(!userVids.length){vl.innerHTML='<p style="color:#aaa;text-align:center;padding:30px;">No videos uploaded yet.</p>';return;}
    const today=new Date().toDateString(); vl.innerHTML='';
    userVids.forEach(v=>{
      const watched=meData?!!((meData.videoHistory||[]).find(h=>h.vid===v.id&&new Date(h.watchedAt).toDateString()===today)):false;
      vl.innerHTML+=`<div class="video-card glass">
        <div class="video-thumb-wrap" onclick="VideoSystem.startVideoFlow('${v.id}')">
          ${v.thumbnail?`<img src="${v.thumbnail}" class="video-thumb">`:'<div class="video-thumb" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1a2e;"><i class="fas fa-play-circle" style="font-size:3rem;color:#444;"></i></div>'}
          <div class="video-play-icon ${watched?'video-watched':''}"><i class="fas fa-${watched?'check-circle':'play'}"></i></div>
        </div>
        <div class="video-card-info">
          <h4 class="video-title">${v.title}</h4>
          <div class="video-meta"><span class="coin-badge"><i class="fas fa-eye"></i> ${(v.views||0).toLocaleString()}</span>${v.category?'<span class="video-cat-badge">'+v.category+'</span>':''}</div>
          ${!watched?`<button class="btn btn-sm video-watch-btn" onclick="VideoSystem.startVideoFlow('${v.id}')"><i class="fas fa-play"></i> Watch</button>`:'<div class="video-done-badge"><i class="fas fa-check"></i> Watched Today</div>'}
        </div>
      </div>`;
    });
  }
};

/* ============================================================
   MONETIZATION SYSTEM
   ============================================================ */
const MonetizeSystem = {
  renderMonetizeTab: async () => {
    const el=document.getElementById('monetizeContent'); if(!el) return;
    const u=Session.current();
    if(!u||!u.id){el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px;">Please log in first.</p>';return;}
    el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';
    let userData;
    try{userData=await FDB.getUser(u.id);}catch(e){el.innerHTML='<p style="color:#f66;text-align:center;padding:30px;">Failed to load. Try again.</p>';return;}
    if(!userData){el.innerHTML='<p style="color:#aaa;text-align:center;padding:30px;">User not found.</p>';return;}
    const coins=userData.coins||0; const isMonetized=userData.monetized===true; const hasPending=userData.monetizeStatus==='Pending';
    el.innerHTML=`
      <div class="glass monetize-hero">
        <div class="monetize-icon">${isMonetized?'💰':'🚀'}</div>
        <h2>${isMonetized?'You are Monetized!':'Unlock Monetization'}</h2>
        <p style="color:#aaa;font-size:0.85rem;">${isMonetized?'Your videos earn real BDT from every view!':'Reach 1,000,000 coins to apply'}</p>
      </div>
      ${!isMonetized?`<div class="glass"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="color:#aaa;font-size:0.85rem;">Progress to Monetization</span><span style="color:var(--neon-gold);font-weight:bold;">${coins.toLocaleString()} / 1,000,000</span></div><div class="monetize-progress-bar"><div style="width:${Math.min(100,(coins/1000000*100))}%"></div></div><p style="color:#aaa;font-size:0.82rem;margin-top:8px;text-align:center;">${coins>=1000000?'✅ Eligible! Apply now.':'Need '+(1000000-coins).toLocaleString()+' more coins'}</p></div>`:''}
      <div class="glass monetize-benefits">
        <h3 style="margin-bottom:12px;">💎 Benefits</h3>
        <div class="benefit-item ${isMonetized?'active':''}"><i class="fas fa-coins"></i><div><b>Coin Earnings</b><small>0.001 coins per view — always active</small></div></div>
        <div class="benefit-item ${isMonetized?'active':'locked'}"><i class="fas fa-${isMonetized?'check-circle':'lock'}"></i><div><b>BDT Earnings from Views</b><small>${isMonetized?'Active!':'Unlocks after approval'}</small></div></div>
        <div class="benefit-item ${isMonetized?'active':'locked'}"><i class="fas fa-${isMonetized?'check-circle':'lock'}"></i><div><b>BDT Withdrawals</b><small>${isMonetized?'Enabled!':'Only monetized users can withdraw'}</small></div></div>
        <div class="benefit-item ${isMonetized?'active':'locked'}"><i class="fas fa-${isMonetized?'check-circle':'lock'}"></i><div><b>Creator Badge</b><small>${isMonetized?'Shown on your channel!':'Badge on your channel page'}</small></div></div>
      </div>
      ${!isMonetized&&!hasPending?`<div style="padding:0 0 15px;"><button class="btn btn-success" onclick="MonetizeSystem.apply()" ${coins<1000000?'disabled style="opacity:0.5;"':''}><i class="fas fa-paper-plane"></i> Apply for Monetization</button></div>`:''}
      ${hasPending?`<div class="glass" style="text-align:center;padding:20px;color:var(--neon-gold);"><i class="fas fa-clock" style="font-size:2rem;display:block;margin-bottom:10px;"></i><b>Application Under Review</b><p style="color:#aaa;font-size:0.85rem;margin-top:5px;">Admin will review within 48 hours.</p></div>`:''}
      ${isMonetized?`<div class="glass monetize-stats"><h3 style="margin-bottom:12px;">📊 Video Earnings</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="monetize-stat-box"><i class="fas fa-eye" style="color:var(--neon-cyan);"></i><h3>${(userData.totalVideoViews||0).toLocaleString()}</h3><small>Total Views</small></div><div class="monetize-stat-box"><i class="fas fa-coins" style="color:gold;"></i><h3>${((userData.totalVideoViews||0)*0.001).toFixed(3)}</h3><small>Coins from Views</small></div><div class="monetize-stat-box"><i class="fas fa-money-bill" style="color:var(--neon-gold);"></i><h3>৳${(userData.videoEarnings||0).toFixed(4)}</h3><small>BDT from Views</small></div><div class="monetize-stat-box"><i class="fas fa-video" style="color:var(--neon-purple);"></i><h3 id="myVidCount">--</h3><small>My Videos</small></div></div></div>`:''}`;
    if(isMonetized) FDB.getVideos().then(vids=>{const e=document.getElementById('myVidCount');if(e)e.innerText=vids.filter(v=>v.uploaderId===u.id).length;});
  },

  apply: async () => {
    const u=Session.current(); if(!u) return;
    const userData=await FDB.getUser(u.id);
    if((userData.coins||0)<1000000) return UI.toast('You need 1,000,000 coins to apply!','error');
    await FDB.updateUser(u.id,{monetizeStatus:'Pending'});
    MonetizeSystem.renderMonetizeTab();
    UI.toast('Application submitted!','success');
  }
};

/* ============================================================
   ADMIN PANEL
   ============================================================ */
const Admin = {
  init: async () => {
    if(sessionStorage.getItem('isAdmin')!=='true'){Router.go('auth');return;}
    Admin.renderOverview(); Admin.renderTab('overview');
    const cfg=await FDB.getConfig();
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
    const sc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v;};
    set('admCooldown',cfg.gameCooldown||24); set('admSpinCost',cfg.spinCost||50);
    set('admScratchCost',cfg.scratchCost||20); set('admSlotCost',cfg.slotCost||100);
    set('admMinWithdraw',cfg.minWithdraw||200); set('admCoinRate',cfg.coinToBDT||0.01);
    set('admRefBonus',cfg.referralBonus||500); set('admRefReq',cfg.referralTasksReq||3);
    set('admAdCode',cfg.adCode||'');
    sc('admMaintenance',!!cfg.maintenanceMode);
    sc('admVideoAdEnabled',!!cfg.videoAdEnabled);
    set('admVideoAdCode',cfg.videoAdCode||'');
    set('admShortsAdInterval',cfg.shortsAdInterval||60);
    set('admLongAdInterval',cfg.longAdInterval||300);
    set('admShortsAdSkip',cfg.shortsAdSkip||5);
    set('admLongAdSkip',cfg.longAdSkip||10);
  },

  renderTab: (tab) => {
    document.querySelectorAll('.admin-tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c=>c.classList.add('hidden'));
    const btn=document.getElementById('tab-btn-'+tab); const content=document.getElementById('tab-'+tab);
    if(btn) btn.classList.add('active'); if(content) content.classList.remove('hidden');
  },

  renderOverview: async () => {
    const [users,withdrawals]=await Promise.all([FDB.getAllUsers(),FDB.getWithdrawals()]);
    const today=new Date().toDateString();
    const totalPaid=withdrawals.filter(w=>w.status==='Approved').reduce((s,w)=>s+w.amt,0);
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
    set('admTotalUsers',users.length); set('admPending',withdrawals.filter(w=>w.status==='Pending').length);
    set('admApproved',withdrawals.filter(w=>w.status==='Approved').length); set('admTotalPaid','৳'+totalPaid.toFixed(2));
    set('admBanned',users.filter(u=>u.isBanned).length); set('admNewToday',users.filter(u=>new Date(u.joinedAt).toDateString()===today).length);
  },

  renderWithdrawals: async (filter) => {
    filter=filter||'all';
    const l=document.getElementById('admWithdrawList'); if(!l) return;
    l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px;">Loading...</p>';
    const all=await FDB.getWithdrawals();
    let list=[...all].reverse(); if(filter!=='all') list=list.filter(w=>w.status===filter);
    if(!list.length){l.innerHTML='<p style="color:#aaa;text-align:center;padding:20px;">No withdrawals found.</p>';return;}
    const icons={bKash:'📱',Nagad:'🟠',Rocket:'🚀','DBBL Mobile':'🏦'};
    l.innerHTML='';
    list.forEach(w=>{
      const sc=w.status==='Approved'?'status-approved':w.status==='Rejected'?'status-rejected':'status-pending';
      l.innerHTML+=`<div class="admin-withdraw-card"><div class="admin-withdraw-info"><b>${icons[w.method]||'💸'} ${w.username}</b><span style="color:#aaa;">${w.method} &bull; ${w.number}</span><span style="color:var(--neon-gold);font-size:1.1rem;">৳${w.amt.toFixed(2)}</span>${w.coinsDeducted?`<small style="color:#888;">-${w.coinsDeducted.toLocaleString()} coins deducted</small>`:''}<small style="color:#666;">${new Date(w.id).toLocaleString('en-BD')}</small></div><div class="admin-withdraw-actions"><span class="status-badge ${sc}">${w.status}</span>${w.status==='Pending'?`<button class="btn btn-sm btn-success" onclick="Admin.processWithdraw(${w.id},'Approved')">✅ Approve</button><button class="btn btn-sm btn-danger" onclick="Admin.processWithdraw(${w.id},'Rejected')">❌ Reject</button>`:''}</div></div>`;
    });
  },

  processWithdraw: async (wId, status) => {
    Loading.show('Processing...');
    const all=await FDB.getWithdrawals(); const w=all.find(x=>x.id===wId);
    if(!w){Loading.hide();return;}
    if(status==='Rejected'&&w.status==='Pending'){
      const user=await FDB.getUser(w.userId);
      if(user){
        const restore={balance:(user.balance||0)+w.amt};
        if(w.coinsDeducted) restore.coins=(user.coins||0)+w.coinsDeducted;
        await FDB.updateUser(w.userId,restore);
      }
    }
    await FDB.updateWithdrawalByWId(wId,{status,processedAt:new Date().toISOString()});
    Loading.hide(); Admin.renderWithdrawals('all'); Admin.renderOverview();
    UI.toast('Withdrawal '+status,'success');
  },

  renderUsers: async (search) => {
    search=search||'';
    const l=document.getElementById('admUserList'); if(!l) return;
    l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px;">Loading...</p>';
    let users=await FDB.getAllUsers();
    if(search) users=users.filter(u=>u.username.toLowerCase().includes(search.toLowerCase())||(u.mobile||'').includes(search));
    if(!users.length){l.innerHTML='<p style="color:#aaa;text-align:center;padding:20px;">No users found.</p>';return;}
    l.innerHTML='';
    users.forEach(u=>{
      l.innerHTML+=`<div class="admin-user-card"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--neon-cyan);"><div style="flex-grow:1;margin-left:10px;"><b>${u.displayName||u.username}${u.isBanned?' <span style="color:red;">[BANNED]</span>':''}${u.monetized?' <span style="color:gold;">💰</span>':''}</b><small style="color:#aaa;display:block;">📱 ${u.mobile} &bull; @${u.username} &bull; ${new Date(u.joinedAt).toLocaleDateString('en-BD')}</small><small style="color:#888;">Tasks: ${u.tasksCompleted||0} | Coins: ${(u.coins||0).toLocaleString()} | ৳${(u.balance||0).toFixed(2)}</small></div><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;"><button class="btn btn-sm ${u.isBanned?'btn-success':'btn-danger'}" onclick="Admin.toggleBan('${u.id}')">${u.isBanned?'Unban':'Ban'}</button><button class="btn btn-sm btn-outline" onclick="Admin.editBalance('${u.id}')">Edit ৳</button></div></div>`;
    });
  },

  editBalance: async (uid) => {
    const u=await FDB.getUser(uid); if(!u) return;
    const val=prompt('Edit balance for '+(u.displayName||u.username)+'\nCurrent: ৳'+(u.balance||0).toFixed(2)+'\nEnter new balance:');
    if(val===null) return;
    const num=parseFloat(val); if(isNaN(num)||num<0) return UI.toast('Invalid amount','error');
    await FDB.updateUser(uid,{balance:num}); Admin.renderUsers(); UI.toast('Balance updated','success');
  },

  toggleBan: async (id) => {
    const u=await FDB.getUser(id); if(!u) return;
    await FDB.updateUser(id,{isBanned:!u.isBanned}); Admin.renderUsers(); Admin.renderOverview();
    UI.toast((u.isBanned?'User unbanned: ':'User banned: ')+(u.displayName||u.username),u.isBanned?'success':'warning');
  },

  renderTasks: async () => {
    const l=document.getElementById('admTaskList'); if(!l) return;
    const tasks=await FDB.getTasks();
    if(!tasks.length){l.innerHTML='<p style="color:#aaa;text-align:center;padding:10px;">No tasks yet.</p>';return;}
    l.innerHTML='';
    tasks.forEach(t=>{
      l.innerHTML+=`<div class="admin-task-item"><img src="${t.icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" style="width:35px;height:35px;border-radius:8px;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'"><div style="flex-grow:1;margin-left:10px;"><b>${t.title}</b><small style="color:#aaa;display:block;">Reward: ${t.reward} Coins</small></div><button class="btn btn-sm btn-danger" onclick="Admin.delTask('${t.id}')">🗑️</button></div>`;
    });
  },

  addTask: async () => {
    const title=document.getElementById('admTTitle').value.trim();
    const reward=parseInt(document.getElementById('admTReward').value);
    const link=document.getElementById('admTLink').value.trim();
    const icon=document.getElementById('admTIcon').value.trim();
    if(!title) return UI.toast('Task title required','warning');
    if(!reward||reward<1) return UI.toast('Valid reward required','warning');
    await FDB.write('tasks/t_'+Date.now(),{id:'t_'+Date.now(),title,reward,type:'link',icon:icon||'https://cdn-icons-png.flaticon.com/512/149/149071.png',link:link||'#'});
    ['admTTitle','admTReward','admTLink','admTIcon'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    Admin.renderTasks(); UI.toast('Task created!','success');
  },

  delTask: async (taskId) => {
    if(!confirm('Delete this task?')) return;
    await FDB.remove('tasks/'+taskId); Admin.renderTasks(); UI.toast('Task deleted','info');
  },

  saveConfig: async () => {
    const gn=(id,def)=>{const e=document.getElementById(id);return e?(parseFloat(e.value)||def):def;};
    const updates={gameCooldown:gn('admCooldown',24),spinCost:gn('admSpinCost',50),scratchCost:gn('admScratchCost',20),slotCost:gn('admSlotCost',100),minWithdraw:gn('admMinWithdraw',200),coinToBDT:gn('admCoinRate',0.01),referralBonus:gn('admRefBonus',500),referralTasksReq:gn('admRefReq',3)};
    const adEl=document.getElementById('admAdCode'); if(adEl) updates.adCode=adEl.value;
    const mEl=document.getElementById('admMaintenance'); if(mEl) updates.maintenanceMode=mEl.checked;
    await FDB.update('config',updates); _appConfig={..._appConfig,...updates};
    UI.toast('Configuration saved!','success');
  },

  exportUsers: async () => {
    const users=await FDB.getAllUsers();
    const csv=['Username,Mobile,Balance,Coins,Tasks,Joined,Banned,Monetized'].concat(users.map(u=>u.username+','+u.mobile+','+(u.balance||0).toFixed(2)+','+(u.coins||0)+','+(u.tasksCompleted||0)+','+new Date(u.joinedAt).toLocaleDateString()+','+u.isBanned+','+(u.monetized||false))).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv,'+encodeURIComponent(csv); a.download='taskmint_users.csv'; a.click();
    UI.toast('Users exported!','success');
  },

  clearAllData: async () => {
    if(!confirm('This will DELETE ALL DATA. Are you sure?')) return;
    if(prompt('Type RESET to confirm:')!=='RESET') return;
    await Promise.all([FDB.write('users',null),FDB.write('withdrawals',null),FDB.write('videos',null),FDB.write('tasks',null)]);
    UI.toast('All data cleared. Refreshing...','info');
    setTimeout(()=>location.reload(),1500);
  },

  renderVideos: async () => {
    const l=document.getElementById('admVideoList'); const ce=document.getElementById('admVideoCount'); if(!l) return;
    const videos=await FDB.getVideos();
    if(ce) ce.innerText=videos.length+' video'+(videos.length!==1?'s':'');
    if(!videos.length){l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px;">No videos yet.</p>';return;}
    l.innerHTML='';
    videos.forEach(v=>{
      const ytId=VideoSystem.extractYTId(v.url||''); const thumb=v.thumbnail||(ytId?'https://img.youtube.com/vi/'+ytId+'/mqdefault.jpg':'');
      const isShorts=VideoSystem.isShorts(v);
      l.innerHTML+=`<div class="admin-video-item"><img src="${thumb}" style="width:80px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.background='#1a1a2e'"><div style="flex-grow:1;margin-left:10px;min-width:0;"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.title} ${isShorts?'<span style="color:#ff0060;font-size:0.7rem;">⚡Shorts</span>':''}</b><small style="color:#aaa;">${v.uploaderId?'👤 '+v.uploaderName:'Admin'} &bull; 👁 ${(v.views||0).toLocaleString()}</small></div><button class="btn btn-sm btn-danger" onclick="Admin.delVideo('${v.id}')" style="flex-shrink:0;margin-left:8px;">🗑️</button></div>`;
    });
  },

  addVideo: async () => {
    const title=document.getElementById('admVTitle').value.trim(); const url=document.getElementById('admVUrl').value.trim();
    const reward=parseInt(document.getElementById('admVReward').value)||50; const duration=parseInt(document.getElementById('admVDuration').value)||30;
    const thumb=document.getElementById('admVThumb').value.trim();
    if(!title) return UI.toast('Video title required','warning'); if(!url) return UI.toast('YouTube URL required','warning');
    const ytId=VideoSystem.extractYTId(url); if(!ytId) return UI.toast('Invalid YouTube URL','error');
    await FDB.saveVideo({id:'v_'+Date.now(),title,url:ytId,reward,watchDuration:duration,thumbnail:thumb,views:0,addedAt:new Date().toISOString()});
    ['admVTitle','admVUrl','admVReward','admVDuration','admVThumb'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    Admin.renderVideos(); UI.toast('Video added!','success');
  },

  delVideo: async (id) => {
    if(!confirm('Delete this video?')) return;
    await FDB.deleteVideo(id); Admin.renderVideos(); UI.toast('Video deleted','info');
  },

  saveVideoAdConfig: async () => {
    const gn=(id,def)=>{const e=document.getElementById(id);return e?(parseInt(e.value)||def):def;};
    const en=document.getElementById('admVideoAdEnabled'); const code=document.getElementById('admVideoAdCode');
    const updates={
      videoAdEnabled:en?en.checked:false,
      videoAdCode:code?code.value:'',
      shortsAdInterval:gn('admShortsAdInterval',60),
      longAdInterval:gn('admLongAdInterval',300),
      shortsAdSkip:gn('admShortsAdSkip',5),
      longAdSkip:gn('admLongAdSkip',10)
    };
    await FDB.update('config',updates); _appConfig={..._appConfig,...updates};
    UI.toast('Video ad settings saved!','success');
  },

  renderMonetizations: async () => {
    const l=document.getElementById('admMonetizeList'); if(!l) return;
    const users=await FDB.getAllUsers();
    const pending=users.filter(u=>u.monetizeStatus==='Pending'); const approved=users.filter(u=>u.monetized===true);
    if(!pending.length&&!approved.length){l.innerHTML='<p style="color:#aaa;text-align:center;padding:15px;">No monetization requests.</p>';return;}
    l.innerHTML='';
    pending.forEach(u=>{
      l.innerHTML+=`<div class="admin-user-card"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%;border:2px solid gold;"><div style="flex-grow:1;margin-left:10px;"><b>${u.displayName||u.username} <span style="color:gold;font-size:0.8rem;">[PENDING]</span></b><small style="color:#aaa;display:block;">Coins: ${(u.coins||0).toLocaleString()}</small></div><div style="display:flex;gap:5px;flex-direction:column;align-items:flex-end;"><button class="btn btn-sm btn-success" onclick="Admin.approveMonetize('${u.id}')">✅ Approve</button><button class="btn btn-sm btn-danger" onclick="Admin.rejectMonetize('${u.id}')">❌ Reject</button></div></div>`;
    });
    if(approved.length){
      l.innerHTML+='<p style="color:var(--neon-gold);margin:10px 0 5px;font-size:0.85rem;">✅ Monetized Creators</p>';
      approved.forEach(u=>{
        l.innerHTML+=`<div class="admin-user-card" style="border:1px solid rgba(255,215,0,0.2);"><img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%;border:2px solid var(--neon-gold);"><div style="flex-grow:1;margin-left:10px;"><b>${u.displayName||u.username} <span class="monetized-badge">💰</span></b><small style="color:#aaa;display:block;">Views: ${(u.totalVideoViews||0).toLocaleString()} &bull; ৳${(u.videoEarnings||0).toFixed(4)}</small></div><button class="btn btn-sm btn-danger btn-outline" onclick="Admin.revokeMonetize('${u.id}')">Revoke</button></div>`;
      });
    }
  },

  approveMonetize: async (uid) => {
    await FDB.updateUser(uid,{monetized:true,monetizeStatus:'Approved'}); Admin.renderMonetizations(); UI.toast('Monetization approved! 💰','success');
  },
  rejectMonetize: async (uid) => {
    await FDB.updateUser(uid,{monetizeStatus:'Rejected'}); Admin.renderMonetizations(); UI.toast('Application rejected','info');
  },
  revokeMonetize: async (uid) => {
    if(!confirm('Revoke monetization?')) return;
    await FDB.updateUser(uid,{monetized:false,monetizeStatus:null}); Admin.renderMonetizations(); UI.toast('Monetization revoked','warning');
  },

  saveUploadReward: async () => {
    const e=document.getElementById('admUploadReward'); if(!e) return;
    await FDB.update('config',{uploadReward:parseInt(e.value)||50}); UI.toast('Upload reward saved!','success');
  }
};

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', Router.init);
