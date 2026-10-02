<!-- Temples Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($temples['features'][$editIndex])):
        $ef = $temples['features'][$editIndex];
        $eKey = $ef['properties']['key'] ?? '';
        $eVisits = $templesVisits[$eKey] ?? [];
    ?>
    <h2>編輯宮廟 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form" enctype="multipart/form-data">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <input type="hidden" name="old_key" value="<?= htmlspecialchars($eKey) ?>">
        <label>宮廟名稱</label>
        <input type="text" name="key" value="<?= htmlspecialchars($eKey) ?>" required id="editFocus">
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" value="<?= $ef['geometry']['coordinates'][0] ?? 0 ?>" required placeholder="經度" id="inputLng">
            <input type="text" name="lat" value="<?= $ef['geometry']['coordinates'][1] ?? 0 ?>" required placeholder="緯度" id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>參訪紀錄</label>
        <div id="editVisits">
            <?php foreach ($eVisits as $vi => $visit): ?>
            <div class="visit-row" style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#f9f9f9">
                <div style="display:flex;gap:8px;margin-bottom:6px">
                    <div style="flex:1"><label style="font-size:12px">日期</label><input type="date" name="visit_date[]" value="<?= htmlspecialchars($visit['date'] ?? '') ?>" required></div>
                    <div style="flex:1"><label style="font-size:12px">事由</label><input type="text" name="visit_reason[]" value="<?= htmlspecialchars($visit['reason'] ?? '') ?>" required></div>
                </div>
                <div style="margin-bottom:6px"><label style="font-size:12px">備註</label><input type="text" name="visit_note[]" value="<?= htmlspecialchars($visit['note'] ?? '') ?>" placeholder="選填"></div>
                <div style="margin-bottom:6px">
                    <label style="font-size:12px">照片網址（每行一個）</label>
                    <textarea name="visit_photos[]" rows="2" placeholder="https://example.com/photo1.jpg"><?= htmlspecialchars(implode("\n", $visit['photos'] ?? [])) ?></textarea>
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆</span>
            </div>
            <?php endforeach; ?>
            <?php if (empty($eVisits)): ?>
            <div class="visit-row" style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#f9f9f9">
                <div style="display:flex;gap:8px;margin-bottom:6px">
                    <div style="flex:1"><label style="font-size:12px">日期</label><input type="date" name="visit_date[]" required></div>
                    <div style="flex:1"><label style="font-size:12px">事由</label><input type="text" name="visit_reason[]" required></div>
                </div>
                <div style="margin-bottom:6px"><label style="font-size:12px">備註</label><input type="text" name="visit_note[]" placeholder="選填"></div>
                <div style="margin-bottom:6px">
                    <label style="font-size:12px">照片網址（每行一個）</label>
                    <textarea name="visit_photos[]" rows="2" placeholder="https://example.com/photo1.jpg"></textarea>
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆</span>
            </div>
            <?php endif; ?>
        </div>
        <span class="add-video-btn" onclick="addVisitRow('editVisits')">+ 新增參訪紀錄</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=temples" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增宮廟</h2>
    <form method="post" class="edit-form" id="createForm" enctype="multipart/form-data">
        <input type="hidden" name="action" value="create">
        <label>宮廟名稱</label>
        <input type="text" name="key" placeholder="大觀音亭" required>
        <label>座標（點擊地圖或手動輸入）</label>
        <div style="display:flex;gap:8px;margin-bottom:6px">
            <input type="text" name="lng" placeholder="120.205100" required id="inputLng">
            <input type="text" name="lat" placeholder="23.000800" required id="inputLat">
        </div>
        <div id="pickerMap"></div>
        <div class="map-hint">點擊地圖設定座標，或拖曳標記調整位置</div>
        <label>參訪紀錄</label>
        <div id="createVisits">
            <div class="visit-row" style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#f9f9f9">
                <div style="display:flex;gap:8px;margin-bottom:6px">
                    <div style="flex:1"><label style="font-size:12px">日期</label><input type="date" name="visit_date[]" required></div>
                    <div style="flex:1"><label style="font-size:12px">事由</label><input type="text" name="visit_reason[]" required></div>
                </div>
                <div style="margin-bottom:6px"><label style="font-size:12px">備註</label><input type="text" name="visit_note[]" placeholder="選填"></div>
                <div style="margin-bottom:6px">
                    <label style="font-size:12px">照片網址（每行一個）</label>
                    <textarea name="visit_photos[]" rows="2" placeholder="https://example.com/photo1.jpg"></textarea>
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆</span>
            </div>
        </div>
        <span class="add-video-btn" onclick="addVisitRow('createVisits')">+ 新增參訪紀錄</span>
        <br>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>宮廟列表 (<?= count($temples['features'] ?? []) ?> 筆)</h2>
    <div class="filter-bar">
        <input type="text" id="templeFilter" placeholder="搜尋宮廟名稱..." oninput="filterTable('templeTable', this.value, 'templeCount')">
        <span class="count" id="templeCount"></span>
    </div>
    <table id="templeTable">
        <thead>
            <tr><th>#</th><th>宮廟名稱</th><th>座標</th><th>參訪次數</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (array_reverse($temples['features'] ?? [], true) as $i => $feature):
            $key = $feature['properties']['key'] ?? '';
            $visits = $templesVisits[$key] ?? [];
        ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td class="truncate" title="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($key) ?></td>
                <td><?= ($feature['geometry']['coordinates'][0] ?? '') . ', ' . ($feature['geometry']['coordinates'][1] ?? '') ?></td>
                <td><?= count($visits) ?></td>
                <td class="actions">
                    <a href="?tab=temples&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此宮廟及所有參訪紀錄？')">
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
