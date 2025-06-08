$(document).ready(function() {
    console.log('DOM ready - initializing mort map');
    
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
        
        // Hide all facility info panels
        $('.facility-info').removeClass('active');
        
        // Show the selected facility info
        $('#info-' + facilityId).addClass('active');
        
        // Scroll to the info panel smoothly
        $('html, body').animate({
            scrollTop: $('.info-panel').offset().top - 20
        }, 500);
        
        // Add visual feedback
        $(this).find('span').addClass('clicked');
        setTimeout(() => {
            $(this).find('span').removeClass('clicked');
        }, 1000);
    });

    // Handle list item clicks
    $('#item li a').on('click', function(e) {
        e.preventDefault();
        console.log('List item clicked:', $(this).data('facility'));
        
        var facilityId = $(this).data('facility');
        
        // Hide all facility info panels
        $('.facility-info').removeClass('active');
        
        // Show the selected facility info
        $('#info-' + facilityId).addClass('active');
        
        // Scroll to the info panel smoothly
        $('html, body').animate({
            scrollTop: $('.info-panel').offset().top - 20
        }, 300);
        
        // Add visual feedback to list item
        $(this).parent().addClass('clicked');
        setTimeout(() => {
            $(this).parent().removeClass('clicked');
        }, 300);
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