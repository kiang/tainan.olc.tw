document.addEventListener('DOMContentLoaded', function() {
    const jsonUrl = 'https://kiang.github.io/taipower_data/genary.json';
    const emergencyApiBase = 'https://kiang.github.io/taipower_data/emergency';
    let updateTime;
    const dataCache = {};
    const pumpDataCache = {};
    let dataOptions = [];
    let currentPumpData = null;
    let yesterdayPumpData = null;
    let isCalculatingRemainingTime = false;
    
    // Emergency data variables
    let emergencyTimelineChart = null;
    let currentEmergencyData = null;
    let emergencyDatesCache = new Set(); // Cache for emergency dates
    let emergencyMonthsData = null; // Cache for monthly index
    let loadedMonths = new Set(); // Track which months have been loaded

    fetch(jsonUrl)
        .then(response => {
            return response.json();
        })
        .then(data => {
            updateTime = data[''];
            updatePage(data);
            fetchAndPopulateSlider();
            // Load emergency dates first, then check for emergency generators
            loadEmergencyDates().then(() => {
                checkEmergencyGenerators(); // Check for emergency generators after dates are loaded
            });
            initializeDatePicker();
            
            // Load pump data for initial view
            const [date] = updateTime.split(' ');
            const [year, month, day] = date.split('-');
            const Y = year;
            const Ymd = year + month + day;
            loadPumpData(Y, Ymd, 'latest');
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            document.body.innerHTML = '<h1>Error loading data. Please try again later.</h1>';
        });

    let autoUpdateInterval = null;
    const autoUpdateDelay = 1000; // 1 second delay
    let sliderInitialized = false; // prevent duplicate listeners on date change

    function fetchAndPopulateSlider(preloadedList = null) {
        const [date, time] = updateTime.split(' ');
        const [year, month, day] = date.split('-');
        const Y = year;
        const Ymd = year + month + day;

        const handleList = (list) => {
            // Sort the data in ascending order
            dataOptions = list.sort((a, b) => a.localeCompare(b));

            const slider = document.getElementById('timeSlider');
            const autoUpdateButton = document.getElementById('autoUpdateButton');
            
            slider.max = dataOptions.length - 1;
            slider.value = slider.max; // Set to the last (latest) option

            updateSliderValue(slider.max);
            updateSliderLabels();

            if (!sliderInitialized) {
                slider.addEventListener('input', function() {
                    updateSliderValue(this.value);
                });

                slider.addEventListener('change', function() {
                    loadDataForIndex(this.value);
                    checkEmergencyGenerators(); // Check emergency data when time changes
                });

                autoUpdateButton.addEventListener('click', toggleAutoUpdate);
                sliderInitialized = true;
            }

            // Load the latest data
            loadDataForIndex(slider.max);
        };

        if (Array.isArray(preloadedList)) {
            handleList(preloadedList);
        } else {
            fetch(`https://kiang.github.io/taipower_data/genary/${Y}/${Ymd}/list.json`)
                .then(response => response.json())
                .then(list => handleList(list))
                .catch(error => console.error('Error fetching list.json:', error));
        }
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
            coalData.length = 0;
            gasData.length = 0;
            otherThermalData.length = 0;
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
            coalData.length = 0;
            gasData.length = 0;
            otherThermalData.length = 0;
            renewableData.length = 0;
            totalPowerTimes.length = 0;
        }
        slider.value = nextValue;
        updateSliderValue(nextValue);
        loadDataForIndex(nextValue, true); // Add a parameter to indicate it's an auto update
        checkEmergencyGenerators(); // Check emergency data during auto-update
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
        // Include the date in the cache key to avoid collisions across days
        const cacheKey = `${Ymd}_${selectedHis}`;
        
        if (dataCache[cacheKey]) {
            updatePage(dataCache[cacheKey], isAutoUpdate);
            loadPumpData(Y, Ymd, selectedHis);
        } else {
            fetch(newDataSource)
                .then(response => response.json())
                .then(data => {
                    dataCache[cacheKey] = data;
                    updatePage(data, isAutoUpdate);
                    loadPumpData(Y, Ymd, selectedHis);
                })
                .catch(error => console.error('Error fetching new data:', error));
        }
    }

    function loadPumpData(year, ymd, selectedHis) {
        const todayPumpUrl = `https://kiang.github.io/taipower_data/genary/${year}/${ymd}/pump.json`;
        
        // Calculate yesterday's date
        const currentDate = new Date(ymd.slice(0,4), ymd.slice(4,6)-1, ymd.slice(6,8));
        const yesterday = new Date(currentDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayY = yesterday.getFullYear();
        const yesterdayM = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yesterdayD = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayYmd = `${yesterdayY}${yesterdayM}${yesterdayD}`;
        const yesterdayPumpUrl = `https://kiang.github.io/taipower_data/genary/${yesterdayY}/${yesterdayYmd}/pump.json`;
        
        const pumpCacheKey = `${ymd}_pump`;
        const yesterdayPumpCacheKey = `${yesterdayYmd}_pump`;
        
        // Load today's pump data
        if (pumpDataCache[pumpCacheKey]) {
            currentPumpData = pumpDataCache[pumpCacheKey];
            loadYesterdayPumpData(yesterdayPumpUrl, yesterdayPumpCacheKey);
        } else {
            fetch(todayPumpUrl)
                .then(response => response.json())
                .then(data => {
                    pumpDataCache[pumpCacheKey] = data;
                    currentPumpData = data;
                    loadYesterdayPumpData(yesterdayPumpUrl, yesterdayPumpCacheKey);
                })
                .catch(error => {
                    console.warn('Error fetching today pump data:', error);
                    currentPumpData = null;
                    loadYesterdayPumpData(yesterdayPumpUrl, yesterdayPumpCacheKey);
                });
        }
    }

    function loadYesterdayPumpData(yesterdayPumpUrl, yesterdayPumpCacheKey) {
        if (pumpDataCache[yesterdayPumpCacheKey]) {
            yesterdayPumpData = pumpDataCache[yesterdayPumpCacheKey];
            calculateRemainingTime();
        } else {
            fetch(yesterdayPumpUrl)
                .then(response => response.json())
                .then(data => {
                    pumpDataCache[yesterdayPumpCacheKey] = data;
                    yesterdayPumpData = data;
                    calculateRemainingTime();
                })
                .catch(error => {
                    console.warn('Error fetching yesterday pump data:', error);
                    yesterdayPumpData = null;
                    calculateRemainingTime();
                });
        }
    }

    function calculateRemainingTime() {
        
        // Prevent infinite loop
        if (isCalculatingRemainingTime) {
            return;
        }
        
        if (!currentPumpData || !yesterdayPumpData) {
            return;
        }
        
        isCalculatingRemainingTime = true;
        
        // Group pump data by unit prefix (before # character)
        const groupedToday = groupPumpDataByPrefix(currentPumpData);
        const groupedYesterday = groupPumpDataByPrefix(yesterdayPumpData);
        
        // Add a small delay to ensure the table has been rendered
        setTimeout(() => {
            
            // Debug: log available pump data groups
            console.log('Available pump data groups:', {
                today: Object.keys(groupedToday),
                yesterday: Object.keys(groupedYesterday)
            });
            
            // Remove existing summary rows first
            const existingSummaryRows = document.querySelectorAll('#powerTable tbody tr.storage-summary');
            existingSummaryRows.forEach(row => row.remove());
            
            // Find Energy Storage System and Energy Storage Load units in the main table
            const tableRows = document.querySelectorAll('#powerTable tbody tr');
            const processedGroups = new Set();
            const groupsToInsert = [];
            
            for (let i = 0; i < tableRows.length; i++) {
                const row = tableRows[i];
                const fuelTypeCell = row.cells[0]; // 燃料別
                const unitNameCell = row.cells[2]; // 機組名稱
                
                if (!fuelTypeCell || !unitNameCell) {
                    continue;
                }
                
                const fuelType = fuelTypeCell.textContent || fuelTypeCell.innerText;
                const unitName = unitNameCell.textContent || unitNameCell.innerText;
                
                // Check if this is a storage unit and find corresponding pump.json data
                if (fuelType.includes('儲能') || fuelType.includes('EnergyStorage')) {
                    // Debug: log all storage units we find
                    console.log(`Found storage unit: "${fuelType}" - "${unitName}"`);
                    if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
                        console.log('  -> This is Energy Storage Load');
                    }
                    
                    // Get the group key (prefix before #)
                    const cleanUnitName = unitName.trim();
                    const groupKey = cleanUnitName.includes('#') ? 
                        cleanUnitName.split('#')[0] : cleanUnitName;
                    
                    // Process each group + fuel type combination only once
                    const groupFuelKey = `${groupKey}_${fuelType.includes('儲能負載') ? 'load' : 'storage'}`;
                    if (!processedGroups.has(groupFuelKey)) {
                        if (groupedToday[groupKey] && groupedYesterday[groupKey]) {
                            processedGroups.add(groupFuelKey);
                            
                            const todayData = groupedToday[groupKey];
                            const yesterdayData = groupedYesterday[groupKey];
                            
                            // Debug logging for Energy Storage Load
                            if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
                                console.log(`Processing Energy Storage Load group: ${groupKey}`, {
                                    fuelType,
                                    todayData,
                                    yesterdayData,
                                    hasLoadSum: todayData.energy_storage_load_sum !== undefined
                                });
                            }
                            
                            // Check if we have relevant data for this type of storage
                            let hasData = false;
                            if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
                                // For Energy Storage Load, check if we have load_sum data (can be 0 or greater)
                                hasData = (todayData.energy_storage_load_sum !== undefined && yesterdayData.energy_storage_load_sum !== undefined);
                                console.log(`Energy Storage Load data check for ${groupKey}:`, {
                                    hasData,
                                    todaySum: todayData.energy_storage_load_sum,
                                    yesterdaySum: yesterdayData.energy_storage_load_sum
                                });
                            } else {
                                // For Energy Storage System, check if we have storage_sum data (should be > 0)
                                hasData = (todayData.energy_storage_sum > 0 || yesterdayData.energy_storage_sum > 0);
                            }
                            
                            if (hasData) {
                                // Find the last row of this group
                                const lastRowIndex = findLastRowOfGroup(groupKey, i);
                                
                                // Store the information for later insertion
                                groupsToInsert.push({
                                    afterIndex: lastRowIndex,
                                    groupKey: groupKey,
                                    fuelType: fuelType,
                                    todayData: todayData,
                                    yesterdayData: yesterdayData
                                });
                            }
                        } else {
                            // Debug: log if data is missing
                            if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
                                console.log(`No pump data for Energy Storage Load group: ${groupKey}`, {
                                    hasToday: !!groupedToday[groupKey],
                                    hasYesterday: !!groupedYesterday[groupKey]
                                });
                            }
                        }
                    }
                }
            }
            
            // Insert summary rows from bottom to top to avoid index shifting issues
            groupsToInsert.sort((a, b) => b.afterIndex - a.afterIndex);
            groupsToInsert.forEach(group => {
                insertGroupSummaryRow(group.afterIndex, group.groupKey, group.fuelType, group.todayData, group.yesterdayData);
            });
            
            // Reset the flag
            isCalculatingRemainingTime = false;
        }, 500);
    }

    function findLastRowOfGroup(groupKey, startIndex) {
        const tableRows = document.querySelectorAll('#powerTable tbody tr');
        let lastIndex = startIndex;
        
        // Start from the current row (not +1) to include single-unit groups
        for (let i = startIndex; i < tableRows.length; i++) {
            const row = tableRows[i];
            const unitNameCell = row.cells[2];
            
            if (unitNameCell) {
                const unitName = unitNameCell.textContent || unitNameCell.innerText;
                const cleanUnitName = unitName.trim();
                const currentGroupKey = cleanUnitName.includes('#') ? 
                    cleanUnitName.split('#')[0] : cleanUnitName;
                
                if (currentGroupKey === groupKey) {
                    lastIndex = i;
                } else if (i > startIndex) {
                    // We've moved past this group
                    break;
                }
            }
        }
        
        return lastIndex;
    }

    function insertGroupSummaryRow(afterIndex, groupKey, fuelType, todayData, yesterdayData) {
        const table = document.querySelector('#powerTable tbody');
        const rows = table.rows;
        
        // Get sum of current output for this group
        const currentOutputSum = getCurrentOutputSumForGroup(groupKey);
        
        let mode = '';
        let yesterdayValue = 0;
        let todayValue = 0;
        let remainingHours = 0;
        
        // Determine mode and values based on fuel type
        if (fuelType.includes('儲能') && !fuelType.includes('負載')) {
            // Energy Storage System - discharge mode
            mode = '放電';
            yesterdayValue = yesterdayData.energy_storage_sum;
            todayValue = todayData.energy_storage_sum;
            
            // Debug logging for Energy Storage System
            console.log(`Energy Storage System calculation for ${groupKey}:`, {
                yesterdayValue,
                todayValue,
                currentOutputSum,
                sumDifference: yesterdayValue - todayValue
            });
            
            // Formula: (sum(yesterday.energy_storage_sum) - sum(today.energy_storage_sum)) / sum(current output) * 10 = remaining minutes
            const sumDifference = yesterdayValue - todayValue;
            if (Math.abs(currentOutputSum) > 0) {  // Use absolute value to handle any non-zero output
                const remainingMinutes = (sumDifference / Math.abs(currentOutputSum)) * 10;
                remainingHours = remainingMinutes / 60;
                console.log(`Calculated remaining time: ${remainingMinutes} minutes = ${remainingHours} hours`);
            } else {
                console.log('No current output for Energy Storage System, setting remaining time to 0');
                remainingHours = 0;
            }
        } else if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
            // Energy Storage Load - charge mode (shows as negative values)
            mode = '充電';
            yesterdayValue = yesterdayData.energy_storage_load_sum;
            todayValue = todayData.energy_storage_load_sum;
            
            // Formula: (sum(yesterday.energy_storage_load_sum) - sum(today.energy_storage_load_sum)) / sum(current output) * 10 = remaining minutes
            const sumDifference = yesterdayValue - todayValue;
            if (Math.abs(currentOutputSum) > 0) {  // Check if there's any current output
                const remainingMinutes = (sumDifference / Math.abs(currentOutputSum)) * 10;
                remainingHours = remainingMinutes / 60;
            } else {
                // If no current output, still show the summary with 0 remaining time
                remainingHours = 0;
            }
        }
        
        // Create summary row
        const summaryRow = table.insertRow(afterIndex + 1);
        summaryRow.className = 'storage-summary';
        summaryRow.style.backgroundColor = '#f8f9fa';
        summaryRow.style.borderTop = '2px solid #dee2e6';
        summaryRow.style.fontStyle = 'italic';
        
        // Create cells
        const cell1 = summaryRow.insertCell(0); // 燃料別
        const cell2 = summaryRow.insertCell(1); // 機組狀態
        const cell3 = summaryRow.insertCell(2); // 機組名稱
        const cell4 = summaryRow.insertCell(3); // 機組輸出 (will span 4 columns)
        
        // Fill summary information
        cell1.textContent = '';
        cell2.textContent = '';
        cell3.textContent = `${groupKey} 統計`;
        cell3.style.fontWeight = 'bold';
        
        // Set colspan for cell4 to cover columns 4, 5, 6, 7 (機組輸出, 機組容量, 占比, 備註)
        cell4.colSpan = 4;
        
        // Use absolute values for display
        const yesterdayDisplay = Math.abs(yesterdayValue).toFixed(1);
        const todayDisplay = Math.abs(todayValue).toFixed(1);
        
        if (mode === '充電') {
            // For Energy Storage Load, show only consumption text
            cell4.innerHTML = `昨天充電消耗 ${yesterdayDisplay} MW, 今日充電消耗 ${todayDisplay} MW`;
        } else {
            // For Energy Storage System, show full text with remaining time
            const formattedTime = formatRemainingTime(remainingHours);
            cell4.innerHTML = `昨天${mode} ${yesterdayDisplay} MW, 今日已${mode} ${todayDisplay} MW, 估計剩餘 ${formattedTime}`;
        }
        
        cell4.style.color = mode === '充電' ? '#28a745' : '#dc3545';
        cell4.style.fontWeight = 'bold';
    }

    function groupPumpDataByPrefix(pumpData) {
        const grouped = {};
        
        for (const [unitName, data] of Object.entries(pumpData)) {
            // Split by # and use first part as group key
            const groupKey = unitName.includes('#') ? unitName.split('#')[0] : unitName;
            
            if (!grouped[groupKey]) {
                grouped[groupKey] = {
                    energy_storage_sum: 0,
                    energy_storage_count: 0,
                    energy_storage_load_sum: 0,
                    energy_storage_load_count: 0
                };
            }
            
            // Sum all relevant fields for each group
            if (data.energy_storage_sum !== undefined) {
                grouped[groupKey].energy_storage_sum += data.energy_storage_sum;
            }
            if (data.energy_storage_count !== undefined) {
                grouped[groupKey].energy_storage_count += data.energy_storage_count;
            }
            if (data.energy_storage_load_sum !== undefined) {
                grouped[groupKey].energy_storage_load_sum += data.energy_storage_load_sum;
            }
            if (data.energy_storage_load_count !== undefined) {
                grouped[groupKey].energy_storage_load_count += data.energy_storage_load_count;
            }
        }
        
        return grouped;
    }

    function getCurrentOutput(unitName, row) {
        // Get current output from the table row (column 4: 機組輸出)
        const outputCell = row.cells[3];
        if (outputCell) {
            const outputText = outputCell.textContent || outputCell.innerText;
            const outputValue = parseFloat(outputText.replace(/[^\d.-]/g, ''));
            return isNaN(outputValue) ? 0 : outputValue; // Keep the sign for negative values
        }
        return 0;
    }

    function getCurrentOutputSumForGroup(groupKey) {
        // Sum current output for all units in the same group
        const tableRows = document.querySelectorAll('#powerTable tbody tr');
        let outputSum = 0;
        let isEnergyStorageLoad = false;
        
        tableRows.forEach(row => {
            const unitNameCell = row.cells[2]; // 機組名稱
            const fuelTypeCell = row.cells[0]; // 燃料別
            if (unitNameCell && fuelTypeCell) {
                const unitName = unitNameCell.textContent || unitNameCell.innerText;
                const fuelType = fuelTypeCell.textContent || fuelTypeCell.innerText;
                const cleanUnitName = unitName.trim();
                const unitGroupKey = cleanUnitName.includes('#') ? 
                    cleanUnitName.split('#')[0] : cleanUnitName;
                
                if (unitGroupKey === groupKey) {
                    const currentOutput = getCurrentOutput(cleanUnitName, row);
                    
                    // Check if this is Energy Storage Load
                    if (fuelType.includes('儲能負載') || fuelType.includes('EnergyStorageLoad')) {
                        isEnergyStorageLoad = true;
                        // For Energy Storage Load (negative values), use absolute value for sum
                        outputSum += Math.abs(currentOutput);
                    } else {
                        outputSum += currentOutput;
                    }
                }
            }
        });
        
        // Return negative sum for Energy Storage Load to match the table display
        return isEnergyStorageLoad ? -outputSum : outputSum;
    }


    function calculateDischargeTime(unitName, currentOutput) {
        const estimatedCapacityMWh = getEstimatedCapacity(unitName);
        if (!estimatedCapacityMWh || currentOutput <= 0) return null;
        
        // Individual unit type determination
        let assumedCurrentLevel;
        if (unitName === '大觀二#1' || unitName === '大觀二#2' || 
            unitName === '大觀二#3' || unitName === '大觀二#4' ||
            unitName === '明潭#1' || unitName === '明潭#2' || 
            unitName === '明潭#3' || unitName === '明潭#4' || 
            unitName === '明潭#5' || unitName === '明潭#6') {
            // Pumped storage: assume 80% efficient cycle, start at ~70% capacity
            assumedCurrentLevel = 0.7;
        } else if (unitName === '電池(註16)') {
            // Battery: assume 90% efficient cycle, start at ~80% capacity
            assumedCurrentLevel = 0.8;
        } else {
            // Default for unknown units
            assumedCurrentLevel = 0.6;
        }
        
        const availableCapacity = estimatedCapacityMWh * assumedCurrentLevel;
        const remainingHours = availableCapacity / currentOutput;
        return Math.max(0, Math.min(remainingHours, 24)); // Cap at 24 hours for safety
    }

    function calculateChargeTime(unitName, chargingPower) {
        const estimatedCapacityMWh = getEstimatedCapacity(unitName);
        if (!estimatedCapacityMWh || chargingPower <= 0) return null;
        
        // Individual unit type determination
        let currentLevel;
        const targetLevel = 0.95;
        
        if (unitName === '大觀二#1' || unitName === '大觀二#2' || 
            unitName === '大觀二#3' || unitName === '大觀二#4' ||
            unitName === '明潭#1' || unitName === '明潭#2' || 
            unitName === '明潭#3' || unitName === '明潭#4' || 
            unitName === '明潭#5' || unitName === '明潭#6') {
            // Pumped storage: assume currently at ~30% capacity, charge to 95%
            currentLevel = 0.3;
        } else if (unitName === '電池(註16)') {
            // Battery: assume currently at ~20% capacity, charge to 95%
            currentLevel = 0.2;
        } else {
            // Default for unknown units
            currentLevel = 0.3;
        }
        
        const remainingCapacity = estimatedCapacityMWh * (targetLevel - currentLevel);
        const remainingHours = remainingCapacity / chargingPower;
        return Math.max(0, Math.min(remainingHours, 24)); // Cap at 24 hours for safety
    }

    function getEstimatedCapacity(unitName) {
        // Real capacities for pumped-storage and battery systems (in MWh)
        // Based on Taiwan Power Company specifications
        const capacities = {
            // 大觀二 (Daguan No.2) - Each unit: 260 MW, 6 hours = 1560 MWh
            '大觀二#1': 1560,
            '大觀二#2': 1560,
            '大觀二#3': 1560,
            '大觀二#4': 1560,
            
            // 明潭 (Mingtan) - Each unit: 300 MW, 5.5 hours = 1650 MWh
            '明潭#1': 1650,
            '明潭#2': 1650,
            '明潭#3': 1650,
            '明潭#4': 1650,
            '明潭#5': 1650,
            '明潭#6': 1650,
            
            // Battery storage systems - varies by installation
            '電池': 100,  // Default for battery systems
            '儲能': 50,   // General storage systems
        };
        
        // Direct match first
        if (capacities[unitName]) {
            return capacities[unitName];
        }
        
        // Partial match for unit names
        for (const [key, capacity] of Object.entries(capacities)) {
            if (unitName.includes(key)) {
                return capacity;
            }
        }
        
        // Default capacity for unknown units
        return 100;
    }


    function formatRemainingTime(hours) {
        if (hours < 0) {
            const absHours = Math.abs(hours);
            if (absHours < 1) {
                return `比昨天多${Math.round(absHours * 60)}分鐘`;
            } else if (absHours < 24) {
                const h = Math.floor(absHours);
                const m = Math.round((absHours - h) * 60);
                return m > 0 ? `比昨天多${h}小時${m}分鐘` : `比昨天多${h}小時`;
            } else {
                const days = Math.floor(absHours / 24);
                const h = Math.round(absHours % 24);
                return h > 0 ? `比昨天多${days}天${h}小時` : `比昨天多${days}天`;
            }
        } else if (hours < 1) {
            return `${Math.round(hours * 60)}分鐘`;
        } else if (hours < 24) {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            return m > 0 ? `${h}小時${m}分鐘` : `${h}小時`;
        } else {
            const days = Math.floor(hours / 24);
            const h = Math.round(hours % 24);
            return h > 0 ? `${days}天${h}小時` : `${days}天`;
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
            coalData.push(groupedData['燃煤'] || 0);
            gasData.push(groupedData['燃氣'] || 0);
            otherThermalData.push(groupedData['其他火力'] || 0);
            renewableData.push(groupedData['再生能源']);
            totalPowerTimes.push(formatTime(dataOptions[slider.value]));
            
            if (totalPowerData.length > maxDataPoints) {
                totalPowerData.shift();
                nuclearData.shift();
                coalData.shift();
                gasData.shift();
                otherThermalData.shift();
                renewableData.shift();
                totalPowerTimes.shift();
            }
            updateTotalPowerChart();
        }

        // Display total power
        document.getElementById('totalPower').textContent = `總計： ${totalPower.toFixed(1)} MW`;

        // Display table data
        displayTableData(aaData);

        // Calculate remaining time for storage units
        try {
            calculateRemainingTime();
        } catch (error) {
            console.error('Error in calculateRemainingTime:', error);
        }

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
            '燃煤': 0,
            '燃氣': 0,
            '其他火力': 0,
            '再生能源': 0
        };

        for (const [name, data] of Object.entries(powerSources)) {
            if (name.includes('核能')) {
                groups['核能'] += data.output;
            } else if (['燃煤', '汽電共生', '民營電廠-燃煤'].some(fuel => name.includes(fuel))) {
                groups['燃煤'] += data.output;
            } else if (['燃氣', '民營電廠-燃氣'].some(fuel => name.includes(fuel))) {
                groups['燃氣'] += data.output;
            } else if (['燃油', '輕油'].some(fuel => name.includes(fuel))) {
                groups['其他火力'] += data.output;
            } else {
                groups['再生能源'] += data.output;
            }
        }

        return groups;
    }

    function groupPowerSourcesForPie(powerSources) {
        const groups = {
            '核能': 0,
            '火力': 0,
            '再生能源': 0
        };

        for (const [name, data] of Object.entries(powerSources)) {
            if (name.includes('核能')) {
                groups['核能'] += data.output;
            } else if (['燃煤', '汽電共生', '民營電廠-燃煤', '燃氣', '民營電廠-燃氣', '燃油', '輕油'].some(fuel => name.includes(fuel))) {
                groups['火力'] += data.output;
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
    const coalData = [];
    const gasData = [];
    const otherThermalData = [];
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

        // Update or create the bar chart with original grouped data
        const groupedData = groupPowerSources(powerSources);
        updateBarChart(groupedData, backgroundColors);

        // Update or create the pie chart with combined thermal
        const pieGroupedData = groupPowerSourcesForPie(powerSources);
        updatePieChart(pieGroupedData, backgroundColors);
    }

    function updateBarChart(groupedData, backgroundColors) {
        const ctx = document.getElementById('powerSourcesBarChart').getContext('2d');
        
        const labels = Object.keys(groupedData);
        const data = Object.values(groupedData);
        const colors = labels.map(label => colorMapping[label]);
        
        if (barChart) {
            barChart.data.labels = labels;
            barChart.data.datasets[0].data = data;
            barChart.data.datasets[0].backgroundColor = colors;
            barChart.update();
        } else {
            barChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '發電量 (MW)',
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors,
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
                        },
                        datalabels: {
                            anchor: 'center',
                            align: 'center',
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size: 12
                            },
                            formatter: (value, ctx) => {
                                const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return percentage + '%';
                            },
                            display: function(context) {
                                return context.dataset.data[context.dataIndex] > 0;
                            }
                        }
                    },
                    layout: {
                        padding: {
                            left: 0,
                            right: 0
                        }
                    }
                },
                plugins: [ChartDataLabels]
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
        // Define emergency generators list
        const emergencyGenerators = [
            '核二Gas1', '核二Gas2', '核三Gas1', '核三Gas2',
            '台中Gas1&2', '台中Gas3&4', '大林#5',
            '興達#1', '興達#2', '興達#3', '興達#4'
        ];
        
        const tableBody = document.querySelector('#powerTable tbody');
        tableBody.innerHTML = '';
        aaData.forEach(row => {
            const tr = document.createElement('tr');
            const generatorName = row[2];
            const isSubtotal = generatorName.includes('小計');
            const isEmergencyGenerator = emergencyGenerators.some(eg => generatorName.includes(eg));
            
            // Parse the power output value (淨發電量 is in column index 4)
            let powerOutput = 0;
            if (row[4] && row[4] !== 'N/A') {
                // Extract numeric value from string like "123.4" or "123.4(some text)"
                const match = row[4].match(/^[\d.]+/);
                if (match) {
                    powerOutput = parseFloat(match[0]);
                }
            }
            
            if (isSubtotal) {
                tr.classList.add('subtotal-row');
            }
            
            if (isEmergencyGenerator) {
                tr.classList.add('emergency-generator-row');
                // Add 'active' class if power output is greater than 0
                if (powerOutput > 0) {
                    tr.classList.add('active');
                }
            }
            
            // Add emergency indicator to the generator name if it's an emergency generator
            let displayName = row[2];
            if (isEmergencyGenerator) {
                const activeText = powerOutput > 0 ? '運轉中' : '緊急備用';
                displayName = row[2] + `<span class="emergency-indicator">${activeText}</span>`;
            }

            tr.innerHTML = `
                <td>${row[0]}</td>
                <td>${row[1]}</td>
                <td>${displayName}</td>
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
            '淨發電量高於裝置容量之說明：(1)部分火力機組因機組配件升級、環境溫度較低、機組效能測試等因素之影響，致使淨發電量可能高於裝置容量，惟大多屬短暫性現象，亦不影響台電與民營電廠之全年合約購電量。(2)本公司所購入汽電共生係為餘電收購，有淨發電量貢獻，其中垃圾及沼氣計入裝置容量，其餘不計入本公司系統裝置容量。',
            '澎湖尖山：僅含澎湖本島尖山電廠。金門塔山：含大、小金門所有電廠。馬祖珠山：只含南竿、北竿及珠山等電廠。離島其他：含蘭嶼、綠島、小琉球、連江縣[馬祖]離島（東引、東莒、西莒）及澎湖縣離島(七美、望安、虎井，但不含吉貝、鳥嶼)等電廠。※顯示之發電量為毛發電量。',
            '核能電廠全黑起動氣渦輪機，其淨尖峰能力15.5萬瓩，但其裝置容量不計入台電系統裝置容量，發電量計入燃油(輕油)發電。',
            '北部小水力: 圓山、天埤、軟橋、石圳聯通管。中部小水力: 后里、社寮、景山、北山、濁水、湖山、集集南岸。南部小水力: 六龜、竹門。東部小水力: 銅門、龍溪、水簾、清水、清流、初英、榕樹、溪口、東興。',
            '太陽能購電：所顯示之發電量係參考購電取樣發電量分區比例估算得出。購售電件數請參考本公司首頁：資訊揭露->發電資訊->購入電力概況->購入電力分布情形。',
            '淨發電量若標示為N/A，表示無即時資訊。',
            '本網頁資料為每10分鐘更新，請重新整理頁面，可顯示最新資訊。',
            '電廠(機組)換發/取得電業執照前進行測試(試運轉)等程序時，該電廠(機組)暫不計入裝置容量且不揭露其發電百分比。',
            '備註欄補充說明：(1)水文限制：配合水資源局下游用水需求限制，或排洪排砂。(2)燃料限制：發電廠年度天然氣燃料用量限制，或儲量限制。(3)環保限制：配合環保單位年度排放限制。(4)空污減載：因應 PM2.5 環境友善降載。(5)環保停機(檢修)：本公司因應季節性區域空氣品質不良，在評估停機後，系統仍可維持供電安全，安排環保停機(檢修)。(6)運轉限制：發電機組輔機相關設備等故障限制。(7)EOH限制：發電機組有效運轉時數(EOH)限制。(8)部分歲修：複循環發電機組部分歲修。(9)部分檢修：複循環發電機組部分檢修。(10)部分故障：複循環發電機組部分故障。(11)合約限制：與民營電廠合約(PPA)限制。(12)電源線限制：發電廠電源線安全限制。(13)機組安檢：機組依原製造廠家規定，於其運轉累計達一定時數時，須實施必要之安檢。(14)輔機檢修：相關輔機設備功能異常必須停用檢修，以致發電出力受限。(15)外溫高限制：因氣溫高機組出力受限。(16)歲修逾排程：機組歲修因設備或其他因素，超過原排程工期。(17)測試停機：機組歲、檢修後因必要測試停機或試俥機組停機。(18)測試運轉：機組歲、檢修後運轉測試，或依規定之定期降載測試。',
            '興達#3、#4機自113年起第一、四季不運轉，114年起轉為備用機組，僅於第二、三季當預估供電餘裕(率)低於8%時啟用。',
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
                label: '燃煤 (MW)',
                data: coalData,
                borderColor: colorMapping['燃煤'],
                tension: 0.1,
                fill: false
            },
            {
                label: '燃氣 (MW)',
                data: gasData,
                borderColor: colorMapping['燃氣'],
                tension: 0.1,
                fill: false
            },
            {
                label: '其他火力 (MW)',
                data: otherThermalData,
                borderColor: colorMapping['其他火力'],
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
        '燃煤': 'rgb(139, 69, 19)',
        '燃氣': 'rgb(255, 165, 0)',
        '其他火力': 'rgb(255, 205, 86)',
        '火力': 'rgb(255, 140, 0)',
        '再生能源': 'rgb(54, 162, 235)',
        '總發電量': 'rgb(75, 192, 192)'
    };

    // Custom calendar variables
    let currentCalendarDate = new Date();
    let selectedDate = null;
    let calendarVisible = false;
    
    function initializeDatePicker() {
        // Set the initial date to the current updateTime
        const [currentDate] = updateTime.split(' ');
        selectedDate = currentDate;
        currentCalendarDate = new Date(currentDate);
        
        // Initialize custom calendar
        initializeCustomCalendar();
        updateDateDisplay();
        
        // Check if current date has emergency data and add indicator
        if (emergencyDatesCache.has(currentDate)) {
            document.getElementById('datePickerDisplay').classList.add('has-emergency');
        }
    }
    
    function initializeCustomCalendar() {
        const dateDisplay = document.getElementById('datePickerDisplay');
        const calendar = document.getElementById('customCalendar');
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        // Toggle calendar visibility
        dateDisplay.addEventListener('click', () => {
            calendarVisible = !calendarVisible;
            calendar.style.display = calendarVisible ? 'block' : 'none';
            if (calendarVisible) {
                renderCalendar();
            }
        });
        
        // Navigation buttons
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            ensureEmergencyDataForMonth(currentCalendarDate); // This one can stay as Date object since it's for navigation
            renderCalendar();
        });
        
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            ensureEmergencyDataForMonth(currentCalendarDate); // This one can stay as Date object since it's for navigation
            renderCalendar();
        });
        
        // Close calendar when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.custom-date-picker')) {
                calendar.style.display = 'none';
                calendarVisible = false;
            }
        });
    }

    function fetchDataForDate(date) {
        // Validate the selected date using string comparison to avoid timezone issues
        const [year, month, day] = date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day); // Create date in local timezone
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        
        // Check if date is too far in the past or future
        if (selectedDate < oneYearAgo) {
            alert('所選日期太久遠，資料可能不存在。請選擇近一年內的日期。');
            return;
        }
        
        if (selectedDate > today) {
            alert('無法選擇未來的日期。請選擇今天或之前的日期。');
            return;
        }
        
        const Ymd = year.toString() + month.toString().padStart(2, '0') + day.toString().padStart(2, '0');
        const jsonUrl = `https://kiang.github.io/taipower_data/genary/${year}/${Ymd}/list.json`;

        // Clear previous day's cached times to prevent memory growth and stale hits
        try {
            Object.keys(dataCache).forEach(k => delete dataCache[k]);
        } catch (e) {
            // no-op
        }

        fetch(jsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: 此日期的資料不存在`);
                }
                return response.json();
            })
            .then(data => {
                updateTime = `${date} 00:00`; // Set updateTime to the start of the selected date
                // Avoid refetching list.json by passing the loaded list to the slider
                fetchAndPopulateSlider(data);
                
                // Check for emergency data on the new date
                setTimeout(() => {
                    // Ensure emergency data for this month is loaded first
                    ensureEmergencyDataForMonth(date).then(() => {
                        // Then check for daily emergency data
                        checkEmergencyGeneratorsForDate(date);
                    });
                }, 100);
            })
            .catch(error => {
                console.error('Error fetching data for selected date:', error);
                
                // Provide more specific error messages
                let errorMessage = '無法取得所選日期的資料。';
                if (error.message.includes('HTTP 404')) {
                    errorMessage = '所選日期的資料尚未提供，請選擇較近的日期。';
                } else if (error.message.includes('Failed to fetch')) {
                    errorMessage = '網路連線異常，請檢查網路連線後重試。';
                }
                
                alert(errorMessage + '\n請選擇其他日期。');
                
                // Reset to today's date if available
                const now = new Date();
                const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                
                // Reset to today's date in our custom calendar
                if (selectedDate !== today) {
                    selectedDate = today;
                    currentCalendarDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    updateDateDisplay();
                }
            });
    }

    // Emergency Date Loading and Calendar Functions
    function loadEmergencyDates() {
        return fetch(`${emergencyApiBase}/monthly_index.json`)
            .then(response => response.json())
            .then(data => {
                // Store monthly index data for on-demand loading
                emergencyMonthsData = data;
                emergencyDatesCache.clear();
                loadedMonths.clear();
                
                console.log(`Emergency data available for ${data.months?.length || 0} months`);
                
                // Load the recent 3 months for calendar highlighting
                const recentMonths = getRecentMonths(3);
                if (data.months && data.months.length > 0) {
                    const recentMonthsData = data.months.filter(m => recentMonths.includes(m.year_month));
                    if (recentMonthsData.length > 0) {
                        return loadEmergencyDatesFromMonthly(recentMonthsData);
                    } else {
                        // No emergency data for recent months, just setup highlights
                        setupDatePickerHighlights();
                        return Promise.resolve();
                    }
                } else {
                    setupDatePickerHighlights();
                    return Promise.resolve();
                }
            })
            .catch(error => {
                console.error('Error loading emergency dates:', error);
                setupDatePickerHighlights(); // Setup even if loading fails
                return Promise.resolve();
            });
    }
    
    function getCurrentMonth() {
        const now = new Date();
        return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    function getRecentMonths(count) {
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < count; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yearMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            months.push(yearMonth);
        }
        
        return months;
    }
    
    function ensureEmergencyDataForMonth(dateStr) {
        // Parse date string manually to avoid timezone issues
        let yearMonth;
        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month] = dateStr.split('-');
            yearMonth = `${year}${month}`;
        } else {
            // Fallback to Date object if not a standard date string
            const date = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
            yearMonth = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        
        if (!loadedMonths.has(yearMonth) && emergencyMonthsData) {
            const monthData = emergencyMonthsData.months?.find(m => m.year_month === yearMonth);
            if (monthData) {
                return loadEmergencyDatesFromMonthly([monthData]);
            }
        }
        
        // Return resolved promise if data already loaded or no data available
        return Promise.resolve();
    }
    
    function loadEmergencyDatesFromMonthly(months) {
        // Load specified months and mark them as loaded
        const promises = months.map(month => 
            fetch(`${emergencyApiBase}/2025/${month.year_month}.json`)
                .then(response => response.json())
                .then(monthData => {
                    if (monthData && monthData.dates && Array.isArray(monthData.dates) && monthData.dates.length > 0) {
                        monthData.dates.forEach(dateInfo => {
                            if (dateInfo && dateInfo.formatted_date) {
                                emergencyDatesCache.add(dateInfo.formatted_date);
                            }
                        });
                    }
                    loadedMonths.add(month.year_month);
                })
                .catch(error => console.warn(`Failed to load ${month.year_month}:`, error))
        );
        
        return Promise.all(promises).then(() => {
            console.log(`Loaded ${emergencyDatesCache.size} emergency dates from ${months.length} months`);
            setupDatePickerHighlights();
        });
    }
    
    function updateDateDisplay() {
        const dateDisplay = document.getElementById('datePickerDisplay');
        if (selectedDate) {
            dateDisplay.textContent = selectedDate;
            
            // Update emergency highlighting
            if (emergencyDatesCache.has(selectedDate)) {
                dateDisplay.classList.add('has-emergency');
                dateDisplay.title = `${selectedDate} - 此日期有緊急備用電力設施啟動記錄`;
            } else {
                dateDisplay.classList.remove('has-emergency');
                dateDisplay.title = '選擇日期查看歷史資料';
            }
        }
    }
    
    function renderCalendar() {
        const monthYearDisplay = document.getElementById('monthYearDisplay');
        const calendarGrid = document.getElementById('calendarGrid');
        
        // Clear existing content
        calendarGrid.innerHTML = '';
        
        // Ensure emergency data is loaded for the displayed month
        const displayedMonth = `${currentCalendarDate.getFullYear()}${(currentCalendarDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!loadedMonths.has(displayedMonth) && emergencyMonthsData) {
            const monthData = emergencyMonthsData.months?.find(m => m.year_month === displayedMonth);
            if (monthData) {
                loadEmergencyDatesFromMonthly([monthData]).then(() => {
                    // Re-render calendar after loading emergency data
                    renderCalendarContent();
                });
                return; // Exit early, will re-render after data loads
            }
        }
        
        renderCalendarContent();
    }
    
    function renderCalendarContent() {
        const monthYearDisplay = document.getElementById('monthYearDisplay');
        const calendarGrid = document.getElementById('calendarGrid');
        
        // Clear existing content
        calendarGrid.innerHTML = '';
        
        // Set month/year display
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                           '七月', '八月', '九月', '十月', '十一月', '十二月'];
        monthYearDisplay.textContent = `${currentCalendarDate.getFullYear()}年 ${monthNames[currentCalendarDate.getMonth()]}`;
        
        // Add day headers
        const dayHeaders = ['日', '一', '二', '三', '四', '五', '六'];
        dayHeaders.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day-header';
            dayElement.textContent = day;
            calendarGrid.appendChild(dayElement);
        });
        
        // Get first day of month and days in month
        const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
        const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Add days from previous month
        const prevMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 0);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonth.getDate() - i;
            const dayElement = createDayElement(day, true, new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day));
            calendarGrid.appendChild(dayElement);
        }
        
        // Add days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
            const dayElement = createDayElement(day, false, dayDate);
            calendarGrid.appendChild(dayElement);
        }
        
        // Add days from next month
        const totalCells = calendarGrid.children.length - 7; // Subtract header row
        const remainingCells = 42 - totalCells; // 6 rows * 7 days
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, day);
            const dayElement = createDayElement(day, true, nextMonth);
            calendarGrid.appendChild(dayElement);
        }
    }
    
    function createDayElement(day, isOtherMonth, fullDate) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        // Format date manually to avoid timezone issues
        const dateStr = `${fullDate.getFullYear()}-${(fullDate.getMonth() + 1).toString().padStart(2, '0')}-${fullDate.getDate().toString().padStart(2, '0')}`;
        const now = new Date();
        const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }
        
        if (dateStr === today && !isOtherMonth) {
            dayElement.classList.add('today');
        }
        
        if (dateStr === selectedDate) {
            dayElement.classList.add('selected');
        }
        
        // Check if this date has emergency data
        if (emergencyDatesCache.has(dateStr)) {
            dayElement.classList.add('emergency');
        }
        
        // Add click handler
        dayElement.addEventListener('click', () => {
            if (!isOtherMonth) {
                selectDate(dateStr);
            } else {
                // Navigate to the other month and select the date
                if (fullDate < new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1)) {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                } else {
                    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                }
                selectDate(dateStr);
                renderCalendar();
            }
        });
        
        return dayElement;
    }
    
    function selectDate(dateStr) {
        selectedDate = dateStr;
        updateDateDisplay();
        
        // Close calendar
        document.getElementById('customCalendar').style.display = 'none';
        calendarVisible = false;
        
        // Fetch data for selected date
        fetchDataForDate(dateStr);
        
        // Do not duplicate emergency checks here; fetchDataForDate handles it
    }
    
    function setupDatePickerHighlights() {
        // This function is now handled by the custom calendar
        console.log('Custom calendar initialized with emergency date highlighting');
    }
    
    
    function loadEmergencyDatesForRange(startDate, endDate) {
        if (!emergencyMonthsData) {
            return Promise.resolve(); // No monthly data available
        }
        
        // Determine which months we need for this date range
        const requiredMonths = new Set();
        const current = new Date(startDate);
        while (current <= endDate) {
            const yearMonth = `${current.getFullYear()}${(current.getMonth() + 1).toString().padStart(2, '0')}`;
            requiredMonths.add(yearMonth);
            current.setMonth(current.getMonth() + 1);
        }
        
        // Load only the months we haven't loaded yet
        const monthsToLoad = Array.from(requiredMonths).filter(month => !loadedMonths.has(month));
        
        if (monthsToLoad.length === 0) {
            return Promise.resolve(); // All required months already loaded
        }
        
        const promises = monthsToLoad.map(yearMonth => {
            const monthData = emergencyMonthsData.months.find(m => m.year_month === yearMonth);
            if (!monthData) {
                return Promise.resolve(); // Month not in emergency data
            }
            
            return fetch(`${emergencyApiBase}/2025/${yearMonth}.json`)
                .then(response => response.json())
                .then(data => {
                    if (data && data.dates && Array.isArray(data.dates) && data.dates.length > 0) {
                        data.dates.forEach(dateInfo => {
                            if (dateInfo && dateInfo.formatted_date) {
                                emergencyDatesCache.add(dateInfo.formatted_date);
                            }
                        });
                    }
                    loadedMonths.add(yearMonth);
                })
                .catch(error => console.warn(`Failed to load ${yearMonth}:`, error));
        });
        
        return Promise.all(promises);
    }
    
    // Helper function to convert time slots to hours and minutes
    function formatTimeSlots(timeSlotCount) {
        if (!timeSlotCount || timeSlotCount === 0) return '0分鐘';
        
        const totalMinutes = timeSlotCount * 10; // Each slot is 10 minutes
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        if (hours === 0) {
            return `${minutes}分鐘`;
        } else if (minutes === 0) {
            return `${hours}小時`;
        } else {
            return `${hours}小時${minutes}分鐘`;
        }
    }
    
    // Global functions for emergency functionality
    
    window.openMonthlyEmergencyModal = openMonthlyEmergencyModal;
    
    window.loadEmergencyHistory = function() {
        const days = document.getElementById('emergencyDateRange').value;
        const generatorFilter = document.getElementById('emergencyGeneratorFilter').value;
        const emergencyUrl = `${emergencyApiBase}/monthly_index.json`;
        
        fetch(emergencyUrl)
            .then(response => response.json())
            .then(data => {
                // Process the emergency history data
                displayEmergencyHistory(data, generatorFilter);
                setupEmergencyFilters(generatorFilter); // Pass current filter to preserve selection
            })
            .catch(error => {
                console.error('Error loading emergency history:', error);
                document.getElementById('emergencyHistoryBody').innerHTML = 
                    '<tr><td colspan="5" class="text-center text-danger">載入緊急備用電力設施歷史資料時發生錯誤</td></tr>';
            });
    }
    
    window.loadMonthDetails = function(yearMonth) {
        const monthUrl = `${emergencyApiBase}/2025/${yearMonth}.json`;
        
        fetch(monthUrl)
            .then(response => response.json())
            .then(data => {
                displayMonthDetails(data);
            })
            .catch(error => {
                console.error('Error loading month details:', error);
                alert('無法載入該月份的詳細資料');
            });
    }
    
    window.navigateToEmergencyDate = function(date) {
        // Close the emergency modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('emergencyModal'));
        if (modal) {
            modal.hide();
        }
        
        // Set the custom date picker to the selected date
        if (date && date !== 'N/A') {
            selectedDate = date;
            // Parse date string manually to avoid timezone issues
            const [year, month, day] = date.split('-');
            currentCalendarDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            // Update the display
            updateDateDisplay();
            
            // Trigger the date change event to load data for the selected date
            fetchDataForDate(date);
            
            // No extra emergency check here; fetchDataForDate handles it.
        }
    }

    // Emergency Generator Functions
    function checkEmergencyGenerators() {
        const [date] = updateTime.split(' ');
        checkEmergencyGeneratorsForDate(date);
    }
    
    function checkEmergencyGeneratorsForDate(date) {
        // First check if this date is in our emergency dates cache
        if (!emergencyDatesCache.has(date)) {
            // No emergency data for this date, hide alert and return
            hideEmergencyAlert();
            return;
        }
        
        const [year, month, day] = date.split('-');
        const Ymd = year + month + day;
        
        // Check if this date has any emergency data using daily index
        const dailyIndexUrl = `${emergencyApiBase}/${year}/${Ymd}/index.json`;
        
        fetch(dailyIndexUrl)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('No emergency data for this date');
            })
            .then(dailyIndex => {
                // Safely handle dailyIndex which might not be an array
                if (!Array.isArray(dailyIndex)) {
                    throw new Error('Invalid daily index format');
                }
                
                // Check if there's ANY emergency activity during the entire date
                if (dailyIndex.length > 0) {
                    // Collect all unique generators from the entire day
                    const allGenerators = new Set();
                    let totalEvents = 0;
                    let maxOutput = 0;
                    let activeGeneratorsData = [];
                    
                    dailyIndex.forEach(entry => {
                        if (entry && entry.generators && Array.isArray(entry.generators)) {
                            entry.generators.forEach(gen => allGenerators.add(gen));
                            totalEvents += entry.count || 0;
                            // Track max output if available
                            if (entry.total_output) {
                                maxOutput = Math.max(maxOutput, entry.total_output);
                            }
                        }
                    });
                    
                    if (allGenerators.size > 0) {
                        // Prepare generator data with placeholder values when no current time data
                        const generatorsList = Array.from(allGenerators).map(genName => ({
                            name: genName,
                            output: 0, // Will be updated if current time data exists
                            status: 'Day Total' // Indicates this is for the whole day
                        }));
                        
                        // Show emergency alert with daily summary
                        const dailySummary = {
                            date: date,
                            total_events: totalEvents,
                            time_slots: dailyIndex.length,
                            generators: generatorsList,
                            daily_index: dailyIndex,
                            max_output: maxOutput
                        };
                        
                        // Always show the alert if there's any emergency data for the day
                        showEmergencyAlertForDate(dailySummary);
                        
                        // Also try to load current time slot data if available
                        const currentTimeKey = getCurrentTimeKey();
                        const currentTimeEntry = dailyIndex.find(entry => entry && entry.time === currentTimeKey);
                        
                        if (currentTimeEntry && currentTimeEntry.generators && currentTimeEntry.generators.length > 0) {
                            // We have emergency data for the current time slot
                            fetch(`${emergencyApiBase}/${year}/${Ymd}/${currentTimeKey}.json`)
                                .then(response => response.json())
                                .then(data => {
                                    currentEmergencyData = data;
                                    // Update alert with current time specifics
                                    showEmergencyAlertForDate(dailySummary, data);
                                })
                                .catch(error => {
                                    console.warn('Could not load current time emergency data:', error);
                                    // Even if we can't load current time data, keep showing the daily summary
                                });
                        }
                        // If no current time entry, the alert still shows with daily summary
                    } else {
                        throw new Error('No emergency generators found in daily index');
                    }
                } else {
                    throw new Error('Empty daily index');
                }
            })
            .catch(error => {
                // No emergency data found for this date, hide alert
                hideEmergencyAlert();
            });
    }
    
    function getCurrentTimeKey() {
        // Get current slider position time or use latest time
        const slider = document.getElementById('timeSlider');
        if (slider && dataOptions.length > 0) {
            const selectedIndex = slider.value || slider.max;
            const selectedTime = dataOptions[selectedIndex];
            return selectedTime.replace('.json', '');
        }
        return '235900'; // fallback
    }
    
    function showEmergencyAlert(generators) {
        const alert = document.getElementById('emergencyAlert');
        const container = document.getElementById('emergencyGenerators');
        
        if (generators && generators.length > 0) {
            container.innerHTML = '';
            generators.forEach(gen => {
                const item = document.createElement('span');
                item.className = 'emergency-generator-item';
                item.innerHTML = `${gen.name}: ${gen.output}MW <small>(${gen.status || 'Unknown'})</small>`;
                container.appendChild(item);
            });
            
            alert.classList.remove('d-none');
            alert.addEventListener('click', openDailyEmergencyModal);
        } else {
            hideEmergencyAlert();
        }
    }
    
    function showEmergencyAlertForDate(dailySummary, currentTimeData = null) {
        const alert = document.getElementById('emergencyAlert');
        const container = document.getElementById('emergencyGenerators');
        
        if (dailySummary && dailySummary.generators && dailySummary.generators.length > 0) {
            container.innerHTML = '';
            
            // If we have current time data, show it prominently
            if (currentTimeData && currentTimeData.active_emergency_generators && currentTimeData.active_emergency_generators.length > 0) {
                const currentTitle = document.createElement('div');
                currentTitle.innerHTML = '<strong>當前時段:</strong>';
                currentTitle.style.marginBottom = '4px';
                container.appendChild(currentTitle);
                
                currentTimeData.active_emergency_generators.forEach(gen => {
                    const item = document.createElement('span');
                    item.className = 'emergency-generator-item';
                    item.style.backgroundColor = 'rgba(255, 193, 7, 0.3)'; // Highlighted for current
                    item.innerHTML = `${gen.name}: ${gen.output}MW <small>(${gen.status || 'Active'})</small>`;
                    container.appendChild(item);
                });
                
                const separator = document.createElement('div');
                separator.innerHTML = '<small><strong>今日所有啟動:</strong></small>';
                separator.style.margin = '8px 0 4px 0';
                container.appendChild(separator);
            } else {
                // No current time data, but there's emergency data for the day
                const dayTitle = document.createElement('div');
                dayTitle.innerHTML = '<strong>今日緊急備用電力設施:</strong>';
                dayTitle.style.marginBottom = '4px';
                container.appendChild(dayTitle);
            }
            
            // Show daily summary - improved display
            dailySummary.generators.forEach(gen => {
                const item = document.createElement('span');
                item.className = 'emergency-generator-item';
                // If it's an object with name property, use that; otherwise treat as string
                const genName = typeof gen === 'object' ? gen.name : gen;
                const genOutput = typeof gen === 'object' && gen.output > 0 ? `: ${gen.output}MW` : '';
                const genStatus = typeof gen === 'object' && gen.status && gen.status !== 'Day Total' ? ` (${gen.status})` : '';
                item.innerHTML = `${genName}${genOutput}${genStatus}`;
                container.appendChild(item);
            });
            
            // Add summary info
            const summaryInfo = document.createElement('div');
            summaryInfo.style.marginTop = '8px';
            const maxOutputText = dailySummary.max_output > 0 ? `，最大輸出${dailySummary.max_output}MW` : '';
            summaryInfo.innerHTML = `<small>共${dailySummary.total_events || 0}次啟動，持續${formatTimeSlots(dailySummary.time_slots)}${maxOutputText}</small>`;
            container.appendChild(summaryInfo);
            
            alert.classList.remove('d-none');
            alert.addEventListener('click', openDailyEmergencyModal);
        } else {
            hideEmergencyAlert();
        }
    }
    
    function hideEmergencyAlert() {
        const alert = document.getElementById('emergencyAlert');
        alert.classList.add('d-none');
        alert.removeEventListener('click', openDailyEmergencyModal);
    }
    
    function openDailyEmergencyModal() {
        const modal = new bootstrap.Modal(document.getElementById('dailyEmergencyModal'));
        modal.show();
        loadDailyEmergencyDetails();
    }
    
    function openEmergencyModal() {
        const modal = new bootstrap.Modal(document.getElementById('emergencyModal'));
        modal.show();
        loadEmergencyHistory();
    }
    
    function openMonthlyEmergencyModal() {
        // Close daily modal first
        const dailyModal = bootstrap.Modal.getInstance(document.getElementById('dailyEmergencyModal'));
        if (dailyModal) {
            dailyModal.hide();
        }
        
        // Wait a bit then open monthly modal
        setTimeout(() => {
            openEmergencyModal();
        }, 300);
    }
    
    function loadDailyEmergencyDetails() {
        const [date] = updateTime.split(' ');
        const [year, month, day] = date.split('-');
        const Ymd = year + month + day;
        
        const contentDiv = document.getElementById('dailyEmergencyContent');
        const modalTitle = document.getElementById('dailyEmergencyModalLabel');
        
        modalTitle.textContent = `${date} 緊急備用電力設施詳情`;
        contentDiv.innerHTML = '<div class="text-center">載入中...</div>';
        
        // Load daily index first
        const dailyIndexUrl = `${emergencyApiBase}/${year}/${Ymd}/index.json`;
        
        fetch(dailyIndexUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`No data for ${date}`);
                }
                return response.json();
            })
            .then(dailyIndex => {
                if (!Array.isArray(dailyIndex) || dailyIndex.length === 0) {
                    throw new Error('No emergency data');
                }
                
                // Display daily summary
                displayDailyEmergencyDetails(date, dailyIndex);
            })
            .catch(error => {
                contentDiv.innerHTML = `
                    <div class="alert alert-info text-center">
                        <h5><i class="fas fa-info-circle"></i> 本日無緊急備用電力設施啟動</h5>
                        <p>選定的日期 (${date}) 沒有緊急備用電力設施啟動記錄。</p>
                    </div>
                `;
            });
    }
    
    function compactContinuousTimeSlots(sortedIndex) {
        if (!sortedIndex || sortedIndex.length === 0) return [];
        
        const compacted = [];
        let currentGroup = null;
        
        for (let i = 0; i < sortedIndex.length; i++) {
            const entry = sortedIndex[i];
            const currentTime = entry.time;
            const currentGenerators = entry.generators ? entry.generators.sort().join(',') : '';
            
            // Check if this is continuous with previous entry
            const isContinuous = currentGroup && 
                                 isConsecutiveTimeSlot(currentGroup.endTime, currentTime) &&
                                 currentGroup.generatorsKey === currentGenerators;
            
            if (isContinuous) {
                // Extend current group
                currentGroup.endTime = currentTime;
                currentGroup.endTimeDisplay = formatTimeString(currentTime);
            } else {
                // Start new group
                if (currentGroup) {
                    compacted.push(createTimelineEntry(currentGroup));
                }
                
                currentGroup = {
                    startTime: currentTime,
                    endTime: currentTime,
                    startTimeDisplay: formatTimeString(currentTime),
                    endTimeDisplay: formatTimeString(currentTime),
                    generators: entry.generators || [],
                    generatorsKey: currentGenerators
                };
            }
        }
        
        // Add final group
        if (currentGroup) {
            compacted.push(createTimelineEntry(currentGroup));
        }
        
        return compacted;
    }
    
    function isConsecutiveTimeSlot(time1, time2) {
        // Parse time strings (format: HHMMSS)
        const hour1 = parseInt(time1.substring(0, 2));
        const minute1 = parseInt(time1.substring(2, 4));
        const second1 = parseInt(time1.substring(4, 6));
        
        const hour2 = parseInt(time2.substring(0, 2));
        const minute2 = parseInt(time2.substring(2, 4));
        const second2 = parseInt(time2.substring(4, 6));
        
        // Convert to total seconds for easier comparison
        const totalSeconds1 = hour1 * 3600 + minute1 * 60 + second1;
        const totalSeconds2 = hour2 * 3600 + minute2 * 60 + second2;
        
        // Check if time2 is exactly 10 minutes (600 seconds) after time1
        return (totalSeconds2 - totalSeconds1) === 600;
    }
    
    function formatTimeString(timeStr) {
        return `${timeStr.substring(0,2)}:${timeStr.substring(2,4)}:${timeStr.substring(4,6)}`;
    }
    
    function createTimelineEntry(group) {
        let timeDisplay;
        if (group.startTime === group.endTime) {
            // Single time slot
            timeDisplay = group.startTimeDisplay;
        } else {
            // Time range
            timeDisplay = `${group.startTimeDisplay} - ${group.endTimeDisplay}`;
        }
        
        return {
            timeDisplay: timeDisplay,
            generators: group.generators,
            startTime: group.startTime,
            endTime: group.endTime
        };
    }

    function displayDailyEmergencyDetails(date, dailyIndex) {
        const contentDiv = document.getElementById('dailyEmergencyContent');
        
        // Collect all generators and statistics
        const allGenerators = new Set();
        let totalEvents = 0;
        let timeSlots = dailyIndex.length;
        
        dailyIndex.forEach(entry => {
            if (entry && entry.generators && Array.isArray(entry.generators)) {
                entry.generators.forEach(gen => allGenerators.add(gen));
                totalEvents += entry.count || 0;
            }
        });
        
        // Create daily summary
        let content = `
            <div class="card mb-3">
                <div class="card-header bg-warning">
                    <h5 class="mb-0"><i class="fas fa-exclamation-triangle"></i> 當日摘要</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <strong>啟動設施數量:</strong><br>
                            <span class="fs-4 text-primary">${allGenerators.size}</span> 個
                        </div>
                        <div class="col-md-4">
                            <strong>總啟動次數:</strong><br>
                            <span class="fs-4 text-warning">${totalEvents}</span> 次
                        </div>
                        <div class="col-md-4">
                            <strong>持續時間:</strong><br>
                            <span class="fs-4 text-danger">${formatTimeSlots(timeSlots)}</span>
                        </div>
                    </div>
                    <hr>
                    <div>
                        <strong>啟動設施清單:</strong><br>
                        ${Array.from(allGenerators).map(gen => `<span class="badge bg-secondary me-1 mb-1">${gen}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Create timeline view
        content += `
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="fas fa-clock"></i> 時間軸詳情</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>時間</th>
                                    <th>啟動設施</th>
                                </tr>
                            </thead>
                            <tbody>
        `;
        
        // Sort daily index by time
        const sortedIndex = dailyIndex.sort((a, b) => a.time.localeCompare(b.time));
        
        // Group continuous time periods with same generators
        const compactedTimeline = compactContinuousTimeSlots(sortedIndex);
        
        compactedTimeline.forEach(entry => {
            const generators = entry.generators ? entry.generators.join(', ') : '無';
            
            content += `
                <tr>
                    <td><strong>${entry.timeDisplay}</strong></td>
                    <td>${generators}</td>
                </tr>
            `;
        });
        
        content += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        contentDiv.innerHTML = content;
    }
    
    
    function displayEmergencyHistory(monthlyData, generatorFilter = 'all') {
        const tbody = document.getElementById('emergencyHistoryBody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">處理資料中...</td></tr>';
        
        // Create timeline chart data
        const timelineData = [];
        const timelineLabels = [];
        
        // For now, show a summary of recent months and prepare chart data
        let historyHtml = '';
        if (monthlyData.months && monthlyData.months.length > 0) {
            const months = monthlyData.months.slice(-3);
            
            // If filter is applied, we need to fetch monthly details to check generators
            if (generatorFilter !== 'all') {
                historyHtml += `
                    <tr class="table-warning">
                        <td colspan="5" class="text-center">
                            <strong>篩選條件：${generatorFilter}</strong><br>
                            <small>正在載入篩選結果...</small>
                        </td>
                    </tr>
                `;
                tbody.innerHTML = historyHtml;
                
                // Load filtered results
                loadFilteredEmergencyHistory(months, generatorFilter);
                return;
            }
            
            months.forEach(month => {
                timelineLabels.push(`${month.year}-${month.month}`);
                timelineData.push(month.total_days);
                
                historyHtml += `
                    <tr class="table-info">
                        <td colspan="5">
                            <strong>${month.year}年${month.month}月</strong> - 
                            共${month.total_days}天有緊急備用電力設施啟動記錄
                            <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadMonthDetails('${month.year_month}')">
                                查看詳細
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
        
        if (historyHtml === '') {
            historyHtml = '<tr><td colspan="5" class="text-center">近期無緊急備用電力設施啟動記錄</td></tr>';
        }
        
        tbody.innerHTML = historyHtml;
        
        // Create timeline chart
        createEmergencyTimelineChart(timelineLabels, timelineData);
    }
    
    function loadFilteredEmergencyHistory(months, generatorFilter) {
        const tbody = document.getElementById('emergencyHistoryBody');
        
        // Load each month's details and filter by generator
        const promises = months.map(month => 
            fetch(`${emergencyApiBase}/2025/${month.year_month}.json`)
                .then(response => response.json())
                .then(monthData => {
                    if (monthData && monthData.dates && Array.isArray(monthData.dates)) {
                        // Filter dates that contain the specified generator
                        const filteredDates = monthData.dates.filter(dateInfo => {
                            if (!dateInfo.unique_generators) return false;
                            
                            let generators = [];
                            if (Array.isArray(dateInfo.unique_generators)) {
                                generators = dateInfo.unique_generators;
                            } else if (typeof dateInfo.unique_generators === 'object') {
                                generators = Object.values(dateInfo.unique_generators);
                            } else {
                                generators = [String(dateInfo.unique_generators)];
                            }
                            
                            return generators.some(gen => 
                                gen.toString().toLowerCase().includes(generatorFilter.toLowerCase())
                            );
                        });
                        
                        return {
                            ...monthData,
                            dates: filteredDates,
                            original_total: monthData.dates.length,
                            filtered_total: filteredDates.length
                        };
                    }
                    return null;
                })
                .catch(error => {
                    console.warn(`Failed to load ${month.year_month}:`, error);
                    return null;
                })
        );
        
        Promise.all(promises).then(results => {
            let filteredHtml = '';
            let totalFilteredDays = 0;
            
            results.forEach(monthData => {
                if (monthData && monthData.dates.length > 0) {
                    totalFilteredDays += monthData.dates.length;
                    
                    filteredHtml += `
                        <tr class="table-info">
                            <td colspan="5">
                                <strong>${monthData.year}年${monthData.month}月</strong> - 
                                找到${monthData.dates.length}天包含「${generatorFilter}」的記錄
                                (總共${monthData.original_total}天)
                            </td>
                        </tr>
                    `;
                    
                    // Show filtered dates
                    monthData.dates.forEach(dateInfo => {
                        let generatorsText = 'N/A';
                        if (dateInfo.unique_generators) {
                            if (Array.isArray(dateInfo.unique_generators)) {
                                generatorsText = dateInfo.unique_generators.join(', ');
                            } else if (typeof dateInfo.unique_generators === 'object') {
                                generatorsText = Object.values(dateInfo.unique_generators).join(', ');
                            } else {
                                generatorsText = String(dateInfo.unique_generators);
                            }
                        }
                        
                        const timesCount = (dateInfo.times && Array.isArray(dateInfo.times)) ? dateInfo.times.length : 0;
                        const eventsCount = dateInfo.events || 0;
                        
                        filteredHtml += `
                            <tr>
                                <td>
                                    <span class="emergency-date-clickable" onclick="navigateToEmergencyDate('${dateInfo.formatted_date || 'N/A'}')" title="點擊切換到此日期">
                                        ${dateInfo.formatted_date || 'N/A'}
                                    </span>
                                </td>
                                <td colspan="2">${generatorsText}</td>
                                <td>${eventsCount}次</td>
                                <td>${formatTimeSlots(timesCount)}</td>
                            </tr>
                        `;
                    });
                }
            });
            
            if (filteredHtml === '') {
                filteredHtml = `
                    <tr>
                        <td colspan="5" class="text-center text-muted">
                            沒有找到包含「${generatorFilter}」的緊急備用電力設施記錄
                        </td>
                    </tr>
                `;
            } else {
                filteredHtml = `
                    <tr class="table-success">
                        <td colspan="5" class="text-center">
                            <strong>篩選結果：共找到${totalFilteredDays}天包含「${generatorFilter}」的記錄</strong>
                        </td>
                    </tr>
                ` + filteredHtml;
            }
            
            tbody.innerHTML = filteredHtml;
        });
    }
    
    function createEmergencyTimelineChart(labels, data) {
        const ctx = document.getElementById('emergencyTimelineChart').getContext('2d');
        
        if (emergencyTimelineChart) {
            emergencyTimelineChart.destroy();
        }
        
        emergencyTimelineChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '緊急備用電力設施啟動天數',
                    data: data,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
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
                            text: '啟動天數'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '月份'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '緊急備用電力設施月度啟動統計'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
    
    
    function displayMonthDetails(monthData) {
        const tbody = document.getElementById('emergencyHistoryBody');
        let detailsHtml = `
            <tr class="table-secondary">
                <td colspan="5">
                    <strong>${monthData.year}年${monthData.month}月詳細記錄</strong>
                    <button class="btn btn-sm btn-outline-secondary ms-2" onclick="loadEmergencyHistory()">
                        返回摘要
                    </button>
                </td>
            </tr>
        `;
        
        if (monthData.dates && monthData.dates.length > 0) {
            monthData.dates.forEach(dateInfo => {
                // Safely handle unique_generators which can be array, object, or other formats
                let generatorsText = 'N/A';
                if (dateInfo.unique_generators) {
                    if (Array.isArray(dateInfo.unique_generators)) {
                        // Handle as array
                        generatorsText = dateInfo.unique_generators.join(', ');
                    } else if (typeof dateInfo.unique_generators === 'object') {
                        // Handle as object - extract values and join them
                        const generators = Object.values(dateInfo.unique_generators);
                        generatorsText = generators.join(', ');
                    } else {
                        // Handle as string or other primitive
                        generatorsText = String(dateInfo.unique_generators);
                    }
                }
                
                // Safely handle times array
                const timesCount = (dateInfo.times && Array.isArray(dateInfo.times)) ? dateInfo.times.length : 0;
                const eventsCount = dateInfo.events || 0;
                
                detailsHtml += `
                    <tr>
                        <td>
                            <span class="emergency-date-clickable" onclick="navigateToEmergencyDate('${dateInfo.formatted_date || 'N/A'}')" title="點擊切換到此日期">
                                ${dateInfo.formatted_date || 'N/A'}
                            </span>
                        </td>
                        <td colspan="2">${generatorsText}</td>
                        <td>${eventsCount}次</td>
                        <td>${formatTimeSlots(timesCount)}</td>
                    </tr>
                `;
            });
        } else {
            detailsHtml += `
                <tr>
                    <td colspan="5" class="text-center text-muted">此月份無緊急備用電力設施啟動記錄</td>
                </tr>
            `;
        }
        
        tbody.innerHTML = detailsHtml;
    }
    
    function setupEmergencyFilters(currentFilter = 'all') {
        const filterSelect = document.getElementById('emergencyGeneratorFilter');
        const dateRangeSelect = document.getElementById('emergencyDateRange');
        
        // Store current selection before rebuilding
        const previousValue = currentFilter || filterSelect.value || 'all';
        
        // Check if filters are already set up
        if (!filterSelect.hasAttribute('data-setup')) {
            // Add common emergency power facilities to filter
            const commonGenerators = [
                '核二Gas1', '核二Gas2', '核三Gas1', '核三Gas2',
                '台中Gas1&2', '台中Gas3&4', '大林#5',
                '興達#1', '興達#2', '興達#3', '興達#4'
            ];
            
            // Clear and rebuild options
            filterSelect.innerHTML = '<option value="all">全部緊急備用電力設施</option>';
            commonGenerators.forEach(gen => {
                const option = document.createElement('option');
                option.value = gen;
                option.textContent = gen;
                filterSelect.appendChild(option);
            });
            
            // Add event listeners only once
            dateRangeSelect.addEventListener('change', loadEmergencyHistory);
            filterSelect.addEventListener('change', loadEmergencyHistory);
            
            // Mark as set up
            filterSelect.setAttribute('data-setup', 'true');
        }
        
        // Always restore the selection
        filterSelect.value = previousValue;
    }

});
