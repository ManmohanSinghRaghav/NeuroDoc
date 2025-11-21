const API_BASE_URL = 'http://localhost:8000';

let documentsCache = [];
let topicsCache = [];

const documents = [
    {
        id: 1,
        title: "Advances in EEG Signal Processing 2025",
        tags: ["EEG", "Signal Processing"],
        preview: "Recent studies show that deep learning models have revolutionized EEG signal processing, enabling more accurate classification of brain states and improved clinical diagnostics.",
        content: `Recent studies show that deep learning models have revolutionized EEG signal processing, enabling more accurate classification of brain states and improved clinical diagnostics.

This comprehensive review explores the latest developments in computational neuroscience, focusing on novel algorithms for artifact removal, feature extraction, and real-time analysis of electroencephalography data.

Key findings include improved accuracy in seizure detection, sleep stage classification, and brain-computer interface applications. The integration of transformer architectures has shown particular promise in handling long-range temporal dependencies in neural signals.

The research demonstrates that modern deep learning approaches can achieve over 95% accuracy in automated EEG analysis tasks, significantly outperforming traditional signal processing methods. These advancements have important implications for clinical practice, enabling more efficient diagnosis and monitoring of neurological conditions.`,
        date: "2025-01-15",
        popularity: 95,
        authors: "Smith, J., Johnson, A.",
        year: "2025"
    },
    {
        id: 2,
        title: "fMRI Analysis Techniques for Alzheimer's Detection",
        tags: ["fMRI", "Alzheimer", "Imaging"],
        preview: "Functional magnetic resonance imaging has emerged as a powerful tool for early detection of Alzheimer's disease through analysis of brain connectivity patterns.",
        content: `Functional magnetic resonance imaging has emerged as a powerful tool for early detection of Alzheimer's disease through analysis of brain connectivity patterns.

This study presents novel analysis techniques that leverage machine learning to identify subtle changes in neural networks associated with early-stage cognitive decline. Our multivariate approach combines resting-state fMRI data with structural imaging to create comprehensive models of brain function.

Results indicate that connectivity changes in the default mode network can predict Alzheimer's progression up to 5 years before clinical symptoms appear. The sensitivity of our method reaches 87%, with a specificity of 92%, making it a valuable screening tool for at-risk populations.

These findings open new avenues for preventive interventions and personalized treatment strategies in neurodegenerative diseases.`,
        date: "2024-12-20",
        popularity: 88,
        authors: "Chen, L., Williams, M.",
        year: "2024"
    },
    {
        id: 3,
        title: "Parkinson's Disease Biomarkers in Neuroimaging",
        tags: ["Parkinson", "Biomarkers", "Neuroscience"],
        preview: "Identification of reliable biomarkers for Parkinson's disease progression using multimodal neuroimaging approaches including PET and MRI.",
        content: `Identification of reliable biomarkers for Parkinson's disease progression using multimodal neuroimaging approaches including PET and MRI.

This research combines structural and functional imaging data to create comprehensive models of disease progression. Our longitudinal study followed 200 Parkinson's patients over 3 years, tracking changes in dopaminergic function, brain structure, and metabolic activity.

We identified several promising biomarkers including reduced striatal dopamine transporter binding, volumetric changes in the substantia nigra, and altered functional connectivity in motor networks. These markers show strong correlation with clinical progression scores.

The integration of multiple imaging modalities provides a more complete picture of disease mechanisms and may enable earlier diagnosis and more targeted therapeutic interventions.`,
        date: "2025-01-10",
        popularity: 82,
        authors: "Rodriguez, P., Kim, S.",
        year: "2025"
    },
    {
        id: 4,
        title: "Stroke Recovery and Neural Plasticity",
        tags: ["Stroke", "Neuroscience", "Rehabilitation"],
        preview: "Understanding mechanisms of neural plasticity following stroke provides insights into rehabilitation strategies and recovery trajectories.",
        content: `Understanding mechanisms of neural plasticity following stroke provides insights into rehabilitation strategies and recovery trajectories.

This longitudinal study examines brain reorganization patterns in stroke survivors over 12 months of intensive rehabilitation. Using advanced fMRI techniques, we mapped changes in motor cortex activation and connectivity during the recovery process.

Our findings reveal that successful recovery is associated with recruitment of perilesional cortex and enhancement of interhemispheric connections. Patients showing greater plasticity in early rehabilitation phases achieved significantly better functional outcomes.

These results suggest that rehabilitation protocols should be tailored to individual patterns of neural reorganization, with timing and intensity optimized based on plasticity biomarkers.`,
        date: "2024-11-30",
        popularity: 76,
        authors: "Thompson, R., Anderson, K.",
        year: "2024"
    },
    {
        id: 5,
        title: "Epilepsy Seizure Prediction Using Deep Learning",
        tags: ["Epilepsy", "EEG", "AI"],
        preview: "Deep learning models show promising results in predicting epileptic seizures minutes before onset using continuous EEG monitoring.",
        content: `Deep learning models show promising results in predicting epileptic seizures minutes before onset using continuous EEG monitoring.

Our convolutional neural network achieves 89% sensitivity in seizure prediction across multiple patients, with an average prediction horizon of 15 minutes before seizure onset. The model was trained on over 10,000 hours of continuous EEG data from 50 epilepsy patients.

Key innovations include patient-specific model adaptation and real-time processing capabilities suitable for wearable devices. False positive rates remain under 0.3 per hour, making the system practical for daily use.

This technology has the potential to dramatically improve quality of life for epilepsy patients by providing advance warning of impending seizures, allowing preventive interventions and safety measures.`,
        date: "2025-01-05",
        popularity: 91,
        authors: "Lee, D., Martinez, F.",
        year: "2025"
    },
    {
        id: 6,
        title: "Cognitive Enhancement Through Neurofeedback",
        tags: ["Neuroscience", "EEG", "Cognitive"],
        preview: "Neurofeedback training protocols show measurable improvements in attention, memory, and executive function across diverse populations.",
        content: `Neurofeedback training protocols show measurable improvements in attention, memory, and executive function across diverse populations.

This randomized controlled trial evaluated the efficacy of personalized EEG neurofeedback for cognitive enhancement in 120 healthy adults. Participants underwent 20 sessions targeting specific brainwave patterns associated with optimal cognitive performance.

Results demonstrate significant improvements in working memory capacity (Cohen's d = 0.65), sustained attention (d = 0.72), and processing speed (d = 0.58) compared to active control groups. Effects persisted at 6-month follow-up, suggesting lasting neuroplastic changes.

The study supports the potential of neurofeedback as a non-invasive cognitive enhancement tool, with applications in education, aging, and performance optimization.`,
        date: "2024-12-15",
        popularity: 79,
        authors: "Garcia, M., Brown, T.",
        year: "2024"
    }
];

async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function loadDocuments() {
    try {
        const response = await apiRequest('/api/documents?limit=1000');
        documentsCache = response.documents || [];
        return documentsCache;
    } catch (error) {
        console.error('Error loading documents:', error);
    
        return [...documents];
    }
}

async function loadTopics() {
    try {
        const topics = await apiRequest('/api/topics?limit=1000');
        topicsCache = topics || [];
        return topicsCache;
    } catch (error) {
        console.error('Error loading topics:', error);
        return [];
    }
}

async function getDocumentById(id) {
    try {
        return await apiRequest(`/api/documents/${id}`);
    } catch (error) {
        console.error('Error fetching document:', error);
    
        return documentsCache.find(doc => doc._id === id || doc.id === parseInt(id));
    }
}

async function createDocument(documentData) {
    try {
        return await apiRequest('/api/documents', {
            method: 'POST',
            body: JSON.stringify(documentData)
        });
    } catch (error) {
        console.error('Error creating document:', error);
        throw error;
    }
}

async function updateDocument(id, documentData) {
    try {
        return await apiRequest(`/api/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(documentData)
        });
    } catch (error) {
        console.error('Error updating document:', error);
        throw error;
    }
}

async function deleteDocument(id) {
    try {
        return await apiRequest(`/api/documents/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}

async function searchDocuments(query) {
    try {
        const response = await apiRequest(`/api/documents/search?q=${encodeURIComponent(query)}`);
        return response.documents || [];
    } catch (error) {
        console.error('Error searching documents:', error);
        return [];
    }
}

async function filterDocumentsByTopic(topicId) {
    try {
        const response = await apiRequest(`/api/documents/filter/topic/${topicId}`);
        return response.documents || [];
    } catch (error) {
        console.error('Error filtering documents:', error);
        return [];
    }
}

async function generateTopics() {
    try {
        return await apiRequest('/api/topics/generate', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error generating topics:', error);
        throw error;
    }
}

async function loadCSVData() {
    try {
        return await apiRequest('/api/csv/load');
    } catch (error) {
        console.error('Error loading CSV:', error);
        throw error;
    }
}

async function suggestTopicsFromContent(content, numTopics = 5) {
    try {
        return await apiRequest('/api/topics/suggest', {
            method: 'POST',
            body: JSON.stringify({ content, num_topics: numTopics })
        });
    } catch (error) {
        console.error('Error suggesting topics:', error);
        throw error;
    }
}

function saveDocuments() {
    try {
        const data = {docs: documents};
        const jsonStr = JSON.stringify(data);
        console.log('Saving documents:', documents.length);
    } catch (e) {
        console.error('Save error:', e);
    }
}

function toggleTree(element) {
    const children = element.nextElementSibling;
    const icon = element.querySelector('.tree-icon');
    
    if (children && children.classList.contains('tree-children')) {
        children.classList.toggle('expanded');
        if (icon) {
            icon.classList.toggle('rotated');
        }
    }
}