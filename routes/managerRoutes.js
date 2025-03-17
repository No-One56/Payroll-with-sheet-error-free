const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { google } = require("googleapis");


// To get all unassigned projects
router.get('/get-all-projects', (req, res) => {
    const managerName = req.session.user?.name;

    if (!managerName) {
        return res.status(401).json({ message: 'Unauthorized: Manager not logged in' });
    }

    // Query to fetch projects where shift matches manager name or is 'Both'
    const query = `
       SELECT * 
FROM Projects
WHERE assigned_to IS NULL 
  AND (shift = 'Both' OR shift LIKE ?)
  AND project_type = "fixed"

    `;

    const shiftValue = `%${managerName}%`; // Match substrings in shift

    db.query(query, [shiftValue], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No projects found for this manager\'s shift');
            return res.status(200).json([]); // Send empty array if no projects are found
        }

        res.json(results); // Send the filtered projects
    });
});

// Route to get hourly projects
router.get('/get-all-hourly-projects', (req, res) => {
    const managerName = req.session.user?.name;

    if (!managerName) {
        return res.status(401).json({ message: 'Unauthorized: Manager not logged in' });
    }

    // Query to fetch projects where shift matches manager name or is 'Both'
    const query = `
       SELECT * 
FROM Projects
WHERE assigned_to IS NULL 
  AND (shift = 'Both' OR shift LIKE ?)
  AND project_type = "hourly"

    `;

    const shiftValue = `%${managerName}%`; // Match substrings in shift

    db.query(query, [shiftValue], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log('No projects found for this manager\'s shift');
            return res.status(200).json([]); // Send empty array if no projects are found
        }

        res.json(results); // Send the filtered projects
    });
});

// Get all assigned projects
router.get('/get-assigned-projects', (req, res) => {
    const managerName = req.session.user?.name;

    if (!managerName) {
        return res.status(401).json({ message: 'Unauthorized: Manager not logged in' });
    }

    const query = `
        SELECT * FROM Projects
        WHERE assigned_to IS NOT NULL 
        AND (shift = 'Both' OR shift LIKE ?)
        AND status = 'pending'
        AND project_type = "fixed"
    `;

    const shiftValue = `%${managerName}%`; // Match substrings in shift

    db.query(query, [shiftValue], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        // Parse `assigned_to_ids` into an array of IDs for frontend use
        const parsedResults = results.map(project => ({
            ...project,
            assigned_to_ids: project.assigned_to_ids
                ? project.assigned_to_ids.split(',').map(id => id.trim())
                : []
        }));

        res.json(parsedResults); // Send parsed results to the frontend
    });
});

// Route to get all assigned hourly projects
router.get('/get-hourly-assigned-projects', (req, res) => {
    const managerName = req.session.user?.name;

    if (!managerName) {
        return res.status(401).json({ message: 'Unauthorized: Manager not logged in' });
    }

    const query = `
        SELECT * FROM Projects
        WHERE assigned_to IS NOT NULL 
        AND (shift = 'Both' OR shift LIKE ?)
        AND status = 'pending'
        AND project_type = "hourly"
    `;

    const shiftValue = `%${managerName}%`; // Match substrings in shift

    db.query(query, [shiftValue], (error, results) => {
        if (error) {
            console.error('Error fetching projects:', error);
            return res.status(500).json({ message: 'Database error' });
        }

        // Parse `assigned_to_ids` into an array of IDs for frontend use
        const parsedResults = results.map(project => ({
            ...project,
            assigned_to_ids: project.assigned_to_ids
                ? project.assigned_to_ids.split(',').map(id => id.trim())
                : []
        }));

        res.json(parsedResults); // Send parsed results to the frontend
    });
});

// To fetch submitted projects 
router.get('/submittedProjects', (req, res) => {
    const query = `
        SELECT * FROM Projects 
        WHERE status = 'submitted';
    `;

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching submitted projects:', error);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: results });
    });
});

// Route to reject the project
router.post("/rejectProject", async (req, res) => {
    const { projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID is required." });
    }

    try {
        // ✅ Update project status to "pending"
        const updateQuery = `
            UPDATE Projects 
            SET status = 'pending'
            WHERE project_id = ?;
        `;

        await new Promise((resolve, reject) => {
            db.query(updateQuery, [projectId], (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });

        // ✅ Fetch assigned users' emails from the database
        const assignedUsersQuery = `SELECT assigned_to_ids, google_sheet_url FROM Projects WHERE project_id = ?`;
        const projectResult = await new Promise((resolve, reject) => {
            db.query(assignedUsersQuery, [projectId], (error, results) => {
                if (error) return reject(error);
                if (results.length === 0) return reject(new Error("Project not found."));
                resolve(results[0]);
            });
        });

        const { assigned_to_ids, google_sheet_url } = projectResult;
        if (!assigned_to_ids || !google_sheet_url) {
            return res.status(400).json({ success: false, message: "Assigned users or Google Sheet URL missing." });
        }

        const assignedUserIds = assigned_to_ids.split(", "); // Convert to array

        // ✅ Fetch assigned users' emails
        const fetchUsersQuery = `SELECT email FROM Users WHERE id IN (?)`;
        const assignedUsers = await new Promise((resolve, reject) => {
            db.query(fetchUsersQuery, [assignedUserIds], (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });

        const userEmails = assignedUsers.map(user => user.email); // Extract emails
        if (userEmails.length === 0) {
            return res.json({ success: true, message: "No users found to grant access." });
        }

        // ✅ Extract Google Sheet ID
        const spreadsheetId = google_sheet_url.split("/d/")[1].split("/")[0];

        // ✅ Grant editor access back
        await grantSheetAccess(spreadsheetId, userEmails);

        res.json({ success: true, message: "Project rejected, editor access restored!" });
    } catch (error) {
        console.error("Error rejecting project:", error);
        res.status(500).json({ success: false, message: "Server error while rejecting project." });
    }
});

// To grant access to different users 
async function grantSheetAccess(spreadsheetId, emails) {
    if (!emails || emails.length === 0) return;

    const auth = new google.auth.GoogleAuth({
        keyFile: "H:/Payroll with sheet error free/config/google-sheets-key.json", // Update path
        scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    for (const email of emails) {
        try {
            await drive.permissions.create({
                fileId: spreadsheetId,
                requestBody: {
                    type: "user",
                    role: "writer", // Grants edit access
                    emailAddress: email,
                },
                fields: "id",
            });

            // console.log(`✅ Editor access granted to: ${email}`);
        } catch (error) {
            console.error(`❌ Failed to grant access to ${email}:`, error);
        }
    }
}

// Hourly calculations
router.post('/save-hourly-calculation', (req, res) => {
    const { projectId, salaries } = req.body;

    if (!projectId || !salaries || !Array.isArray(salaries)) {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    const queries = salaries.map(({ worker, runnedHours, salary }) => {
        return new Promise((resolve, reject) => {
            const profileDebit = salaries.reduce((sum, s) => sum + s.salary, 0);
            const query = `
                INSERT INTO HourlyProjectRecords (worker_name, project_id, salary, profile_debit)
                VALUES (?, ?, ?, ?)
            `;
            db.query(query, [worker, projectId, salary, profileDebit], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    Promise.all(queries)
        .then(() => res.json({ success: true }))
        .catch(error => {
            console.error('Error saving hourly data:', error);
            res.status(500).json({ success: false, message: 'Failed to save data' });
        });
});


// Mark the project completed 
router.post('/mark-project-completed', (req, res) => {
    const { projectId } = req.body;

    if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
    }

    const query = `UPDATE Projects SET status = 'completed' WHERE project_id = ?`;

    db.query(query, [projectId], (err, results) => {
        if (err) {
            console.error('Error marking project as completed:', err);
            return res.status(500).json({ success: false, message: 'Failed to mark project as completed' });
        }

        if (results.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Project not found' });
        }
    });
});


// route to approve the project
router.post('/approveProject', (req, res) => {
    const { projectId } = req.body;

    // Fetch the project details
    const projectQuery = `
        SELECT assigned_to, price_worker_one, price_worker_two, project_type, fixed_option 
        FROM Projects 
        WHERE project_id = ?;
    `;

    db.query(projectQuery, [projectId], (projectError, projectResults) => {
        if (projectError || projectResults.length === 0) {
            console.error('Error fetching project details:', projectError);
            return res.status(500).json({ success: false, message: 'Failed to fetch project details' });
        }

        const { assigned_to, price_worker_one, price_worker_two, project_type, fixed_option } = projectResults[0];

        if (project_type !== 'fixed' || fixed_option !== 'Double Entry') {
            return res.status(400).json({ success: false, message: 'Project is not eligible for Double Entry calculation' });
        }

        const workersList = assigned_to.split(',').map(worker => worker.trim()); // List of valid workers

        // Fetch project-specific data
        const dataQuery = `
            SELECT row_data 
            FROM project_data 
            WHERE project_id = ?;
        `;

        db.query(dataQuery, [projectId], (dataError, dataResults) => {
            if (dataError || dataResults.length === 0) {
                console.error('Error fetching project data:', dataError);
                return res.status(500).json({ success: false, message: 'Failed to fetch project data' });
            }

            const rows = JSON.parse(dataResults[0].row_data); // Parse row_data

            // Maps to store salaries and entry counts for each worker
            const salaries = {};
            const entryCounts = {};

            rows.forEach(row => {
                const workerOne = row[row.length - 2]; // Second last column is "Worker One"
                const workerTwo = row[row.length - 1]; // Last column is "Worker Two"

                // Only process workers present in the assigned list
                if (workerOne && workersList.includes(workerOne)) {
                    if (!salaries[workerOne]) {
                        salaries[workerOne] = 0;
                        entryCounts[workerOne] = 0;
                    }
                    salaries[workerOne] += price_worker_one;
                    entryCounts[workerOne] += 1;
                }

                if (workerTwo && workersList.includes(workerTwo)) {
                    if (!salaries[workerTwo]) {
                        salaries[workerTwo] = 0;
                        entryCounts[workerTwo] = 0;
                    }
                    salaries[workerTwo] += price_worker_two;
                    entryCounts[workerTwo] += 1;
                }
            });

            // Total project salary (profile_debit)
            const totalProjectSalary = Object.values(salaries).reduce((sum, salary) => sum + salary, 0);

            // Prepare salary insert/update queries
            const salaryPromises = Object.entries(salaries).map(([workerName, salary]) => {
                const entryCount = entryCounts[workerName];

                const updateSalaryQuery = `
                    INSERT INTO WorkerSalaries (worker_name, project_id, salary, profile_debit, no_of_entries)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        salary = salary + ?, 
                        profile_debit = ?, 
                        no_of_entries = no_of_entries + ?;
                `;
                return new Promise((resolve, reject) => {
                    db.query(
                        updateSalaryQuery,
                        [
                            workerName, projectId, salary, totalProjectSalary, entryCount, // Insert values
                            salary, totalProjectSalary, entryCount // Update values
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            // Update project status and handle salaries
            Promise.all(salaryPromises)
                .then(() => {
                    const updateProjectQuery = `
                        UPDATE Projects 
                        SET status = 'completed'
                        WHERE project_id = ?;
                    `;
                    db.query(updateProjectQuery, [projectId], (updateError) => {
                        if (updateError) {
                            console.error('Error updating project status:', updateError);
                            return res.status(500).json({ success: false, message: 'Failed to update project status' });
                        }
                        res.json({ success: true, message: 'Project approved and salaries updated successfully' });
                    });
                })
                .catch(err => {
                    console.error('Error updating salaries:', err);
                    res.status(500).json({ success: false, message: 'Failed to update salaries' });
                });
        });
    });
});

// Lumpsum Approval
router.post('/approveLumpsumProject', (req, res) => {
    const { projectId, salaries, lumpsumPrice } = req.body;

    const totalSalaries = salaries.reduce((sum, s) => sum + s.salary, 0);
    if (totalSalaries !== lumpsumPrice) {
        return res.status(400).json({ success: false, message: 'Salaries must equal the Lumpsum Price.' });
    }

    const salaryPromises = salaries.map(({ worker, salary }) => {
        const insertQuery = `
            INSERT INTO WorkerSalaries (worker_name, project_id, salary, profile_debit, transaction_type)
            VALUES (?, ?, ?, ?, 'credit')
            ON DUPLICATE KEY UPDATE 
                salary = salary + ?, 
                profile_debit = profile_debit + ?;
        `;

        return new Promise((resolve, reject) => {
            db.query(insertQuery, [worker, projectId, salary, lumpsumPrice, salary, lumpsumPrice], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    Promise.all(salaryPromises)
        .then(() => {
            const updateProjectQuery = `
                UPDATE Projects 
                SET status = 'completed'
                WHERE project_id = ?;
            `;

            db.query(updateProjectQuery, [projectId], (err) => {
                if (err) {
                    console.error('Error updating project status:', err);
                    return res.status(500).json({ success: false, message: 'Failed to update project status' });
                }
                res.json({ success: true, message: 'Project approved successfully!' });
            });
        })
        .catch(err => {
            console.error('Error approving project:', err);
            res.status(500).json({ success: false, message: 'Failed to approve project' });
        });
});


// Route to Approve Single Entry Project
router.post('/approveSingleEntryProject', (req, res) => {
    const { projectId } = req.body;

    // Fetch the project data
    const projectQuery = `
        SELECT assigned_to, price_per_entry 
        FROM Projects 
        WHERE project_id = ?;
    `;

    db.query(projectQuery, [projectId], (projectError, projectResults) => {
        if (projectError || projectResults.length === 0) {
            console.error('Error fetching project details:', projectError);
            return res.status(500).json({ success: false, message: 'Failed to fetch project details' });
        }

        const { assigned_to, price_per_entry } = projectResults[0];
        const workersList = assigned_to.split(',').map(worker => worker.trim()); // List of valid workers

        // Fetch the project-specific data
        const dataQuery = `
            SELECT row_data 
            FROM project_data 
            WHERE project_id = ?;
        `;

        db.query(dataQuery, [projectId], (dataError, dataResults) => {
            if (dataError || dataResults.length === 0) {
                console.error('Error fetching project data:', dataError);
                return res.status(500).json({ success: false, message: 'Failed to fetch project data' });
            }

            const rows = JSON.parse(dataResults[0].row_data); // Parse row_data
            const validRows = rows.filter(row => {
                const worker = row[row.length - 1]; // Get the last value (Workers column)
                return worker && workersList.includes(worker); // Check if it's non-empty and valid
            });

            // Calculate salaries and entry counts
            const salaries = {}; // Map to store salaries for each worker
            const entryCounts = {}; // Map to store entry counts for each worker

            validRows.forEach(row => {
                const worker = row[row.length - 1];
                if (!salaries[worker]) {
                    salaries[worker] = 0;
                    entryCounts[worker] = 0;
                }
                salaries[worker] += price_per_entry; // Increment salary for this worker
                entryCounts[worker] += 1; // Increment entry count for this worker
            });

            // Calculate total project salary (profile_debit)
            const totalProjectSalary = Object.values(salaries).reduce((sum, salary) => sum + salary, 0);

            // Prepare salary insert/update queries
            const salaryPromises = Object.entries(salaries).map(([worker, salary]) => {
                const updateSalaryQuery = `
                    INSERT INTO WorkerSalaries (worker_name, project_id, salary, profile_debit, no_of_entries)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        salary = salary + ?, 
                        profile_debit = ?, 
                        no_of_entries = no_of_entries + ?;
                `;
                return new Promise((resolve, reject) => {
                    db.query(
                        updateSalaryQuery,
                        [
                            worker, projectId, salary, totalProjectSalary, entryCounts[worker], // Insert values
                            salary, totalProjectSalary, entryCounts[worker] // Update values
                        ],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            // Update project status and handle salaries
            Promise.all(salaryPromises)
                .then(() => {
                    const updateProjectQuery = `
                        UPDATE Projects 
                        SET status = 'completed'
                        WHERE project_id = ?;
                    `;
                    db.query(updateProjectQuery, [projectId], (updateError) => {
                        if (updateError) {
                            console.error('Error updating project status:', updateError);
                            return res.status(500).json({ success: false, message: 'Failed to update project status' });
                        }
                        res.json({ success: true, message: 'Project approved and salaries updated successfully' });
                    });
                })
                .catch(err => {
                    console.error('Error updating salaries:', err);
                    res.status(500).json({ success: false, message: 'Failed to update salaries' });
                });
        });
    });
});




// Route to update project details 
router.post('/update-projects', async (req, res) => {
    const updates = req.body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: 'No updates provided' });
    }

    try {
        for (const project of updates) {
            const { project_id, project_name, profile_name, sheet_name, total_entries, project_type, fixed_option, lumpsum_price, price_worker_one, price_worker_two, shift, assigned_to } = project;

            // Update the project in the database
            await db.query(
                `
                UPDATE Projects
                SET 
                    project_name = ?, 
                    profile_name = ?, 
                    sheet_name = ?, 
                    total_entries = ?, 
                    project_type = ?, 
                    fixed_option = ?,
                    lumpsum_price = ?,
                    price_worker_one = ?,
                    price_worker_two = ?,
                    shift = ?, 
                    assigned_to = ?
                WHERE project_id = ?
                `,
                [project_name, profile_name, sheet_name, total_entries, project_type, fixed_option, lumpsum_price, price_worker_one, price_worker_two, shift, assigned_to, project_id]
            );
        }

        res.json({ success: true, message: 'Projects updated successfully' });
    } catch (error) {
        console.error('Error updating projects:', error);
        res.status(500).json({ message: 'Database error during updates' });
    }
});







module.exports = router; 