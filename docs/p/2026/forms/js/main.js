const DB_NAME = 'forms_db';
const DB_VERSION = 1;

const app = {
    db: null,
    currentView: 'donation',
    editingRecordId: null,
    editModal: null,

    async init() {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}`
        });
        const saved = localStorage.getItem(DB_NAME);
        if (saved) {
            const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
            this.db = new SQL.Database(buf);
        } else {
            this.db = new SQL.Database();
        }
        this.initSchema();
        this.editModal = new bootstrap.Modal(document.getElementById('editModal'));
        this.renderCurrentView();
    },

    initSchema() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                id_number TEXT,
                address TEXT,
                email TEXT,
                mail_address TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime'))
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS donations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER,
                amount INTEGER NOT NULL,
                donation_date TEXT NOT NULL,
                is_anonymous INTEGER DEFAULT 0,
                prefer_email_receipt INTEGER DEFAULT 0,
                note TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (profile_id) REFERENCES profiles(id)
            )
        `);
        this.db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_id_number ON profiles(id_number) WHERE id_number IS NOT NULL AND id_number != ''`);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        const existing = this.db.exec(`SELECT value FROM settings WHERE key = 'office_name'`);
        if (!existing.length || !existing[0].values.length) {
            this.db.run(`INSERT INTO settings (key, value) VALUES ('office_name', '○○○競選辦公室')`);
        }
        this.save();
    },

    getSetting(key) {
        const r = this.db.exec(`SELECT value FROM settings WHERE key = ?`, [key]);
        return (r.length && r[0].values.length) ? r[0].values[0][0] : '';
    },

    setSetting(key, value) {
        this.db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
        this.save();
    },

    save() {
        const data = this.db.export();
        const str = btoa(String.fromCharCode.apply(null, data));
        localStorage.setItem(DB_NAME, str);
    },

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.nav-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.view === view);
        });
        ['donation', 'profiles', 'records', 'settings'].forEach(v => {
            document.getElementById(`view-${v}`).classList.toggle('d-none', v !== view);
        });
        this.renderCurrentView();
    },

    renderCurrentView() {
        switch (this.currentView) {
            case 'donation': this.renderDonationForm(); break;
            case 'profiles': this.renderProfiles(); break;
            case 'records': this.renderRecords(); break;
            case 'settings': this.renderSettings(); break;
        }
    },

    renderDonationForm() {
        const today = new Date();
        const rocYear = today.getFullYear() - 1911;
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const defaultDate = `${rocYear}-${month}-${day}`;

        const officeName = this.getSetting('office_name');
        const container = document.getElementById('view-donation');
        container.innerHTML = `
            <div class="form-section">
                <div class="form-section-title">${this.escHtml(officeName)}現金捐款資料表</div>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">捐款日期</label>
                        <input type="text" class="form-control" id="d-date" value="${defaultDate}" placeholder="${rocYear}年MM月DD日">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">金額</label>
                        <input type="number" class="form-control" id="d-amount" min="1" placeholder="請輸入金額">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">是否匿名捐款</label>
                        <div class="d-flex gap-3 mt-2">
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="anonymous" id="anon-yes" value="1">
                                <label class="form-check-label" for="anon-yes">是（以下免填）</label>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="anonymous" id="anon-no" value="0" checked>
                                <label class="form-check-label" for="anon-no">否</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="donor-info-section">
                <div class="form-section">
                    <div class="row g-3">
                        <div class="col-md-6 position-relative">
                            <label class="form-label">姓名（必填）</label>
                            <input type="text" class="form-control" id="d-name" autocomplete="off" placeholder="輸入姓名搜尋或新增">
                            <div id="name-autocomplete" class="autocomplete-list d-none"></div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">身分證字號（必填）</label>
                            <input type="text" class="form-control" id="d-idnumber" placeholder="如 A123456789">
                        </div>
                        <div class="col-12">
                            <label class="form-label">戶籍地址（必填）</label>
                            <input type="text" class="form-control" id="d-address">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-title">索取收據請填下方</div>
                    <div class="row g-3">
                        <div class="col-md-8">
                            <label class="form-label">電子信箱</label>
                            <input type="email" class="form-control" id="d-email" placeholder="email@example.com">
                        </div>
                        <div class="col-md-4 d-flex align-items-end">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="d-prefer-email">
                                <label class="form-check-label" for="d-prefer-email">優先以電子方式寄件</label>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label">收件地址</label>
                            <input type="text" class="form-control" id="d-mail-address" placeholder="若與戶籍地址相同可留空">
                        </div>
                    </div>
                    <div class="mt-2 text-muted small">
                        此非捐款收據，如需捐款收據請填寫上方寄件資訊，因捐款仍需進行查證事宜，將盡速寄件予您，感謝您的支持與鼓勵。
                    </div>
                </div>
            </div>

            <div id="profile-suggestions" class="mb-3"></div>

            <div class="d-flex gap-2">
                <button class="btn btn-primary" onclick="app.saveDonation()">
                    <i class="bi bi-save"></i> 儲存捐款紀錄
                </button>
                <button class="btn btn-outline-secondary" onclick="app.resetDonationForm()">
                    <i class="bi bi-arrow-counterclockwise"></i> 清除表單
                </button>
            </div>
        `;

        document.querySelectorAll('input[name="anonymous"]').forEach(r => {
            r.addEventListener('change', () => {
                const section = document.getElementById('donor-info-section');
                section.style.display = r.value === '1' && r.checked ? 'none' : 'block';
            });
        });

        const nameInput = document.getElementById('d-name');
        nameInput.addEventListener('input', () => this.onNameInput());
        nameInput.addEventListener('focus', () => this.onNameInput());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#d-name') && !e.target.closest('#name-autocomplete')) {
                document.getElementById('name-autocomplete').classList.add('d-none');
            }
        });
    },

    onNameInput() {
        const val = document.getElementById('d-name').value.trim();
        const listEl = document.getElementById('name-autocomplete');
        if (val.length === 0) {
            listEl.classList.add('d-none');
            return;
        }
        const results = this.db.exec(`SELECT id, name, id_number, address, email, mail_address FROM profiles WHERE name LIKE ? ORDER BY updated_at DESC LIMIT 10`, [`%${val}%`]);
        if (!results.length || !results[0].values.length) {
            listEl.classList.add('d-none');
            return;
        }
        listEl.innerHTML = results[0].values.map(row => {
            const [id, name, idNum, addr] = row;
            return `<div class="autocomplete-item" data-profile-id="${id}">
                <strong>${this.escHtml(name)}</strong>
                <span class="text-muted ms-2">${this.escHtml(idNum || '')}</span>
                <br><small class="text-muted">${this.escHtml(addr || '')}</small>
            </div>`;
        }).join('');
        listEl.classList.remove('d-none');
        listEl.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => this.fillFromProfile(parseInt(item.dataset.profileId)));
        });
    },

    fillFromProfile(profileId) {
        const results = this.db.exec(`SELECT name, id_number, address, email, mail_address FROM profiles WHERE id = ?`, [profileId]);
        if (!results.length) return;
        const [name, idNum, address, email, mailAddr] = results[0].values[0];
        document.getElementById('d-name').value = name || '';
        document.getElementById('d-idnumber').value = idNum || '';
        document.getElementById('d-address').value = address || '';
        document.getElementById('d-email').value = email || '';
        document.getElementById('d-mail-address').value = mailAddr || '';
        document.getElementById('d-name').dataset.profileId = profileId;
        document.getElementById('name-autocomplete').classList.add('d-none');
    },

    saveDonation() {
        const amount = parseInt(document.getElementById('d-amount').value);
        const date = document.getElementById('d-date').value.trim();
        const isAnonymous = document.querySelector('input[name="anonymous"]:checked')?.value === '1';

        if (!amount || amount <= 0) {
            alert('請輸入有效金額');
            return;
        }
        if (!date) {
            alert('請輸入捐款日期');
            return;
        }

        let profileId = null;
        if (!isAnonymous) {
            const name = document.getElementById('d-name').value.trim();
            const idNumber = document.getElementById('d-idnumber').value.trim();
            const address = document.getElementById('d-address').value.trim();
            const email = document.getElementById('d-email').value.trim();
            const mailAddress = document.getElementById('d-mail-address').value.trim();

            if (!name) { alert('請輸入姓名'); return; }
            if (!idNumber) { alert('請輸入身分證字號'); return; }
            if (!address) { alert('請輸入戶籍地址'); return; }

            profileId = this.upsertProfile(name, idNumber, address, email, mailAddress);
        }

        const preferEmail = !isAnonymous && document.getElementById('d-prefer-email').checked ? 1 : 0;

        this.db.run(
            `INSERT INTO donations (profile_id, amount, donation_date, is_anonymous, prefer_email_receipt) VALUES (?, ?, ?, ?, ?)`,
            [profileId, amount, date, isAnonymous ? 1 : 0, preferEmail]
        );
        this.save();
        alert('捐款紀錄已儲存！');
        this.resetDonationForm();
    },

    upsertProfile(name, idNumber, address, email, mailAddress) {
        const existing = this.db.exec(`SELECT id FROM profiles WHERE id_number = ? AND id_number != ''`, [idNumber]);
        if (existing.length && existing[0].values.length) {
            const id = existing[0].values[0][0];
            this.db.run(
                `UPDATE profiles SET name=?, address=?, email=?, mail_address=?, updated_at=datetime('now','localtime') WHERE id=?`,
                [name, address, email, mailAddress, id]
            );
            this.save();
            return id;
        }
        this.db.run(
            `INSERT INTO profiles (name, id_number, address, email, mail_address) VALUES (?, ?, ?, ?, ?)`,
            [name, idNumber, address, email, mailAddress]
        );
        this.save();
        const result = this.db.exec(`SELECT last_insert_rowid()`);
        return result[0].values[0][0];
    },

    resetDonationForm() {
        this.renderDonationForm();
    },

    renderProfiles() {
        const container = document.getElementById('view-profiles');
        const results = this.db.exec(`
            SELECT p.id, p.name, p.id_number, p.address, p.email, p.mail_address,
                   COUNT(d.id) as donation_count, COALESCE(SUM(d.amount),0) as total_amount
            FROM profiles p
            LEFT JOIN donations d ON d.profile_id = p.id
            GROUP BY p.id
            ORDER BY p.updated_at DESC
        `);

        let html = `<div class="form-section">
            <div class="form-section-title">個人資料管理</div>
            <p class="text-muted small">個人資料會在輸入捐款時自動建立，相同身分證字號會自動合併更新。</p>`;

        if (!results.length || !results[0].values.length) {
            html += `<p class="text-muted">尚無資料</p>`;
        } else {
            html += `<div class="table-responsive"><table class="table table-hover">
                <thead><tr>
                    <th>姓名</th><th>身分證字號</th><th>戶籍地址</th><th>捐款次數</th><th>捐款總額</th><th></th>
                </tr></thead><tbody>`;
            results[0].values.forEach(row => {
                const [id, name, idNum, addr, email, mailAddr, count, total] = row;
                html += `<tr>
                    <td>${this.escHtml(name)}</td>
                    <td>${this.escHtml(this.maskIdNumber(idNum))}</td>
                    <td>${this.escHtml(addr || '')}</td>
                    <td>${count}</td>
                    <td>${total.toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editProfile(${id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteProfile(${id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    },

    editProfile(id) {
        const results = this.db.exec(`SELECT name, id_number, address, email, mail_address FROM profiles WHERE id = ?`, [id]);
        if (!results.length) return;
        const [name, idNum, address, email, mailAddr] = results[0].values[0];

        document.getElementById('editModalTitle').textContent = '編輯個人資料';
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label">姓名</label>
                    <input type="text" class="form-control" id="ep-name" value="${this.escAttr(name)}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">身分證字號</label>
                    <input type="text" class="form-control" id="ep-idnumber" value="${this.escAttr(idNum || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label">戶籍地址</label>
                    <input type="text" class="form-control" id="ep-address" value="${this.escAttr(address || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">電子信箱</label>
                    <input type="email" class="form-control" id="ep-email" value="${this.escAttr(email || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">收件地址</label>
                    <input type="text" class="form-control" id="ep-mail-address" value="${this.escAttr(mailAddr || '')}">
                </div>
            </div>
        `;

        const deleteBtn = document.getElementById('editModalDelete');
        deleteBtn.classList.remove('d-none');
        this.editingRecordId = id;

        const saveBtn = document.getElementById('editModalSave');
        saveBtn.onclick = () => {
            this.db.run(
                `UPDATE profiles SET name=?, id_number=?, address=?, email=?, mail_address=?, updated_at=datetime('now','localtime') WHERE id=?`,
                [
                    document.getElementById('ep-name').value.trim(),
                    document.getElementById('ep-idnumber').value.trim(),
                    document.getElementById('ep-address').value.trim(),
                    document.getElementById('ep-email').value.trim(),
                    document.getElementById('ep-mail-address').value.trim(),
                    id
                ]
            );
            this.save();
            this.editModal.hide();
            this.renderProfiles();
        };

        deleteBtn.onclick = () => {
            if (confirm('確定刪除此人資料？相關捐款紀錄將保留但不再連結此人。')) {
                this.db.run(`UPDATE donations SET profile_id = NULL WHERE profile_id = ?`, [id]);
                this.db.run(`DELETE FROM profiles WHERE id = ?`, [id]);
                this.save();
                this.editModal.hide();
                this.renderProfiles();
            }
        };

        this.editModal.show();
    },

    deleteProfile(id) {
        if (!confirm('確定刪除此人資料？')) return;
        this.db.run(`UPDATE donations SET profile_id = NULL WHERE profile_id = ?`, [id]);
        this.db.run(`DELETE FROM profiles WHERE id = ?`, [id]);
        this.save();
        this.renderProfiles();
    },

    renderRecords() {
        const container = document.getElementById('view-records');
        const results = this.db.exec(`
            SELECT d.id, d.amount, d.donation_date, d.is_anonymous, d.prefer_email_receipt,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            ORDER BY d.created_at DESC
        `);

        let html = `<div class="form-section">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="form-section-title mb-0">捐款紀錄</div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="app.printRecords()">
                        <i class="bi bi-printer"></i> 列印表單
                    </button>
                    <button class="btn btn-outline-success btn-sm" onclick="app.exportCSV()">
                        <i class="bi bi-filetype-csv"></i> 匯出 CSV
                    </button>
                </div>
            </div>`;

        if (!results.length || !results[0].values.length) {
            html += `<p class="text-muted">尚無捐款紀錄</p>`;
        } else {
            const totalAmount = results[0].values.reduce((sum, r) => sum + r[1], 0);
            const totalCount = results[0].values.length;
            html += `<div class="alert alert-info">共 ${totalCount} 筆捐款，總金額 NT$ ${totalAmount.toLocaleString()}</div>`;

            html += `<div class="table-responsive"><table class="table table-hover">
                <thead><tr>
                    <th>日期</th><th>金額</th><th>捐款人</th><th>身分證字號</th><th>匿名</th><th></th>
                </tr></thead><tbody>`;
            results[0].values.forEach(row => {
                const [id, amount, date, isAnon, preferEmail, name, idNum] = row;
                html += `<tr>
                    <td>${this.escHtml(date)}</td>
                    <td class="text-end">${amount.toLocaleString()}</td>
                    <td>${isAnon ? '<span class="badge-anonymous">匿名</span>' : this.escHtml(name || '—')}</td>
                    <td>${isAnon ? '' : this.escHtml(this.maskIdNumber(idNum))}</td>
                    <td>${isAnon ? '是' : '否'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editDonation(${id})"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteDonation(${id})"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    },

    editDonation(id) {
        const results = this.db.exec(`
            SELECT d.amount, d.donation_date, d.is_anonymous, d.prefer_email_receipt, d.profile_id,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            WHERE d.id = ?
        `, [id]);
        if (!results.length) return;
        const [amount, date, isAnon, preferEmail, profileId, name, idNum, address, email, mailAddr] = results[0].values[0];

        document.getElementById('editModalTitle').textContent = '編輯捐款紀錄';
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">捐款日期</label>
                    <input type="text" class="form-control" id="ed-date" value="${this.escAttr(date)}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">金額</label>
                    <input type="number" class="form-control" id="ed-amount" value="${amount}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">匿名捐款</label>
                    <select class="form-select" id="ed-anonymous">
                        <option value="0" ${!isAnon ? 'selected' : ''}>否</option>
                        <option value="1" ${isAnon ? 'selected' : ''}>是</option>
                    </select>
                </div>
                ${!isAnon ? `
                <div class="col-md-6">
                    <label class="form-label">姓名</label>
                    <input type="text" class="form-control" id="ed-name" value="${this.escAttr(name || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">身分證字號</label>
                    <input type="text" class="form-control" id="ed-idnumber" value="${this.escAttr(idNum || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label">戶籍地址</label>
                    <input type="text" class="form-control" id="ed-address" value="${this.escAttr(address || '')}">
                </div>
                ` : ''}
            </div>
        `;

        const deleteBtn = document.getElementById('editModalDelete');
        deleteBtn.classList.remove('d-none');
        this.editingRecordId = id;

        const saveBtn = document.getElementById('editModalSave');
        saveBtn.onclick = () => {
            const newAmount = parseInt(document.getElementById('ed-amount').value);
            const newDate = document.getElementById('ed-date').value.trim();
            const newAnon = document.getElementById('ed-anonymous').value === '1' ? 1 : 0;

            this.db.run(
                `UPDATE donations SET amount=?, donation_date=?, is_anonymous=? WHERE id=?`,
                [newAmount, newDate, newAnon, id]
            );

            if (!newAnon && profileId) {
                const nameEl = document.getElementById('ed-name');
                const idEl = document.getElementById('ed-idnumber');
                const addrEl = document.getElementById('ed-address');
                if (nameEl && idEl && addrEl) {
                    this.db.run(
                        `UPDATE profiles SET name=?, id_number=?, address=?, updated_at=datetime('now','localtime') WHERE id=?`,
                        [nameEl.value.trim(), idEl.value.trim(), addrEl.value.trim(), profileId]
                    );
                }
            }
            this.save();
            this.editModal.hide();
            this.renderRecords();
        };

        deleteBtn.onclick = () => {
            if (confirm('確定刪除此捐款紀錄？')) {
                this.db.run(`DELETE FROM donations WHERE id = ?`, [id]);
                this.save();
                this.editModal.hide();
                this.renderRecords();
            }
        };

        this.editModal.show();
    },

    deleteDonation(id) {
        if (!confirm('確定刪除此捐款紀錄？')) return;
        this.db.run(`DELETE FROM donations WHERE id = ?`, [id]);
        this.save();
        this.renderRecords();
    },

    deleteCurrentRecord() {
        // handled by editProfile/editDonation deleteBtn.onclick
    },

    printRecords() {
        const results = this.db.exec(`
            SELECT d.amount, d.donation_date, d.is_anonymous, d.prefer_email_receipt,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            ORDER BY d.created_at DESC
        `);
        if (!results.length || !results[0].values.length) {
            alert('無捐款紀錄可列印');
            return;
        }

        const officeName = this.getSetting('office_name');
        const printArea = document.getElementById('printArea');
        let html = '';
        results[0].values.forEach((row, i) => {
            const [amount, date, isAnon, preferEmail, name, idNum, address, email, mailAddr] = row;
            html += `
            <div class="print-form ${i < results[0].values.length - 1 ? 'print-page-break' : ''}">
                <h5 style="text-align:center">${this.escHtml(officeName)}現金捐款資料表</h5>
                <table style="margin-bottom:4px">
                    <tr>
                        <td colspan="4" style="text-align:right; border:none; padding:4px">
                            捐款日期 &nbsp; ${this.escHtml(date)}
                        </td>
                    </tr>
                </table>
                <table>
                    <tr>
                        <th>金額</th>
                        <td>${amount.toLocaleString()}</td>
                        <th>是否匿名捐款</th>
                        <td>${isAnon ? '☑ 是（以下免填）' : '☐ 是 &nbsp; ☑ 否'}</td>
                    </tr>
                </table>
                ${!isAnon ? `
                <table style="margin-top:8px">
                    <tr>
                        <th>姓名（必填）</th>
                        <td>${this.escHtml(name || '')}</td>
                        <th>身分證字號（必填）</th>
                        <td>${this.escHtml(idNum || '')}</td>
                    </tr>
                    <tr>
                        <th>戶籍地址（必填）</th>
                        <td colspan="3">${this.escHtml(address || '')}</td>
                    </tr>
                </table>
                <table style="margin-top:8px">
                    <tr><th colspan="4" style="text-align:left">索取收據請填下方</th></tr>
                    <tr>
                        <th>電子信箱</th>
                        <td>${this.escHtml(email || '')}</td>
                        <td colspan="2">${preferEmail ? '☑' : '☐'} 優先以電子方式寄件</td>
                    </tr>
                    <tr>
                        <th>收件地址</th>
                        <td colspan="3">${this.escHtml(mailAddr || '')}</td>
                    </tr>
                </table>
                <p style="font-size:0.85rem;margin-top:8px;color:#666">
                    此非捐款收據，如需捐款收據請填寫上方寄件資訊，因捐款仍需進行查證事宜，將盡速寄件予您，感謝您的支持與鼓勵。
                </p>
                ` : ''}
            </div>`;
        });

        printArea.innerHTML = html;
        printArea.classList.remove('d-none');
        window.print();
        printArea.classList.add('d-none');
    },

    exportCSV() {
        const results = this.db.exec(`
            SELECT d.donation_date, d.amount, d.is_anonymous, d.prefer_email_receipt,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            ORDER BY d.created_at DESC
        `);
        if (!results.length || !results[0].values.length) {
            alert('無資料可匯出');
            return;
        }

        const headers = ['捐款日期', '金額', '匿名', '電子收據', '姓名', '身分證字號', '戶籍地址', '電子信箱', '收件地址'];
        const csvContent = [
            headers.join(','),
            ...results[0].values.map(row =>
                row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n');

        const bom = '﻿';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `donations_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportData() {
        const data = this.db.export();
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forms_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!confirm('匯入將覆蓋現有資料，確定繼續？')) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const SQL = this.db.constructor;
                const buf = new Uint8Array(e.target.result);
                this.db = new SQL.Database(buf);
                this.save();
                this.renderCurrentView();
                alert('匯入成功！');
            } catch (err) {
                alert('匯入失敗：' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    },

    renderSettings() {
        const officeName = this.getSetting('office_name');
        const container = document.getElementById('view-settings');
        container.innerHTML = `
            <div class="form-section">
                <div class="form-section-title">共用設定</div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">競選辦公室名稱</label>
                        <input type="text" class="form-control" id="s-office-name" value="${this.escAttr(officeName)}" placeholder="例如：王小明競選辦公室">
                        <div class="form-text">此名稱會顯示在捐款資料表標題及列印表單上</div>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="app.saveSettings()">
                        <i class="bi bi-save"></i> 儲存設定
                    </button>
                </div>
            </div>
        `;
    },

    saveSettings() {
        const officeName = document.getElementById('s-office-name').value.trim();
        if (!officeName) {
            alert('請輸入競選辦公室名稱');
            return;
        }
        this.setSetting('office_name', officeName);
        alert('設定已儲存！');
        this.renderSettings();
    },

    maskIdNumber(id) {
        if (!id || id.length < 4) return id || '';
        return id.substring(0, 4) + '****' + id.substring(id.length - 2);
    },

    escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    escAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
