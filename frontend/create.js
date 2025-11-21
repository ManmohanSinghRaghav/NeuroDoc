

let editingDocument = null;

document.addEventListener('DOMContentLoaded', async function() {
    await checkEditMode();
    setupForm();
    setupSourceToggle();
    setupFileUpload();
});

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
    
    
    const authors = authorsText ? authorsText.split(',').map(a => a.trim()).filter(a => a) : [];
    
    
    const docData = {
        title: title,
        content: content,
        authors: authors,
        year: year ? parseInt(year) : null,
        doi: doi || null,
        genre: 'Manual Entry'
    };
    
    try {
        let savedDoc;
        if (editingDocument) {
            
            savedDoc = await updateDocument(editingDocument._id || editingDocument.id, docData);
            alert('Document updated successfully! Topics were automatically generated.');
        } else {
            
            savedDoc = await createDocument(docData);
            alert('Document created successfully! Topics were automatically generated.');
        }
        
        if (addAnother) {
            
            document.getElementById('documentForm').reset();
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