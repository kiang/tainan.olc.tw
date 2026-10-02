<!-- Temples Tab -->
<?php
$uploadDir = __DIR__ . '/../../docs/json/temples/';
$uploadUrl = '/json/temples/';
$dirExists = is_dir($uploadDir);
$dirWritable = $dirExists && is_writable($uploadDir);
?>

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
                    <label style="font-size:12px">已有照片</label>
                    <?php if (!empty($visit['photos'])): ?>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">
                        <?php foreach ($visit['photos'] as $pi => $photo): ?>
                        <div style="position:relative;display:inline-block" class="photo-thumb">
                            <img src="<?= htmlspecialchars($photo) ?>" style="width:80px;height:60px;object-fit:cover;border-radius:4px;border:1px solid #ddd" onerror="this.style.display='none'">
                            <input type="hidden" name="visit_existing_photos_<?= $vi ?>[]" value="<?= htmlspecialchars($photo) ?>">
                            <span onclick="this.parentElement.remove()" style="position:absolute;top:-6px;right:-6px;background:#dc3545;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;line-height:1">✕</span>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                    <label style="font-size:12px">上傳新照片</label>
                    <input type="file" name="visit_upload_<?= $vi ?>[]" multiple accept="image/*" style="font-size:13px">
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆參訪</span>
            </div>
            <?php endforeach; ?>
            <?php if (empty($eVisits)): ?>
            <div class="visit-row" data-visit-index="0" style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#f9f9f9">
                <div style="display:flex;gap:8px;margin-bottom:6px">
                    <div style="flex:1"><label style="font-size:12px">日期</label><input type="date" name="visit_date[]" required></div>
                    <div style="flex:1"><label style="font-size:12px">事由</label><input type="text" name="visit_reason[]" required></div>
                </div>
                <div style="margin-bottom:6px"><label style="font-size:12px">備註</label><input type="text" name="visit_note[]" placeholder="選填"></div>
                <div style="margin-bottom:6px">
                    <label style="font-size:12px">上傳照片</label>
                    <input type="file" name="visit_upload_0[]" multiple accept="image/*" style="font-size:13px">
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆參訪</span>
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
            <div class="visit-row" data-visit-index="0" style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;background:#f9f9f9">
                <div style="display:flex;gap:8px;margin-bottom:6px">
                    <div style="flex:1"><label style="font-size:12px">日期</label><input type="date" name="visit_date[]" required></div>
                    <div style="flex:1"><label style="font-size:12px">事由</label><input type="text" name="visit_reason[]" required></div>
                </div>
                <div style="margin-bottom:6px"><label style="font-size:12px">備註</label><input type="text" name="visit_note[]" placeholder="選填"></div>
                <div style="margin-bottom:6px">
                    <label style="font-size:12px">上傳照片</label>
                    <input type="file" name="visit_upload_0[]" multiple accept="image/*" style="font-size:13px">
                </div>
                <span class="remove-video" onclick="this.closest('.visit-row').remove()" style="cursor:pointer;color:#dc3545;font-size:13px">✕ 移除此筆參訪</span>
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

<details class="card" style="padding:12px 16px">
    <summary style="cursor:pointer;font-size:15px;font-weight:600;margin-bottom:4px">照片上傳目錄檢查</summary>
    <table style="font-size:13px;margin:8px 0 0">
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>路徑</strong></td>
            <td><code><?= htmlspecialchars(realpath($uploadDir) ?: $uploadDir) ?></code></td>
        </tr>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>目錄存在</strong></td>
            <td><?= $dirExists ? '<span style="color:green">✓ 是</span>' : '<span style="color:red">✗ 否</span>' ?></td>
        </tr>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>可寫入</strong></td>
            <td><?= $dirWritable ? '<span style="color:green">✓ 是</span>' : '<span style="color:red">✗ 否 — 請執行 chmod 775 ' . htmlspecialchars($uploadDir) . '</span>' ?></td>
        </tr>
        <?php if ($dirExists): ?>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>權限</strong></td>
            <td><code><?= substr(sprintf('%o', fileperms($uploadDir)), -4) ?></code></td>
        </tr>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>擁有者</strong></td>
            <td><code><?= posix_getpwuid(fileowner($uploadDir))['name'] ?? fileowner($uploadDir) ?>:<?= posix_getgrgid(filegroup($uploadDir))['name'] ?? filegroup($uploadDir) ?></code></td>
        </tr>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>已有照片</strong></td>
            <td><?= count(glob($uploadDir . '*.{jpg,jpeg,png,gif,webp}', GLOB_BRACE)) ?> 張</td>
        </tr>
        <?php endif; ?>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>PHP upload_max_filesize</strong></td>
            <td><code><?= ini_get('upload_max_filesize') ?></code></td>
        </tr>
        <tr>
            <td style="padding:2px 12px 2px 0"><strong>PHP post_max_size</strong></td>
            <td><code><?= ini_get('post_max_size') ?></code></td>
        </tr>
    </table>
</details>
