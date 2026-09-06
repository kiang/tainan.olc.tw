<!-- Schedule Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($schedule[$editIndex])):
        $ef = $schedule[$editIndex];
    ?>
    <h2>編輯行程 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>日期</label>
        <input type="date" name="date" value="<?= htmlspecialchars($ef['date'] ?? '') ?>" required id="editFocus">
        <label>開始時間 (HH:MM)</label>
        <input type="text" name="time" value="<?= htmlspecialchars($ef['time'] ?? '') ?>" placeholder="17:20" required>
        <label>結束時間 (HH:MM，可留空)</label>
        <input type="text" name="end_time" value="<?= htmlspecialchars($ef['end_time'] ?? '') ?>" placeholder="18:30">
        <label>地點</label>
        <input type="text" name="location" value="<?= htmlspecialchars($ef['location'] ?? '') ?>" required>
        <label>類型</label>
        <select name="type" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px">
            <?php foreach ($scheduleTypes as $st): ?>
            <option value="<?= htmlspecialchars($st['name']) ?>"<?= ($ef['type'] ?? '') === $st['name'] ? ' selected' : '' ?>><?= htmlspecialchars($st['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <label>快速輸入座標（緯度, 經度）</label>
        <input type="text" id="quickCoord" placeholder="22.996961, 120.197392" oninput="parseQuickCoord(this.value)">
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lat" value="<?= $ef['lat'] ?? 0 ?>" required placeholder="緯度" id="inputLat">
            <input type="text" name="lng" value="<?= $ef['lng'] ?? 0 ?>" required placeholder="經度" id="inputLng">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=schedule" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增行程</h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>日期</label>
        <input type="date" name="date" required>
        <label>開始時間 (HH:MM)</label>
        <input type="text" name="time" placeholder="17:20" required>
        <label>結束時間 (HH:MM，可留空)</label>
        <input type="text" name="end_time" placeholder="18:30">
        <label>地點</label>
        <input type="text" name="location" placeholder="和緯黃昏市場" required>
        <label>類型</label>
        <select name="type" style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px">
            <?php foreach ($scheduleTypes as $st): ?>
            <option value="<?= htmlspecialchars($st['name']) ?>"><?= htmlspecialchars($st['name']) ?></option>
            <?php endforeach; ?>
        </select>
        <label>快速輸入座標（緯度, 經度）</label>
        <input type="text" id="quickCoord" placeholder="22.996961, 120.197392" oninput="parseQuickCoord(this.value)">
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lat" placeholder="23.009592" required id="inputLat">
            <input type="text" name="lng" placeholder="120.193953" required id="inputLng">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>行程列表 (<?= count($schedule) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="scheduleFilter" placeholder="搜尋日期、地點或類型..." oninput="filterTable('scheduleTable', this.value, 'scheduleCount')">
        <span class="count" id="scheduleCount"></span>
    </div>
    <table id="scheduleTable">
        <thead>
            <tr><th>#</th><th>日期</th><th>時間</th><th>結束</th><th>地點</th><th>類型</th><th>座標</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (array_reverse($schedule, true) as $i => $item): ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($item['date'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['time'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['end_time'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['location'] ?? '') ?></td>
                <td><?= htmlspecialchars($item['type'] ?? '') ?></td>
                <td><?= ($item['lat'] ?? '') . ', ' . ($item['lng'] ?? '') ?></td>
                <td class="actions">
                    <a href="?tab=schedule&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <?php
                        $ymdh = str_replace('-', '', $item['date'] ?? '') . str_replace(':', '', substr($item['time'] ?? '00:00', 0, 2));
                        $prefillLines = http_build_query(['tab' => 'lines', 'from_schedule' => '1', 'pre_ymdh' => $ymdh, 'pre_lng' => $item['lng'] ?? 0, 'pre_lat' => $item['lat'] ?? 0]);
                        $prefillYt = http_build_query(['tab' => 'youtube', 'from_schedule' => '1', 'pre_key' => $item['location'] ?? '', 'pre_lng' => $item['lng'] ?? 0, 'pre_lat' => $item['lat'] ?? 0]);
                    ?>
                    <a href="?<?= $prefillLines ?>" class="btn btn-sm btn-secondary" title="以此行程建立掃街紀錄">+掃街</a>
                    <a href="?<?= $prefillYt ?>" class="btn btn-sm btn-secondary" title="以此行程建立街講地點">+街講</a>
                    <form method="post" onsubmit="return confirm('確定刪除此行程？')">
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
