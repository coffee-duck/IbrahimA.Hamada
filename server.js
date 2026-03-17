const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3000;

// Set up database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error connecting to database', err);
    } else {
        console.log('Connected to SQLite database.');
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS corners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imageName TEXT,
            nameEn TEXT,
            nameAr TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cornerId INTEGER,
            nameEn TEXT,
            nameAr TEXT,
            price TEXT,
            FOREIGN KEY(cornerId) REFERENCES corners(id) ON DELETE CASCADE
        )`);
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve existing HTML/CSS/JS

// Enable file uploads for images (optional for future enhancements but good to have)
const upload = multer({ dest: 'assets/images/' });

// ================= API ENDPOINTS =================

// 1. Admin Login (Simple Hardcoded Auth for demonstration)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'IbrahimA.Hamada' && password === 'admin123') { // Very basic auth
        res.json({ success: true, token: 'fake-jwt-token-for-demo' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// 2. Fetch All Corners with Items
app.get('/api/corners', (req, res) => {
    db.all(`SELECT * FROM corners`, [], (err, corners) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.all(`SELECT * FROM items`, [], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });

            // Group items by corner
            const result = corners.map(corner => {
                let cornerItems = items.filter(i => i.cornerId === corner.id);
                return { ...corner, items: cornerItems };
            });

            res.json(result);
        });
    });
});

// 3. Add a New Corner
app.post('/api/corners', (req, res) => {
    const { imageName, nameEn, nameAr } = req.body;
    const sql = `INSERT INTO corners (imageName, nameEn, nameAr) VALUES (?, ?, ?)`;
    db.run(sql, [imageName, nameEn, nameAr], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, imageName, nameEn, nameAr });
    });
});

// 4. Delete a Corner
app.delete('/api/corners/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM items WHERE cornerId = ?`, id, (err) => {
        if(err) return res.status(400).json({error: err.message});
        db.run(`DELETE FROM corners WHERE id = ?`, id, function(err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        });
    });
});

// 5. Add a New Item
app.post('/api/items', (req, res) => {
    const { cornerId, nameEn, nameAr, price } = req.body;
    const sql = `INSERT INTO items (cornerId, nameEn, nameAr, price) VALUES (?, ?, ?, ?)`;
    db.run(sql, [cornerId, nameEn, nameAr, price], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, cornerId, nameEn, nameAr, price });
    });
});

// 6. Update an Item Price/Name
app.put('/api/items/:id', (req, res) => {
    const { id } = req.params;
    const { nameEn, nameAr, price } = req.body;
    const sql = `UPDATE items SET nameEn = ?, nameAr = ?, price = ? WHERE id = ?`;
    db.run(sql, [nameEn, nameAr, price, id], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// 7. Delete an Item
app.delete('/api/items/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM items WHERE id = ?`, id, function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Coffee Duck Server running at http://localhost:${port}`);
});
