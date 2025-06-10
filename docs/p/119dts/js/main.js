// 119DTS Dashboard Main JavaScript
class EmergencyDashboard {
    constructor() {
        this.cases = [];
        this.autoRefreshInterval = null;
        this.isAutoRefresh = false;
        this.selectedCase = null;
        
        this.init();
    }
    
    init() {
        this.initEventListeners();
        this.loadData();
    }
    
    
    
    initEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
        
        // Auto refresh toggle
        document.getElementById('autoRefreshBtn').addEventListener('click', () => {
            this.toggleAutoRefresh();
        });
        
        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterCases(e.target.value);
        });
    }
    
    toggleAutoRefresh() {
        const btn = document.getElementById('autoRefreshBtn');
        const icon = btn.querySelector('i');
        
        if (this.isAutoRefresh) {
            // Stop auto refresh
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            this.isAutoRefresh = false;
            btn.innerHTML = '<i class="fas fa-play"></i> 自動更新';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline-secondary');
        } else {
            // Start auto refresh
            this.autoRefreshInterval = setInterval(() => {
                this.loadData();
            }, 30000); // 30 seconds
            this.isAutoRefresh = true;
            btn.innerHTML = '<i class="fas fa-stop"></i> 停止更新';
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-success');
        }
    }
    
    async loadData() {
        try {
            const response = await fetch('https://kiang.github.io/119dts.tncfd.gov.tw/list.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.processCaseData(data);
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('載入資料時發生錯誤，請稍後再試');
        }
    }
    
    
    
    
    processCaseData(rawData) {
        // Transform API data to internal format
        this.cases = rawData.map(item => ({
            serial_number: item.id,
            case_number: item.id,
            timestamp: this.parseDateTime(item.datetime),
            case_type: item.case_type,
            location: item.location,
            dispatched_unit: item.unit,
            status: item.status,
            datetime_display: item.datetime
        }));
        
        this.updateStatistics();
        this.updateLatestCases();
        this.updateCasesTable();
        this.updateLastUpdateTime();
    }
    
    updateStatistics() {
        const total = this.cases.length;
        const active = this.cases.filter(c => ['已派遣', '已到達', '送醫中', '出動', '出動中'].includes(c.status)).length;
        const completed = this.cases.filter(c => ['已返隊', '已完成'].includes(c.status)).length;
        
        document.getElementById('totalCases').textContent = total;
        document.getElementById('activeCases').textContent = active;
        document.getElementById('completedCases').textContent = completed;
    }
    
    
    updateLatestCases() {
        const container = document.getElementById('latestCases');
        const latest = this.cases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
        
        if (latest.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">目前沒有案件資料</p>';
            return;
        }
        
        container.innerHTML = latest.map(caseData => `
            <div class="case-card card mb-3 status-${this.getStatusClass(caseData.status)}${this.isFireCase(caseData.case_type) ? ' fire-case' : ''}" 
                 data-case-id="${caseData.case_number}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">#${caseData.case_number}</h6>
                            <p class="card-text mb-1${this.isFireCase(caseData.case_type) ? ' fire-indicator' : ''}">${this.isFireCase(caseData.case_type) ? '🔥 ' : ''}${caseData.case_type}</p>
                            <p class="card-text small mb-1">${caseData.location}</p>
                            <small class="text-muted">${caseData.datetime_display}</small>
                        </div>
                        <span class="badge ${this.getStatusBadgeClass(caseData.status)} status-badge">
                            ${caseData.status}
                        </span>
                    </div>
                    <div class="text-end">
                        <small class="text-muted">派遣: ${caseData.dispatched_unit}</small>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.case-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const caseId = e.currentTarget.dataset.caseId;
                const caseData = this.cases.find(c => c.case_number === caseId);
                if (caseData) {
                    this.showCaseDetail(caseData);
                }
            });
        });
    }
    
    updateCasesTable() {
        const tbody = document.querySelector('#casesTable tbody');
        
        if (this.cases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">目前沒有案件資料</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.cases
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(caseData => `
                <tr${this.isFireCase(caseData.case_type) ? ' class="fire-row"' : ''}>
                    <td>#${caseData.case_number}</td>
                    <td>${caseData.datetime_display}</td>
                    <td${this.isFireCase(caseData.case_type) ? ' class="fire-indicator"' : ''}>${this.isFireCase(caseData.case_type) ? '🔥 ' : ''}${caseData.case_type}</td>
                    <td>${caseData.location}</td>
                    <td>${caseData.dispatched_unit}</td>
                    <td>
                        <span class="badge ${this.getStatusBadgeClass(caseData.status)}">
                            ${caseData.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="dashboard.showCaseDetail(${JSON.stringify(caseData).replace(/"/g, '&quot;')})">
                            詳情
                        </button>
                    </td>
                </tr>
            `).join('');
    }
    
    filterCases(status) {
        const rows = document.querySelectorAll('#casesTable tbody tr');
        rows.forEach(row => {
            if (!status) {
                row.style.display = '';
            } else {
                const statusCell = row.cells[5];
                if (statusCell && statusCell.textContent.includes(status)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }
    
    async showCaseDetail(caseData) {
        const modal = new bootstrap.Modal(document.getElementById('caseDetailModal'));
        
        // Show loading state
        document.getElementById('caseDetailContent').innerHTML = `
            <div class="loading-spinner">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">載入中...</span>
                </div>
            </div>
        `;
        
        modal.show();
        
        try {
            // Parse year and month from datetime
            const [datePart] = caseData.datetime_display.split(' ');
            const [year, month] = datePart.split('/');
            
            // Fetch detailed case data
            const detailUrl = `https://kiang.github.io/119dts.tncfd.gov.tw/${year}/${month}/${caseData.case_number}.json`;
            const response = await fetch(detailUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const detailData = await response.json();
            this.displayCaseDetail(caseData, detailData);
            
        } catch (error) {
            console.error('Error loading case details:', error);
            document.getElementById('caseDetailContent').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    無法載入詳細資料，顯示基本資訊
                </div>
                ${this.getBasicCaseInfo(caseData)}
            `;
        }
    }
    
    displayCaseDetail(caseData, detailData) {
        const hasHistory = detailData.history && detailData.history.length > 0;
        
        document.getElementById('caseDetailContent').innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6><i class="fas fa-info-circle"></i> 基本資訊</h6>
                    <table class="table table-borderless table-sm">
                        <tr><td><strong>案件編號:</strong></td><td>#${caseData.case_number}</td></tr>
                        <tr><td><strong>受理時間:</strong></td><td>${caseData.datetime_display}</td></tr>
                        <tr><td><strong>案件類型:</strong></td><td><span class="badge ${this.isFireCase(caseData.case_type) ? 'bg-danger' : 'bg-primary'}">${this.isFireCase(caseData.case_type) ? '🔥 ' : ''}${caseData.case_type}</span></td></tr>
                        <tr><td><strong>發生地點:</strong></td><td>${caseData.location}</td></tr>
                        <tr><td><strong>派遣分隊:</strong></td><td><span class="badge bg-info">${caseData.dispatched_unit}</span></td></tr>
                        <tr><td><strong>目前狀態:</strong></td><td>
                            <span class="badge ${this.getStatusBadgeClass(caseData.status)}">${caseData.status}</span>
                        </td></tr>
                    </table>
                    
                    ${detailData.location ? `
                        <h6 class="mt-3"><i class="fas fa-map-marker-alt"></i> 詳細位置</h6>
                        <p class="small text-muted">${detailData.location}</p>
                    ` : ''}
                </div>
                <div class="col-md-6">
                    <h6><i class="fas fa-clock"></i> 處理時程</h6>
                    ${hasHistory ? `
                        <div class="timeline">
                            ${detailData.history.map((item, index) => `
                                <div class="timeline-item ${index === detailData.history.length - 1 ? 'active' : ''}">
                                    <div class="d-flex justify-content-between">
                                        <strong>${item.status}</strong>
                                        <small class="text-muted">${item.updated}</small>
                                    </div>
                                    ${item.location ? `<p class="mb-0 small text-muted">${item.location}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="timeline">
                            <div class="timeline-item active">
                                <div class="d-flex justify-content-between">
                                    <strong>案件受理</strong>
                                    <small class="text-muted">${caseData.datetime_display}</small>
                                </div>
                                <p class="mb-0 small text-muted">案件目前狀態: ${caseData.status}</p>
                            </div>
                        </div>
                    `}
                    
                    <div class="mt-3">
                        <small class="text-muted">
                            <i class="fas fa-info-circle"></i>
                            資料來源: 台南市消防局119勤務中心
                        </small>
                    </div>
                </div>
            </div>
        `;
    }
    
    getBasicCaseInfo(caseData) {
        return `
            <div class="row">
                <div class="col-12">
                    <h6><i class="fas fa-info-circle"></i> 基本資訊</h6>
                    <table class="table table-borderless table-sm">
                        <tr><td><strong>案件編號:</strong></td><td>#${caseData.case_number}</td></tr>
                        <tr><td><strong>受理時間:</strong></td><td>${caseData.datetime_display}</td></tr>
                        <tr><td><strong>案件類型:</strong></td><td><span class="badge ${this.isFireCase(caseData.case_type) ? 'bg-danger' : 'bg-primary'}">${this.isFireCase(caseData.case_type) ? '🔥 ' : ''}${caseData.case_type}</span></td></tr>
                        <tr><td><strong>發生地點:</strong></td><td>${caseData.location}</td></tr>
                        <tr><td><strong>派遣分隊:</strong></td><td><span class="badge bg-info">${caseData.dispatched_unit}</span></td></tr>
                        <tr><td><strong>目前狀態:</strong></td><td>
                            <span class="badge ${this.getStatusBadgeClass(caseData.status)}">${caseData.status}</span>
                        </td></tr>
                    </table>
                </div>
            </div>
        `;
    }
    
    parseDateTime(dateTimeStr) {
        // Convert "YYYY/MM/DD HH:MM:SS" to ISO string
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        return new Date(year, month - 1, day, hour, minute, second).toISOString();
    }
    
    isFireCase(caseType) {
        return caseType === '火災';
    }
    
    getStatusClass(status) {
        const statusMap = {
            '已派遣': 'dispatched',
            '已到達': 'arrived',
            '送醫中': 'transport',
            '已完成': 'completed',
            '已返隊': 'completed',
            '出動': 'dispatched',
            '出動中': 'dispatched'
        };
        return statusMap[status] || 'unknown';
    }
    
    getStatusBadgeClass(status) {
        const badgeMap = {
            '已派遣': 'bg-warning text-dark',
            '已到達': 'bg-success',
            '送醫中': 'bg-info',
            '已完成': 'bg-secondary',
            '已返隊': 'bg-secondary',
            '出動': 'bg-warning text-dark',
            '出動中': 'bg-warning text-dark'
        };
        return badgeMap[status] || 'bg-danger';
    }
    
    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = this.formatDateTime(now);
    }
    
    showError(message) {
        const container = document.getElementById('latestCases');
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new EmergencyDashboard();
});

// Make dashboard available globally for button clicks
window.dashboard = dashboard;