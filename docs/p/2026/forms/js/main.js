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
        this.migrateColumn('profiles', 'phone', 'TEXT');
        this.migrateColumn('profiles', 'contact_address', 'TEXT');
        this.db.run(`
            CREATE TABLE IF NOT EXISTS labor_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER,
                apply_date TEXT NOT NULL,
                service_type TEXT,
                service_content TEXT,
                amount INTEGER NOT NULL,
                income_type TEXT DEFAULT '928Z',
                payment_method TEXT DEFAULT 'cash',
                bank_name TEXT,
                bank_branch TEXT,
                bank_account TEXT,
                handler TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (profile_id) REFERENCES profiles(id)
            )
        `);
        this.db.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
        this.migrateColumn('donations', 'handler', 'TEXT');
        const existing = this.db.exec(`SELECT value FROM settings WHERE key = 'office_name'`);
        if (!existing.length || !existing[0].values.length) {
            this.db.run(`INSERT INTO settings (key, value) VALUES ('office_name', '○○○競選辦公室')`);
        }
        const handlerExists = this.db.exec(`SELECT value FROM settings WHERE key = 'default_handler'`);
        if (!handlerExists.length || !handlerExists[0].values.length) {
            this.db.run(`INSERT INTO settings (key, value) VALUES ('default_handler', '')`);
        }
        const donationNote = this.db.exec(`SELECT value FROM settings WHERE key = 'donation_note'`);
        if (!donationNote.length || !donationNote[0].values.length) {
            this.db.run(`INSERT INTO settings (key, value) VALUES ('donation_note', '此非捐款收據，如需捐款收據請填寫上方寄件資訊，因捐款仍需進行查證事宜，將盡速寄件予您，感謝您的支持與鼓勵。')`);
        }
        const laborNote = this.db.exec(`SELECT value FROM settings WHERE key = 'labor_note'`);
        if (!laborNote.length || !laborNote[0].values.length) {
            this.db.run(`INSERT INTO settings (key, value) VALUES ('labor_note', '1.勞務報酬單請確實並親筆填寫，文件內容不可塗改。\n2.請務必於115年度綜合所得稅申報時自行加計本筆所得，避免違反所得稅法規定，因競選辦公室依以個人名義無需辦理扣繳申報，故所得稅無法自動匯入。\n3.本人確保所提供之資料並無不實之情事，亦無侵害他人權益或偽造偽造，如遭受他人質疑，若有不實，願自負一切民、刑事責任及賠償責任。經本人簽名即代表確認資料填寫無誤。')`);
        }
        this.save();
    },

    migrateColumn(table, column, type) {
        const cols = this.db.exec(`PRAGMA table_info(${table})`);
        if (cols.length && cols[0].values.some(c => c[1] === column)) return;
        this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
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
        ['donation', 'profiles', 'records', 'labor', 'labor-records', 'settings'].forEach(v => {
            document.getElementById(`view-${v}`).classList.toggle('d-none', v !== view);
        });
        this.renderCurrentView();
    },

    renderCurrentView() {
        switch (this.currentView) {
            case 'donation': this.renderDonationForm(); break;
            case 'profiles': this.renderProfiles(); break;
            case 'records': this.renderRecords(); break;
            case 'labor': this.renderLaborForm(); break;
            case 'labor-records': this.renderLaborRecords(); break;
            case 'settings': this.renderSettings(); break;
        }
    },

    rocToIso(roc) {
        const m = (roc || '').match(/^(\d+)-(\d+)-(\d+)$/);
        if (!m) return '';
        return `${parseInt(m[1]) + 1911}-${m[2]}-${m[3]}`;
    },

    isoToRoc(iso) {
        const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return '';
        return `${parseInt(m[1]) - 1911}-${m[2]}-${m[3]}`;
    },

    renderDonationForm() {
        const today = new Date().toISOString().slice(0, 10);

        const officeName = this.getSetting('office_name');
        const defaultHandler = this.getSetting('default_handler');
        const container = document.getElementById('view-donation');
        container.innerHTML = `
            <div class="form-section">
                <div class="form-section-title">${this.escHtml(officeName)}現金捐款資料表</div>
                <div class="row g-3">
                    <div class="col-md-3">
                        <label class="form-label">捐款日期</label>
                        <input type="date" class="form-control" id="d-date" value="${today}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">金額</label>
                        <input type="number" class="form-control" id="d-amount" min="1" placeholder="請輸入金額">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">經手人</label>
                        <input type="text" class="form-control" id="d-handler" value="${this.escAttr(defaultHandler)}" placeholder="經手人姓名">
                    </div>
                    <div class="col-md-3">
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
                        ${this.escHtml(this.getSetting('donation_note'))}
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
        const date = this.isoToRoc(document.getElementById('d-date').value.trim());
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
        const handler = document.getElementById('d-handler').value.trim();

        this.db.run(
            `INSERT INTO donations (profile_id, amount, donation_date, is_anonymous, prefer_email_receipt, handler) VALUES (?, ?, ?, ?, ?, ?)`,
            [profileId, amount, date, isAnonymous ? 1 : 0, preferEmail, handler]
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
        const result = this.db.exec(`SELECT last_insert_rowid()`);
        const newId = result[0].values[0][0];
        this.save();
        return newId;
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
        const results = this.db.exec(`SELECT name, id_number, address, email, mail_address, phone, contact_address FROM profiles WHERE id = ?`, [id]);
        if (!results.length) return;
        const [name, idNum, address, email, mailAddr, phone, contactAddr] = results[0].values[0];

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
                <div class="col-md-6">
                    <label class="form-label">連絡電話</label>
                    <input type="text" class="form-control" id="ep-phone" value="${this.escAttr(phone || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">電子信箱</label>
                    <input type="email" class="form-control" id="ep-email" value="${this.escAttr(email || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label">戶籍地址</label>
                    <input type="text" class="form-control" id="ep-address" value="${this.escAttr(address || '')}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">通訊地址</label>
                    <input type="text" class="form-control" id="ep-contact-address" value="${this.escAttr(contactAddr || '')}">
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
                `UPDATE profiles SET name=?, id_number=?, address=?, email=?, mail_address=?, phone=?, contact_address=?, updated_at=datetime('now','localtime') WHERE id=?`,
                [
                    document.getElementById('ep-name').value.trim(),
                    document.getElementById('ep-idnumber').value.trim(),
                    document.getElementById('ep-address').value.trim(),
                    document.getElementById('ep-email').value.trim(),
                    document.getElementById('ep-mail-address').value.trim(),
                    document.getElementById('ep-phone').value.trim(),
                    document.getElementById('ep-contact-address').value.trim(),
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
                   d.handler, p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            ORDER BY d.created_at DESC
        `);

        let html = `<div class="form-section">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="form-section-title mb-0">捐款紀錄</div>
                <div class="d-flex gap-2">
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
                    <th>日期</th><th>金額</th><th>捐款人</th><th>身分證字號</th><th>經手人</th><th>匿名</th><th></th>
                </tr></thead><tbody>`;
            results[0].values.forEach(row => {
                const [id, amount, date, isAnon, preferEmail, handler, name, idNum] = row;
                html += `<tr>
                    <td>${this.escHtml(date)}</td>
                    <td class="text-end">${amount.toLocaleString()}</td>
                    <td>${isAnon ? '<span class="badge-anonymous">匿名</span>' : this.escHtml(name || '—')}</td>
                    <td>${isAnon ? '' : this.escHtml(this.maskIdNumber(idNum))}</td>
                    <td>${this.escHtml(handler || '')}</td>
                    <td>${isAnon ? '是' : '否'}</td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" onclick="app.printDonation(${id})" title="列印"><i class="bi bi-printer"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editDonation(${id})" title="編輯"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteDonation(${id})" title="刪除"><i class="bi bi-trash"></i></button>
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
            SELECT d.amount, d.donation_date, d.is_anonymous, d.prefer_email_receipt, d.profile_id, d.handler,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            WHERE d.id = ?
        `, [id]);
        if (!results.length) return;
        const [amount, date, isAnon, preferEmail, profileId, handler, name, idNum, address, email, mailAddr] = results[0].values[0];

        document.getElementById('editModalTitle').textContent = '編輯捐款紀錄';
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">捐款日期</label>
                    <input type="date" class="form-control" id="ed-date" value="${this.escAttr(this.rocToIso(date))}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">金額</label>
                    <input type="number" class="form-control" id="ed-amount" value="${amount}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">經手人</label>
                    <input type="text" class="form-control" id="ed-handler" value="${this.escAttr(handler || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">匿名捐款</label>
                    <select class="form-select" id="ed-anonymous">
                        <option value="0" ${!isAnon ? 'selected' : ''}>否</option>
                        <option value="1" ${isAnon ? 'selected' : ''}>是</option>
                    </select>
                </div>
                ${!isAnon ? `
                <div class="col-md-4">
                    <label class="form-label">姓名</label>
                    <input type="text" class="form-control" id="ed-name" value="${this.escAttr(name || '')}">
                </div>
                <div class="col-md-4">
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
            const newDate = this.isoToRoc(document.getElementById('ed-date').value.trim());
            const newAnon = document.getElementById('ed-anonymous').value === '1' ? 1 : 0;
            const newHandler = document.getElementById('ed-handler').value.trim();

            this.db.run(
                `UPDATE donations SET amount=?, donation_date=?, is_anonymous=?, handler=? WHERE id=?`,
                [newAmount, newDate, newAnon, newHandler, id]
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

    buildPrintHalf(officeName, row, isTop) {
        const [amount, date, isAnon, preferEmail, handler, name, idNum, address, email, mailAddr] = row;
        const dateParts = (date || '').match(/^(\d+)-(\d+)-(\d+)$/);
        const dateDisplay = dateParts ? `${dateParts[1]}年 ${dateParts[2]}月 ${dateParts[3]}日` : this.escHtml(date);

        const copyLabel = isTop ? '存根聯' : '收執聯';
        let html = `<div class="print-half">
            <h6 style="text-align:center;margin:0 0 4px">${this.escHtml(officeName)}現金捐款資料表<span style="font-size:0.8rem;margin-left:8px;font-weight:normal">（${copyLabel}）</span></h6>
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
                ${isTop ? '<span>一萬元以下專用</span>' : '<span></span>'}
                <span>經手人：${this.escHtml(handler || '')} &nbsp;&nbsp; 捐款日期 &nbsp; ${dateDisplay}</span>
            </div>
            <table>
                <tr>
                    <th>金額</th>
                    <td>${amount.toLocaleString()}</td>
                    ${isTop ? `
                    <th>是否匿名捐款</th>
                    <td>${isAnon ? '☑ 是（以下免填）' : '☐ 是（以下免填）&nbsp; ☑ 否'}</td>
                    ` : '<td colspan="2"></td>'}
                </tr>
            </table>
            <table style="margin-top:6px">
                <tr>
                    <th>姓名（必填）</th>
                    <td>${this.escHtml((!isAnon ? name : '') || '')}</td>
                    <th>身分證字號（必填）</th>
                    <td>${this.escHtml((!isAnon ? idNum : '') || '')}</td>
                </tr>
                <tr>
                    <th>戶籍地址（必填）</th>
                    <td colspan="3">${this.escHtml((!isAnon ? address : '') || '')}</td>
                </tr>
            </table>
            <table style="margin-top:6px">
                <tr><th colspan="4" style="text-align:left">索取收據請填下方</th></tr>
                <tr>
                    <th>電子信箱</th>
                    <td>${this.escHtml((!isAnon ? email : '') || '')}</td>
                    <td colspan="2">${!isAnon && preferEmail ? '☑' : '☐'} 優先以電子方式寄件</td>
                </tr>
                <tr>
                    <th>收件地址</th>
                    <td colspan="3">${this.escHtml((!isAnon ? mailAddr : '') || '')}</td>
                </tr>
            </table>
            <p style="font-size:0.8rem;margin:4px 0 0;color:#666">
                ${this.escHtml(this.getSetting('donation_note'))}
            </p>
        </div>`;
        return html;
    },

    printDonation(id) {
        const results = this.db.exec(`
            SELECT d.amount, d.donation_date, d.is_anonymous, d.prefer_email_receipt, d.handler,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            WHERE d.id = ?
        `, [id]);
        if (!results.length || !results[0].values.length) return;

        const officeName = this.getSetting('office_name');
        const row = results[0].values[0];
        const printArea = document.getElementById('printArea');
        printArea.innerHTML = `<div class="print-form">
            ${this.buildPrintHalf(officeName, row, true)}
            <hr class="print-cut-line">
            ${this.buildPrintHalf(officeName, row, false)}
        </div>`;
        printArea.classList.remove('d-none');
        window.print();
        printArea.classList.add('d-none');
    },

    exportCSV() {
        const results = this.db.exec(`
            SELECT d.donation_date, d.amount, d.is_anonymous, d.prefer_email_receipt, d.handler,
                   p.name, p.id_number, p.address, p.email, p.mail_address
            FROM donations d
            LEFT JOIN profiles p ON d.profile_id = p.id
            ORDER BY d.created_at DESC
        `);
        if (!results.length || !results[0].values.length) {
            alert('無資料可匯出');
            return;
        }

        const headers = ['捐款日期', '金額', '匿名', '電子收據', '經手人', '姓名', '身分證字號', '戶籍地址', '電子信箱', '收件地址'];
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

    renderLaborForm() {
        const today = new Date().toISOString().slice(0, 10);
        const officeName = this.getSetting('office_name');
        const defaultHandler = this.getSetting('default_handler');
        const container = document.getElementById('view-labor');
        container.innerHTML = `
            <div class="form-section">
                <div class="form-section-title">${this.escHtml(officeName)}勞務報酬單</div>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">申請日期</label>
                        <input type="date" class="form-control" id="l-date" value="${today}">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">經手人</label>
                        <input type="text" class="form-control" id="l-handler" value="${this.escAttr(defaultHandler)}">
                    </div>
                </div>
            </div>
            <div class="form-section">
                <div class="row g-3">
                    <div class="col-md-6 position-relative">
                        <label class="form-label">所得人姓名（必填）</label>
                        <input type="text" class="form-control" id="l-name" autocomplete="off" placeholder="輸入姓名搜尋或新增">
                        <div id="labor-name-autocomplete" class="autocomplete-list d-none"></div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">身分證字號（必填）</label>
                        <input type="text" class="form-control" id="l-idnumber" placeholder="如 A123456789">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">連絡電話</label>
                        <input type="text" class="form-control" id="l-phone">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">電子郵件</label>
                        <input type="email" class="form-control" id="l-email">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">戶籍地址</label>
                        <input type="text" class="form-control" id="l-address">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">通訊地址</label>
                        <input type="text" class="form-control" id="l-contact-address">
                    </div>
                </div>
            </div>
            <div class="form-section">
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">服務類別</label>
                        <input type="text" class="form-control" id="l-service-type" placeholder="例如：文宣、活動支援">
                    </div>
                    <div class="col-md-8">
                        <label class="form-label">服務內容</label>
                        <input type="text" class="form-control" id="l-service-content">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">應領金額</label>
                        <input type="number" class="form-control" id="l-amount" min="1" placeholder="請輸入金額">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">所得類別</label>
                        <select class="form-select" id="l-income-type">
                            <option value="50">非固定薪資 (50)</option>
                            <option value="9A" selected>執行業務報酬 (9A)</option>
                            <option value="928Z">其他所得 (928Z)</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">付款方式</label>
                        <select class="form-select" id="l-payment-method" onchange="app.toggleBankFields()">
                            <option value="cash">現金</option>
                            <option value="transfer">匯款</option>
                        </select>
                    </div>
                    <div id="bank-fields" class="col-12 d-none">
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">銀行名稱</label>
                                <input type="text" class="form-control" id="l-bank-name">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">分行</label>
                                <input type="text" class="form-control" id="l-bank-branch">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">銀行帳號</label>
                                <input type="text" class="form-control" id="l-bank-account">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-primary" onclick="app.saveLaborPayment()">
                    <i class="bi bi-save"></i> 儲存勞務報酬單
                </button>
                <button class="btn btn-outline-secondary" onclick="app.resetLaborForm()">
                    <i class="bi bi-arrow-counterclockwise"></i> 清除表單
                </button>
            </div>
        `;

        const nameInput = document.getElementById('l-name');
        nameInput.addEventListener('input', () => this.onLaborNameInput());
        nameInput.addEventListener('focus', () => this.onLaborNameInput());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#l-name') && !e.target.closest('#labor-name-autocomplete')) {
                document.getElementById('labor-name-autocomplete').classList.add('d-none');
            }
        });
    },

    toggleBankFields() {
        const method = document.getElementById('l-payment-method').value;
        document.getElementById('bank-fields').classList.toggle('d-none', method !== 'transfer');
    },

    onLaborNameInput() {
        const val = document.getElementById('l-name').value.trim();
        const listEl = document.getElementById('labor-name-autocomplete');
        if (val.length === 0) { listEl.classList.add('d-none'); return; }
        const results = this.db.exec(`SELECT id, name, id_number, address, phone, email, contact_address FROM profiles WHERE name LIKE ? ORDER BY updated_at DESC LIMIT 10`, [`%${val}%`]);
        if (!results.length || !results[0].values.length) { listEl.classList.add('d-none'); return; }
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
            item.addEventListener('click', () => this.fillLaborFromProfile(parseInt(item.dataset.profileId)));
        });
    },

    fillLaborFromProfile(profileId) {
        const results = this.db.exec(`SELECT name, id_number, address, email, phone, contact_address FROM profiles WHERE id = ?`, [profileId]);
        if (!results.length) return;
        const [name, idNum, address, email, phone, contactAddr] = results[0].values[0];
        document.getElementById('l-name').value = name || '';
        document.getElementById('l-idnumber').value = idNum || '';
        document.getElementById('l-address').value = address || '';
        document.getElementById('l-email').value = email || '';
        document.getElementById('l-phone').value = phone || '';
        document.getElementById('l-contact-address').value = contactAddr || '';
        document.getElementById('l-name').dataset.profileId = profileId;
        document.getElementById('labor-name-autocomplete').classList.add('d-none');
    },

    saveLaborPayment() {
        const applyDate = this.isoToRoc(document.getElementById('l-date').value.trim());
        const name = document.getElementById('l-name').value.trim();
        const idNumber = document.getElementById('l-idnumber').value.trim();
        const amount = parseInt(document.getElementById('l-amount').value);

        if (!applyDate) { alert('請選擇申請日期'); return; }
        if (!name) { alert('請輸入所得人姓名'); return; }
        if (!idNumber) { alert('請輸入身分證字號'); return; }
        if (!amount || amount <= 0) { alert('請輸入有效金額'); return; }

        const address = document.getElementById('l-address').value.trim();
        const email = document.getElementById('l-email').value.trim();
        const phone = document.getElementById('l-phone').value.trim();
        const contactAddr = document.getElementById('l-contact-address').value.trim();

        const profileId = this.upsertLaborProfile(name, idNumber, address, email, phone, contactAddr);

        const serviceType = document.getElementById('l-service-type').value.trim();
        const serviceContent = document.getElementById('l-service-content').value.trim();
        const incomeType = document.getElementById('l-income-type').value;
        const paymentMethod = document.getElementById('l-payment-method').value;
        const bankName = document.getElementById('l-bank-name')?.value.trim() || '';
        const bankBranch = document.getElementById('l-bank-branch')?.value.trim() || '';
        const bankAccount = document.getElementById('l-bank-account')?.value.trim() || '';
        const handler = document.getElementById('l-handler').value.trim();

        this.db.run(
            `INSERT INTO labor_payments (profile_id, apply_date, service_type, service_content, amount, income_type, payment_method, bank_name, bank_branch, bank_account, handler) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [profileId, applyDate, serviceType, serviceContent, amount, incomeType, paymentMethod, bankName, bankBranch, bankAccount, handler]
        );
        this.save();
        alert('勞務報酬單已儲存！');
        this.resetLaborForm();
    },

    upsertLaborProfile(name, idNumber, address, email, phone, contactAddr) {
        const existing = this.db.exec(`SELECT id FROM profiles WHERE id_number = ? AND id_number != ''`, [idNumber]);
        if (existing.length && existing[0].values.length) {
            const id = existing[0].values[0][0];
            this.db.run(
                `UPDATE profiles SET name=?, address=?, email=?, phone=?, contact_address=?, updated_at=datetime('now','localtime') WHERE id=?`,
                [name, address, email, phone, contactAddr, id]
            );
            this.save();
            return id;
        }
        this.db.run(
            `INSERT INTO profiles (name, id_number, address, email, phone, contact_address) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, idNumber, address, email, phone, contactAddr]
        );
        const result = this.db.exec(`SELECT last_insert_rowid()`);
        const newId = result[0].values[0][0];
        this.save();
        return newId;
    },

    resetLaborForm() {
        this.renderLaborForm();
    },

    renderLaborRecords() {
        const container = document.getElementById('view-labor-records');
        const results = this.db.exec(`
            SELECT l.id, l.amount, l.apply_date, l.service_type, l.service_content,
                   l.income_type, l.payment_method, l.handler,
                   p.name, p.id_number
            FROM labor_payments l
            LEFT JOIN profiles p ON l.profile_id = p.id
            ORDER BY l.created_at DESC
        `);

        let html = `<div class="form-section">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="form-section-title mb-0">勞務報酬紀錄</div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline-success btn-sm" onclick="app.exportLaborCSV()">
                        <i class="bi bi-filetype-csv"></i> 匯出 CSV
                    </button>
                </div>
            </div>`;

        if (!results.length || !results[0].values.length) {
            html += `<p class="text-muted">尚無勞務報酬紀錄</p>`;
        } else {
            const totalAmount = results[0].values.reduce((sum, r) => sum + r[1], 0);
            const totalCount = results[0].values.length;
            html += `<div class="alert alert-info">共 ${totalCount} 筆，總金額 NT$ ${totalAmount.toLocaleString()}</div>`;
            html += `<div class="table-responsive"><table class="table table-hover">
                <thead><tr>
                    <th>日期</th><th>姓名</th><th>身分證字號</th><th>服務類別</th><th>金額</th><th>所得類別</th><th>付款方式</th><th>經手人</th><th></th>
                </tr></thead><tbody>`;
            results[0].values.forEach(row => {
                const [id, amount, date, sType, sContent, incType, payMethod, handler, name, idNum] = row;
                html += `<tr>
                    <td>${this.escHtml(date)}</td>
                    <td>${this.escHtml(name || '—')}</td>
                    <td>${this.escHtml(this.maskIdNumber(idNum))}</td>
                    <td>${this.escHtml(sType || '')}</td>
                    <td class="text-end">${amount.toLocaleString()}</td>
                    <td>${this.escHtml(incType || '')}</td>
                    <td>${payMethod === 'transfer' ? '匯款' : '現金'}</td>
                    <td>${this.escHtml(handler || '')}</td>
                    <td class="text-nowrap">
                        <button class="btn btn-sm btn-outline-secondary" onclick="app.printLaborPayment(${id})" title="列印"><i class="bi bi-printer"></i></button>
                        <button class="btn btn-sm btn-outline-primary" onclick="app.editLaborPayment(${id})" title="編輯"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteLaborPayment(${id})" title="刪除"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    },

    editLaborPayment(id) {
        const results = this.db.exec(`
            SELECT l.amount, l.apply_date, l.service_type, l.service_content,
                   l.income_type, l.payment_method, l.bank_name, l.bank_branch, l.bank_account, l.handler, l.profile_id,
                   p.name, p.id_number, p.address, p.email, p.phone, p.contact_address
            FROM labor_payments l
            LEFT JOIN profiles p ON l.profile_id = p.id
            WHERE l.id = ?
        `, [id]);
        if (!results.length) return;
        const [amount, date, sType, sContent, incType, payMethod, bankName, bankBranch, bankAccount, handler, profileId, name, idNum, address, email, phone, contactAddr] = results[0].values[0];

        document.getElementById('editModalTitle').textContent = '編輯勞務報酬單';
        document.getElementById('editModalBody').innerHTML = `
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">申請日期</label>
                    <input type="date" class="form-control" id="el-date" value="${this.escAttr(this.rocToIso(date))}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">金額</label>
                    <input type="number" class="form-control" id="el-amount" value="${amount}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">經手人</label>
                    <input type="text" class="form-control" id="el-handler" value="${this.escAttr(handler || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">姓名</label>
                    <input type="text" class="form-control" id="el-name" value="${this.escAttr(name || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">身分證字號</label>
                    <input type="text" class="form-control" id="el-idnumber" value="${this.escAttr(idNum || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">服務類別</label>
                    <input type="text" class="form-control" id="el-service-type" value="${this.escAttr(sType || '')}">
                </div>
                <div class="col-12">
                    <label class="form-label">服務內容</label>
                    <input type="text" class="form-control" id="el-service-content" value="${this.escAttr(sContent || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">所得類別</label>
                    <select class="form-select" id="el-income-type">
                        <option value="50" ${incType === '50' ? 'selected' : ''}>非固定薪資 (50)</option>
                        <option value="9A" ${incType === '9A' ? 'selected' : ''}>執行業務報酬 (9A)</option>
                        <option value="928Z" ${incType === '928Z' ? 'selected' : ''}>其他所得 (928Z)</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">付款方式</label>
                    <select class="form-select" id="el-payment-method">
                        <option value="cash" ${payMethod === 'cash' ? 'selected' : ''}>現金</option>
                        <option value="transfer" ${payMethod === 'transfer' ? 'selected' : ''}>匯款</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">銀行名稱</label>
                    <input type="text" class="form-control" id="el-bank-name" value="${this.escAttr(bankName || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">分行</label>
                    <input type="text" class="form-control" id="el-bank-branch" value="${this.escAttr(bankBranch || '')}">
                </div>
                <div class="col-md-4">
                    <label class="form-label">銀行帳號</label>
                    <input type="text" class="form-control" id="el-bank-account" value="${this.escAttr(bankAccount || '')}">
                </div>
            </div>
        `;

        const deleteBtn = document.getElementById('editModalDelete');
        deleteBtn.classList.remove('d-none');
        this.editingRecordId = id;

        const saveBtn = document.getElementById('editModalSave');
        saveBtn.onclick = () => {
            this.db.run(
                `UPDATE labor_payments SET amount=?, apply_date=?, service_type=?, service_content=?, income_type=?, payment_method=?, bank_name=?, bank_branch=?, bank_account=?, handler=? WHERE id=?`,
                [
                    parseInt(document.getElementById('el-amount').value),
                    this.isoToRoc(document.getElementById('el-date').value.trim()),
                    document.getElementById('el-service-type').value.trim(),
                    document.getElementById('el-service-content').value.trim(),
                    document.getElementById('el-income-type').value,
                    document.getElementById('el-payment-method').value,
                    document.getElementById('el-bank-name').value.trim(),
                    document.getElementById('el-bank-branch').value.trim(),
                    document.getElementById('el-bank-account').value.trim(),
                    document.getElementById('el-handler').value.trim(),
                    id
                ]
            );
            if (profileId) {
                this.db.run(
                    `UPDATE profiles SET name=?, id_number=?, updated_at=datetime('now','localtime') WHERE id=?`,
                    [document.getElementById('el-name').value.trim(), document.getElementById('el-idnumber').value.trim(), profileId]
                );
            }
            this.save();
            this.editModal.hide();
            this.renderLaborRecords();
        };

        deleteBtn.onclick = () => {
            if (confirm('確定刪除此勞務報酬紀錄？')) {
                this.db.run(`DELETE FROM labor_payments WHERE id = ?`, [id]);
                this.save();
                this.editModal.hide();
                this.renderLaborRecords();
            }
        };

        this.editModal.show();
    },

    deleteLaborPayment(id) {
        if (!confirm('確定刪除此勞務報酬紀錄？')) return;
        this.db.run(`DELETE FROM labor_payments WHERE id = ?`, [id]);
        this.save();
        this.renderLaborRecords();
    },

    buildLaborPrintTop(officeName, row) {
        const [amount, date, sType, sContent, incType, payMethod, bankName, bankBranch, bankAccount, handler, name, idNum, address, email, phone, contactAddr] = row;
        const dateParts = (date || '').match(/^(\d+)-(\d+)-(\d+)$/);
        const dateDisplay = dateParts ? `${dateParts[1]}年&nbsp;&nbsp;${dateParts[2]}月&nbsp;&nbsp;${dateParts[3]}日` : this.escHtml(date);

        const inc50 = incType === '50' ? '☑' : '☐';
        const inc9A = incType === '9A' ? '☑' : '☐';
        const inc9B = incType === '928Z' ? '☑' : '☐';
        const payCash = payMethod === 'cash' ? '☑' : '☐';
        const payTransfer = payMethod === 'transfer' ? '☑' : '☐';

        return `<div class="print-half" style="font-size:0.82rem">
            <div style="text-align:center;background:#336;color:#fff;padding:3px 0;font-weight:bold;font-size:0.9rem;margin-bottom:0">
                ${this.escHtml(officeName)}勞務報酬單
            </div>
            <div style="text-align:right;font-size:0.8rem;padding:2px 4px">申請日期 &nbsp; ${dateDisplay}</div>
            <table>
                <tr><th>所得人姓名</th><td>${this.escHtml(name || '')}</td><th>身分證字號</th><td>${this.escHtml(idNum || '')}</td></tr>
                <tr><th>連絡電話</th><td>${this.escHtml(phone || '')}</td><th>電子郵件</th><td>${this.escHtml(email || '')}</td></tr>
                <tr><th>戶籍地址</th><td colspan="3">${this.escHtml(address || '')}</td></tr>
                <tr><th>通訊地址</th><td colspan="3">${this.escHtml(contactAddr || '')}</td></tr>
            </table>
            <table style="margin-top:4px">
                <tr>
                    <th style="width:15%">服務內容</th><td style="width:35%">${this.escHtml(sContent || '')}</td>
                    <th style="width:15%">服務類別</th><td style="width:35%">${this.escHtml(sType || '')}</td>
                </tr>
                <tr>
                    <th>應領金額</th><td>${amount.toLocaleString()}</td>
                    <th>所得類別</th>
                    <td style="font-size:0.75rem">${inc50} 非固定薪資(50)<br>${inc9A} 執行業務報酬(9A)<br>${inc9B} 其他所得(928Z)</td>
                </tr>
                <tr>
                    <th>付款方式</th>
                    <td colspan="3">${payCash} 現金 &nbsp; ${payTransfer} 匯款<span style="font-size:0.75rem">（未免扣繳得提供銀行存摺封面影本供核對）</span></td>
                </tr>
                <tr><th>銀行帳號</th><td colspan="3">${this.escHtml(bankName || '')} &nbsp; ${this.escHtml(bankBranch || '')}分行 &nbsp; 帳號：${this.escHtml(bankAccount || '')}</td></tr>
            </table>
            <table style="margin-top:4px">
                <tr>
                    <td style="border:1px solid #000;padding:6px;font-size:0.75rem;width:100%">
                        <div style="text-align:center;margin-bottom:4px">身分證影本黏貼處（無法取得，115年＿月＿日經（簽名）查驗相符）</div>
                        <div style="display:flex;height:100px">
                            <div style="flex:1;border-right:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#ccc">正面影本</div>
                            <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#ccc">反面影本</div>
                        </div>
                    </td>
                </tr>
            </table>
            <div style="font-size:0.65rem;margin-top:3px;line-height:1.4">
                <div>備註：</div>
                ${this.getSetting('labor_note').split('\n').map(line => `<div>${this.escHtml(line)}</div>`).join('')}
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:3px;font-size:0.85rem">
                <table style="width:auto"><tr>
                    <th style="border:1px solid #000;padding:2px 8px">所得人<br>簽章</th>
                    <td style="border:1px solid #000;padding:2px 8px;min-width:120px"></td>
                </tr></table>
            </div>
        </div>`;
    },

    buildLaborPrintBottom(officeName, row) {
        const [amount, date, sType, sContent, incType, payMethod, bankName, bankBranch, bankAccount, handler, name, idNum, address, email, phone, contactAddr] = row;
        const dateParts = (date || '').match(/^(\d+)-(\d+)-(\d+)$/);
        const dateDisplay = dateParts ? `${dateParts[1]}年&nbsp;&nbsp;${dateParts[2]}月&nbsp;&nbsp;${dateParts[3]}日` : this.escHtml(date);

        const inc50 = incType === '50' ? '☑' : '☐';
        const inc9A = incType === '9A' ? '☑' : '☐';
        const inc9B = incType === '928Z' ? '☑' : '☐';
        const payCash = payMethod === 'cash' ? '☑' : '☐';
        const payTransfer = payMethod === 'transfer' ? '☑' : '☐';

        return `<div class="print-half" style="font-size:0.82rem">
            <div style="text-align:center;font-size:0.75rem;margin-bottom:2px">
                ${this.escHtml(officeName)}勞務報酬（收執聯）
            </div>
            <table>
                <tr><th>服務內容</th><td>${this.escHtml(sContent || '')}</td><th>服務日期</th><td>${dateDisplay}</td></tr>
                <tr>
                    <th>應領金額</th><td>${amount.toLocaleString()}</td>
                    <th>所得類別</th>
                    <td style="font-size:0.75rem">${inc50} 非固定薪資(50) &nbsp; ${inc9A} 執行業務報酬(9A) &nbsp; ${inc9B} 其他所得(928Z)</td>
                </tr>
                <tr>
                    <th>付款方式</th>
                    <td colspan="3">${payCash} 現金 &nbsp; ${payTransfer} 匯款<span style="font-size:0.75rem">（未免扣繳得提供銀行存摺封面影本供核對）</span></td>
                </tr>
            </table>
        </div>`;
    },

    printLaborPayment(id) {
        const results = this.db.exec(`
            SELECT l.amount, l.apply_date, l.service_type, l.service_content,
                   l.income_type, l.payment_method, l.bank_name, l.bank_branch, l.bank_account, l.handler,
                   p.name, p.id_number, p.address, p.email, p.phone, p.contact_address
            FROM labor_payments l
            LEFT JOIN profiles p ON l.profile_id = p.id
            WHERE l.id = ?
        `, [id]);
        if (!results.length || !results[0].values.length) return;

        const officeName = this.getSetting('office_name');
        const row = results[0].values[0];
        const printArea = document.getElementById('printArea');
        printArea.innerHTML = `<div class="print-form">
            ${this.buildLaborPrintTop(officeName, row)}
            <hr class="print-cut-line">
            ${this.buildLaborPrintBottom(officeName, row)}
        </div>`;
        printArea.classList.remove('d-none');
        window.print();
        printArea.classList.add('d-none');
    },

    exportLaborCSV() {
        const results = this.db.exec(`
            SELECT l.apply_date, l.amount, l.service_type, l.service_content,
                   l.income_type, l.payment_method, l.bank_name, l.bank_branch, l.bank_account, l.handler,
                   p.name, p.id_number, p.address, p.email, p.phone, p.contact_address
            FROM labor_payments l
            LEFT JOIN profiles p ON l.profile_id = p.id
            ORDER BY l.created_at DESC
        `);
        if (!results.length || !results[0].values.length) {
            alert('無資料可匯出');
            return;
        }
        const headers = ['申請日期', '金額', '服務類別', '服務內容', '所得類別', '付款方式', '銀行名稱', '分行', '銀行帳號', '經手人', '姓名', '身分證字號', '戶籍地址', '電子郵件', '連絡電話', '通訊地址'];
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
        a.download = `labor_payments_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    renderSettings() {
        const officeName = this.getSetting('office_name');
        const defaultHandler = this.getSetting('default_handler');
        const donationNote = this.getSetting('donation_note');
        const laborNote = this.getSetting('labor_note');
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
                    <div class="col-md-6">
                        <label class="form-label">預設經手人</label>
                        <input type="text" class="form-control" id="s-default-handler" value="${this.escAttr(defaultHandler)}" placeholder="經手人姓名">
                        <div class="form-text">新增捐款時自動帶入此經手人名稱</div>
                    </div>
                    <div class="col-12">
                        <label class="form-label">捐款資料表備註</label>
                        <textarea class="form-control" id="s-donation-note" rows="2">${this.escHtml(donationNote)}</textarea>
                        <div class="form-text">顯示在捐款資料表及列印表單底部</div>
                    </div>
                    <div class="col-12">
                        <label class="form-label">勞務報酬單備註</label>
                        <textarea class="form-control" id="s-labor-note" rows="4">${this.escHtml(laborNote)}</textarea>
                        <div class="form-text">顯示在勞務報酬單列印表單底部，每行一條備註</div>
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
        this.setSetting('default_handler', document.getElementById('s-default-handler').value.trim());
        this.setSetting('donation_note', document.getElementById('s-donation-note').value.trim());
        this.setSetting('labor_note', document.getElementById('s-labor-note').value.trim());
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
