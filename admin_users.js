// admin_users.js

// Make switchTab global
window.switchTab = function (tab) {
    const dashboardView = document.getElementById('dashboard-view');
    const usersView = document.getElementById('users-view');
    const btnDashboard = document.getElementById('btnDashboard');
    const btnRequests = document.getElementById('btnRequests');
    const btnUsers = document.getElementById('btnUsers');

    if (tab === 'dashboard') {
        dashboardView.style.display = 'block';
        usersView.style.display = 'none';

        btnDashboard.classList.add('active-btn');
        btnDashboard.classList.remove('outline-btn');
        // btnRequests is basically alias for dashboard view but can keep style if clicked
        if (btnRequests.classList.contains('active-btn')) {
            // do nothing?
        } else {
            btnRequests.className = 'btn-calendar outline-btn';
        }

        btnUsers.classList.remove('active-btn');
        btnUsers.classList.add('outline-btn');
    } else if (tab === 'users') {
        dashboardView.style.display = 'none';
        usersView.style.display = 'block';

        btnDashboard.classList.remove('active-btn');
        btnDashboard.classList.add('outline-btn');

        btnRequests.classList.remove('active-btn');
        btnRequests.classList.add('outline-btn');

        btnUsers.classList.add('active-btn');
        btnUsers.classList.remove('outline-btn');

        // Load users when tab is switched
        fetchAndRenderUsers();
    }
}

// Global modal controls
window.openAddUserModal = function () {
    document.getElementById('addUserModal').style.display = 'flex';
}

window.closeAddUserModal = function () {
    document.getElementById('addUserModal').style.display = 'none';
}

// User Management Logic
document.addEventListener('DOMContentLoaded', function () {
    // Add User Form Submission
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('newUserName').value;
            const email = document.getElementById('newUserEmail').value;
            const phone = document.getElementById('newUserPhone').value;
            const division = document.getElementById('newUserDivision').value;
            const role = document.getElementById('newUserRole').value;

            // Simple button loader
            const submitBtn = addUserForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Creating...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, phone, division, role })
                });

                if (response.ok) {
                    window.showStatusModal(true, 'User Created', `User ${name} has been added successfully.`);
                    window.closeAddUserModal();
                    addUserForm.reset();
                    fetchAndRenderUsers();
                } else {
                    const err = await response.json();
                    window.showStatusModal(false, 'Error', err.message || 'Failed to create user');
                }
            } catch (error) {
                console.error(error);
                window.showStatusModal(false, 'Network Error', 'Could not connect to server');
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

async function fetchAndRenderUsers() {
    const container = document.getElementById('userListContainer');

    // Only show loading if currently empty or first load
    if (!container.innerHTML.trim() || container.innerText.includes('Loading')) {
        container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px; width: 100%;">Loading users...</p>';
    }

    try {
        const response = await fetch('/api/users');
        const users = await response.json();

        if (users.length === 0) {
            container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px; width: 100%;">No users found.</p>';
            return;
        }

        container.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';

            const roleClass = user.role === 'Admin' ? 'role-admin' : 'role-user';

            card.innerHTML = `
                <div>
                    <div class="user-card-header">
                        <h3>${user.name}</h3>
                        <span class="role-badge ${roleClass}">${user.role || 'User'}</span>
                    </div>
                    
                    <div class="user-card-info">
                        <p>📧 ${user.email}</p>
                        <p>📞 ${user.phone || '-'}</p>
                        ${user.division ? `<p>🏢 ${user.division}</p>` : ''}
                    </div>
                </div>

                <div class="user-card-actions">
                    <button class="btn-reset" onclick="resetUserPassword('${user.id}', '${user.name}')">
                        Reset Password 
                        <span style="font-size:10px; margin-left:3px;">🔑</span>
                    </button>
                    <button class="btn-delete-user" onclick="deleteUser('${user.id}', '${user.name}')">
                        🗑️
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching users:", error);
        container.innerHTML = '<p class="text-muted" style="color:red; text-align: center;">Failed to load users.</p>';
    }
}

// Make these global so onclick works
window.resetUserPassword = function (id, name) {
    if (!window.showConfirmation) {
        alert("Error: Helper functions not loaded.");
        return;
    }

    window.showConfirmation(
        'Reset Password?',
        `Are you sure you want to reset password for <b>${name}</b>? New password will be <b>kerjaibadah</b>.`,
        async () => {
            try {
                const response = await fetch(`/api/users/${id}/reset-password`, { method: 'PUT' });
                if (response.ok) {
                    window.showStatusModal(true, 'Success', `Password for ${name} has been reset.`);
                } else {
                    window.showStatusModal(false, 'Error', 'Failed to reset password.');
                }
            } catch (err) {
                window.showStatusModal(false, 'Error', 'Network error.');
            }
        }
    );
};

window.deleteUser = function (id, name) {
    if (!window.showConfirmation) {
        alert("Error: Helper functions not loaded.");
        return;
    }

    window.showConfirmation(
        'Delete User?',
        `Are you sure you want to delete <b>${name}</b>? This action cannot be undone.`,
        async () => {
            try {
                const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    window.showStatusModal(true, 'Deleted', `User ${name} has been deleted.`);
                    fetchAndRenderUsers();
                } else {
                    window.showStatusModal(false, 'Error', 'Failed to delete user.');
                }
            } catch (err) {
                window.showStatusModal(false, 'Error', 'Network error.');
            }
        }
    );
};
