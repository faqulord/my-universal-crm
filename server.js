const express = require('express');
const app = express();
const path = require('path');

app.use(express.static('public'));

app.get('/api/config', (req, res) => {
    res.json({
        brandName: process.env.BRAND_NAME || 'Ügyfél CRM',
        industry: process.env.INDUSTRY || 'SZERVIZ',
        color: process.env.THEME_COLOR || '#007bff'
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Szerver fut'));
