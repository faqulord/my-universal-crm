const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- ADATBÁZIS: Csak 5 másodpercig próbálkozik, nem fagyasztja le a kijelzőt ---
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("ADATBÁZIS: OK"))
    .catch(err => console.log("ADATBÁZIS: HIBA (Nézd meg a Railway-t!)"));

const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

// --- CRM BELÉPŐ PANEL (Beépített HTML, hogy sose legyen fehér kép) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MASTER CRM PANEL</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #0f172a; margin: 0; color: white; }
        .box { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 320px; text-align: center; }
        input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: white; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px; }
        #status { margin-top: 15px; font-size: 0.8rem; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="box">
        <h2>CRM LOGIN</h2>
        <input type="email" id="email" placeholder="Admin Email">
        <input type="password" id="pass" placeholder="Jelszó">
        <button onclick="doLogin()">BELÉPÉS</button>
        <div id="status">Rendszer üzemkész</div>
    </div>
    <script>
        async function doLogin() {
            const status = document.getElementById('status');
            status.innerText = "Kapcsolódás...";
            try {
                const res = await fetch(window.location.origin + '/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('pass').value })
                });
                const data = await res.json();
                if(data.success) { alert("Belépve!"); localStorage.setItem('token', data.token); } 
                else { status.innerText = "Hiba: " + data.message; }
            } catch(e) { status.innerText = "Szerver hiba!"; }
        }
    </script>
</body>
</html>
    `);
});

// --- API ÚTVONALAK ---
app.post('/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ success: true, token });
        }
        res.status(401).json({ success: false, message: "Hibás adatok!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Ez kell az ÚJ ÜGYFÉLNEK az első regisztrációhoz (titkos útvonal)
app.post('/auth/master-reg', async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = new User({ email: req.body.email, password: hash });
    await user.save();
    res.json({ success: true, message: "Ügyfél admin létrehozva!" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("CRM SZERVER ONLINE"));