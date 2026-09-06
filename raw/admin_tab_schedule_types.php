<!-- Schedule Types Tab -->
<div class="card" id="formCard">
    <?php if ($editIndex >= 0 && isset($scheduleTypes[$editIndex])):
        $ef = $scheduleTypes[$editIndex];
    ?>
    <h2>編輯行程類型 #<?= $editIndex ?></h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="update">
        <input type="hidden" name="index" value="<?= $editIndex ?>">
        <label>類型名稱</label>
        <input type="text" name="name" value="<?= htmlspecialchars($ef['name'] ?? '') ?>" required id="editFocus">
        <label>標記顏色</label>
        <div style="display:flex;gap:8px;align-items:center">
            <input type="color" name="color" value="<?= htmlspecialchars($ef['color'] ?? '#28c8c8') ?>" style="width:50px;height:36px;border:1px solid #ccc;border-radius:4px;cursor:pointer">
            <input type="text" name="color_text" value="<?= htmlspecialchars($ef['color'] ?? '#28c8c8') ?>" style="width:100px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-family:monospace" oninput="this.previousElementSibling.value=this.value" id="colorText">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">儲存</button>
        <a href="?tab=schedule_types" class="btn btn-secondary" style="margin-top:10px">取消</a>
    </form>
    <?php else: ?>
    <h2>新增行程類型</h2>
    <form method="post" class="edit-form">
        <input type="hidden" name="action" value="create">
        <label>類型名稱</label>
        <input type="text" name="name" placeholder="掃街" required>
        <label>標記顏色</label>
        <div style="display:flex;gap:8px;align-items:center">
            <input type="color" name="color" value="#28c8c8" style="width:50px;height:36px;border:1px solid #ccc;border-radius:4px;cursor:pointer">
            <input type="text" name="color_text" value="#28c8c8" style="width:100px;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;font-family:monospace" oninput="this.previousElementSibling.value=this.value" id="colorText">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top:10px">新增</button>
    </form>
    <?php endif; ?>
</div>

<div class="card">
    <h2>行程類型列表 (<?= count($scheduleTypes) ?> 筆)</h2>
    <table>
        <thead>
            <tr><th>#</th><th>名稱</th><th>顏色</th><th>預覽</th><th>操作</th></tr>
        </thead>
        <tbody>
        <?php foreach (array_reverse($scheduleTypes, true) as $i => $st): ?>
            <tr<?= $editIndex === $i ? ' class="editing"' : '' ?>>
                <td><?= $i ?></td>
                <td><?= htmlspecialchars($st['name'] ?? '') ?></td>
                <td style="font-family:monospace;font-size:12px"><?= htmlspecialchars($st['color'] ?? '') ?></td>
                <td><span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:<?= htmlspecialchars($st['color'] ?? '#ccc') ?>;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span></td>
                <td class="actions">
                    <a href="?tab=schedule_types&edit=<?= $i ?>" class="btn btn-sm btn-primary">編輯</a>
                    <form method="post" onsubmit="return confirm('確定刪除此類型？')">
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
