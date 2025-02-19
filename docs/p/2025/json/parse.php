<?php
$raw = file_get_contents(__DIR__ . '/raw.html');
$pos = strpos($raw, '/Pages/List.aspx?nodeid=');
$candidates = [];
while(false !== $pos) {
    $posEnd = strpos($raw, '"', $pos);
    $nodeId = substr($raw, $pos, $posEnd - $pos);
    $pos = strpos($raw, '/Images/Legislators/', $posEnd);
    $posEnd = strpos($raw, '"', $pos);
    $img = substr($raw, $pos, $posEnd - $pos);
    $pos = strpos($raw, '/File/Images/Party/', $posEnd);
    $pos = strpos($raw, 'alt=', $pos);
    $pos = strpos($raw, '"', $pos) + 1;
    $posEnd = strpos($raw, '徽章', $pos);
    $party = substr($raw, $pos, $posEnd - $pos);
    $pos = strpos($raw, 'legislatorname', $posEnd);
    $pos = strpos($raw, '">', $pos) + 2;
    $posEnd = strpos($raw, '</div>', $pos);
    $candidate = substr($raw, $pos, $posEnd - $pos);
    $candidates[$candidate] = [
        'link' => 'https://www.ly.gov.tw' . $nodeId,
        'img' => 'https://www.ly.gov.tw' . $img,
        'party' => $party,
        'candidate' => $candidate,
    ];
    $pos = strpos($raw, '/Pages/List.aspx?nodeid=', $posEnd);
}
$json = json_decode(file_get_contents(__DIR__ . '/candidates.json'), true);
foreach($json AS $k => $v) {
    //file_put_contents(dirname(__DIR__) . '/img/' . $k . '.jpg', file_get_contents($candidates[$v['candidate']]['img']));
    $json[$k]['link'] = $candidates[$v['candidate']]['link'];
    $json[$k]['party'] = $candidates[$v['candidate']]['party'];
    if(!isset($json[$k]['linktr'])) {
        $json[$k]['linktr'] = '';
    }
    $json[$k]['total'] = $json[$k]['votes'] = 0;
}
$cunlis = json_decode(file_get_contents('/home/kiang/public_html/db.cec.gov.tw/data/ly/2024_zone_cunli.json'), true);
foreach($cunlis AS $cunli) {
    $json[$cunli['zoneCode']]['total'] += $cunli['votes_all'];
    $candidate = $json[$cunli['zoneCode']]['candidate'];
    $json[$cunli['zoneCode']]['votes'] += $cunli['votes'][$candidate]['votes'];
}

file_put_contents(__DIR__ . '/candidates.json', json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));