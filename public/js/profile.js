let posObjs = {}; // Declare posObjs before it is used

document.addEventListener('DOMContentLoaded', () => {
    fetch('/auth/user-session')
        .then(response => response.json())
        .then(data => {
            console.log('User Session Data:', data); // Log session data
            document.getElementById('user-name').textContent = data.name || 'Guest';

            if (data.name) {
                // Fetch projects only if a manager is logged in
                fetchassignedProjectsForProfile();
                fetchUnassignedProjectsForProfile();
                fetchProfilePayrollData();
                fetchAsssignedProjects()
            } else {
                alert('Error: Manager not logged in');
            }
        })
        .catch(error => console.error('Error fetching user session:', error));
    initializeSidebar();
    initializeAddColumnForm();
    initializeAddProjectForm();
    initializeAddProjectWithFileForm();
    initializeAddHourlyProjectForm();
    initializeAddHourlyProjectWithFileForm();
    fetchProfilePayrollData();
});

// Function to log out the user
function logout() {
    fetch('/auth/logout', {
        method: 'GET'
    }).then(() => {
        window.location.href = '/auth/login';
    });
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



// Initialize Add Column Form
function initializeAddColumnForm() {
    const addColumnButton = document.getElementById('addColumn');
    const addColumnForm = document.getElementById('addColumnForm');
    const addColumnFormElement = document.getElementById('addColumnFormElement');

    addColumnButton.addEventListener('click', function () {
        addColumnForm.classList.toggle('hidden');
    });

    // Handle form submission
    addColumnFormElement.addEventListener('submit', function (event) {
        event.preventDefault();
        const columnName = document.getElementById('columnName').value;

        fetch('/admin/add-column', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ columnName }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Column added successfully!');
                    addColumnForm.classList.add('hidden');
                    addColumnFormElement.reset();
                } else {
                    alert(`Error adding column: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to add column.');
            });
    });
}

// Add project to database without file 
function initializeAddProjectForm() {
    const addProjectButton = document.getElementById('addProject');
    const addProjectForm = document.getElementById('addProjectForm');
    const addProjectFormElement = document.getElementById('addProjectFormElement');
    const projectColumnsDropdown = $('#projectColumns');
    const managersDropdown = $('#managers'); // Select Managers dropdown

    const lumpsumPriceField = document.getElementById('lumpsumPriceField');
    const doubleEntryFields = document.getElementById('doubleEntryFields');

    // Toggle form visibility
    addProjectButton.addEventListener('click', function () {
        addProjectForm.classList.toggle('hidden');
        fetchColumns(); // Populate project columns dynamically
        fetchManagers(); // Populate managers dynamically
    });

    // Show/Hide fields based on Fixed Option
    document.querySelectorAll('input[name="fixedOption"]').forEach(option => {
        option.addEventListener('change', function () {
            lumpsumPriceField.classList.add('hidden');
            doubleEntryFields.classList.add('hidden');
            singleEntryPriceField.classList.add('hidden'); // Hide Single Entry Field

            if (this.value === 'Lumpsum') {
                lumpsumPriceField.classList.remove('hidden');
            } else if (this.value === 'Double Entry') {
                doubleEntryFields.classList.remove('hidden');
            } else if (this.value === 'Single Entry') {
                singleEntryPriceField.classList.remove('hidden');
            }
        });
    });


    // Form submission
    addProjectFormElement.addEventListener('submit', function (event) {
        event.preventDefault();

        const selectedManagers = managersDropdown.val(); // Get selected managers
        const workType = document.querySelector('input[name="workType"]:checked')?.value || null;

        const projectData = {
            projectId: document.getElementById('projectId').value,
            projectName: document.getElementById('projectName').value,
            profileName: document.getElementById('profileName').value,
            sheetName: document.getElementById('sheetName').value,
            totalEntries: document.getElementById('totalEntries').value,
            projectType: 'fixed',
            fixedOption: document.querySelector('input[name="fixedOption"]:checked')?.value,
            workType: workType, // Add this line to capture workType
            lumpsumPrice: document.getElementById('lumpsumPrice').value || null,
            priceWorkerOne: document.getElementById('priceWorkerOne').value || null,
            priceWorkerTwo: document.getElementById('priceWorkerTwo').value || null,
            shift: selectedManagers, // Store selected managers in shift
            instructions: document.getElementById('instructions').value || '',
            projectColumns: projectColumnsDropdown.val(),
            pricePerEntry: document.getElementById('pricePerEntry').value || null,

        };

        fetch('/admin/add-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project added successfully!');
                    resetForm();
                } else {
                    alert(`Error adding project: ${data.message}`);
                }
            })
            .catch(error => console.error('Error:', error));
    });

    function fetchColumns() {
        fetch('/admin/get-columns')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    projectColumnsDropdown.empty();
                    projectColumnsDropdown.append('<option disabled>Select Columns</option>');
                    data.columns.forEach(column => {
                        projectColumnsDropdown.append(new Option(column.name, column.name));
                    });
                    projectColumnsDropdown.select2({ placeholder: 'Select columns...', allowClear: true });
                }
            });
    }

    function fetchManagers() {
        fetch('/admin/get-managers')
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch managers');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    managersDropdown.empty();
                    managersDropdown.append('<option disabled>Select Managers</option>');
                    data.managers.forEach(manager => {
                        managersDropdown.append(new Option(manager.name, manager.name));
                    });
                    managersDropdown.select2({ placeholder: 'Select managers...', allowClear: true });
                } else {
                    throw new Error(data.message || 'Unknown error');
                }
            })
            .catch(error => console.error('Error fetching managers:', error));
    }

    function resetForm() {
        addProjectFormElement.reset();
        lumpsumPriceField.classList.add('hidden');
        doubleEntryFields.classList.add('hidden');
        projectColumnsDropdown.val(null).trigger('change');
        managersDropdown.val(null).trigger('change');
    }
}

// Add project with file in the database 
function initializeAddProjectWithFileForm() {
    const addProjectWithFileButton = document.getElementById('addProjectWithFile');
    const addProjectWithFileForm = document.getElementById('addProjectWithFileForm');
    const addProjectWithFileFormElement = document.getElementById('addProjectWithFileFormElement');

    const lumpsumPriceField = document.getElementById('lumpsumPriceFieldWithFile');
    const doubleEntryFields = document.getElementById('doubleEntryFieldsWithFile');
    const singleEntryFields = document.getElementById('singleEntryFieldWithFile');
    const managersDropdown = $('#managersWithFile'); // Select Managers dropdown

    // Toggle visibility of the Add Project With File Form
    addProjectWithFileButton.addEventListener('click', function () {
        addProjectWithFileForm.classList.toggle('hidden');
        fetchManagers(); // Populate managers dynamically
    });

    // Show/Hide fields based on Fixed Option
    document.querySelectorAll('input[name="fixedOption"]').forEach(option => {
        option.addEventListener('change', function () {
            lumpsumPriceField.classList.add('hidden');
            doubleEntryFields.classList.add('hidden');
            singleEntryFields.classList.add('hidden'); // Hide Single Entry field

            if (this.value === 'Lumpsum') {
                lumpsumPriceField.classList.remove('hidden');
            } else if (this.value === 'Double Entry') {
                doubleEntryFields.classList.remove('hidden');
            } else if (this.value === 'Single Entry') {
                singleEntryFields.classList.remove('hidden'); // Show Single Entry field
            }
        });
    });

    // Fetch managers dynamically
    function fetchManagers() {
        fetch('/admin/get-managers')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    managersDropdown.empty();
                    managersDropdown.append('<option disabled>Select Managers</option>');
                    data.managers.forEach(manager => {
                        managersDropdown.append(new Option(manager.name, manager.name));
                    });
                    managersDropdown.select2({ placeholder: 'Select managers...', allowClear: true });
                }
            })
            .catch(error => console.error('Error fetching managers:', error));
    }

    // Handle form submission
    addProjectWithFileFormElement.addEventListener('submit', function (event) {
        event.preventDefault();

        const selectedManagers = managersDropdown.val(); // Get selected managers

        const formData = new FormData(addProjectWithFileFormElement);

        // Append selected managers as shift
        formData.append('shift', selectedManagers);

        // Append default null values for optional fields if empty
        if (!formData.get('instructions')) {
            formData.set('instructions', null);
        }

        if (!formData.get('lumpsumPrice')) {
            formData.set('lumpsumPrice', null);
        }

        if (!formData.get('priceWorkerOne')) {
            formData.set('priceWorkerOne', null);
        }

        if (!formData.get('priceWorkerTwo')) {
            formData.set('priceWorkerTwo', null);
        }

        // Log formData for debugging
        console.log('Form data before submission:');
        for (const [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        fetch('/admin/add-project-with-file', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project with file added successfully!');
                    addProjectWithFileForm.classList.add('hidden');
                    addProjectWithFileFormElement.reset();
                } else {
                    alert(`Error adding project with file: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error adding project with file:', error);
                alert('Failed to add project with file.');
            });
    });
}

// Add hourly project without file
function initializeAddHourlyProjectForm() {
    const addHourlyProjectButton = document.getElementById('addHourlyProject');
    const addHourlyProjectForm = document.getElementById('addHourlyProjectForm');
    const addHourlyProjectFormElement = document.getElementById('addHourlyProjectFormElement');
    const hourlyProjectColumnsDropdown = $('#hourlyProjectColumns');
    const managersDropdown = $('#hourlymanagers'); // Select Managers dropdown

    // Toggle form visibility
    addHourlyProjectButton.addEventListener('click', function () {
        addHourlyProjectForm.classList.toggle('hidden');
        fetchColumns(); // Populate project columns dynamically
        fetchManagers(); // Populate managers dynamically
    });

    // Form submission
    addHourlyProjectFormElement.addEventListener('submit', function (event) {
        event.preventDefault();

        const selectedManagers = managersDropdown.val(); // Get selected managers

        const hourlyProjectData = {
            projectId: document.getElementById('hourlyProjectId').value,
            projectName: document.getElementById('hourlyProjectName').value,
            profileName: document.getElementById('hourlyProfileName').value,
            sheetName: document.getElementById('hourlySheetName').value,
            totalEntries: document.getElementById('hourlyTotalEntries').value,
            projectType: 'hourly',
            pricePerHour: document.getElementById('hourlyPricePerHour').value,
            workType: document.querySelector('input[name="workType"]:checked').value, // Fetch selected work type
            shift: selectedManagers, // Store selected managers in shift
            instructions: document.getElementById('hourlyInstructions').value || null,
            projectColumns: hourlyProjectColumnsDropdown.val(),
        };

        fetch('/admin/add-hourly-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hourlyProjectData),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Hourly project added successfully!');
                    resetForm();
                } else {
                    alert(`Error adding hourly project: ${data.message}`);
                }
            })
            .catch(error => console.error('Error:', error));
    });

    // Fetch the managers from the backend
    function fetchManagers() {
        fetch('/admin/get-managers')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    managersDropdown.empty();
                    managersDropdown.append('<option disabled>Select Managers</option>');
                    data.managers.forEach(manager => {
                        managersDropdown.append(new Option(manager.name, manager.name));
                    });
                    managersDropdown.select2({ placeholder: 'Select managers...', allowClear: true });
                }
            })
            .catch(error => console.error('Error fetching managers:', error));
    }

    // Fetch project columns
    function fetchColumns() {
        fetch('/admin/get-columns')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    hourlyProjectColumnsDropdown.empty();
                    hourlyProjectColumnsDropdown.append('<option disabled>Select Columns</option>');
                    data.columns.forEach(column => {
                        hourlyProjectColumnsDropdown.append(new Option(column.name, column.name));
                    });
                    hourlyProjectColumnsDropdown.select2({ placeholder: 'Select columns...', allowClear: true });
                }
            });
    }

    function resetForm() {
        addHourlyProjectFormElement.reset();
        hourlyProjectColumnsDropdown.val(null).trigger('change');
        managersDropdown.val(null).trigger('change');
    }
}

// Add hourly  project with file 
function initializeAddHourlyProjectWithFileForm() {
    const addHourlyProjectWithFileButton = document.getElementById('addHourlyProjectWithFile');
    const addHourlyProjectWithFileForm = document.getElementById('addHourlyProjectWithFileForm');
    const addHourlyProjectWithFileFormElement = document.getElementById('addHourlyProjectWithFileFormElement');
    const managersDropdown = $('#hourlymanagersWithFile'); // Select Managers dropdown

    // Toggle form visibility
    addHourlyProjectWithFileButton.addEventListener('click', function () {
        addHourlyProjectWithFileForm.classList.toggle('hidden');
        fetchManagers(); // Populate managers dynamically
    });

    // Form submission
    addHourlyProjectWithFileFormElement.addEventListener('submit', function (event) {
        event.preventDefault();

        const formData = new FormData(addHourlyProjectWithFileFormElement);

        // Get selected managers from the dropdown
        const selectedManagers = managersDropdown.val();
        formData.append('shift', selectedManagers);

        fetch('/admin/add-hourly-project-with-file', {
            method: 'POST',
            body: formData,
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Hourly project with file added successfully!');
                    resetForm();
                } else {
                    alert(`Error adding project with file: ${data.message}`);
                }
            })
            .catch(error => console.error('Error:', error));
    });

    // Fetch managers dynamically from the backend
    function fetchManagers() {
        fetch('/admin/get-managers')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    managersDropdown.empty();
                    managersDropdown.append('<option disabled>Select Managers</option>');
                    data.managers.forEach(manager => {
                        managersDropdown.append(new Option(manager.name, manager.name));
                    });
                    managersDropdown.select2({ placeholder: 'Select managers...', allowClear: true });
                } else {
                    console.error('Error fetching managers');
                }
            })
            .catch(error => console.error('Error fetching managers:', error));
    }

    function resetForm() {
        addHourlyProjectWithFileFormElement.reset();
        managersDropdown.val(null).trigger('change');
    }
}

// Fetch unassigned projects for the logged-in profile
function fetchUnassignedProjectsForProfile() {
    fetch('/profile/get-unassigned-projects') // Updated route for profile-specific filtering
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch unassigned projects');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched unassigned projects for profile:', data); // Log the fetched projects
            populateUnassignedProjectsTable(data); // Reuse the same function to populate the table
        })
        .catch(error => {
            console.error('Error fetching unassigned projects:', error);
            alert('Error fetching unassigned projects.');
        });
}

// Reuse the populateUnassignedProjectsTable function from your existing implementation
function populateUnassignedProjectsTable(data) {
    const tableBody = document.querySelector('#unassigned-table tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No unassigned projects</td></tr>';
    } else {
        data.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${project.project_id || 'N/A'}</td>
            <td>${project.project_name || 'N/A'}</td>
            <td>${project.profile_name || 'N/A'}</td>
            <td>${project.sheet_name || 'N/A'}</td>
            <td>${project.total_entries || 'N/A'}</td>
            <td>${project.price_per_entry || 'N/A'}</td>
            <td>${project.shift || 'N/A'}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
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
        });
    }
}

// Fetch and populate assigned projects
function fetchassignedProjectsForProfile() {
    fetch('/profile/get-assigned-projects') // Updated route for profile-specific filtering
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch assigned projects');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched assigned projects for profile:', data); // Log the fetched projects
            populateAssignedProjectsTable(data); // Reuse the same function to populate the table
        })
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('Error fetching assigned projects.');
        });
}

function populateAssignedProjectsTable(data) {
    const tableBody = document.querySelector('#assigned-table tbody');
    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9">No assigned projects</td></tr>';
    } else {
        data.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${project.project_id || 'N/A'}</td>
            <td>${project.project_name || 'N/A'}</td>
            <td>${project.profile_name || 'N/A'}</td>
            <td>${project.sheet_name || 'N/A'}</td>
            <td>${project.total_entries || 'N/A'}</td>
            <td>${project.price_per_entry || 'N/A'}</td>
            <td>${project.shift || 'N/A'}</td>
            <td>${project.assigned_to || 'N/A'}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
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
        });
    }
}



// Function to fetch payroll data for the profile
function fetchProfilePayrollData() {
    fetch('/profile/payroll')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateProfilePayrollTable(data.data);
            } else {
                console.error('Failed to fetch profile payroll data:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching profile payroll data:', error);
        });
}

function populateProfilePayrollTable(data) {
    const tableBody = document.querySelector('#payroll-table tbody');
    if (!tableBody) {
        console.error("Payroll table body not found in DOM.");
        return;
    } 

    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No payroll data available</td></tr>';
    } else {
        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.project_id || 'N/A'}</td>
                <td>${item.project_name || 'N/A'}</td>
                <td>${item.profile_name || 'N/A'}</td>
                <td>${item.sheet_name || 'N/A'}</td>
                <td>${item.shift || 'N/A'}</td>
                <td>${item.no_of_entries || 'N/A'}</td>
                <td>${item.salary || 'N/A'}</td>
                <td>${item.profile_debit || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });
    }
}

function fetchAsssignedProjects(userName) {
    fetch('/user/projects')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Assigned projects for ${userName}:`, data.projects); // Log the fetched projects
            populateAsssignedProjectsTablle(data.projects);
        })
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('Error fetching assigned projects.');
        });
}


function populateAsssignedProjectsTablle(projects) {
    const tableBody = document.querySelector('#assigned-table1 tbody');
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
                    fetchAsssignedProjects(); // Refresh the table after submission
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