document.addEventListener('DOMContentLoaded', function() {
    const jsonUrl = 'json/genary.json';

    fetch(jsonUrl)
        .then(response => response.json())
        .then(data => {
            updatePage(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.body.innerHTML = '<h1>Error loading data. Please try again later.</h1>';
        });
});

function updatePage(data) {
    // Update time
    const updateTime = data[''];
    document.getElementById('updateTime').textContent = `更新時間 - ${updateTime}`;

    // Process and display power sources
    const powerSources = processPowerSources(data.aaData);
    displayPowerSources(powerSources);

    // Display total power
    const totalPower = calculateTotalPower(powerSources);
    document.getElementById('totalPower').textContent = `總計： ${totalPower.toFixed(1)} MW`;

    // Display table data
    displayTableData(data.aaData);

    // Display notes
    displayNotes();
}

function processPowerSources(aaData) {
    const powerSources = {};
    aaData.forEach(row => {
        const fuelType = row[0];
        const name = row[2];
        // Skip subtotal rows
        if (name.includes('小計')) return;

        const capacity = parseFloat(row[3].split('(')[0]) || 0;
        const output = parseFloat(row[4].split('(')[0]) || 0;
        
        if (!powerSources[fuelType]) {
            powerSources[fuelType] = { capacity: 0, output: 0 };
        }
        // Only add positive values
        if (capacity > 0) powerSources[fuelType].capacity += capacity;
        if (output > 0) powerSources[fuelType].output += output;
    });
    return powerSources;
}

function groupPowerSources(powerSources) {
    const groups = {
        '核能': 0,
        '火力發電': 0,
        '再生能源': 0
    };

    for (const [name, data] of Object.entries(powerSources)) {
        if (name.includes('核能')) {
            groups['核能'] += data.output;
        } else if (['燃煤', '汽電共生', '民營電廠-燃煤', '燃氣', '民營電廠-燃氣', '燃油', '輕油'].some(fuel => name.includes(fuel))) {
            groups['火力發電'] += data.output;
        } else {
            groups['再生能源'] += data.output;
        }
    }

    return groups;
}

function displayPowerSources(powerSources) {
    const powerSourcesContainer = document.getElementById('powerSources');
    powerSourcesContainer.innerHTML = '';
    
    const labels = [];
    const data = [];
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];

    // Create the charts container
    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'row mb-4';
    chartsContainer.innerHTML = `
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <canvas id="powerSourcesBarChart"></canvas>
                </div>
            </div>
        </div>
        <div class="col-md-6 mb-4">
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <canvas id="powerSourcesPieChart"></canvas>
                </div>
            </div>
        </div>
    `;
    powerSourcesContainer.parentNode.insertBefore(chartsContainer, powerSourcesContainer);

    // Create smaller cards for power sources
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2 mb-4';

    Object.entries(powerSources).forEach(([name, sourceData], index) => {
        const col = document.createElement('div');
        col.className = 'col';
        const card = document.createElement('div');
        card.className = 'card h-100 shadow-sm';
        card.style.borderLeft = `4px solid ${backgroundColors[index % backgroundColors.length]}`;
        
        // Create a temporary element to strip HTML tags
        const tempElement = document.createElement('div');
        tempElement.innerHTML = name;
        const cleanName = tempElement.textContent || tempElement.innerText;
        
        card.innerHTML = `
            <div class="card-body p-2">
                <h6 class="card-title mb-1">${cleanName}</h6>
                <p class="card-text mb-0">
                    <strong>${sourceData.output.toFixed(1)}</strong> MW
                    <br>
                    <small class="text-muted">容量: ${sourceData.capacity.toFixed(1)} MW</small>
                </p>
            </div>
        `;
        col.appendChild(card);
        cardsContainer.appendChild(col);

        // Prepare data for the chart
        labels.push(cleanName);
        data.push(sourceData.output);
    });

    powerSourcesContainer.appendChild(cardsContainer);

    // Create the bar chart
    const barCtx = document.getElementById('powerSourcesBarChart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '發電量 (MW)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',  // This makes the chart horizontal
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '發電量 (MW)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '能源類型'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '各能源別即時發電量'
                }
            }
        }
    });

    // Create the pie chart
    const groupedData = groupPowerSources(powerSources);
    const pieCtx = document.getElementById('powerSourcesPieChart').getContext('2d');
    const totalOutput = Object.values(groupedData).reduce((sum, value) => sum + value, 0);
    
    new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(groupedData),
            datasets: [{
                data: Object.values(groupedData),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: '發電來源分布'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = ((value / totalOutput) * 100).toFixed(1);
                            return `${label}: ${value.toFixed(1)} MW (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: (value, ctx) => {
                        const dataset = ctx.chart.data.datasets[0];
                        const total = dataset.data.reduce((acc, data) => acc + data, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${percentage}%`;
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function calculateTotalPower(powerSources) {
    return Object.values(powerSources).reduce((total, source) => total + Math.max(0, source.output), 0);
}

function displayTableData(aaData) {
    const tableBody = document.querySelector('#powerTable tbody');
    tableBody.innerHTML = '';
    aaData.forEach(row => {
        const tr = document.createElement('tr');
        const isSubtotal = row[2].includes('小計');
        
        if (isSubtotal) {
            tr.classList.add('subtotal-row');
        }

        tr.innerHTML = `
            <td>${row[0]}</td>
            <td>${row[1]}</td>
            <td>${row[2]}</td>
            <td>${row[3]}</td>
            <td>${row[4]}</td>
            <td>${row[5]}</td>
            <td>${row[6]}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function displayNotes() {
    const notes = [
        '裝置容量：通常以構成該機組之原動機或發電機之設計容量(名牌所列發定額容量)稱之（取用二者中較小者），如以系統而論，則為該系統所有發電廠裝置容量之和。唯，民營電廠依購售電合約，裝置容量以各機組之簽約容量計。',
        '淨發電量：發電廠發電機所產生之電能，電力系統上屬於公司發電廠之輸出電能。(廠毛發電量 - 廠內用電)',
        '淨發電量/裝置容量比：淨發電量除以裝置容量。',
        // Add more notes as needed
    ];

    const notesContainer = document.getElementById('notes');
    notesContainer.innerHTML = '';
    notes.forEach((note, index) => {
        const p = document.createElement('p');
        p.className = 'note';
        p.textContent = `註${index + 1}： ${note}`;
        notesContainer.appendChild(p);
    });
}
