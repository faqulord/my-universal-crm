/* MASTER CRM - UNIVERSAL ENTERPRISE VERSION
   Javítva: 2026.01.18 - Teljes fájl
*/

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

// --- 1. KONFIGURÁCIÓ ÉS AUTH ---
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const BRAND = process.env.BRAND_NAME || 'Master CRM';

// Middleware a védelemhez
const requireAuth = (req, res, next) => {
    // Ha a süti megegyezik a jelszóval, továbbengedjük
    if (req.cookies.token === ADMIN_PASS) {
        next();
    } else {
        res.send(loginHtml());
    }
};

// --- 2. ADATBÁZIS ---
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("MongoDB KAPCSOLAT OK"))
    .catch(err => console.error("MongoDB HIBA:", err));

const Client = mongoose.model('Client', new mongoose.Schema({
    f1: String, f2: String, email: String, d: String,
    status: { type: String, default: 'Aktív' },
    notes: String, amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}));

// --- 3. DINAMIKUS IPARÁG LOGIKA ---
const getConfig = () => {
    const ind = (process.env.INDUSTRY || 'default').trim().toLowerCase();
    const plan = (process.env.PLAN || 'basic').trim().toLowerCase();

    const industries = {
        'szerviz': { 
            f1: 'Tulajdonos', f2: 'Rendszám/Típus', menu: 'Járművek', 
            stats: ['Munkafelvétel', 'Alkatrészre vár', 'Szerelés alatt', 'Kész', 'Kiadva'],
            temps: { 'ready': 'Az autó elkészült', 'wait': 'Alkatrész érkezésére várunk', 'offer': 'Árajánlat javításra' } 
        },
        'tech': { 
            f1: 'Ügyfél neve', f2: 'Eszköz + Hiba', menu: 'Eszközök',
            stats: ['Bevételezve', 'Bevizsgálás', 'Alkatrész rendelés', 'Javítva', 'Tesztelve'],
            temps: { 'done': 'A készülék javítva átvehető', 'diag': 'Bevizsgálás eredménye', 'parts': 'Alkatrész megérkezett' }
        },
        'barber': { 
            f1: 'Vendég neve', f2: 'Szolgáltatás', menu: 'Vendégek',
            stats: ['Időpontot kért', 'Megerősítve', 'Fizetett', 'Nem jelent meg'],
            temps: { 'remind': 'Emlékeztető: Holnap várunk!', 'thx': 'Köszönjük, hogy nálunk jártál', 'promo': 'Régen láttunk, gyere el újra!' }
        },
        'ugyved': { 
            f1: 'Ügyfél neve', f2: 'Ügyszám/Tárgy', menu: 'Akták', 
            stats: ['Aktív', 'Iratra vár', 'Tárgyalás', 'Lezárva'],
            temps: { 'doc': 'Új irat érkezett', 'date': 'Időpont emlékeztető', 'info': 'Tájékoztatás az ügy állásáról' } 
        },
        'broker': { 
            f1: 'Ügyfél', f2: 'Cél', menu: 'Ügyletek',
            stats: ['Érdeklődő', 'Ajánlat kiküldve', 'Szerződéskötés', 'Sikeres zárás'],
            temps: { 'offer': 'Ingatlan ajánlat', 'contract': 'Szerződéstervezet', 'followup': 'Hogy tetszett az ingatlan?' }
        },
        'default': { 
            f1: 'Partner', f2: 'Projekt', menu: 'Ügyfelek', 
            stats: ['Új', 'Folyamatban', 'Kész'],
            temps: { 'update': 'Projekt státuszfrissítés' } 
        }
    };

    const c = industries[ind] || industries['default'];
    return { ...c, plan, isPro: (plan==='pro'||plan==='premium'), isPremium: (plan==='premium'), ind };
};

// --- 4. HTML GENERÁTOROK ---
function loginHtml(error = "") {
    const theme = process.env.THEME_COLOR || '#3b82f6';
    return `<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${BRAND} Login</title>
    <style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;height:100vh;justify-content:center;align-items:center;margin:0}.box{background:#0a0a0a;padding:40px;border:1px solid #333;border-radius:12px;text-align:center;width:300px}input{width:100%;padding:12px;margin:10px 0;background:#111;border:1px solid #333;color:white;border-radius:6px;box-sizing:border-box}button{width:100%;padding:12px;background:${theme};color:white;border:none;font-weight:bold;border-radius:6px;cursor:pointer}.err{color:#ef4444;margin-bottom:10px}</style></head><body>
    <div class="box"><h2 style="margin-top:0">${BRAND}</h2>${error?`<div class="err">${error}</div>`:''}<form action="/login" method="POST"><input type="text" name="username" placeholder="Felhasználó" required><input type="password" name="password" placeholder="Jelszó" required><button type="submit">BELÉPÉS</button></form></div></body></html>`;
}

function appHtml() {
    const conf = getConfig();
    const theme = process.env.THEME_COLOR || '#3b82f6';
    
    return `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${BRAND}</title>
    <style>
        :root { --accent: ${theme}; --bg: #000; --card: #0a0a0a; --sidebar: #050505; --text: #fff; --border: #1f2937; }
        body { font-family: -apple-system, sans-serif; margin: 0; display: flex; height: 100vh; background: var(--bg); color: var(--text); overflow: hidden; }
        .sidebar { width: 260px; background: var(--sidebar); border-right: 1px solid var(--border); padding: 25px; display: flex; flex-direction: column; position: fixed; height: 100%; transition: 0.3s; z-index: 5000; box-sizing: border-box; }
        .nav-item { padding: 15px; cursor: pointer; border-radius: 8px; color: #888; margin-bottom: 8px; font-weight: 600; border: none; background: transparent; text-align: left; width: 100%; font-size: 14px; transition: 0.2s; }
        .nav-item:hover, .nav-item.active { background: var(--accent); color: white; }
        .main { flex: 1; padding: 25px; margin-left: 260px; transition: 0.3s; overflow-y: auto; padding-top: 85px; width: 100%; box-sizing: border-box; }
        @media (max-width: 900px) { .main { margin-left: 0; } .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); } }
        .card { background: var(--card); padding: 20px; border: 1px solid var(--border); margin-bottom: 20px; border-radius: 12px; }
        input, textarea, select { padding: 14px; border: 1px solid var(--border); margin: 6px 0; width: 100%; box-sizing: border-box; border-radius: 6px; font-size: 16px; background: #111; color: #fff; outline: none; }
        input:focus, textarea:focus { border-color: var(--accent); }
        .btn-save { width: 100%; padding: 15px; background: var(--accent); color: white; border: none; font-weight: 800; border-radius: 6px; cursor: pointer; margin-top: 10px; }
        .view-section { display: none; }
        .view-section.active { display: block; }
        table { width: 100%; border-collapse: collapse; min-width: 700px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 15px; border-bottom: 1px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
        .status-pill { padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; display: inline-block; margin-bottom: 8px; border: 1px solid #333; }
        .stat-btn { background: #1a1a1a; color: #aaa; border: 1px solid #333; padding: 6px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; margin-right: 4px; margin-top: 4px; }
        .stat-btn:hover { border-color: var(--accent); color: white; }
        #email-modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; justify-content: center; align-items: center; padding: 20px; }
        .modal-content { background: #0a0a0a; padding: 30px; border-radius: 15px; border: 1px solid var(--border); width: 100%; max-width: 500px; }
    </style>
</head>
<body>
    <div id="email-modal"><div class="modal-content">
        <h3 style="margin-top:0;">✉️ Értesítés</h3>
        <select id="mail-temp" onchange="applyTemp()"><option value="">-- Sablon választása --</option></select>
        <input type="text" id="mail-to" readonly style="color:#777; background:#1a1a1a;"><input type="text" id="mail-sub" placeholder="Tárgy">
        <textarea id="mail-msg" rows="6"></textarea>
        <div style="display:flex; gap:10px; margin-top:10px;"><button onclick="sendMailNow()" class="btn-save">KÜLDÉS</button><button onclick="closeMail()" style="flex:1; background:#222; color:white; border:none; padding:15px; border-radius:6px; cursor:pointer; margin-top:10px;">MÉGSE</button></div>
    </div></div>

    <button onclick="document.getElementById('sidebar').classList.toggle('open')" style="position:fixed; top:15px; left:15px; background:var(--card); border:1px solid var(--border); color:white; padding:10px 15px; z-index:6000; font-weight:800; border-radius:6px; cursor:pointer;">☰</button>

    <div class="sidebar" id="sidebar">
        <h2 style="color:var(--text); margin-bottom:40px; padding-left:10px; border-left:4px solid var(--accent);">${BRAND}</h2>
        <button class="nav-item active" onclick="showView('dash', this)">📊 ÁTTEKINTÉS</button>
        <button class="nav-item" onclick="showView('items', this)">📂 ${conf.menu.toUpperCase()}</button>
        ${conf.isPro ? `<button class="nav-item" onclick="showView('docs', this)">📁 DOKUMENTUMOK</button>` : ''}
        ${conf.isPremium ? `<button class="nav-item" onclick="showView('report', this)">📈 PÉNZÜGYEK</button>` : ''}
        <a href="/logout" style="margin-top:auto; text-decoration:none;"><button class="nav-item" style="color:#ef4444; border:1px solid rgba(239,68,68,0.2);">🔒 KILÉPÉS</button></a>
    </div>

    <div class="main">
        <div id="view-dash" class="view-section active">
            <h1>Áttekintés</h1>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
                <div class="card"><small style="color:#777">ÖSSZES ÜGY</small><h2 id="st-all" style="margin:5px 0 0 0">0</h2></div>
                <div class="card"><small style="color:#777">FOLYAMATBAN</small><h2 id="st-act" style="color:#f59e0b; margin:5px 0 0 0">0</h2></div>
                ${conf.isPremium ? `<div class="card"><small style="color:#777">EZ A HÓNAP</small><h2 id="st-mon" style="color:#10b981; margin:5px 0 0 0">0 Ft</h2></div>` : ''}
            </div>
        </div>

        <div id="view-items" class="view-section">
            <div style="display:flex; justify-content:space-between; align-items:center;"><h1>${conf.menu}</h1></div>
            <div class="card">
                <h3>+ Új felvétele</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" id="f1" placeholder="${conf.f1}">
                    <input type="text" id="f2" placeholder="${conf.f2}">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="email" id="email" placeholder="E-mail">
                    <input type="date" id="d">
                </div>
                ${conf.isPro ? `<textarea id="notes" placeholder="Jegyzet..."></textarea>` : ''}
                ${conf.isPremium ? `<input type="number" id="amt" placeholder="Összeg (Ft)">` : ''}
                <button onclick="save()" class="btn-save">MENTÉS</button>
            </div>
            <input type="text" id="search" onkeyup="renderList()" placeholder="🔍 Keresés..." style="margin:20px 0; background:#0a0a0a;">
            <div class="card" style="padding:0; overflow-x:auto;"><table><thead><tr><th>${conf.f1}</th><th>${conf.f2}</th><th>Dátum</th><th>Státusz</th><th></th></tr></thead><tbody id="list"></tbody></table></div>
        </div>

        <div id="view-docs" class="view-section"><h1>Dokumentumtár</h1><div id="doc-list" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;"></div></div>
        <div id="view-report" class="view-section"><h1>Bevételek</h1><button onclick="exportCSV()" class="btn-save" style="background:#10b981; width:auto; margin-bottom:20px;">📥 EXPORT</button><div id="report-list"></div></div>
    </div>

    <script>
        let rawData = [];
        const stats = ${JSON.stringify(conf.stats)};
        const templates = ${JSON.stringify(conf.temps || {})};
        let cName = ""; let cTask = "";

        function showView(vId, btn) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('view-' + vId).classList.add('active');
            if(btn) btn.classList.add('active');
            document.getElementById('sidebar').classList.remove('open');
            if(vId === 'items' || vId === 'dash') load();
        }

        async function save() {
            const body = { 
                f1: document.getElementById('f1').value, f2: document.getElementById('f2').value, 
                email: document.getElementById('email').value, d: document.getElementById('d').value || new Date().toISOString().split('T')[0], 
                notes: document.getElementById('notes')?.value || '', amount: document.getElementById('amt')?.value || 0 
            };
            if(!body.f1) return alert("Név kötelező!");
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            document.getElementById('f1').value=''; document.getElementById('f2').value=''; document.getElementById('email').value='';
            load();
        }

        async function load() {
            const res = await fetch('/api/c'); rawData = await res.json();
            renderList(); updateStats();
        }

        function renderList() {
            const term = document.getElementById('search') ? document.getElementById('search').value.toLowerCase() : '';
            const filtered = rawData.filter(i => (i.f1 && i.f1.toLowerCase().includes(term)) || (i.f2 && i.f2.toLowerCase().includes(term)));
            
            document.getElementById('list').innerHTML = filtered.map(i => {
                const d = new Date(i.createdAt);
                const statusButtons = stats.map(s => \`<button onclick="upd('\${i._id}', '\${s}')" class="stat-btn" style="\${i.status===s?'border-color:var(--accent);color:white;':''}">\${s}</button>\`).join('');
                const emailBtn = i.email ? \`<button onclick="openMail('\${i.email}', '\${i.f1}', '\${i.f2}')" style="background:#333;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;margin-right:5px;">✉</button>\` : '';

                return \`<tr><td><b>\${i.f1}</b></td><td>\${i.f2}</td><td style="font-size:12px;color:#666">\${d.toLocaleDateString()}</td>
                <td><span class="status-pill" style="background:\${['Kész','Lezárva','Fizetett'].includes(i.status)?'#10b981':'#333'}">\${i.status}</span><br>\${statusButtons}</td>
                <td style="text-align:right;">\${emailBtn}<button onclick="del('\${i._id}')" style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">🗑</button></td></tr>\`;
            }).join('');
            
            if(document.getElementById('doc-list')) {
                document.getElementById('doc-list').innerHTML = rawData.filter(i => i.notes && i.notes.trim() !== "").map(i => \`
                    <div class="card" style="border-left:3px solid var(--accent)"><b>\${i.f1}</b><br><small style="color:#555">\${new Date(i.createdAt).toLocaleDateString()}</small>
                    <p style="color:#ccc;font-size:14px;white-space:pre-wrap;margin-top:10px;">\${i.notes}</p></div>\`).join('');
            }
        }

        function updateStats() {
            document.getElementById('st-all').innerText = rawData.length;
            document.getElementById('st-act').innerText = rawData.filter(i => !['Kész', 'Lezárva', 'Fizetett', 'Javítva', 'Sikeres zárás'].includes(i.status)).length;
            
            if(document.getElementById('st-mon')) {
                const now = new Date(); const curM = now.getFullYear() + "-" + now.getMonth();
                let mInc = 0; const mGroup = {};
                rawData.forEach(i => {
                    const d = new Date(i.createdAt);
                    const mLabel = d.getFullYear() + ". " + (d.getMonth() + 1);
                    if(!mGroup[mLabel]) mGroup[mLabel] = { count: 0, sum: 0 };
                    if(i.amount) { mGroup[mLabel].sum += i.amount; if(d.getFullYear()+"-"+d.getMonth() == curM) mInc += i.amount; }
                    mGroup[mLabel].count++;
                });
                document.getElementById('st-mon').innerText = mInc.toLocaleString() + " Ft";
                document.getElementById('report-list').innerHTML = Object.keys(mGroup).map(m => \`<div class="card" style="display:flex;justify-content:space-between;"><div><b>\${m}</b><br><small>\${mGroup[m].count} ügy</small></div><div style="color:var(--accent);font-weight:bold;">\${mGroup[m].sum.toLocaleString()} Ft</div></div>\`).join('');
            }
        }

        async function upd(id, s) { await fetch('/api/c/'+id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:s})}); load(); }
        async function del(id) { if(confirm("Törlés?")) { await fetch('/api/c/'+id, {method:'DELETE'}); load(); } }
        
        function openMail(e, n, t) { cName=n; cTask=t; document.getElementById('mail-to').value=e; 
            document.getElementById('mail-temp').innerHTML = '<option value="">-- Sablon --</option>' + Object.keys(templates).map(k => \`<option value="\${k}">\${templates[k]}</option>\`).join('');
            document.getElementById('email-modal').style.display = 'flex'; }
        
        function applyTemp() { const k = document.getElementById('mail-temp').value; if(!k) return;
            document.getElementById('mail-sub').value = "${BRAND} Értesítés: " + cTask;
            document.getElementById('mail-msg').value = "Kedves " + cName + "!\\n\\n" + templates[k] + ".\\n\\nÜdvözlettel:\\n${BRAND}"; }
        
        function closeMail() { document.getElementById('email-modal').style.display = 'none'; }
        async function sendMailNow() { 
            const res = await fetch('/api/send-email', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ to: document.getElementById('mail-to').value, subject: document.getElementById('mail-sub').value, text: document.getElementById('mail-msg').value })});
            if(res.ok) { alert("Elküldve!"); closeMail(); } else { alert("Hiba!"); }
        }
        function exportCSV() { 
            let csv = "Nev,Reszlet,Email,Statusz,Osszeg,Datum\\n"; 
            rawData.forEach(i => { csv += \`"\${i.f1}","\${i.f2}","\${i.email}","\${i.status}","\${i.amount}","\${i.createdAt}"\\n\`; }); 
            const link = document.createElement("a"); link.href = "data:text/csv;charset=utf-8," + encodeURI("\\ufeff" + csv); link.download = "export.csv"; link.click();
        }
        load();
    </script>
</body>
</html>`;
}

// --- 5. ÚTVONALAK ---
app.post('/login', (req, res) => {
    if(req.body.username === ADMIN_USER && req.body.password === ADMIN_PASS) {
        res.cookie('token', ADMIN_PASS, { httpOnly: true, maxAge: 86400000 });
        res.redirect('/');
    } else {
        res.send(loginHtml("Hibás adatok!"));
    }
});
app.get('/logout', (req, res) => { res.clearCookie('token'); res.redirect('/'); });

app.get('/', requireAuth, (req, res) => res.send(appHtml()));
app.get('/api/c', requireAuth, async (req, res) => res.json(await Cl