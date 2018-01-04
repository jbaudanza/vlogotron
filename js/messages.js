const en = require("messageformat-loader?locale=en&intlSupport=true!json-loader!../lang/en");
const ko = require("messageformat-loader?locale=ko&intlSupport=true!json-loader!../lang/ko");

export default {
  en: en,
  ko: Object.assign({}, en, ko)
};
