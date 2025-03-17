let posObjs = {}; // Declare posObjs before it is used

document.addEventListener("DOMContentLoaded", function () {
  // Initialize application
  initializeSidebar();
  initializeHomeButtons();
  initializeAddColumnForm();
  initializeAddProjectForm();
  initializeAddProjectWithFileForm();
  initializeAddHourlyProjectForm();
  initializeAddHourlyProjectWithFileForm();
  fetchPendingRegistrations();
  fetchUnassignedProjects();
  fetchAssignedProjects();
  fetchHourlyUnassignedProjects();
  fetchHourlyAssignedProjects();
});
 
// Sidebar initialization
function initializeSidebar() {
  const toggle = document.getElementById("toggle");
  const sidebar = document.getElementById("sidebar");
  const contentSections = document.querySelectorAll(".content-section");
  const sidebarLinks = sidebar.querySelectorAll("li");

  // Toggle sidebar visibility
  toggle.addEventListener("click", function () {
    sidebar.classList.toggle("collapsed");
    document.getElementById("content").classList.toggle("collapsed");
  });

  // Hide all content sections
  function hideAllSections() {
    contentSections.forEach((section) => section.classList.add("hidden"));
  }

  // Show specific section by ID
  function showSection(sectionId) {
    hideAllSections();
    document.getElementById(sectionId).classList.remove("hidden");
  }

  // Sidebar link click handling
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", function () {
      sidebarLinks.forEach((link) => link.classList.remove("active"));
      this.classList.add("active");
      const contentId = this.getAttribute("data-content");
      showSection(contentId);
    });
  });

  // Set the initial visible section
  const initialSection = "home";
  hideAllSections();
  document.getElementById(initialSection).classList.remove("hidden");
  sidebar
    .querySelector(`[data-content=${initialSection}]`)
    .classList.add("active");
}

// Initialize Home Section Buttons
function initializeHomeButtons() {
  const homeButtons = document.querySelectorAll(".home-button");

  // Handle home button clicks
  homeButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const contentId = this.getAttribute("data-content");
      showHomeContent(contentId);
      hideTables(); // Hide tables whenever a button is clicked
    });
  });
}

// Initialize Add Column Form
function initializeAddColumnForm() {
  const addColumnButton = document.getElementById("addColumn");
  const addColumnForm = document.getElementById("addColumnForm");
  const addColumnFormElement = document.getElementById("addColumnFormElement");

  addColumnButton.addEventListener("click", function () {
    addColumnForm.classList.toggle("hidden");
  });

  // Handle form submission
  addColumnFormElement.addEventListener("submit", function (event) {
    event.preventDefault();
    const columnName = document.getElementById("columnName").value;

    fetch("/admin/add-column", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnName }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Column added successfully!");
          addColumnForm.classList.add("hidden");
          addColumnFormElement.reset();
        } else {
          alert(`Error adding column: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to add column.");
      });
  });
}

// Add project to database without file
function initializeAddProjectForm() {
  const addProjectButton = document.getElementById("addProject");
  const addProjectForm = document.getElementById("addProjectForm");
  const addProjectFormElement = document.getElementById(
    "addProjectFormElement"
  );
  const projectColumnsDropdown = $("#projectColumns");
  const managersDropdown = $("#managers"); // Select Managers dropdown

  const lumpsumPriceField = document.getElementById("lumpsumPriceField");
  const doubleEntryFields = document.getElementById("doubleEntryFields");

  // Toggle form visibility
  addProjectButton.addEventListener("click", function () {
    addProjectForm.classList.toggle("hidden");
    fetchColumns(); // Populate project columns dynamically
    fetchManagers(); // Populate managers dynamically
  });

  // Show/Hide fields based on Fixed Option
  document.querySelectorAll('input[name="fixedOption"]').forEach((option) => {
    option.addEventListener("change", function () {
      lumpsumPriceField.classList.add("hidden");
      doubleEntryFields.classList.add("hidden");
      singleEntryPriceField.classList.add("hidden"); // Hide Single Entry Field

      if (this.value === "Lumpsum") {
        lumpsumPriceField.classList.remove("hidden");
      } else if (this.value === "Double Entry") {
        doubleEntryFields.classList.remove("hidden");
      } else if (this.value === "Single Entry") {
        singleEntryPriceField.classList.remove("hidden");
      }
    });
  });

  // Form submission
  addProjectFormElement.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedManagers = managersDropdown.val(); // Get selected managers
    const workType =
      document.querySelector('input[name="workType"]:checked')?.value || null;

    const projectData = {
      projectId: document.getElementById("projectId").value,
      projectName: document.getElementById("projectName").value,
      profileName: document.getElementById("profileName").value,
      sheetName: document.getElementById("sheetName").value,
      totalEntries: document.getElementById("totalEntries").value,
      projectType: "fixed",
      fixedOption: document.querySelector('input[name="fixedOption"]:checked')
        ?.value,
      workType: workType, // Add this line to capture workType
      lumpsumPrice: document.getElementById("lumpsumPrice").value || null,
      priceWorkerOne: document.getElementById("priceWorkerOne").value || null,
      priceWorkerTwo: document.getElementById("priceWorkerTwo").value || null,
      shift: selectedManagers, // Store selected managers in shift
      instructions: document.getElementById("instructions").value || "",
      projectColumns: projectColumnsDropdown.val(),
      pricePerEntry: document.getElementById("pricePerEntry").value || null,
    };

    fetch("/admin/add-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Project added successfully!");
          resetForm();
        } else {
          alert(`Error adding project: ${data.message}`);
        }
      })
      .catch((error) => console.error("Error:", error));
  });

  function fetchColumns() {
    fetch("/admin/get-columns")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          projectColumnsDropdown.empty();
          projectColumnsDropdown.append(
            "<option disabled>Select Columns</option>"
          );
          data.columns.forEach((column) => {
            projectColumnsDropdown.append(new Option(column.name, column.name));
          });
          projectColumnsDropdown.select2({
            placeholder: "Select columns...",
            allowClear: true,
          });
        }
      });
  }

  function fetchManagers() {
    fetch("/admin/get-managers")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch managers");
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          managersDropdown.empty();
          managersDropdown.append("<option disabled>Select Managers</option>");
          data.managers.forEach((manager) => {
            managersDropdown.append(new Option(manager.name, manager.name));
          });
          managersDropdown.select2({
            placeholder: "Select managers...",
            allowClear: true,
          });
        } else {
          throw new Error(data.message || "Unknown error");
        }
      })
      .catch((error) => console.error("Error fetching managers:", error));
  }

  function resetForm() {
    addProjectFormElement.reset();
    lumpsumPriceField.classList.add("hidden");
    doubleEntryFields.classList.add("hidden");
    projectColumnsDropdown.val(null).trigger("change");
    managersDropdown.val(null).trigger("change");
  }
}

// Add project with file in the database
function initializeAddProjectWithFileForm() {
  const addProjectWithFileButton =
    document.getElementById("addProjectWithFile");
  const addProjectWithFileForm = document.getElementById(
    "addProjectWithFileForm"
  );
  const addProjectWithFileFormElement = document.getElementById(
    "addProjectWithFileFormElement"
  );

  const lumpsumPriceField = document.getElementById(
    "lumpsumPriceFieldWithFile"
  );
  const doubleEntryFields = document.getElementById(
    "doubleEntryFieldsWithFile"
  );
  const singleEntryFields = document.getElementById("singleEntryFieldWithFile");
  const managersDropdown = $("#managersWithFile"); // Select Managers dropdown

  // Toggle visibility of the Add Project With File Form
  addProjectWithFileButton.addEventListener("click", function () {
    addProjectWithFileForm.classList.toggle("hidden");
    fetchManagers(); // Populate managers dynamically
  });

  // Show/Hide fields based on Fixed Option
  document.querySelectorAll('input[name="fixedOption"]').forEach((option) => {
    option.addEventListener("change", function () {
      lumpsumPriceField.classList.add("hidden");
      doubleEntryFields.classList.add("hidden");
      singleEntryFields.classList.add("hidden"); // Hide Single Entry field

      if (this.value === "Lumpsum") {
        lumpsumPriceField.classList.remove("hidden");
      } else if (this.value === "Double Entry") {
        doubleEntryFields.classList.remove("hidden");
      } else if (this.value === "Single Entry") {
        singleEntryFields.classList.remove("hidden"); // Show Single Entry field
      }
    });
  });

  // Fetch managers dynamically
  function fetchManagers() {
    fetch("/admin/get-managers")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          managersDropdown.empty();
          managersDropdown.append("<option disabled>Select Managers</option>");
          data.managers.forEach((manager) => {
            managersDropdown.append(new Option(manager.name, manager.name));
          });
          managersDropdown.select2({
            placeholder: "Select managers...",
            allowClear: true,
          });
        }
      })
      .catch((error) => console.error("Error fetching managers:", error));
  }

  // Handle form submission
  addProjectWithFileFormElement.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedManagers = managersDropdown.val(); // Get selected managers

    const formData = new FormData(addProjectWithFileFormElement);

    // Append selected managers as shift
    formData.append("shift", selectedManagers);

    // Append default null values for optional fields if empty
    if (!formData.get("instructions")) {
      formData.set("instructions", null);
    }

    if (!formData.get("lumpsumPrice")) {
      formData.set("lumpsumPrice", null);
    }

    if (!formData.get("priceWorkerOne")) {
      formData.set("priceWorkerOne", null);
    }

    if (!formData.get("priceWorkerTwo")) {
      formData.set("priceWorkerTwo", null);
    }

    // Log formData for debugging
    console.log("Form data before submission:");
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    fetch("/admin/add-project-with-file", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Project with file added successfully!");
          addProjectWithFileForm.classList.add("hidden");
          addProjectWithFileFormElement.reset();
        } else {
          alert(`Error adding project with file: ${data.message}`);
        }
      })
      .catch((error) => {
        console.error("Error adding project with file:", error);
        alert("Failed to add project with file.");
      });
  });
}

// Add hourly project without file
function initializeAddHourlyProjectForm() {
  const addHourlyProjectButton = document.getElementById("addHourlyProject");
  const addHourlyProjectForm = document.getElementById("addHourlyProjectForm");
  const addHourlyProjectFormElement = document.getElementById(
    "addHourlyProjectFormElement"
  );
  const hourlyProjectColumnsDropdown = $("#hourlyProjectColumns");
  const managersDropdown = $("#hourlymanagers"); // Select Managers dropdown

  // Toggle form visibility
  addHourlyProjectButton.addEventListener("click", function () {
    addHourlyProjectForm.classList.toggle("hidden");
    fetchColumns(); // Populate project columns dynamically
    fetchManagers(); // Populate managers dynamically
  });

  // Form submission
  addHourlyProjectFormElement.addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedManagers = managersDropdown.val(); // Get selected managers

    const hourlyProjectData = {
      projectId: document.getElementById("hourlyProjectId").value,
      projectName: document.getElementById("hourlyProjectName").value,
      profileName: document.getElementById("hourlyProfileName").value,
      sheetName: document.getElementById("hourlySheetName").value,
      totalEntries: document.getElementById("hourlyTotalEntries").value,
      projectType: "hourly",
      pricePerHour: document.getElementById("hourlyPricePerHour").value,
      workType: document.querySelector('input[name="workType"]:checked').value, // Fetch selected work type
      shift: selectedManagers, // Store selected managers in shift
      instructions: document.getElementById("hourlyInstructions").value || null,
      projectColumns: hourlyProjectColumnsDropdown.val(),
    };

    fetch("/admin/add-hourly-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hourlyProjectData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Hourly project added successfully!");
          resetForm();
        } else {
          alert(`Error adding hourly project: ${data.message}`);
        }
      })
      .catch((error) => console.error("Error:", error));
  });

  // Fetch the managers from the backend
  function fetchManagers() {
    fetch("/admin/get-managers")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          managersDropdown.empty();
          managersDropdown.append("<option disabled>Select Managers</option>");
          data.managers.forEach((manager) => {
            managersDropdown.append(new Option(manager.name, manager.name));
          });
          managersDropdown.select2({
            placeholder: "Select managers...",
            allowClear: true,
          });
        }
      })
      .catch((error) => console.error("Error fetching managers:", error));
  }

  // Fetch project columns
  function fetchColumns() {
    fetch("/admin/get-columns")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          hourlyProjectColumnsDropdown.empty();
          hourlyProjectColumnsDropdown.append(
            "<option disabled>Select Columns</option>"
          );
          data.columns.forEach((column) => {
            hourlyProjectColumnsDropdown.append(
              new Option(column.name, column.name)
            );
          });
          hourlyProjectColumnsDropdown.select2({
            placeholder: "Select columns...",
            allowClear: true,
          });
        }
      });
  }
  function resetForm() {
    addHourlyProjectFormElement.reset();
    hourlyProjectColumnsDropdown.val(null).trigger("change");
    managersDropdown.val(null).trigger("change");
  }
}

// Add hourly  project with file
function initializeAddHourlyProjectWithFileForm() {
  const addHourlyProjectWithFileButton = document.getElementById(
    "addHourlyProjectWithFile"
  );
  const addHourlyProjectWithFileForm = document.getElementById(
    "addHourlyProjectWithFileForm"
  );
  const addHourlyProjectWithFileFormElement = document.getElementById(
    "addHourlyProjectWithFileFormElement"
  );
  const managersDropdown = $("#hourlymanagersWithFile"); // Select Managers dropdown

  // Toggle form visibility
  addHourlyProjectWithFileButton.addEventListener("click", function () {
    addHourlyProjectWithFileForm.classList.toggle("hidden");
    fetchManagers(); // Populate managers dynamically
  });

  // Form submission
  addHourlyProjectWithFileFormElement.addEventListener(
    "submit",
    function (event) {
      event.preventDefault();

      const formData = new FormData(addHourlyProjectWithFileFormElement);

      // Get selected managers from the dropdown
      const selectedManagers = managersDropdown.val();
      formData.append("shift", selectedManagers);

      fetch("/admin/add-hourly-project-with-file", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert("Hourly project with file added successfully!");
            resetForm();
          } else {
            alert(`Error adding project with file: ${data.message}`);
          }
        })
        .catch((error) => console.error("Error:", error));
    }
  );

  // Fetch managers dynamically from the backend
  function fetchManagers() {
    fetch("/admin/get-managers")
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          managersDropdown.empty();
          managersDropdown.append("<option disabled>Select Managers</option>");
          data.managers.forEach((manager) => {
            managersDropdown.append(new Option(manager.name, manager.name));
          });
          managersDropdown.select2({
            placeholder: "Select managers...",
            allowClear: true,
          });
        } else {
          console.error("Error fetching managers");
        }
      })
      .catch((error) => console.error("Error fetching managers:", error));
  }

  function resetForm() {
    addHourlyProjectWithFileFormElement.reset();
    managersDropdown.val(null).trigger("change");
  }
}

// Fetch Pending Registrations
function fetchPendingRegistrations() {
  fetch("/admin/get-pending-registrations")
    .then((response) => response.json())
    .then((data) => populatePendingRegistrations(data))
    .catch((error) => {
      console.error("Error fetching data:", error);
      alert("Error fetching registrations.");
    });
}

// Populate Pending Registrations Table
function populatePendingRegistrations(data) {
  const tableBody = document.querySelector("#registrations-table tbody");
  const table = document.querySelector("#registrations-table");
  tableBody.innerHTML = "";

  if (!data || data.length === 0) {
    table.classList.add("hidden");
  } else {
    table.classList.remove("hidden");
    data.forEach((registration) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${registration.name}</td>
                <td>${registration.email}</td>
                <td>${registration.phone}</td>
                <td>
                    <button class="approve-btn" data-id="${registration.id}">Approve</button>
                    <button class="reject-btn" data-id="${registration.id}">Reject</button>
                </td>
            `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll(".approve-btn").forEach((button) => {
      button.addEventListener("click", () =>
        approveUser(button.getAttribute("data-id"))
      );
    });

    document.querySelectorAll(".reject-btn").forEach((button) => {
      button.addEventListener("click", () =>
        rejectUser(button.getAttribute("data-id"))
      );
    });
  }
}

// Approve User
function approveUser(userId) {
  if (confirm("Are you sure you want to approve this user?")) {
    fetch(`/admin/approve-registration/${userId}`, { method: "POST" })
      .then((response) => response.json())
      .then(() => fetchPendingRegistrations())
      .catch((error) => console.error("Error approving user:", error));
  }
}

// Reject User
function rejectUser(userId) {
  if (confirm("Are you sure you want to reject this user?")) {
    fetch(`/admin/reject-registration/${userId}`, { method: "POST" })
      .then((response) => response.json())
      .then(() => fetchPendingRegistrations())
      .catch((error) => console.error("Error rejecting user:", error));
  }
}

// Fetch and populate assigned projects
function fetchAssignedProjects() {
  fetch("/admin/get-assigned-projects")
    .then((response) => response.json())
    .then((data) => populateAssignedProjectsTable(data))
    .catch((error) => {
      console.error("Error fetching assigned projects:", error);
      alert("No projects for assigned table.");
    });
}

// Populate the Assigned projects table
function populateAssignedProjectsTable(data) {
  const tableBody = document.querySelector("#assigned-table tbody");
  tableBody.innerHTML = ""; // Clear the table body before populating new rows

  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9">No assigned projects</td></tr>';
  } else {
    data.forEach((project) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td contenteditable="true">${project.project_id || "N/A"}</td>
            <td contenteditable="true">${project.project_name || "N/A"}</td>
            <td contenteditable="true">${project.profile_name || "N/A"}</td>
            <td contenteditable="true">${project.sheet_name || "N/A"}</td>
            <td contenteditable="true">${project.total_entries || "N/A"}</td>
            <td contenteditable="true">${project.project_type || "N/A"}</td>
            <td contenteditable="true">${project.fixed_option || "N/A"}</td>
            <td contenteditable="true">${project.price_per_entry || "N/A"}</td>
            <td contenteditable="true">${project.lumpsum_price || "N/A"}</td>
            <td contenteditable="true">${project.price_worker_one || "N/A"}</td>
            <td contenteditable="true">${project.price_worker_two || "N/A"}</td>
            <td contenteditable="true">${project.shift || "N/A"}</td>
            <td contenteditable="true">${project.assigned_to || "N/A"}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${
                  project.project_id
                }">Go to Project</button>
            </td>
            <td>
                <button class="edit-btn" 
                        data-project-id="${project.project_id}" 
                        data-assigned-users="${project.assigned_to_ids || ""}" 
                        data-assigned-coordinators="${
                          project.assigned_to_coordinators || ""
                        }">
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
      row.querySelector(".edit-btn").addEventListener("click", function () {
        const assignedUserIds = this.getAttribute("data-assigned-users").split(
          ","
        );
        const assignedCoordinatorNames = this.getAttribute(
          "data-assigned-coordinators"
        ).split(",");
        fetchUsersAndShowEditModal(
          project.project_id,
          assignedUserIds,
          assignedCoordinatorNames
        );
      });
    });
  }
}

function fetchUsersAndShowEditModal(
  projectId,
  assignedUserIds = [],
  assignedCoordinatorNames = []
) {
  assignedUserIds = Array.isArray(assignedUserIds) ? assignedUserIds : [];
  assignedCoordinatorNames = Array.isArray(assignedCoordinatorNames)
    ? assignedCoordinatorNames
    : [];

  console.log("Assigned User IDs:", assignedUserIds);
  console.log("Assigned Coordinator Names:", assignedCoordinatorNames);

  const fetchCoordinators = fetch("/admin/get-coordinators")
    .then((response) => {
      if (!response.ok)
        throw new Error(`Failed to fetch coordinators: ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching coordinators:", error);
      return [];
    });

  const fetchUsers = fetch("/admin/get-users")
    .then((response) => {
      if (!response.ok)
        throw new Error(`Failed to fetch users: ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      console.error("Error fetching users:", error);
      return [];
    });

  Promise.all([fetchCoordinators, fetchUsers])
    .then(([coordinators = [], users = []]) => {
      const assignedUserSet = new Set(
        assignedUserIds.map((id) => id.toString())
      );

      // Compare coordinator names instead of IDs
      const assignedCoordinatorSet = new Set(
        assignedCoordinatorNames.map((name) => name.trim().toLowerCase())
      );

      console.log("Fetched Coordinators:", coordinators);
      console.log("Fetched Users:", users);

      const coordinatorCheckboxesDiv = document.getElementById(
        "coordinatorCheckboxesEdit"
      );
      coordinatorCheckboxesDiv.innerHTML = "";
      coordinators.forEach((coordinator) => {
        const isChecked = assignedCoordinatorSet.has(
          coordinator.name.trim().toLowerCase()
        );
        const checkbox = document.createElement("div");
        checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${
                          coordinator.id
                        }" class="coordinator-checkbox-edit" ${
          isChecked ? "checked" : ""
        }>
                        ${coordinator.name}
                    </label>
                `;
        coordinatorCheckboxesDiv.appendChild(checkbox);
      });

      const userCheckboxesDiv = document.getElementById("userCheckboxesEdit");
      userCheckboxesDiv.innerHTML = "";
      users.forEach((user) => {
        const isChecked = assignedUserSet.has(user.id.toString());
        const checkbox = document.createElement("div");
        checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${
                          user.id
                        }" class="user-checkbox-edit" ${
          isChecked ? "checked" : ""
        }>
                        ${user.name}
                    </label>
                `;
        userCheckboxesDiv.appendChild(checkbox);
      });
      const modal = document.getElementById("editAssignModal");
      modal.classList.remove("hidden");
      document
        .getElementById("editAssignProjectForm")
        .setAttribute("data-project-id", projectId);
    })
    .catch((error) =>
      console.error("Error fetching coordinators or users:", error)
    );
}

// Close the modal when the cross button is clicked
const modalCloseButton = document.getElementById("closeEditModal"); // Corrected the ID
if (modalCloseButton) {
  modalCloseButton.addEventListener("click", () => {
    const modal = document.getElementById("editAssignModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  });
}

// Handle form submission for the edit modal
const editAssignProjectForm = document.getElementById("editAssignProjectForm");
if (editAssignProjectForm) {
  editAssignProjectForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const projectId = editAssignProjectForm.getAttribute("data-project-id");

    // Get selected coordinator and user IDs
    const selectedCoordinators = Array.from(
      document.querySelectorAll(".coordinator-checkbox-edit:checked")
    ).map((checkbox) => checkbox.value);
    const selectedUsers = Array.from(
      document.querySelectorAll(".user-checkbox-edit:checked")
    ).map((checkbox) => checkbox.value);

    // Validate selections
    if (selectedCoordinators.length === 0 && selectedUsers.length === 0) {
      alert("Please select at least one assignee.");
      return;
    }

    // Send selected users and coordinators to the server
    fetch("/admin/assign-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assignedUsers: selectedUsers,
        assignedCoordinators: selectedCoordinators,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          alert("Project updated successfully!");

          // Update the UI by refreshing the tables
          fetchAssignedProjects();

          // Close the modal
          const modal = document.getElementById("editAssignModal");
          if (modal) {
            modal.classList.add("hidden");
          }
        } else {
          alert("Error updating project.");
        }
      })
      .catch((error) => {
        console.error("Error updating project:", error);
        alert("Failed to update project.");
      });
  });
}

// Function to get the logged-in user's role
function getUserRole() {
  // Assuming you store user data in localStorage or a global variable
  const user = JSON.parse(localStorage.getItem("user")); // Adjust based on how you store user data
  return user ? user.role : null;
}

// Function to get the logged-in user's email
function getCurrentUserEmail() {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.email : null;
}

// Fetch and populate unassigned projects
function fetchUnassignedProjects() {
  fetch("/admin/get-all-projects")
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched unassigned projects:", data); // Check if data is as expected
      // Call the function to populate the table
      populateUnassignedProjectsTable(data);
    })
    .catch((error) => {
      console.error("Error fetching unassigned projects:", error);
      alert("No projects for fixed unassigned table.");
    });
}

// Populate the unassigned projects table
function populateUnassignedProjectsTable(data) {
  const tableBody = document.querySelector("#unassigned-table tbody");
  tableBody.innerHTML = ""; // Clear any existing rows

  if (!data || data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8">No unassigned projects</td></tr>';
  } else {
    data.forEach((project) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td contenteditable="true">${project.project_id || "N/A"}</td>
            <td contenteditable="true">${project.project_name || "N/A"}</td>
            <td contenteditable="true">${project.profile_name || "N/A"}</td>
            <td contenteditable="true">${project.sheet_name || "N/A"}</td>
            <td contenteditable="true">${project.total_entries || "N/A"}</td>
            <td contenteditable="true">${project.project_type || "N/A"}</td>
            <td contenteditable="true">${project.fixed_option || "N/A"}</td>
            <td contenteditable="true">${project.price_per_entry || "N/A"}</td>
            <td contenteditable="true">${project.lumpsum_price || "N/A"}</td>
            <td contenteditable="true">${project.price_worker_one || "N/A"}</td>
            <td contenteditable="true">${project.price_worker_two || "N/A"}</td>
            <td contenteditable="true">${project.shift || "N/A"}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${
                  project.project_id
                }">Go to Project</button>
            </td>
            <td>
                <button class="assign-btn" data-project-id="${
                  project.id
                }">Assign To</button>
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
      row.querySelector(".assign-btn").addEventListener("click", () => {
        fetchUsersAndShowModal(project.project_id);
      });
    });
  }
}

// Fetch users and display in modal
function fetchUsersAndShowModal(projectId) {
  // Fetch coordinators and users concurrently
  const fetchCoordinators = fetch("/admin/get-coordinators").then((response) =>
    response.json()
  );
  const fetchUsers = fetch("/admin/get-users").then((response) =>
    response.json()
  );

  Promise.all([fetchCoordinators, fetchUsers])
    .then(([coordinators, users]) => {
      // Populate Coordinators
      const coordinatorCheckboxesDiv = document.getElementById(
        "coordinatorCheckboxes"
      );
      coordinatorCheckboxesDiv.innerHTML = ""; // Clear previous checkboxes
      coordinators.forEach((coordinator) => {
        const checkbox = document.createElement("div");
        checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${coordinator.id}" class="coordinator-checkbox">
                        ${coordinator.name}
                    </label>
                `;
        coordinatorCheckboxesDiv.appendChild(checkbox);
      });

      // Populate Users
      const userCheckboxesDiv = document.getElementById("userCheckboxes");
      userCheckboxesDiv.innerHTML = ""; // Clear previous checkboxes
      users.forEach((user) => {
        const checkbox = document.createElement("div");
        checkbox.innerHTML = `
                    <label>
                        <input type="checkbox" value="${user.id}" class="user-checkbox">
                        ${user.name}
                    </label>
                `;
        userCheckboxesDiv.appendChild(checkbox);
      });

      // Show modal and store project ID
      const modal = document.getElementById("assignModal");
      modal.classList.remove("hidden");
      document
        .getElementById("assignProjectForm")
        .setAttribute("data-project-id", projectId);
    })
    .catch((error) =>
      console.error("Error fetching users or coordinators:", error)
    );
}

// Attach submit listener for assignProjectForm
const assignProjectForm = document.getElementById("assignProjectForm");
if (assignProjectForm) {
  assignProjectForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get the project ID from the form's data attribute
    const projectId = assignProjectForm.getAttribute("data-project-id");

    // Get selected coordinator and user IDs
    const selectedCoordinators = Array.from(
      document.querySelectorAll(".coordinator-checkbox:checked")
    ).map((checkbox) => checkbox.value);
    const selectedUsers = Array.from(
      document.querySelectorAll(".user-checkbox:checked")
    ).map((checkbox) => checkbox.value);

    // Validate selections
    if (selectedCoordinators.length === 0 && selectedUsers.length === 0) {
      alert("Please select at least one assignee.");
      return;
    }

    // Submit the data
    fetch("/admin/assign-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        assignedUsers: selectedUsers,
        assignedCoordinators: selectedCoordinators,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Assign Project Response:", data); // Log response
        if (data.success) {
          alert("Project assigned successfully!");
          // fetchUnassignedProjects();
          fetchAssignedProjects();

          // Close the modal
          document.getElementById("assignModal").classList.add("hidden");
        } else {
          alert("Error assigning project.");
        }
      })
      .catch((error) => {
        console.error("Error assigning project:", error);
        alert("Failed to assign project.");
      });
  });
}

// Handle Assign To button click
function assignProjectToUsers(event) {
  const projectId = event.target.getAttribute("data-project-id"); // Correct attribute
  fetchUsersAndShowModal(projectId);
}

// Close modal
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("assignModal").classList.add("hidden");
});

// Get hourly assigned projects
function fetchHourlyAssignedProjects() {
  fetch("/admin/get-hourly-assigned-projects")
    .then((response) => response.json())
    .then((data) => populateHourlyAssignedProjectsTable(data))
    .catch((error) => {
      console.error("Error fetching assigned projects:", error);
      alert("No projects for hourly assigned table.");
    });
}

// Populate hourly assigned project table
function populateHourlyAssignedProjectsTable(data) {
  const tableBody = document.querySelector("#hourly-assigned-table tbody");
  tableBody.innerHTML = ""; // Clear the table body before populating new rows

  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9">No assigned projects</td></tr>';
  } else {
    data.forEach((project) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td contenteditable="true">${project.project_id || "N/A"}</td>
            <td contenteditable="true">${project.project_name || "N/A"}</td>
            <td contenteditable="true">${project.profile_name || "N/A"}</td>
            <td contenteditable="true">${project.sheet_name || "N/A"}</td>
            <td contenteditable="true">${project.total_entries || "N/A"}</td>
            <td contenteditable="true">${project.project_type || "N/A"}</td>
            <td contenteditable="true">${project.price_per_hour || "N/A"}</td>
            <td contenteditable="true">${project.shift || "N/A"}</td>
            <td contenteditable="true">${project.assigned_to || "N/A"}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${
                  project.project_id
                }">Go to Project</button>
            </td>
            <td>
                <button class="edit-btn" data-project-id="${
                  project.project_id
                }" data-assigned-users="${
        project.assigned_to_ids || ""
      }">Edit</button>
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
      row.querySelector(".edit-btn").addEventListener("click", function () {
        // Split assigned user IDs (if any) from the 'data-assigned-users' attribute
        const assignedUserIds = this.getAttribute("data-assigned-users").split(
          ","
        );
        fetchUsersAndShowEditModal(project.project_id, assignedUserIds);
      });
    });
  }
}

// Get hourly unassigned projects table
function fetchHourlyUnassignedProjects() {
  fetch("/admin/get-all-hourly-projects")
    .then((response) => response.json())
    .then((data) => {
      console.log("Fetched unassigned projects:", data); // Check if data is as expected
      // Call the function to populate the table
      populateHourlyUnassignedProjectsTable(data);
    })
    .catch((error) => {
      console.error("Error fetching unassigned projects:", error);
      alert("No projects for hourly unassigned table.");
    });
}

// Populate the unassigned projects table
function populateHourlyUnassignedProjectsTable(data) {
  const tableBody = document.querySelector("#hourly-unassigned-table tbody");
  tableBody.innerHTML = ""; // Clear any existing rows

  if (!data || data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8">No unassigned projects</td></tr>';
  } else {
    data.forEach((project) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td contenteditable="true">${project.project_id || "N/A"}</td>
            <td contenteditable="true">${project.project_name || "N/A"}</td>
            <td contenteditable="true">${project.profile_name || "N/A"}</td>
            <td contenteditable="true">${project.sheet_name || "N/A"}</td>
            <td contenteditable="true">${project.total_entries || "N/A"}</td>
            <td contenteditable="true">${project.project_type || "N/A"}</td>
            <td contenteditable="true">${project.price_per_hour || "N/A"}</td>
            <td contenteditable="true">${project.shift || "N/A"}</td>
            <td>
                <button class="go-to-project-btn" data-project-id="${
                  project.project_id
                }">Go to Project</button>
            </td>
            <td>
                <button class="assign-btn" data-project-id="${
                  project.id
                }">Assign To</button>
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
      row.querySelector(".assign-btn").addEventListener("click", () => {
        fetchUsersAndShowModal(project.project_id);
      });
    });
  }
}




















// Admin Payroll System
document.addEventListener("DOMContentLoaded", () => {
  fetch("/admin/get-users-profiles") // ✅ Ensure correct API path
    .then((response) => response.json())
    .then((users) => {
      console.log("Users received in frontend:", users); // ✅ Debugging log
      const dropdown = document.getElementById("user-dropdown");
      dropdown.innerHTML = '<option value="">Select a User</option>'; // Default option

      if (!users || users.length === 0 || !Array.isArray(users)) {
        console.error("No users found.");
        return;
      }

      users.forEach((user) => {
        console.log(`Adding user to dropdown: ${user.name} (${user.role})`); // ✅ Debugging log
        const option = document.createElement("option");
        option.value = user.name;
        option.textContent = `${user.name} (${user.role})`; // ✅ Show all roles (user, profile, manager, coordinator)
        dropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching users:", error));
});








// ✅ Update frontend to display both fixed & hourly salary records
document.getElementById("fetch-user-payroll").addEventListener("click", () => {
  const selectedUser = document.getElementById("user-dropdown").value;
  const startDate = document.getElementById("start-date").value;
  const endDate = document.getElementById("end-date").value;
  if (!selectedUser) {
    alert("Please select a user.");
    return;
  }


  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
}


  // Fetch payroll data with the date range
  fetch(`/admin/payroll/${encodeURIComponent(selectedUser)}?start_date=${startDate}&end_date=${endDate}`)
  .then((response) => response.json())
  .then((data) => {
      if (data.success) {
          populatePayrollTable(data.data);
      } else {
          console.error("Failed to fetch payroll data:", data.message);
          alert("Failed to fetch payroll data: " + data.message);
      }
  })
  .catch((error) => console.error("Error fetching payroll data:", error));
});











// ✅ Updated function to display separate Fixed & Hourly totals
function populatePayrollTable(data) {
  const tableBody = document.querySelector("#payroll-table tbody");
  if (!tableBody) {
    console.error("Payroll table body not found in DOM.");
    return;
  }

  tableBody.innerHTML = ""; // Clear previous data

  if (!data || data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="7">No payroll data available</td></tr>';
    return;
  }

  let totalFixedSalary = 0; // ✅ Sum of Fixed salaries
  let totalHourlySalary = 0; // ✅ Sum of Hourly salaries

  data.forEach((item) => {
    const salary = parseFloat(item.salary) || 0;

    if (item.type === "Fixed") {
      totalFixedSalary += salary;
    } else if (item.type === "Hourly") {
      totalHourlySalary += salary;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${item.project_id || "N/A"}</td>
            <td>${item.project_name || "N/A"}</td>
            <td>${item.user_name || "N/A"}</td>
            <td>${item.sheet_name || "N/A"}</td>
            <td>${item.profile_name || "N/A"}</td>
            <td>${item.no_of_entries || "N/A"}</td>
            <td>${item.salary || "N/A"} (${item.type})</td>
        `;

    // ✅ Highlight Hourly rows for better visibility
    if (item.type === "Hourly") {
      row.style.backgroundColor = "#f0f8ff"; // Light blue for hourly salaries
    }

    tableBody.appendChild(row);
  });

  // ✅ Append Fixed Salary Total Row
  const fixedTotalRow = document.createElement("tr");
  fixedTotalRow.innerHTML = `
        <td colspan="6" style="font-weight: bold; text-align: right; color: #007bff;">Total Fixed Salary:</td>
        <td style="font-weight: bold; color: #007bff;">${totalFixedSalary.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(fixedTotalRow);

  // ✅ Append Hourly Salary Total Row
  const hourlyTotalRow = document.createElement("tr");
  hourlyTotalRow.innerHTML = `
        <td colspan="6" style="font-weight: bold; text-align: right; color: #28a745;">Total Hourly Salary:</td>
        <td style="font-weight: bold; color: #28a745;">${totalHourlySalary.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(hourlyTotalRow);

  // ✅ Append Grand Total Row (Fixed + Hourly)
  const grandTotal = totalFixedSalary + totalHourlySalary;
  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
        <td colspan="6" style="font-weight: bold; text-align: right; color: #dc3545;">Grand Total (Fixed + Hourly):</td>
        <td style="font-weight: bold; color: #dc3545;">${grandTotal.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(totalRow);
}








// Payroll of profiles
document.addEventListener("DOMContentLoaded", () => {
  fetch("/admin/get-profiles") // ✅ Ensure correct API path
    .then((response) => response.json())
    .then((users) => {
      console.log("Users received in frontend:", users); // ✅ Debugging log
      const dropdown = document.getElementById("profile-dropdown");
      dropdown.innerHTML = '<option value="">Select a User</option>'; // Default option

      if (!users || users.length === 0 || !Array.isArray(users)) {
        console.error("No users found.");
        return;
      }

      users.forEach((user) => {
        console.log(`Adding user to dropdown: ${user.name} (${user.role})`); // ✅ Debugging log
        const option = document.createElement("option");
        option.value = user.name;
        option.textContent = `${user.name} (${user.role})`; // ✅ Show all roles (user, profile, manager, coordinator)
        dropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching users:", error));
});










// Fetch Profile Payroll
document
  .getElementById("fetch-profile-payroll")
  .addEventListener("click", () => {
    const selectedProfile = document.getElementById("profile-dropdown").value;
    const startDate = document.getElementById("start-date-profile").value; // Fixed ID
    const endDate = document.getElementById("end-date-profile").value; // Fixed ID
    if (!selectedProfile) {
      alert("Please select a profile.");
      return;
    }

    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
  }


  fetch(`/admin/payroll-profile/${encodeURIComponent(selectedProfile)}?start_date=${startDate}&end_date=${endDate}`)
  .then((response) => response.json())
  .then((data) => {
      if (data.success) {
          populateProfilePayrollTable(data.data, "profile-payroll-table");
      } else {
          console.error("Failed to fetch payroll data:", data.message);
          alert("Failed to fetch payroll data: " + data.message);
      }
  })
  .catch((error) => console.error("Error fetching payroll data:", error));
});




  




// ✅ Function to Populate Profile Payroll Table with Separate Fixed & Hourly Totals
function populateProfilePayrollTable(data, tableId) {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="8">No payroll data available</td></tr>';
    return;
  }

  let totalFixedDebit = 0; // ✅ Sum of all Fixed profile debits
  let totalHourlyDebit = 0; // ✅ Sum of all Hourly profile debits

  data.forEach((item) => {
    if (item.type === "Fixed") {
      totalFixedDebit += parseFloat(item.profile_debit) || 0;
    } else if (item.type === "Hourly") {
      totalHourlyDebit += parseFloat(item.profile_debit) || 0;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${item.project_id || "N/A"}</td>
            <td>${item.project_name || "N/A"}</td>
            <td>${item.profile_name || "N/A"}</td>
            <td>${item.sheet_name || "N/A"}</td>
            <td>${item.shift || "N/A"}</td>
            <td>${
              item.total_no_of_entries || "0"
            }</td>  <!-- ✅ Entries count (Fixed only) -->
            <td>${
              item.profile_debit || "N/A"
            }</td>  <!-- ✅ Salary (Fixed + Hourly) -->
            <td>${
              item.type || "Unknown"
            }</td>  <!-- ✅ New column for "Fixed" or "Hourly" -->
        `;
    // ✅ Highlight hourly salary rows for better distinction
    if (item.type === "Hourly") {
      row.style.backgroundColor = "#f0f8ff"; // Light blue for hourly rows
    }

    tableBody.appendChild(row);
  });

  // ✅ Append separate totals
  const fixedTotalRow = document.createElement("tr");
  fixedTotalRow.innerHTML = `
        <td colspan="7" style="font-weight: bold; text-align: right; color: #007bff;">Total Fixed Debit:</td>
        <td style="font-weight: bold; color: #007bff;">${totalFixedDebit.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(fixedTotalRow);
  const hourlyTotalRow = document.createElement("tr");
  hourlyTotalRow.innerHTML = `
        <td colspan="7" style="font-weight: bold; text-align: right; color: #28a745;">Total Hourly Debit:</td>
        <td style="font-weight: bold; color: #28a745;">${totalHourlyDebit.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(hourlyTotalRow);

  // ✅ Append grand total row at the end
  const grandTotal = totalFixedDebit + totalHourlyDebit;
  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
        <td colspan="7" style="font-weight: bold; text-align: right; color: #dc3545;">Grand Total (Fixed + Hourly):</td>
        <td style="font-weight: bold; color: #dc3545;">${grandTotal.toFixed(
          2
        )}</td>
    `;
  tableBody.appendChild(totalRow);
}




const { jsPDF } = window.jspdf;


// 📌 Function to download PDF for User Payroll
document.getElementById("download-user-payroll").addEventListener("click", function () {
  generatePayrollPDF("payroll-table", "User Payroll");
});

// 📌 Function to download PDF for Profile Payroll
document.getElementById("download-profile-payroll").addEventListener("click", function () {
  generatePayrollPDF("profile-payroll-table", "Profile Payroll");
});

// 📌 Function to Generate Payroll PDF
function generatePayrollPDF(tableId, title) {
  const doc = new jsPDF();
  const selectedUser = document.getElementById("user-dropdown").value || document.getElementById("profile-dropdown").value;
  const monthSelected = document.getElementById("start-date").value; // Gets selected month

  if (!selectedUser) {
      alert("Please select a user or profile before downloading the PDF.");
      return;
  }

  let payrollMonth = getPreviousMonth(monthSelected); // Convert to previous month

  // ✅ Add Title and User/Profile Name
  doc.setFontSize(16);
  doc.text(`${title}`, 105, 20, null, null, "center");
  doc.setFontSize(12);
  doc.text(`User: ${selectedUser}`, 15, 30);
  doc.text(`Salary for: ${payrollMonth}`, 15, 40);

  // ✅ Get Table Data
  const table = document.getElementById(tableId);
  const rows = [];
  let totalSalary = 0;

  table.querySelectorAll("tbody tr").forEach((tr) => {
      const row = [];
      tr.querySelectorAll("td").forEach((td) => row.push(td.innerText));
      rows.push(row);
  });

  // ✅ AutoTable (Table Formatting)
  doc.autoTable({
      startY: 50,
      head: [[
          "Project ID", "Project Name", "Worker Name",
          "Sheet Name","Profile Name", "Entries", "Salary"
      ]],
      body: rows,
      theme: "grid"
  });

  // ✅ Calculate Total Salary
  rows.forEach((row) => {
      let salary = parseFloat(row[row.length - 1]) || 0;
      totalSalary += salary;
  });

  // ✅ Add Total Salary at the bottom
  doc.setFontSize(14);
  // doc.text(`Total Salary: ${totalSalary.toFixed(2)}`, 15, doc.autoTable.previous.finalY + 10);

  // ✅ Save PDF
  doc.save(`${selectedUser}-Payroll-${payrollMonth}.pdf`);
}

// 📌 Function to Get Previous Month
function getPreviousMonth(dateString) {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}
