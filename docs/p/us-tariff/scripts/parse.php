<?php
/**
 * US Reciprocal Tariff Rates Data Parser
 * Extracts and processes tariff data from White House Executive Order ANNEX I
 * 
 * Chronological Sources:
 * - Original (April 2025): https://www.whitehouse.gov/wp-content/uploads/2025/04/Annex-I.pdf
 *   ✅ PDF content extracted using pdftotext
 * - June 2025 News: White House official explains 55% = 10% reciprocal + 20% fentanyl + 25% pre-existing
 *   Source: The Guardian, June 11, 2025
 * - Current (July 2025): https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/
 */

// Original tariff data from April 2025 ANNEX I (extracted from official PDF)
$previousTariffData = [
    'Algeria' => 30,
    'Angola' => 32,
    'Bangladesh' => 37,
    'Bosnia and Herzegovina' => 35,
    'Botswana' => 37,
    'Brunei' => 24,
    'Cambodia' => 49,
    'Cameroon' => 11,
    'Chad' => 13,
    'China' => 34,
    'Côte d\'Ivoire' => 21,
    'Democratic Republic of the Congo' => 11,
    'Equatorial Guinea' => 13,
    'European Union' => 20,
    'Falkland Islands' => 41,
    'Fiji' => 32,
    'Guyana' => 38,
    'India' => 26,
    'Indonesia' => 32,
    'Iraq' => 39,
    'Israel' => 17,
    'Japan' => 24,
    'Jordan' => 20,
    'Kazakhstan' => 27,
    'Laos' => 48,
    'Lesotho' => 50,
    'Libya' => 31,
    'Liechtenstein' => 37,
    'Madagascar' => 47,
    'Malawi' => 17,
    'Malaysia' => 24,
    'Mauritius' => 40,
    'Moldova' => 31,
    'Mozambique' => 16,
    'Myanmar' => 44, // Burma
    'Namibia' => 21,
    'Nauru' => 30,
    'Nicaragua' => 18,
    'Nigeria' => 14,
    'North Macedonia' => 33,
    'Norway' => 15,
    'Pakistan' => 29,
    'Philippines' => 17,
    'Serbia' => 37,
    'South Africa' => 30,
    'South Korea' => 25,
    'Sri Lanka' => 44,
    'Switzerland' => 31,
    'Syria' => 41,
    'Taiwan' => 32,
    'Thailand' => 36,
    'Tunisia' => 28,
    'Vanuatu' => 22,
    'Venezuela' => 15,
    'Vietnam' => 46,
    'Zambia' => 17,
    'Zimbabwe' => 18
];

// Current tariff data from July 2025 ANNEX I
$tariffData = [
    'Afghanistan' => 15,
    'Algeria' => 30,
    'Angola' => 15,
    'Bangladesh' => 20,
    'Bolivia' => 15,
    'Bosnia and Herzegovina' => 30,
    'Botswana' => 15,
    'Brazil' => 10,
    'Brunei' => 25,
    'Cambodia' => 19,
    'Cameroon' => 15,
    'Chad' => 15,
    'China' => 55, // 10% reciprocal + 20% fentanyl + 25% pre-existing
    'Costa Rica' => 15,
    'Côte d\'Ivoire' => 15,
    'Democratic Republic of the Congo' => 15,
    'Ecuador' => 15,
    'Equatorial Guinea' => 15,
    'Falkland Islands' => 10,
    'Fiji' => 15,
    'Ghana' => 15,
    'Guyana' => 15,
    'Iceland' => 15,
    'India' => 25,
    'Indonesia' => 19,
    'Iraq' => 35,
    'Israel' => 15,
    'Japan' => 15,
    'Jordan' => 15,
    'Kazakhstan' => 25,
    'Laos' => 40,
    'Lesotho' => 15,
    'Libya' => 30,
    'Liechtenstein' => 15,
    'Madagascar' => 15,
    'Malawi' => 15,
    'Malaysia' => 19,
    'Mauritius' => 15,
    'Moldova' => 25,
    'Mozambique' => 15,
    'Myanmar' => 40, // Burma
    'Namibia' => 15,
    'Nauru' => 15,
    'New Zealand' => 15,
    'Nicaragua' => 18,
    'Nigeria' => 15,
    'North Macedonia' => 15,
    'Norway' => 15,
    'Pakistan' => 19,
    'Papua New Guinea' => 15,
    'Philippines' => 19,
    'Serbia' => 35,
    'South Africa' => 30,
    'South Korea' => 15,
    'Sri Lanka' => 20,
    'Switzerland' => 39,
    'Syria' => 41,
    'Taiwan' => 20,
    'Thailand' => 19,
    'Trinidad and Tobago' => 15,
    'Tunisia' => 25,
    'Turkey' => 15,
    'Uganda' => 15,
    'United Kingdom' => 10,
    'Vanuatu' => 15,
    'Venezuela' => 15,
    'Vietnam' => 20,
    'Zambia' => 15,
    'Zimbabwe' => 15
];

// Special case: European Union (variable rates based on Column 1 Duty Rate)
$specialCases = [
    'European Union' => [
        'type' => 'variable',
        'description' => 'Goods with Column 1 Duty Rate > 15%: 0%; Goods with Column 1 Duty Rate < 15%: 15% minus Column 1 Duty Rate',
        'display_rate' => 'Variable (0-15%)'
    ]
];

// Country coordinates (approximate geographic centers)
$countryCoordinates = [
    'China' => [35.0, 105.0],
    'Afghanistan' => [33.0, 65.0],
    'Algeria' => [28.0, 3.0],
    'Angola' => [-12.5, 18.5],
    'Bangladesh' => [24.0, 90.0],
    'Bolivia' => [-16.5, -68.0],
    'Bosnia and Herzegovina' => [44.0, 18.0],
    'Botswana' => [-22.0, 24.0],
    'Brazil' => [-14.0, -51.0],
    'Brunei' => [4.5, 114.7],
    'Cambodia' => [12.5, 105.0],
    'Cameroon' => [7.0, 12.0],
    'Chad' => [15.0, 19.0],
    'Costa Rica' => [10.0, -84.0],
    'Côte d\'Ivoire' => [8.0, -5.0],
    'Democratic Republic of the Congo' => [-4.0, 21.0],
    'Ecuador' => [-1.8, -78.2],
    'Equatorial Guinea' => [2.0, 10.0],
    'European Union' => [54.5, 15.2], // Brussels area
    'Falkland Islands' => [-51.8, -59.0],
    'Fiji' => [-16.5, 179.4],
    'Ghana' => [7.9, -1.0],
    'Guyana' => [5.0, -59.0],
    'Iceland' => [64.1, -21.9],
    'India' => [20.6, 78.9],
    'Indonesia' => [-0.8, 113.9],
    'Iraq' => [33.2, 43.7],
    'Israel' => [31.0, 35.0],
    'Japan' => [36.2, 138.3],
    'Jordan' => [30.6, 36.2],
    'Kazakhstan' => [48.0, 66.9],
    'Laos' => [19.9, 102.5],
    'Lesotho' => [-29.6, 28.2],
    'Libya' => [26.3, 17.2],
    'Liechtenstein' => [47.1, 9.5],
    'Madagascar' => [-18.8, 47.0],
    'Malawi' => [-13.3, 34.3],
    'Malaysia' => [4.2, 101.9],
    'Mauritius' => [-20.3, 57.6],
    'Moldova' => [47.4, 28.4],
    'Mozambique' => [-18.7, 35.5],
    'Myanmar' => [21.9, 95.9],
    'Namibia' => [-22.6, 17.1],
    'Nauru' => [-0.5, 166.9],
    'New Zealand' => [-40.9, 174.9],
    'Nicaragua' => [12.9, -85.2],
    'Nigeria' => [9.1, 8.7],
    'North Macedonia' => [41.6, 21.7],
    'Norway' => [60.5, 8.5],
    'Pakistan' => [30.4, 69.3],
    'Papua New Guinea' => [-6.3, 143.9],
    'Philippines' => [12.9, 121.8],
    'Serbia' => [44.0, 21.0],
    'South Africa' => [-30.6, 22.9],
    'South Korea' => [35.9, 127.8],
    'Sri Lanka' => [7.9, 80.8],
    'Switzerland' => [46.8, 8.2],
    'Syria' => [34.8, 38.9],
    'Taiwan' => [23.7, 120.9],
    'Thailand' => [15.9, 100.9],
    'Trinidad and Tobago' => [10.7, -61.2],
    'Tunisia' => [33.9, 9.6],
    'Turkey' => [38.96, 35.24],
    'Uganda' => [1.4, 32.3],
    'United Kingdom' => [55.4, -3.4],
    'Vanuatu' => [-15.4, 166.9],
    'Venezuela' => [6.4, -66.6],
    'Vietnam' => [14.1, 108.3],
    'Zambia' => [-13.1, 27.8],
    'Zimbabwe' => [-19.0, 29.2]
];

/**
 * Generate JSON output for JavaScript consumption
 */
function generateJSON() {
    global $tariffData, $specialCases, $countryCoordinates, $previousTariffData;
    
    $output = [
        'countries' => [],
        'metadata' => [
            'source' => 'White House Executive Order: Further Modifying the Reciprocal Tariff Rates',
            'url' => 'https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/',
            'original_source' => 'https://www.whitehouse.gov/wp-content/uploads/2025/04/Annex-I.pdf',
            'china_explanation' => 'https://www.theguardian.com/business/2025/jun/11/trump-says-china-will-face-55-percent-tariffs-us-trade-deal-rare-earth-minerals',
            'extraction_method' => 'PDF extracted using pdftotext from official White House document',
            'date' => 'July 2025',
            'chronology' => 'April 2025 (Original) → June 2025 (China 55% explained) → July 2025 (Current)',
            'total_countries' => count($tariffData) + count($specialCases),
            'generated' => date('Y-m-d H:i:s')
        ]
    ];
    
    // Add regular countries
    foreach ($tariffData as $country => $rate) {
        $coords = isset($countryCoordinates[$country]) ? $countryCoordinates[$country] : null;
        $previousRate = isset($previousTariffData[$country]) ? $previousTariffData[$country] : null;
        $change = ($previousRate !== null) ? $rate - $previousRate : null;
        
        // Special handling for China's complex timeline
        if ($country === 'China') {
            $output['countries'][] = [
                'name' => $country,
                'tariff_rate' => $rate,
                'previous_rate' => $previousRate,
                'interim_rate' => 10, // May 2025 modification
                'change' => $change,
                'coordinates' => $coords,
                'type' => 'special',
                'timeline' => 'April: 34% → May: 10% (90-day conditional) → July: 55%',
                'description' => 'China\'s tariff evolved through diplomatic negotiations: 34% initial rate, reduced to 10% in May 2025 under conditional 90-day suspension, then set to 55% in July 2025. White House official explained the 55% breakdown in June 2025.',
                'rate_breakdown' => '55% = 10% reciprocal + 20% fentanyl trafficking levy + 25% pre-existing tariff',
                'news_source' => 'The Guardian, June 11, 2025: White House official confirmation of rate structure',
                'news_url' => 'https://www.theguardian.com/business/2025/jun/11/trump-says-china-will-face-55-percent-tariffs-us-trade-deal-rare-earth-minerals'
            ];
        } else {
            $output['countries'][] = [
                'name' => $country,
                'tariff_rate' => $rate,
                'previous_rate' => $previousRate,
                'change' => $change,
                'coordinates' => $coords,
                'type' => 'fixed'
            ];
        }
    }
    
    // Add special cases
    foreach ($specialCases as $country => $data) {
        $coords = isset($countryCoordinates[$country]) ? $countryCoordinates[$country] : null;
        $previousRate = isset($previousTariffData[$country]) ? $previousTariffData[$country] : null;
        
        $output['countries'][] = [
            'name' => $country,
            'tariff_rate' => $data['display_rate'],
            'previous_rate' => $previousRate,
            'change' => 'Variable', // Can't calculate numeric change for variable rates
            'coordinates' => $coords,
            'type' => 'variable',
            'description' => $data['description']
        ];
    }
    
    // Add countries that were in previous list but not in current (removed)
    foreach ($previousTariffData as $country => $previousRate) {
        if (!isset($tariffData[$country]) && !isset($specialCases[$country])) {
            $coords = isset($countryCoordinates[$country]) ? $countryCoordinates[$country] : null;
            $output['countries'][] = [
                'name' => $country,
                'tariff_rate' => 0, // Removed from list
                'previous_rate' => $previousRate,
                'change' => -$previousRate,
                'coordinates' => $coords,
                'type' => 'removed'
            ];
        }
    }
    
    return json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

/**
 * Generate statistics
 */
function generateStats() {
    global $tariffData;
    
    $rates = array_values($tariffData);
    $stats = [
        'total_countries' => count($tariffData),
        'min_rate' => min($rates),
        'max_rate' => max($rates),
        'average_rate' => round(array_sum($rates) / count($rates), 2),
        'rate_distribution' => []
    ];
    
    // Rate ranges
    $ranges = [
        '0-9%' => 0,
        '10-14%' => 0,
        '15-19%' => 0,
        '20-29%' => 0,
        '30-39%' => 0,
        '40%+' => 0
    ];
    
    foreach ($rates as $rate) {
        if ($rate < 10) $ranges['0-9%']++;
        elseif ($rate < 15) $ranges['10-14%']++;
        elseif ($rate < 20) $ranges['15-19%']++;
        elseif ($rate < 30) $ranges['20-29%']++;
        elseif ($rate < 40) $ranges['30-39%']++;
        else $ranges['40%+']++;
    }
    
    $stats['rate_distribution'] = $ranges;
    
    return $stats;
}

// Main execution
if (php_sapi_name() === 'cli') {
    echo "US Reciprocal Tariff Rates Data Parser\n";
    echo "=====================================\n\n";
    
    $stats = generateStats();
    echo "Statistics:\n";
    echo "- Total countries: " . $stats['total_countries'] . "\n";
    echo "- Rate range: " . $stats['min_rate'] . "% - " . $stats['max_rate'] . "%\n";
    echo "- Average rate: " . $stats['average_rate'] . "%\n\n";
    
    echo "Rate distribution:\n";
    foreach ($stats['rate_distribution'] as $range => $count) {
        echo "- $range: $count countries\n";
    }
    
    echo "\nGenerating JSON data...\n";
    $json = generateJSON();
    
    // Save to file
    $jsonFile = dirname(__FILE__) . '/../data/tariff_data.json';
    @mkdir(dirname($jsonFile), 0755, true);
    file_put_contents($jsonFile, $json);
    
    echo "JSON data saved to: $jsonFile\n";
    echo "Data ready for use in JavaScript visualization!\n";
} else {
    // Web output
    header('Content-Type: application/json');
    echo generateJSON();
}

?>