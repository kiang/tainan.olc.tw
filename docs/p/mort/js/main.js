$(document).ready(function() {
    console.log('DOM ready - initializing mort map');
    
    // Initialize date picker
    initializeDatePicker();
    
    // Load today's memorial data
    loadTodayMemorialData();
    
    // Wait for image to load, then initialize
    $('#Map img').on('load', function() {
        initializeImageMap();
    });
    
    // If image is already loaded
    if ($('#Map img')[0].complete) {
        initializeImageMap();
    }
});

function initializeImageMap() {
    console.log('Initializing image map...');
    
    // Hide all facility info panels initially
    $('.facility-info').removeClass('active');
    
    // Apply visual styling to all spans (they already have exact pixel positioning)
    $('#Map span').each(function() {
        var $span = $(this);
        console.log('Processing span', $span.attr('id'), 'with style:', $span.attr('style'));
        
        // Apply visual overlay styles while preserving the exact positioning
        $span.css({
            position: 'absolute',
            display: 'block',
            background: 'rgba(255, 0, 0, 0.3)',
            border: '1px solid rgba(255, 0, 0, 0.8)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            color: 'transparent',
            fontSize: '0',
            zIndex: 15,
            pointerEvents: 'auto'
        });
        
        console.log('Span', $span.attr('id'), 'positioned at:', $span.position(), 'with size:', $span.width() + 'x' + $span.height());
    });
    
    // Check final span dimensions
    $('#Map span').each(function(index) {
        var $span = $(this);
        console.log('Final span', index, ':', {
            id: $span.attr('id'),
            width: $span.width(),
            height: $span.height(),
            position: $span.position()
        });
    });
    
    // Handle map area clicks
    $('#Map a').on('click', function(e) {
        e.preventDefault();
        console.log('Map area clicked:', $(this).data('facility'));
        
        var facilityId = $(this).data('facility');
        var facilityName = $(this).attr('title').replace('南區殯儀館：', '');
        
        // Filter memorial data by location
        filterMemorialsByLocation(facilityName, facilityId);
        
        // Add visual feedback
        $(this).find('span').addClass('clicked');
        setTimeout(() => {
            $(this).find('span').removeClass('clicked');
        }, 1000);
        
        // Scroll to memorial data
        if ($('#memorial-section').length) {
            $('html, body').animate({
                scrollTop: $('#memorial-section').offset().top - 20
            }, 500);
        }
    });

    // Handle list item clicks
    $('#item li a').on('click', function(e) {
        e.preventDefault();
        console.log('List item clicked:', $(this).data('facility'));
        
        var facilityId = $(this).data('facility');
        var facilityName = $(this).text();
        
        // Filter memorial data by location
        filterMemorialsByLocation(facilityName, facilityId);
        
        // Add visual feedback to list item
        $(this).parent().addClass('clicked');
        setTimeout(() => {
            $(this).parent().removeClass('clicked');
        }, 300);
        
        // Scroll to memorial data
        if ($('#memorial-section').length) {
            $('html, body').animate({
                scrollTop: $('#memorial-section').offset().top - 20
            }, 300);
        }
    });

    // Simple hover functionality for testing
    $("#Map a").hover(
        function () {
            console.log('Map area hovered:', $(this).data('facility'));
            var $span = $(this).find("span");
            $span.addClass("hover");
            
            // Show tooltip
            var facilityName = $(this).attr('title');
            if (facilityName) {
                showTooltip(facilityName, event);
            }
        }, 
        function () {
            console.log('Map area unhovered:', $(this).data('facility'));
            var $span = $(this).find("span");
            $span.removeClass("hover");
            hideTooltip();
        }
    );

    // List item hover interactions - also highlights map area
    $("#item li").hover(function () {
        var _id = $(this).prop("class");
        
        // Add hover effect to list item
        $(this).addClass("hover");
        
        // Add hover effect to corresponding map area (shows mask) - only if _id exists
        if (_id && _id.trim() !== '') {
            $("#" + _id).addClass("hover");
        }
    }, function () {
        var _id = $(this).prop("class");
        
        // Remove hover effect from list item
        $(this).removeClass("hover");
        
        // Remove hover effect from map area - only if _id exists
        if (_id && _id.trim() !== '') {
            $("#" + _id).removeClass("hover");
        }
    });

    // Enhanced click functionality with visual feedback
    $('#Map a').on('mousedown', function() {
        $(this).find('span').addClass('clicked');
    }).on('mouseup mouseleave', function() {
        $(this).find('span').removeClass('clicked');
    });

    console.log('Image map initialization complete');
    
    // Add click handlers for memorial headers (will be added dynamically)
    setupMemorialHeaderClickHandlers();
}

// Function to setup click handlers for memorial headers
function setupMemorialHeaderClickHandlers() {
    $(document).on('click', '.clickable-header', function() {
        var facilityCode = $(this).data('facility-code');
        var facilityLocation = $(this).data('facility-location');
        
        console.log('Memorial header clicked:', facilityCode, facilityLocation);
        
        // Highlight the corresponding facility in the map
        highlightFacilityOnMap(facilityCode, facilityLocation);
        
        // Filter memorial data by this facility
        filterMemorialsByLocation(facilityLocation, facilityCode);
        
        // Add visual feedback to the clicked header
        $(this).addClass('clicked-header');
        setTimeout(() => {
            $(this).removeClass('clicked-header');
        }, 1000);
    });
}

// Tooltip functions
function showTooltip(text, event) {
    if (!text) return;
    
    // Remove existing tooltips
    $('.tooltip-custom').remove();
    
    // Create tooltip
    var tooltip = $('<div class="tooltip-custom">' + text.replace('南區殯儀館：', '') + '</div>');
    $('body').append(tooltip);
    
    // Position tooltip
    tooltip.css({
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        zIndex: 1000,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    });
    
    updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
    var tooltip = $('.tooltip-custom');
    if (tooltip.length && event) {
        var x = event.pageX + 10;
        var y = event.pageY - 30;
        
        // Prevent tooltip from going off screen
        if (x + tooltip.outerWidth() > $(window).width()) {
            x = event.pageX - tooltip.outerWidth() - 10;
        }
        if (y < 0) {
            y = event.pageY + 20;
        }
        
        tooltip.css({
            left: x + 'px',
            top: y + 'px'
        });
    }
}

function hideTooltip() {
    $('.tooltip-custom').fadeOut(200, function() {
        $(this).remove();
    });
}

// Update tooltip position on mouse move
$(document).mousemove(function(event) {
    if ($('.tooltip-custom').length) {
        updateTooltipPosition(event);
    }
});

// Add smooth scrolling for any internal links (but skip our map links)
$('a[href^="#"]:not(#Map a):not(#item a)').on('click', function(event) {
    var href = this.getAttribute('href');
    if (href && href !== '#') {
        var target = $(href);
        if (target.length) {
            event.preventDefault();
            $('html, body').stop().animate({
                scrollTop: target.offset().top - 20
            }, 500);
        }
    }
});

// Keyboard navigation support
$(document).keydown(function(e) {
    if (e.key === 'Escape') {
        // Hide all facility info panels
        $('.facility-info').removeClass('active');
        hideTooltip();
    }
});

// Function to highlight a specific facility (useful for external calls)
function highlightFacility(facilityId) {
    if (!facilityId || facilityId.trim() === '') {
        console.warn('highlightFacility: Invalid facilityId provided');
        return;
    }
    
    // Hide all facility info panels
    $('.facility-info').removeClass('active');
    
    // Show the selected facility info
    $('#info-' + facilityId).addClass('active');
    
    // Highlight the map area
    $('#' + facilityId).addClass('hover');
    
    // Highlight the list item
    $('.' + facilityId).addClass('hover');
    
    // Scroll to the info panel
    $('html, body').animate({
        scrollTop: $('.info-panel').offset().top - 20
    }, 500);
    
    // Remove highlights after 3 seconds
    setTimeout(function() {
        $('#' + facilityId).removeClass('hover');
        $('.' + facilityId).removeClass('hover');
    }, 3000);
}

// Utility function to check if image map is working
function testImageMap() {
    var areas = $('#Map a');
    var listItems = $('#item li');
    
    console.log('Total clickable map areas:', areas.length);
    console.log('Total list items:', listItems.length);
    
    areas.each(function(index) {
        var facility = $(this).data('facility');
        var title = $(this).attr('title');
        console.log('Area', index + 1, '- Facility:', facility, '- Title:', title);
    });
    
    return areas.length > 0;
}

// Global variable to store memorial data
var memorialData = [];
var currentSelectedDate = null;

// Function to load today's memorial data
function loadTodayMemorialData() {
    var today = new Date();
    loadMemorialDataForDate(today);
}

// Function to load memorial data for a specific date
function loadMemorialDataForDate(date) {
    var taiwanYear = date.getFullYear() - 1911;
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var dateStr = taiwanYear + '-' + month + '-' + day;
    
    var dataUrl = 'https://kiang.github.io/mort.tainan.gov.tw/json/memorial/' + taiwanYear + '/' + dateStr + '.json';
    
    console.log('Loading memorial data from:', dataUrl);
    
    // Show loading message
    $('#memorial-content').html('<p class="loading-message">載入中...</p>');
    
    $.getJSON(dataUrl)
        .done(function(data) {
            console.log('Memorial data loaded successfully:', data);
            // Store the records array for filtering
            if (data && data.records && Array.isArray(data.records)) {
                memorialData = data.records;
            }
            // Store current selected date
            currentSelectedDate = date;
            displayMemorialData(data);
        })
        .fail(function(jqxhr, textStatus, error) {
            console.log('Failed to load memorial data:', textStatus, error);
            // Show message that no data is available for this date
            var dateStr = date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日';
            displayNoDataMessage(dateStr);
        });
}

// Function to display memorial data
function displayMemorialData(data) {
    // Handle different data structures
    var memorialArray = [];
    var dateStr = '';
    var count = 0;
    
    if (Array.isArray(data)) {
        memorialArray = data;
        count = data.length;
    } else if (data && typeof data === 'object') {
        // Use date and count from JSON if available
        dateStr = data.date || '';
        count = data.count || 0;
        
        // If data is an object, try to find an array property or convert to array
        if (data.records && Array.isArray(data.records)) {
            memorialArray = data.records;
        } else if (data.memorials && Array.isArray(data.memorials)) {
            memorialArray = data.memorials;
        } else if (data.data && Array.isArray(data.data)) {
            memorialArray = data.data;
        } else {
            // Convert object to array with single item
            memorialArray = [data];
            count = 1;
        }
    }
    
    if (!memorialArray || memorialArray.length === 0) {
        displayNoDataMessage(dateStr);
        return;
    }
    
    // Use count from JSON or fall back to array length
    var displayCount = count > 0 ? count : memorialArray.length;
    var titleText = '今日告別式 (' + displayCount + '場)';
    if (dateStr) {
        titleText = dateStr + ' 告別式 (' + displayCount + '場)';
    }
    
    // Update the fixed section with memorial data
    $('#memorial-title').text(titleText);
    
    var memorialContent = '<div class="memorial-list">';
    
    memorialArray.forEach(function(memorial, index) {
        var timeStr = memorial['公祭時間'] || '';
        var nameStr = memorial['往生者'] || '';
        var locationStr = memorial['公祭地點'] || '';
        var genderStr = memorial['性別'] || '';
        var yearStr = memorial['年次'] || '';
        var addressStr = memorial['戶籍地'] || '';
        var codeStr = memorial['code'] || '';
        var bannerStr = memorial['輓額'] || '';
        
        memorialContent += '<div class="memorial-item">' +
            '<div class="memorial-header clickable-header" data-facility-code="' + codeStr + '" data-facility-location="' + locationStr + '">' +
            '<strong>' + timeStr + '</strong>' +
            (nameStr ? ' - ' + nameStr : '') +
            (genderStr ? ' (' + genderStr + ')' : '') +
            '</div>';
        
        if (locationStr) {
            memorialContent += '<div class="memorial-location">地點：' + locationStr;
            if (codeStr) {
                memorialContent += ' (' + codeStr + ')';
            }
            memorialContent += '</div>';
        }
        
        if (yearStr) {
            var age = '';
            if (yearStr.length >= 3) {
                var birthYear = parseInt(yearStr) + 1911;
                if (!isNaN(birthYear)) {
                    age = ' (' + (new Date().getFullYear() - birthYear) + '歲)';
                }
            }
            memorialContent += '<div class="memorial-info">年次：民國' + yearStr + '年' + age + '</div>';
        }
        
        if (addressStr) {
            memorialContent += '<div class="memorial-info">戶籍地：' + addressStr + '</div>';
        }
        
        if (bannerStr && bannerStr !== '') {
            memorialContent += '<div class="memorial-info">輓額：' + bannerStr + '</div>';
        }
        
        memorialContent += '</div>';
    });
    
    memorialContent += '</div>';
    
    // Update the fixed section content
    $('#memorial-content').html(memorialContent);
    
    // Add CSS for memorial display
    addMemorialCSS();
}

// Function to display no data message
function displayNoDataMessage(jsonDateStr) {
    var dateStr = jsonDateStr;
    if (!dateStr) {
        var today = new Date();
        dateStr = today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日';
    }
    
    $('#memorial-title').text(dateStr + ' 告別式');
    $('#memorial-content').html('<p class="no-data-message">' + dateStr + ' 暫無告別式資訊</p>');
    
    addMemorialCSS();
}

// Function to add CSS for memorial display
function addMemorialCSS() {
    var css = '<style>' +
        '#memorial-today { margin-bottom: 20px; }' +
        '.memorial-list { margin-top: 15px; }' +
        '.memorial-item { border-left: 4px solid #2196f3; padding: 10px 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 0 4px 4px 0; }' +
        '.memorial-header { font-size: 1.1em; color: #1976d2; margin-bottom: 5px; }' +
        '.memorial-location, .memorial-info { font-size: 0.9em; color: #666; margin: 3px 0; }' +
        '.no-data-message { color: #666; font-style: italic; text-align: center; padding: 20px; }' +
        '.clickable-header { cursor: pointer; transition: background-color 0.2s ease; }' +
        '.clickable-header:hover { background-color: #e3f2fd; border-radius: 4px; }' +
        '.clicked-header { background-color: #bbdefb !important; border-radius: 4px; }' +
        '.highlight-facility { background: rgba(255, 193, 7, 0.8) !important; border: 3px solid #ff9800 !important; border-radius: 6px !important; box-shadow: 0 0 20px rgba(255, 193, 7, 0.9) !important; z-index: 25 !important; animation: pulse-highlight 0.5s ease-in-out; }' +
        '@keyframes pulse-highlight { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }' +
        '.memorial-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; }' +
        '.date-selector { display: flex; align-items: center; gap: 5px; }' +
        '#date-picker { width: 140px; font-size: 0.85em; }' +
        '#today-btn { font-size: 0.8em; white-space: nowrap; }' +
        '@media (max-width: 768px) { .memorial-header-row { flex-direction: column; align-items: flex-start; gap: 10px; } .date-selector { align-self: flex-end; } }' +
        '</style>';
    
    $('head').append(css);
}

// Function to filter memorial data by location
function filterMemorialsByLocation(facilityName, facilityId) {
    if (!memorialData || !Array.isArray(memorialData)) {
        console.log('No memorial data available for filtering');
        return;
    }
    
    var filteredData = memorialData.filter(function(memorial) {
        var location = memorial['公祭地點'] || '';
        var code = memorial['code'] || '';
        
        // Match by facility name or code
        return location.indexOf(facilityName) !== -1 || code === facilityId;
    });
    
    console.log('Filtered memorial data for', facilityName, ':', filteredData);
    
    // Update the display with filtered data
    updateMemorialDisplay(filteredData, facilityName);
}

// Function to update memorial display with filtered data
function updateMemorialDisplay(filteredData, filterName) {
    if (!filteredData || filteredData.length === 0) {
        // Show no data message for this facility
        $('#memorial-title').html(filterName + ' - 今日告別式');
        $('#memorial-content').html(
            '<p class="no-data-message">此設施今日無告別式</p>' +
            '<button onclick="showAllMemorials()" class="btn btn-sm btn-outline-primary">顯示全部</button>'
        );
    } else {
        // Display filtered data
        displayFilteredMemorialData(filteredData, filterName);
    }
    
    addMemorialCSS();
}

// Function to display filtered memorial data
function displayFilteredMemorialData(filteredData, filterName) {
    $('#memorial-title').html(filterName + ' - 今日告別式 (' + filteredData.length + '場)');
    
    var memorialContent = '<button onclick="showAllMemorials()" class="btn btn-sm btn-outline-secondary mb-3">顯示全部</button>' +
        '<div class="memorial-list">';
    
    filteredData.forEach(function(memorial, index) {
        var timeStr = memorial['公祭時間'] || '';
        var nameStr = memorial['往生者'] || '';
        var locationStr = memorial['公祭地點'] || '';
        var genderStr = memorial['性別'] || '';
        var yearStr = memorial['年次'] || '';
        var addressStr = memorial['戶籍地'] || '';
        var codeStr = memorial['code'] || '';
        var bannerStr = memorial['輓額'] || '';
        
        memorialContent += '<div class="memorial-item">' +
            '<div class="memorial-header clickable-header" data-facility-code="' + codeStr + '" data-facility-location="' + locationStr + '">' +
            '<strong>' + timeStr + '</strong>' +
            (nameStr ? ' - ' + nameStr : '') +
            (genderStr ? ' (' + genderStr + ')' : '') +
            '</div>';
        
        if (locationStr) {
            memorialContent += '<div class="memorial-location">地點：' + locationStr;
            if (codeStr) {
                memorialContent += ' (' + codeStr + ')';
            }
            memorialContent += '</div>';
        }
        
        if (yearStr) {
            var age = '';
            if (yearStr.length >= 3) {
                var birthYear = parseInt(yearStr) + 1911;
                if (!isNaN(birthYear)) {
                    age = ' (' + (new Date().getFullYear() - birthYear) + '歲)';
                }
            }
            memorialContent += '<div class="memorial-info">年次：民國' + yearStr + '年' + age + '</div>';
        }
        
        if (addressStr) {
            memorialContent += '<div class="memorial-info">戶籍地：' + addressStr + '</div>';
        }
        
        if (bannerStr && bannerStr !== '') {
            memorialContent += '<div class="memorial-info">輓額：' + bannerStr + '</div>';
        }
        
        memorialContent += '</div>';
    });
    
    memorialContent += '</div>';
    
    $('#memorial-content').html(memorialContent);
}

// Function to show all memorials
function showAllMemorials() {
    if (memorialData && memorialData.length > 0) {
        displayMemorialData({records: memorialData});
    } else {
        displayNoDataMessage();
    }
}

// Function to highlight facility on map based on memorial data
function highlightFacilityOnMap(facilityCode, facilityLocation) {
    // Clear any existing highlights
    $('#Map span').removeClass('highlight-facility');
    
    var targetSpan = null;
    
    // First try to find by facility code
    if (facilityCode) {
        targetSpan = $('#' + facilityCode);
        console.log('Looking for facility by code:', facilityCode, 'found:', targetSpan.length);
    }
    
    // If not found by code, try to find by matching the location name in map areas
    if (!targetSpan || targetSpan.length === 0) {
        $('#Map a').each(function() {
            var title = $(this).attr('title') || '';
            var dataFacility = $(this).data('facility');
            
            // Check if the title contains the location name
            if (facilityLocation && title.indexOf(facilityLocation) !== -1) {
                targetSpan = $(this).find('span');
                console.log('Found facility by location match:', facilityLocation, 'in title:', title);
                return false; // break out of each loop
            }
            
            // Also check if data-facility matches the code
            if (facilityCode && dataFacility === facilityCode) {
                targetSpan = $(this).find('span');
                console.log('Found facility by data-facility match:', facilityCode);
                return false; // break out of each loop
            }
        });
    }
    
    if (targetSpan && targetSpan.length > 0) {
        // Add highlight class
        targetSpan.addClass('highlight-facility');
        
        // Scroll to the map area
        $('html, body').animate({
            scrollTop: $('#Map').offset().top - 100
        }, 500);
        
        // Remove highlight after 3 seconds
        setTimeout(function() {
            targetSpan.removeClass('highlight-facility');
        }, 3000);
        
        console.log('Successfully highlighted facility on map');
    } else {
        console.log('Could not find facility on map for code:', facilityCode, 'location:', facilityLocation);
    }
}

// Function to initialize date picker
function initializeDatePicker() {
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + 
                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(today.getDate()).padStart(2, '0');
    
    // Set today as default value
    $('#date-picker').val(todayStr);
    
    // Handle date change
    $('#date-picker').on('change', function() {
        var selectedDate = new Date($(this).val());
        if (!isNaN(selectedDate.getTime())) {
            console.log('Date changed to:', selectedDate);
            loadMemorialDataForDate(selectedDate);
        }
    });
    
    // Handle "今日" button click
    $('#today-btn').on('click', function() {
        var today = new Date();
        var todayStr = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
        
        $('#date-picker').val(todayStr);
        loadMemorialDataForDate(today);
    });
    
    console.log('Date picker initialized with today:', todayStr);
}