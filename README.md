Office Management Dashboard
A web-based office management system with role-based dashboards for Admin, Users, Managers, and Coordinators. The system allows admins to assign projects, track progress, and calculate salaries based on work contributions. It also integrates Google Sheets for seamless data management.

 Features
 Admin Dashboard

Add projects and assign them to users.
Monitor progress and calculate salaries based on user work.
Manage users and roles.
 User Dashboard

View assigned projects and submit work.
Track progress and earnings.
 Manager Dashboard

Oversee team performance.
Approve or request changes in project submissions.
 Coordinator Dashboard

Help manage project distribution.
Ensure smooth workflow between teams.
 Google Sheets Integration

Embedded Google Sheets for real-time data tracking.
Export reports to Excel/CSV formats.
 Tech Stack
Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express
Database: MySQL / MongoDB (mention which one you used)
File Handling: multer for uploads, fs for file management
Google API: Google Sheets API for data handling
 Project Structure
bash
Copy
Edit
/project-root
│── /models
│   ├── user.js
│── /routes
│   ├── dashboard.js
│── /database
│   ├── db.js
│── /services
│   ├── googleSheets.js
│── /public
│   ├── css/
│   ├── js/
│── app.js
│── package.json
│── README.md
📌 Installation & Setup
1 Clone this repository

bash
Copy
Edit
git clone https://github.com/No-One56/payroll-with-sheet-error-free.git
cd your-repo-name
2 Install dependencies

bash
Copy
Edit
npm install
3️⃣ Set up your Google Sheets API credentials and Database (Update config.env or .env file)

4️⃣ Start the server

bash
Copy
Edit
npm start
5️⃣ Open in your browser:

bash
Copy
Edit
http://localhost:3000
🔧 Dependencies
Make sure you have these installed:

Node.js
npm
MySQL
Google API Credentials
Install required npm packages:

bash
Copy
Edit
npm install express multer csv-parser xlsx fs path googleapis dotenv
📜 Code Snippet
Example of Google Sheets API integration:

js
Copy
Edit
const { google } = require("googleapis");
const { drive, sheets } = require("../services/googleSheets");

async function fetchGoogleSheetData(sheetId) {
    const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
    const client = await auth.getClient();
    const sheetsAPI = google.sheets({ version: "v4", auth: client });

    const response = await sheetsAPI.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Sheet1!A1:E10",
    });

    console.log(response.data.values);
}
📄 License
This project is open-source. You can modify and distribute it as per your needs.

