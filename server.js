const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. RAILWAY BELSŐ ADATBÁZIS BEKÖTÉSE ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Adatbázis ONLINE"))
    .catch(err => console.log("DB Hiba: ", err));

// Ügyfél modell (Pl. autószervizhez)
const Client = mongoose.model('Client', new mongoose.Schema({
    name: String,
    car: String,
    status: String,
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. A CRM PANEL (LOGIN + DASHBOARD EGYBEN) ---
app.get('/', (req, res) => {
    const theme = process.env.THEME_COLOR || '#3b82f6';
    const brand = process.env.BRAND_NAME || 'CRM';

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${brand}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: sans-serif; background: #0f172a; color: white; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: auto; }
        .card { background: #1e293b; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border-top: 5px solid ${theme}; }
        input, select { padding: 10px; margin: 5px; border-radius: 5px; border: none; background: #0f172a; color: white; width: 100%; box-sizing: border-box; }
        button { padding: 10px 20px; background: ${theme}; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
        #login-view { display: block; max-width: 350px; margin: 100px auto; }
        #crm-view { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div id="login-view" class="card">
            <h2>${brand} LOGIN</h2>
            <input type="text" id="user" placeholder="Admin név">
            <input type="password" id="pass" placeholder="Jelszó">
            <button onclick="login()">BELÉPÉS</button>
        </div>

        <div id="crm-view">
            <div class="card">
                <h2>Üdvözöljük a ${brand} panelen!</h2>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <input type="text" id="cName" placeholder="Ügyfél neve" style="flex: 1;">
                    <input type="text" id="cCar" placeholder="Rendszám / Autó" style="flex: 1;">
                    <button onclick="addClient()" style="width: auto;">+ Hozzáadás</button>
                </div>
            </div>
            <table class="card">
                <thead><tr><th>Név</th><th>Autó</th><th>Időpont</th></tr></thead>
                <tbody id="clientList"></tbody>
            </table>
            <button onclick="location.reload()" style="background: #475569; margin-top: 20px;">Kijelentkezés</button>
        </div>
    </div>

    <script>
        // BELÉPÉS
        async function login() {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ user: document.getElementById('user').value, pass: document.getElementById('pass').value })
            });
            const data = await res.json();
            if(data.success) {
                document.getElementById('login-view').style.display = 'none';
                document.getElementById('crm-view').style.display = 'block';
                loadClients();
            } else { alert("Hibás adatok!"); }
        }

        // ÜGYFÉL HOZZÁADÁSA A RAILWAY DB-BE
        async function addClient() {
            await fetch('/api/clients', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: document.getElementById('cName').value, car: document.getElementById('cCar').value })
            });
            document.getElementById('cName').value = '';
            document.getElementById('cCar').value = '';
            loadClients();
        }

        // LISTA LEKÉRÉSE
        async function loadClients() {
            const res = await fetch('/api/clients');
            const clients = await res.json();
            const list = document.getElementById('clientList');
            list.innerHTML = clients.map(c => \`<tr><td>\${c.name}</td><td>\${c.car}</td><td>\${new Date(c.createdAt).toLocaleDateString()}</td></tr>\`).join('');
        }
    </script>
</body>
</html>
    `);
});

// --- 3. API ÚTVONALAK ---

// Login (Railway Variables alapján)
app.post('/auth/login', (req, res) => {
    if (req.body.user === process.env.ADMIN_USER && req.body.pass === process.env.ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// Ügyfelek mentése
app.post('/api/clients', async (req, res) => {
    const newClient = new Client(req.body);
    await newClient.save();
    res.json({ success: true });
});

// Ügyfelek lekérése
app.get('/api/clients', async (req, res) => {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("CRM ONLINE"));