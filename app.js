const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes'); // Adjust path as needed
const managerRoutes = require('./routes/managerRoutes'); 
const userRoutes = require('./routes/userRoutes'); 
const profileRoutes = require('./routes/profileRoutes'); 
const cordinatorRoutes = require('./routes/cordinatorRoutes');
const dotenv = require('dotenv');
const User = require('./models/user'); // Import the User model for fetching pending registrations
const db = require('./database/db');
 
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;


// Configure body-parser to handle large payloads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Set static directory for serving files
app.use(express.static(path.join(__dirname, 'public')));

// Set up session and other middlewares
app.use(
    session({
        secret: 'your_secret_key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
    })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/manager', managerRoutes);
app.use('/user', userRoutes);
app.use('/profile', profileRoutes);
app.use('/cordinator', cordinatorRoutes);


// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'views', 'index.html'));
});

// Endpoint to serve pending registrations as JSON
app.get('/admin/get-pending-registrations', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send('Unauthorized');
    }

    // Fetch pending registrations from the database
    User.getAllPendingRegistrations((err, pendingRegistrations) => {
        if (err) {
            console.error('Error fetching pending registrations:', err);
            return res.status(500).json({ error: 'Error fetching data' });
        }
        res.json(pendingRegistrations); // Send the data as JSON
    });
});

// Route to approve a user registration
app.post('/admin/approve-registration/:userId', (req, res) => {
    const userId = req.params.userId;

    // Logic to approve the registration
    db.collection('pending_registrations')
        .updateOne({ _id: userId }, { $set: { status: 'approved' } })
        .then(() => res.json({ success: true }))
        .catch((error) =>
            res.status(500).json({ success: false, error: error.message })
        );
});

// Route to reject a user registration
app.post('/admin/reject-registration/:userId', (req, res) => {
    const userId = req.params.userId;

    // Logic to reject the registration
    db.collection('pending_registrations')
        .deleteOne({ _id: userId })
        .then(() => res.json({ success: true }))
        .catch((error) =>
            res.status(500).json({ success: false, error: error.message })
        );
});

// Serve admin dashboard page
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'views', 'admin-dashboard.html'));
});

// Serve manager dashboard
app.get('/manager', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'manager') {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'views', 'manager-dashboard.html'));
});

app.get('/cordinator', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'cordinator') {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'views', 'cordinator-dashboard.html'));
});

app.get('/profile', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'profile') {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'views', 'profile-dashboard.html'));
});

// Serve user dashboard
app.get('/user', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'views', 'user-dashboard.html'));
});

// Add Column
app.post('/admin/add-column', (req, res) => {
    const { columnName } = req.body;

    if (!columnName) {
        return res.status(400).json({ success: false, message: 'Column name is required' });
    }

    // Insert the column into the database
    const sql = 'INSERT INTO columns (name) VALUES (?)';

    db.query(sql, [columnName], (err, results) => {
        if (err) {
            console.error('Error adding column:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Column added successfully', results });
    });
});





app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});