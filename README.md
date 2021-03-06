# Metro Land Use

Analysis and visual for metro land use.


## Data

* Land use data for the Twin Cities metro area on [MN Geospatial Commons](https://gisdata.mn.gov/dataset/us-mn-state-metc-plan-generl-lnduse-historical).
    * [Details about the data](ftp://ftp.gisdata.mn.gov/pub/gdrs/data/pub/us_mn_state_metc/plan_generl_lnduse_historical/metadata/metadata.html)
* Counties and population by race via [Census Reporter](https://censusreporter.org/data/table/?table=B03002&geo_ids=050|04000US27).
* Cities and population by race via [Census Reporter](https://censusreporter.org/data/table/?table=B03002&geo_ids=060|04000US27).
    * NOTE: The Census cities (sub-county) area is slightly different from what is defined as a [CTU for the metro area](https://gisdata.mn.gov/dataset/us-mn-state-metc-bdry-census2010counties-ctus).

### Data processing

1. Install dependencies for PostGIS, wget, ogr2ogr.
    * On a Mac: `brew install postgis wget gdal`
        * You can use the [Postgres app](https://postgresapp.com/), but make sure to install `postgis` through Homebrew so that `shp2pgsql` is available.
    * NOTE: PostGIS is used because processing via Node.js is prohibitively slow.
1. Make sure Postgres is running.
1. Run the following: `npm run data`
    * This is just a wrapper around [Jake](http://jakejs.com/) and any options can be passed, for instance `npm run data -- -ls`

## Embed

The project is designed to be a full page, linkable piece, as well as an embed.  The best way to embed the piece is with the following code:

```html
<style type="text/css">
  .dataframe { height:840px; }
  @media only screen and (min-width: 200px) and (max-width: 900px) {
    .dataframe { height:870px; }
  }
  .l-article-topper, .l-article-body {width:880px !important; }
  .l-section-inner { border-right:none !important }
</style>

<div id="land-use-embed">Loading...</div>
<script type="text/javascript">
  (function(){ window.pym = undefined; })();
</script>

<script src="https://s3.amazonaws.com/stribtest-bucket/projects/20170629-metro-land-use/pym-wrapper.bundle.js" type="text/javascript"></script>

<script type="text/javascript">
  (function(){
    var pymParent = new pym.Parent(
      "land-use-embed",
      "https://s3.amazonaws.com/stribtest-bucket/projects/20170629-metro-land-use/index.html"
    );
  })();
</script>
```

## Development

### Install

The following are global prerequisites and may already be installed.

1. (on Mac) Install [homebrew](http://brew.sh/).
1. Install [Node.js](https://nodejs.org/en/).
    * (on Mac) `brew install node`
1. Install [Gulp](http://gulpjs.com/): `npm install gulp -g`

The following should be performed for initial and each code update:

1. Install Node dependencies: `npm install`

### Local

To run a local web server that will auto-reload with [Browsersync](https://browsersync.io/), watch for file changes and re-build: `gulp develop`

### Directories and files

* `config.json`: Non-content config for application.
    * Use this to add non-local JS or CSS assets, such as from a CDN.
    * This can be overridden with a `config.custom.json` if there is a need to add configuration that should not be put into revision history.
* `content.json`: See *Content and copy*.  This file is used to hold content values.  If the project is hooked up to a Google Spreadsheet, you should not manually edit this file.
* `templates/`: Holds HTML-like templates.  Any files in here will get run through [EJS](http://www.embeddedjs.com/) templating and passed values from `config.json`, `content.aml`, and `package.json`.
    * `templates/index.ejs.html`: The default page for the application.
* `styles/`: Styles in [SASS](http://sass-lang.com/) syntax.
    * `styles/index.scss`: Main point of entry for styles.
    * `styles/_*.scss`: Any includes should be prefixed with an underscore.
* `app/`: Where JS logic goes.  This supports ES2015 JS syntax with [Babel](https://babeljs.io/) and gets compiled with [Webpack](https://webpack.js.org/).
    * `app/index.js`: Main entry point of application.
* `assets/`: Various media files.  This gets copied directly to build.
* `sources/`: Directory is for all non-data source material, such as wireframes or original images.  Note that if there are materials that should not be made public, consider using Dropbox and make a note in this file about how to access.
* `lib/`: Modules used in building or other non-data tasks.
* `tests/`: Tests for app; see Testing section below.
* The rest of the files are for building or meta-information about the project.

### Content and copy

By default, content items can be managed in `content.json`.  The values put in here will be available in the templates in the `templates/` directory as the `content` object.  This can be a helpful way to separate out content from code.

#### Google Spreadsheets

If `config.json` has a `content.spreadsheetId` value specified, `content.json` can be updated with information from a Google Spreadsheet.

Since getting this content may not be very speedy, this is not done during `gulp develop`, so it requires a manual call: `gulp content`

##### Setting up

If you went through the [Striblab Generator](), then this is probably already set up for you, but in case it is not.

Getting content from a Google Spreadsheet depends on a few configurations.  You need need a Google Account (such as a Gmail account) and a Google Developer API Service Account that has read and write access to Google Sheets and Google Drive.  You should then set the following environment variables.  You can store these values in a [`.env`](https://www.npmjs.com/package/dotenv) file.

* `GOOGLE_AUTH_CLIENT_EMAIL`: This will be something like *XXXXXX@XXXXXX.iam.gserviceaccount.com*.
* `GOOGLE_AUTH_PRIVATE_KEY`: This will be something pretty long, like *--BEGIN PRIVATE--XXXXX--END PRIVATE KEY--*

*TODO* (Find some good instructions for using the Google Developer Console; unfortunately its complex and changes often.)

You can then set up a new spreadsheet with the following command, updating the email to use your Google Email.  The Google Email you use will become the owner of the document.  Note that a Google Email is not always a `@gmail.com` account.

    gulp content:create --email XXXXX@gmail.com

You can then add collaborators to the spreadsheet with the following command.  Note that you can do this in the Google Spreadsheet as well.

    gulp content:share --email XXXXX@gmail.com

##### Spreadsheet format

If you are using Google Spreadsheets for content, the headers should be `Key`, `Value`, `Type`, and `Notes`.  It is important that these are there in that exact way.  It is suggested to freeze the header row in case someone changes the order of the spreadsheet.

### Dependencies and modules

Depending on what libraries or dependencies you need to include there are a few different ways to get those into the project.

* **JS**
    * Include it with `npm`.
        * For instance: `npm install --save awesome-lib`
        * This can then be included in the application, with something like:
          ```js
          import awesome from 'awesome-lib';
          awesome.radical();
          ```
    * For dependencies that are very common and are available through a trusted CDN, you can include it in `config.json`.  Consider using the [StribLab static libs CDN](https://github.com/striblab/static-libs).
        * For instance:
          ```js
          "js": {
            "globals": [
              "https://cdnjs.cloudflare.com/ajax/libs/pym/1.1.2/pym.v1.min.js"
            ]
          }
          ```
        * In your application, make sure to add a comment like the following so that linters will know that the dependency is already loaded.
          ```js
          /* global Pym */
          ```
        * **IMPORTANT** Make sure to always use a specific version from a CDN; do not use *latest* or something similar.
    * For local modules that you have written yourself, you can use the ES6 module syntax.
        * For instance, say you have created a `utils.js` module file, just use a relative path to include it:
          ```js
          import utilsFn from './utils.js';
          let utils = utilsFn({ });
          ```
* **CSS**
    * *(TODO) Find a good way to include CSS libraries locally.  Many are available on npm, so maybe just do include in SASS files?*
    * For dependencies that are very common and are available through a trusted CDN, you can include it in `config.json`.  Consider using the [StribLab static libs CDN](https://github.com/striblab/static-libs).
        * For instance:
          ```js
          "css": {
            "globals": [
              "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"
            ]
          }
          ```
        * **IMPORTANT** Make sure to always use a specific version from a CDN; do not use *latest* or something similar.

### Testing

Testing is run via [Jest](https://facebook.github.io/jest/).  Fast, unit and higher level testing will happen on build.  You can run these test manually with `gulp js:test` or `npm test`.

*TODO*: There is a start of using headless Chrome for some functional testing in `tests/functional/basics.test.TODO.js`.  Unfortunately these take about 30 seconds to run so they are not really appropriate for on-build testing, as well as they need the Chrome (Canary) binary installed independently.

*TODO*: Some basic automated, cross-browser testing would be very beneficial.  Unfortunately things like Browserstack are very expensive, and managing our own servers to do this would be very expensive time-wise as well.

#### Embed testing

A manual test page is provided for looking at the piece embeded in another page.

1. Assumes you are running the development server with `gulp develop`
1. Run a local server for the test directory, such as `cd tests && python -m SimpleHTTPServer` or `http-server ./tests/`
1. In a browser, go to [http://localhost:8080/manual/embed.html](http://localhost:8080/manual/embed.html).

### Build

All parts are compiled into the `build/` folder.  The default complete build can be done with `gulp` or `gulp build`

## Publish and deploy

Deployment is setup for AWS S3.  To setup, set the following environment variables; they can be set in a [.env](https://www.npmjs.com/package/dotenv) file as well.  For further reading on setting up access, see [Configureing the JS-SDK](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/configuring-the-jssdk.html).

* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`
* OR `AWS_DEFAULT_PROFILE`
* OR `AWS_CONFIG_FILE`

To deploy, run `gulp deploy`.  This will build and publish to the location configured as `default` (see *Configuration* below).

To deploy to say the `production` location, simply use that flag like: `gulp deploy --production`

A handy command is to use `gulp publish:open` to open the URl to that project.

### Configuration

Publishing is configured in the `config.json` file.  The `publish` property can have the following keys: `default`, `testing`, `staging`, and `production`.  Only the `default` is actually necessary.  Each key should correspond to an object with `bucket`, `path`, and `url`.  For example:

```js
{
  "publish": {
    "default": {
      "bucket": "static.startribune.com",
      "path": "projects-staging/20170629-metro-land-use/",
      "url": "http://static.startribune.com/projects-staging/20170629-metro-land-use/"
    },
    "production": {
      "bucket": "static.startribune.com",
      "path": "projects/20170629-metro-land-use/",
      "url": "http://static.startribune.com/projects/20170629-metro-land-use/"
    }
  }
}
```

Using the flags `--testing`, `--staging`, or `--production` will switch context for any relevant `publish` or `deploy` commands.  Note that if the flag is not configured, the `default` will be used.

### Publishing token

The publishing function, uses a token that helps ensure a name collision with another project doesn't overwrite files unwittingly.  The `publishToken` in `config.json` is used as an identifier.  This gets deployed to S3 and then checked whenever publishing happens again.  The `gulp publish` (run via `gulp deploy`) will automatically create this token if it doesn't exist.

If you see an error message that states that the tokens do not match, make sure that the location you are publishing to doesn't have a different project at it, or converse with teammates or administrators about the issue.


### Styles and practices

Having a consistent style for code and similar aspects makes collaboration easier.  Though there is nothing that enforces these things, intentionally so, spending some time to adhere to these styles will be beneficial in the long run.

* **JS**: Javascript is linted with [ESLint](http://eslint.org/) and defined in `.eslintrc`.
    * The defined style extends from [eslint:recommended](https://github.com/eslint/eslint/blob/master/conf/eslint.json) but is more focal about single quotes for strings and using semicolons.
    * Install the following ESLint plugins for [Atom](https://atom.io/packages/linter-eslint), [Sublime Text](https://github.com/roadhump/SublimeLinter-eslint), or [others](http://eslint.org/docs/user-guide/integrations).
* **Styles**: SASS (and CSS) is linted with [stylelint](https://stylelint.io/) and defined in `.styleintrc`.
    * The defined style extends from [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard) with a couple additions to how colors are defined.
    * Install the following stylelint plugins for [Atom](https://atom.io/packages/linter-stylelint), [Sublime Text](https://github.com/kungfusheep/SublimeLinter-contrib-stylelint), or [others](https://stylelint.io/user-guide/complementary-tools/).

Other good practices that are not encompassed with linters.

* **General**
  * Comment as much as possible without being overly redundant.
* **JS**
    * Use small modules as much as possible.
* **Styles**
    * Use `class`es instead of `id`s for HTML elements, specifically for styling and JS.
    * Use relative units such as `rem`, `em`, `vh`, `vw`, or `%`, instead of absolute values such as `px`.  This helps accessibility as well as designing for different screen sizes.
        * Overall, use `rem` for "component" level styling, such as a form, and then use `em` for styling inside components.

## License

Code is licensed under the MIT license included here.  Content (such as images, video, audio, copy) can only be reused with express permission by Star Tribune.
