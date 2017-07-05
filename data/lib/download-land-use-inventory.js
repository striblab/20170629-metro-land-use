/**
 * Use nightmare to download land use inventory.
 * https://stats.metc.state.mn.us/data_download/dd_start.aspx
 */

// Dependencies
const path = require('path');
const Nightmare = require('nightmare');
require('nightmare-inline-download')(Nightmare);

// Input and out
const argv = require('yargs').argv;
if (!argv.set) {
  throw new Error('--set (city|county) required');
}
if (!argv.output) {
  throw new Error('--output required');
}


let nightmare = Nightmare({ show: !!process.env.DEBUG });
nightmare
  .goto('https://stats.metc.state.mn.us/data_download/dd_start.aspx')
  // Land use inventory
  .click('#ctl00_ContentArea_ASPxRadioButtonListDS_RB13')
  .wait()
  // All communities or counties
  .click(argv.set === 'county' ?
    '#ctl00_ContentArea_ASPxRadioButtonListLevel_RB1' :
    '#ctl00_ContentArea_ASPxRadioButtonListLevel_RB0')
  .click('#ctl00_ContentArea_btnStartNext')
  .wait()

  // All communites
  .wait('#ctl00_ContentArea_lstGeographies')
  .select('#ctl00_ContentArea_lstGeographies', 'R11000')
  .click('#ctl00_ContentArea_btnNextCommSelect')
  .wait()

  // All years
  .wait('#ctl00_ContentArea_lstYears')
  .select('#ctl00_ContentArea_lstYears', '9999')
  .click('#ctl00_ContentArea_btnDownload')
  .wait()

  // Download
  .wait('#ctl00_ContentArea_btnExportToExcel1')
  .click('#ctl00_ContentArea_btnExportToExcel1')
  .download(argv.output[0] === '/' ? argv.output : path.join(process.cwd(), argv.output))
  .evaluate(() => {
    // Nothing
  })
  .end()
  .then(() => {
    console.log('Done.');
  })
  .catch((error) => {
    console.error(error);
  });
