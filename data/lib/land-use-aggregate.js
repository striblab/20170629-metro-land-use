/**
 * Aggregate land use shapes into format for analysis.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const geojson = require('geojson-stream');
const through = require('through2');
const pace = require('pace');

// Input and out
const argv = require('yargs').argv;
if (!argv['land-use']) {
  throw new Error('--land-use required');
}
if (!argv.output) {
  throw new Error('--output required');
}

// Place to hold aggregate numbers.
let s = {};

// Progress bar (manually known count)
let pacer = pace(538963);

// Read in data and aggregate
console.log('\nStreaming data and formatting...\n');
let landUse = argv['land-use'][0] === '/' ? argv['land-use'] : path.join(process.cwd(), argv['land-use']);
fs.createReadStream(landUse)
  .pipe(geojson.parse())
  .pipe(through.obj(function(feature, enc, next) {
    let p = feature.properties;
    //console.log(p);

    // Filter out counties no in the metro
    if (!~['Anoka', 'Carver', 'Dakota', 'Hennepin', 'Ramsey', 'Washington', 'Scott'].indexOf(p.co_name)) {
      pacer.op();
      return next(null);
    }

    // Count and aggregate by county and city
    [{ agg: 'byCounty', prefix: 'co_' }, { agg: 'byCity', prefix: 'sc_' }].forEach((set) => {
      s[set.agg] = s[set.agg] || {};
      let area = s[set.agg][p[set.prefix + 'name']] = s[set.agg][p[set.prefix + 'name']] || {};
      area.population = p[set.prefix + 'pop'];
      area.populationError = p[set.prefix + 'pop_e'];
      area.name = p[set.prefix + 'name'];
      area.county = p['co_name'];

      aggregate(area, p);
    });

    // Count and aggregate by population
    s.byPopulation = s.byPopulation || {};
    [{ min: 0, max: 10000 },
      { min: 10000, max: 50000 },
      { min: 50000, max: 100000 },
      { min: 100000, max: 999999 }].forEach((set) => {
      if (p.sc_pop >= set.min && p.sc_pop < set.max) {
        let name = 'Population ' + set.min + ' - ' + set.max;
        let area = s.byPopulation[name] = s.byPopulation[name] || {};
        area.name = name;

        aggregate(area, p);
      }
    });

    // { gid_o: 15985,
    //   gid_s: 91318,
    //   gid_sc: 207091,
    //   area: 54.3502080803737,
    //   lu_1984: 5,
    //   lu_1990: 5,
    //   lu_1997: 5,
    //   lu_2000: '160',
    //   lu_2005: '113',
    //   lu_2010: '160',
    //   lu_2016: '160',
    //   lud_1984: 'Public Semi-Public',
    //   lud_1990: 'Public Semi-Public',
    //   lud_1997: 'Public Semi-Public',
    //   lud_2000: 'Institutional',
    //   lud_2005: 'Single Family Detached',
    //   lud_2010: 'Institutional',
    //   lud_2016: 'Institutional',
    //   sc_id: '06000US2712358000',
    //   co_id: '05000US27123',
    //   gid_co: 209108,
    //   luc_1984: 'other',
    //   luc_1990: 'other',
    //   luc_1997: 'other',
    //   luc_2000: 'industrial',
    //   luc_2005: 'residential',
    //   luc_2010: 'industrial',
    //   luc_2016: 'industrial',
    //   ch20002005: 'industrial-residential',
    //   ch20002010: 'industrial-industrial',
    //   ch20002016: 'industrial-industrial',
    //   ch20052010: 'residential-industrial',
    //   ch20052016: 'residential-industrial',
    //   ch20102016: 'industrial-industrial',
    //   co_name: 'Ramsey',
    //   co_pop: 527411,
    //   co_pop_e: 0,
    //   sc_name: 'St. Paul city, Ramsey County',
    //   sc_pop: 295043,
    //   sc_pop_e: 59,
    //   acres: 0.013430208167700743 }

    pacer.op();
    this.push(feature);
    next(null);
  }))
  .on('data', (feature) => {
    return feature;
  })
  .on('error', (error) => {
    console.error('Geo reading error.');
    console.error(error);
  })
  .on('finish', () => {
    console.log('Done reading.');
    save();
  });

// Aggregate fields
const aggregate = (area, p) => {
  // Total acres
  area.countedAcres = sumField(area.countedAcres, p.acres || 0, 0);

  // Acres by original category by year
  ['lud_1984', 'lud_1990', 'lud_1997', 'lud_2000', 'lud_2005', 'lud_2010', 'lud_2016'].forEach((f) => {
    area[f + '-' + p[f]] = sumField(area[f + '-' + p[f]], p.acres || 0, 0);
  });

  // Acres by general category by year
  ['luc_1984', 'luc_1990', 'luc_1997', 'luc_2000', 'luc_2005', 'luc_2010', 'luc_2016'].forEach((f) => {
    area[f + '-' + p[f]] = sumField(area[f + '-' + p[f]], p.acres || 0, 0);
  });

  // Acres changed
  ['ch20002005', 'ch20002010', 'ch20002016', 'ch20052010', 'ch20052016', 'ch20102016'].forEach((f) => {
    area[f + '-' + p[f]] = sumField(area[f + '-' + p[f]], p.acres || 0, 0);
  });

  return area;
};

// Save aggregate
const save = () => {
  //console.log(s);
  fs.writeFileSync(argv.output[0] === '/' ? argv.output : path.join(process.cwd(), argv.output), JSON.stringify(s));
};

// Count field
const countField = (current) => {
  return current ? current + 1 : 1;
};

// Sum field
const sumField = (current, addition, initial) => {
  return current ? current + addition : initial + addition;
};
