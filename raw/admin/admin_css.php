<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
.container { max-width: 1200px; margin: 0 auto; padding: 16px; }
h1 { font-size: 20px; margin-bottom: 16px; }
.tabs { display: flex; gap: 4px; margin-bottom: 16px; }
.tabs a { padding: 8px 16px; background: #ddd; text-decoration: none; color: #333; border-radius: 6px 6px 0 0; font-size: 14px; }
.tabs a.active { background: #fff; font-weight: 600; }
.card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card h2 { font-size: 16px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
th { background: #f9f9f9; font-weight: 600; white-space: nowrap; }
td { vertical-align: top; }
.actions { white-space: nowrap; }
.actions form { display: inline; }
.btn { padding: 4px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; }
.btn-sm { padding: 3px 8px; }
.btn-primary { background: #28c8c8; color: #fff; }
.btn-danger { background: #e74c3c; color: #fff; }
.btn-secondary { background: #888; color: #fff; }
.btn:hover { opacity: 0.85; }
form.edit-form label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; margin-top: 10px; }
form.edit-form input[type="text"],
form.edit-form input[type="number"],
form.edit-form input[type="date"],
form.edit-form textarea { width: 100%; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; font-family: monospace; }
form.edit-form textarea { min-height: 100px; }
.msg { padding: 10px 14px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; }
.msg.success { background: #d4edda; color: #155724; }
.msg.error { background: #f8d7da; color: #721c24; }
.video-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: center; }
.video-row input { flex: 1; }
.video-row .remove-video { cursor: pointer; color: #e74c3c; font-weight: bold; padding: 4px 8px; }
.add-video-btn { cursor: pointer; color: #28c8c8; font-size: 13px; margin-top: 4px; display: inline-block; }
.coord-preview { font-size: 11px; color: #888; max-height: 60px; overflow: auto; }
.truncate { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.filter-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.filter-bar input { flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.filter-bar .count { font-size: 12px; color: #888; white-space: nowrap; }
tr.editing { background: #e0f7f7; }
#pickerMap { height: 300px; border-radius: 6px; margin-top: 6px; border: 1px solid #ccc; }
.map-hint { font-size: 12px; color: #888; margin-top: 4px; }
</style>
