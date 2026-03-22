const User = require('../models/user');

exports.signup = (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    
    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ message: 'Password must be between 8 and 72 characters long.' });
    }

    User.findByUsername(username, (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err.message });
        if (user) return res.status(409).json({ message: 'Username already taken.' });

        User.findByEmail(email, (err, userByEmail) => {
            if (err) return res.status(500).json({ message: 'Database error.', error: err.message });
            if (userByEmail) return res.status(409).json({ message: 'Email already registered.' });

            User.create(username, email, password, (err, newUser) => {
                if (err) return res.status(500).json({ message: 'Error creating user.', error: err.message });
                res.status(201).json({ message: 'User registered successfully!', user: { id: newUser.id, username: newUser.username, email: newUser.email } });
            });
        });
    });
};

exports.login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    User.findByEmail(email, (err, user) => {
        if (err) return res.status(500).json({ message: 'Database error.', error: err.message });
        if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

        User.verifyPassword(password, user.password, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'Error verifying password.', error: err.message });
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });

            res.status(200).json({ message: 'Logged in successfully!', user: { id: user.id, username: user.username, email: user.email } });
        });
    });
};
