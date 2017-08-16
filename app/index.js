/**
 * Main JS file for project.
 */

/* global $, _, cartodb, L */
'use strict';

// Dependencies
import utilsFn from './utils.js';
import sideBySide from './leaflet-side-by-side.js';

// Setup utils function
let utils = utilsFn({ });

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

// Depending on page
$('body').addClass(utils.page);
if (utils.page === 'aerial') {
  drawAerial();
}
else {
  drawLandChange();
}


// Draw aerial map
function drawAerial() {
  let map = L.map('map', {
    center: [
      utils.query.lat ? parseFloat(utils.query.lat) : 45.051646,
      utils.query.lng ? parseFloat(utils.query.lng) : -93.473078 ],
    zoom: utils.query.zoom ? parseInt(utils.query.zoom, 10) : 17,
    maxZoom: 18,
    minZoom: 10
  });
  let aerial16 = L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
    layers: 'met16'
  }).addTo(map);
  let aerial10 = L.tileLayer.wms('http://geoint.lmic.state.mn.us/cgi-bin/wmsll', {
    layers: 'met10'
  }).addTo(map);

  L.control.sideBySide(aerial10, aerial16).addTo(map);
}


// Draw land chane map
function drawLandChange() {
  let config = 'https://alan-strib.carto.com/api/v2/viz/804d8a61-85b2-4b58-8e07-aa014702698b/viz.json';
  let options = {
    shareable: false,
    title: false,
    description: false,
    search: false,
    cartodb_logo: false,
    center_lat: utils.query.lat ? parseFloat(utils.query.lat) : 44.9463334,
    center_lon: utils.query.lng ? parseFloat(utils.query.lng) : -93.1365967,
    zoom: utils.query.zoom ? parseInt(utils.query.zoom, 10) : 10,
    legends: true,
    fullscreen: true,
  };

  cartodb.createVis('map', config, options)
    .done((carto, layers) => {
      let visual = layers[1];
      window.map = carto.getNativeMap();

      visual.setInteractivity('lud_2010, lud_2016');
      //visual.setQuery('SELECT * FROM land_use_changed_2016 WHERE ch20102016 = \'residential-->industrial\'');
    })
    .on('error', error);
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
throttledFullscreen();

// Handle error
function error(e) {
  console.error(e);
}
