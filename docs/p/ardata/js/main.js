var pool = {};
function showBiz(twId) {
    $.get('https://kiang.github.io/ardata.cy.gov.tw/incomes/business/' + twId + '.csv', function (csvData) {
        // 解析 csvData
        var lines = csvData.split('\n');
        var tableData = lines.map(line => line.split(','));

        // 動態生成目標元素的 ID
        var targetId = 'biz' + twId;
        var targetElement = document.getElementById(targetId);

        if (targetElement) {
            // 生成 HTML 表格
            var table = document.createElement('table');
            table.border = 1;

            tableData.forEach(rowData => {
                var row = document.createElement('tr');
                rowData.forEach(cellData => {
                    var cell = document.createElement('td');
                    cell.textContent = cellData;
                    row.appendChild(cell);
                });
                table.appendChild(row);
            });

            // 將生成的 HTML 表格插入到目標元素之後
            targetElement.insertAdjacentElement('afterend', table);

            targetElement.focus();

        } else {
            console.error('Element with ID ' + targetId + ' not found.');
        }
    });

}
$.get('https://kiang.github.io/ardata.cy.gov.tw/incomes/business.csv', function (data) {
    var lines = data.split('\n');
    for (var i = 1; i < lines.length; i++) {
        var items = lines[i].split(',');
        var twid = items[1];
        var income = parseInt(items[0]);
        pool[twid] = income;
    }

    // 將 pool 物件轉換為可排序的陣列
    var sortedPool = Object.entries(pool).sort((a, b) => b[1] - a[1]);

    // 列出排序後的結果
    var listContent = '';
    sortedPool.forEach(item => {
        if (!isNaN(item[1])) {
            listContent += `<a href="#biz/${item[0]}" class="list-group-item list-group-item-action" id="biz${item[0]}">${item[0]}<span class="badge text-bg-secondary">$${item[1]}</span></a>`;
        }
    });
    $('#dataItems').html(listContent);
    routie('biz/:twId', showBiz);
});