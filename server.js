const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. ADATBÁZIS ---
mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

const Client = mongoose.model('Client', new mongoose.Schema({
    field1: String, // Dinamikus mező (pl. Név vagy Ügyfél)
    field2: String, // Dinamikus mező (pl. Rendszám vagy Ügyszám)
    deadline: String,
    status: { type: String, default: 'Aktív' },
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. IPARÁG SPECIFIKUS BEÁLLÍTÁSOK ---
const getIndustryConfig = (ind) => {
    const configs = {
        'szerviz': { f1: 'Tulajdonos', f2: 'Rendszám / Típus', menu1: 'Járművek', title: 'Szerviz Napló' },
        'ugyved': { f1: 'Ügyfél neve', f2: 'Ügyszám / Tárgy', menu1: 'Akták', title: 'Ügyvédi Nyilvántartó' },
        'ingatlan': { f1: 'Érdeklődő', f2: 'Ingatlan címe', menu1: 'Ingatlanok', title: 'Ingatlan CRM' },
        'default': { f1: 'Ügyfél', f2: 'Projekt / Feladat', menu1: 'Ügyfelek', title: 'Általános CRM' }
    };
    return configs[ind] || configs['default'];
};

// --- 3. A DINAMIKUS PANEL ---
app.get('/', (req, res) => {
    const ind = process.env.INDUSTRY || 'default';
    const conf = getIndustryConfig(ind);
    const theme = process.env.THEME_COLOR || '#3b82f6';
    const brand = process.env.BRAND_NAME || conf.title;

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8"><title>${brand}</title>
    <style>
        :root { --main: ${theme}; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; }
        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; height: 100vh; }
        .sidebar { width: 260px; background: #0f172a; border-right: 1px solid #334155; padding: 20px; display: flex; flex-direction: column; }
        .nav-item { padding: 12px; cursor: pointer; border-radius: 8px; color: #94a3b8; margin: 4px 0; }
        .nav-item.active { background: var(--main); color: white; }
        .main { flex: 1; padding: 40px; overflow-y: auto; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; margin-bottom: 20px; }
        input, button { padding: 12px; border-radius: 6px; border: 1px solid #334155; margin-right: 10px; }
        input { background: var(--bg); color: white; }
        button { background: var(--main); color: white; border: none; font-weight: bold; cursor: pointer; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #334155; }
        #login-page { position: fixed; inset: 0; background: var(--bg); z-index: 100; display: flex; justify-content: center; align-items: center; }
    </style>
</head>
<body>
    <div id="login-page"><div class="card" style="width: 300px; text-align: center;">
        <h2>${brand}</h2>
        <input type="password" id="p" placeholder="Mester Jelszó" style="width: 100%; margin-bottom: 10px;">
        <button onclick="login()" style="width: 100%;">BELÉPÉS</button>
    </div></div>

    <div class="sidebar">
        <h2 style="color: var(--main)">${brand}</h2>
        <div class="nav-item active">📊 Dashboard</div>
        <div class="nav-item">📂 ${conf.menu1}</div>
        <div class="nav-item">📅 Határidők</div>
        <button onclick="location.reload()" style="margin-top: auto; background: #ef4444;">Kijelentkezés</button>
    </div>

    <div class="main">
        <h1>Üdvözöljük!</h1>
        <div class="card">
            <h3>Új rögzítése</h3>
            <input type="text" id="f1" placeholder="${conf.f1}">
            <input type="text" id="f2" placeholder="${conf.f2}">
            <input type="date" id="d">
            <button onclick="save()">+ Mentés</button>
        </div>
        <table class="card">
            <thead><tr><th>${conf.f1}</th><th>${conf.f2}</th><th>Határidő</th><th>Státusz</th><th>Művelet</th></tr></thead>
            <tbody id="list"></tbody>
        </table>
    </div>

    <script>
        function login() {
            if(document.getElementById('p').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login-page').style.display = 'none';
                load();
            } else { alert("Hibás jelszó!"); }
        }

        async function save() {
            await fetch('/api/clients', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ field1: document.getElementById('f1').value, field2: document.getElementById('f2').value, deadline: document.getElementById('d').value })
            });
            load();
        }

        async function load() {
            const res = await fetch('/api/clients');
            const data = await res.json();
            document.getElementById('list').innerHTML = data.map(i => \`
                <tr>
                    <td>\${i.field1}</td><td>\${i.field2}</td><td>\${i.deadline}</td>
                    <td><span style="color: \${i.status === 'Kész' ? '#10b981' : '#f59e0b'}">\${i.status}</span></td>
                    <td>
                        <button onclick="update('\${i._id}')" style="background: #10b981; padding: 5px;">✔</button>
                        <button onclick="del('\${i._id}')" style="background: #ef4444; padding: 5px;">✘</button>
                    </td>
                </tr>\`).join('');
        }

        async function update(id) { await fetch('/api/clients/'+id, {method: 'PUT'}); load(); }
        async function del(id) { if(confirm('Törlés?')) { await fetch('/api/clients/'+id, {method: 'DELETE'}); load(); } }
    </script>
</body>
</html>
    `);
});

// --- 4. API ---
app.get('/api/clients', async (req, res) => res.json(await Client.find().sort({deadline: 1})));
app.post('/api/clients', async (req, res) => { await new Client(req.body).save(); res.json({ok: true}); });
app.put('/api/clients/:id', async (req, res) => { await Client.findByIdAndUpdate(req.params.id, {status: 'Kész'}); res.json({ok: true}); });
app.delete('/api/clients/:id', async (req, res) => { await Client.findByIdAndDelete(req.params.id); res.json({ok: true}); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("MASTER CRM RUNNING"));