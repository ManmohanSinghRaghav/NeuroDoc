// create.js - Create/Edit document functionality

let editingDocument = null;
let nextId = 7; // Start after existing documents

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkEditMode();
    setupForm();
    setupSourceToggle();
    setupFileUpload();
    setupSuggestedTopics();
});

// Check if editing existing document
function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId) {
        editingDocument = getDocumentById(editId);
        
        if (editingDocument) {
            document.getElementById('pageTitle').textContent = `Edit Document: ${editingDocument.title}`;
            populateForm(editingDocument);
        }
    }
}

// Populate form with existing document data
function populateForm(doc) {
    document.getElementById('docTitle').value = doc.title;
    document.getElementById('docContent').value = doc.content;
    
    if (doc.authors) {
        document.getElementById('docAuthors').value = doc.authors;
    }
    if (doc.year) {
        document.getElementById('docYear').value = doc.year;
    }
    
    // Check relevant topics
    doc.tags.forEach(tag => {
        const checkbox = document.querySelector(`input[name="topics"][value="${tag}"]`);
        if (checkbox) {
            checkbox.checked = true;
            // Expand parent categories
            expandParentCategories(checkbox);
        }
    });
}

// Expand parent categories
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

// Setup form submission
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

// Save document
function saveDocument(addAnother) {
    const title = document.getElementById('docTitle').value.trim();
    const content = document.getElementById('docContent').value.trim();
    const authors = document.getElementById('docAuthors').value.trim();
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
    
    // Get selected topics
    const selectedTopics = Array.from(document.querySelectorAll('input[name="topics"]:checked'))
        .map(cb => cb.value);
    
    if (selectedTopics.length === 0) {
        alert('Please select at least one topic');
        return;
    }
    
    // Create document object
    const doc = {
        id: editingDocument ? editingDocument.id : nextId++,
        title: title,
        tags: selectedTopics,
        preview: content.substring(0, 200) + '...',
        content: content,
        date: editingDocument ? editingDocument.date : new Date().toISOString().split('T')[0],
        popularity: editingDocument ? editingDocument.popularity : 50,
        authors: authors || undefined,
        year: year || undefined,
        doi: doi || undefined
    };
    
    // Save to documents array
    if (editingDocument) {
        const index = documents.findIndex(d => d.id === editingDocument.id);
        if (index !== -1) {
            documents[index] = doc;
        }
    } else {
        documents.push(doc);
    }
    
    saveDocuments();
    
    // Show success message
    alert(editingDocument ? 'Document updated successfully!' : 'Document created successfully!');
    
    if (addAnother) {
        // Reset form
        document.getElementById('documentForm').reset();
        document.querySelectorAll('input[name="topics"]').forEach(cb => cb.checked = false);
        editingDocument = null;
        document.getElementById('pageTitle').textContent = 'Create New Document';
        window.scrollTo(0, 0);
    } else {
        // Redirect to viewer
        window.location.href = `viewer.html?id=${doc.id}`;
    }
}

// Setup source toggle
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

// Setup file upload
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const file = this.files[0];
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            
            // Read file content
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                document.getElementById('docContent').value = content;
                
                // Auto-suggest title if empty
                if (!document.getElementById('docTitle').value) {
                    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                    document.getElementById('docTitle').value = fileName;
                }
            };
            reader.readAsText(file);
        }
    });
    
    // Drag and drop
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

// Setup suggested topics
function setupSuggestedTopics() {
    const suggestedTags = document.querySelectorAll('.suggested-tag');
    
    suggestedTags.forEach(tag => {
        tag.addEventListener('click', function() {
            const topic = this.getAttribute('data-topic');
            const checkbox = document.querySelector(`input[name="topics"][value="${topic}"]`);
            
            if (checkbox) {
                checkbox.checked = true;
                expandParentCategories(checkbox);
                this.style.opacity = '0.5';
                this.style.pointerEvents = 'none';
            }
        });
    });
}

// Expand all topics
function expandAllTopics() {
    const allChildren = document.querySelectorAll('#editTopicTree .tree-children');
    const allIcons = document.querySelectorAll('#editTopicTree .tree-icon');
    
    allChildren.forEach(child => child.classList.add('expanded'));
    allIcons.forEach(icon => icon.classList.add('rotated'));
}