class LaborTracker {
    constructor() {
        this.contractions = this.loadContractions();
        this.currentContraction = null;
        this.timer = null;
        this.chart = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadNotes();
        this.updateDisplay();
        this.initializeChart();
    }

    initializeElements() {
        this.startBtn = document.getElementById('start-contraction');
        this.endBtn = document.getElementById('end-contraction');
        this.timerDisplay = document.querySelector('.current-time');
        this.lastDuration = document.getElementById('last-duration');
        this.timeBetween = document.getElementById('time-between');
        this.historyItems = document.getElementById('history-items');
        this.notesTextarea = document.getElementById('caregiver-notes');
        this.manualTimeInput = document.getElementById('manual-time');
        this.manualDurationInput = document.getElementById('manual-duration');
        this.addManualBtn = document.getElementById('add-manual');
        this.exportBtn = document.getElementById('export-data');
        this.importBtn = document.getElementById('import-data');
        this.importFileInput = document.getElementById('import-file');
        this.clearBtn = document.getElementById('clear-data');
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startContraction());
        this.endBtn.addEventListener('click', () => this.endContraction());
        this.notesTextarea.addEventListener('input', () => this.saveNotes());
        this.addManualBtn.addEventListener('click', () => this.addManualContraction());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.importBtn.addEventListener('click', () => this.importFileInput.click());
        this.importFileInput.addEventListener('change', (e) => this.importData(e));
        this.clearBtn.addEventListener('click', () => this.clearData());
    }

    startContraction() {
        this.currentContraction = {
            startTime: new Date(),
            endTime: null
        };
        
        this.startBtn.disabled = true;
        this.endBtn.disabled = false;
        
        this.timer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    endContraction() {
        if (!this.currentContraction) return;
        
        this.currentContraction.endTime = new Date();
        this.contractions.push(this.currentContraction);
        
        this.startBtn.disabled = false;
        this.endBtn.disabled = true;
        
        clearInterval(this.timer);
        this.timerDisplay.textContent = '00:00';
        
        this.saveData();
        this.updateDisplay();
        this.updateChart();
        
        this.currentContraction = null;
    }

    updateTimer() {
        if (!this.currentContraction) return;
        
        const now = new Date();
        const elapsed = Math.floor((now - this.currentContraction.startTime) / 1000);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        this.timerDisplay.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatDuration(startTime, endTime) {
        const duration = Math.floor((endTime - startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    calculateInterval(current, previous) {
        const currentStart = new Date(current.startTime);
        const previousStart = new Date(previous.startTime);
        const interval = Math.floor((currentStart - previousStart) / (1000 * 60));
        return `${interval} min`;
    }

    loadContractions() {
        const saved = localStorage.getItem('contractions');
        if (!saved) return [];
        
        const contractions = JSON.parse(saved);
        return contractions.map(contraction => ({
            ...contraction,
            startTime: new Date(contraction.startTime),
            endTime: contraction.endTime ? new Date(contraction.endTime) : null
        }));
    }

    updateDisplay() {
        if (this.contractions.length === 0) {
            this.lastDuration.textContent = '--';
            this.timeBetween.textContent = '--';
            this.historyItems.innerHTML = '<div class="no-data">No contractions recorded yet</div>';
            return;
        }

        const lastContraction = this.contractions[this.contractions.length - 1];
        
        if (lastContraction.endTime) {
            this.lastDuration.textContent = this.formatDuration(
                new Date(lastContraction.startTime), 
                new Date(lastContraction.endTime)
            );
        }

        if (this.contractions.length > 1) {
            const secondLast = this.contractions[this.contractions.length - 2];
            this.timeBetween.textContent = this.calculateInterval(lastContraction, secondLast);
        }

        this.updateHistoryList();
    }

    updateHistoryList() {
        this.historyItems.innerHTML = '';
        
        const recentContractions = this.contractions.slice(-10).reverse();
        
        recentContractions.forEach((contraction, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const startTime = new Date(contraction.startTime);
            const endTime = contraction.endTime ? new Date(contraction.endTime) : null;
            
            const duration = endTime ? this.formatDuration(startTime, endTime) : 'In progress...';
            
            let interval = '--';
            if (index < recentContractions.length - 1) {
                const nextContraction = recentContractions[index + 1];
                interval = this.calculateInterval(contraction, nextContraction);
            }
            
            const actualIndex = this.contractions.length - 1 - index;
            
            item.innerHTML = `
                <span class="time-cell" data-index="${actualIndex}">
                    <span class="display-value">${this.formatTime(startTime)}</span>
                    <button class="edit-btn" onclick="laborTracker.editField(${actualIndex}, 'time')">✏️</button>
                </span>
                <span class="duration-cell" data-index="${actualIndex}">
                    <span class="display-value">${duration}</span>
                    ${endTime ? `<button class="edit-btn" onclick="laborTracker.editField(${actualIndex}, 'duration')">✏️</button>` : ''}
                </span>
                <span>${interval}</span>
                <span class="actions-cell">
                    <button class="delete-btn" onclick="laborTracker.deleteContraction(${actualIndex})">🗑️</button>
                </span>
            `;
            
            this.historyItems.appendChild(item);
        });
    }

    initializeChart() {
        const ctx = document.getElementById('contractionChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Duration (seconds)',
                    data: [],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    tension: 0.1
                }, {
                    label: 'Interval (minutes)',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Duration (seconds)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Interval (minutes)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
        
        this.updateChart();
    }

    updateChart() {
        if (!this.chart || this.contractions.length === 0) return;
        
        const completedContractions = this.contractions.filter(c => c.endTime);
        const labels = [];
        const durations = [];
        const intervals = [];
        
        completedContractions.forEach((contraction, index) => {
            const startTime = new Date(contraction.startTime);
            const endTime = new Date(contraction.endTime);
            
            labels.push(this.formatTime(startTime));
            durations.push(Math.floor((endTime - startTime) / 1000));
            
            if (index > 0) {
                const prevContraction = completedContractions[index - 1];
                const interval = Math.floor((startTime - new Date(prevContraction.startTime)) / (1000 * 60));
                intervals.push(interval);
            } else {
                intervals.push(null);
            }
        });
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = durations;
        this.chart.data.datasets[1].data = intervals;
        this.chart.update();
    }

    saveData() {
        localStorage.setItem('contractions', JSON.stringify(this.contractions));
    }

    saveNotes() {
        localStorage.setItem('caregiverNotes', this.notesTextarea.value);
    }

    loadNotes() {
        const savedNotes = localStorage.getItem('caregiverNotes');
        if (savedNotes) {
            this.notesTextarea.value = savedNotes;
        }
    }

    addManualContraction() {
        const timeValue = this.manualTimeInput.value;
        const durationValue = this.manualDurationInput.value;
        
        if (!timeValue || !durationValue) {
            alert('Please fill in both time and duration fields.');
            return;
        }
        
        if (!this.validateDurationFormat(durationValue)) {
            alert('Please enter duration in MM:SS format (e.g., 1:30).');
            return;
        }
        
        const startTime = new Date(timeValue);
        const durationSeconds = this.parseDurationToSeconds(durationValue);
        const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
        
        const contraction = {
            startTime: startTime,
            endTime: endTime
        };
        
        this.contractions.push(contraction);
        this.contractions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        this.manualTimeInput.value = '';
        this.manualDurationInput.value = '';
        
        this.saveData();
        this.updateDisplay();
        this.updateChart();
    }
    
    validateDurationFormat(duration) {
        return /^[0-9]+:[0-5][0-9]$/.test(duration);
    }
    
    parseDurationToSeconds(duration) {
        const [minutes, seconds] = duration.split(':').map(Number);
        return minutes * 60 + seconds;
    }
    
    editField(index, field) {
        const contraction = this.contractions[index];
        if (!contraction || !contraction.endTime) return;
        
        const cell = document.querySelector(`.${field}-cell[data-index="${index}"]`);
        const displayValue = cell.querySelector('.display-value');
        const editBtn = cell.querySelector('.edit-btn');
        
        if (field === 'time') {
            const currentTime = new Date(contraction.startTime);
            const input = document.createElement('input');
            input.type = 'datetime-local';
            input.step = '1';
            input.value = currentTime.toISOString().slice(0, 19);
            input.className = 'edit-input';
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '✓';
            saveBtn.className = 'save-btn';
            saveBtn.onclick = () => this.saveTimeEdit(index, input.value);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '✕';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.onclick = () => this.cancelEdit();
            
            displayValue.style.display = 'none';
            editBtn.style.display = 'none';
            cell.appendChild(input);
            cell.appendChild(saveBtn);
            cell.appendChild(cancelBtn);
        } else if (field === 'duration') {
            const duration = this.formatDuration(new Date(contraction.startTime), new Date(contraction.endTime));
            const input = document.createElement('input');
            input.type = 'text';
            input.value = duration;
            input.className = 'edit-input';
            input.pattern = '[0-9]+:[0-5][0-9]';
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '✓';
            saveBtn.className = 'save-btn';
            saveBtn.onclick = () => this.saveDurationEdit(index, input.value);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '✕';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.onclick = () => this.cancelEdit();
            
            displayValue.style.display = 'none';
            editBtn.style.display = 'none';
            cell.appendChild(input);
            cell.appendChild(saveBtn);
            cell.appendChild(cancelBtn);
        }
    }
    
    saveTimeEdit(index, newTimeValue) {
        if (!newTimeValue) {
            alert('Please enter a valid time.');
            return;
        }
        
        const newStartTime = new Date(newTimeValue);
        const contraction = this.contractions[index];
        const duration = new Date(contraction.endTime) - new Date(contraction.startTime);
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        this.contractions[index] = {
            startTime: newStartTime,
            endTime: newEndTime
        };
        
        this.contractions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        this.saveData();
        this.updateDisplay();
        this.updateChart();
    }
    
    saveDurationEdit(index, newDurationValue) {
        if (!this.validateDurationFormat(newDurationValue)) {
            alert('Please enter duration in MM:SS format (e.g., 1:30).');
            return;
        }
        
        const contraction = this.contractions[index];
        const durationSeconds = this.parseDurationToSeconds(newDurationValue);
        const newEndTime = new Date(new Date(contraction.startTime).getTime() + durationSeconds * 1000);
        
        this.contractions[index] = {
            startTime: new Date(contraction.startTime),
            endTime: newEndTime
        };
        
        this.saveData();
        this.updateDisplay();
        this.updateChart();
    }
    
    cancelEdit() {
        this.updateDisplay();
    }
    
    deleteContraction(index) {
        if (confirm('Are you sure you want to delete this contraction?')) {
            this.contractions.splice(index, 1);
            this.saveData();
            this.updateDisplay();
            this.updateChart();
        }
    }

    exportData() {
        const exportData = {
            contractions: this.contractions,
            notes: this.notesTextarea.value,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        link.download = `labor-tracker-backup-${timestamp}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(link.href);
    }
    
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importData = JSON.parse(e.target.result);
                
                if (!this.validateImportData(importData)) {
                    alert('Invalid backup file format. Please select a valid labor tracker backup file.');
                    return;
                }
                
                const confirmMessage = `This will replace all current data with the backup from ${new Date(importData.exportDate).toLocaleString()}.\n\nCurrent data:\n- ${this.contractions.length} contractions\n- ${this.notesTextarea.value.length} characters of notes\n\nBackup data:\n- ${importData.contractions.length} contractions\n- ${importData.notes.length} characters of notes\n\nAre you sure you want to continue?`;
                
                if (!confirm(confirmMessage)) {
                    return;
                }
                
                this.contractions = this.processImportedContractions(importData.contractions);
                this.notesTextarea.value = importData.notes || '';
                
                this.saveData();
                this.saveNotes();
                this.updateDisplay();
                this.updateChart();
                
                alert(`Successfully imported ${this.contractions.length} contractions and notes from backup.`);
                
            } catch (error) {
                alert('Error reading backup file. Please ensure it is a valid labor tracker backup file.');
                console.error('Import error:', error);
            }
        };
        
        reader.readAsText(file);
        event.target.value = '';
    }
    
    validateImportData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.contractions)) return false;
        if (typeof data.notes !== 'string') return false;
        if (!data.exportDate || !data.version) return false;
        
        return data.contractions.every(contraction => {
            return contraction.startTime && 
                   (contraction.endTime || contraction.endTime === null) &&
                   new Date(contraction.startTime).toString() !== 'Invalid Date';
        });
    }
    
    processImportedContractions(contractions) {
        return contractions.map(contraction => ({
            startTime: new Date(contraction.startTime),
            endTime: contraction.endTime ? new Date(contraction.endTime) : null
        })).sort((a, b) => a.startTime - b.startTime);
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            this.contractions = [];
            localStorage.removeItem('contractions');
            localStorage.removeItem('caregiverNotes');
            this.notesTextarea.value = '';
            this.updateDisplay();
            this.updateChart();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.laborTracker = new LaborTracker();
});

window.addEventListener('beforeunload', (e) => {
    if (window.laborTracker && window.laborTracker.currentContraction) {
        e.preventDefault();
        return 'You have an active contraction timer. Are you sure you want to leave?';
    }
});