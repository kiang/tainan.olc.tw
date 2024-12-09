<?php
$basePath = dirname(__DIR__);

// Load candidates data
$candidates = json_decode(file_get_contents($basePath . '/candidates.json'), true);

// Create lookup array for candidates
$candidateLookup = [];
foreach ($candidates as $index => $candidate) {
    $key = $candidate['選舉區'] . '_' . $candidate['號次'];
    $candidateLookup[$key] = $index;
}

// Read and process votes.csv
$fh = fopen($basePath . '/votes.csv', 'r');
$header = fgetcsv($fh);

while ($row = fgetcsv($fh)) {
    $key = $row[0] . '_' . $row[2];
    if (isset($candidateLookup[$key])) {
        $index = $candidateLookup[$key];
        $candidates[$index]['votes'] = intval($row[3]);
        $candidates[$index]['fb'] = $row[4] ?? '';
    }
}
fclose($fh);

// Save updated candidates data
file_put_contents(
    $basePath . '/candidates.json', 
    json_encode($candidates, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
);

echo "Votes data merged successfully!\n"; 