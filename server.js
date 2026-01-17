const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. RAILWAY ADATBÁZIS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("DB: Online"))
    .catch(err => console.log("DB Hiba: ", err));

// Ügyfél Modell: Név, Autó/Tárgy, Határidő, Státusz
const Client = mongoose.model('Client', new mongoose.Schema({
    name: String,
    task: String,
    deadline: String,
    status: { type: String, default: 'Folyamatban' },
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. A PROFI CRM INTERFÉSZ ---
app.get('/', (req, res) => {
    const theme = process.env.THEME_COLOR || '#3b82f6';
    const brand = process.env.BRAND_NAME || 'Master CRM';

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${brand} | CRM</title>
    <style>
        :root { --main: ${theme}; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; }
        body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; height: 100vh; overflow: hidden; }
        
        /* SIDEBAR */
        .sidebar { width: 250px; background: #111827; display: flex; flex-direction: column; padding: 20px; border-right: 1px solid #334155; }
        .sidebar h2 { color: var(--main); margin-bottom: 30px; font-size: 1.5rem; text-align: center; }
        .nav-item { padding: 12px; margin: 5px 0; cursor: pointer; border-radius: 8px; transition: 0.3s; color: #94a3b8; text-decoration: none; }
        .nav-item:hover, .nav-item.active { background: var(--main); color: white; }

        /* MAIN CONTENT */
        .main { flex: 1; padding: 30px; overflow-y: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .card { background: var(--card); padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); margin-bottom: 20px; }
        
        /* FORMS & TABLES */
        input, select { padding: 10px; background: var(--bg); border: 1px solid #334155; color: white; border-radius: 6px; margin: 5px; }
        button { padding: 10px 20px; background: var(--main); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; background: var(--card); border-radius: 12px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #334155; }
        th { background: rgba(255,255,255,0.05); }

        /* LOGIN VIEW */
        #login-page { position: fixed; inset: 0; background: var(--bg); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .status-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
        .status-todo { background: #f59e0b; color: #78350f; }
        .status-done { background: #10b981; color: #064e3b; }
    </style>
</head>
<body>

    <div id="login-page">
        <div class="card" style="width: 320px; text-align: center;">
            <h2>${brand} LOGIN</h2>
            <input type="text" id="user" placeholder="Admin" style="width: 90%">
            <input type="password" id="pass" placeholder="Jelszó" style="width: 90%">
            <button onclick="login()" style="width: 90%; margin-top: 15px;">BELÉPÉS</button>
        </div>
    </div>

    <div class="sidebar">
        <h2>${brand}</h2>
        <div class="nav-item active" onclick="showSection('dash')">📊 Irányítópult</div>
        <div class="nav-item" onclick="showSection('list')">👥 Ügyfelek</div>
        <div class="nav-item" onclick="showSection('deadlines')">📅 Határidők</div>
        <div style="margin-top: auto;">
            <button onclick="location.reload()" style="background: #ef4444;">Kijelentkezés</button>
        </div>
    </div>

    <div class="main">
        <div id="section-dash">
            <div class="header"><h1>Irányítópult</h1></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
                <div class="card"><h3>Összes ügyfél</h3><h1 id="stat-total">0</h1></div>
                <div class="card"><h3>Folyamatban</h3><h1 id="stat-todo">0</h1></div>
                <div class="card"><h3>Befejezett</h3><h1 id="stat-done">0</h1></div>
            </div>
        </div>

        <div id="section-list" style="display:none;">
            <div class="header"><h1>Ügyfélkezelés</h1></div>
            <div class="card">
                <h3>Új rögzítése</h3>
                <input type="text" id="cName" placeholder="Ügyfél neve">
                <input type="text" id="cTask" placeholder="Feladat / Autó">
                <input type="date" id="cDate">
                <button onclick="addClient()">+ Mentés</button>
            </div>
            <table>
                <thead><tr><th>Ügyfél</th><th>Feladat</th><th>Határidő</th><th>Státusz</th><th>Művelet</th></tr></thead>
                <tbody id="clientTable"></tbody>
            </table>
        </div>

        <div id="section-deadlines" style="display:none;">
            <div class="header"><h1>Közeli határidők</h1></div>
            <div id="deadlineList"></div>
        </div>
    </div>

    <script>
        // NAVIGATION
        function showSection(id) {
            ['dash', 'list', 'deadlines'].forEach(s => document.getElementById('section-'+s).style.display = 'none');
            document.getElementById('section-'+id).style.display = 'block';
            loadData();
        }

        // AUTH
        async function login() {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ user: document.getElementById('user').value, pass: document.getElementById('pass').value })
            });
            if(res.ok) {
                document.getElementById('login-page').style.display = 'none';
                loadData();
            } else { alert("Hibás belépés!"); }
        }

        // DATA HANDLING
        async function addClient() {
            await fetch('/api/clients', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    name: document.getElementById('cName').value, 
                    task: document.getElementById('cTask').value,
                    deadline: document.getElementById('cDate').value 
                })
            });
            loadData();
        }

        async function updateStatus(id, status) {
            await fetch('/api/clients/' + id, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ status })
            });
            loadData();
        }

        async function loadData() {
            const res = await fetch('/api/clients');
            const data = await res.json();
            
            // Stats
            document.getElementById('stat-total').innerText = data.length;
            document.getElementById('stat-todo').innerText = data.filter(c => c.status !== 'Kész').length;
            document.getElementById('stat-done').innerText = data.filter(c => c.status === 'Kész').length;

            // Table
            document.getElementById('clientTable').innerHTML = data.map(c => \`
                <tr>
                    <td>\${c.name}</td>
                    <td>\${c.task}</td>
                    <td>\${c.deadline}</td>
                    <td><span class="status-pill \${c.status === 'Kész' ? 'status-done' : 'status-todo'}">\${c.status}</span></td>
                    <td>
                        <button onclick="updateStatus('\${c._id}', 'Kész')" style="padding: 5px 10px; font-size: 0.7rem; background: #10b981;">Kész</button>
                        <button onclick="deleteClient('\${c._id}')" style="padding: 5px 10px; font-size: 0.7rem; background: #ef4444;">Törlés</button>
                    </td>
                </tr>
            \`).join('');
        }

        async function deleteClient(id) {
            if(confirm('Biztos törlöd?')) {
                await fetch('/api/clients/' + id, { method: 'DELETE' });
                loadData();
            }
        }
    </script>
</body>
</html>
    `);
});

// --- 3. API PONTOK ---
app.post('/auth/login', (req, res) => {
    if (req.body.user === process.env.ADMIN_USER && req.body.pass === process.env.ADMIN_PASS) {
        res.json({ success: true });
    } else { res.status(401).send(); }
});

app.get('/api/clients', async (req, res) => {
    const clients = await Client.find().sort({ deadline: 1 });
    res.json(clients);
});

app.post('/api/clients', async (req, res) => {
    await new Client(req.body).save();
    res.json({ success: true });
});

app.put('/api/clients/:id', async (req, res) => {
    await Client.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
});

app.delete('/api/clients/:id', async (req, res) => {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("MASTER CRM READY"));