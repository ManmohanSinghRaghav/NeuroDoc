let allDocuments = [];
let filteredDocuments = [];
let activeFilter = null;
let allTopics = [];


document.addEventListener('DOMContentLoaded', async function() {
    await loadInitialData();
    setupSearch();
    setupTopicFilters();
    setupSorting();
    setupGenerateTopicsButton();
});


async function loadInitialData() {
    try {
        
        const grid = document.getElementById('documentGrid');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">Loading documents...</div>';
        
        
        allDocuments = await loadDocuments();
        allTopics = await loadTopics();
        filteredDocuments = [...allDocuments];
        
        
        updateTopicChips();
        
        
        renderDocuments(filteredDocuments);
    } catch (error) {
        console.error('Error loading initial data:', error);
        const grid = document.getElementById('documentGrid');
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-light);">
                <h3 style="margin-bottom: 1rem;">Error loading documents</h3>
                <p>Please make sure the backend server is running at ${API_BASE_URL}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 1rem;">Retry</button>
            </div>
        `;
    }
}


function updateTopicChips() {
    const topicsRow = document.querySelector('.topics-row');
    if (!topicsRow) return;
    
    if (allTopics.length === 0) {
        topicsRow.innerHTML = '<div style="color: var(--text-light); padding: 1rem;">No topics available. Click "Generate Topics" to create them.</div>';
        return;
    }
    
    
    const topicChipsHTML = allTopics.slice(0, 15).map(topic => {
        const topicName = topic.keywords && topic.keywords[0] ? topic.keywords[0] : topic.name;
        return `<div class="topic-chip" data-topic-id="${topic.topic_id}">${topicName}</div>`;
    }).join('');
    
    topicsRow.innerHTML = topicChipsHTML;
}


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
    
    grid.innerHTML = docs.map(doc => {
        const docId = doc._id || doc.id;
        const tags = doc.topic_names || doc.tags || [];
        const preview = doc.content ? doc.content.substring(0, 200) + '...' : (doc.preview || '');
        
        return `
            <div class="document-card" onclick="viewDocument('${docId}')">
                <h3 class="document-title">${doc.title}</h3>
                <div class="document-tags">
                    ${tags.slice(0, 5).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <p class="document-preview">${preview}</p>
                ${doc.genre ? `<div class="document-meta" style="margin-top: 0.5rem; color: var(--text-light); font-size: 0.85rem;">Genre: ${doc.genre}</div>` : ''}
            </div>
        `;
    }).join('');
}


function viewDocument(id) {
    window.location.href = `viewer.html?id=${id}`;
}


function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        
        clearTimeout(searchTimeout);
        
        
        searchTimeout = setTimeout(async () => {
            if (query === '') {
                
                if (activeFilter !== null) {
                    filteredDocuments = await filterDocumentsByTopic(activeFilter);
                } else {
                    filteredDocuments = [...allDocuments];
                }
            } else {
                try {
                    
                    const searchResults = await searchDocuments(query);
                    
                    
                    if (activeFilter !== null) {
                        filteredDocuments = searchResults.filter(doc => 
                            doc.topics && doc.topics.includes(activeFilter)
                        );
                    } else {
                        filteredDocuments = searchResults;
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    
                    const baseDocuments = activeFilter !== null
                        ? allDocuments.filter(doc => doc.topics && doc.topics.includes(activeFilter))
                        : allDocuments;
                    
                    filteredDocuments = baseDocuments.filter(doc => {
                        const queryLower = query.toLowerCase();
                        return doc.title.toLowerCase().includes(queryLower) ||
                               (doc.content && doc.content.toLowerCase().includes(queryLower)) ||
                               (doc.genre && doc.genre.toLowerCase().includes(queryLower));
                    });
                }
            }
            
            renderDocuments(filteredDocuments);
        }, 300);
    });
}


function setupTopicFilters() {
    const topicsRow = document.querySelector('.topics-row');
    
    topicsRow.addEventListener('click', async function(e) {
        const chip = e.target.closest('.topic-chip');
        if (!chip) return;
        
        const topicId = parseInt(chip.getAttribute('data-topic-id'));
        const topicChips = document.querySelectorAll('.topic-chip');
        
        
        if (chip.classList.contains('active')) {
            chip.classList.remove('active');
            activeFilter = null;
            filteredDocuments = [...allDocuments];
        } else {
            
            topicChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = topicId;
            
            
            try {
                filteredDocuments = await filterDocumentsByTopic(topicId);
            } catch (error) {
                console.error('Filter error:', error);
                
                filteredDocuments = allDocuments.filter(doc => 
                    doc.topics && doc.topics.includes(topicId)
                );
            }
        }
        
        
        document.getElementById('searchInput').value = '';
        renderDocuments(filteredDocuments);
    });
}


function setupSorting() {
    const sortDropdown = document.getElementById('sortDropdown');
    
    sortDropdown.addEventListener('change', function() {
        const sortBy = this.value;
        
        if (sortBy === 'date') {
            filteredDocuments.sort((a, b) => {
                const dateA = new Date(a.date_added || a.date);
                const dateB = new Date(b.date_added || b.date);
                return dateB - dateA;
            });
        } else if (sortBy === 'popularity') {
            filteredDocuments.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        } else {
            
            if (activeFilter !== null) {
                filterDocumentsByTopic(activeFilter).then(docs => {
                    filteredDocuments = docs;
                    renderDocuments(filteredDocuments);
                });
                return;
            } else {
                filteredDocuments = [...allDocuments];
            }
        }
        
        renderDocuments(filteredDocuments);
    });
}


function setupGenerateTopicsButton() {
    
    const header = document.querySelector('.header');
    if (!header) return;
    
    const generateBtn = document.createElement('button');
    generateBtn.className = 'btn-secondary';
    generateBtn.innerHTML = '🤖 Generate Topics';
    generateBtn.style.marginLeft = 'auto';
    generateBtn.onclick = handleGenerateTopics;
    
    
    const createBtn = document.querySelector('.btn-primary');
    if (createBtn) {
        createBtn.parentNode.insertBefore(generateBtn, createBtn);
    }
}


async function handleGenerateTopics() {
    if (!confirm('This will analyze all documents in the CSV file using BERTopic. This may take several minutes. Continue?')) {
        return;
    }
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Generating Topics...';
    
    try {
        const result = await generateTopics();
        alert(`Topics generated successfully!\n\nTopics: ${result.topics_count}\nDocuments: ${result.documents_processed}`);
        
        
        await loadInitialData();
    } catch (error) {
        alert(`Error generating topics: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}