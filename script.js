class LaborTracker {
    constructor() {
        this.contractions = this.loadContractions();
        this.currentContraction = null;
        this.timer = null;
        this.chart = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.loadNotes();
        this.checkForUrlImport();
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
        this.manualIntensityInput = document.getElementById('manual-intensity');
        this.addManualBtn = document.getElementById('add-manual');
        this.timerIntensityInput = document.getElementById('timer-intensity');
        this.timerIntensitySection = document.getElementById('timer-intensity-section');
        this.exportBtn = document.getElementById('export-data');
        this.importBtn = document.getElementById('import-data');
        this.importFileInput = document.getElementById('import-file');
        this.clearBtn = document.getElementById('clear-data');
        this.exportQrBtn = document.getElementById('export-qr');
        this.scanQrBtn = document.getElementById('scan-qr');
        this.qrModal = document.getElementById('qr-modal');
        this.scannerModal = document.getElementById('scanner-modal');
        this.scannerVideo = document.getElementById('scanner-video');
        this.startCameraBtn = document.getElementById('start-camera');
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
        this.manualIntensityInput.addEventListener('input', () => this.updateIntensityDisplay('manual'));
        this.timerIntensityInput.addEventListener('input', () => this.updateIntensityDisplay('timer'));
        this.exportQrBtn.addEventListener('click', () => this.showQRCode());
        this.scanQrBtn.addEventListener('click', () => this.openScanner());
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        
        // Modal close buttons
        document.querySelector('.close-modal').addEventListener('click', () => this.closeQRModal());
        document.querySelector('.close-scanner').addEventListener('click', () => this.closeScanner());
        
        // Close modals when clicking outside
        this.qrModal.addEventListener('click', (e) => {
            if (e.target === this.qrModal) this.closeQRModal();
        });
        this.scannerModal.addEventListener('click', (e) => {
            if (e.target === this.scannerModal) this.closeScanner();
        });
    }

    startContraction() {
        this.currentContraction = {
            startTime: new Date(),
            endTime: null,
            intensity: 3
        };
        
        this.startBtn.disabled = true;
        this.endBtn.disabled = false;
        this.timerIntensitySection.style.display = 'block';
        this.timerIntensityInput.value = 3;
        this.updateIntensityDisplay('timer');
        
        this.timer = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    endContraction() {
        if (!this.currentContraction) return;
        
        this.currentContraction.endTime = new Date();
        this.currentContraction.intensity = parseInt(this.timerIntensityInput.value);
        this.contractions.push(this.currentContraction);
        
        this.startBtn.disabled = false;
        this.endBtn.disabled = true;
        this.timerIntensitySection.style.display = 'none';
        
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
            const intensity = contraction.intensity || 3;
            const intensityLabel = this.getIntensityLabel(intensity);
            
            item.innerHTML = `
                <span class="time-cell" data-index="${actualIndex}">
                    <span class="display-value">${this.formatTime(startTime)}</span>
                    <button class="edit-btn" onclick="laborTracker.editField(${actualIndex}, 'time')">✏️</button>
                </span>
                <span class="duration-cell" data-index="${actualIndex}">
                    <span class="display-value">${duration}</span>
                    ${endTime ? `<button class="edit-btn" onclick="laborTracker.editField(${actualIndex}, 'duration')">✏️</button>` : ''}
                </span>
                <span class="intensity-cell" data-index="${actualIndex}">
                    <span class="display-value">${intensity} - ${intensityLabel}</span>
                    ${endTime ? `<button class="edit-btn" onclick="laborTracker.editField(${actualIndex}, 'intensity')">✏️</button>` : ''}
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
        const intensityValue = this.manualIntensityInput.value;
        
        if (!timeValue || !durationValue) {
            alert('Please fill in both time and duration fields.');
            return;
        }
        
        const durationSeconds = parseInt(durationValue, 10);
        if (isNaN(durationSeconds) || durationSeconds <= 0) {
            alert('Please enter a valid duration in seconds (e.g., 90).');
            return;
        }
        
        const startTime = new Date(timeValue);
        const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
        
        const contraction = {
            startTime: startTime,
            endTime: endTime,
            intensity: parseInt(intensityValue, 10)
        };
        
        this.contractions.push(contraction);
        this.contractions.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        
        this.manualTimeInput.value = '';
        this.manualDurationInput.value = '';
        this.manualIntensityInput.value = 3;
        this.updateIntensityDisplay('manual');
        
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
            const durationMs = new Date(contraction.endTime) - new Date(contraction.startTime);
            const durationSeconds = Math.floor(durationMs / 1000);
            const input = document.createElement('input');
            input.type = 'number';
            input.value = durationSeconds;
            input.className = 'edit-input';
            input.min = '1';
            input.max = '600';
            
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
        const durationSeconds = parseInt(newDurationValue, 10);
        if (isNaN(durationSeconds) || durationSeconds <= 0) {
            alert('Please enter a valid duration in seconds (e.g., 90).');
            return;
        }
        
        const contraction = this.contractions[index];
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
            version: '1.1'
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
            const hasValidStartTime = contraction.startTime && 
                                    new Date(contraction.startTime).toString() !== 'Invalid Date';
            const hasValidEndTime = contraction.endTime === null || 
                                   (contraction.endTime && new Date(contraction.endTime).toString() !== 'Invalid Date');
            const hasValidIntensity = contraction.intensity === undefined || 
                                     (typeof contraction.intensity === 'number' && 
                                      contraction.intensity >= 1 && 
                                      contraction.intensity <= 5);
            
            return hasValidStartTime && hasValidEndTime && hasValidIntensity;
        });
    }
    
    processImportedContractions(contractions) {
        return contractions.map(contraction => ({
            startTime: new Date(contraction.startTime),
            endTime: contraction.endTime ? new Date(contraction.endTime) : null,
            intensity: contraction.intensity || 3
        })).sort((a, b) => a.startTime - b.startTime);
    }

    updateIntensityDisplay(type) {
        const input = type === 'manual' ? this.manualIntensityInput : this.timerIntensityInput;
        const valueSpan = document.getElementById(`${type === 'manual' ? 'intensity' : 'timer-intensity'}-value`);
        const labelSpan = document.getElementById(`${type === 'manual' ? 'intensity' : 'timer-intensity'}-label`);
        
        const value = input.value;
        valueSpan.textContent = value;
        labelSpan.textContent = this.getIntensityLabel(parseInt(value));
    }
    
    getIntensityLabel(intensity) {
        const labels = {
            1: 'Light',
            2: 'Mild', 
            3: 'Medium',
            4: 'Strong',
            5: 'Heavy'
        };
        return labels[intensity] || 'Medium';
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
            const durationMs = new Date(contraction.endTime) - new Date(contraction.startTime);
            const durationSeconds = Math.floor(durationMs / 1000);
            const input = document.createElement('input');
            input.type = 'number';
            input.value = durationSeconds;
            input.className = 'edit-input';
            input.min = '1';
            input.max = '600';
            
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
        } else if (field === 'intensity') {
            const currentIntensity = contraction.intensity || 3;
            
            const editContainer = document.createElement('div');
            editContainer.className = 'intensity-edit-container';
            
            const input = document.createElement('input');
            input.type = 'range';
            input.min = '1';
            input.max = '5';
            input.value = currentIntensity;
            input.className = 'edit-input intensity-slider';
            
            const valueDisplay = document.createElement('div');
            valueDisplay.textContent = `${currentIntensity} - ${this.getIntensityLabel(currentIntensity)}`;
            valueDisplay.className = 'intensity-edit-display';
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'intensity-edit-buttons';
            
            const saveBtn = document.createElement('button');
            saveBtn.textContent = '✓';
            saveBtn.className = 'save-btn';
            saveBtn.onclick = () => this.saveIntensityEdit(index, input.value);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '✕';
            cancelBtn.className = 'cancel-btn';
            cancelBtn.onclick = () => this.cancelEdit();
            
            input.addEventListener('input', () => {
                const val = input.value;
                valueDisplay.textContent = `${val} - ${this.getIntensityLabel(parseInt(val))}`;
            });
            
            editContainer.appendChild(input);
            editContainer.appendChild(valueDisplay);
            buttonContainer.appendChild(saveBtn);
            buttonContainer.appendChild(cancelBtn);
            editContainer.appendChild(buttonContainer);
            
            displayValue.style.display = 'none';
            editBtn.style.display = 'none';
            cell.appendChild(editContainer);
        }
    }
    
    saveIntensityEdit(index, newIntensityValue) {
        const intensity = parseInt(newIntensityValue, 10);
        if (isNaN(intensity) || intensity < 1 || intensity > 5) {
            alert('Please select a valid intensity level (1-5).');
            return;
        }
        
        this.contractions[index].intensity = intensity;
        
        this.saveData();
        this.updateDisplay();
        this.updateChart();
    }

    showQRCode() {
        // Compress data by removing unnecessary fields and shortening property names
        const compactData = {
            c: this.contractions.map(contraction => [
                contraction.startTime.getTime(), // Use timestamp instead of ISO string
                contraction.endTime ? contraction.endTime.getTime() : null,
                contraction.intensity || 3
            ]),
            n: this.notesTextarea.value,
            d: Date.now(),
            v: 2 // Version 2 for compact format
        };
        
        try {
            // Try to create QR code with compact data
            const dataStr = JSON.stringify(compactData);
            console.log('Data size:', dataStr.length, 'characters');
            
            // Use simple base64 encoding
            const encodedData = btoa(dataStr);
            
            // Create URL that the app can handle
            const currentUrl = window.location.origin + window.location.pathname;
            const qrUrl = `${currentUrl}?d=${encodedData}`;
            
            console.log('QR URL length:', qrUrl.length);
            
            const qrContainer = document.getElementById('qr-code-container');
            qrContainer.innerHTML = '';
            
            // Check if QRious library is available
            if (typeof QRious === 'undefined') {
                qrContainer.innerHTML = '<p>QR Code library not loaded. Please refresh the page.</p>';
                console.error('QRious library not found');
                this.qrModal.style.display = 'block';
                return;
            }
            
            // Check if data is too large for QR code (rough estimate)
            if (qrUrl.length > 2000) {
                qrContainer.innerHTML = '<p>Too much data for QR code. Try reducing the number of contractions or notes.</p>';
                this.qrModal.style.display = 'block';
                return;
            }
            
            // Create canvas element
            const canvas = document.createElement('canvas');
            qrContainer.appendChild(canvas);
            
            // Generate QR Code using QRious with URL
            new QRious({
                element: canvas,
                value: qrUrl,
                size: 300,
                foreground: '#2d4a35',
                background: '#f5f3f0'
            });
            
        } catch (error) {
            console.error('QR Code generation error:', error);
            const qrContainer = document.getElementById('qr-code-container');
            qrContainer.innerHTML = '<p>Error generating QR code. Data might be too large.</p>';
        }
        
        this.qrModal.style.display = 'block';
    }
    
    closeQRModal() {
        this.qrModal.style.display = 'none';
    }
    
    openScanner() {
        this.scannerModal.style.display = 'block';
    }
    
    closeScanner() {
        this.scannerModal.style.display = 'none';
        if (this.scannerVideo.srcObject) {
            const tracks = this.scannerVideo.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.scannerVideo.srcObject = null;
        }
        if (this.codeReader) {
            this.codeReader.reset();
        }
    }
    
    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            this.scannerVideo.srcObject = stream;
            this.scannerVideo.style.display = 'block';
            this.startCameraBtn.style.display = 'none';
            
            // Initialize QR code reader
            this.codeReader = new ZXing.BrowserQRCodeReader();
            
            this.codeReader.decodeFromVideoDevice(null, this.scannerVideo, (result, err) => {
                if (result) {
                    this.handleQRResult(result.text);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error(err);
                }
            });
            
        } catch (error) {
            alert('Camera access denied or not available. Please check your browser permissions.');
            console.error('Camera error:', error);
        }
    }
    
    handleQRResult(qrData) {
        try {
            let importData;
            
            // Check if it's a URL (our format) or direct JSON data
            if (qrData.includes('?d=')) {
                // Extract the data parameter from URL
                const url = new URL(qrData);
                const encodedData = url.searchParams.get('d');
                
                if (!encodedData) {
                    alert('No data found in QR code URL.');
                    return;
                }
                
                // Decode the base64 data
                const decodedData = atob(encodedData);
                const compactData = JSON.parse(decodedData);
                
                if (compactData.v === 2) {
                    // Convert compact format to full format
                    importData = {
                        contractions: compactData.c.map(c => ({
                            startTime: new Date(c[0]),
                            endTime: c[1] ? new Date(c[1]) : null,
                            intensity: c[2] || 3
                        })),
                        notes: compactData.n || '',
                        exportDate: new Date(compactData.d).toISOString(),
                        version: '2.0'
                    };
                } else {
                    // Old format fallback
                    importData = compactData;
                }
            } else {
                // Try to parse as direct JSON (old format)
                importData = JSON.parse(qrData);
            }
            
            if (!this.validateImportData(importData)) {
                alert('Invalid QR code data. Please scan a valid labor tracker QR code.');
                return;
            }
            
            const confirmMessage = `Import data from QR code?\n\nThis will replace current data:\n- ${this.contractions.length} contractions\n- ${this.notesTextarea.value.length} characters of notes\n\nWith QR data:\n- ${importData.contractions.length} contractions\n- ${importData.notes.length} characters of notes\n\nContinue?`;
            
            if (confirm(confirmMessage)) {
                this.contractions = this.processImportedContractions(importData.contractions);
                this.notesTextarea.value = importData.notes || '';
                
                this.saveData();
                this.saveNotes();
                this.updateDisplay();
                this.updateChart();
                
                alert(`Successfully imported ${this.contractions.length} contractions from QR code!`);
                this.closeScanner();
            }
            
        } catch (error) {
            alert('Invalid QR code format. Please scan a valid labor tracker QR code.');
            console.error('QR decode error:', error);
        }
    }

    checkForUrlImport() {
        const urlParams = new URLSearchParams(window.location.search);
        let importData = urlParams.get('d') || urlParams.get('import'); // Support both new and old formats
        
        if (importData) {
            try {
                let parsedData;
                
                // Try new compact format first
                try {
                    const decodedData = atob(importData);
                    const compactData = JSON.parse(decodedData);
                    
                    if (compactData.v === 2) {
                        // Convert compact format to full format
                        parsedData = {
                            contractions: compactData.c.map(c => ({
                                startTime: new Date(c[0]),
                                endTime: c[1] ? new Date(c[1]) : null,
                                intensity: c[2] || 3
                            })),
                            notes: compactData.n || '',
                            exportDate: new Date(compactData.d).toISOString(),
                            version: '2.0'
                        };
                    } else {
                        // Old format, process as-is
                        parsedData = compactData;
                    }
                } catch (e) {
                    // Fall back to old format
                    const decodedData = decodeURIComponent(atob(importData));
                    parsedData = JSON.parse(decodedData);
                }
                
                if (this.validateImportData(parsedData)) {
                    const confirmMessage = `Import data from QR code?\n\nThis will replace current data:\n- ${this.contractions.length} contractions\n- ${this.notesTextarea.value.length} characters of notes\n\nWith QR data:\n- ${parsedData.contractions.length} contractions\n- ${parsedData.notes.length} characters of notes\n\nContinue?`;
                    
                    if (confirm(confirmMessage)) {
                        this.contractions = this.processImportedContractions(parsedData.contractions);
                        this.notesTextarea.value = parsedData.notes || '';
                        
                        this.saveData();
                        this.saveNotes();
                        
                        alert(`Successfully imported ${this.contractions.length} contractions from QR code!`);
                    }
                } else {
                    alert('Invalid QR code data format.');
                }
            } catch (error) {
                console.error('URL import error:', error);
                alert('Invalid QR code data. Please scan a valid labor tracker QR code.');
            }
            
            // Clean up URL without reloading page
            const url = new URL(window.location);
            url.searchParams.delete('d');
            url.searchParams.delete('import');
            window.history.replaceState({}, document.title, url);
        }
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