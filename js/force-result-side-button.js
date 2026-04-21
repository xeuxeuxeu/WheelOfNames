(function () {
  var shadowWheelConfig = null;
  var queuedWinnerIds = [];
  var percentageById = {};

  function getStore() {
    var qApp = document.getElementById('q-app');
    if (!qApp || !qApp.__vue_app__) return null;
    return qApp.__vue_app__.config.globalProperties.$store || null;
  }

  function getEnabledEntries(state) {
    var source = state || (getStore() && getStore().state);
    if (!source || !source.wheelConfig || !Array.isArray(source.wheelConfig.entries)) return [];
    return source.wheelConfig.entries.filter(function (entry) {
      return entry && entry.enabled !== false;
    });
  }

  function cloneCurrentWheel() {
    var store = getStore();
    if (!store || !store.state || !store.state.wheelConfig) return;
    shadowWheelConfig = JSON.parse(JSON.stringify(store.state.wheelConfig));
  }

  function ensureModal() {
    if (document.getElementById('rigged-wheel-modal')) return;

    var style = document.createElement('style');
    style.textContent = '' +
      '#rigged-wheel-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:12000;display:none;}' +
      '#rigged-wheel-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,92vw);max-height:82vh;overflow:auto;background:#fff;border-radius:14px;z-index:12001;display:none;padding:16px;box-shadow:0 12px 38px rgba(0,0,0,.35);font-family:Quicksand,Arial,sans-serif;}' +
      '#rigged-wheel-modal h2{margin:0 0 10px;font-size:20px;}' +
      '#rigged-wheel-modal .row{margin-bottom:12px;}' +
      '#rigged-wheel-modal textarea{width:100%;min-height:72px;}' +
      '#rigged-wheel-modal table{width:100%;border-collapse:collapse;}' +
      '#rigged-wheel-modal th,#rigged-wheel-modal td{border-bottom:1px solid #eee;padding:6px 4px;text-align:left;font-size:14px;}' +
      '#rigged-wheel-modal input[type="number"]{width:90px;}' +
      '#rigged-wheel-modal .actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px;}' +
      '#rigged-wheel-modal button{padding:8px 10px;border-radius:8px;border:1px solid #c5c5c5;background:#fff;cursor:pointer;}' +
      '#rigged-wheel-modal .primary{background:#3369e8;color:#fff;border-color:#3369e8;}';
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'rigged-wheel-overlay';
    document.body.appendChild(overlay);

    var modal = document.createElement('div');
    modal.id = 'rigged-wheel-modal';
    modal.innerHTML = '' +
      '<h2>Winner Planner</h2>' +
      '<div class="row">Use this to replace the wheel with a controlled result model: set an exact winner order and fallback winner percentages.</div>' +
      '<div class="row"><label><strong>Winner order queue</strong> (one entry per line):</label><textarea id="winner-queue-input" placeholder="Alice&#10;Bob&#10;Charlie"></textarea></div>' +
      '<div class="row"><strong>Winner percentages</strong> (used when queue is empty):</div>' +
      '<table><thead><tr><th>Entry</th><th>Percent</th></tr></thead><tbody id="winner-percentages-body"></tbody></table>' +
      '<div class="actions"><button id="winner-planner-cancel" type="button">Close</button><button id="winner-planner-save" class="primary" type="button">Save</button></div>';
    document.body.appendChild(modal);

    overlay.addEventListener('click', closeModal);
    document.getElementById('winner-planner-cancel').addEventListener('click', closeModal);
    document.getElementById('winner-planner-save').addEventListener('click', saveModalState);
  }

  function openModal() {
    ensureModal();
    renderModalState();
    document.getElementById('rigged-wheel-overlay').style.display = 'block';
    document.getElementById('rigged-wheel-modal').style.display = 'block';
  }

  function closeModal() {
    var overlay = document.getElementById('rigged-wheel-overlay');
    var modal = document.getElementById('rigged-wheel-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
  }

  function renderModalState() {
    var store = getStore();
    var state = store && store.state;
    var entries = getEnabledEntries(state);

    var body = document.getElementById('winner-percentages-body');
    body.innerHTML = '';
    entries.forEach(function (entry) {
      var id = String(entry.id);
      if (typeof percentageById[id] !== 'number') percentageById[id] = 0;
      var row = document.createElement('tr');
      row.innerHTML = '<td>' + escapeHtml(entry.text || '(blank entry)') + '</td><td><input type="number" min="0" step="0.1" data-entry-id="' + id + '" value="' + percentageById[id] + '">%</td>';
      body.appendChild(row);
    });

    var queueNames = queuedWinnerIds
      .map(function (id) {
        var match = entries.find(function (entry) { return String(entry.id) === String(id); });
        return match ? match.text : '';
      })
      .filter(Boolean);

    document.getElementById('winner-queue-input').value = queueNames.join('\n');
  }

  function saveModalState() {
    var store = getStore();
    var state = store && store.state;
    var entries = getEnabledEntries(state);
    var byText = {};

    entries.forEach(function (entry) {
      var key = (entry.text || '').trim().toLowerCase();
      if (key && !byText[key]) byText[key] = entry;
    });

    var queueLines = document.getElementById('winner-queue-input').value
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);

    queuedWinnerIds = queueLines
      .map(function (line) {
        var match = byText[line.toLowerCase()];
        return match ? String(match.id) : null;
      })
      .filter(Boolean);

    Array.prototype.forEach.call(document.querySelectorAll('#winner-percentages-body input[data-entry-id]'), function (input) {
      var id = String(input.getAttribute('data-entry-id'));
      var value = Number(input.value);
      percentageById[id] = Number.isFinite(value) && value > 0 ? value : 0;
    });

    closeModal();
  }

  function pickByPercentages(entries) {
    var weighted = entries.map(function (entry) {
      return {
        entry: entry,
        weight: Number(percentageById[String(entry.id)]) || 0
      };
    }).filter(function (item) {
      return item.weight > 0;
    });

    var total = weighted.reduce(function (sum, item) { return sum + item.weight; }, 0);
    if (total <= 0) return null;

    var needle = Math.random() * total;
    var running = 0;
    for (var i = 0; i < weighted.length; i += 1) {
      running += weighted[i].weight;
      if (needle <= running) return weighted[i].entry;
    }

    return weighted[weighted.length - 1].entry;
  }

  function pickControlledWinner(state) {
    var entries = getEnabledEntries(state);
    if (!entries.length) return null;

    if (queuedWinnerIds.length) {
      var nextId = String(queuedWinnerIds.shift());
      var queued = entries.find(function (entry) { return String(entry.id) === nextId; });
      if (queued) return queued;
    }

    return pickByPercentages(entries);
  }

  function applyControlledWinner(state) {
    var controlled = pickControlledWinner(state);
    if (!controlled) return;

    state.winnerEntry = controlled;
    if (Array.isArray(state.winners) && state.winners.length > 0) {
      state.winners.splice(state.winners.length - 1, 1, controlled);
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function installChangelogTrigger() {
    document.addEventListener('click', function (event) {
      var node = event.target;
      while (node && node !== document.body) {
        var label = (node.textContent || '').trim();
        if (label === 'Changelog') {
          event.preventDefault();
          event.stopPropagation();
          openModal();
          return;
        }
        node = node.parentElement;
      }
    }, true);
  }

  function init() {
    installChangelogTrigger();

    var watch = setInterval(function () {
      var store = getStore();
      if (!store || typeof store.subscribe !== 'function') return;

      clearInterval(watch);
      cloneCurrentWheel();

      store.subscribe(function (mutation, state) {
        if (mutation && mutation.type === 'setWheelConfig') {
          cloneCurrentWheel();
        }

        if (mutation && mutation.type === 'addWinner') {
          applyControlledWinner(state);
        }
      });
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
