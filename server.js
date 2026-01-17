const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- ADATBÁZIS KAPCSOLÓDÁS ---
mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

const Client = mongoose.model('Client', new mongoose.Schema({
    f1: String, 
    f2: String, 
    d: String,
    status: { type: String, default: 'Aktív' },
    notes: String, 
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
}));

// DINAMIKUS BEÁLLÍTÁSOK
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

app.get('/', (req, res) => {
    const conf = getConfig();
    const theme = process.env.THEME_COLOR || '#1e3a8a';
    const brand = process.env.BRAND_NAME || 'Master CRM';

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand}</title>
    <style>
        :root { --accent: ${theme}; --sidebar-bg: #0f172a; --border: #e2e8f0; }
        body { font-family: sans-serif; margin: 0; display: flex; height: 100vh; background: #f1f5f9; overflow: hidden; }
        
        .sidebar { width: 260px; background: var(--sidebar-bg); color: white; padding: 25px; display: flex; flex-direction: column; position: fixed; height: 100%; transition: 0.3s; z-index: 3000; }
        .nav-item { padding: 15px; cursor: pointer; border-radius: 6px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; border: none; background: transparent; text-align: left; width: 100%; font-size: 14px; }
        .nav-item.active { background: var(--accent); color: white; }

        .main { flex: 1; padding: 20px; margin-left: 260px; transition: 0.3s; overflow-y: auto; padding-top: 80px; }
        @media (max-width: 900px) { .main { margin-left: 0; } .sidebar { transform: translateX(-100%); } .sidebar.open { transform: translateX(0); } }

        .menu-btn { position: fixed; top: 15px; left: 15px; background: var(--accent); color: white; border: none; padding: 12px 20px; cursor: pointer; z-index: 2000; font-weight: 800; border-radius: 4px; }
        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2500; }
        .overlay.active { display: block; }

        .card { background: white; padding: 25px; border: 1px solid var(--border); margin-bottom: 20px; border-radius: 8px; }
        .view-section { display: none; }
        .view-section.active { display: block; }
        
        .pro-only { display: ${conf.isPro ? 'block' : 'none'}; }
        .premium-only { display: ${conf.isPremium ? 'block' : 'none'}; }
        
        .stat-card { background: white; padding: 20px; border-radius: 8px; border-left: 5px solid var(--accent); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        
        table { width: 100%; border-collapse: collapse; min-width: 800px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 15px; border-bottom: 2px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 13px; }

        #login { position: fixed; inset: 0; background: #0f172a; z-index: 4000; display: flex; justify-content: center; align-items: center; }
        .export-btn { background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 4px; font-weight: bold; cursor: pointer; float: right; }
    </style>
</head>
<body>
    <div id="login">
        <div style="background:#1e293b; padding:40px; border-radius:8px; width:300px; text-align:center;">
            <div style="background:var(--accent); color:white; padding:4px 12px; border-radius:50px; font-size:10px; font-weight:800; margin-bottom:15px; display:inline-block;">${conf.planName}</div>
            <h1 style="color:white; margin-bottom:20px;">${brand}</h1>
            <input type="password" id="pw" placeholder="JELSZÓ" style="width:100%; padding:12px; margin-bottom:15px; border-radius:4px; border:none; text-align:center;">
            <button onclick="check()" style="width:100%; padding:15px; background:var(--accent); color:white; border:none; font-weight:800; cursor:pointer; border-radius:4px;">BELÉPÉS</button>
        </div>
    </div>

    <button class="menu-btn" onclick="toggleMenu()">MENÜ</button>
    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <div class="sidebar" id="sidebar">
        <h2 style="color:var(--accent); margin-bottom:40px;">${brand}</h2>
        <button class="nav-item active" onclick="showView('dash', this)">📊 IRÁNYÍTÓPULT</button>
        <button class="nav-item" onclick="showView('items', this)">📂 ${conf.menu.toUpperCase()}</button>
        <button class="nav-item pro-only" onclick="showView('docs', this)">📁 DOKUMENTUMOK</button>
        <button class="nav-item premium-only" onclick="showView('report', this)">📈 HAVI ZÁRÁS</button>
        <button onclick="location.reload()" style="margin-top:auto; background:transparent; border:1px solid #ef4444; color:#ef4444; padding:10px; cursor:pointer; font-weight:800;">KILÉPÉS</button>
    </div>

    <div class="main">
        <div id="view-dash" class="view-section active">
            <h1>Áttekintés</h1>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
                <div class="stat-card"><span>Összes ügyfél</span><h2 id="stat-all">0</h2></div>
                <div class="stat-card"><span>Aktív ügyek</span><h2 id="stat-active">0</h2></div>
                <div class="stat-card premium-only"><span>Havi bevétel</span><h2 id="stat-income">0 Ft</h2></div>
            </div>
        </div>

        <div id="view-items" class="view-section">
            <h1>${conf.menu} Kezelése</h1>
            <div class="card">
                <h3>Új rögzítése</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                    <input type="text" id="f1" placeholder="${conf.f1}">
                    <input type="text" id="f2" placeholder="${conf.f2}">
                    <input type="date" id="d">
                </div>
                <div class="pro-only"><textarea id="notes" placeholder="Részletes jegyzet..."></textarea></div>
                <div class="premium-only"><input type="number" id="amt" placeholder="Összeg Ft"></div>
                <button onclick="save()" style="width:100%; margin-top:15px; background:var(--accent); color:white; border:none; padding:12px; font-weight:800; cursor:pointer;">MENTÉS</button>
            </div>
            <div class="card" style="overflow-x:auto;">
                <table>
                    <thead><tr><th>Név</th><th>Részletek</th><th>Rögzítve</th><th>Állapot</th><th></th></tr></thead>
                    <tbody id="list"></tbody>
                </table>
            </div>
        </div>

        <div id="view-docs" class="view-section">
            <h1>Dokumentumok és Jegyzetek</h1>
            <div id="doc-list"></div>
        </div>

        <div id="view-report" class="view-section">
            <button class="export-btn" onclick="exportData()">📥 EXPORTÁLÁS EXCELBE</button>
            <h1>Havi Zárás & Jelentés</h1>
            <div id="monthly-summary"></div>
        </div>
    </div>

    <script>
        let allData = [];

        function toggleMenu() {
            document.getElementById('sidebar').classList.toggle('open');
            document.getElementById('overlay').classList.toggle('active');
        }

        function showView(viewId, btn) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.getElementById('view-' + viewId).classList.add('active');
            if(btn) btn.classList.add('active');
            if(window.innerWidth < 900) toggleMenu();
            load();
        }

        function check() {
            if(document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none';
                load();
            } else { alert("Hibás jelszó!"); }
        }

        async function save() {
            const body = { 
                f1: document.getElementById('f1').value, 
                f2: document.getElementById('f2').value, 
                d: document.getElementById('d').value,
                notes: document.getElementById('notes')?.value || '',
                amount: document.getElementById('amt')?.value || 0
            };
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            document.getElementById('f1').value=''; document.getElementById('f2').value='';
            load();
        }

        async function load() {
            const res = await fetch('/api/c');
            allData = await res.json();
            
            // Dashboard
            document.getElementById('stat-all').innerText = allData.length;
            document.getElementById('stat-active').innerText = allData.filter(i => i.status !== 'Kész').length;
            
            const months = {};
            let currentMonthIncome = 0;
            const now = new Date();
            const currentMonthKey = now.getFullYear() + "-" + (now.getMonth()+1);

            allData.forEach(i => {
                const d = new Date(i.createdAt);
                const key = d.getFullYear() + " " + d.toLocaleString('hu-HU', {month: 'long'});
                const mKey = d.getFullYear() + "-" + (d.getMonth()+1);
                
                if(!months[key]) months[key] = { income: 0, count: 0 };
                months[key].income += (i.amount || 0);
                months[key].count += 1;

                if(mKey === currentMonthKey) currentMonthIncome += (i.amount || 0);
            });

            if(document.getElementById('stat-income')) document.getElementById('stat-income').innerText = currentMonthIncome.toLocaleString() + " Ft";

            // Havi lista
            document.getElementById('monthly-summary').innerHTML = Object.keys(months).map(m => \`
                <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                    <div><b>\${m}</b><br><small>\${months[m].count} db lezárt ügy</small></div>
                    <div style="font-size:18px; color:var(--accent); font-weight:800;">\${months[m].income.toLocaleString()} Ft</div>
                </div>
            \`).join('');

            // Fő táblázat
            document.getElementById('list').innerHTML = allData.map(i => \`
                <tr>
                    <td><b>\${i.f1}</b></td>
                    <td>\${i.f2}</td>
                    <td style="font-size:11px; color:#64748b">\${new Date(i.createdAt).toLocaleString('hu-HU')}</td>
                    <td style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}; font-weight:800;">\${i.status.toUpperCase()}</td>
                    <td><button onclick="upd('\${i._id}')" style="background:#10b981; color:white; border:none; padding:5px 10px; cursor:pointer;">OK</button></td>
                </tr>
            \`).join('');

            // Dokumentumok
            document.getElementById('doc-list').innerHTML = allData.filter(i => i.notes).map(i => \`
                <div class="card"><b>\${i.f1} (\${i.f2})</b><p>\${i.notes}</p></div>
            \`).join('');
        }

        async function upd(id) { await fetch('/api/c/'+id, {method:'PUT'}); load(); }

        // --- EXPORTÁLÁS LOGIKA (ÚJ) ---
        function exportData() {
            if(allData.length === 0) return alert("Nincs exportálható adat!");
            
            let csv = "Név,Részletek,Dátum,Állapot,Összeg,Megjegyzés\\n";
            allData.forEach(i => {
                const date = new Date(i.createdAt).toLocaleDateString('hu-HU');
                csv += \`"\${i.f1}","\${i.f2}","\${date}","\${i.status}","\${i.amount}","\${i.notes}"\\n\`;
            });

            const blob = new Blob(["\\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "CRM_Export_" + new Date().toLocaleDateString() + ".csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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