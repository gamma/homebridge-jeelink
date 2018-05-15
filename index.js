/**
 * JeeLink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
"use strict";

module.exports = function(homebridge) {
    let JeeLink = require('./lib/platform')(homebridge);
    homebridge.registerPlatform("homebridge-jeelink", "JeeLink", JeeLink, true);
};
