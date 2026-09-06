<!-- YouTube/StreetTalk Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($youtube['features'][$editIndex])):
        $ef = $youtube['features'][$editIndex];
        $eKey = $ef['properties']['key'] ?? '';
        $eVideos = $youtubeList[$eKey] ?? [];
    ?>
    <h2>編輯街講地點 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <input type="hidden" name="old_key" value="<?= htmlspecialchars($eKey) ?>">
        <label>地點名稱 (key)</label>
        <input type="text" name="key" value="<?= htmlspecialchars($eKey) ?>" required id="editFocus">
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" value="<?= $ef['geometry']['coordinates'][0] ?? 0 ?>" required placeholder="經度" id="inputLng">
            <input type="text" name="lat" value="<?= $ef['geometry']['coordinates'][1] ?? 0 ?>" required placeholder="緯度" id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>影片列表</label>
        <div id="editVideos">
            <?php foreach ($eVideos as $v): ?>
            <div class="video-row">
                <input type="text" name="video_id[]" value="<?= htmlspecialchars($v['id'] ?? '') ?>" placeholder="網址或影片 ID" onpaste="autoFetchVideoRow(this)">
                <input type="text" name="video_title[]" value="<?= htmlspecialchars($v['title'] ?? '') ?>" placeholder="影片標題">
                <button type="button" class="btn btn-sm btn-primary" onclick="fetchVideoRow(this)" style="flex-shrink:0">取得</button>
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
            <?php endforeach; ?>
            <?php if (empty($eVideos)): ?>
            <div class="video-row">
                <input type="text" name="video_id[]" placeholder="網址或影片 ID" onpaste="autoFetchVideoRow(this)">
                <input type="text" name="video_title[]" placeholder="影片標題">
                <button type="button" class="btn btn-sm btn-primary" onclick="fetchVideoRow(this)" style="flex-shrink:0">取得</button>
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
            <?php endif; ?>
        </div>
        <span class="add-video-btn" onclick="addVideoRow('editVideos')">+ 新增影片</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=youtube" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增街講地點<?= isset($_GET['from_schedule']) ? ' (從行程帶入)' : '' ?></h2>
    <form method="post" class="edit-form" id="createForm">
        <input type="hidden" name="action" value="create">
        <label>地點名稱 (key)</label>
        <input type="text" name="key" placeholder="北區和緯路四段/文賢路" value="<?= htmlspecialchars($_GET['pre_key'] ?? '') ?>" required>
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" placeholder="120.193953" value="<?= htmlspecialchars($_GET['pre_lng'] ?? '') ?>" required id="inputLng">
            <input type="text" name="lat" placeholder="23.009592" value="<?= htmlspecialchars($_GET['pre_lat'] ?? '') ?>" required id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>影片列表</label>
        <div id="createVideos">
            <div class="video-row">
                <input type="text" name="video_id[]" placeholder="網址或影片 ID" onpaste="autoFetchVideoRow(this)">
                <input type="text" name="video_title[]" placeholder="影片標題">
                <button type="button" class="btn btn-sm btn-primary" onclick="fetchVideoRow(this)" style="flex-shrink:0">取得</button>
                <span class="remove-video" onclick="this.parentElement.remove()">✕</span>
            </div>
        </div>
        <span class="add-video-btn" onclick="addVideoRow('createVideos')">+ 新增影片</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>街講地點列表 (<?= count($youtube['features'] ?? []) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="youtubeFilter" placeholder="搜尋地點名稱或座標..." oninput="filterTable('youtubeTable', this.value, 'youtubeCount')">
        <span class="count" id="youtubeCount"></span>
    </div>
    <table id="youtubeTable">
        <thead>
            <tr><th>#</th><th>地點</th><th>座標</th><th>影片數</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (array_reverse($youtube['features'] ?? [], true) as $i => $feature):
            $key = $feature['properties']['key'] ?? '';
            $videos = $youtubeList[$key] ?? [];
        ?>
            <?php
                $videoMeta = array_map(function($v) { return ($v['id'] ?? '') . ' ' . ($v['title'] ?? ''); }, $videos);
            ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?> data-videos="<?= htmlspecialchars(implode(' ', $videoMeta)) ?>">
                <td><?= $i ?></td>
                <td class="truncate" title="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($key) ?></td>
                <td><?= ($feature['geometry']['coordinates'][0] ?? '') . ', ' . ($feature['geometry']['coordinates'][1] ?? '') ?></td>
                <td><?= count($videos) ?></td>
                <td class="actions">
                    <a href="?tab=youtube&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此地點及所有影片？')">
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
