const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer'); // Ensure you have nodemailer installed
const User = require('../models/user'); // Adjust the path if necessary
const router = express.Router();

// Configure the email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Use the email service you want
    auth: {
        user: process.env.EMAIL, // Your email address from .env
        pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
});

// Serve user signup page
router.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/signup.html'));
});

router.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/index.html'));
});

// Serve admin signup page
router.get('/admin-signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/admin-signup.html'));
});

// Serve login page (for both users and admins)
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/login.html'));
});


// Serve manager signup page
router.get('/manager-signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/manager-signup.html'));
});


router.get('/cordinator-signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/cordinator-signup.html'));
});

router.get('/profile-signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/profile-signup.html'));
});


// Update the signup route
router.post('/signup', (req, res) => {
    const { name, email, phone, password } = req.body;

    // Password validation (same as before)
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.' });
    }

    // Save pending registration
    User.savePendingRegistration({ name, email, phone, password }, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error occurred during signup' });
        }
        // Notify admin - here you could emit a socket event, or send a notification through a front-end approach
        res.status(200).json({ message: 'Signup request sent to admin for approval' });
    });
});



// Admin Signup route (restricted with secret key)
router.post('/admin-signup', (req, res) => {
    const { name, email, phone, password, adminKey } = req.body;

    // Verify admin key
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid admin key' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.' });
    }

    // Register admin
    User.create(name, email, phone, password, 'admin', (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error occurred during admin signup' });
        }
        // Redirect to admin dashboard
        res.redirect('/admin');
    });
});




// Assuming the manager key is stored in your environment variables
const MANAGER_SECRET_KEY = process.env.MANAGER_SECRET_KEY;

// Signup route for managers
router.post('/manager-signup', (req, res) => {
    const { id, name, email, phone, password, managerKey } = req.body;

    // Check the manager key
    if (managerKey !== MANAGER_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid manager key' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.' });
    }

    // Register manager
    User.create(name, email, phone, password, 'manager', (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error occurred during manager signup' });
        }
        // Redirect to manager dashboard
        res.redirect('/manager');
    });
});






const CORDINATOR_SECRET_KEY = process.env.CORDINATOR_SECRET_KEY;
// Signup route for coordinators
router.post('/cordinator-signup', (req, res) => {
    const { name, email, phone, password, cordinatorKey } = req.body;

    // Check the coordinator key
    if (cordinatorKey !== CORDINATOR_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid cordinator key' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.' });
    }

    // Register coordinator
    User.create(name, email, phone, password, 'cordinator', (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error occurred during cordinator signup' });
        }
        // Redirect to coordinator dashboard
        res.redirect('/cordinator');
    });
});



const PROFILE_SECRET_KEY = process.env.PROFILE_SECRET_KEY;
// Signup route for profiles
router.post('/profile-signup', (req, res) => {
    const { name, email, phone, password, profileKey } = req.body;

    // Check the profile key
    if (profileKey !== PROFILE_SECRET_KEY) {
        return res.status(403).json({ message: 'Invalid profile key' });
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.' });
    }

    // Register profile
    User.create(name, email, phone, password, 'profile', (err, result) => {
        if (err) {
            console.error('Error during profile signup:', err); // Log the actual error
            return res.status(500).json({ message: 'Error occurred during profile signup', error: err.message });
        }
        // Redirect to profile dashboard
        res.redirect('/profile');
    });

});







// Login route (common for both users and admins)
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    User.find(email, password, (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const user = results[0];

        // Store user data in the session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        // Redirect based on role
        if (user.role === 'admin') {
            res.redirect('/admin'); // Redirect to admin dashboard
        } else if (user.role === 'manager') {
            res.redirect('/manager'); // Redirect to manager dashboard
        } else if (user.role === 'cordinator') {
            res.redirect('/cordinator'); // Redirect to manager dashboard
        } else if (user.role === 'profile') {
            res.redirect('/profile'); // Redirect to manager dashboard
        } else {
            res.redirect('/user'); // Redirect to user dashboard
        }
    });
});







// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.redirect('/auth/login');
    });
});



// Route to get session data for the current user
router.get('/user-session', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    res.json(req.session.user);
});



// Serve forgot password page
router.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/forgot-password.html'));
});

router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // Generate a reset token
    const resetToken = Math.random().toString(36).substr(2, 10);
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`; // Adjust this link as needed

    // Update the user's reset token in the database
    User.findByEmail(email, (err, user) => {
        if (err || !user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Save the reset token and expiration in the user record
        const sql = 'UPDATE users SET resetToken = ?, resetTokenExpiration = ? WHERE email = ?';
        const expirationDate = Date.now() + 3600000; // 1 hour from now

        db.query(sql, [resetToken, expirationDate, email], (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Error updating user token' });
            }

            // Send the reset link via email
            const mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: 'Password Reset Request',
                text: `You requested a password reset. Click the link to reset your password: ${resetLink}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).json({ message: 'Error sending reset email' });
                }
                res.status(200).json({ message: `Reset link sent to ${email}` });
            });
        });
    });
});

// Serve reset password page
router.get('/reset-password', (req, res) => {
    // Render your reset password page
    res.sendFile(path.join(__dirname, '../public/views/reset-password.html'));
});

// Handle reset password form submission
router.post('/reset-password', (req, res) => {
    const { token, newPassword } = req.body;

    // Verify the token and update the password
    User.findByResetToken(token, (err, user) => {
        if (err || !user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Update user's password
        User.updatePassword(user.email, newPassword, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error updating password' });
            }
            res.status(200).json({ message: 'Password reset successfully!' });
        });
    });
});

module.exports = router; 