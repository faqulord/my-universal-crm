const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. ÉLETJEL (Hogy lásd, működik-e a link) ---
app.get('/', (req, res) => {
    res.send(`<h1>A rendszer aktív!</h1><p>Adatbázis állapota: ${mongoose.connection.readyState === 1 ? 'Összekötve' : 'Kapcsolódás...'}</p>`);
});

// --- 2. ADATBÁZIS CSATLAKOZÁS ---
// A Railway-en megadott MONGO_URI-t használja
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Sikeres MongoDB csatlakozás!"))
    .catch(err => console.error("MongoDB hiba:", err));

// --- 3. MODEL ---
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}));

// --- 4. LOGIN ÉS REGISZTRÁCIÓ ---
app.post('/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ email: req.body.email, password: hashedPassword });
        await user.save();
        res.status(201).json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/auth/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: "Hiba!" });
    }
});

// --- 5. PORT BEÁLLÍTÁS (A Railway miatt fontos) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));