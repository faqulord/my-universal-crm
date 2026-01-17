const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

const Client = mongoose.model('Client', new mongoose.Schema({
    f1: String, f2: String, d: String, 
    status: { type: String, default: 'Aktív' },
    notes: String, amount: Number
}));

const getConfig = () => {
    const ind = (process.env.INDUSTRY || 'default').toLowerCase();
    const plan = (process.env.PLAN || 'basic').toLowerCase();
    const industries = {
        'szerviz': { f1: 'Tulajdonos', f2: 'Rendszám / Típus', menu: 'Járművek' },
        'ugyved': { f1: 'Ügyfél neve', f2: 'Ügyszám / Tárgy', menu: 'Akták' },
        'bufe': { f1: 'Beszállító', f2: 'Tétel / Rendelés', menu: 'Készlet' },
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
        :root { --accent: ${theme}; --bg: #ffffff; --sidebar-bg: #0f172a; --border: #e2e8f0; }
        body { font-family: sans-serif; margin: 0; display: flex; height: 100vh; background: var(--bg); overflow: hidden; }
        
        /* SIDEBAR - FIXÁLT KATTINTÁS */
        .sidebar { 
            width: 260px; background: var(--sidebar-bg); color: white; padding: 25px; 
            display: flex; flex-direction: column; position: fixed; height: 100%; 
            transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 3000; /* Legfelülre tettem */
        }
        .sidebar.closed { transform: translateX(-100%); }
        
        @media (max-width: 900px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
        }

        .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2500; }
        .overlay.active { display: block; }

        .menu-btn { position: fixed; top: 15px; left: 15px; background: var(--accent); color: white; border: none; padding: 12px 20px; cursor: pointer; z-index: 2000; font-weight: 800; border-radius: 4px; }

        .nav-item { 
            padding: 15px; cursor: pointer; border-radius: 6px; color: #94a3b8; 
            margin-bottom: 8px; font-weight: 600; display: block; border: none;
            background: transparent; text-align: left; width: 100%; font-size: 14px;
        }
        .nav-item:hover, .nav-item.active { background: var(--accent); color: white; }

        .main { flex: 1; padding: 20px; margin-left: 260px; transition: 0.3s; overflow-y: auto; padding-top: 80px; }
        @media (max-width: 900px) { .main { margin-left: 0; } }

        .card { background: white; padding: 25px; border: 1px solid var(--border); margin-bottom: 20px; }
        input, textarea, button.save-btn { padding: 12px; border: 1px solid var(--border); margin: 5px 0; width: 100%; box-sizing: border-box; border-radius: 4px; }
        button.save-btn { background: var(--accent); color: white; border: none; font-weight: 800; cursor: pointer; }

        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 15px; border-bottom: 2px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 14px; color: #334155; }

        .pro-only { display: ${conf.isPro ? 'block' : 'none'}; }
        .premium-only { display: ${conf.isPremium ? 'block' : 'none'}; }

        #login { position: fixed; inset: 0; background: #0f172a; z-index: 4000; display: flex; justify-content: center; align-items: center; flex-direction: column; }
    </style>
</head>
<body>
    <div id="login">
        <div style="background:#1e293b; padding:40px; border-radius:8px; width:300px; text-align:center; border:1px solid #334155;">
            <div style="background:var(--accent); color:white; padding:4px 12px; border-radius:50px; font-size:10px; font-weight:800; margin-bottom:15px; display:inline-block;">${conf.planName} CSOMAG</div>
            <h1 style="color:white; margin:0 0 20px 0; font-size:24px;">${brand}</h1>
            <input type="password" id="pw" placeholder="ADMIN JELSZÓ" style="background:#0f172a; color:white; border:1px solid #334155; text-align:center;">
            <button onclick="check()" style="width:100%; margin-top:15px; background:var(--accent); color:white; border:none; padding:15px; font-weight:800; cursor:pointer;">BELÉPÉS</button>
        </div>
    </div>

    <button class="menu-btn" onclick="toggleMenu()">MENÜ</button>
    <div class="overlay" id="overlay" onclick="toggleMenu()"></div>

    <div class="sidebar" id="sidebar">
        <h2 style="color:var(--accent); margin-bottom:40px;">${brand}</h2>
        <button class="nav-item active" onclick="nav('Dashboard')">📊 IRÁNYÍTÓPULT</button>
        <button class="nav-item" onclick="nav('${conf.menu}')">📂 ${conf.menu.toUpperCase()}</button>
        <button class="nav-item pro-only" onclick="nav('Dokumentumok')">📁 DOKUMENTUMOK</button>
        <button class="nav-item premium-only" onclick="nav('Pénzügyek')">💳 PÉNZÜGYEK</button>
        <button onclick="location.reload()" style="margin-top:auto; background:transparent; border:1px solid #ef4444; color:#ef4444; padding:10px; cursor:pointer; font-weight:800;">KILÉPÉS</button>
    </div>

    <div class="main">
        <div class="card">
            <h2>Új rögzítése</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <input type="text" id="f1" placeholder="${conf.f1}">
                <input type="text" id="f2" placeholder="${conf.f2}">
                <input type="date" id="d">
            </div>
            <div class="pro-only"><textarea id="notes" placeholder="Megjegyzések..."></textarea></div>
            <div class="premium-only"><input type="number" id="amt" placeholder="Összeg Ft"></div>
            <button class="save-btn" onclick="save()">MENTÉS</button>
        </div>
        <div style="overflow-x:auto;">
            <table>
                <thead><tr><th>${conf.f1}</th><th>${conf.f2}</th><th>Dátum</th><th>Állapot</th><th></th></tr></thead>
                <tbody id="list"></tbody>
            </table>
        </div>
    </div>

    <script>
        function toggleMenu() {
            const sb = document.getElementById('sidebar');
            const ov = document.getElementById('overlay');
            sb.classList.toggle('open');
            ov.classList.toggle('active');
        }

        function nav(page) {
            console.log("Navigáció: " + page);
            if(window.innerWidth < 900) toggleMenu(); // Kattintás után bezárjuk mobilon
            // Itt adhatsz hozzá alert-et vagy nézetváltást
        }

        function check() {
            if(document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none';
                load();
            } else { alert("Hibás jelszó!"); }
        }

        async function save() {
            const body = { f1: document.getElementById('f1').value, f2: document.getElementById('f2').value, d: document.getElementById('d').value, notes: document.getElementById('notes')?.value || '', amount: document.getElementById('amt')?.value || 0 };
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            load();
        }

        async function load() {
            const res = await fetch('/api/c');
            const data = await res.json();
            document.getElementById('list').innerHTML = data.map(i => \`
                <tr>
                    <td style="font-weight:600">\${i.f1}</td><td>\${i.f2}</td><td>\${i.d}</td>
                    <td style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}; font-weight:800;">\${i.status.toUpperCase()}</td>
                    <td style="text-align:right;"><button onclick="upd('\${i._id}')" style="background:#10b981; color:white; border:none; padding:5px 10px; cursor:pointer;">OK</button></td>
                </tr>\`).join('');
        }
        async function upd(id) { await fetch('/api/c/'+id, {method:'PUT'}); load(); }
    </script>
</body>
</html>
    `);
});

app.get('/api/c', async (req, res) => res.json(await Client.find().sort({d: 1})));
app.post('/api/c', async (req, res) => { await new Client(req.body).save(); res.json({ok: true}); });
app.put('/api/c/:id', async (req, res) => { await Client.findByIdAndUpdate(req.params.id, {status: 'Kész'}); res.json({ok: true}); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("ONLINE"));