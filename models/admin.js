const db = require('../database/db');

const Admin = {
    find: (email, password, callback) => {
        const sql = 'SELECT * FROM admins WHERE email = ? AND password = ?';
        db.query(sql, [email, password], callback);
    }
};
 
module.exports = Admin;
  