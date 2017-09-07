/**
 * A wrapper around pym to have the Parent and Child sync
 * hash and query paramters.
 *
 * This is a separate entry point in the build
 */

// Import pym
import pym from 'pym.js';

// General bind function
function bind(func, t) {
  return (...args) => {
    func.call(t, ...args);
  };
}

// Override parent
class MParent extends pym.Parent {
  constructor(...args) {
    super(...args);

    // Hash option, default to true
    let o = [...args][2] || {};
    let hash = o.hash || o.hash === false ? o.hash : 'parent';

    if (hash) {
      // Watch for parent changes
      window.addEventListener('hashchange', bind(this.hashNotify, this));

      // Watch for child changes
      this.onMessage('hashchange', bind(this.hashRecieve, this));

      // Watch for request of hash
      this.onMessage('hashrequest', bind(this.hashNotify, this));

      // If hash priority is parent, notify
      if (hash === 'parent') {
        this.hashNotify(false);
      }

      // If hash priority is child, get
      if (hash === 'child') {
        setTimeout(() => {
          this.hashRequest();
        }, 1500);
      }
    }
  }

  // Notify child
  hashNotify(sendBlank = true) {
    let h = window.location.hash.replace('#', '');
    if (h || (!h && sendBlank !== false)) {
      this.sendMessage('hashchange', window.location.hash.replace('#', ''));
    }
  }

  // Change hash here on parent
  hashRecieve(hash) {
    if (history && history.pushState) {
      history.pushState(
        null,
        null,
        hash ? '#' + hash : window.location.pathname + window.location.search
      );
    }
    else {
      location.hash = '#' + hash;
    }

    // If this code gets more abstracted, this should be seprated out or handled
    // differently
    this.sendMessage('urlchange', window.location.href);
  }

  // Explicitly get hash
  hashRequest() {
    this.sendMessage('hashrequest', 'true');
  }
}

// Override child class
class MChild extends pym.Child {
  constructor(...args) {
    super(...args);
    // Watch for parent changes
    window.addEventListener('hashchange', bind(this.hashNotify, this));

    // Watch for parent changes
    this.onMessage('hashchange', bind(this.hashRecieve, this));

    // Watch for request of hash
    this.onMessage('hashrequest', bind(this.hashNotify, this));
  }

  // Change hash here on child
  hashRecieve(hash) {
    if (history && history.pushState) {
      history.pushState(
        null,
        null,
        hash ? '#' + hash : window.location.pathname + window.location.search
      );
    }
    else {
      location.hash = '#' + hash;
    }
  }

  // Notify parent
  hashNotify(sendBlank = true) {
    let h = window.location.hash.replace('#', '');
    if (h || (!h && sendBlank !== false)) {
      this.sendMessage('hashchange', window.location.hash.replace('#', ''));
    }
  }

  // Explicitly get hash
  hashRequest() {
    this.sendMessage('hashrequest', 'true');
  }
}

// Update pym
pym.Child = MChild;
pym.Parent = MParent;

// Make available globally
window.pym = window.pym || pym;

// Export
export default pym;
