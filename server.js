const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- ADATBÁZIS BEKÖTÉS ---
mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

const ClientSchema = new mongoose.Schema({
    f1: String, f2: String, d: String, 
    status: { type: String, default: 'Aktív' },
    notes: String, // Pro/Premium mező
    amount: Number // Premium mező
});
const Client = mongoose.model('Client', ClientSchema);

// --- IPARÁG ÉS CSOMAG LOGIKA ---
const getConfig = () => {
    const ind = process.env.INDUSTRY || 'default';
    const plan = process.env.PLAN || 'basic';
    
    const industries = {
        'szerviz': { f1: 'Tulajdonos', f2: 'Rendszám/Típus', menu: 'Járművek' },
        'ugyved': { f1: 'Ügyfél neve', f2: 'Ügyszám/Tárgy', menu: 'Ügyek/Akták' },
        'default': { f1: 'Ügyfél', f2: 'Projekt/Feladat', menu: 'Ügyfelek' }
    };

    return {
        ...industries[ind] || industries['default'],
        isPro: plan === 'pro' || plan === 'premium',
        isPremium: plan === 'premium'
    };
};

// --- A MINDENTUDÓ CRM PANEL ---
app.get('/', (req, res) => {
    const conf = getConfig();
    const theme = process.env.THEME_COLOR || '#000000';
    const brand = process.env.BRAND_NAME || 'Master CRM';

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand}</title>
    <style>
        :root { --accent: ${theme}; --bg: #ffffff; --card: #f8fafc; --border: #e2e8f0; }
        body { font-family: sans-serif; margin: 0; display: flex; height: 100vh; background: var(--bg); }
        
        /* SIDEBAR */
        .sidebar { width: 240px; background: #0f172a; color: white; padding: 20px; display: flex; flex-direction: column; }
        .nav-item { padding: 12px; cursor: pointer; border-radius: 6px; color: #94a3b8; margin-bottom: 5px; }
        .nav-item.active { background: var(--accent); color: white; }
        .nav-item:hover { background: rgba(255,255,255,0.1); }

        /* MAIN */
        .main { flex: 1; padding: 30px; overflow-y: auto; color: #1e293b; }
        .card { background: white; padding: 25px; border: 1px solid var(--border); margin-bottom: 20px; }
        
        input, select, textarea { padding: 12px; border: 1px solid var(--border); margin: 5px 0; width: 100%; box-sizing: border-box; }
        button { padding: 12px 20px; background: var(--accent); color: white; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 12px; }
        
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 15px; border-bottom: 2px solid var(--border); }
        td { padding: 15px; border-bottom: 1px solid var(--border); font-size: 14px; }

        /* CSOMAG SZERINTI ELREJTÉS */
        .pro-only { display: ${conf.isPro ? 'block' : 'none'}; }
        .premium-only { display: ${conf.isPremium ? 'block' : 'none'}; }

        #login { position: fixed; inset: 0; background: #fff; z-index: 1000; display: flex; justify-content: center; align-items: center; flex-direction: column; }
    </style>
</head>
<body>
    <div id="login">
        <h1 style="color:var(--accent)">${brand}</h1>
        <input type="password" id="pw" placeholder="Mester Jelszó" style="width: 260px;">
        <button onclick="check()" style="width: 260px;">Belépés</button>
    </div>

    <div class="sidebar">
        <h2 style="font-size: 18px;">${brand}</h2>
        <div class="nav-item active">📊 Dashboard</div>
        <div class="nav-item">📂 ${conf.menu}</div>
        <div class="nav-item pro-only">📁 Dokumentumok</div>
        <div class="nav-item premium-only">💳 Pénzügyek</div>
        <button onclick="location.reload()" style="margin-top:auto; background:transparent; border:1px solid #334155;">Kilépés</button>
    </div>

    <div class="main">
        <div class="card">
            <h2 style="margin-top:0">Új rögzítése</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <input type="text" id="f1" placeholder="${conf.f1}">
                <input type="text" id="f2" placeholder="${conf.f2}">
                <input type="date" id="d">
            </div>
            <div class="pro-only">
                <textarea id="notes" placeholder="Részletes megjegyzések (PRO funkció)"></textarea>
            </div>
            <div class="premium-only">
                <input type="number" id="amt" placeholder="Összeg (Ft)">
            </div>
            <button onclick="save()" style="margin-top:15px;">+ Mentés az adatbázisba</button>
        </div>

        <table>
            <thead><tr><th>${conf.f1}</th><th>${conf.f2}</th><th>Dátum</th><th>Állapot</th><th></th></tr></thead>
            <tbody id="list"></tbody>
        </table>
    </div>

    <script>
        function check() {
            if(document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none';
                load();
            } else { alert("Hiba!"); }
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
            load();
        }

        async function load() {
            const res = await fetch('/api/c');
            const data = await res.json();
            document.getElementById('list').innerHTML = data.map(i => \`
                <tr>
                    <td>\${i.f1}</td><td>\${i.f2}</td><td>\${i.d}</td>
                    <td style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}">\${i.status}</td>
                    <td><button onclick="upd('\${i._id}')">OK</button></td>
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