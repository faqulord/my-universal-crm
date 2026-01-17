const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- ADATBÁZIS KAPCSOLÓDÁS (HÁTTÉRBEN) ---
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log(">>> MONGODB OK"))
    .catch(err => console.log(">>> MONGODB HIBA (Nézd meg a Railway Variables-t!)"));

const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

// --- A TELJES WEBOLDAL (EGYBŐL BEJÖN) ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profi Ügyfélkezelő</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; margin: 0; color: white; }
        .card { background: #16213e; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 100%; max-width: 350px; text-align: center; border: 1px solid #0f3460; }
        input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: none; background: #0f3460; color: white; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #e94560; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 1.1rem; margin-top: 10px; }
        #status { margin-top: 15px; font-size: 0.9rem; color: #aaa; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Bejelentkezés</h2>
        <input type="email" id="email" placeholder="Email cím">
        <input type="password" id="pass" placeholder="Jelszó">
        <button onclick="login()">BELÉPÉS</button>
        <div id="status">Rendszer készenlétben</div>
    </div>
    <script>
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('pass').value;
            const status = document.getElementById('status');
            
            status.innerText = "Ellenőrzés...";
            try {
                const res = await fetch(window.location.origin + '/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    status.style.color = "#4ee44e";
                    status.innerText = "SIKER! Belépés...";
                    localStorage.setItem('token', data.token);
                    alert("Sikeres belépés!");
                } else {
                    status.style.color = "#ff4d4d";
                    status.innerText = data.message || "Hiba!";
                }
            } catch (e) {
                status.innerText = "Szerver hiba! (Nézd a LOG-ot)";
            }
        }
    </script>
</body>
</html>
    `);
});

// --- LOGIN ÚTVONAL ---
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ success: true, token });
        }
        res.status(401).json({ success: false, message: "Hibás adatok!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// REGISZTRÁCIÓ (Csak hogy legyen teszt adatod)
app.post('/auth/register', async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = new User({ email: req.body.email, password: hash });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("ONLINE"));