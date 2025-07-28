document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let notes = [];
    let currentFilter = 'all';
    let currentSort = 'dateCreated';
    let editingNoteId = null;
    const STORAGE_KEY_NOTES = 'afc-notes';
    const STORAGE_KEY_THEME = 'afc-theme';
    const STORAGE_KEY_CARD_THEME = 'afc-card-theme';

    // --- DOM ELEMENTS ---
    const notesGrid = document.getElementById('notesGrid');
    const tagsContainer = document.getElementById('tagsContainer');
    const searchInput = document.getElementById('searchInput');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const noteModal = document.getElementById('noteModal');
    const emptyState = document.getElementById('emptyState');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const cardThemeSelector = document.getElementById('cardThemeSelector');
    // Note Modal Elements
    const modalTitle = document.getElementById('modalTitle');
    const noteTitleInput = document.getElementById('noteTitleInput');
    const noteContentInput = document.getElementById('noteContentInput');
    const noteTagsInput = document.getElementById('noteTagsInput');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    // Confirmation Modal Elements
    const confirmModal = document.getElementById('confirmModal');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // --- THEME DATA ---
    const cardThemes = {
        'maroon-gold': 'linear-gradient(135deg, #8B1538, #4A0A1C)',
        'oceanic-blue': 'linear-gradient(135deg, #0A192F, #020C1B)',
        'emerald-green': 'linear-gradient(135deg, #013220, #011F13)',
        'amethyst-purple': 'linear-gradient(135deg, #240046, #10002B)',
        'graphite-grey': 'linear-gradient(135deg, #2E2E2E, #1B1B1B)',
        'white-standard': 'linear-gradient(135deg, #FFFFFF, #F0F2F5)',
    };

    // --- AI FUNCTIONS (REMOVED) ---

    // --- THEME FUNCTIONS ---
    
    function setTheme(theme) {
        localStorage.setItem(STORAGE_KEY_THEME, theme);
        document.body.classList.toggle('dark-theme', theme === 'dark');
    }

    function toggleTheme() {
        const newTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        setTheme(newTheme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }
    
    function setCardTheme(themeName) {
        document.body.dataset.cardTheme = themeName;
        localStorage.setItem(STORAGE_KEY_CARD_THEME, themeName);
        // Update active swatch
        document.querySelectorAll('.theme-swatch').forEach(swatch => {
            swatch.classList.toggle('active', swatch.dataset.theme === themeName);
        });
    }

    function renderCardThemeSwatches() {
        let swatchesHTML = '<span>Card Theme:</span>';
        for (const themeName in cardThemes) {
            swatchesHTML += `<button class="theme-swatch" data-theme="${themeName}" style="background: ${cardThemes[themeName]};" title="${themeName.replace(/-/g, ' ')}"></button>`;
        }
        cardThemeSelector.innerHTML = swatchesHTML;
    }

    function loadCardTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEY_CARD_THEME) || 'maroon-gold';
        setCardTheme(savedTheme);
    }

    // --- DATA PERSISTENCE FUNCTIONS ---

    function saveNotesToStorage() {
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
    }

    function loadNotesFromStorage() {
        const storedNotes = localStorage.getItem(STORAGE_KEY_NOTES);
        if (storedNotes) {
            notes = JSON.parse(storedNotes).map(note => ({
                ...note,
                dateCreated: new Date(note.dateCreated),
                dateModified: new Date(note.dateModified)
            }));
        } else {
            notes = [
                { id: 1, title: 'Welcome to AFC Note Organizer', content: 'This is your first note! You can create, edit, and organize your notes with tags. Click on any note to edit it, or use the + button to create new notes. Your notes are now saved in your browser!', tags: ['welcome', 'tutorial'], dateCreated: new Date('2025-07-25T15:50:00'), dateModified: new Date('2025-07-25T15:50:00')},
                { id: 2, title: 'Project Ideas', content: '1. Build a personal website 2. Learn a new programming language 3. Create a mobile app 4. Start a blog about technology', tags: ['projects', 'ideas', 'goals'], dateCreated: new Date('2025-07-24T10:00:00'), dateModified: new Date('2025-07-24T10:00:00')},
                { id: 3, title: 'Meeting Notes', content: 'Discussed quarterly goals and upcoming deadlines. Need to follow up on the marketing campaign and schedule team meeting for next week.', tags: ['work', 'meetings', 'important'], dateCreated: new Date('2025-07-23T14:30:00'), dateModified: new Date('2025-07-23T14:30:00')}
            ];
            saveNotesToStorage();
        }
    }

    // --- CORE RENDER FUNCTIONS ---
    
    function renderApp() {
        renderTags();
        renderNotes();
    }

    function renderTags() {
        const tagSet = new Set(notes.flatMap(note => note.tags));
        const allTags = Array.from(tagSet).sort();
        
        tagsContainer.innerHTML = `
            <button class="tag ${currentFilter === 'all' ? 'active' : ''}" data-tag="all">All</button>
            ${allTags.map(tag => 
                `<button class="tag ${currentFilter === tag ? 'active' : ''}" data-tag="${tag}">${escapeHTML(tag)}</button>`
            ).join('')}
        `;
    }

    function renderNotes() {
        const filteredNotes = getFilteredNotes();
        if (filteredNotes.length === 0) {
            notesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        notesGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        notesGrid.innerHTML = filteredNotes.map(note => {
            return `
                <div class="note-card" data-id="${note.id}">
                    <div class="note-title">${escapeHTML(note.title)}</div>
                    <div class="note-content">${escapeHTML(note.content).substring(0, 150)}${note.content.length > 150 ? '...' : ''}</div>
                    <div class="note-tags">
                        ${note.tags.map(tag => `<span class="note-tag">${escapeHTML(tag)}</span>`).join('')}
                    </div>
                    <div class="note-meta">
                        <span>Created: ${formatDate(note.dateCreated)}</span>
                        <span>Modified: ${formatDate(note.dateModified)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- HELPER & LOGIC FUNCTIONS ---

    function getFilteredNotes() {
        let filteredNotes = [...notes];
        const searchTerm = searchInput.value.toLowerCase();

        if (currentFilter !== 'all') {
            filteredNotes = filteredNotes.filter(note => note.tags.includes(currentFilter));
        }

        if (searchTerm) {
            filteredNotes = filteredNotes.filter(note =>
                note.title.toLowerCase().includes(searchTerm) ||
                note.content.toLowerCase().includes(searchTerm) ||
                note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        filteredNotes.sort((a, b) => {
            return currentSort === 'dateCreated' 
                ? b.dateCreated - a.dateCreated 
                : b.dateModified - a.dateModified;
        });
        return filteredNotes;
    }

    function openModal(noteId = null) {
        editingNoteId = noteId;
        
        if (noteId) {
            const note = notes.find(n => n.id === noteId);
            if (!note) return;
            modalTitle.textContent = 'Edit Note';
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            noteTagsInput.value = note.tags.join(', ');
            deleteBtn.style.display = 'inline-block';
        } else {
            modalTitle.textContent = 'Add New Note';
            noteTitleInput.value = '';
            noteContentInput.value = '';
            noteTagsInput.value = '';
            deleteBtn.style.display = 'none';
        }
        
        noteModal.style.display = 'flex';
        setTimeout(() => noteModal.classList.add('show'), 10);
        noteTitleInput.focus();
    }

    function closeModal() {
        noteModal.classList.remove('show');
        confirmModal.classList.remove('show');
        setTimeout(() => {
            noteModal.style.display = 'none';
            confirmModal.style.display = 'none';
            editingNoteId = null;
        }, 300);
    }

    function saveNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        const tagsInput = noteTagsInput.value.trim();
        
        if (!title || !content) {
            console.error('Title and content cannot be empty.');
            noteTitleInput.style.borderColor = title ? '#6c757d' : '#a94442';
            noteContentInput.style.borderColor = content ? '#6c757d' : '#a94442';
            return;
        }
        noteTitleInput.style.borderColor = '#6c757d';
        noteContentInput.style.borderColor = '#6c757d';
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];
        if (editingNoteId) {
            const noteIndex = notes.findIndex(n => n.id === editingNoteId);
            if (noteIndex > -1) {
                notes[noteIndex] = { ...notes[noteIndex], title, content, tags, dateModified: new Date() };
            }
        } else {
            const newNote = {
                id: Date.now(),
                title,
                content,
                tags,
                dateCreated: new Date(),
                dateModified: new Date()
            };
            notes.unshift(newNote);
        }
        
        saveNotesToStorage();
        closeModal();
        renderApp();
    }

    function deleteNote() {
        notes = notes.filter(n => n.id !== editingNoteId);
        saveNotesToStorage();
        closeModal();
        renderApp();
    }
    
    function showDeleteConfirmation() {
        confirmModal.style.display = 'flex';
        setTimeout(() => confirmModal.classList.add('show'), 10);
    }

    // --- UTILITY FUNCTIONS ---

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    
    function escapeHTML(str) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    }

    // --- EVENT LISTENERS ---

    themeToggleBtn.addEventListener('click', toggleTheme);
    cardThemeSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('theme-swatch')) {
            setCardTheme(e.target.dataset.theme);
        }
    });
    addNoteBtn.addEventListener('click', () => openModal());
    searchInput.addEventListener('input', renderNotes);

    tagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag')) {
            currentFilter = e.target.dataset.tag;
            renderApp();
        }
    });
    sortButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sortButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSort = e.target.dataset.sort;
            renderNotes();
        });
    });

    notesGrid.addEventListener('click', (e) => {
        const noteCard = e.target.closest('.note-card');
        if (noteCard) {
            openModal(parseInt(noteCard.dataset.id));
        }
    });
    saveBtn.addEventListener('click', saveNote);
    cancelBtn.addEventListener('click', closeModal);
    deleteBtn.addEventListener('click', showDeleteConfirmation);
    
    confirmDeleteBtn.addEventListener('click', deleteNote);
    confirmCancelBtn.addEventListener('click', closeModal);

    noteModal.addEventListener('click', (e) => e.target === noteModal && closeModal());
    confirmModal.addEventListener('click', (e) => e.target === confirmModal && closeModal());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            openModal();
        }
    });

    // --- AI Event Listeners (REMOVED) ---

    // --- INITIALIZATION ---
    loadTheme();
    renderCardThemeSwatches();
    loadCardTheme();
    loadNotesFromStorage();
    renderApp();
});