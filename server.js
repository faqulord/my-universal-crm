const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path'); // Új: fájlok eléréséhez
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. A BELÉPŐ OLDAL MEGJELENÍTÉSE ---
// Amikor megnyitod a linket, ezt az oldalt fogod látni
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- 2. ADATBÁZIS CSATLAKOZÁS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB OK"))
    .catch(err => console.error("MongoDB hiba:", err));

// --- 3. LOGIN LOGIKA (Profi verzió) ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

app.post('/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            return res.json({ success: true, token });
        }
        res.status(401).json({ success: false, message: "Hibás adatok!" });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// Railway Port kezelés
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Fut a porton: ${PORT}`));