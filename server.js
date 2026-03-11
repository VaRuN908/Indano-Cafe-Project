const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
        // Hash the password securely with bcrypt
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert into database
        const sql = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        db.run(sql, [username.trim(), email.trim(), hashedPassword], function(err) {
            if (err) {
                // Handle unique constraint errors
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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    
    db.get(sql, [email.trim()], async (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error during login.' });
        }
        
        if (!user) {
            return res.status(401).json({ error: 'No account found with this email. Please sign up first!' });
        }

        try {
            // Compare the provided password with the hashed password in the DB
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.status(401).json({ error: 'Incorrect password. Please try again.' });
            }

            // Successful login (In a real app, you would generate a JWT token here)
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

// Start the server
app.listen(PORT, () => {
    console.log(`Auth Backend running on http://localhost:${PORT}`);
});
