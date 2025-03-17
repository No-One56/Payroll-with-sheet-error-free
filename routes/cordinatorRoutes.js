const express = require('express');
const router = express.Router();
const db = require('../database/db');





router.get('/projects', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const loggedInCoordinatorName = req.session.user.name.trim();

    // Query to fetch projects assigned to the logged-in coordinator
    const query = `
        SELECT * FROM Projects 
        WHERE assigned_to IS NOT NULL
        AND FIND_IN_SET(?, REPLACE(assigned_to_coordinators, ', ', ',')) > 0
        AND status = 'pending' -- Fetch only pending projects
    `;

    db.query(query, [loggedInCoordinatorName], (error, results) => {
        if (error) {
            console.error('Error fetching projects for coordinator:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No pending projects assigned to you' });
        }

        res.json({ projects: results });
    });
});




module.exports = router;  