// home.js - Home page functionality

let allDocuments = loadDocuments();
let filteredDocuments = [...allDocuments];
let activeFilter = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    renderDocuments(filteredDocuments);
    setupSearch();
    setupTopicFilters();
    setupSorting();
});

// Render documents
function renderDocuments(docs) {
    const grid = document.getElementById('documentGrid');
    
    if (docs.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-light);">
                <h3 style="margin-bottom: 1rem;">No documents found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = docs.map(doc => `
        <div class="document-card" onclick="viewDocument(${doc.id})">
            <h3 class="document-title">${doc.title}</h3>
            <div class="document-tags">
                ${doc.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <p class="document-preview">${doc.preview}</p>
        </div>
    `).join('');
}

// View document
function viewDocument(id) {
    window.location.href = `viewer.html?id=${id}`;
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        
        if (query.trim() === '') {
            filteredDocuments = activeFilter 
                ? allDocuments.filter(doc => doc.tags.includes(activeFilter))
                : [...allDocuments];
        } else {
            const baseDocuments = activeFilter 
                ? allDocuments.filter(doc => doc.tags.includes(activeFilter))
                : allDocuments;
                
            filteredDocuments = baseDocuments.filter(doc => {
                return doc.title.toLowerCase().includes(query) ||
                       doc.preview.toLowerCase().includes(query) ||
                       doc.tags.some(tag => tag.toLowerCase().includes(query)) ||
                       (doc.authors && doc.authors.toLowerCase().includes(query));
            });
        }
        
        renderDocuments(filteredDocuments);
    });
}

// Setup topic filters
function setupTopicFilters() {
    const topicChips = document.querySelectorAll('.topic-chip');
    
    topicChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const topic = this.getAttribute('data-topic');
            
            // Toggle active state
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                activeFilter = null;
                filteredDocuments = [...allDocuments];
            } else {
                // Remove active from all chips
                topicChips.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                activeFilter = topic;
                filteredDocuments = allDocuments.filter(doc => 
                    doc.tags.includes(topic)
                );
            }
            
            // Clear search
            document.getElementById('searchInput').value = '';
            renderDocuments(filteredDocuments);
        });
    });
}

// Setup sorting
function setupSorting() {
    const sortDropdown = document.getElementById('sortDropdown');
    
    sortDropdown.addEventListener('change', function() {
        const sortBy = this.value;
        
        if (sortBy === 'date') {
            filteredDocuments.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortBy === 'popularity') {
            filteredDocuments.sort((a, b) => b.popularity - a.popularity);
        } else {
            // Relevance - restore original order
            filteredDocuments = activeFilter 
                ? allDocuments.filter(doc => doc.tags.includes(activeFilter))
                : [...allDocuments];
        }
        
        renderDocuments(filteredDocuments);
    });
}