const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Route to fetch unassigned projects for a logged-in profile
router.get('/get-unassigned-projects', (req, res) => {
    const profileName = req.session.user?.name; // Assuming the profile name is stored in the session

    if (!profileName) {
        return res.status(401).json({ message: 'Unauthorized: Profile not logged in' });
    }

    // Query to fetch projects where profile_name matches the logged-in profile and assigned_to is NULL
    const query = `
        SELECT * FROM Projects
        WHERE assigned_to IS NULL AND profile_name = ? AND status = 'pending'
    `;

    db.query(query, [profileName], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No unassigned projects found for this profile');
            return res.status(200).json([]); // Send empty array if no projects are found
        }

        res.json(results); // Send the filtered projects
    });
});

// Get all assigned projects where status is 'pending'
router.get('/get-assigned-projects', (req, res) => {
    const profileName = req.session.user?.name; // Assuming the profile name is stored in the session

    if (!profileName) {
        return res.status(401).json({ message: 'Unauthorized: Profile not logged in' });
    }

    // Query to fetch projects where profile_name matches the logged-in profile,
    // assigned_to is NOT NULL, and status is 'pending'
    const query = `
        SELECT * FROM Projects
        WHERE assigned_to IS NOT NULL 
        AND profile_name = ? 
        AND status = 'pending'
    `;

    db.query(query, [profileName], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No assigned projects with pending status found for this profile');
            return res.status(200).json([]); // Send empty array if no projects are found
        }

        res.json(results); // Send the filtered projects
    });
});


// Profile person's payroll
router.get('/payroll', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const loggedInUsername = req.session.user.name.trim(); // Use the 'username' from session

    if (!loggedInUsername) {
        return res.status(400).json({ message: 'Username not found in session.' });
    }

    const query = `
        SELECT 
            p.project_id, 
            p.project_name, 
            p.profile_name, 
            p.sheet_name, 
            p.shift,
            ws.profile_debit,
            ws.no_of_entries,
            ws.salary
        FROM 
            Projects p
        INNER JOIN 
            WorkerSalaries ws 
        ON 
            p.project_id = ws.project_id
        WHERE 
            p.status = 'completed'
            AND p.profile_name = ?;
    `;

    db.query(query, [loggedInUsername], (error, results) => {
        if (error) {
            console.error('Error fetching profile payroll data:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No payroll data available' });
        }

        res.json({ success: true, data: results });
    });
});

module.exports = router;