<?php
$basePath = dirname(__DIR__);
$data = [];

foreach(glob($basePath . '/csv/*.csv') as $csvFile) {
    $p = pathinfo($csvFile);
    $fh = fopen($csvFile, 'r');
    $header = array_map(function($field) {
        // Remove BOM and other hidden characters from header
        return preg_replace('/[\r\n]/', '', trim($field));
    }, fgetcsv($fh));
    $header[] = 'sort';
    $theSort = intval($p['filename']);
    
    while($row = fgetcsv($fh)) {
        // Clean each field in the row
        $row = array_map(function($field) {
            // Remove hidden characters and trim whitespace
            return preg_replace('/[\r\n]/', '', trim($field));
        }, $row);
        $row[] = $theSort;
        
        if(count($header) === count($row) && $row[0] !== '選舉區') {
            $data[] = array_combine($header, $row);
        }
    }
    fclose($fh);
}

// Sort the data by 'sort' and then by '號次'
usort($data, function($a, $b) {
    // First compare by sort field
    $sortCompare = $a['sort'] - $b['sort'];
    if ($sortCompare !== 0) {
        return $sortCompare;
    }
    // If sort is the same, compare by 號次
    return intval($a['號次']) - intval($b['號次']);
});

// Output cleaned and sorted data
file_put_contents($basePath . '/candidates.json', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));