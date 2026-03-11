const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const crypto = require('crypto');

const app = express();
const PORT = 3000;

// ── Admin Credentials ──
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin1234';

// Store active admin sessions (in-memory)
const adminSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the "Indiano cafe" folder
app.use(express.static(path.join(__dirname, 'Indiano cafe')));

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, 'users.db');
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
const isValidPassword = (password) => typeof password === 'string' && password.length >= 8;

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
    next();
};

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
app.listen(PORT, () => {
    console.log(`Indiano Cafe Server running on http://localhost:${PORT}`);
    console.log(`Admin Dashboard: http://localhost:${PORT}/admin.html`);
});
