/**
 * Leaflet plugin that makes a slider to compare
 * different maps.
 *
 * Adapted from:
 * https://github.com/digidem/leaflet-side-by-side
 *
 * To use Draggability, as using a range slider element
 * did not work in IE, specifically because of the styling
 * the slider parts.
 * https://draggabilly.desandro.com/
 */

/* global L */
'use strict';

// Dependencies
import Draggabilly from 'draggabilly';

// Leaflet v0.7 backwards compatibility
function on(el, types, fn, context) {
  types.split(' ').forEach(function (type) {
    L.DomEvent.on(el, type, fn, context);
  });
}

// Leaflet v0.7 backwards compatibility
function off(el, types, fn, context) {
  types.split(' ').forEach(function (type) {
    L.DomEvent.off(el, type, fn, context);
  });
}

// General bind
function bind(func, context) {
  return (...args) => {
    func.call(context, ...args);
  };
}

// convert arg to an array - returns empty array if arg is undefined
function asArray(arg) {
  return (arg === 'undefined') ? [] : Array.isArray(arg) ? arg : [arg];
}

function noop() {
  return;
}

L.Control.SideBySide = L.Control.extend({
  options: {
    thumbSize: 42,
    padding: 0
  },

  setPosition: noop,

  includes: L.Mixin.Events,

  initialize: function(leftLayers, rightLayers, options) {
    // Bind some mthods that are called via events
    this._uncancelMapDrag = bind(this._uncancelMapDrag, this);
    this._cancelMapDrag = bind(this._cancelMapDrag, this);
    this._updateClip = bind(this._updateClip, this);

    this.setLeftLayers(leftLayers);
    this.setRightLayers(rightLayers);
    L.setOptions(this, options);
  },

  getPosition: function() {
    return this._dragger.position.x;
  },

  addTo: function(map) {
    // reset if needed.
    this.remove();

    // Attach map
    this._map = map;

    // Create own container on leaflet
    this._container = this._container = L.DomUtil.create('div', 'leaflet-sbs', map._controlContainer);

    // Create the divider and thumb
    this._divider = L.DomUtil.create('div', 'leaflet-sbs-divider', this._container);
    this._thumb = L.DomUtil.create('div', 'leaflet-sbs-thumb', this._divider);

    // Make divider draggable
    this._dragger = new Draggabilly(this._divider, {
      axis: 'x',
      containment: this._container
    });

    this._addEvents();
    this._updateLayers();
    return this;
  },

  remove: function() {
    if (!this._map) {
      return this;
    }
    if (this._dragger) {
      this._dragger.destroy();
    }

    this._removeEvents();
    if (L.DomUtil.remove) {
      L.DomUtil.remove(this._container);
    }
    else if (this._container) {
      this._container.remove();
    }

    this._map = null;

    return this;
  },

  setLeftLayers: function(leftLayers) {
    this._leftLayers = asArray(leftLayers);
    this._updateLayers();
    return this;
  },

  setRightLayers: function(rightLayers) {
    this._rightLayers = asArray(rightLayers);
    this._updateLayers();
    return this;
  },


  _cancelMapDrag: function() {
    this._map.dragging.disable();
    if (this._map.tap && this._map.tap.disable) {
      this._map.tap.disable();
    }
  },

  _uncancelMapDrag: function(e) {
    this._refocusOnMap(e);
    this._map.dragging.enable();
    if (this._map.tap && this._map.tap.enable) {
      this._map.tap.enable();
    }
  },

  _updateClip: function() {
    var map = this._map;
    var nw = map.containerPointToLayerPoint([0, 0]);
    var se = map.containerPointToLayerPoint(map.getSize());
    var clipX = nw.x + this.getPosition();
    var dividerX = this.getPosition();

    this.fire('dividermove', { x: dividerX });
    var clipLeft = 'rect(' + [nw.y, clipX, se.y, nw.x].join('px,') + 'px)';
    var clipRight = 'rect(' + [nw.y, se.x, se.y, clipX].join('px,') + 'px)';

    // Update each layer
    this._leftLayers.forEach((l) => {
      l.getContainer().style.clip = clipLeft;
    });
    this._rightLayers.forEach((l) => {
      l.getContainer().style.clip = clipRight;
    });
  },

  // Assigns
  _updateLayers: function () {
    if (!this._map) {
      return this;
    }
    var prevLeft = this._leftLayer;
    var prevRight = this._rightLayer;
    this._leftLayer = this._rightLayer = null;

    this._leftLayers.forEach(function (layer) {
      if (this._map.hasLayer(layer)) {
        this._leftLayer = layer;
      }
    }, this);

    this._rightLayers.forEach(function (layer) {
      if (this._map.hasLayer(layer)) {
        this._rightLayer = layer;
      }
    }, this);

    if (prevLeft !== this._leftLayer) {
      prevLeft && this.fire('leftlayerremove', {layer: prevLeft});
      this._leftLayer && this.fire('leftlayeradd', {layer: this._leftLayer});
    }

    if (prevRight !== this._rightLayer) {
      prevRight && this.fire('rightlayerremove', {layer: prevRight});
      this._rightLayer && this.fire('rightlayeradd', {layer: this._rightLayer});
    }
    this._updateClip();
  },

  _addEvents: function () {
    if (!this._map || !this._dragger) {
      return;
    }

    // Map events
    this._map.on('move', this._updateClip, this);
    this._map.on('layeradd layerremove', this._updateLayers, this);

    // Slider events
    this._dragger.on('dragMove', this._updateClip);

    // Turn on/off dragging on map
    this._cancelMapDrag();
    this._dragger.on('dragStart', this._cancelMapDrag);
    on(this._thumb, 'mouseover touchstart', this._cancelMapDrag, this);

    this._dragger.on('dragEnd', this._uncancelMapDrag);
    on(this._thumb, 'mouseup mouseout touchend', this._uncancelMapDrag, this);
  },

  _removeEvents: function () {
    this._map.off('move', this._updateClip, this);
    this._map.off('layeradd layerremove', this._updateLayers, this);

    if (this._dragger) {
      this._dragger.off('dragMove', this._updateClip);
      this._dragger.off('dragStart', this._cancelMapDrag);
      this._dragger.off('dragEnd', this._uncancelMapDrag);
    }
    if (this._thumb) {
      off(this._thumb, 'mouseover touchstart', this._cancelMapDrag, this);
      off(this._thumb, 'mouseup mouseout touchend', this._cancelMapDrag, this);
    }
  }
});

L.control.sideBySide = function (leftLayers, rightLayers, options) {
  return new L.Control.SideBySide(leftLayers, rightLayers, options);
};

export default L.Control.SideBySide;
