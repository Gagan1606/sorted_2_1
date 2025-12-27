const API_BASE = '/api';

let currentUser = null;
let detectedUsersData = [];
let pendingGroupData = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/current-user`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = 'index.html';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        document.getElementById('username-display').textContent = currentUser.username;
    } catch (error) {
        window.location.href = 'index.html';
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
    });
    window.location.href = 'index.html';
});

// Modal controls
const createGroupModal = document.getElementById('createGroupModal');
const instantShareModal = document.getElementById('instantShareModal');

document.getElementById('createGroupBtn').addEventListener('click', () => {
    createGroupModal.style.display = 'block';
});

document.getElementById('instantShareBtn').addEventListener('click', () => {
    instantShareModal.style.display = 'block';
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

// Create Group Form
document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const groupName = document.getElementById('groupName').value;
    const photos = document.getElementById('groupPhotos').files;
    
    if (photos.length === 0) {
        alert('Please select photos');
        return;
    }
    
    const formData = new FormData();
    formData.append('groupName', groupName);
    
    for (let photo of photos) {
        formData.append('photos', photo);
    }
    
    const progressDiv = document.getElementById('upload-progress');
    progressDiv.textContent = 'Processing photos...';
    
    try {
        const response = await fetch(`${API_BASE}/create-group`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // FIX 2: Show detected users for confirmation
            detectedUsersData = data.detectedUsers;
            pendingGroupData = { groupId: data.groupId, groupName };
            
            document.getElementById('createGroupForm').style.display = 'none';
            progressDiv.style.display = 'none';
            
            const detectedSection = document.getElementById('detectedUsersSection');
            detectedSection.style.display = 'block';
            
            displayDetectedUsers();
        } else {
            alert(data.error || 'Failed to create group');
            progressDiv.textContent = '';
        }
    } catch (error) {
        console.error('Create group error:', error);
        alert('Failed to create group');
        progressDiv.textContent = '';
    }
});

function displayDetectedUsers() {
    const listDiv = document.getElementById('detectedUsersList');
    listDiv.innerHTML = '';
    
    detectedUsersData.forEach((user, index) => {
        const tag = document.createElement('div');
        tag.className = 'user-tag';
        tag.innerHTML = `
            ${user.username}
            <button onclick="removeDetectedUser(${index})">×</button>
        `;
        listDiv.appendChild(tag);
    });
}

function removeDetectedUser(index) {
    detectedUsersData.splice(index, 1);
    displayDetectedUsers();
}

// Add additional user
document.getElementById('addUserBtn').addEventListener('click', () => {
    const username = document.getElementById('additionalUsername').value.trim();
    if (username) {
        detectedUsersData.push({ username });
        displayDetectedUsers();
        document.getElementById('additionalUsername').value = '';
    }
});

// Confirm group creation
document.getElementById('confirmGroupBtn').addEventListener('click', async () => {
    // Add additional members to group
    for (const user of detectedUsersData) {
        await fetch(`${API_BASE}/add-member-to-group`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                groupId: pendingGroupData.groupId,
                username: user.username
            }),
            credentials: 'include'
        });
    }
    
    alert('Group created successfully!');
    createGroupModal.style.display = 'none';
    loadGroups();
    
    // Reset form
    document.getElementById('createGroupForm').reset();
    document.getElementById('createGroupForm').style.display = 'block';
    document.getElementById('detectedUsersSection').style.display = 'none';
});

// Instant Share
document.getElementById('instantShareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const photo = document.getElementById('sharePhoto').files[0];
    
    if (!photo) {
        alert('Please select a photo');
        return;
    }
    
    const formData = new FormData();
    formData.append('photo', photo);
    
    try {
        const response = await fetch(`${API_BASE}/instant-share`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const resultDiv = document.getElementById('shareResult');
            if (data.sentTo.length > 0) {
                resultDiv.innerHTML = `<p>Photo shared with: ${data.sentTo.join(', ')}</p>`;
            } else {
                resultDiv.innerHTML = `<p>No faces detected in photo</p>`;
            }
        }
    } catch (error) {
        console.error('Instant share error:', error);
        alert('Failed to share photo');
    }
});

// Load and display groups
document.getElementById('viewGroupsBtn').addEventListener('click', loadGroups);

async function loadGroups() {
    try {
        const response = await fetch(`${API_BASE}/my-groups`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            const groupsList = document.getElementById('groupsList');
            groupsList.innerHTML = '';
            
            data.groups.forEach(group => {
                const card = document.createElement('div');
                card.className = 'group-card';
                card.innerHTML = `
                    <h3>${group.groupName}</h3>
                    <p>Created by: ${group.createdBy.username}</p>
                    <p>${new Date(group.createdAt).toLocaleDateString()}</p>
                `;
                card.addEventListener('click', () => {
                    window.location.href = `group.html?id=${group._id}`;
                });
                groupsList.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Load groups error:', error);
    }
}

// Initialize
checkAuth();
