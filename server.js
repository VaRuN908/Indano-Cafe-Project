const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;

// ── Admin Credentials ──
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

// Store active admin sessions (in-memory)
const adminSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the "Indiano cafe" folder
app.use(express.static(path.join(__dirname, 'Indiano cafe')));
app.use('/uploads', express.static(process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads')));

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.VERCEL ? '/tmp/uploads/' : 'uploads/';
        if (process.env.VERCEL && !fs.existsSync('/tmp/uploads/')) {
            fs.mkdirSync('/tmp/uploads/', { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Initialize SQLite Database
let dbPath = path.resolve(__dirname, 'users.db');
if (process.env.VERCEL) {
    dbPath = '/tmp/users.db';
    if (!fs.existsSync(dbPath) && fs.existsSync(path.resolve(__dirname, 'users.db'))) {
        try {
            fs.copyFileSync(path.resolve(__dirname, 'users.db'), dbPath);
        } catch (err) {
            console.error('Error copying database in Vercel environment:', err);
        }
    }
}
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create the users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table ready.');
            }
        });
    }
});

// Helper validation functions
const isValidUsername = (username) => typeof username === 'string' && username.trim().length >= 3;
const isValidEmail = (email) => typeof email === 'string' && email.includes('@');
const isValidPassword = (password) => typeof password === 'string' && password.length >= 8 && password.length <= 72;

// ============================================
// SIGNUP ROUTE
// ============================================
app.post('/auth/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!isValidUsername(username) || !isValidEmail(email) || !isValidPassword(password)) {
        return res.status(400).json({ error: 'Invalid input. Username must be 3+ chars, password must be 8+ chars.' });
    }

    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.run(sql, [username.trim(), email.trim(), hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(409).json({ error: 'Username is already taken.' });
                }
                if (err.message.includes('UNIQUE constraint failed: users.email')) {
                    return res.status(409).json({ error: 'Email is already registered.' });
                }
                console.error(err);
                return res.status(500).json({ error: 'Internal server error during signup.' });
            }
            
            res.status(201).json({ 
                success: true, 
                message: 'Account created successfully!',
                user: { id: this.lastID, username }
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error while processing signup.' });
    }
});

// ============================================
// LOGIN ROUTE
// ============================================
app.post('/auth/login', (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Please provide your username/email and password.' });
    }

    // Auto-detect: if it contains '@', search by email; otherwise by username
    const isEmail = identifier.includes('@');
    const sql = isEmail
        ? `SELECT * FROM users WHERE email = ?`
        : `SELECT * FROM users WHERE username = ?`;
    
    db.get(sql, [identifier.trim()], async (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error during login.' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'No account found. Please sign up first!' });
        }

        try {
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect password. Please try again.' });
            }

            res.json({ 
                success: true, 
                message: 'Login successful!',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error while verifying credentials.' });
        }
    });
});

// ============================================
// ADMIN LOGIN
// ============================================
app.post('/auth/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.set(token, { loginTime: Date.now() });
        return res.json({ success: true, token });
    }

    return res.status(401).json({ error: 'Invalid admin credentials.' });
});

// Admin auth middleware
const requireAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (!token || !adminSessions.has(token)) {
        return res.status(403).json({ error: 'Unauthorized. Please log in as admin.' });
    }
    const session = adminSessions.get(token);
    if (Date.now() - session.loginTime > 24 * 60 * 60 * 1000) {
        adminSessions.delete(token);
        return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }
    next();
};

// Periodically clean up expired admin sessions (every hour)
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of adminSessions.entries()) {
        if (now - session.loginTime > 24 * 60 * 60 * 1000) {
            adminSessions.delete(token);
        }
    }
}, 60 * 60 * 1000);

// ============================================
// ADMIN API — GET ALL USERS (protected)
// ============================================
app.get('/auth/admin/users', requireAdmin, (req, res) => {
    const sql = `SELECT id, username, email, created_at FROM users ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to retrieve users.' });
        }
        res.json({ success: true, users: rows, total: rows.length });
    });
});

// ============================================
// MENU ITEMS API
// ============================================

// Initialize menu_items table
db.run(`CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    image_url TEXT
)`, (err) => {
    if (err) console.error('Error creating menu_items table:', err.message);
    else console.log('Menu items table ready.');
});

// GET all menu items
app.get('/api/menu', (req, res) => {
    const sql = `SELECT * FROM menu_items ORDER BY category ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch menu.' });
        res.json({ success: true, menu: rows });
    });
});

// GET items by category
app.get('/api/menu/:category', (req, res) => {
    const category = req.params.category;
    const sql = `SELECT * FROM menu_items WHERE category = ?`;
    db.all(sql, [category], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch category menu.' });
        res.json({ success: true, menu: rows });
    });
});

// ADMIN: Add menu item
app.post('/api/admin/menu', requireAdmin, (req, res) => {
    const { name, price, description, category, image_url } = req.body;
    if (!name || !price || !category) {
        return res.status(400).json({ error: 'Name, price and category are required.' });
    }
    const sql = `INSERT INTO menu_items (name, price, description, category, image_url) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [name, price, description, category, image_url], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to add item.' });
        res.status(201).json({ success: true, id: this.lastID });
    });
});

// ADMIN: Upload menu item image
app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

// ADMIN: Update menu item
app.put('/api/admin/menu/:id', requireAdmin, (req, res) => {
    const { name, price, description, category, image_url } = req.body;
    const { id } = req.params;
    const sql = `UPDATE menu_items SET name = ?, price = ?, description = ?, category = ?, image_url = ? WHERE id = ?`;
    db.run(sql, [name, price, description, category, image_url, id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update item.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Item not found.' });
        res.json({ success: true, message: 'Item updated.' });
    });
});

// ADMIN: Delete menu item
app.delete('/api/admin/menu/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM menu_items WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to delete item.' });
        res.json({ success: true, message: 'Item deleted.' });
    });
});

// Dummy Purchase Route
app.post('/api/purchase', (req, res) => {
    const { items, total } = req.body;
    console.log('Purchase recorded:', items, total);
    res.json({ success: true, message: 'Purchase successful! Thank you for ordering from Indiano Cafe.' });
});

// ============================================
// ADMIN API — DELETE A USER (protected)
// ============================================
app.delete('/auth/admin/users/:id', requireAdmin, (req, res) => {
    const userId = req.params.id;
    const sql = `DELETE FROM users WHERE id = ?`;
    db.run(sql, [userId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete user.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ success: true, message: 'User deleted successfully.' });
    });
});

// Start the server
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Indiano Cafe Server running on http://localhost:${PORT}`);
        console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
    });
}
module.exports = app;
