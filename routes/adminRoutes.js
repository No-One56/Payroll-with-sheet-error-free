const express = require("express");
const router = express.Router();
const User = require("../models/user"); // Import the User model
const db = require("../database/db");
const multer = require("multer"); // For file handling
const csvParser = require("csv-parser"); // Install with npm if needed
const xlsx = require("xlsx"); // For Excel files
const fs = require("fs");
const path = require("path");
const { drive, sheets } = require("../services/googleSheets");
const { google } = require("googleapis"); // ✅ Add this line
 
// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Specify the folder where files will be stored
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage: storage });

// Route to get admin dashboard with pending registrations
router.get("/admin-dashboard", (req, res) => {
  // Fetch all pending registrations from the database
  User.getAllPendingRegistrations((err, results) => {
    if (err) {
      console.error("Error fetching pending registrations:", err);
      return res
        .status(500)
        .json({ message: "Error fetching pending registrations" });
    }

    // Render the dashboard page with the fetched data
    res.render("admin-dashboard", { pendingRegistrations: results });
  });
});

// Route to approve a user registration
router.post("/approve-registration/:userId", (req, res) => {
  const userId = req.params.userId;

  User.approvePendingRegistration(userId, (err, result) => {
    if (err) {
      console.error("Error approving registration:", err);
      return res.status(500).json({ message: "Error approving registration" });
    }
    res.json({ message: "User approved successfully" });
  });
});

// Route to reject a user registration
router.post("/reject-registration/:userId", (req, res) => {
  const userId = req.params.userId;

  User.rejectPendingRegistration(userId, (err, result) => {
    if (err) {
      console.error("Error rejecting registration:", err);
      return res.status(500).json({ message: "Error rejecting registration" });
    }
    res.json({ message: "User rejected successfully" });
  });
});

// Add fixed type of project without file
router.post("/add-project", async (req, res) => {
  const {
    projectId,
    projectName,
    profileName,
    sheetName,
    totalEntries,
    projectType,
    fixedOption,
    lumpsumPrice,
    priceWorkerOne,
    priceWorkerTwo,
    pricePerEntry,
    shift,
    instructions,
    projectColumns,
    workType,
  } = req.body;

  // Validation
  if (
    !projectId ||
    !projectName ||
    !profileName ||
    !sheetName ||
    !shift ||
    !projectColumns ||
    !fixedOption ||
    !workType
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
  }
  if (fixedOption === "Lumpsum" && !lumpsumPrice) {
    return res
      .status(400)
      .json({ success: false, message: "Lumpsum price is required." });
  }
  if (fixedOption === "Double Entry" && (!priceWorkerOne || !priceWorkerTwo)) {
    return res.status(400).json({
      success: false,
      message: "Prices for both workers are required.",
    });
  }
  if (fixedOption === "Single Entry" && !pricePerEntry) {
    return res
      .status(400)
      .json({ success: false, message: "Price per entry is required." });
  }

  try {
    const shiftString = shift.join(", ");
    const projectColumnsString = projectColumns.join(", ");

    // 1️⃣ Fetch Admin User from Database (✅ Fixed for `mysql`)
    const adminUser = await new Promise((resolve, reject) => {
      db.query(
        `SELECT email FROM users WHERE role = 'admin' LIMIT 1`,
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0].email : null);
        }
      );
    });

    if (!adminUser) {
      return res
        .status(400)
        .json({ success: false, message: "No admin found in database." });
    }

    const additionalOwnerEmail = "sallalzahid51@gmail.com"; // Second owner

    // 2️⃣ Insert the project into the database first
    await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO Projects 
                (project_id, project_name, profile_name, sheet_name, total_entries, project_type, fixed_option, work_type, lumpsum_price, price_worker_one, price_worker_two, price_per_entry, shift, instructions, project_columns) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          projectName,
          profileName,
          sheetName,
          totalEntries || null,
          projectType || null,
          fixedOption,
          workType,
          lumpsumPrice || null,
          priceWorkerOne || null,
          priceWorkerTwo || null,
          pricePerEntry || null,
          shiftString,
          instructions || null,
          projectColumnsString,
        ],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    // 3️⃣ Create a new blank Google Sheet
    const sheetResponse = await drive.files.create({
      requestBody: {
        name: projectName, // Sheet name = Project name
        mimeType: "application/vnd.google-apps.spreadsheet",
      },
      fields: "id",
    });

    const spreadsheetId = sheetResponse.data.id;
    const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // 4️⃣ Give Owner Access to Admin & sallalzahid51@gmail.com
    const owners = [adminUser, additionalOwnerEmail]; // List of additional owners

    for (const owner of owners) {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: "writer", // Owner access (Google API does not allow "owner" change via API)
          type: "user",
          emailAddress: owner,
        },
        fields: "id",
      });
    }

    // 5️⃣ Update the database with the Google Sheet URL
    await new Promise((resolve, reject) => {
      db.query(
        `UPDATE Projects SET google_sheet_url = ? WHERE project_id = ?`,
        [googleSheetUrl, projectId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    res.json({
      success: true,
      message: "Project added successfully!",
      googleSheetUrl,
    });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({
      success: false,
      message: `Database or API Error: ${error.message}`,
    });
  }
});

// Save project in database with file
router.post(
  "/add-project-with-file",
  upload.single("fileUpload"),
  async (req, res) => {
    const {
      projectId,
      projectName,
      profileName,
      totalEntries,
      projectType,
      sheetName,
      shift,
      instructions,
      fixedOption,
      lumpsumPrice,
      priceWorkerOne,
      priceWorkerTwo,
      workType,
      pricePerEntry,
    } = req.body;

    // Validation
    if (
      !projectId ||
      !projectName ||
      !profileName ||
      !totalEntries ||
      !sheetName ||
      !shift ||
      !fixedOption ||
      !workType
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields except instructions are required.",
      });
    }

    if (fixedOption === "Lumpsum" && !lumpsumPrice) {
      return res.status(400).json({
        success: false,
        message: "Lumpsum price is required.",
      });
    }
    if (
      fixedOption === "Double Entry" &&
      (!priceWorkerOne || !priceWorkerTwo)
    ) {
      return res.status(400).json({
        success: false,
        message: "Prices for both workers are required.",
      });
    }
    if (fixedOption === "Single Entry" && !pricePerEntry) {
      return res.status(400).json({
        success: false,
        message: "Price Per Entry is required.",
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "File upload is required.",
        });
      }

      const filePath = path.normalize(req.file.path);
      const originalName = req.file.originalname;
      const shiftString = Array.isArray(shift) ? shift.join(", ") : shift;

      // 3️⃣ Create a new blank Google Sheet
      const sheetResponse = await drive.files.create({
        requestBody: {
          name: projectName, // Sheet name = Project name
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id",
      });

      const spreadsheetId = sheetResponse.data.id;
      const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // 1️⃣ Fetch Admin User from Database (✅ Fixed for `mysql`)
      const adminUser = await new Promise((resolve, reject) => {
        db.query(
          `SELECT email FROM users WHERE role = 'admin' LIMIT 1`,
          (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? results[0].email : null);
          }
        );
      });

      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: "No admin found in database.",
        });
      }

      const additionalOwnerEmail = "sallalzahid51@gmail.com"; // Second owner
      const owners = [adminUser, additionalOwnerEmail]; // List of additional owners

      // Function to Add Permissions with Delay & Retry Logic
      async function addPermissionWithRetry(email, retries = 3) {
        for (let i = 0; i < retries; i++) {
          try {
            await drive.permissions.create({
              fileId: spreadsheetId,
              requestBody: {
                role: "writer",
                type: "user",
                emailAddress: email,
              },
              fields: "id",
            });

            console.log(`✅ Access granted to: ${email}`);
            return; // Exit function if successful
          } catch (error) {
            if (error.code === 403 && error.errors[0].reason === "sharingRateLimitExceeded") {
              const delayTime = 2000 * (2 ** i); // Exponential backoff (2s, 4s, 8s)
              console.log(`🚨 Rate limit exceeded for ${email}. Retrying in ${delayTime / 1000} seconds...`);
              await new Promise((resolve) => setTimeout(resolve, delayTime));
            } else {
              console.error(`❌ Failed to grant access to ${email}:`, error);
              throw error; // If not a rate limit error, stop retrying
            }
          }
        }
      }

      // 4️⃣ Give Access with Delay Between Requests
      for (const owner of owners) {
        await addPermissionWithRetry(owner);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay before next permission
      }

      // 5️⃣ Update the database with the Google Sheet URL
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE Projects SET google_sheet_url = ? WHERE project_id = ?`,
          [googleSheetUrl, projectId],
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });

      const query = `
            INSERT INTO Projects 
            (project_id, project_name, profile_name, sheet_name, total_entries, project_type, shift, instructions, project_columns, fixed_option, lumpsum_price, price_worker_one, price_worker_two, price_per_entry, work_type, google_sheet_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        projectId,
        projectName,
        profileName,
        sheetName,
        totalEntries,
        projectType,
        shiftString,
        instructions?.trim() || null,
        JSON.stringify({ filePath, originalName }),
        fixedOption,
        !lumpsumPrice || isNaN(lumpsumPrice) ? null : parseFloat(lumpsumPrice),
        !priceWorkerOne || isNaN(priceWorkerOne)
          ? null
          : parseFloat(priceWorkerOne),
        !priceWorkerTwo || isNaN(priceWorkerTwo)
          ? null
          : parseFloat(priceWorkerTwo),
        !pricePerEntry || isNaN(pricePerEntry)
          ? null
          : parseFloat(pricePerEntry),
        workType,
        googleSheetUrl,
      ];

      await db.query(query, values);

      // Parse file data and store in `project_data` table
      const fileExtension = path.extname(filePath).toLowerCase();
      let data = [];
      let headers = [];

      if (fileExtension === '.csv') {
          const stream = fs.createReadStream(filePath).pipe(csvParser());
          for await (const row of stream) {
              if (headers.length === 0) {
                  headers = Object.keys(row);
              }
              data.push(Object.values(row));
          } 
          // Add headers as the first row
          data.unshift(headers);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
          const workbook = xlsx.readFile(filePath);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
          headers = jsonData[0];
          data = jsonData;
      } else {
          return res.status(400).json({ success: false, message: 'Unsupported file format.' });
      }

      // Insert the data into the database
      const insertQuery = `INSERT INTO project_data (project_id, row_data) VALUES (?, ?)`;
      await db.query(insertQuery, [projectId, JSON.stringify(data)]);

      // Update project to mark as file-based
      const updateQuery = `UPDATE Projects SET is_file_based = 1 WHERE project_id = ?`;
      await db.query(updateQuery, [projectId]);

      res.json({ success: true, message: 'Project and file data added successfully!' });
  } catch (err) {
      console.error('Error inserting project:', err);
      res.status(500).json({ success: false, message: 'Failed to insert project and file data.' });
  }
});








// add hourly project
router.post('/add-hourly-project', async (req, res) => {
  const {
      projectId,
      projectName,
      profileName,
      sheetName,
      totalEntries,
      projectType,
      pricePerHour,
      workType, // New field for work type
      shift,  // Managers selected
      instructions,
      projectColumns,
  } = req.body;

  // Validation
  if (!projectId || !projectName || !profileName || !sheetName || !totalEntries || !pricePerHour || !workType || !shift || !projectColumns) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
      const shiftString = shift.join(', '); // Join selected managers into a string
      const projectColumnsString = projectColumns.join(', ');

      // 3️⃣ Create a new blank Google Sheet
      const sheetResponse = await drive.files.create({
        requestBody: {
          name: projectName, // Sheet name = Project name
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id",
      });

      const spreadsheetId = sheetResponse.data.id;
      const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // 1️⃣ Fetch Admin User from Database (✅ Fixed for `mysql`)
      const adminUser = await new Promise((resolve, reject) => {
        db.query(
          `SELECT email FROM users WHERE role = 'admin' LIMIT 1`,
          (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? results[0].email : null);
          }
        );
      });

      if (!adminUser) {
        return res.status(400).json({
          success: false,
          message: "No admin found in database.",
        });
      }

      const additionalOwnerEmail = "sallalzahid51@gmail.com"; // Second owner
      const owners = [adminUser, additionalOwnerEmail]; // List of additional owners

      // Function to Add Permissions with Delay & Retry Logic
      async function addPermissionWithRetry(email, retries = 3) {
        for (let i = 0; i < retries; i++) {
          try {
            await drive.permissions.create({
              fileId: spreadsheetId,
              requestBody: {
                role: "writer",
                type: "user",
                emailAddress: email,
              },
              fields: "id",
            });

            console.log(`✅ Access granted to: ${email}`);
            return; // Exit function if successful
          } catch (error) {
            if (error.code === 403 && error.errors[0].reason === "sharingRateLimitExceeded") {
              const delayTime = 2000 * (2 ** i); // Exponential backoff (2s, 4s, 8s)
              console.log(`🚨 Rate limit exceeded for ${email}. Retrying in ${delayTime / 1000} seconds...`);
              await new Promise((resolve) => setTimeout(resolve, delayTime));
            } else {
              console.error(`❌ Failed to grant access to ${email}:`, error);
              throw error; // If not a rate limit error, stop retrying
            }
          }
        }
      }

      // 4️⃣ Give Access with Delay Between Requests
      for (const owner of owners) {
        await addPermissionWithRetry(owner);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay before next permission
      }

      // 5️⃣ Update the database with the Google Sheet URL
      await new Promise((resolve, reject) => {
        db.query(
          `UPDATE Projects SET google_sheet_url = ? WHERE project_id = ?`,
          [googleSheetUrl, projectId],
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });

      await db.query(
          `INSERT INTO Projects (project_id, project_name, profile_name, sheet_name, total_entries, project_type, price_per_hour, work_type, price_per_entry, lumpsum_price, price_worker_one, price_worker_two, shift, instructions, project_columns, google_sheet_url) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?)`,
          [projectId, projectName, profileName, sheetName, totalEntries, projectType, pricePerHour, workType, shiftString, instructions || null, projectColumnsString, googleSheetUrl,]
      );

      res.json({ success: true });
  } catch (error) {
      res.status(500).json({ success: false, message: `Database error: ${error.message}` });
  }
});


// Updated Route: Add Hourly Project with File
router.post(
  "/add-hourly-project-with-file",
  upload.single("fileUpload"),
  async (req, res) => {
    const {
      projectId,
      projectName,
      profileName,
      sheetName,
      totalEntries,
      projectType,
      pricePerHour,
      shift, // Selected managers
      instructions,
      workType,
    } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File upload is required." });
    }

    const filePath = path.normalize(req.file.path);
    const originalName = req.file.originalname;

    if (
      !projectId ||
      !projectName ||
      !profileName ||
      !sheetName ||
      !totalEntries ||
      !pricePerHour ||
      !shift ||
      !workType
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    try {
      const shiftString = Array.isArray(shift) ? shift.join(", ") : shift;

      // 1️⃣ Create a Google Sheet for the project
      const sheetResponse = await drive.files.create({
        requestBody: {
          name: projectName, // Sheet name = Project name
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id",
      });
      const spreadsheetId = sheetResponse.data.id;
      const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // 4️⃣ Give Owner Access to Admin & sallalzahid51@gmail.com
      const owners = [adminUser, additionalOwnerEmail]; // List of additional owners

      for (const owner of owners) {
        await drive.permissions.create({
          fileId: spreadsheetId,
          requestBody: {
            role: "writer", // Owner access (Google API does not allow "owner" change via API)
            type: "user",
            emailAddress: owner,
          },
          fields: "id",
        });
      }

      // Insert into Projects table and mark as file-based
      await db.query(
        `INSERT INTO Projects (project_id, project_name, profile_name, sheet_name, total_entries, project_type, price_per_hour, shift, instructions, project_columns, work_type, is_file_based, google_sheet_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          projectId,
          projectName,
          profileName,
          sheetName,
          totalEntries,
          projectType,
          pricePerHour,
          shiftString,
          instructions || null,
          JSON.stringify({ filePath, originalName }),
          workType,
          googleSheetUrl,
        ]
      );

      // Process file and store data in project_data
      const fileExtension = path.extname(filePath).toLowerCase();
      let data = [];
      let headers = [];

      if (fileExtension === ".csv") {
        const stream = fs.createReadStream(filePath).pipe(csvParser());
        for await (const row of stream) {
          if (headers.length === 0) headers = Object.keys(row);
          data.push(Object.values(row));
        }
        data.unshift(headers);
      } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        headers = jsonData[0];
        data = jsonData;
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Unsupported file format." });
      }

      // Insert file data into project_data table
      await db.query(
        `INSERT INTO project_data (project_id, row_data) VALUES (?, ?)`,
        [projectId, JSON.stringify(data)]
      );

      res.json({
        success: true,
        message: "Hourly project with file added successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Database error." });
    }
  }
);

// Fetch data from uploaded file
router.get("/getFileData/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
    // Step 1: Fetch project_columns from the database
    db.query(
      "SELECT project_columns FROM Projects WHERE project_id = ?",
      [projectId],
      async (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Internal Server Error" });
        }

        if (!result || result.length === 0) {
          console.error("No data found for the given project ID");
          return res.status(404).json({
            success: false,
            message: "No data found for the given project ID.",
          });
        }

        // console.log('Database query result:', result);

        // Step 2: Parse project_columns to extract filePath
        const projectColumns = JSON.parse(result[0].project_columns);
        const { filePath } = projectColumns;

        // console.log('Extracted filePath:', filePath);

        if (!filePath || !fs.existsSync(filePath)) {
          console.error(
            "File does not exist or filePath is invalid:",
            filePath
          );
          console.log(`Processing file: ${filePath}`);
          return res
            .status(404)
            .json({ success: false, message: "File not found on server." });
        }

        // Step 3: Process the file based on its extension
        const fileExtension = path.extname(filePath).toLowerCase();
        let data = [];
        let headers = [];

        if (fileExtension === ".csv") {
          // Processing CSV file
          const stream = fs.createReadStream(filePath).pipe(csvParser());
          for await (const row of stream) {
            if (headers.length === 0) headers = Object.keys(row);
            data.push(Object.values(row)); // Include all rows
          }
        } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
          // Processing Excel file
          const workbook = xlsx.readFile(filePath);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

          headers = jsonData[0]; // Extract headers from the first row
          data = jsonData.slice(0); // Rows from the second row onwards
        } else {
          console.error("Unsupported file format:", fileExtension);
          return res
            .status(400)
            .json({ success: false, message: "Unsupported file format." });
        }

        // Step 4: Return the file data as JSON
        res.json({ success: true, headers, data });
      }
    );
  } catch (error) {
    console.error("Error fetching file data:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Get managers in the form
router.get("/get-managers", (req, res) => {
  const query = `SELECT id, name, role FROM users WHERE role = "manager"`;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching managers:", error); // Log the error
      return res
        .status(500)
        .json({ success: false, message: `Database error: ${error.message}` });
    }
    res.json({ success: true, managers: results });
  });
});

// Get columns in forms
router.get("/get-columns", (req, res) => {
  db.query("SELECT name FROM columns", (err, rows) => {
    if (err) {
      console.error("Error fetching columns:", err); // Log the error
      return res
        .status(500)
        .json({ success: false, message: `Database error: ${err.message}` });
    }

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: "No columns found" });
    }

    // Send column names as response
    res.json({ success: true, columns: rows });
  });
});

// Route to get users with the role 'user'
router.get("/get-users", (req, res) => {
  // Query to fetch users and coordinators
  const query = `
        SELECT id, name, role 
        FROM users 
        WHERE role IN ('user', 'cordinator', 'manager')
    `;

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching users and coordinators:", error);
      return res
        .status(500)
        .json({ message: "Error fetching users and coordinators" });
    }
    res.json(results); // Send users and coordinators as JSON
  });
});

// get cordinators
router.get("/get-coordinators", (req, res) => {
  const query = 'SELECT id, name FROM users WHERE role = "cordinator"';

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching coordinators:", error);
      return res.status(500).json({ message: "Error fetching coordinators" });
    }
    res.json(results); // Send coordinators as JSON
  });
});

// Route to get all unassigned projects
router.get("/get-all-projects", (req, res) => {
  const query =
    'SELECT * FROM Projects WHERE assigned_to IS NULL AND project_type = "fixed" AND status = "pending"';

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching all projects:", error);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      // console.log("No projects found in the database");
      return res.status(404).json({ message: "No projects found" });
    }
    res.json(results); // Send the data as JSON
  });
});

// Route to get all hourly unassigned projects
router.get("/get-all-hourly-projects", (req, res) => {
  const query =
    'SELECT * FROM Projects WHERE assigned_to IS NULL AND project_type = "hourly" AND status = "pending"';

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching all projects:", error);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      // console.log("No projects found in the database");
      return res.status(404).json({ message: "No projects found" });
    }
    res.json(results); // Send the data as JSON
  });
});

// Get Assigned projects
router.get("/get-assigned-projects", (req, res) => {
  const query =
    'SELECT * FROM Projects WHERE assigned_to IS NOT NULL AND project_type = "fixed" AND status = "pending"';

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching assigned projects:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // Parse `assigned_to_ids` into an array for the frontend
    const parsedResults = results.map((project) => ({
      ...project,
      assigned_to_ids: project.assigned_to_ids
        ? project.assigned_to_ids.split(",").map((id) => id.trim())
        : [],
    }));

    res.json(parsedResults);
  });
});

// Get hourly Assigned projects
router.get("/get-hourly-assigned-projects", (req, res) => {
  const query =
    'SELECT * FROM Projects WHERE assigned_to IS NOT NULL AND project_type = "hourly" AND status = "pending"';

  db.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching assigned projects:", error);
      return res.status(500).json({ message: "Database error" });
    }

    // Parse `assigned_to_ids` into an array for the frontend
    const parsedResults = results.map((project) => ({
      ...project,
      assigned_to_ids: project.assigned_to_ids
        ? project.assigned_to_ids.split(",").map((id) => id.trim())
        : [],
    }));

    res.json(parsedResults);
  });
});

// Route to post assign user to project
router.post("/assign-project", async (req, res) => {
  let { projectId, assignedUsers, assignedCoordinators } = req.body;

  if (!projectId) {
    return res.status(400).json({ message: "Project ID is missing!" });
  }

  const fetchUsers = (ids) => {
    if (!ids || ids.length === 0) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      const query = `SELECT name, email FROM Users WHERE id IN (?)`;
      db.query(query, [ids], (error, results) => {
        if (error) return reject(error);
        resolve(results);
      });
    });
  };

  try {
    // ✅ Fetch old assigned users from the database
    const oldUsersQuery = `SELECT assigned_to_ids FROM Projects WHERE project_id = ?`;
    const oldUsersResult = await new Promise((resolve, reject) => {
      db.query(oldUsersQuery, [projectId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]?.assigned_to_ids ? results[0].assigned_to_ids.split(", ") : []);
      });
    });

    // ✅ Fetch new users' details (names & emails)
    const [users, coordinators] = await Promise.all([
      fetchUsers(assignedUsers),
      fetchUsers(assignedCoordinators),
    ]);

    const userNames = users.map((user) => user.name).join(", ");
    const coordinatorNames = coordinators.map((user) => user.name).join(", ");
    const userEmails = users.map((user) => user.email);
    const coordinatorEmails = coordinators.map((user) => user.email);
    const newAssignedIds = assignedUsers.map(String);

    // ✅ Find removed users (who are unchecked)
    const removedUsers = oldUsersResult.filter((id) => !newAssignedIds.includes(id));

    // ✅ Update project assignment in the database
    const updateQuery = `
      UPDATE Projects 
      SET assigned_to = ?, 
          assigned_to_ids = ?, 
          assigned_to_coordinators = ?
      WHERE project_id = ?
    `;

    await new Promise((resolve, reject) => {
      db.query(
        updateQuery,
        [
          userNames || null,
          newAssignedIds.length > 0 ? newAssignedIds.join(", ") : null,
          coordinatorNames || null,
          projectId,
        ],
        (error, result) => {
          if (error) return reject(error);
          if (result.affectedRows === 0) {
            return reject(new Error("Project not found or already assigned."));
          }
          resolve();
        }
      );
    });

    console.log("Project updated successfully!");

    // ✅ Fetch Google Sheet URL for the project
    const projectQuery = `SELECT google_sheet_url FROM Projects WHERE project_id = ?`;
    const projectResult = await new Promise((resolve, reject) => {
      db.query(projectQuery, [projectId], (error, results) => {
        if (error) return reject(error);
        resolve(results[0]);
      });
    });

    if (!projectResult || !projectResult.google_sheet_url) {
      return res.status(400).json({ message: "Google Sheet URL not found." });
    }

    const spreadsheetId = projectResult.google_sheet_url.split("/d/")[1].split("/")[0];

    // ✅ Revoke Google Sheets access for removed users
    if (removedUsers.length > 0) {
      // Fetch emails for removed users
      const removedUserEmails = await fetchUsers(removedUsers).then((users) =>
        users.map((user) => user.email)
      );
    
      if (removedUserEmails.length > 0) {
        await revokeSheetAccess(spreadsheetId, removedUserEmails);
      } else {
        console.log("⚠️ No removed user emails found!");
      }
    }

    // ✅ Grant Google Sheets access to both assigned users and coordinators
    const allEmails = [...userEmails, ...coordinatorEmails];
    await grantSheetAccess(spreadsheetId, allEmails);

    res.json({
      success: true,
      message: "Project assigned, Google Sheet access updated!",
    });
  } catch (error) {
    console.error("Error assigning project:", error);
    res.status(500).json({ message: "Database error" });
  }
});

// ✅ Function to grant Google Sheets access to users & coordinators with delay
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

      console.log(`✅ Access granted to: ${email}`);

      // 🕒 Wait for 2 seconds before granting access to the next user
      await new Promise((resolve) => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Failed to grant access to ${email}:`, error);
    }
  }
}


// ✅ Function to revoke Google Sheets access for unchecked users
async function revokeSheetAccess(spreadsheetId, emails) {
  if (!emails || emails.length === 0) {
    console.log("⚠️ No emails provided to revoke access.");
    return;
  }

  // console.log("🔍 Revoking access for:", emails); // Debugging log

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

    // console.log("📄 Current permissions:", permissions.data.permissions);

    const permissionList = permissions.data.permissions || [];

    for (const email of emails) {
      const permission = permissionList.find(
        (perm) => perm.emailAddress === email
      );

      if (permission && permission.id) {
        await drive.permissions.update({
          fileId: spreadsheetId,
          permissionId: permission.id,
          requestBody: {
            role: "reader",
          },
        });

        // console.log(`✅ Changed to read-only for: ${email}`);
      } else {
        console.log(`⚠️ No existing permission found for: ${email}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to update access:", error);
  }
}

// Route to get the file data from the file
router.get("/getProjectData/:projectId", (req, res) => {
  const { projectId } = req.params;

  const query = "SELECT row_data FROM project_data WHERE project_id = ?";

  db.query(query, [projectId], (error, results) => {
    if (error) {
      console.error("Error fetching project data:", error);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length > 0) {
      try {
        const rowData = JSON.parse(results[0].row_data);

        // Assuming the first row contains headers
        const headers = rowData.length > 0 ? rowData[0] : [];
        const data = rowData.length > 1 ? rowData.slice(1) : [];

        res.json({ success: true, headers, data });
      } catch (parseError) {
        console.error("Error parsing project data:", parseError);
        return res.status(500).json({ message: "Error parsing project data." });
      }
    } else {
      res.json({ success: true, headers: [], data: [] });
    }
  });
});

// ✅ Fetch all users except admin (for selection dropdown)
router.get("/get-users-profiles", (req, res) => {
  db.query(
    `SELECT id, name, role 
        FROM users 
        WHERE role IN ('user', 'cordinator', 'manager')`,
    (error, results) => {
      if (error) {
        console.error("Error fetching users:", error);
        return res
          .status(500)
          .json({ success: false, message: "Database error." });
      }

      if (!results || results.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "No users found." });
      }
      res.json(results); // ✅ Send all users except admin
    }
  );
});








// ✅ Updated /payroll/:username route to include hourly salary data
router.get("/payroll/:username", (req, res) => {
  const selectedUsername = req.params.username.trim();
  const { start_date, end_date } = req.query;

  if (!selectedUsername) {
      return res.status(400).json({ success: false, message: "Username not provided." });
  }
  if (!start_date || !end_date) {
      return res.status(400).json({ success: false, message: "Start date and end date are required." });
  }

  // Query for Fixed Salary Payroll Data
  const fixedSalaryQuery = `
      SELECT 
          p.project_id, 
          p.project_name, 
          ws.worker_name AS user_name,
          p.sheet_name, 
          p.profile_name,
          ws.salary,
          ws.no_of_entries,
          'Fixed' AS type
      FROM Projects p
      INNER JOIN WorkerSalaries ws ON p.project_id = ws.project_id
      WHERE 
          p.status = 'completed'
          AND ws.worker_name = ?
          AND p.updated_at BETWEEN ? AND ?
  `;

  // Query for Hourly Salary Payroll Data
  const hourlySalaryQuery = `
      SELECT 
          hpr.project_id,
          p.project_name,
          hpr.worker_name AS user_name,
          'Hourly Project' AS sheet_name,
          'N/A' AS shift,
          hpr.salary,
          0 AS no_of_entries,
          'Hourly' AS type
      FROM hourlyprojectrecords hpr
      INNER JOIN Projects p ON hpr.project_id = p.project_id
      WHERE 
          hpr.worker_name = ?
          AND p.updated_at BETWEEN ? AND ?
  `;

  // Execute both queries
  db.query(fixedSalaryQuery, [selectedUsername, start_date, end_date], (error1, fixedResults) => {
      if (error1) {
          console.error("Error fetching fixed salary data:", error1);
          return res.status(500).json({ success: false, message: "Database error." });
      }

      db.query(hourlySalaryQuery, [selectedUsername, start_date, end_date], (error2, hourlyResults) => {
          if (error2) {
              console.error("Error fetching hourly salary data:", error2);
              return res.status(500).json({ success: false, message: "Database error." });
          }

          const combinedResults = [...fixedResults, ...hourlyResults];
          if (combinedResults.length === 0) {
              return res.status(404).json({
                  success: false,
                  message: "No payroll data available for the selected user within the selected dates.",
              });
          }

          res.json({ success: true, data: combinedResults });
      });
  });
});


// ✅ Fetch only profiles for the profile dropdown
router.get("/get-profiles", (req, res) => {
  db.query(
    `SELECT name, role FROM users WHERE role = 'profile'`,
    (error, results) => {
      if (error) {
        console.error("Error fetching profiles:", error);
        return res
          .status(500)
          .json({ success: false, message: "Database error." });
      }

      if (!results.length) {
        return res
          .status(404)
          .json({ success: false, message: "No profiles found." });
      }

      res.json(results);
    }
  );
});











router.get("/payroll-profile/:profileName", (req, res) => {
  const selectedProfile = req.params.profileName.trim();
  const { start_date, end_date } = req.query;


  if (!selectedProfile) {
    return res
      .status(400)
      .json({ success: false, message: "Profile name not provided." });
  }


  if (!start_date || !end_date) {
    return res.status(400).json({ success: false, message: "Start date and end date are required." });
}



  // ✅ Query for Fixed Profile Payroll Data (NO SUM on profile_debit)
  const fixedProfileQuery = `
        SELECT 
            p.project_id, 
            p.project_name, 
            p.profile_name, 
            p.sheet_name, 
            p.shift,
            ws.profile_debit,  -- ✅ No SUM, fetch as-is
            ws.no_of_entries,  -- ✅ No SUM, fetch as-is
            'Fixed' AS type
        FROM 
            Projects p
        INNER JOIN 
            WorkerSalaries ws ON p.project_id = ws.project_id
        WHERE 
            p.status = 'completed'
            AND p.profile_name = ?
            AND p.updated_at BETWEEN ? AND ?
        ORDER BY 
            p.project_id;
    `;

  // ✅ Query for Hourly Profile Payroll Data (No SUM on profile_debit)
  const hourlyProfileQuery = `
        SELECT 
            p.project_id,
            p.project_name,
            p.profile_name,
            'Hourly Project' AS sheet_name,
            'N/A' AS shift,
            hpr.profile_debit, -- ✅ No SUM here, fetch as-is
            0 AS no_of_entries,  -- ✅ Hourly projects don’t have no_of_entries
            'Hourly' AS type
        FROM 
            hourlyprojectrecords hpr
        INNER JOIN 
            Projects p ON hpr.project_id = p.project_id
        WHERE 
            p.profile_name = ?
            AND p.updated_at BETWEEN ? AND ?
        ORDER BY 
            p.project_id;
    `;

  // Execute both queries
  db.query(fixedProfileQuery, [selectedProfile, start_date, end_date], (error1, fixedResults) => {
    if (error1) {
      console.error("Error fetching fixed profile payroll data:", error1);
      return res
        .status(500)
        .json({ success: false, message: "Database error." });
    }

    db.query(hourlyProfileQuery, [selectedProfile, start_date, end_date], (error2, hourlyResults) => {
      if (error2) {
        console.error("Error fetching hourly profile payroll data:", error2);
        return res
          .status(500)
          .json({ success: false, message: "Database error." });
      }

      // ✅ Ensure each project_id appears only once (Keep the first occurrence)
      const uniqueProjects = {};
      [...fixedResults, ...hourlyResults].forEach((item) => {
        if (!uniqueProjects[item.project_id]) {
          uniqueProjects[item.project_id] = item;
        }
      });

      const combinedResults = Object.values(uniqueProjects); // Convert object back to array

      if (combinedResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No payroll data found for the selected profile.",
        });
      }

      res.json({ success: true, data: combinedResults });
    });
  });
});















// Get project details for the go to project button
router.get("/get-project-details/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await new Promise((resolve, reject) => {
      db.query(
        "SELECT google_sheet_url, is_file_based, project_columns, project_type, work_type FROM Projects WHERE project_id = ?",
        [projectId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    res.json({
      success: true,
      googleSheetUrl: project.google_sheet_url,
      is_file_based: project.is_file_based,
      project_type: project.project_type,
      work_type: project.work_type,
      fixed_option: project.fixed_option,
      project_columns: project.project_columns
        ? project.project_columns.split(", ")
        : [],
    });
  } catch (error) {
    console.error("Error fetching project details:", error);
    res.status(500).json({ success: false, message: "Database error." });
  }
});

const auth = new google.auth.GoogleAuth({
  keyFile: "H:/Payroll with sheet error free/config/google-sheets-key.json", // Update path
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheats = google.sheets({ version: "v4", auth });

router.post("/write-project-columns/:projectId", async (req, res) => {
  const { projectId } = req.params;

  try {
    // Fetch project details including `is_file_based`
    const project = await new Promise((resolve, reject) => {
      db.query(
        "SELECT google_sheet_url, project_columns, work_type, project_type, fixed_option, is_file_based FROM Projects WHERE project_id = ?",
        [projectId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });
    }

    const spreadsheetId = project.google_sheet_url
      .split("/d/")[1]
      .split("/")[0];
    let sheetData = [];

    if (project.is_file_based === 1) {
      // If project is file-based, fetch data from database
      const fileDataResponse = await fetch(
        `http://localhost:3001/admin/getProjectData/${projectId}`
      );
      const fileDataResult = await fileDataResponse.json();

      if (!fileDataResult.success) {
        return res
          .status(500)
          .json({
            success: false,
            message: "Failed to fetch file-based project data.",
          });
      }

      const { headers, data } = fileDataResult;
      if (headers.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No headers found in file data." });
      }

      // Combine headers and data
      sheetData = [headers, ...data];
    } else {
      // If project is NOT file-based, use default columns logic
      let defaultColumns = [];
      if (project.work_type === "Lead Generation") {
        defaultColumns = [
          "Company name",
          "Company email",
          "Website",
          "Industry",
          "Company size",
          "Company country",
          "Contact First name",
          "Contact Last Name",
          "Contact Title",
          "Contact Linkedin",
          "Contact Email",
        ];
      } else if (project.work_type === "Influencer Research") {
        defaultColumns = [
          "Platform",
          "Full name",
          "Username",
          "Profile link",
          "No.of followers",
          "Engagement Rate",
          "Email address",
          "Niche",
        ];
      }

      let projectColumns = project.project_columns
        ? project.project_columns.split(", ")
        : [];
      let allColumns = [...defaultColumns, ...projectColumns];

      if (project.project_type === "fixed") {
        if (project.fixed_option === "Double Entry") {
          allColumns.push("Worker One", "Worker Two");
        } else if (project.fixed_option === "Single Entry") {
          allColumns.push("Worker");
        }
      }

      // Store headers only (empty data)
      sheetData = [allColumns];
    }

    // Write data to Google Sheet
    await sheats.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      requestBody: { values: sheetData },
    });

    // Apply styling: **Black background & White text for headers**
    await sheats.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0, // Default sheet (change if needed)
                startRowIndex: 0,
                endRowIndex: 1, // First row (Headers)
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0, green: 0, blue: 0 }, // Black background
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                  }, // White text
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
        ],
      },
    });










    // **Save Data to Database**
    const saveProjectData = new Promise((resolve, reject) => {
      const checkQuery = "SELECT * FROM project_data WHERE project_id = ?";
      db.query(checkQuery, [projectId], (checkError, results) => {
        if (checkError) {
          console.error("Error checking project data:", checkError);
          return reject(checkError);
        }

        if (results.length > 0) {
          // If data exists, update it
          const updateQuery =
            "UPDATE project_data SET row_data = ? WHERE project_id = ?";
          db.query(
            updateQuery,
            [JSON.stringify(sheetData), projectId],
            (updateError) => {
              if (updateError) {
                console.error("Error updating project data:", updateError);
                return reject(updateError);
              }
              resolve("Data updated successfully");
            }
          );
        } else {
          // If no data exists, insert new data
          const insertQuery =
            "INSERT INTO project_data (project_id, row_data) VALUES (?, ?)";
          db.query(
            insertQuery,
            [projectId, JSON.stringify(sheetData)],
            (insertError) => {
              if (insertError) {
                console.error("Error inserting project data:", insertError);
                return reject(insertError);
              }
              resolve("Data saved successfully");
            }
          );
        }
      });
    });

    await saveProjectData;

    res.json({
      success: true,
      message: "Data written to sheet and saved in database!",
    });
  } catch (error) {
    console.error("Error writing to sheet and saving to database:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to write to sheet and save to database.",
      });
  }
});

module.exports = router;
