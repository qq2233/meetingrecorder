(async function(){
  const tabsContainer = document.getElementById('tabs');
  const deviceSelect = document.getElementById('deviceSelect');
  const confirmBtn = document.getElementById('confirm');
  const autoSaveChk = document.getElementById('autoSave');
  const folderInput = document.getElementById('folder');

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      const imgSrc = await chrome.tabs.captureTab(tab.id, {format: 'png'});
      const img = document.createElement('img');
      img.src = imgSrc;
      img.width = 80;
      img.height = 60;
      img.className = 'tab-preview';
      img.dataset.id = tab.id;
      img.title = tab.title;
      img.addEventListener('click', ()=>{
        document.querySelectorAll('.tab-preview').forEach(el=>el.classList.remove('selected'));
        img.classList.add('selected');
      });
      tabsContainer.appendChild(img);
    } catch(e) {
      console.warn('capture failed', e);
    }
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  devices.filter(d=>d.kind==='audioinput').forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Device ${deviceSelect.length+1}`;
    deviceSelect.appendChild(opt);
  });

  chrome.storage.local.get(['autoSave','folder'], res => {
    autoSaveChk.checked = !!res.autoSave;
    folderInput.value = res.folder || '';
  });

  confirmBtn.addEventListener('click', () => {
    const selectedTab = document.querySelector('.tab-preview.selected');
    const tabId = selectedTab ? parseInt(selectedTab.dataset.id) : null;
    const deviceId = deviceSelect.value;
    chrome.storage.local.set({autoSave: autoSaveChk.checked, folder: folderInput.value});
    chrome.runtime.sendMessage({type:'mr-selection', tabId, deviceId});
    window.close();
  });
})();
