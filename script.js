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
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startContraction());
        this.endBtn.addEventListener('click', () => this.endContraction());
        this.notesTextarea.addEventListener('input', () => this.saveNotes());
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
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            
            item.innerHTML = `
                <span>${this.formatTime(startTime)}</span>
                <span>${duration}</span>
                <span>${interval}</span>
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
        e.returnValue = 'You have an active contraction timer. Are you sure you want to leave?';
        return e.returnValue;
    }
});