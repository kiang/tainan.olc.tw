<?php
$basePath = dirname(dirname(__DIR__));
$config = require $basePath . '/scripts/config.php';
$youtubeUrl = 'https://www.googleapis.com/youtube/v3/search?key=' . $config['google-api-key'] . '&channelId=UC4wM1kfI0E_6sZPF-gi0tzw&order=date&maxResults=50&part=snippet,id';
$youtubePath = $basePath . '/json/youtube';
if(!file_exists($youtubePath)) {
  mkdir($youtubePath, 0777, true);
}
$page1 = $youtubePath . '/page1.json';
file_put_contents($page1, file_get_contents($youtubeUrl));
$pageJson = json_decode(file_get_contents($page1), true);

$pageCount = 1;
while(!empty($pageJson['nextPageToken'])) {
  ++$pageCount;
  $page = $youtubePath . '/page' . $pageCount . '.json';
  file_put_contents($page, file_get_contents($youtubeUrl . '&pageToken=' . $pageJson['nextPageToken']));

  $pageJson = json_decode(file_get_contents($page), true);
}
