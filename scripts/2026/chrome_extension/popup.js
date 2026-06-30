const log = document.getElementById('log');
function addLog(msg) {
  log.textContent += msg + '\n';
  log.scrollTop = log.scrollHeight;
}

document.getElementById('start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  addLog('Getting candidate list...');

  const [{ result: cids }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const links = document.querySelectorAll('a[href*="candidatedetail"]');
      return [...new Set([...links].map(a => {
        const m = a.getAttribute('href').match(/cid=(\d+)/);
        return m ? m[1] : null;
      }).filter(Boolean))];
    }
  });

  addLog(`Found ${cids.length} candidates, fetching photos...`);

  const [{ result: photos }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (cids) => {
      const results = [];
      for (let i = 0; i < cids.length; i++) {
        const cid = cids[i];
        try {
          const resp = await fetch('/2026election/candidatedetail.php?cid=' + cid);
          const html = await resp.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');

          const style = doc.querySelector('.pic_box')?.getAttribute('style') || '';
          const match = style.match(/url\(['"]?(.*?)['"]?\)/);
          let photoUrl = match ? match[1] : '';
          if (photoUrl.includes('www.tpp.org.tw')) {
            photoUrl = '/aimg/' + photoUrl.split('/aimg/')[1];
          }

          const name = doc.querySelector('.bread-item:last-child')?.innerText?.trim() || '';
          const ext = photoUrl ? (photoUrl.split('.').pop() || 'png') : '';

          results.push({ cid, name, ext, photoUrl });
        } catch (e) {
          results.push({ cid, error: e.message });
        }
      }
      return results;
    },
    args: [cids]
  });

  addLog(`Got ${photos.length} candidates, downloading photos...`);

  let ok = 0, fail = 0;
  for (const item of photos) {
    if (item.error || !item.photoUrl) {
      addLog(`[FAIL] cid=${item.cid}: ${item.error || 'no photo'}`);
      fail++;
      continue;
    }

    try {
      const [{ result: downloaded }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (photoUrl, filename) => {
          try {
            const resp = await fetch(photoUrl);
            const blob = await resp.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            return true;
          } catch (e) {
            return e.message;
          }
        },
        args: [item.photoUrl, `tpp_${item.cid}.${item.ext}`]
      });

      if (downloaded === true) {
        ok++;
        addLog(`[${ok + fail}/${photos.length}] ${item.name} (tpp_${item.cid}.${item.ext})`);
      } else {
        fail++;
        addLog(`[FAIL] ${item.name}: ${downloaded}`);
      }
    } catch (e) {
      fail++;
      addLog(`[FAIL] ${item.name}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  addLog(`\nDone! Downloaded: ${ok}, Failed: ${fail}`);
});
