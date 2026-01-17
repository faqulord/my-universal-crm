const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB hiba"));

const Client = mongoose.model('Client', new mongoose.Schema({
    f1: String, f2: String, d: String, status: { type: String, default: 'Aktív' }
}));

const getIndustry = (i) => {
    const c = {
        'szerviz': { f1: 'Tulajdonos', f2: 'Rendszám', t: 'Szerviz Manager' },
        'ugyved': { f1: 'Ügyfél', f2: 'Ügyszám', t: 'Ügyvédi CRM' },
        'default': { f1: 'Partner', f2: 'Projekt', t: 'Business CRM' }
    };
    return c[i] || c['default'];
};

app.get('/', (req, res) => {
    const ind = process.env.INDUSTRY || 'default';
    const conf = getIndustry(ind);
    const theme = process.env.THEME_COLOR || '#000000'; // Letisztult fekete/szürke alap

    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${process.env.BRAND_NAME || conf.t}</title>
    <style>
        :root { --accent: ${theme}; --bg: #ffffff; --text: #1a1a1a; --border: #e2e8f0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; min-height: 100vh; }
        
        /* HEADER & NAVIGATION */
        header { padding: 15px 25px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: #fff; position: sticky; top: 0; z-index: 10; }
        .logo { font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); }
        
        /* CONTAINER */
        .container { padding: 20px; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
        
        /* FORM SECTION */
        .input-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; background: #f8fafc; padding: 20px; border: 1px solid var(--border); border-radius: 0px; margin-bottom: 30px; }
        input { padding: 12px; border: 1px solid var(--border); font-size: 14px; outline: none; border-radius: 0px; }
        button { padding: 12px 24px; background: var(--accent); color: white; border: none; cursor: pointer; font-weight: 600; text-transform: uppercase; font-size: 12px; }
        
        /* TABLE SECTION */
        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b; padding: 15px 10px; border-bottom: 2px solid var(--border); }
        td { padding: 15px 10px; border-bottom: 1px solid var(--border); font-size: 14px; }
        
        /* MOBILE OPTIMIZATION */
        @media (max-width: 600px) {
            header { flex-direction: column; gap: 10px; }
            .input-group { grid-template-columns: 1fr; }
            th { display: none; }
            td { display: block; padding: 10px 0; border: none; }
            tr { display: block; padding: 20px 0; border-bottom: 1px solid var(--border); }
            td::before { content: attr(data-label); font-weight: bold; display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; }
        }

        /* LOGIN */
        #login { position: fixed; inset: 0; background: #fff; z-index: 100; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    </style>
</head>
<body>
    <div id="login">
        <h1 class="logo">${process.env.BRAND_NAME || conf.t}</h1>
        <input type="password" id="pw" placeholder="Jelszó" style="width: 250px; margin-bottom: 10px;">
        <button onclick="check()">Belépés</button>
    </div>

    <header>
        <div class="logo">${process.env.BRAND_NAME || conf.t}</div>
        <button onclick="location.reload()" style="background:transparent; color:#64748b; border: 1px solid #64748b;">Kijelentkezés</button>
    </header>

    <div class="container">
        <div class="input-group">
            <input type="text" id="f1" placeholder="${conf.f1}">
            <input type="text" id="f2" placeholder="${conf.f2}">
            <input type="date" id="d">
            <button onclick="save()">Rögzítés</button>
        </div>

        <div class="table-wrapper">
            <table>
                <thead><tr><th>${conf.f1}</th><th>${conf.f2}</th><th>Határidő</th><th>Állapot</th><th></th></tr></thead>
                <tbody id="list"></tbody>
            </table>
        </div>
    </div>

    <script>
        function check() {
            if(document.getElementById('pw').value === '${process.env.ADMIN_PASS}') {
                document.getElementById('login').style.display='none';
                load();
            } else { alert("Hiba!"); }
        }

        async function save() {
            const body = { f1: document.getElementById('f1').value, f2: document.getElementById('f2').value, d: document.getElementById('d').value };
            await fetch('/api/c', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
            load();
        }

        async function load() {
            const res = await fetch('/api/c');
            const data = await res.json();
            document.getElementById('list').innerHTML = data.map(i => \`
                <tr>
                    <td data-label="${conf.f1}">\${i.f1}</td>
                    <td data-label="${conf.f2}">\${i.f2}</td>
                    <td data-label="Határidő">\${i.d}</td>
                    <td data-label="Állapot" style="color:\${i.status==='Kész'?'#10b981':'#f59e0b'}">\${i.status}</td>
                    <td style="text-align:right;">
                        <button onclick="upd('\${i._id}')" style="background:#10b981; padding:5px 10px;">OK</button>
                        <button onclick="del('\${i._id}')" style="background:#ef4444; padding:5px 10px;">X</button>
                    </td>
                </tr>\`).join('');
        }

        async function upd(id) { await fetch('/api/c/'+id, {method:'PUT'}); load(); }
        async function del(id) { if(confirm('Törlés?')) { await fetch('/api/c/'+id, {method:'DELETE'}); load(); } }
    </script>
</body>
</html>
    `);
});

app.get('/api/c', async (req, res) => res.json(await Client.find().sort({d: 1})));
app.post('/api/c', async (req, res) => { await new Client(req.body).save(); res.json({ok: true}); });
app.put('/api/c/:id', async (req, res) => { await Client.findByIdAndUpdate(req.params.id, {status: 'Kész'}); res.json({ok: true}); });
app.delete('/api/c/:id', async (req, res) => { await Client.findByIdAndDelete(req.params.id); res.json({ok: true}); });

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("ONLINE"));