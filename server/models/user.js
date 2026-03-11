const db = require('../database');
const bcrypt = require('bcryptjs');

class User {
    static create(username, email, password, callback) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return callback(err);
            db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash], function(err) {
                if (err) return callback(err);
                callback(null, { id: this.lastID, username, email });
            });
        });
    }

    static findByUsername(username, callback) {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) return callback(err);
            callback(null, row);
        });
    }

    static findByEmail(email, callback) {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) return callback(err);
            callback(null, row);
        });
    }

    static verifyPassword(password, hashedPassword, callback) {
        bcrypt.compare(password, hashedPassword, (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }
}

module.exports = User;
