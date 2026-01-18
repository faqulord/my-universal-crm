const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. ADATBÁZIS ---
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 }).catch(() => {});

const Client = mongoose.model('Client', new mongoose.Schema({
    f1: String, f2: String, d: String,
    status: { type: String, default: 'Aktív' },
    notes: String, 
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. DINAMIKUS KONFIGURÁCIÓ ---
const getConfig = () => {
    const ind = (process.env.INDUSTRY || 'default').toLowerCase();
    const plan = (process.env.PLAN || 'basic').toLowerCase();
    const industries = {
        'szerviz': { f1: 'Tulajdonos', f2: 'Rendszám/Típus', menu: 'Járművek' },
        'ugyved': { f1: 'Ügyfél neve', f2: 'Ügyszám/Tárgy', menu: 'Akták' },
        'bufe': { f1: 'Beszállító', f2: 'Tétel/Rendelés', menu: 'Készlet' },
        'default': { f1: 'Partner', f2: 'Projekt', menu: 'Ügyfelek' }
    };
    const c = industries[ind] || industries['default'];
    return { ...c, planName: plan.toUpperCase(), isPro: plan==='pro'||plan==='premium', isPremium: plan==='premium' };
};

// --- 3. INTERFÉSZ (SÖTÉT MÓD) ---
app.get('/', (req, res) => {
    const conf = getConfig();
    const theme = process.env.THEME_COLOR || '#3b82f6';
    const brand = process.env.BRAND_NAME || 'Master CRM';

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${brand}</title>
    <style>
        :root { --accent: ${theme}; --bg: #000000; --card: #0a0a0a; --sidebar: #050505; --text: #ffffff; --border: #1f2937; }
        body { font-family: -apple-system, sans-serif; margin: 0; display: flex; height: 100vh; background: var(--bg); color: var(--text); overflow: hidden; }
        
        #login { position: fixed; inset: 0; background: var(--bg); z-index: 9000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; }
        .login-card { background: #050505; padding: 40px; border-radius: 12px; width: 100%; max-width: 340px; text-align: center; border: 1px solid var(--border); }
        .signature { margin-top: 30px; font-style: italic; color: #333; font-size: 11px; }

        .sidebar { width: 260px; background: var(--sidebar); border-right: 1px solid var(--border); padding: 25px; display: flex; flex-direction: column; position: fixed; height: 100%; transition: 0.3s; z-index: 5000; box-sizing: border-box; }
        .sidebar.closed { transform: translateX(-100%); }
        .nav-item { padding: 15px; cursor: pointer; border-radius: 8px; color: #666; margin-bottom: 8px; font-weight: 600; border: none; background: transparent; text-align: left; width: 100%; font-size: 14px; }
        .nav-item.active { background: var(--accent); color: white; }
        .logout { margin-top: auto; padding: 12px; background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: 8px; font-weight: 800; cursor: pointer; text-align:center; }

        .main { flex: 1; padding: 25px; margin-left: 260px; transition: 0.3s; overflow-y: auto; padding-top: 85px; width: 100%; box-sizing: border-box; }
        @media (max-width: 900px) { .main { margin-left: 0; } .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); } }

        .menu-btn { position: fixed; top: 15px; left: 15px; background: var(--accent); color: white; border: none; padding: 12px 20px; cursor: pointer; z-index: 6000; font-weight: 800; border-radius: 6px; }
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 4500; }
        .overlay.active { display: block; }

        .card { background: var(--card); padding: 25px; border: 1px solid var(--border); margin-bottom: 20px; border-radius: 12px; }
        input, textarea { padding: 14px; border: 1px solid var(--border); margin: 6px 0; width: 100%; box-sizing: border-box; border-radius: 6px; font-size: 16px; background: #000; color: #fff; outline: none; }
        .save-btn { width: 100%; padding: 15px; background: var(--accent); color: white; border: none; font-weight: 800; border-radius: 6px; cursor: pointer; margin-top: 10px; }

        .view-section { display: none; }
        .view-section.active { display: block; }
        
        table { width: 100%; border-collapse: collapse; min-width: 700px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #444; padding: 15px; border-bottom: 1px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 14px; }

        .pro-only { display: ${conf.isPro ? 'block' : 'none'}; }
        .premium-only { display: ${conf.isPremium ? 'block' : 'none'}; }
        .export-btn { background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 800; cursor: pointer; margin-bottom: 20px; }
        .del-btn { background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; margin-left: 5px; }
    </style>
</head>
<body>
    <div id="login">
        <div class="login-card">
            <div style="background:var(--accent); color:white; padding:4px 12px; border-radius:50px; font-size:10px; font-weight:800; margin-bottom:20px; display:inline-block;">${conf.planName} PLAN</div>
            <h1 style="color:white; margin:0 0 5px 0; font-size:32px; letter-spacing:-1px;">${brand}</h1>
            <p style="color:#444; font-size:14px; margin-bottom:30px;">CRM Belépés</p>
            <input type="text" id="usr" placeholder="FELHASZNÁLÓNÉV" style="text-align:center; margin-bottom:10px;">
            <input type="password" id="pw" placeholder="JELSZÓ" style="text-align:center;">
            <button onclick="check()" style="width:100%; padding:15px; background:var(--accent); color:white; border:none; font-weight:800; border-radius:6px; cursor:pointer; margin-top:15px;">BELÉPÉS</button>
        </div>
        <div class="signature">faqudeveloper system</div>
    </div>

    <button class="menu-btn" onclick="toggleMenu()">☰ MENÜ</button>
    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <div class="sidebar" id="sidebar">
        <h2 style="color:var(--accent); margin-bottom:40px;">${brand}</h2>
        <button class="nav-item active" onclick="showView('dash', this)">📊 ÁTTEKINTÉS</button>
        <button class="nav-item" onclick="showView('items', this)">📂 ${conf.menu.toUpperCase()}</button>
        <button class="nav-item pro-only" onclick="showView('docs', this)">📁 DOKUMENTUMOK</button>
        <button class="nav-item premium-only" onclick="showView('report', this)">📈 HAVI ZÁRÁS</button>
        <button class="logout" onclick="location.reload()">KILÉPÉS</button>
    </div>

    <div class="main">
        <div id="view-dash" class="view-section active">
            <h1>Irányítópult</h1>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
                <div class="card">Összes rögzítés<h2 id="st-all" style="color:var(--accent); margin-top:10px;">0</h2></div>
                <div class="card">Aktív ügyek<h2 id="st-act" style="color:#f59e0b; margin-top:10px;">0</h2></div>
                <div class="card premium-only">Havi bevétel<h2 id="st-mon" style="color:#10b981; margin-top:10px;">0 Ft</h2></div>
            </div>
        </div>

        <div id="view-items" class="view-section">
            <h1>${conf.menu} Kezelése</h1>
            <div class="card">
                <h3>Új rögzítése</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    <input type="text" id="f1" placeholder="${conf.f1}">
                    <input type="text" id="f2" placeholder="${conf.f2}">
                    <input type="date" id="d">
                </div>
                <div class="pro-only"><textarea id="notes" placeholder="Részletes jegyzet..."></textarea></div>
                <div class="premium-only"><input type="number" id="amt" placeholder="Összeg Ft"></div>
                <button class="save-btn" onclick="save()">ADATOK MENTÉSE</button>
            </div>
            <div class="card" style="overflow-x:auto;">
                <table>
                    <thead><tr><th>Név</th><th>Leírás</th><th>Dátum</th><th>Állapot</th><th></th></tr></thead>
                    <tbody id="list"></tbody>
                </table>
            </div>
        </div>

        <div id="view-docs" class="view-section">
            <h1>Jegyzetek és Dokumentumok</h1>
            <div id="doc-list"></div>
        </div>

        <div id="view-report" class="view-section">
            <button onclick="exportCSV()" class="export-btn">📥 EXCEL EXPORT</button>
            <h1>Havi Kimutatások</h1>
            <div id="report-list"></div>
        </div>
    </div>

    <script>
        let rawData = [];
        function toggleMenu() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('active'); }
        function showView(vId, btn) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('view-' + vId).classList.add('active');
            if(btn) btn.classList.add('active');
            if(window.innerWidth < 900) toggleMenu();
            load();
        }

        function check() {
            if(document.getElementById('usr').value === '${process.env.ADMIN_USER}' && document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none'; load();
            } else { alert("Hibás adatok!"); }
        }

        async function save() {
            const f1 = document.getElementById('f1').value.trim();
            const f2 = document.getElementById('f2').value.trim();
            
            // ELLENŐRZÉS: Ne engedjen üres mezőket!
            if(!f1 || !f2) { return alert("Hiba: A név és a leírás mező kitöltése kötelező!"); }

            const body = { 
                f1, f2, d: document.getElementById('d').value,
                notes: document.getElementById('notes')?.value || '', amount: document.getElementById('amt')?.value || 0
            };
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            document.getElementById('f1').value=''; document.getElementById('f2').value='';
            load();
        }

        async function load() {
            const res = await fetch('/api/c'); rawData = await res.json();
            document.getElementById('st-all').innerText = rawData.length;
            document.getElementById('st-act').innerText = rawData.filter(i => i.status !== 'Kész').length;
            
            let mInc = 0; const now = new Date(); const curM = now.getFullYear() + "-" + (now.getMonth()+1); const mGroup = {};

            document.getElementById('list').innerHTML = rawData.map(i => {
                const d = new Date(i.createdAt); const mKey = d.getFullYear() + "-" + (d.getMonth()+1);
                const mFull = d.getFullYear() + " " + d.toLocaleString('hu-HU', {month:'long'});
                if(!mGroup[mFull]) mGroup[mFull] = { inc: 0, count: 0 };
                mGroup[mFull].inc += (i.amount || 0); mGroup[mFull].count++; if(mKey === curM) mInc += (i.amount || 0);

                return \`<tr><td><b>\${i.f1}</b></td><td>\${i.f2}</td><td style="font-size:11px; color:#444">\${d.toLocaleString('hu-HU')}</td><td style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}; font-weight:800; font-size:11px;">\${i.status.toUpperCase()}</td><td style="text-align:right;"><button onclick="upd('\${i._id}')" style="background:#10b981; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:bold;">OK</button><button onclick="del('\${i._id}')" class="del-btn">✘</button></td></tr>\`;
            }).join('');

            if(document.getElementById('st-mon')) document.getElementById('st-mon').innerText = mInc.toLocaleString() + " Ft";
            document.getElementById('report-list').innerHTML = Object.keys(mGroup).map(m => \`<div class="card" style="display:flex; justify-content:space-between; align-items:center;"><div><b>\${m}</b><br><small>\${mGroup[m].count} db lezárva</small></div><div style="font-size:20px; color:var(--accent); font-weight:800;">\${mGroup[m].inc.toLocaleString()} Ft</div></div>\`).join('');
            document.getElementById('doc-list').innerHTML = rawData.filter(i => i.notes).map(i => \`<div class="card"><b>\${i.f1}</b><p style="color:#666; font-size:14px; margin-top:10px;">\${i.notes}</p></div>\`).join('');
        }

        async function upd(id) { await fetch('/api/c/'+id, {method:'PUT'}); load(); }
        
        // TÖRLÉS FUNKCIÓ (ÚJ)
        async function del(id) {
            if(confirm("Biztosan törölni szeretnéd ezt az elemet? Ez a művelet nem vonható vissza!")) {
                await fetch('/api/c/' + id, { method: 'DELETE' });
                load();
            }
        }

        function exportCSV() {
            let csv = "Nev,Reszlet,Datum,Statusz,Osszeg\\n";
            rawData.forEach(i => { csv += \`"\${i.f1}","\${i.f2}","\${i.createdAt}","\${i.status}","\${i.amount}"\\n\`; });
            const blob = new Blob(["\\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob); link.download = "EXPORT_" + new Date().toLocaleDateString() + ".csv"; link.click();
        }
    </script>
</body>
</html>
    `);
});

// --- 4. API ÚTVONALAK (Javítva a törléssel) ---
app.get('/api/c', async (req, res) => res.json(await Client.find().sort({createdAt: -1})));
app.post('/api/c', async (req, res) => {
    if(!req.body.f1 || !req.body.f2) return res.status(400).send("Hiányzó adatok");
    await new Client(req.body).save(); res.json({ok: true});
});
app.put('/api/c/:id', async (req, res) => { await Client.findByIdAndUpdate(req.params.id, {status: 'Kész'}); res.json({ok: true}); });

// ÚJ TÖRLÉS ÚTVONAL
app.delete('/api/c/:id', async (req, res) => {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ok: true});
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("ONLINE"));