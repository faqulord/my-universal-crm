const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- DINAMIKUS CSATLAKOZÁS ---
// Itt nem írunk be nevet! A process.env.MONGO_URI mindent tartalmaz.
const mongoURI = process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("Rendszer aktív: Az ügyfél adatbázisa csatlakoztatva!"))
    .catch(err => console.error("Adatbázis hiba:", err));

// FELHASZNÁLÓ MODELL (Univerzális)
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}));

// BEJELENTKEZÉS LOGIKA
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
            return res.json({ success: true, token });
        }
        res.status(401).json({ success: false, message: "Hibás belépési adatok!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Szerver hiba" });
    }
});

// REGISZTRÁCIÓ (Hogy az ügyfél létrehozhassa az első adminját)
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ email: req.body.email, password: hashedPassword });
        await newUser.save();
        res.json({ success: true, message: "Ügyfél regisztrálva!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Regisztrációs hiba" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Szerver fut a ${PORT} porton`));