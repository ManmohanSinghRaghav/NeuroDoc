

let editingDocument = null;
let availableTopics = [];

document.addEventListener('DOMContentLoaded', async function() {
    await loadAvailableTopics();
    await checkEditMode();
    setupForm();
    setupSourceToggle();
    setupFileUpload();
    setupSuggestedTopics();
    setupGenerateTopicsForDocument();
});

async function loadAvailableTopics() {
    try {
        availableTopics = await loadTopics();
        updateTopicTree();
    } catch (error) {
        console.error('Error loading topics:', error);
    }
}

function updateTopicTree() {
    const topicTree = document.getElementById('editTopicTree');
    if (!topicTree || availableTopics.length === 0) return;
    

    const topicHTML = availableTopics.map(topic => `
        <div class="tree-item">
            <label>
                <input type="checkbox" name="topics" value="${topic.topic_id}">
                <span>${topic.keywords[0] || topic.name}</span>
                ${topic.keywords.length > 1 ? `<span style="color: var(--text-light); font-size: 0.85rem; margin-left: 0.5rem;">(${topic.keywords.slice(1, 3).join(', ')})</span>` : ''}
            </label>
        </div>
    `).join('');
    
    topicTree.innerHTML = topicHTML;
}

async function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        try {
            editingDocument = await getDocumentById(editId);
            
            if (editingDocument) {
                document.getElementById('pageTitle').textContent = `Edit Document: ${editingDocument.title}`;
                populateForm(editingDocument);
            }
        } catch (error) {
            console.error('Error loading document for editing:', error);
            alert('Error loading document');
        }
    }
}

function populateForm(doc) {
    document.getElementById('docTitle').value = doc.title;
    document.getElementById('docContent').value = doc.content;
    
    if (doc.authors && Array.isArray(doc.authors)) {
        document.getElementById('docAuthors').value = doc.authors.join(', ');
    }
    if (doc.year) {
        document.getElementById('docYear').value = doc.year;
    }
    if (doc.doi) {
        document.getElementById('docDOI').value = doc.doi;
    }
    

    const topics = doc.topics || [];
    topics.forEach(topicId => {
        const checkbox = document.querySelector(`input[name="topics"][value="${topicId}"]`);
        if (checkbox) {
            checkbox.checked = true;
            expandParentCategories(checkbox);
        }
    });
}

function expandParentCategories(element) {
    let parent = element.closest('.tree-children');
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

function setupForm() {
    const form = document.getElementById('documentForm');
    const saveAndAddBtn = document.getElementById('saveAndAddBtn');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveDocument(false);
    });
    
    saveAndAddBtn.addEventListener('click', function() {
        saveDocument(true);
    });
}

async function saveDocument(addAnother) {
    const title = document.getElementById('docTitle').value.trim();
    const content = document.getElementById('docContent').value.trim();
    const authorsText = document.getElementById('docAuthors').value.trim();
    const year = document.getElementById('docYear').value.trim();
    const doi = document.getElementById('docDOI').value.trim();
    
    if (!title) {
        alert('Please enter a document title');
        return;
    }
    
    if (!content) {
        alert('Please enter document content');
        return;
    }
    

    const selectedTopics = Array.from(document.querySelectorAll('input[name="topics"]:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedTopics.length === 0) {
        alert('Please select at least one topic');
        return;
    }
    

    const authors = authorsText ? authorsText.split(',').map(a => a.trim()).filter(a => a) : [];
    

    const docData = {
        title: title,
        content: content,
        topics: selectedTopics,
        authors: authors,
        year: year ? parseInt(year) : null,
        doi: doi || null,
        genre: 'Manual Entry'
    };
    
    try {
        let savedDoc;
        if (editingDocument) {
        
            savedDoc = await updateDocument(editingDocument._id || editingDocument.id, docData);
            alert('Document updated successfully!');
        } else {
        
            savedDoc = await createDocument(docData);
            alert('Document created successfully!');
        }
        
        if (addAnother) {
        
            document.getElementById('documentForm').reset();
            document.querySelectorAll('input[name="topics"]').forEach(cb => cb.checked = false);
            editingDocument = null;
            document.getElementById('pageTitle').textContent = 'Create New Document';
            window.scrollTo(0, 0);
        } else {
        
            window.location.href = `viewer.html?id=${savedDoc._id || savedDoc.id}`;
        }
    } catch (error) {
        alert(`Error saving document: ${error.message}`);
        console.error('Save error:', error);
    }
}

function setupSourceToggle() {
    const radioButtons = document.querySelectorAll('input[name="source"]');
    const typeSource = document.getElementById('typeSource');
    const uploadSource = document.getElementById('uploadSource');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'type') {
                typeSource.classList.remove('hidden');
                uploadSource.classList.add('hidden');
            } else {
                typeSource.classList.add('hidden');
                uploadSource.classList.remove('hidden');
            }
        });
    });
}

function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const file = this.files[0];
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            
        
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                document.getElementById('docContent').value = content;
                
            
                if (!document.getElementById('docTitle').value) {
                    const fileName = file.name.replace(/\.[^/.]+$/, "");
                    document.getElementById('docTitle').value = fileName;
                }
            };
            reader.readAsText(file);
        }
    });
    

    const uploadArea = document.querySelector('.file-upload');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--primary)';
        this.style.background = '#ede9fe';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.style.borderColor = 'var(--border)';
        this.style.background = 'var(--bg)';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = 'var(--border)';
        this.style.background = 'var(--bg)';
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
}

function setupSuggestedTopics() {
    const suggestedTags = document.querySelectorAll('.suggested-tag');
    
    suggestedTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const topicId = this.getAttribute('data-topic');
            const checkbox = document.querySelector(`input[name="topics"][value="${topicId}"]`);
            
            if (checkbox) {
                checkbox.checked = true;
                expandParentCategories(checkbox);
                this.style.opacity = '0.5';
                this.style.pointerEvents = 'none';
            }
        });
    });
}

function setupGenerateTopicsForDocument() {
    const aiLabel = document.querySelector('.ai-label');
    if (!aiLabel) return;
    

    const generateBtn = document.createElement('button');
    generateBtn.type = 'button';
    generateBtn.className = 'btn-secondary';
    generateBtn.innerHTML = '🤖 Suggest Topics';
    generateBtn.style.marginLeft = '1rem';
    generateBtn.onclick = handleSuggestTopics;
    
    aiLabel.parentNode.insertBefore(generateBtn, aiLabel.nextSibling);
}

async function handleSuggestTopics() {
    const content = document.getElementById('docContent').value.trim();
    const title = document.getElementById('docTitle').value.trim();
    
    if (!content && !title) {
        alert('Please enter document title or content first');
        return;
    }
    
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Analyzing...';
    
    try {
    
        const textToAnalyze = (title + ' ' + content).trim();
        const suggestions = await suggestTopicsFromContent(textToAnalyze, 5);
        
        if (!suggestions || (!suggestions.suggested_topic_ids || suggestions.suggested_topic_ids.length === 0)) {
        
            if (suggestions.keywords && suggestions.keywords.length > 0) {
                alert(`Suggested keywords: ${suggestions.keywords.join(', ')}\n\nNo matching topics found in database. Your document will use these keywords as topics.`);
            } else {
                alert('No topics could be suggested from this content');
            }
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
    
        let selectedCount = 0;
        suggestions.suggested_topic_ids.forEach(topicId => {
            const checkbox = document.querySelector(`input[name="topics"][value="${topicId}"]`);
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                expandParentCategories(checkbox);
                selectedCount++;
            }
        });
        
        if (selectedCount > 0) {
            alert(`Selected ${selectedCount} relevant topic(s) based on your content!\n\nKeywords: ${suggestions.keywords.join(', ')}`);
        } else {
            alert(`Suggested keywords: ${suggestions.keywords.join(', ')}\n\nTopics matching these keywords are already selected.`);
        }
    } catch (error) {
        alert(`Error suggesting topics: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function expandAllTopics() {
    const allChildren = document.querySelectorAll('#editTopicTree .tree-children');
    const allIcons = document.querySelectorAll('#editTopicTree .tree-icon');
    
    allChildren.forEach(child => child.classList.add('expanded'));
    allIcons.forEach(icon => icon.classList.add('rotated'));
}