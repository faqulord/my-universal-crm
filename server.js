const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Statikus fájlok kiszolgálása (pl. ha később képeket teszel be egy mappába)
app.use(express.static(__dirname));

// Főoldal betöltése
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`A szerver fut a ${port}-es porton!`);
});