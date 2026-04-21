(function () {
  function initForceResultControl() {
    if (document.getElementById('force-result-control')) return;

    var container = document.createElement('div');
    container.id = 'force-result-control';
    container.innerHTML = '' +
      '<button id="force-result-toggle" type="button" aria-label="Choose forced result">🎯</button>' +
      '<div id="force-result-panel" hidden>' +
      '  <div class="force-result-title">Choose result</div>' +
      '  <select id="force-result-select"></select>' +
      '  <label class="force-result-checkbox"><input id="force-result-enable" type="checkbox"> Force this result on next spins</label>' +
      '</div>';

    document.body.appendChild(container);

    var style = document.createElement('style');
    style.textContent = '' +
      '#force-result-control{position:fixed;right:8px;top:45%;z-index:9999;font-family:Quicksand,Arial,sans-serif;}' +
      '#force-result-toggle{width:42px;height:42px;border-radius:21px;border:none;background:#3369e8;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:20px;}' +
      '#force-result-panel{position:absolute;right:48px;top:-8px;background:#fff;color:#222;padding:10px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.25);width:220px;}' +
      '#force-result-panel select{width:100%;margin:8px 0;padding:6px;}' +
      '#force-result-panel .force-result-title{font-weight:700;font-size:14px;}' +
      '#force-result-panel .force-result-checkbox{font-size:12px;display:block;line-height:1.3;}';
    document.head.appendChild(style);

    var toggleButton = document.getElementById('force-result-toggle');
    var panel = document.getElementById('force-result-panel');
    var select = document.getElementById('force-result-select');
    var enableCheckbox = document.getElementById('force-result-enable');

    toggleButton.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        populateOptions(select);
      }
    });

    function getStore() {
      var qApp = document.getElementById('q-app');
      if (!qApp || !qApp.__vue_app__) return null;
      return qApp.__vue_app__.config.globalProperties.$store || null;
    }

    function getEntries() {
      var store = getStore();
      if (!store || !store.state || !store.state.wheelConfig) return [];
      return (store.state.wheelConfig.entries || []).filter(function (entry) {
        return entry && entry.enabled !== false;
      });
    }

    function populateOptions(selectNode) {
      var entries = getEntries();
      var previousValue = selectNode.value;
      selectNode.innerHTML = '';

      entries.forEach(function (entry) {
        var option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.text || '(blank entry)';
        selectNode.appendChild(option);
      });

      if (previousValue) {
        selectNode.value = previousValue;
      }
    }

    function applyForcedWinner(state) {
      var desiredId = select.value;
      if (!enableCheckbox.checked || !desiredId) return;

      var entries = (state.wheelConfig && state.wheelConfig.entries) || [];
      var forcedEntry = entries.find(function (entry) {
        return String(entry.id) === String(desiredId);
      });

      if (!forcedEntry) return;

      state.winnerEntry = forcedEntry;
      if (Array.isArray(state.winners) && state.winners.length > 0) {
        state.winners.splice(state.winners.length - 1, 1, forcedEntry);
      }
    }

    var observer = setInterval(function () {
      var store = getStore();
      if (!store || typeof store.subscribe !== 'function') return;

      clearInterval(observer);
      populateOptions(select);

      store.subscribe(function (mutation, state) {
        if (mutation && mutation.type === 'addWinner') {
          applyForcedWinner(state);
        }

        if (mutation && mutation.type === 'setWheelConfig') {
          if (!panel.hidden) populateOptions(select);
        }
      });
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForceResultControl);
  } else {
    initForceResultControl();
  }
})();
