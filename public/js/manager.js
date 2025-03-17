let posObjs = {}; // Declare posObjs before it is used

document.addEventListener('DOMContentLoaded', () => {
    fetch('/auth/user-session')
        .then(response => response.json())
        .then(data => {
            console.log('User Session Data:', data); // Log session data
            document.getElementById('user-name').textContent = data.name || 'Guest';

            if (data.name) {
                // Fetch projects only if a manager is logged in
                fetchUnassignedProjects();
                fetchAssignedProjects();
                fetchHourlyUnassignedProjects()
                fetchHourlyAssignedProjects()
                fetchSubmittedProjects(); // Fetch submitted projects
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

// Fetch and populate unassigned projects
function fetchUnassignedProjects() {
    fetch('/manager/get-all-projects') // Updated route for manager-specific filtering
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch unassigned projects');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched unassigned projects:', data); // Log the fetched projects
            populateUnassignedProjectsTable(data);
        })
        .catch(error => {
            console.error('Error fetching unassigned projects:', error);
            alert('No projects for fixed unassigned table.');
        });
}

// Populate the unassigned projects table
function populateUnassignedProjectsTable(data) {
    const tableBody = document.querySelector('#unassigned-table tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No unassigned projects</td></tr>';
    } else {
        data.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td contenteditable="true">${project.project_id || 'N/A'}</td>
            <td contenteditable="true">${project.project_name || 'N/A'}</td>
            <td contenteditable="true">${project.profile_name || 'N/A'}</td>
            <td contenteditable="true">${project.sheet_name || 'N/A'}</td>
            <td contenteditable="true">${project.total_entries || 'N/A'}</td>
            <td contenteditable="true">${project.project_type || 'N/A'}</td>
            <td contenteditable="true">${project.fixed_option || 'N/A'}</td>
            <td contenteditable="true">${project.lumpsum_price || 'N/A'}</td>
            <td contenteditable="true">${project.price_worker_one || 'N/A'}</td>
            <td contenteditable="true">${project.price_worker_two || 'N/A'}</td>
            <td contenteditable="true">${project.shift || 'N/A'}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
            </td>
            <td>
                <button class="assign-btn" data-project-id="${project.id}">Assign To</button>
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
        // Add click event to "Assign To" button
            row.querySelector('.assign-btn').addEventListener('click', () => {
                fetchUsersAndShowModal(project.project_id);
            });
        });
    }
}

// Fetch users and display in modal
function fetchUsersAndShowModal(projectId) {
    // Fetch coordinators and users concurrently
    const fetchCoordinators = fetch('/admin/get-coordinators').then(response => response.json());
    const fetchUsers = fetch('/admin/get-users').then(response => response.json());

    Promise.all([fetchCoordinators, fetchUsers])
        .then(([coordinators, users]) => {
            // Populate Coordinators
            const coordinatorCheckboxesDiv = document.getElementById('coordinatorCheckboxes');
            coordinatorCheckboxesDiv.innerHTML = ''; // Clear previous checkboxes
            coordinators.forEach(coordinator => {
                const checkbox = document.createElement('div');
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${coordinator.id}" class="coordinator-checkbox">
                        ${coordinator.name}
                    </label>
                `;
                coordinatorCheckboxesDiv.appendChild(checkbox);
            });

            // Populate Users
            const userCheckboxesDiv = document.getElementById('userCheckboxes');
            userCheckboxesDiv.innerHTML = ''; // Clear previous checkboxes
            users.forEach(user => {
                const checkbox = document.createElement('div');
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${user.id}" class="user-checkbox">
                        ${user.name}
                    </label>
                `;
                userCheckboxesDiv.appendChild(checkbox);
            });

            // Show modal and store project ID
            const modal = document.getElementById('assignModal');
            modal.classList.remove('hidden');
            document.getElementById('assignProjectForm').setAttribute('data-project-id', projectId);
        })
        .catch(error => console.error('Error fetching users or coordinators:', error));
}

// Attach submit listener for assignProjectForm
const assignProjectForm = document.getElementById('assignProjectForm');
if (assignProjectForm) {
    assignProjectForm.addEventListener('submit', function (event) {
        event.preventDefault();

        // Get the project ID from the form's data attribute
        const projectId = assignProjectForm.getAttribute('data-project-id');

        // Get selected coordinator and user IDs
        const selectedCoordinators = Array.from(document.querySelectorAll('.coordinator-checkbox:checked'))
            .map(checkbox => checkbox.value);
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
            .map(checkbox => checkbox.value);

        // Validate selections
        if (selectedCoordinators.length === 0 && selectedUsers.length === 0) {
            alert('Please select at least one assignee.');
            return;
        }

        // Submit the data
        fetch('/admin/assign-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                assignedUsers: selectedUsers,
                assignedCoordinators: selectedCoordinators
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Assign Project Response:', data); // Log response
                if (data.success) {
                    alert('Project assigned successfully!');
                    // fetchUnassignedProjects();
                    fetchAssignedProjects();

                    // Close the modal
                    document.getElementById('assignModal').classList.add('hidden');
                } else {
                    alert('Error assigning project.');
                }
            })
            .catch(error => {
                console.error('Error assigning project:', error);
                alert('Failed to assign project.');
            });
    });
}

// Handle Assign To button click
function assignProjectToUsers(event) {
    const projectId = event.target.getAttribute('data-project-id'); // Correct attribute
    fetchUsersAndShowModal(projectId);
}

// Close modal
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('assignModal').classList.add('hidden');
});

// Fetch and populate assigned projects
function fetchAssignedProjects() {
    fetch('/manager/get-assigned-projects')
        .then(response => response.json())
        .then(data => populateAssignedProjectsTable(data))
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('No projects for assigned table.');
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
            <td contenteditable="true">${project.project_id || 'N/A'}</td>
            <td contenteditable="true">${project.project_name || 'N/A'}</td>
            <td contenteditable="true">${project.profile_name || 'N/A'}</td>
            <td contenteditable="true">${project.sheet_name || 'N/A'}</td>
            <td contenteditable="true">${project.total_entries || 'N/A'}</td>
            <td contenteditable="true">${project.project_type || 'N/A'}</td>
            <td contenteditable="true">${project.fixed_option || 'N/A'}</td>
            <td contenteditable="true">${project.lumpsum_price || 'N/A'}</td>
            <td contenteditable="true">${project.price_worker_one || 'N/A'}</td>
            <td contenteditable="true">${project.price_worker_two || 'N/A'}</td>
            <td contenteditable="true">${project.shift || 'N/A'}</td>
            <td contenteditable="true">${project.assigned_to || 'N/A'}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
            </td>
            <td>
                <button class="edit-btn" 
                        data-project-id="${project.project_id}" 
                        data-assigned-users="${project.assigned_to_ids || ''}" 
                        data-assigned-coordinators="${project.assigned_to_coordinators || ''}">
                    Edit
                </button>
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

            // Add event listener to Edit button
            row.querySelector('.edit-btn').addEventListener('click', function () {
                const assignedUserIds = this.getAttribute('data-assigned-users').split(',');
                const assignedCoordinatorNames = this.getAttribute('data-assigned-coordinators').split(',');
                fetchUsersAndShowEditModal(project.project_id, assignedUserIds, assignedCoordinatorNames);
            });
        });
    }
}

function fetchUsersAndShowEditModal(projectId, assignedUserIds = [], assignedCoordinatorNames = []) {
    assignedUserIds = Array.isArray(assignedUserIds) ? assignedUserIds : [];
    assignedCoordinatorNames = Array.isArray(assignedCoordinatorNames) ? assignedCoordinatorNames : [];

    console.log('Assigned User IDs:', assignedUserIds);
    console.log('Assigned Coordinator Names:', assignedCoordinatorNames);

    const fetchCoordinators = fetch('/admin/get-coordinators')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch coordinators: ${response.status}`);
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching coordinators:', error);
            return [];
        });

    const fetchUsers = fetch('/admin/get-users')
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
            return response.json();
        })
        .catch(error => {
            console.error('Error fetching users:', error);
            return [];
        });

    Promise.all([fetchCoordinators, fetchUsers])
        .then(([coordinators = [], users = []]) => {
            const assignedUserSet = new Set(assignedUserIds.map(id => id.toString()));

            // Compare coordinator names instead of IDs
            const assignedCoordinatorSet = new Set(assignedCoordinatorNames.map(name => name.trim().toLowerCase()));

            console.log('Fetched Coordinators:', coordinators);
            console.log('Fetched Users:', users);

            const coordinatorCheckboxesDiv = document.getElementById('coordinatorCheckboxesEdit');
            coordinatorCheckboxesDiv.innerHTML = '';
            coordinators.forEach(coordinator => {
                const isChecked = assignedCoordinatorSet.has(coordinator.name.trim().toLowerCase());
                const checkbox = document.createElement('div');
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${coordinator.id}" class="coordinator-checkbox-edit" ${isChecked ? 'checked' : ''}>
                        ${coordinator.name}
                    </label>
                `;
                coordinatorCheckboxesDiv.appendChild(checkbox);
            });

            const userCheckboxesDiv = document.getElementById('userCheckboxesEdit');
            userCheckboxesDiv.innerHTML = '';
            users.forEach(user => {
                const isChecked = assignedUserSet.has(user.id.toString());
                const checkbox = document.createElement('div');
                checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${user.id}" class="user-checkbox-edit" ${isChecked ? 'checked' : ''}>
                        ${user.name}
                    </label>
                `;
                userCheckboxesDiv.appendChild(checkbox);
            });

            const modal = document.getElementById('editAssignModal');
            modal.classList.remove('hidden');
            document.getElementById('editAssignProjectForm').setAttribute('data-project-id', projectId);
        })
        .catch(error => console.error('Error fetching coordinators or users:', error));
}

// Close the modal when the cross button is clicked
const modalCloseButton = document.getElementById('closeEditModal'); // Corrected the ID
if (modalCloseButton) {
    modalCloseButton.addEventListener('click', () => {
        const modal = document.getElementById('editAssignModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    });
}

// Handle form submission for the edit modal
const editAssignProjectForm = document.getElementById('editAssignProjectForm');
if (editAssignProjectForm) {
    editAssignProjectForm.addEventListener('submit', function (event) {
        event.preventDefault();

        const projectId = editAssignProjectForm.getAttribute('data-project-id');

        // Get selected coordinator and user IDs
        const selectedCoordinators = Array.from(document.querySelectorAll('.coordinator-checkbox-edit:checked'))
            .map(checkbox => checkbox.value);
        const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox-edit:checked'))
            .map(checkbox => checkbox.value);

        // Validate selections
        if (selectedCoordinators.length === 0 && selectedUsers.length === 0) {
            alert('Please select at least one assignee.');
            return;
        }

        // Send selected users and coordinators to the server
        fetch('/admin/assign-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                assignedUsers: selectedUsers,
                assignedCoordinators: selectedCoordinators,
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project updated successfully!');

                    // Update the UI by refreshing the tables
                    fetchAssignedProjects();

                    // Close the modal
                    const modal = document.getElementById('editAssignModal');
                    if (modal) {
                        modal.classList.add('hidden');
                    }
                } else {
                    alert('Error updating project.');
                }
            })
            .catch(error => {
                console.error('Error updating project:', error);
                alert('Failed to update project.');
            });
    });
}

// Get hourly assigned projects
function fetchHourlyAssignedProjects() {
    fetch('/manager/get-hourly-assigned-projects')
        .then(response => response.json())
        .then(data => populateHourlyAssignedProjectsTable(data))
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('No projects for hourly assigned table.');
        });
}

// Populate hourly assigned project table
function populateHourlyAssignedProjectsTable(data) {
    const tableBody = document.querySelector('#hourly-assigned-table tbody');
    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13">No assigned projects</td></tr>';
    } else {
        data.forEach(project => {
            const isCompleted = project.status && project.status.toLowerCase() === 'completed';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td contenteditable="true">${project.project_id || 'N/A'}</td>
                <td contenteditable="true">${project.project_name || 'N/A'}</td>
                <td contenteditable="true">${project.profile_name || 'N/A'}</td>
                <td contenteditable="true">${project.sheet_name || 'N/A'}</td>
                <td contenteditable="true">${project.total_entries || 'N/A'}</td>
                <td contenteditable="true">${project.project_type || 'N/A'}</td>
                <td contenteditable="true">${project.price_per_hour || 'N/A'}</td>
                <td contenteditable="true">${project.shift || 'N/A'}</td>
                <td contenteditable="true">${project.assigned_to || 'N/A'}</td>
                <td>
                    <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
                </td>
                <td>
                    <button class="edit-btn" data-project-id="${project.project_id}" data-assigned-users="${project.assigned_to_ids || ''}">Edit</button>
                </td>
                <td>
                    <button class="hourly-calc-btn" data-project-id="${project.project_id}" data-assigned-to="${project.assigned_to}" data-price-per-hour="${project.price_per_hour}" ${isCompleted ? 'disabled' : ''}>
                        Hourly Calculation
                    </button>
                </td>
                <td>
                    <button class="mark-completed-btn" data-project-id="${project.project_id}" ${isCompleted ? 'disabled' : ''}>
                        Mark as Completed
                    </button>
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

            row.querySelector('.edit-btn').addEventListener('click', function () {
                const assignedUserIds = this.getAttribute('data-assigned-users').split(',');
                fetchUsersAndShowEditModal(project.project_id, assignedUserIds);
            });

            row.querySelector('.hourly-calc-btn').addEventListener('click', function () {
                openHourlyCalculationModal(this.dataset.projectId, this.dataset.assignedTo, this.dataset.pricePerHour);
            });

            row.querySelector('.mark-completed-btn').addEventListener('click', function () {
                markProjectAsCompleted(this.dataset.projectId);
            });
        });
    }
}

// Get hourly unassigned projects table
function fetchHourlyUnassignedProjects() {
    fetch('/manager/get-all-hourly-projects')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched unassigned projects:', data); // Check if data is as expected
            // Call the function to populate the table
            populateHourlyUnassignedProjectsTable(data);
        })
        .catch(error => {
            console.error('Error fetching unassigned projects:', error);
            alert('No projects for unassigned table.');
        });
}

// Populate the unassigned projects table
function populateHourlyUnassignedProjectsTable(data) {
    const tableBody = document.querySelector('#hourly-unassigned-table tbody');
    tableBody.innerHTML = ''; // Clear any existing rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No unassigned projects</td></tr>';
    } else {
        data.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td contenteditable="true">${project.project_id || 'N/A'}</td>
            <td contenteditable="true">${project.project_name || 'N/A'}</td>
            <td contenteditable="true">${project.profile_name || 'N/A'}</td>
            <td contenteditable="true">${project.sheet_name || 'N/A'}</td>
            <td contenteditable="true">${project.total_entries || 'N/A'}</td>
            <td contenteditable="true">${project.project_type || 'N/A'}</td>
            <td contenteditable="true">${project.price_per_hour || 'N/A'}</td>
            <td contenteditable="true">${project.shift || 'N/A'}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
            </td>
            <td>
                <button class="assign-btn" data-project-id="${project.id}">Assign To</button>
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

            // Add click event to "Assign To" button
            row.querySelector('.assign-btn').addEventListener('click', () => {
                fetchUsersAndShowModal(project.project_id);
            });
        });
    }
}

// Submitted table 
function fetchSubmittedProjects() {
    fetch('/manager/submittedProjects')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateSubmittedProjectsTable(data.data);
            } else {
                console.error('Failed to fetch submitted projects:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching submitted projects:', error);
        });
}

function populateSubmittedProjectsTable(data) {
    const tableBody = document.querySelector('#submitted-table tbody');
    tableBody.innerHTML = ''; // Clear the table body before populating new rows

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11">No submitted projects</td></tr>';
    } else {
        data.forEach(project => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${project.project_id || 'N/A'}</td>
                <td>${project.project_name || 'N/A'}</td>
                <td>${project.profile_name || 'N/A'}</td>
                <td>${project.sheet_name || 'N/A'}</td>
                <td>${project.project_type || 'N/A'}</td>
                <td>${project.fixed_option || 'N/A'}</td>
                <td>${project.price_worker_one || 'N/A'}</td>
                <td>${project.price_worker_two || 'N/A'}</td>
                <td>${project.lumpsum_price || 'N/A'}</td>
                <td>${project.shift || 'N/A'}</td>
                <td>${project.assigned_to || 'N/A'}</td>
                <td>
                    <button class="go-to-project-btn" data-project-id="${project.project_id}">Go to Project</button>
                </td>
                <td>
                    <button class="approve-btn" 
                        data-project-id="${project.project_id}" 
                        data-assigned-to="${project.assigned_to}" 
                        data-total-entries="${project.total_entries || 0}" 
                        data-fixed-option="${project.fixed_option}" 
                        data-lumpsum-price="${project.lumpsum_price || 0}">
                        Approve
                    </button>
                    <button class="reject-btn" data-project-id="${project.project_id}">Reject</button>
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

            // Add event listener for "Approve"
            row.querySelector('.approve-btn').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const projectId = btn.getAttribute('data-project-id');
                const assignedTo = btn.getAttribute('data-assigned-to');
                const totalEntries = parseInt(btn.getAttribute('data-total-entries'), 10);
                const fixedOption = btn.getAttribute('data-fixed-option');
                const lumpsumPrice = parseFloat(btn.getAttribute('data-lumpsum-price'));
                const pricePerEntry = parseFloat(btn.getAttribute('data-price-per-entry'));

                console.log('Approve button clicked:', { projectId, assignedTo, totalEntries, fixedOption, lumpsumPrice, pricePerEntry });

                handleProjectApproval(projectId, assignedTo, totalEntries, fixedOption, lumpsumPrice, pricePerEntry);
            });

            // Add event listener for "Reject"
            row.querySelector('.reject-btn').addEventListener('click', () => {
                handleProjectRejection(project.project_id);
            });
        });
    }
}

// Update Main Approval Function
function handleProjectApproval(projectId, assignedTo, totalEntries, fixedOption, lumpsumPrice,pricePerEntry) {
    console.log('Inside handleProjectApproval:', { projectId, assignedTo, totalEntries, fixedOption, lumpsumPrice,pricePerEntry });

    if (fixedOption === 'Lumpsum') {
        openLumpsumModal(projectId, assignedTo, lumpsumPrice);
    } else if (fixedOption === 'Double Entry') {
        existingDoubleEntryApprovalLogic(projectId, assignedTo, totalEntries);
    } else if (fixedOption === 'Single Entry') {
        existingSingleEntryApprovalLogic(projectId, assignedTo, pricePerEntry);
    } else {
        alert('Invalid fixed option for project approval.');
    }
}

// Single Entry Approval Logic
function existingSingleEntryApprovalLogic(projectId, assignedTo,pricePerEntry) {
    if (confirm('Are you sure you want to approve this project? Once approved, it cannot be edited.')) {
        fetch(`/admin/getProjectData/${projectId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch project data: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched project data:', data);

                if (!data.data || data.data.length === 0) {
                    alert('No project data found for approval.');
                    return;
                }

                // Split the assignedTo field from the Projects table to get a list of assigned workers
                const assignedWorkers = assignedTo.split(',').map(worker => worker.trim());

                const workersSet = new Set(); // To collect unique workers

                // Loop through project data and match workers with assigned workers
                data.data.forEach(row => {
                    const workers = row[row.length - 1]; // "Workers" column is the last column
                    if (workers) {
                        workers.split(',').forEach(worker => {
                            const trimmedWorker = worker.trim();

                            // Skip rows where the worker name is empty or not assigned to the project
                            if (trimmedWorker && assignedWorkers.includes(trimmedWorker)) {
                                workersSet.add(trimmedWorker); // Only add workers that are assigned
                            }
                        });
                    }
                });

                const workers = Array.from(workersSet);

                if (workers.length === 0) {
                    alert('No workers found for the project.');
                    return;
                }

                // Calculate salary per worker based on matched workers
                const totalSalary = totalEntries * pricePerEntry;
                const salaryPerWorker = totalSalary / workers.length;

                const salaries = workers.map(worker => ({
                    worker,
                    salary: salaryPerWorker
                }));

                // Send approval request to the server with the salaries
                fetch('/manager/approveSingleEntryProject', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ projectId, salaries })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Project approved successfully!');
                            fetchSubmittedProjects(); // Refresh table
                        } else {
                            alert('Failed to approve project: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error approving project:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching project data:', error);
            });
    }
}

// Double Entry Approval Logic
function existingDoubleEntryApprovalLogic(projectId, assignedTo, totalEntries) {
    if (confirm('Are you sure you want to approve this project? Once approved, it cannot be edited.')) {
        fetch(`/admin/getProjectData/${projectId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch project data: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched project data:', data);

                if (!data.data || data.data.length === 0) {
                    alert('No project data found for approval.');
                    return;
                }

                const assignedWorkers = assignedTo.split(',').map(worker => worker.trim());
                const salaries = {};
                const entryCounts = {};

                data.data.forEach(row => {
                    const workerOne = row[row.length - 2]; // Second last column
                    const workerTwo = row[row.length - 1]; // Last column

                    if (workerOne && assignedWorkers.includes(workerOne)) {
                        if (!salaries[workerOne]) {
                            salaries[workerOne] = 0;
                            entryCounts[workerOne] = 0;
                        }
                        salaries[workerOne] += parseFloat(row.price_worker_one || 0); // Add worker one's rate
                        entryCounts[workerOne] += 1; // Increment entry count
                    }

                    if (workerTwo && assignedWorkers.includes(workerTwo)) {
                        if (!salaries[workerTwo]) {
                            salaries[workerTwo] = 0;
                            entryCounts[workerTwo] = 0;
                        }
                        salaries[workerTwo] += parseFloat(row.price_worker_two || 0); // Add worker two's rate
                        entryCounts[workerTwo] += 1; // Increment entry count
                    }
                });

                console.log('Calculated salaries:', salaries);
                console.log('Entry counts per worker:', entryCounts);

                if (Object.keys(salaries).length === 0) {
                    alert('No workers found for the project.');
                    return;
                }

                const salaryData = Object.entries(salaries).map(([worker, salary]) => ({
                    worker,
                    salary,
                    entries: entryCounts[worker]
                }));

                fetch('/manager/approveProject', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, salaryData })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Project approved successfully!');
                            fetchSubmittedProjects(); // Refresh table
                        } else {
                            alert('Failed to approve project: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error approving project:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching project data:', error);
            });
    }
}

// Lumpsum Modal Logic
function openLumpsumModal(projectId, assignedTo, lumpsumPrice) {
    const modal = document.getElementById('lumpsum-modal');
    const tableBody = document.querySelector('#lumpsum-table tbody');
    modal.style.display = 'block';
    tableBody.innerHTML = '';

    const workers = assignedTo.split(',').map(worker => worker.trim());
    let remainingLumpsum = lumpsumPrice;

    workers.forEach(worker => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${worker}</td>
            <td><input type="number" class="salary-input" data-worker="${worker}" value="0"></td>
            <td class="remaining-lumpsum">${remainingLumpsum}</td>
        `;
        tableBody.appendChild(row);
    });

    const salaryInputs = document.querySelectorAll('.salary-input');
    salaryInputs.forEach(input => {
        input.addEventListener('input', () => {
            const totalSalaries = Array.from(salaryInputs).reduce((sum, inp) => sum + parseFloat(inp.value || 0), 0);
            remainingLumpsum = lumpsumPrice - totalSalaries;

            tableBody.querySelectorAll('.remaining-lumpsum').forEach(cell => {
                cell.textContent = remainingLumpsum;
            });

            if (remainingLumpsum < 0) {
                alert('Total salaries exceed Lumpsum Price!');
            }
        });
    });

    document.getElementById('save-lumpsum').onclick = () => {
        const salaries = Array.from(salaryInputs).map(input => ({
            worker: input.getAttribute('data-worker'),
            salary: parseFloat(input.value || 0)
        }));

        if (remainingLumpsum !== 0) {
            alert('Lumpsum Price must be completely distributed before approval!');
            return;
        }

        approveLumpsumProject(projectId, salaries, lumpsumPrice);
        modal.style.display = 'none';
    };

    document.getElementById('close-lumpsum-modal').onclick = () => {
        modal.style.display = 'none';
    };
}

// Approve Lumpsum Project
function approveLumpsumProject(projectId, salaries, lumpsumPrice) {
    fetch('/manager/approveLumpsumProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, salaries, lumpsumPrice })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Project approved successfully!');
                fetchSubmittedProjects(); // Refresh table
            } else {
                alert('Failed to approve project: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error approving project:', error);
        });
}

// Open the modal Hourly calculations
function openHourlyCalculationModal(projectId, assignedTo, pricePerHour) {
    const modal = document.getElementById('hourly-calculation-modal');
    const overlay = document.getElementById('hourly-calculation-modal-overlay');
    const tableBody = document.querySelector('#hourly-calculation-table tbody');
    
    modal.style.display = 'block';
    overlay.style.display = 'block';

    // Populate the modal
    const workers = assignedTo.split(',').map(worker => worker.trim());
    tableBody.innerHTML = ''; // Clear previous rows

    workers.forEach(worker => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${worker}</td>
            <td><input type="number" class="runned-hours-input" data-worker="${worker}" value="0"></td>
            <td>${pricePerHour}</td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('save-hourly-calculation').onclick = () => {
        const salaries = Array.from(document.querySelectorAll('.runned-hours-input')).map(input => {
            const worker = input.dataset.worker;
            const runnedHours = parseFloat(input.value || 0);
            return {
                worker,
                runnedHours,
                salary: runnedHours * pricePerHour,
            };
        });

        saveHourlyCalculation(projectId, salaries);
        modal.style.display = 'none';
        overlay.style.display = 'none';
    };

    document.getElementById('close-hourly-modal').onclick = () => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    };
}

// Save data to the database
function saveHourlyCalculation(projectId, salaries) {
    fetch('/manager/save-hourly-calculation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, salaries }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Hourly data saved successfully!');
                fetchHourlyAssignedProjects(); // Refresh table
            } else {
                alert('Failed to save hourly data: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving hourly data:', error);
        });
}

// Mark project as completed
function markProjectAsCompleted(projectId) {
    if (confirm('Are you sure you want to mark this project as completed?')) {
        fetch('/manager/mark-project-completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project marked as completed!');
                    fetchHourlyAssignedProjects(); // Refresh the table
                } else {
                    alert('Failed to mark project as completed: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error marking project as completed:', error);
            });
    }
}

// Handle Rejection
function handleProjectRejection(projectId) {
    if (confirm('Are you sure you want to reject this project? Once rejected, it cannot be edited.')) {
        fetch('/manager/rejectProject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projectId })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Project rejected successfully!');
                    fetchSubmittedProjects(); // Refresh table
                } else {
                    alert('Failed to reject project: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error rejecting project:', error);
            });
    }
}

// To save the project after edit
async function updateProjects(updates) {
    const response = await fetch('/manager/update-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
        throw new Error('Failed to update projects');
    }
    await fetchAssignedProjects();
    await fetchUnassignedProjects();
    return response.json();
}

document.addEventListener('keydown', async (event) => {
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();

        // Gather data from the editable rows in both tables
        const assignedTableRows = document.querySelectorAll('#assigned-table tbody tr');
        const unassignedTableRows = document.querySelectorAll('#unassigned-table tbody tr');

        // Prepare data for assigned projects
        const assignedUpdates = Array.from(assignedTableRows).map(row => getRowData(row));
        const unassignedUpdates = Array.from(unassignedTableRows).map(row => getRowData(row));

        try {
            // Send updates to the server
            await updateProjects([...assignedUpdates, ...unassignedUpdates]);
            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Error saving changes:', error);
            alert('Failed to save changes. Please try again.');
        }
    }
});

// Helper to extract row data
function getRowData(row) {
    const cells = row.querySelectorAll('td[contenteditable="true"]');
    return {
        project_id: cells[0]?.innerText.trim() || null,
        project_name: cells[1]?.innerText.trim() || null,
        profile_name: cells[2]?.innerText.trim() || null,
        sheet_name: cells[3]?.innerText.trim() || null,
        total_entries: cells[4]?.innerText.trim() || null,
        price_per_entry: cells[5]?.innerText.trim() || null,
        shift: cells[6]?.innerText.trim() || null,
        assigned_to: cells[7]?.innerText.trim() || null,
    };
}

// Helper to send updates to the server
async function updateProjects(updates) {
    const response = await fetch('/manager/update-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
        throw new Error('Failed to update projects');
    }
    return response.json();
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
            populateAsssignedProjectsTable(data.projects);
        })
        .catch(error => {
            console.error('Error fetching assigned projects:', error);
            alert('Error fetching assigned projects.');
        });
}

function populateAsssignedProjectsTable(projects) {
    const tableBody = document.querySelector('#asssigned-table tbody');
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