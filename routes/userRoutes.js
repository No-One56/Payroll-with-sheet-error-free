const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { google } = require("googleapis");



// Assuming you are using Express and have a session with `req.session.user.name`
router.get('/projects', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const loggedInUserName = req.session.user.name.trim();

    // Query to fetch only pending projects assigned to the user
    const query = `
        SELECT * FROM Projects 
        WHERE assigned_to IS NOT NULL 
        AND FIND_IN_SET(?, REPLACE(assigned_to, ', ', ',')) > 0
        AND status = 'pending' -- Fetch only pending projects
    `;

    db.query(query, [loggedInUserName], (error, results) => {
        if (error) {
            console.error('Error fetching assigned projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }
              
        if (results.length === 0) {
            return res.status(404).json({ message: 'No pending projects assigned to you' });
        }

        res.json({ projects: results });
    });
});

router.post('/submitProject/:projectId', async (req, res) => {
    const projectId = req.params.projectId;

    try {
        // Fetch the assigned users and Google Sheet URL
        const projectQuery = `SELECT assigned_to_ids, google_sheet_url FROM Projects WHERE project_id = ?`;
        const projectResult = await new Promise((resolve, reject) => {
            db.query(projectQuery, [projectId], (error, results) => {
                if (error) return reject(error);
                resolve(results[0]);
            });
        });

        if (!projectResult || !projectResult.google_sheet_url) {
            return res.status(400).json({ success: false, message: "Google Sheet URL not found." });
        }

        // Extract the spreadsheet ID from the URL
        const spreadsheetId = projectResult.google_sheet_url.split("/d/")[1].split("/")[0];

        // Get assigned user IDs
        const assignedUserIds = projectResult.assigned_to_ids ? projectResult.assigned_to_ids.split(", ") : [];

        if (assignedUserIds.length > 0) {
            // Fetch emails of assigned users
            const userEmails = await new Promise((resolve, reject) => {
                const query = `SELECT email FROM Users WHERE id IN (?)`;
                db.query(query, [assignedUserIds], (error, results) => {
                    if (error) return reject(error);
                    resolve(results.map(user => user.email));
                });
            });

            // ✅ Revoke edit access and set to view-only
            await setSheetAccessToViewOnly(spreadsheetId, userEmails);
        }

        // ✅ Update the project status to "submitted"
        const updateQuery = `UPDATE Projects SET status = 'submitted' WHERE project_id = ?`;
        await new Promise((resolve, reject) => {
            db.query(updateQuery, [projectId], (error, result) => {
                if (error) return reject(error);
                if (result.affectedRows === 0) {
                    return reject(new Error("Project not found or already submitted"));
                }
                resolve();
            });
        });

        res.json({ success: true, message: "Project submitted successfully, users now have view-only access." });

    } catch (error) {
        console.error("Error submitting project:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// for making users to view only access
async function setSheetAccessToViewOnly(spreadsheetId, emails) {
    if (!emails || emails.length === 0) return;

    const auth = new google.auth.GoogleAuth({
        keyFile: "H:/Payroll with sheet error free/config/google-sheets-key.json",
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    try {
        // Fetch all permissions for the spreadsheet
        const permissions = await drive.permissions.list({
            fileId: spreadsheetId,
            fields: "permissions(id, emailAddress)",
        });

        const permissionList = permissions.data.permissions || [];

        for (const email of emails) {
            // Find the user's permission ID
            const permission = permissionList.find(perm => perm.emailAddress === email);

            if (permission && permission.id) {
                // Update permission role to "reader"
                await drive.permissions.update({
                    fileId: spreadsheetId,
                    permissionId: permission.id,
                    requestBody: { role: "reader" }, // Change access to view-only
                });

                console.log(`🔄 Access changed to view-only for: ${email}`);
            } else {
                console.log(`⚠️ No access found for: ${email}`);
            }
        }
    } catch (error) {
        console.error("❌ Failed to update access:", error);
    }
}


router.get('/payroll', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }

    const loggedInUserName = req.session.user.name.trim();

    // Use parameterized query to fetch data
    const query = `
        SELECT 
            p.project_id, 
            p.project_name, 
            p.profile_name, 
            p.sheet_name,
            p.project_type,
            p.fixed_option,
            p.shift,
            ws.no_of_entries,
            ws.salary
        FROM 
            Projects p
        INNER JOIN 
            workersalaries ws 
        ON 
            p.project_id = ws.project_id
        WHERE 
            p.status = 'completed'
            AND ws.worker_name = ?
    `;

    db.query(query, [loggedInUserName], (error, results) => {
        if (error) {
            console.error('Error fetching payroll data:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'No payroll data available' });
        }

        res.json({ success: true, data: results });
    });
});



module.exports = router;  