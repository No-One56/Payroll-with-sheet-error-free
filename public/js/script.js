document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        const user = await response.json();
        if (user.role === 'admin') {
            window.location.href = '/admin'; // Redirect to admin
        } else {
            window.location.href = '/user'; // Redirect to user
        }
    } else {
        alert('Login failed. Please check your credentials.');
    }
});

// Logout function
function logout() {
    // Clear session data if needed
    // Redirect to login page or homepage
}







// script.js
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const formData = new FormData(this);
    const data = Object.fromEntries(formData); // Convert FormData to an object

    fetch('/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => { 
        if (response.redirected) {
            window.location.href = response.url; // Redirect if response is redirected
        } else {
            return response.json(); // Handle errors
        }
    })
    .then(data => {
        if (data && data.message) {
            alert(data.message); // Show error message if any
        }
    })
    .catch(error => console.error('Error:', error));
});