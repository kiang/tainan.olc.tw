<!-- Lines Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($lines['features'][$editIndex])):
        $ef = $lines['features'][$editIndex];
    ?>
    <h2>編輯掃街 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>日期時間 (ymdh)</label>
        <input type="text" name="ymdh" value="<?= htmlspecialchars($ef['properties']['ymdh'] ?? '') ?>" required id="editFocus">
        <label>YouTube 網址或影片 ID</label>
        <div style="display:flex;gap:8px">
            <input type="text" name="v" value="<?= htmlspecialchars($ef['properties']['v'] ?? '') ?>" required id="editVideoInput" placeholder="貼上 YouTube 網址或影片 ID" style="flex:1">
            <button type="button" class="btn btn-primary" onclick="fetchYoutubeInfo('editVideoInput','editTitleInput',this)">取得標題</button>
        </div>
        <label>標題</label>
        <input type="text" name="title" value="<?= htmlspecialchars($ef['properties']['title'] ?? '') ?>" id="editTitleInput">
        <label>座標 (每行一組 lng,lat，可只填一個點)</label>
        <textarea name="coordinates"><?php
            $geomType = $ef['geometry']['type'] ?? 'LineString';
            $geomCoords = $ef['geometry']['coordinates'] ?? [];
            if ($geomType === 'Point' && count($geomCoords) === 2 && !is_array($geomCoords[0])) {
                echo $geomCoords[0] . ',' . $geomCoords[1] . "\n";
            } else {
                foreach ($geomCoords as $c) {
                    if (is_array($c)) echo $c[0] . ',' . $c[1] . "\n";
                }
            }
        ?></textarea>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=lines" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增掃街<?= isset($_GET['from_schedule']) ? ' (從行程帶入)' : '' ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>日期時間 (ymdh 格式，如 2022080315)</label>
        <input type="text" name="ymdh" placeholder="2022080315" value="<?= htmlspecialchars($_GET['pre_ymdh'] ?? '') ?>" required>
        <label>YouTube 網址或影片 ID</label>
        <div style="display:flex;gap:8px">
            <input type="text" name="v" placeholder="貼上 YouTube 網址或影片 ID" required id="createVideoInput" style="flex:1">
            <button type="button" class="btn btn-primary" onclick="fetchYoutubeInfo('createVideoInput','createTitleInput',this)">取得標題</button>
        </div>
        <label>標題</label>
        <input type="text" name="title" placeholder="影片標題（自動取得或手動輸入）" id="createTitleInput">
        <label>座標 (每行一組 lng,lat，可只填一個點)</label>
        <?php $preCoord = (isset($_GET['pre_lng']) && isset($_GET['pre_lat']) && floatval($_GET['pre_lng']) != 0) ? $_GET['pre_lng'] . ',' . $_GET['pre_lat'] : ''; ?>
        <textarea name="coordinates" placeholder="120.19837595,22.99293332&#10;120.19743906,22.99314248&#10;（可只填一個點或留空）"><?= htmlspecialchars($preCoord) ?></textarea>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>掃街列表 (<?= count($lines['features'] ?? []) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="linesFilter" placeholder="搜尋日期時間或影片ID..." oninput="filterTable('linesTable', this.value, 'linesCount')">
        <span class="count" id="linesCount"></span>
    </div>
    <table id="linesTable">
        <thead>
            <tr><th>#</th><th>日期時間</th><th>影片ID</th><th>標題</th><th>類型/座標</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (array_reverse($lines['features'] ?? [], true) as $i => $feature):
            $gType = $feature['geometry']['type'] ?? 'LineString';
            $gCoords = $feature['geometry']['coordinates'] ?? [];
            $coordInfo = $gType === 'Point' ? '點' : count($gCoords) . '點掃街';
        ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($feature['properties']['ymdh'] ?? '') ?></td>
                <td><a href="https://www.youtube.com/watch?v=<?= htmlspecialchars($feature['properties']['v'] ?? '') ?>" target="_blank"><?= htmlspecialchars($feature['properties']['v'] ?? '') ?></a></td>
                <td class="truncate" title="<?= htmlspecialchars($feature['properties']['title'] ?? '') ?>"><?= htmlspecialchars($feature['properties']['title'] ?? '') ?></td>
                <td><?= $coordInfo ?></td>
                <td class="actions">
                    <a href="?tab=lines&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此掃街紀錄？')">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="index" value="<?= $i ?>">
                        <button type="submit" class="btn btn-sm btn-danger">刪除</button>
                    </form>
                </td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</div>
