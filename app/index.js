/**
 * Main JS file for project.
 */

/* global $, _, cartodb, L */
'use strict';

// Dependencies
import utilsFn from './utils.js';
/* eslint-disable */
import sideBySide from './leaflet-side-by-side.js';
import leafletHash from 'leaflet-hash';
/* eslint-enable */

// Setup utils function
let utils = utilsFn({ });

// Some common variables
let metroAreaView = [-93.3330, 44.9774, 10];
let landUseURL = 'https://alan-strib.carto.com/api/v2/viz/804d8a61-85b2-4b58-8e07-aa014702698b/viz.json';
let landUseOptions = {
  shareable: false,
  title: false,
  description: false,
  search: false,
  cartodb_logo: false,
  center_lat: utils.query.lat ? parseFloat(utils.query.lat) : metroAreaView[1],
  center_lon: utils.query.lng ? parseFloat(utils.query.lng) : metroAreaView[0],
  zoom: utils.query.zoom ? parseInt(utils.query.zoom, 10) : metroAreaView[2],
  legends: true,
  fullscreen: true
};
let landUseInteractivityFields = 'lud_2010, lud_2016';


// Add some classes depending on what is going on
if (utils.isEmbedded()) {
  $('body').addClass('embedded');
}
if (utils.query.flush) {
  $('body').addClass('flush');
}

// Handle title change
if (utils.query.title) {
  $('header h1').text(utils.query.title);
}

// Handling parent change
utils.on('parent', (parentInfo) => {
  if (!parentInfo.height || !parentInfo.containerWidth) {
    return;
  }

  // Calculate height based on parent continer
  let header = $('header').outerHeight(true) || 0;
  let footer = $('footer').outerHeight(true) || 0;
  let ideal = Math.min(parentInfo.height * 0.85, parentInfo.containerWidth * 1.25);
  $('body').height(header + footer + ideal);
});

// Depending on page, do specific things
$('body').addClass(utils.page);
if (utils.page === 'aerial') {
  drawAerial();
}
else if (utils.page === 'both') {
  drawBoth();
}
else {
  drawLandChange();
}

// Map of both
function drawBoth() {
  let map;
  let layers = {};

  // Draw map function
  function drawMap(view) {
    // Create map if needed
    if (!map) {
      cartodb.createVis('map', landUseURL, landUseOptions)
        .done((carto, cartoLayers) => {
          let visual = cartoLayers[1];
          visual.setInteractivity(landUseInteractivityFields);
          layers.landUse = L.layerGroup(cartoLayers);
          map = carto.getNativeMap();

          // Remove attribution to be placed somewhere else
          map.removeControl(map.attributionControl);

          // Set up hash and try to get from parent
          map.hash = new L.Hash(map);
          utils.pym.hashRequest();
        })
        .on('error', error);
    }

    // Create aerial layers if needed
    if (view === 'aerial' && !layers.aerial) {
      let l = [];
      l.push(L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
        layers: 'met10',
        id: 'aerial10'
      }));
      l.push(L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
        layers: 'met16',
        id: 'aerial16'
      }));
      l.push(L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png'));

      layers.aerial = L.layerGroup(l);

      if (!map.hash) {
        map.hash = new L.Hash(map);
        utils.pym.hashRequest();
      }
    }

    if (map && view === 'aerial') {
      if (layers.landUse) {
        layers.landUse.eachLayer((l) => {
          l.setZIndex(-999999);
          l.setOpacity(0);
        });
        layers.landUse.getLayers()[1].setInteractivity('');
      }
      if (layers.aerial) {
        layers.aerial.eachLayer((l) => {
          l.setZIndex(999999);
          l.setOpacity(1);
        });
      }

      layers.aerial.addTo(map);
      map.sideBySide = map.sideBySide && map.sideBySide._map ? map.sideBySide :
        L.control.sideBySide(layers.aerial.getLayers()[0], layers.aerial.getLayers()[1]).addTo(map);
    }

    // Land use map
    if (map && view === 'land-use') {
      if (layers.aerial) {
        layers.aerial.eachLayer((l) => {
          l.setZIndex(-999999);
          l.setOpacity(0);
        });
      }
      if (layers.landUse) {
        layers.landUse.eachLayer((l) => {
          l.setZIndex(999999);
          l.setOpacity(1);
        });
        layers.landUse.getLayers()[1].setInteractivity(landUseInteractivityFields);
      }

      if (map.sideBySide && map.sideBySide._map) {
        map.sideBySide.remove();
      }

      layers.landUse.addTo(map);
    }

    if (map) {
      map.invalidateSize();
    }
  }

  // Handle change of views
  $('.views .view').on('click', function(e) {
    e.preventDefault();
    let $this = $(this);
    let view = $this.data('view');

    // Update view menu
    $('.views .view').removeClass('active');
    $this.addClass('active');

    // jQuery handles block and inline stuff better.
    $('.views .view').each((i, el) => {
      let view = $(el).data('view');
      $('.' + view + '-only').hide();
    });
    $('.' + view + '-only').show();

    // Update size
    if (throttledFullscreen) {
      throttledFullscreen();
    }

    // Update map
    drawMap(view);
  });

  // Force land use view
  $('.views .view[data-view="land-use"]').trigger('click');

  // Handle search
  let $searchToggle = $('.search-toggle');
  let $searchToggleButton = $('.search-toggle-action');
  let $search = $('.search-bar');
  let $searchForm = $('.search-bar form');
  let $input = $('.search-bar input');
  let $geolocate = $('.search-bar .geolocate');

  // Geocode
  function geocode(input) {
    if (!input) {
      return;
    }

    isLoading();
    let url = 'https://search.mapzen.com/v1/search?' + [
      'text=' + encodeURIComponent(input),
      'boundary.rect.min_lon=-95.77',
      'boundary.rect.max_lon=-91.04',
      'boundary.rect.min_lat=43.46',
      'boundary.rect.max_lat=46.46',
      'api_key=mapzen-pGUThrG'
    ].join('&');
    window.fetch(url).then((response) => {
      return response.json();
    })
      .then((response) => {
        if (response && response.features && response.bbox && map) {
          let b = response.bbox;
          map.fitBounds([[b[1], b[0]], [b[3], b[2]]]);
        }

        doneLoading();
      })
      .catch((e) => {
        doneLoading();
        error(e);
      });
  }

  // Submit
  $searchForm.on('submit', (e) => {
    e.preventDefault();
    geocode($input.val());
  });

  // Geolocate
  $geolocate.on('click', (e) => {
    e.preventDefault();
    isLoading();
    utils.geolocate((error, latLng) => {
      map.setView(latLng, 16);
      doneLoading();
    });
  });

  // Toggle search dialog
  $searchToggleButton.on('click', (e) => {
    e.preventDefault();
    let opened = $searchToggle.hasClass('opened');

    $searchToggle.removeClass(opened ? 'opened' : 'closed');
    $searchToggle.addClass(opened ? 'closed' : 'opened');

    $search.removeClass(opened ? 'opened' : 'closed');
    $search.addClass(opened ? 'closed' : 'opened');

    if (!opened) {
      $input.focus();
    }
  });
}

// Draw aerial map
function drawAerial() {
  let map = L.map('map', {
    center: [
      utils.query.lat ? parseFloat(utils.query.lat) : 45.051646,
      utils.query.lng ? parseFloat(utils.query.lng) : -93.473078 ],
    zoom: utils.query.zoom ? parseInt(utils.query.zoom, 10) : 17,
    maxZoom: 18,
    minZoom: 10,
    attributionControl: false
  });

  map.hash = new L.Hash(map);
  utils.pym.hashRequest();

  let aerial16 = L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
    layers: 'met16'
  }).addTo(map);
  let aerial10 = L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
    layers: 'met10'
  }).addTo(map);

  L.control.sideBySide(aerial10, aerial16).addTo(map);

  let labels = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png');
  labels.addTo(map);
}


// Draw land chane map
function drawLandChange() {
  cartodb.createVis('map', landUseURL, landUseOptions)
    .done((carto, layers) => {
      let visual = layers[1];
      let map = carto.getNativeMap();

      // Remove attribution to be placed somewhere else
      map.removeControl(map.attributionControl);

      // Set up hash and try to get from parent
      map.hash = new L.Hash(map);
      utils.pym.hashRequest();

      visual.setInteractivity(landUseInteractivityFields);
      //visual.setQuery('SELECT * FROM land_use_changed_2016 WHERE ch20102016 = \'residential-->industrial\'');
    })
    .on('error', error);
}


// Using cartodb loader
function isLoading() {
  $('.cartodb-tiles-loader').css('opacity', 100);
}
function doneLoading() {
  $('.cartodb-tiles-loader').css('opacity', 0);
}


// Handle fullscreen parts
function fullscreen() {
  let header = $('header').outerHeight(true) || 0;
  let footer = $('footer').outerHeight(true) || 0;

  $('.fullscreen-minus-header').css('top', header);
  $('.fullscreen-minus-footer').css('bottom', footer);
}
let throttledFullscreen = _.throttle(fullscreen, 200);
$(window).on('resize', throttledFullscreen);
$(document).ready(throttledFullscreen);

// Handle error
function error(e) {
  console.error(e);
}
