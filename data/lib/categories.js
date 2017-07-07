/**
 * Categories of land use.
 */

const _ = require('lodash');

const categories = {
  'residential': [/single family detached/i, /farmstead/i, /manufactured housing.*/i, /seasonal.*vacation/i, 'Single Family Residential'],
  'residential-dense': ['Single Family Attached', 'Multifamily', 'Multi-Family Residential'],
  'commercial': ['Commercial', 'Retail and Other Commercial', 'Office'],
  'industrial': ['Industrial', 'Industrial and Utility', /Extractive.*/i, 'Institutional', /public industrial.*/i],
  'mixed': ['Mixed Use Commercial', 'Mixed Use Commercial and Other', 'Mixed Use Residential', 'Mixed Use Industrial'],
  'park': [/park.*recreation.*/i, 'Golf Course'],
  'undeveloped': ['Undeveloped', /agricultur(al|e)/i, 'Industrial Parks not Developed'],
  'transportation':  [/Airport.*/i, 'Major Highway', 'Railway', 'Major Railway', 'Major Four Lane Highways'],
  'other': ['Water', /Open Water.*/i, 'Public & Semi-Public Vacant', 'Public Semi-Public'],
  'unknown': ['No available data', /No Data.*/i]
};

const categorize = (input) => {
  let f = undefined;

  _.find(categories, (set, category) => {
    return _.find(set, (match) => {
      if (input === match || (_.isRegExp(match) && input.match(match))) {
        f = category;
        return true;
      }
    });
  });

  return f;
};

module.exports = {
  categories: categories,
  categorize: categorize
};
