const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Adatbázis bekötve, de nem blokkolja a belépést
mongoose.connect(process.env.MONGO_URI).catch(err => console.log("DB várkozás..."));

// --- MESTER LOGIN PANEL ---
app.get('/', (req, res) => {
    // A képernyőfotódon lévő változókat használjuk a kinézethez!
    const themeColor = process.env.THEME_COLOR || '#3b82f6';
    const brandName = process.env.BRAND_NAME || 'CRM Rendszer';

    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${brandName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1e293b; padding: 30px; border-radius: 15px; width: 320px; text-align: center; border-top: 5px solid ${themeColor}; }
        input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 6px; border: none; background: #0f172a; color: white; box-sizing: border-box; }
        button { width: 100%; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; background: ${themeColor}; color: white; }
        #msg { margin-top: 15px; font-size: 0.8rem; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="card">
        <h2 style="margin-bottom: 5px;">${brandName}</h2>
        <p style="font-size: 0.8rem; margin-bottom: 20px; color: #94a3b8;">CRM LOGIN</p>
        <input type="text" id="user" placeholder="Felhasználónév">
        <input type="password" id="pass" placeholder="Jelszó">
        <button onclick="login()">BELÉPÉS</button>
        <div id="msg"></div>
    </div>
    <script>
        async function login() {
            const msg = document.getElementById('msg');
            const res = await fetch(window.location.origin + '/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    user: document.getElementById('user').value, 
                    pass: document.getElementById('pass').value 
                })
            });
            const data = await res.json();
            if(data.success) { 
                msg.innerHTML = "<span style='color: #10b981'>Sikeres belépés!</span>";
                localStorage.setItem('token', data.token);
                alert("Üdvözöljük a ${brandName} panelen!");
            } else { 
                msg.innerHTML = "<span style='color: #ef4444'>Hibás adatok!</span>";
            }
        }
    </script>
</body>
</html>
    `);
});

// --- LOGIN LOGIKA (A Railway Variables alapján) ---
app.post('/auth/login', (req, res) => {
    const { user, pass } = req.body;

    // Itt a lényeg: A Railway-en megadott ADMIN_USER és ADMIN_PASS-t nézzük!
    const masterUser = process.env.ADMIN_USER;
    const masterPass = process.env.ADMIN_PASS;

    if (user === masterUser && pass === masterPass) {
        const token = jwt.sign({ user: masterUser }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Hibás adatok!" });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log("Mester CRM Online"));