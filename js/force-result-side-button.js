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
      '#rigged-wheel-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,92vw);max-height:82vh;overflow:auto;background:#fff;border-radius:14px;z-index:12001;display:none;padding:16px;box-shadow:0 12px 38px rgba(0,0,0,.35);font-family:Quicksand,Arial,sans-serif;}';
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'rigged-wheel-overlay';
    document.body.appendChild(overlay);

    var modal = document.createElement('div');
    modal.id = 'rigged-wheel-modal';
    modal.innerHTML = '<h2>Winner Planner</h2>';
    document.body.appendChild(modal);
  }

  function applyControlledWinner(state) {
    var entries = getEnabledEntries(state);
    if (!entries.length) return;

    var chosen = entries[Math.floor(Math.random() * entries.length)];
    state.winnerEntry = chosen;

    if (Array.isArray(state.winners) && state.winners.length > 0) {
      state.winners.splice(state.winners.length - 1, 1, chosen);
    }
  }

  function init() {
    var watch = setInterval(function () {
      var store = getStore();
      if (!store || typeof store.subscribe !== 'function') return;

      clearInterval(watch);

      store.subscribe(function (mutation, state) {
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