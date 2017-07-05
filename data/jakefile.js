/**
 * Jakefile (build file) for data tasks.
 *
 * NOTE: Attempt to use Jakefile for first time.
 */

// Dependencies
const jake = require('jake');
const jakeConfig = require('./lib/jake-config.js');

// Change directory to this one
process.chdir(__dirname);

// Main default task
jake.desc('Main/default task to fully process data.');
jake.task('default', ['combine']);


// Turn config into jake tasks
jakeConfig([
  // Downloads
  {
    task: 'sources/shp_plan_generl_lnduse_historical.zip',
    desc: 'Download land use shapefile from MN Geo.',
    group: 'download',
    commands: [
      'wget "ftp://ftp.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_metc/plan_generl_lnduse_historical/shp_plan_generl_lnduse_historical.zip" -O "sources/shp_plan_generl_lnduse_historical.zip"'
    ]
  },
  {
    task: 'sources/mn-counties-acs2015-pop-race.zip',
    desc: 'Download MN counties from Census Reporter',
    group: 'download',
    commands: [
      'wget "https://api.censusreporter.org/1.0/data/download/latest?table_ids=B03002&geo_ids=050|04000US27&format=geojson" -O "sources/mn-counties-acs2015-pop-race.zip"'
    ]
  },
  {
    task: 'sources/mn-subcounties-acs2015-pop-race.zip',
    desc: 'Download MN cities from Census Reporter',
    group: 'download',
    commands: [
      'wget "https://api.censusreporter.org/1.0/data/download/latest?table_ids=B03002&geo_ids=060|04000US27&format=geojson" -O "sources/mn-subcounties-acs2015-pop-race.zip"'
    ]
  },
  {
    task: 'sources/land-use-inventory-cities.zip',
    desc: 'Download land use inventory by city',
    group: 'download',
    commands: [
      'node ./lib/download-land-use-inventory.js --set=city --output="./sources/land-use-inventory-cities.zip"'
    ]
  },
  {
    task: 'sources/land-use-inventory-counties.zip',
    desc: 'Download land use inventory by county',
    group: 'download',
    commands: [
      'node ./lib/download-land-use-inventory.js --set=county --output="./sources/land-use-inventory-counties.zip"'
    ]
  },


  // Unpack
  {
    task: 'sources/land-use/GeneralizedLandUseHistorical.shp',
    desc: 'Unpack land use shapefile from MN Geo.',
    group: 'unpack',
    commands: [
      'unzip -o -d "sources/land-use" "sources/shp_plan_generl_lnduse_historical.zip"',
      'touch sources/land-use/GeneralizedLandUseHistorical.shp'
    ],
    deps: ['sources/shp_plan_generl_lnduse_historical.zip']
  },
  {
    task: 'sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson',
    desc: 'Unpack counties from Census Reporter.',
    group: 'unpack',
    commands: [
      'unzip -o -d "sources/mn-counties-acs2015-pop-race" "sources/mn-counties-acs2015-pop-race.zip"',
      'touch sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson'
    ],
    deps: ['sources/mn-counties-acs2015-pop-race.zip']
  },
  {
    task: 'sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson',
    desc: 'Unpack cities from Census Reporter.',
    group: 'unpack',
    commands: [
      'unzip -o -d "sources/mn-subcounties-acs2015-pop-race" "sources/mn-subcounties-acs2015-pop-race.zip"',
      'touch sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson'
    ],
    deps: ['sources/mn-subcounties-acs2015-pop-race.zip']
  },
  {
    task: 'sources/land-use-inventory-cities/DataDownload-land_use.csv',
    desc: 'Unpack land use inventory by city.',
    group: 'unpack',
    commands: [
      'unzip -o -d "sources/land-use-inventory-cities" "sources/land-use-inventory-cities.zip"',
      'touch sources/land-use-inventory-cities/DataDownload-land_use.csv'
    ],
    deps: ['sources/land-use-inventory-cities.zip']
  },
  {
    task: 'sources/land-use-inventory-counties/DataDownload-land_use.csv',
    desc: 'Unpack land use inventory by county.',
    group: 'unpack',
    commands: [
      'unzip -o -d "sources/land-use-inventory-counties" "sources/land-use-inventory-counties.zip"',
      'touch sources/land-use-inventory-counties/DataDownload-land_use.csv'
    ],
    deps: ['sources/land-use-inventory-counties.zip']
  },


  // Transforms
  {
    task: 'build/land-use-4326/land-use-4326.shp',
    desc: 'Reproject land use shapefile.',
    group: 'transform',
    commands: [
      'echo "Some warnings may appear about data too long, this is ok."',
      'ogr2ogr -f "ESRI Shapefile" "build/land-use-4326/land-use-4326.shp" "sources/land-use/GeneralizedLandUseHistorical.shp" -t_srs EPSG:4326'
    ],
    deps: [
      'sources/land-use/GeneralizedLandUseHistorical.shp'
    ]
  },


  // Combine
  {
    type: 'task',
    task: 'build/land-use-combined.geo.json',
    desc: 'Combine land use and population data.',
    group: 'combine',
    commands: [
      ['node ./lib/land-use-combine.js ',
        '--land-use="build/land-use-4326/land-use-4326.shp" ',
        '--counties="sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson"',
        '--cities="sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson"',
        '--output="build/land-use-combined.geo.json"']
    ],
    deps: [
      'build/land-use-4326/land-use-4326.shp',
      'sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson',
      'sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson']
  },
]);
