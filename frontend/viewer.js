// viewer.js - Document viewer functionality

let currentDocument = null;
let availableTopics = [];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    await loadAvailableTopics();
    await loadDocument();
    setupSidebar();
    setupEditButton();
    setupDeleteButton();
});

// Load available topics from backend
async function loadAvailableTopics() {
    try {
        availableTopics = await loadTopics();
        updateTopicSidebar();
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

// Update topic sidebar with backend topics
function updateTopicSidebar() {
    const topicTree = document.getElementById('topicTree');
    if (!topicTree || availableTopics.length === 0) return;
    
    const topicHTML = availableTopics.slice(0, 20).map(topic => `
        <div class="tree-toggle" data-topic-id="${topic.topic_id}">
            ${topic.keywords[0] || topic.name}
        </div>
    `).join('');
    
    topicTree.innerHTML = topicHTML;
}

// Load document from URL parameter
async function loadDocument() {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    
    if (docId) {
        try {
            currentDocument = await getDocumentById(docId);
            
            if (currentDocument) {
                displayDocument(currentDocument);
                highlightTopics(currentDocument.topics || []);
            } else {
                showError();
            }
        } catch (error) {
            console.error('Error loading document:', error);
            showError();
        }
    } else {
        showError();
    }
}

// Display document
function displayDocument(doc) {
    document.getElementById('viewerTitle').textContent = doc.title;
    document.title = `neuroDoc - ${doc.title}`;
    
    const tags = doc.topic_names || doc.tags || [];
    const authors = Array.isArray(doc.authors) ? doc.authors.join(', ') : (doc.authors || '');
    const dateAdded = doc.date_added || doc.date;
    
    const contentDiv = document.getElementById('documentContent');
    contentDiv.innerHTML = `
        <h1 style="color: var(--text); margin-bottom: 1rem;">${doc.title}</h1>
        
        <div style="margin: 1.5rem 0; padding: 1rem; background: var(--bg); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        
        ${doc.genre ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Genre:</strong> ${doc.genre}
        </div>
        ` : ''}
        
        ${authors ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Authors:</strong> ${authors}
        </div>
        ` : ''}
        
        ${doc.year ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Year:</strong> ${doc.year}
        </div>
        ` : ''}
        
        ${doc.doi ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>DOI:</strong> ${doc.doi}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Date Added:</strong> ${new Date(dateAdded).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}
        </div>
        
        <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--border);">
        
        <div style="white-space: pre-line; line-height: 1.8; font-size: 1.05rem;">
            ${doc.content}
        </div>
        
        <div style="margin-top: 3rem; padding: 1.5rem; background: var(--bg); border-radius: 8px;">
            <h3 style="margin-bottom: 1rem;">Document Actions</h3>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="window.print()">Print</button>
                <button class="btn btn-secondary" onclick="shareDocument()">Share</button>
                <button class="btn btn-secondary" onclick="downloadDocument()">Download</button>
                <button class="btn btn-secondary" style="background: #dc2626; color: white;" onclick="handleDeleteDocument()">Delete</button>
            </div>
        </div>
    `;
}

// Show error
function showError() {
    document.getElementById('documentContent').innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-light);">
            <h2 style="margin-bottom: 1rem;">Document Not Found</h2>
            <p style="margin-bottom: 2rem;">The document you're looking for doesn't exist or has been removed.</p>
            <a href="index.html" class="btn btn-primary">← Back to Home</a>
        </div>
    `;
}

// Highlight topics in sidebar
function highlightTopics(topicIds) {
    const allToggles = document.querySelectorAll('#topicTree .tree-toggle');
    
    allToggles.forEach(toggle => {
        const topicId = parseInt(toggle.getAttribute('data-topic-id'));
        if (topicIds.includes(topicId)) {
            toggle.classList.add('active');
        }
    });
}

// Setup sidebar
function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('hidden');
        });
    }
    
    // Make topic toggles clickable
    const topicTree = document.getElementById('topicTree');
    if (topicTree) {
        topicTree.addEventListener('click', function(e) {
            const toggle = e.target.closest('.tree-toggle');
            if (toggle) {
                const topicId = toggle.getAttribute('data-topic-id');
                if (topicId) {
                    window.location.href = `index.html#filter=${topicId}`;
                }
            }
        });
    }
}

// Setup edit button
function setupEditButton() {
    const editBtn = document.getElementById('editBtn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            if (currentDocument) {
                window.location.href = `create.html?edit=${currentDocument._id || currentDocument.id}`;
            }
        });
    }
}

// Setup delete button
function setupDeleteButton() {
    // Delete button is added dynamically in displayDocument
}

// Handle delete document
async function handleDeleteDocument() {
    if (!currentDocument) return;
    
    if (!confirm(`Are you sure you want to delete "${currentDocument.title}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        await deleteDocument(currentDocument._id || currentDocument.id);
        alert('Document deleted successfully');
        window.location.href = 'index.html';
    } catch (error) {
        alert(`Error deleting document: ${error.message}`);
    }
}

// Share document
function shareDocument() {
    const url = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: currentDocument.title,
            text: currentDocument.preview,
            url: url
        }).catch(err => console.log('Share failed:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(err => {
            console.error('Copy failed:', err);
            alert('Failed to copy link. URL: ' + url);
        });
    }
}

// Download document
function downloadDocument() {
    const content = `${currentDocument.title}\n\n${currentDocument.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDocument.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}