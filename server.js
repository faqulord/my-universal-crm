const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Kapcsolódás az adatbázishoz (Railway-ről jön az URI)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Adatbázis sikeresen összekötve!"))
    .catch(err => console.error("Adatbázis hiba:", err));

// Felhasználó séma
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// --- ÚTVONALAK ---

// 1. REGISZTRÁCIÓ (Ezzel hozod létre az első admint az ügyfélnek)
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ success: true, message: "Felhasználó létrehozva!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Hiba: Lehet, hogy már létezik ez az email?" });
    }
});

// 2. BEJELENTKEZÉS
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "Nincs ilyen felhasználó!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Hibás jelszó!" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ success: true, token, message: "Sikeres belépés!" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Szerver hiba történt." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver aktív a ${PORT} porton.`));