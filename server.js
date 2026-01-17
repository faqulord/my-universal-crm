const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. ADATBÁZIS KAPCSOLÓDÁS ---
mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

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

// --- 3. A TELJES INTERFÉSZ ---
app.get('/', (req, res) => {
    const conf = getConfig();
    const theme = process.env.THEME_COLOR || '#1e3a8a';
    const brand = process.env.BRAND_NAME || 'Master CRM';

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${brand}</title>
    <style>
        :root { --accent: ${theme}; --sidebar-bg: #0f172a; --border: #e2e8f0; --white: #ffffff; }
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; display: flex; height: 100vh; background: #f1f5f9; overflow: hidden; }
        
        /* LOGIN MODUL - STABILIZÁLVA */
        #login { position: fixed; inset: 0; background: #f1f5f9; z-index: 5000; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; }
        .login-card { background: var(--white); padding: 40px 30px; border-radius: 12px; width: 100%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; border: 1px solid var(--border); }
        .badge { background: var(--accent); color: white; padding: 4px 12px; border-radius: 50px; font-size: 10px; font-weight: 800; margin-bottom: 20px; display: inline-block; text-transform: uppercase; }
        .signature { margin-top: 20px; font-style: italic; color: #000; font-size: 11px; opacity: 0.7; }

        /* SIDEBAR - TELEFONRA OPTIMALIZÁLVA */
        .sidebar { width: 260px; background: var(--sidebar-bg); color: white; padding: 20px; display: flex; flex-direction: column; position: fixed; height: 100%; transition: 0.3s; z-index: 3000; box-sizing: border-box; }
        .sidebar.closed { transform: translateX(-100%); }
        .nav-item { padding: 14px; cursor: pointer; border-radius: 8px; color: #94a3b8; margin-bottom: 5px; font-weight: 600; border: none; background: transparent; text-align: left; width: 100%; font-size: 14px; transition: 0.2s; }
        .nav-item.active { background: var(--accent); color: white; }
        .logout-btn { margin-top: auto; padding: 12px; background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 12px; transition: 0.3s; margin-bottom: 10px; }

        /* TARTALOM */
        .main { flex: 1; padding: 20px; margin-left: 260px; transition: 0.3s; overflow-y: auto; padding-top: 80px; width: 100%; box-sizing: border-box; }
        @media (max-width: 900px) { .main { margin-left: 0; padding: 15px; padding-top: 75px; } .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); } }

        .menu-btn { position: fixed; top: 15px; left: 15px; background: var(--accent); color: white; border: none; padding: 10px 18px; cursor: pointer; z-index: 2000; font-weight: 800; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2500; }
        .overlay.active { display: block; }

        .card { background: var(--white); padding: 20px; border: 1px solid var(--border); margin-bottom: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        input, textarea { padding: 12px; border: 1px solid var(--border); margin: 6px 0; width: 100%; box-sizing: border-box; border-radius: 6px; font-size: 15px; outline: none; }
        input:focus { border-color: var(--accent); }
        .save-btn { width: 100%; padding: 14px; background: var(--accent); color: white; border: none; font-weight: 800; border-radius: 6px; cursor: pointer; margin-top: 10px; }

        .view-section { display: none; }
        .view-section.active { display: block; }
        
        table { width: 100%; border-collapse: collapse; min-width: 700px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 15px; border-bottom: 2px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 13px; }

        .pro-only { display: ${conf.isPro ? 'block' : 'none'}; }
        .premium-only { display: ${conf.isPremium ? 'block' : 'none'}; }
        .export-btn { background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div id="login">
        <div class="login-card">
            <div class="badge">${conf.planName} PLAN</div>
            <h1 style="color:var(--sidebar-bg); margin:0 0 10px 0; font-size:28px; letter-spacing:-1px;">${brand}</h1>
            <p style="color:#64748b; font-size:14px; margin-bottom:30px;">Üdvözöljük a CRM felületen!</p>
            <input type="password" id="pw" placeholder="Mester Jelszó" style="text-align:center; background:#f8fafc;">
            <button onclick="check()" style="width:100%; padding:15px; background:var(--accent); color:white; border:none; font-weight:800; border-radius:6px; cursor:pointer; margin-top:15px; font-size:14px;">BELÉPÉS</button>
        </div>
        <div class="signature">faqudeveloper system</div>
    </div>

    <button class="menu-btn" onclick="toggleMenu()">☰ MENÜ</button>
    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <div class="sidebar" id="sidebar">
        <h2 style="color:var(--accent); font-size:22px; margin-bottom:30px;">${brand}</h2>
        <button class="nav-item active" onclick="showView('dash', this)">📊 ÁTTEKINTÉS</button>
        <button class="nav-item" onclick="showView('items', this)">📂 ${conf.menu.toUpperCase()}</button>
        <button class="nav-item pro-only" onclick="showView('docs', this)">📁 DOKUMENTUMOK</button>
        <button class="nav-item premium-only" onclick="showView('report', this)">📈 HAVI ZÁRÁS</button>
        <button class="logout-btn" onclick="location.reload()">KILÉPÉS</button>
    </div>

    <div class="main">
        <div id="view-dash" class="view-section active">
            <h1>Irányítópult</h1>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
                <div class="card" style="border-left:5px solid var(--accent)">Összes ügyfél<h2 id="st-all" style="margin:5px 0 0 0">0</h2></div>
                <div class="card" style="border-left:5px solid #f59e0b">Aktív ügyek<h2 id="st-act" style="margin:5px 0 0 0">0</h2></div>
                <div class="card premium-only" style="border-left:5px solid #10b981">Havi bevétel<h2 id="st-mon" style="margin:5px 0 0 0">0 Ft</h2></div>
            </div>
        </div>

        <div id="view-items" class="view-section">
            <h1>${conf.menu} Kezelése</h1>
            <div class="card">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                    <input type="text" id="f1" placeholder="${conf.f1}">
                    <input type="text" id="f2" placeholder="${conf.f2}">
                    <input type="date" id="d">
                </div>
                <div class="pro-only"><textarea id="notes" placeholder="Megjegyzések a projekthez..."></textarea></div>
                <div class="premium-only"><input type="number" id="amt" placeholder="Összeg Ft-ban"></div>
                <button class="save-btn" onclick="save()">ADATOK MENTÉSE</button>
            </div>
            <div class="card" style="overflow-x:auto;">
                <table>
                    <thead><tr><th>Név</th><th>Leírás</th><th>Dátum (Precíz)</th><th>Állapot</th><th></th></tr></thead>
                    <tbody id="list"></tbody>
                </table>
            </div>
        </div>

        <div id="view-docs" class="view-section">
            <h1>Dokumentumok</h1>
            <div id="doc-list"></div>
        </div>

        <div id="view-report" class="view-section">
            <button class="export-btn" onclick="exportCSV()">📥 EXCEL EXPORTÁLÁS (.CSV)</button>
            <h1>Havi Kimutatások</h1>
            <div id="report-list"></div>
        </div>
    </div>

    <script>
        let rawData = [];
        function toggleMenu() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('overlay').classList.toggle('active');
        }

        function showView(vId, btn) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('view-' + vId).classList.add('active');
            if(btn) btn.classList.add('active');
            if(window.innerWidth < 900) toggleMenu();
            load();
        }

        function check() {
            if(document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none';
                load();
            } else { alert("Hibás hozzáférés!"); }
        }

        async function save() {
            const body = { 
                f1: document.getElementById('f1').value, 
                f2: document.getElementById('f2').value, 
                d: document.getElementById('d').value,
                notes: document.getElementById('notes')?.value || '',
                amount: document.getElementById('amt')?.value || 0
            };
            if(!body.f1) return alert("Név megadása kötelező!");
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            document.getElementById('f1').value=''; document.getElementById('f2').value='';
            load();
        }

        async function load() {
            const res = await fetch('/api/c');
            rawData = await res.json();
            
            document.getElementById('st-all').innerText = rawData.length;
            document.getElementById('st-act').innerText = rawData.filter(i => i.status !== 'Kész').length;
            
            let mInc = 0; const now = new Date();
            const curM = now.getFullYear() + "-" + (now.getMonth()+1);
            const mGroup = {};

            document.getElementById('list').innerHTML = rawData.map(i => {
                const d = new Date(i.createdAt);
                const mKey = d.getFullYear() + "-" + (d.getMonth()+1);
                const mFull = d.getFullYear() + " " + d.toLocaleString('hu-HU', {month:'long'});
                
                if(!mGroup[mFull]) mGroup[mFull] = { inc: 0, count: 0 };
                mGroup[mFull].inc += (i.amount || 0);
                mGroup[mFull].count++;

                if(mKey === curM) mInc += (i.amount || 0);

                return \`<tr>
                    <td><b>\${i.f1}</b></td><td>\${i.f2}</td>
                    <td style="font-size:11px; color:#64748b">\${d.toLocaleString('hu-HU')}</td>
                    <td style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}; font-weight:800; font-size:11px;">\${i.status.toUpperCase()}</td>
                    <td style="text-align:right;"><button onclick="upd('\${i._id}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">OK</button></td>
                </tr>\`;
            }).join('');

            if(document.getElementById('st-mon')) document.getElementById('st-mon').innerText = mInc.toLocaleString() + " Ft";
            
            document.getElementById('report-list').innerHTML = Object.keys(mGroup).map(m => \`
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div><b>\${m}</b><br><small>\${mGroup[m].count} db ügymenet</small></div>
                    <div style="font-size:18px; color:var(--accent); font-weight:800;">\${mGroup[m].inc.toLocaleString()} Ft</div>
                </div>\`).join('');

            document.getElementById('doc-list').innerHTML = rawData.filter(i => i.notes).map(i => \`
                <div class="card"><b>\${i.f1}</b><p style="font-size:14px; color:#475569">\${i.notes}</p></div>\`).join('');
        }

        async function upd(id) { await fetch('/api/c/'+id, {method:'PUT'}); load(); }

        function exportCSV() {
            let csv = "Nev,Reszlet,Datum,Statusz,Osszeg\\n";
            rawData.forEach(i => { csv += \`"\${i.f1}","\${i.f2}","\${i.createdAt}","\${i.status}","\${i.amount}"\\n\`; });
            const blob = new Blob(["\\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "CRM_Export_" + new Date().toLocaleDateString() + ".csv";
            link.click();
        }
    </script>
</body>
</html>
    `);
});

app.get('/api/c', async (req, res) => res.json(await Client.find().sort({createdAt: -1})));
app.post('/api/c', async (req, res) => { await new Client(req.body).save(); res.json({ok: true}); });
app.put('/api/c/:id', async (req, res) => { await Client.findByIdAndUpdate(req.params.id, {status: 'Kész'}); res.json({ok: true}); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("MASTER CRM READY"));