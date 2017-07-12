/**
 * Jakefile (build file) for data tasks.
 *
 * NOTE: Attempt to use Jakefile for first time.
 */

// Dependencies
const os = require('os');
const jake = require('jake');
const jakeConfig = require('./lib/jake-config.js');

// Change directory to this one
process.chdir(__dirname);

// User name
let username = os.userInfo().username;

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
    task: 'build/land-use-inventories-combined.json',
    desc: 'Combine land use inventories data.',
    group: 'combine',
    commands: [
      ['node ./lib/land-use-inventory-combine.js ',
        '--counties="sources/land-use-inventory-counties/DataDownload-land_use.csv"',
        '--cities="sources/land-use-inventory-cities/DataDownload-land_use.csv"',
        '--output="build/land-use-inventories-combined.json"']
    ],
    deps: [
      'sources/land-use-inventory-cities/DataDownload-land_use.csv',
      'sources/land-use-inventory-counties/DataDownload-land_use.csv']
  },


  // Combine and process with PostGIS.
  {
    task: 'data/build/land-use-combined/land-use-combined.shp',
    desc: 'Combine and process with PostGIS.  Will take some time.',
    group: 'process',
    commands: [
      // Setup database
      'createdb land_use;',
      // Setup PostGIS
      'psql -d land_use -c "CREATE EXTENSION postgis;"',
      'psql -d land_use -c "CREATE EXTENSION postgis_topology;"',
      // Import land use
      'shp2pgsql -s 4326 build/land-use-4326/land-use-4326.shp land_use | psql -d land_use',
      // Import subcounties
      [
        'ogr2ogr -f "PostgreSQL" PG:"dbname=land_use user=' + username + '" ',
        '"sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson" ',
        '-nln mn_subcounties -s_srs "EPSG:4326" -t_srs "EPSG:4326" ',
        '-lco GEOMETRY_NAME=geom'
      ],
      [
        'ogr2ogr -f "PostgreSQL" PG:"dbname=land_use user=' + username + '" ',
        '"data/sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson" ',
        '-nln mn_counties -s_srs "EPSG:4326" -t_srs "EPSG:4326" ',
        '-lco GEOMETRY_NAME=geom'
      ],
      // Run processing script
      'psql -d land_use -a -f lib/land-use-processing.sql',
      // Output to shapefile
      'pgsql2shp -f build/land-use-combined/land-use-combined.shp land_use "SELECT * FROM land_use_split_co" -g geom'
    ],
    deps: [
      'build/land-use-4326/land-use-4326.shp',
      'sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson',
      'data/sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson'
    ]
  },


  // Land use formatting
  {
    task: 'build/land-use-formatted.geo.json',
    desc: 'Format and process land use combined data.',
    group: 'format',
    commands: [
      [
        'node ./lib/land-use-format.js ',
        '--land-use="build/land-use-combined/land-use-combined.shp" ',
        '--cities="sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson" ',
        '--counties="sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson" ',
        '--output=build/land-use-formatted.geo.json'
      ]
    ],
    deps: [
      'build/land-use-combined/land-use-combined.shp',
      'sources/mn-subcounties-acs2015-pop-race/acs2015_5yr_B03002_06000US2713904852/acs2015_5yr_B03002_06000US2713904852.geojson',
      'sources/mn-counties-acs2015-pop-race/acs2015_5yr_B03002_05000US27079/acs2015_5yr_B03002_05000US27079.geojson']
  },


  // Export undeveloped to shapefile for Carto
  {
    task: 'build/land-use-undeveloped-2005-2010.zip',
    desc: 'Export land use data into shapefile.',
    group: 'export',
    commands: [
      'mkdir -p build/land-use-undeveloped-2005-2010',
      [
        'ogr2ogr -F "ESRI Shapefile" "build/land-use-undeveloped-2005-2010/land-use-undeveloped-2005-2010.shp" ',
        '"build/land-use-formatted.geo.json" ',
        '-sql "SELECT LUD_2005, LUD_2010, LUD_2016, luc_2005, luc_2010, luc_2016, ch20052010, ch20102016',
        'FROM OGRGeoJSON WHERE (ch20052010 <> \'undeveloped-undeveloped\' AND ch20052010 LIKE \'undeveloped-%\')',
        'OR (ch20102016  <> \'undeveloped-undeveloped\' AND ch20102016 LIKE \'undeveloped-%\')"'
      ],
      'zip -r build/land-use-undeveloped-2005-2010.zip build/land-use-undeveloped-2005-2010/'
    ],
    deps: [
      'build/land-use-formatted.geo.json',
    ]
  },


  // Land use aggregate for analysis
  {
    task: 'build/land-use-aggregate.json',
    desc: 'Aggregate land use features for analysis.',
    group: 'aggregate',
    commands: [
      [
        'node ./lib/land-use-aggregate.js ',
        '--land-use="build/land-use-formatted.geo.json" ',
        '--output="build/land-use-aggregate.json"'
      ]
    ],
    deps: [
      'build/land-use-formatted.geo.json']
  },


  // Land use inventory analysis
  {
    type: 'task',
    task: 'land-use-analysis',
    desc: 'Land use aggregate analysis.',
    group: 'analysis',
    commands: [
      ['node ./lib/land-use-analysis.js ',
        '--aggregates="build/land-use-aggregate.json" ']
    ],
    deps: [
      'build/land-use-aggregate.json']
  },

  // Land use inventory analysis
  {
    type: 'task',
    task: 'land-use-inventory-analysis',
    desc: 'Combine land use and population data.',
    group: 'analysis',
    commands: [
      ['node ./lib/land-use-inventory-analysis.js ',
        '--land-use="build/land-use-inventories-combined.json" ']
    ],
    deps: [
      'build/land-use-inventories-combined.json']
  },
]);
