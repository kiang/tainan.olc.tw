document.addEventListener('DOMContentLoaded', function() {
    const jsonUrl = 'https://kiang.github.io/taipower_data/genary.json';
    let updateTime;
    const dataCache = {};
    let dataOptions = [];

    fetch(jsonUrl)
        .then(response => response.json())
        .then(data => {
            updateTime = data[''];
            updatePage(data);
            fetchAndPopulateSlider();
            initializeDatePicker(); // Call this function after fetching initial data
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.body.innerHTML = '<h1>Error loading data. Please try again later.</h1>';
        });

    let autoUpdateInterval = null;
    const autoUpdateDelay = 1000; // 1 second delay

    function fetchAndPopulateSlider() {
        const [date, time] = updateTime.split(' ');
        const [year, month, day] = date.split('-');
        const Y = year;
        const Ymd = year + month + day;

        fetch(`https://kiang.github.io/taipower_data/genary/${Y}/${Ymd}/list.json`)
            .then(response => response.json())
            .then(data => {
                // Sort the data in ascending order
                dataOptions = data.sort((a, b) => a.localeCompare(b));

                const slider = document.getElementById('timeSlider');
                const autoUpdateButton = document.getElementById('autoUpdateButton');
                
                slider.max = dataOptions.length - 1;
                slider.value = slider.max; // Set to the last (latest) option

                updateSliderValue(slider.max);
                updateSliderLabels();

                slider.addEventListener('input', function() {
                    updateSliderValue(this.value);
                });

                slider.addEventListener('change', function() {
                    loadDataForIndex(this.value);
                });

                autoUpdateButton.addEventListener('click', toggleAutoUpdate);

                // Load the latest data
                loadDataForIndex(slider.max);
            })
            .catch(error => console.error('Error fetching list.json:', error));
    }

    function toggleAutoUpdate() {
        const button = document.getElementById('autoUpdateButton');
        if (autoUpdateInterval) {
            clearInterval(autoUpdateInterval);
            autoUpdateInterval = null;
            button.textContent = '自動更新';
            button.classList.remove('btn-danger');
            button.classList.add('btn-primary');
        } else {
            totalPowerData.length = 0;
            nuclearData.length = 0;
            thermalData.length = 0;
            renewableData.length = 0;
            totalPowerTimes.length = 0;
            autoUpdateInterval = setInterval(autoUpdate, autoUpdateDelay);
            button.textContent = '暫停';
            button.classList.remove('btn-primary');
            button.classList.add('btn-danger');
        }
    }

    function autoUpdate() {
        const slider = document.getElementById('timeSlider');
        let nextValue = parseInt(slider.value) + 3;
        if (nextValue > slider.max) {
            nextValue = 0; // Loop back to the beginning
            // Clear the cached data when looping back
            totalPowerData.length = 0;
            nuclearData.length = 0;
            thermalData.length = 0;
            renewableData.length = 0;
            totalPowerTimes.length = 0;
        }
        slider.value = nextValue;
        updateSliderValue(nextValue);
        loadDataForIndex(nextValue, true); // Add a parameter to indicate it's an auto update
    }

    function updateSliderLabels() {
        const startLabel = document.getElementById('sliderStart');
        const endLabel = document.getElementById('sliderEnd');
        
        if (dataOptions.length > 0) {
            const startTime = formatTime(dataOptions[0]);
            const endTime = formatTime(dataOptions[dataOptions.length - 1]);
            
            startLabel.textContent = startTime;
            endLabel.textContent = endTime;
        }
    }

    function formatTime(filename) {
        const [hour, minute] = filename.split('.')[0].match(/\d{2}/g);
        return `${hour}:${minute}`;
    }

    function updateSliderValue(index) {
        const sliderValue = document.getElementById('sliderValue');
        const formattedTime = formatTime(dataOptions[index]);
        sliderValue.textContent = `${updateTime.split(' ')[0]} ${formattedTime}`;
    }

    function loadDataForIndex(index, isAutoUpdate = false) {
        const selectedHis = dataOptions[index];
        const [date] = updateTime.split(' ');
        const [year, month, day] = date.split('-');
        const Y = year;
        const Ymd = year + month + day;
        const newDataSource = `https://kiang.github.io/taipower_data/genary/${Y}/${Ymd}/${selectedHis}.json`;
        
        if (dataCache[selectedHis]) {
            updatePage(dataCache[selectedHis], isAutoUpdate);
        } else {
            fetch(newDataSource)
                .then(response => response.json())
                .then(data => {
                    dataCache[selectedHis] = data;
                    updatePage(data, isAutoUpdate);
                })
                .catch(error => console.error('Error fetching new data:', error));
        }
    }

    function updatePage(data, isAutoUpdate = false) {
        // Update time
        const updateTime = data[''] || data['updateTime'];
        document.getElementById('updateTime').textContent = `更新時間 - ${updateTime}`;

        // Process and display power sources
        let aaData;
        if (Array.isArray(data)) {
            aaData = data;
        } else if (data.aaData) {
            aaData = data.aaData;
        } else {
            console.error('Unexpected data structure:', data);
            return;
        }

        const powerSources = processPowerSources(aaData);
        displayPowerSources(powerSources);

        // Calculate and cache total power
        const totalPower = calculateTotalPower(powerSources);
        const groupedData = groupPowerSources(powerSources);
        
        if (isAutoUpdate) {
            const slider = document.getElementById('timeSlider');
            totalPowerData.push(totalPower);
            nuclearData.push(groupedData['核能']);
            thermalData.push(groupedData['火力發電']);
            renewableData.push(groupedData['再生能源']);
            totalPowerTimes.push(formatTime(dataOptions[slider.value]));
            
            if (totalPowerData.length > maxDataPoints) {
                totalPowerData.shift();
                nuclearData.shift();
                thermalData.shift();
                renewableData.shift();
                totalPowerTimes.shift();
            }
            updateTotalPowerChart();
        }

        // Display total power
        document.getElementById('totalPower').textContent = `總計： ${totalPower.toFixed(1)} MW`;

        // Display table data
        displayTableData(aaData);

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

            const capacity = row[3] === 'N/A' ? 0 : parseFloat(row[3].split('(')[0]) || 0;
            const output = row[4] === 'N/A' ? 0 : parseFloat(row[4].split('(')[0]) || 0;
            
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

    // Add these variables at the top of your script, outside any function
    let barChart = null;
    let pieChart = null;
    let totalPowerChart = null;
    const totalPowerData = [];
    const maxDataPoints = 144; // 24 hours * 6 (10-minute intervals)
    const totalPowerTimes = [];
    const nuclearData = [];
    const thermalData = [];
    const renewableData = [];

    function displayPowerSources(powerSources) {
        const powerSourcesContainer = document.getElementById('powerSources');
        
        const labels = [];
        const data = [];
        const backgroundColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
        ];

        // Create the charts container if it doesn't exist
        let chartsContainer = document.getElementById('chartsContainer');
        if (!chartsContainer) {
            chartsContainer = document.createElement('div');
            chartsContainer.id = 'chartsContainer';
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
            powerSourcesContainer.appendChild(chartsContainer);
        }

        // Create smaller cards for power sources
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2 mb-4';

        // Function to remove HTML tags
        const stripHtml = (html) => {
            let tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        };

        Object.entries(powerSources).forEach(([name, sourceData], index) => {
            const col = document.createElement('div');
            col.className = 'col';
            const card = document.createElement('div');
            card.className = 'card h-100 shadow-sm';
            card.style.borderLeft = `4px solid ${backgroundColors[index % backgroundColors.length]}`;
            
            const cleanName = stripHtml(name);
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

        // Clear existing content and append new elements
        powerSourcesContainer.innerHTML = '';
        powerSourcesContainer.appendChild(chartsContainer);
        powerSourcesContainer.appendChild(cardsContainer);

        // Update or create the bar chart
        updateBarChart(labels, data, backgroundColors);

        // Update or create the pie chart
        const groupedData = groupPowerSources(powerSources);
        updatePieChart(groupedData, backgroundColors);
    }

    function updateBarChart(labels, data, backgroundColors) {
        const ctx = document.getElementById('powerSourcesBarChart').getContext('2d');
        
        // Function to remove HTML tags
        const stripHtml = (html) => {
            let tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        };

        // Clean labels
        const cleanLabels = labels.map(stripHtml);
        
        if (barChart) {
            barChart.data.labels = cleanLabels;
            barChart.data.datasets[0].data = data;
            barChart.data.datasets[0].backgroundColor = backgroundColors;
            barChart.update();
        } else {
            barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: cleanLabels,
                    datasets: [{
                        label: '發電量 (MW)',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
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
                                display: false
                            },
                            ticks: {
                                crossAlign: 'left',
                                autoSkip: false
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
                    },
                    layout: {
                        padding: {
                            left: 0,
                            right: 0
                        }
                    }
                }
            });
        }
    }

    function updatePieChart(groupedData, backgroundColors) {
        const ctx = document.getElementById('powerSourcesPieChart').getContext('2d');
        const totalOutput = Object.values(groupedData).reduce((sum, value) => sum + value, 0);
        
        const labels = Object.keys(groupedData);
        const data = Object.values(groupedData);
        const colors = labels.map(label => colorMapping[label]);

        if (pieChart) {
            pieChart.data.labels = labels;
            pieChart.data.datasets[0].data = data;
            pieChart.data.datasets[0].backgroundColor = colors;
            pieChart.data.datasets[0].borderColor = colors;
            pieChart.update();
        } else {
            pieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                        },
                        title: {
                            display: true,
                            text: '發電源分布'
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
            '淨發電量高於裝置容量之說明：(1)因核能機組完成提升出力改善計畫，致實際發電能力超出原規劃裝置容量。(2)部分火力機組因機組配件升級、環境溫度較低、機組效能測試等因素之影響，致使淨發電量可能高於裝置容量，惟大多屬短暫性現象，亦不影響台電與民營電廠之全年合約購電量。(3)本公司所購入汽電共生係為餘電收購，有淨發電量貢獻，其中垃圾及沼氣計入裝置容量，其餘不計入本公司系統裝置容量。',
            '澎湖尖山：僅含澎湖本島尖山電廠。金門塔山：含大、小金門所有電廠。馬祖珠山：只含南竿、北竿及珠山等電廠。離島其他：含蘭嶼、綠島、小琉球、連江縣[馬祖]離島（東引、東莒、西莒）及澎湖縣離島(七美、望安、虎井，但不含吉貝、鳥嶼)等電廠。※顯示之發電量為毛發電量。',
            '核能電廠全黑起動氣渦輪機，其淨尖峰能力15.5萬瓩，但其裝置容量不計入台電系統裝置容量，發電量計入燃油(輕油)發電。',
            '北部小水力: 圓山、天埤、軟橋、石圳聯通管。 中部小水力: 后里、社寮、景山、北山、濁水、湖山、南岸二。 南部小水力: 六龜、竹門。 東部小水力: 銅門、龍溪、水簾、清水、清流、初英、榕樹、溪口、東興。',
            '太陽能購電：所顯示之發電量係參考購電取樣發電量分區比例估算得出。購售電件數請參考本公司首頁：資訊揭露->發電資訊->購入電力概況->購入電力分布情形。',
            '淨發電量若標示為N/A，表示無即時資訊。',
            '本網頁資料為每10分鐘更新，請重新整理頁面，可顯示最新資訊。',
            '電廠(機組)換發/取得電業執照前進行測試(試運轉)等程序時，該電廠(機組)暫不計入裝置容量且不揭露其發電百分比。',
            '備註欄補充說明：點擊見詳細說明',
            '依高雄市環保局108.09.20核發之操作許可證，興達電廠2部燃煤機組於秋冬空品不良季節（10月至翌年3月）停機，另2部機組平均生煤用量削減至65%；如因用電需求指令機組升載超過65%時，將另於適當時機調度降載，以維持2部機平均負載65%為原則，並定期追蹤管控，以符合生煤減量之環保責任。',
            '裝置容量20MW以上且併接電壓等級69仟伏以上之機組單獨呈現，其餘則整併一筆資料。',
            '大林#5機111年12月31日除役並轉為緊急備用電力設施。',
            '興達#1機112年9月30日除役並轉為緊急備用電力設施;興達#2機112年12月31日除役並轉為緊急備用電力設施。',
            '電池係指「能量型電池儲能」，且裝置容量係指電力交易平台「電能移轉複合動態調節備轉」該小時得標容量。'
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

    function updateTotalPowerChart() {
        const ctx = document.getElementById('totalPowerChart').getContext('2d');
        
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '時間'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '發電量 (MW)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '總發電量變化'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
                legend: {
                    position: 'top',
                }
            },
            animation: {
                duration: 0
            }
        };

        const datasets = [
            {
                label: '總發電量 (MW)',
                data: totalPowerData,
                borderColor: colorMapping['總發電量'],
                tension: 0.1,
                fill: false
            },
            {
                label: '核能 (MW)',
                data: nuclearData,
                borderColor: colorMapping['核能'],
                tension: 0.1,
                fill: false
            },
            {
                label: '火力發電 (MW)',
                data: thermalData,
                borderColor: colorMapping['火力發電'],
                tension: 0.1,
                fill: false
            },
            {
                label: '再生能源 (MW)',
                data: renewableData,
                borderColor: colorMapping['再生能源'],
                tension: 0.1,
                fill: false
            }
        ];

        if (totalPowerChart) {
            totalPowerChart.data.labels = totalPowerTimes;
            totalPowerChart.data.datasets = datasets;
            totalPowerChart.update();
        } else {
            totalPowerChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: totalPowerTimes,
                    datasets: datasets
                },
                options: chartOptions
            });
        }
    }

    const colorMapping = {
        '核能': 'rgb(255, 99, 132)',
        '火力發電': 'rgb(255, 205, 86)',
        '再生能源': 'rgb(54, 162, 235)',
        '總發電量': 'rgb(75, 192, 192)'
    };

    function initializeDatePicker() {
        const datePicker = document.getElementById('datePicker');

        // Set the initial date to the current updateTime
        const [currentDate] = updateTime.split(' ');
        datePicker.value = currentDate;

        datePicker.addEventListener('change', function() {
            const selectedDate = this.value;
            fetchDataForDate(selectedDate);
        });
    }

    function fetchDataForDate(date) {
        const [year, month, day] = date.split('-');
        const Ymd = year + month + day;
        const jsonUrl = `https://kiang.github.io/taipower_data/genary/${year}/${Ymd}/list.json`;

        fetch(jsonUrl)
            .then(response => response.json())
            .then(data => {
                updateTime = `${date} 00:00`; // Set updateTime to the start of the selected date
                dataOptions = data.sort((a, b) => a.localeCompare(b));
                fetchAndPopulateSlider();
            })
            .catch(error => {
                console.error('Error fetching data for selected date:', error);
                alert('無法取得所選日期的資料。請選擇其他日期。');
            });
    }

});
