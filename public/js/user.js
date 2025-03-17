let posObjs = {}; // Declare posObjs before it is used

document.addEventListener('DOMContentLoaded', () => {
    // Fetch the user session data to get the logged-in user's details
    fetch('/auth/user-session')
        .then(response => response.json())
        .then(data => {
            console.log("User Session Data:", data); // Log the fetched data
            if (data.name) {
                document.getElementById('user-name').textContent = data.name || 'Guest';
                document.getElementById('welcome-user-name').textContent = data.name || 'Guest';
                fetchAssignedProjects(data.name); // Pass the user's name to the fetch function
            } else {
                console.error("User session data is invalid:", data);
            }
        })
        .catch(error => console.error("Error fetching user session:", error));

    // Initialize sidebar and its interactions
    initializeSidebar();

    // Initialize payroll tab click listener
    initializePayrollTab();
});

// Function to log out the user
function logout() {
    fetch('/auth/logout', { method: 'GET' })
        .then(() => {
            window.location.href = '/auth/login';
        })
        .catch(error => console.error("Error logging out:", error));
}

// Function to initialize payroll tab
function initializePayrollTab() {
    const payrollTab = document.querySelector('#payroll-tab');
    if (payrollTab) {
        payrollTab.addEventListener('click', () => {
            document.querySelector('#payroll').classList.remove('hidden');
            document.querySelectorAll('.content-section').forEach(section => {
                if (section.id !== 'payroll') section.classList.add('hidden');
            });
            fetchPayrollData();
        });
    } else {
        console.error("Payroll tab element not found in DOM.");
    }
}

// Function to initialize sidebar
function initializeSidebar() {
    const toggle = document.getElementById('toggle');
    const sidebar = document.getElementById('sidebar');
    const contentSections = document.querySelectorAll('.content-section');
    const sidebarLinks = sidebar.querySelectorAll('li');

    toggle.addEventListener('click', function () {
        sidebar.classList.toggle('collapsed');
        document.getElementById('top-bar').classList.toggle('collapsed');
        document.getElementById('content').classList.toggle('collapsed');
    });

    function hideAllSections() {
        contentSections.forEach(section => section.classList.add('hidden'));
    }

    function showSection(sectionId) {
        hideAllSections();
        document.getElementById(sectionId).classList.remove('hidden');
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function () {
            sidebarLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
            const contentId = this.getAttribute('data-content');
            showSection(contentId);
        });
    });

    const initialSection = 'home';
    hideAllSections();
    document.getElementById(initialSection).classList.remove('hidden');
    sidebar.querySelector(`[data-content=${initialSection}]`).classList.add('active');
}



function fetchAssignedProjects(userName) {
    fetch('/user/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Assigned projects for ${userName}:`, data.projects); // Log the fetched projects
            populateAssignedProjectsTable(data.projects);
        })
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('Error fetching assigned projects.');
        });
}


function populateAssignedProjectsTable(projects) {
    const tableBody = document.querySelector('#assigned-table tbody');
    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!projects || projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No assigned projects</td></tr>';
    } else {
        projects.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${project.project_id || 'N/A'}</td>
                <td>${project.project_name || 'N/A'}</td>
                <td>${project.profile_name || 'N/A'}</td>
                <td>${project.sheet_name || 'N/A'}</td>
                <td>${project.total_entries || 'N/A'}</td>
                <td>${project.project_type || 'N/A'}</td>
                <td>${project.fixed_option || 'N/A'}</td>
                <td>${project.lumpsum_price || 'N/A'}</td>
                <td>${project.price_worker_one || 'N/A'}</td>
                <td>${project.price_worker_two || 'N/A'}</td>
                <td>${project.price_per_hour || 'N/A'}</td>
                <td>${project.shift || 'N/A'}</td>
                <td>
                    <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to project</button>
                </td>
                <td>
                    <button class="submit-project-btn" data-project-id="${project.project_id}">Submit</button>
                </td>
            `;
            tableBody.appendChild(row);

            // Add o to project button details
      row.querySelector(".go-to-project-btn").addEventListener("click", async () => {
        try {
          const response = await fetch(`/admin/get-project-details/${project.project_id}`);
          const result = await response.json();
      
          if (!result.success) {
            alert("Project details not found.");
            return;
          }
      
          const { googleSheetUrl, is_file_based } = result;
      
          if (!googleSheetUrl) {
            alert("Google Sheet URL not found for this project.");
            return;
          }
      
          // Call /write-project-columns whether file-based or not
          const writeResponse = await fetch(`/admin/write-project-columns/${project.project_id}`, { method: "POST" });
          const writeResult = await writeResponse.json();
      
          if (!writeResult.success) {
            alert("Failed to process project data.");
            return;
          }
      
          window.open(googleSheetUrl, "_blank"); // Open the sheet
      
        } catch (error) {
          console.error("Error fetching project details:", error);
          alert("Failed to open the project. Try again later.");
        }
      });
            // Add event listener for "Submit Project"
            row.querySelector('.submit-project-btn').addEventListener('click', () => {
                submitProject(project.project_id);
            });
        });
    }
}



function submitProject(projectId) {
    if (confirm('Are you sure you want to submit this project? Once submitted, it cannot be edited.')) {
        fetch(`/user/submitProject/${projectId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project submitted successfully!');
                    fetchAssignedProjects(); // Refresh the table after submission
                } else {
                    alert('Failed to submit the project: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error submitting project:', error);
                alert('Error submitting project. Please try again later.');
            });
    }
}




// Add functionality for fetching and populating payroll data
function fetchPayrollData() {
    fetch('/user/payroll')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populatePayrollTable(data.data);
            } else {
                console.error('Failed to fetch payroll data:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching payroll data:', error);
        });
}

// Function to populate the payroll table
function populatePayrollTable(data) {
    const tableBody = document.querySelector('#payroll-table tbody');
    if (!tableBody) {
        console.error("Payroll table body not found in DOM.");
        return;
    }

    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No payroll data available</td></tr>';
    } else {
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.project_id || 'N/A'}</td>
                <td>${item.project_name || 'N/A'}</td>
                <td>${item.profile_name || 'N/A'}</td>
                <td>${item.sheet_name || 'N/A'}</td>
                <td>${item.project_type || 'N/A'}</td>
                <td>${item.fixed_option || 'N/A'}</td>
                <td>${item.shift || 'N/A'}</td>
                <td>${item.no_of_entries || 'N/A'}</td>
                <td>${item.salary || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}