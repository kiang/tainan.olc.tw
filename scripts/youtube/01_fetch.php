<?php
$basePath = dirname(dirname(__DIR__));
$config = require $basePath . '/scripts/config.php';
$youtubeUrl = 'https://www.googleapis.com/youtube/v3/search?key=' . $config['google-api-key'] . '&channelId=UC4wM1kfI0E_6sZPF-gi0tzw&order=date&maxResults=50&part=snippet,id';
$youtubePath = $basePath . '/docs/json/youtube';
$youtubeDetailsPath = $youtubePath . '/details';
if (!file_exists($youtubeDetailsPath)) {
  mkdir($youtubeDetailsPath, 0777, true);
}

$page1 = $youtubePath . '/page1.json';
file_put_contents($page1, file_get_contents($youtubeUrl));
$pageJson = json_decode(file_get_contents($page1), true);

foreach ($pageJson['items'] as $item) {
  if (!empty($item['id']['videoId'])) {
    $detailFile = $youtubeDetailsPath . '/' . $item['id']['videoId'] . '.json';
    if (!file_exists($detailFile)) {
      $detailUrl = 'https://www.googleapis.com/youtube/v3/videos?key=' . $config['google-api-key'] . '&id=' . $item['id']['videoId'] . '&part=contentDetails,statistics,status';
      file_put_contents($detailFile, file_get_contents($detailUrl));
    }
  }
}

$pageCount = 1;
while (!empty($pageJson['nextPageToken'])) {
  ++$pageCount;
  $page = $youtubePath . '/page' . $pageCount . '.json';
  file_put_contents($page, file_get_contents($youtubeUrl . '&pageToken=' . $pageJson['nextPageToken']));

  $pageJson = json_decode(file_get_contents($page), true);

  foreach ($pageJson['items'] as $item) {
    if (!empty($item['id']['videoId'])) {
      $detailFile = $youtubeDetailsPath . '/' . $item['id']['videoId'] . '.json';
      if (!file_exists($detailFile)) {
        $detailUrl = 'https://www.googleapis.com/youtube/v3/videos?key=' . $config['google-api-key'] . '&id=' . $item['id']['videoId'] . '&part=contentDetails,statistics,status';
        file_put_contents($detailFile, file_get_contents($detailUrl));
      }
    }
  }
}
