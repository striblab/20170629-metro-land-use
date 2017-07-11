/**
 * Analysis of land use inventory.
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const mkdirp = require('mkdirp');
const csv = require('d3-dsv').dsvFormat(',');
const table = require('./console-table.js');

// Input and out
const argv = require('yargs').argv;
if (!argv['land-use']) {
  throw new Error('--land-use required');
}

// Load up data to match
function inputJSON(i) {
  return JSON.parse(fs.readFileSync(i[0] === '/' ? i : path.join(process.cwd(), i), 'utf-8'));
}

const inventory = inputJSON(argv['land-use']);

// Output csv
const outputCSV = (name, data) => {
  data = _.map(data);
  const dir = path.join(__dirname, '..', 'build', 'land-use-inventory-analysis-outputs');
  mkdirp.sync(dir);
  fs.writeFileSync(path.join(dir, name), csv.format(data));
};

// Join on field
const join = (key, fields, sort, ...inputs) => {
  let output = {};

  inputs.forEach((set) => {
    _.each(set, (row) => {
      output[row[key]] = output[row[key]] || {};
      output[row[key]] = _.merge(output[row[key]], _.pick(row, [key].concat(fields)));
    });
  });

  return _.sortBy(output, sort);
};

// Category change
const categoryChange = (filter, y1 = 2010, y2 = 2016, category = 'undeveloped') => {
  filter = _.isString(filter) ? { type: filter } : filter;

  return _.sortBy(_.map(_.groupBy(_.filter(inventory, filter), 'name'), (area, ci) => {
    let c1 = _.find(area, { year: y1 });
    let c2 = _.find(area, { year: y2 });
    let a1 = _.find(c1.categories, { category: category });
    let a2 = _.find(c2.categories, { category: category });
    a1 = a1 ? a1.acres : 0;
    a2 = a2 ? a2.acres : 0;
    let output = {};

    output.area = ci;
    output[category + ' acres ' + y1] = Math.round(a1);
    output[category + ' acres ' + y2] = Math.round(a2);
    output[y1 + ' ' + y2 + ' % change'] = Math.round(((a2 - a1) / a1) * 10000) / 100;

    return output;
  }), '% change');
};

// Undeveloped change
table('Undeveloped by county 2010-2016', categoryChange('county'));
table('Undeveloped by county 2005-2010', categoryChange('county', 2005, 2010));
table('Undeveloped by county 2000-2005', categoryChange('county', 2000, 2005));
table('Undeveloped by city (10000+ acres) 2010-2016', categoryChange((a) => {
  return a.type === 'city' && a.acres >= 10000;
}));

// Industrial change
table('Industrial by county 2010-2016', categoryChange('county', 2010, 2016, 'industrial'));
table('Industrial by city (10000+ acres) 2010-2016', categoryChange((a) => {
  return a.type === 'city' && a.acres >= 10000;
}, 2010, 2016, 'industrial'));

// Industrial change
table('Residential (low density) by county 2010-2016', categoryChange('county', 2010, 2016, 'residential'));
table('Residential (low density) by city (10000+ acres) 2010-2016', categoryChange((a) => {
  return a.type === 'city' && a.acres >= 10000;
}, 2010, 2016, 'residential'));


// All category changes by county
['undeveloped', 'residential', 'residential-dense', 'industrial', 'commercial', 'park'].forEach((cat) => {
  outputCSV(cat + '-use-change-by-county.csv',
    join('area', [cat + ' acres 2000', '2000 2005 % change', '2005 2010 % change', '2010 2016 % change'],
      'area',
      categoryChange('county', 2000, 2005, cat),
      categoryChange('county', 2005, 2010, cat),
      categoryChange('county', 2010, 2016, cat)));
});

// All category changes by city
['undeveloped', 'residential', 'residential-dense', 'industrial', 'commercial', 'park'].forEach((cat) => {
  outputCSV(cat + '-use-change-by-city.csv',
    join('area', [cat + ' acres 2000', '2000 2005 % change', '2005 2010 % change', '2010 2016 % change'],
      'area',
      categoryChange('city', 2000, 2005, cat),
      categoryChange('city', 2005, 2010, cat),
      categoryChange('city', 2010, 2016, cat)));
});


// All changes
let allChanges = (filter, y1 = 2010, y2 = 2016) => {
  filter = _.isString(filter) ? { type: filter } : filter;

  return _.sortBy(_.map(_.groupBy(_.filter(inventory, filter), 'name'), (area, ci) => {
    let c1 = _.find(area, { year: y1 });
    let c2 = _.find(area, { year: y2 });
    let changed = _.sumBy(c1.categories, (c) => {
      let a2 = _.find(c2.categories, { category: c.category });
      return Math.abs(c.acres - (a2 ? a2.acres : 0));
    });
    let output = {};

    output.area = ci;
    output['total acres ' + y2] = Math.round(c2.acres)
    output['acres changed'] = Math.round(changed);
    output['% of total ' + y2] = Math.round((changed / c2.acres) * 10000) / 100;

    return output;
  }), '% of total ' + y2);
};
table('All category changes by county 2010-2016', allChanges('county'));
table('All category changes by county 2005-2010', allChanges('county', 2005, 2010));
table('All category changes by city (10000+ acres) 2010-2016', allChanges((a) => {
  return a.type === 'city' && a.acres >= 10000;
}));
