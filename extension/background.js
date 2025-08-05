let recorder;
let chunks = [];
let isPaused = false;

async function startCapture(tabId, deviceId){
  try {
    const tabStream = await new Promise((resolve, reject)=>{
      chrome.tabCapture.capture({audio:true, video:false, targetTabId: tabId}, stream => {
        if (chrome.runtime.lastError || !stream) reject(chrome.runtime.lastError || new Error('tab capture failed'));
        else resolve(stream);
      });
    });
    const micStream = await navigator.mediaDevices.getUserMedia({audio:{deviceId}});

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    ctx.createMediaStreamSource(tabStream).connect(dest);
    ctx.createMediaStreamSource(micStream).connect(dest);

    recorder = new MediaRecorder(dest.stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = saveRecording;
    recorder.start();
    chrome.tabs.sendMessage(tabId, {type:'mr-recording-started'});
  } catch(e){
    console.error('startCapture', e);
  }
}

async function saveRecording(){
  const blob = new Blob(chunks, {type:'audio/webm'});
  chunks = [];
  // Placeholder: actual MP3 encoding requires lamejs library
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const mp3Blob = new Blob([uint8], {type:'audio/mp3'}); // not true mp3 without encoder

  const info = await new Promise(resolve=>{
    chrome.storage.local.get(['counterDate','counter','autoSave','folder'], resolve);
  });
  const today = new Date();
  const dayStr = today.getDate().toString().padStart(2,'0') +
                 (today.getMonth()+1).toString().padStart(2,'0') +
                 today.getFullYear();
  let counter = 1;
  if (info.counterDate === dayStr) counter = (info.counter||0)+1;
  const filename = `recording_${dayStr}_${counter}.mp3`;
  chrome.storage.local.set({counterDate: dayStr, counter});

  const url = URL.createObjectURL(mp3Blob);
  chrome.downloads.download({
    url,
    filename: (info.folder||'') ? `${info.folder}/${filename}` : filename,
    saveAs: !info.autoSave
  });
  chrome.tabs.query({}, tabs => {
    tabs.forEach(t=>{
      chrome.tabs.sendMessage(t.id, {type:'mr-stopped'});
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'mr-start'){
    chrome.windows.create({
      url: chrome.runtime.getURL('selector.html'),
      type: 'popup', width: 400, height: 500
    });
  }
  if (msg.type === 'mr-selection'){
    startCapture(msg.tabId, msg.deviceId);
  }
  if (msg.type === 'mr-pause' && recorder){
    if (isPaused){
      recorder.resume();
      isPaused = false;
      chrome.tabs.sendMessage(sender.tab.id, {type:'mr-resumed'});
    } else {
      recorder.pause();
      isPaused = true;
      chrome.tabs.sendMessage(sender.tab.id, {type:'mr-paused'});
    }
  }
  if (msg.type === 'mr-stop' && recorder){
    recorder.stop();
  }
});
