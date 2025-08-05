(function(){
  if (window.hasMeetingRecorder) return;
  window.hasMeetingRecorder = true;

  const overlay = document.createElement('div');
  overlay.id = 'meeting-recorder-overlay';
  overlay.innerHTML = `
    <button id="mr-record">Record</button>
    <button id="mr-pause" disabled>Pause</button>
    <button id="mr-stop" disabled>Stop</button>
    <span id="mr-timer">00:00</span>
  `;
  document.body.appendChild(overlay);

  const recordBtn = overlay.querySelector('#mr-record');
  const pauseBtn = overlay.querySelector('#mr-pause');
  const stopBtn = overlay.querySelector('#mr-stop');
  const timerSpan = overlay.querySelector('#mr-timer');

  let timerInterval;
  function startTimer(){
    const start = Date.now();
    timerInterval = setInterval(()=>{
      const diff = Math.floor((Date.now()-start)/1000);
      const m = String(Math.floor(diff/60)).padStart(2,'0');
      const s = String(diff%60).padStart(2,'0');
      timerSpan.textContent = `${m}:${s}`;
    },1000);
  }
  function stopTimer(){
    clearInterval(timerInterval);
    timerSpan.textContent = '00:00';
  }

  recordBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({type:'mr-start'});
  });
  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({type:'mr-pause'});
  });
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({type:'mr-stop'});
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'mr-recording-started') {
      recordBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
      startTimer();
    }
    if (msg.type === 'mr-paused') {
      pauseBtn.textContent = 'Resume';
      stopTimer();
    }
    if (msg.type === 'mr-resumed') {
      pauseBtn.textContent = 'Pause';
      startTimer();
    }
    if (msg.type === 'mr-stopped') {
      recordBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
      stopTimer();
    }
  });
})();
