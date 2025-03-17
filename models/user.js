const db = require('../database/db'); // Adjust according to your structure

// User model
class User {
    // Creates a user in the main 'users' table
    static create(name, email, phone, password, role, callback) {
        const sql = 'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, email, phone, password, role], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    } 

    // Finds a user by email and password for login
    static find(email, password, callback) {
        const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
        db.query(sql, [email, password], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }

    // Saves a pending registration for admin approval
    static savePendingRegistration(userData, callback) {
        const sql = 'INSERT INTO pending_registrations (name, email, phone, password) VALUES (?, ?, ?, ?)';
        db.query(sql, [userData.name, userData.email, userData.phone, userData.password], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }

// Gets all pending registrations for admin approval
static getAllPendingRegistrations(callback) {
    const sql = 'SELECT * FROM pending_registrations';
    db.query(sql, (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
}

    // Approves a pending registration and moves it to the 'users' table
    static approvePendingRegistration(id, callback) {
        // First, fetch the pending registration data by ID
        const selectSql = 'SELECT * FROM pending_registrations WHERE id = ?';
        db.query(selectSql, [id], (err, result) => {
            if (err) return callback(err);
            if (result.length === 0) return callback(new Error('Pending registration not found'));

            const { name, email, phone, password } = result[0];
            // Insert approved user into the 'users' table
            const insertSql = 'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)';
            db.query(insertSql, [name, email, phone, password, 'user'], (insertErr, insertResult) => {
                if (insertErr) return callback(insertErr);

                // Remove the entry from 'pending_registrations' table after approval
                const deleteSql = 'DELETE FROM pending_registrations WHERE id = ?';
                db.query(deleteSql, [id], (deleteErr) => {
                    if (deleteErr) return callback(deleteErr);
                    callback(null, insertResult);
                });
            });
        });
    }

    // Rejects a pending registration, removing it from 'pending_registrations'
    static rejectPendingRegistration(id, callback) {
        const sql = 'DELETE FROM pending_registrations WHERE id = ?';
        db.query(sql, [id], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }

    // Updates a user's reset token and expiration for password reset
    static updateResetToken(email, token, callback) {
        const sql = 'UPDATE users SET resetToken = ?, resetTokenExpiration = ? WHERE email = ?';
        const expiration = new Date(Date.now() + 3600000); // Token expires in 1 hour
        db.query(sql, [token, expiration, email], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }

    // Finds a user by reset token and checks if the token is still valid
    static findByResetToken(token, callback) {
        const sql = 'SELECT * FROM users WHERE resetToken = ? AND resetTokenExpiration > NOW()';
        db.query(sql, [token], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }

    // Updates the user's password and clears the reset token after password reset
    static updatePassword(email, newPassword, callback) {
        const sql = 'UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiration = NULL WHERE email = ?';
        db.query(sql, [newPassword, email], (err, result) => {
            if (err) return callback(err);
            callback(null, result);
        });
    }
}

module.exports = User;
