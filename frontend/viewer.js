// viewer.js - Document viewer functionality

let currentDocument = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDocument();
    setupSidebar();
    setupEditButton();
});

// Load document from URL parameter
function loadDocument() {
    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('id');
    
    if (docId) {
        currentDocument = getDocumentById(docId);
        
        if (currentDocument) {
            displayDocument(currentDocument);
            highlightTopics(currentDocument.tags);
        } else {
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
    
    const contentDiv = document.getElementById('documentContent');
    contentDiv.innerHTML = `
        <h1 style="color: var(--text); margin-bottom: 1rem;">${doc.title}</h1>
        
        <div style="margin: 1.5rem 0; padding: 1rem; background: var(--bg); border-radius: 8px; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        
        ${doc.authors ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Authors:</strong> ${doc.authors}
        </div>
        ` : ''}
        
        ${doc.year ? `
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Year:</strong> ${doc.year}
        </div>
        ` : ''}
        
        <div style="margin-bottom: 1rem; color: var(--text-light);">
            <strong>Date Added:</strong> ${new Date(doc.date).toLocaleDateString('en-US', { 
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
function highlightTopics(tags) {
    const allToggles = document.querySelectorAll('#topicTree .tree-toggle');
    
    allToggles.forEach(toggle => {
        const text = toggle.textContent.trim();
        if (tags.includes(text)) {
            toggle.classList.add('active');
            
            // Expand parent categories
            let parent = toggle.closest('.tree-children');
            while (parent) {
                parent.classList.add('expanded');
                const parentToggle = parent.previousElementSibling;
                if (parentToggle) {
                    const icon = parentToggle.querySelector('.tree-icon');
                    if (icon) icon.classList.add('rotated');
                }
                parent = parent.parentElement.closest('.tree-children');
            }
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
    const topicToggles = document.querySelectorAll('#topicTree .tree-toggle');
    topicToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const topic = this.textContent.trim();
            if (topic && !this.querySelector('.tree-icon')) {
                // It's a leaf node, filter by this topic
                window.location.href = `index.html#filter=${encodeURIComponent(topic)}`;
            }
        });
    });
}

// Setup edit button
function setupEditButton() {
    const editBtn = document.getElementById('editBtn');
    
    editBtn.addEventListener('click', function() {
        if (currentDocument) {
            window.location.href = `create.html?edit=${currentDocument.id}`;
        }
    });
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