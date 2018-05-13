/**
 * jeelink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
"use strict";

const SerialPort    = require('serialport');
const Delimiter     = require('@serialport/parser-delimiter')

var inherits = require('util').inherits;
var Characteristic, Homebridge, JeeLinkParser;

const CELSIUS_UNITS = 'C',
      FAHRENHEIT_UNITS = 'F';

module.exports = function(homebridge) {
    Homebridge = homebridge;
    Characteristic = homebridge.hap.Characteristic;
    JeeLinkParser = require('./jeelink.js')(homebridge);

    return JeeLink;
};

function JeeLink(log, config, api) {

    var _this = this;

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object
        this.api = api;
        
        // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories.
        this.api.on('didFinishLaunching', function() {
            _this.log("DidFinishLaunching");
        }.bind(this));
    } else {
        return;
    }

    this.log = log;
    this.accessories = [];

    this.config = config || {};
    this.JeeLinkParser = new JeeLinkParser( log, _this );

    log.debug( this.config );

    this.options = this.config.options || {};
    this.interval = 1000 * (this.config.interval || 60);  // 1 minute
    this.options.debug = this.config.debug === "true";

    this.options.definedNames = this.config.definedNames || [];

    // device
    this.options.device = this.config.device || '/dev/ttyUSB0';
    this.options.baudrate = this.config.baudrate || 56700;
    this.options.units = this.config.unit || CELSIUS_UNITS;

    if (this.options.units !== CELSIUS_UNITS && this.options.units !== FAHRENHEIT_UNITS) {
      this.log('Bad temperature units : "' + this.units + '" (assuming Celsius).');
      this.options.units = CELSIUS_UNITS;
    }

    // Init parser
    this.activePort = new SerialPort(this.options.device, {
        baudRate: this.options.baudrate
    });

    // Set up the device
    var pipe = this.activePort.pipe(new Delimiter({ delimiter: '\n' }))

    pipe.on('open', function () {
      return _this.log('Serial port open');
    });

    pipe.on('data', this.setValue.bind(this));
    this.lastStartToRead = Date.now();
}

JeeLink.Context = 'JeeLink';

JeeLink.prototype = {
    // Read a new value
    setValue: function(value) {
        this.JeeLinkParser.parseValue(''+value);

        // Return in debug mode -> continous flow
        if ( this.options.debug ) return;

        // Checking the timer, running for this.interval ms and stopping for the same time then.
        this.log.debug("Timer State: " + (Date.now() - this.lastStartToRead) );
        if ( Date.now() - this.lastStartToRead > this.interval ) {
            this.log.debug("Waiting for " + this.interval + "ms" );
            this.activePort.pause();

            var _self = this;
            setTimeout( function(){
                _self.activePort.flush();
                _self.activePort.resume();
                _self.log.debug("Reading for " + _self.interval + "ms" );
            }, this.interval);
        }
    },

    configureAccessory: function(accessory) {
        this.log.info("Configure Accessory", accessory.displayName);
        
        var newAccessory = this.JeeLinkParser.configure( accessory );
        this.api.updatePlatformAccessories( [ newAccessory ] );
        this.accessories.push(newAccessory);
    },

    addAccessory: function( newAccessory ) {

        var existing = this.accessories.find(function(accessory){
            return accessory.UUID === newAccessory.UUID;
        }) || null;

        // Only once
        if ( existing !== null ) return;
        this.log.info( "adding new accessory: " + newAccessory.context.deviceID );

        this.accessories.push(newAccessory);
        this.api.registerPlatformAccessories("homebridge-jeelink", "jeelink", [ newAccessory ]);
    },

    getName: function( deviceID ) {
        return this.options.definedNames[deviceID] || deviceID;
    },

    getDevice: function( deviceID ) {

        var _self = this;
        this.accessories = this.accessories.filter(function(accessory){

            accessory.reachable = ( Date.now() - accessory.context.lastUpdate > 2 * _self.interval );
            if ( Date.now() - accessory.context.lastUpdate > 3 * _self.interval ) {
                _self.api.unregisterPlatformAccessories("homebridge-jeelink", "jeelink", [ accessory ]);
                _self.log.error("Could not find accessory anymore. Rmoved", accessory.context);
                return false;
            }
            return true;
        });

        var device = this.accessories.find(function(device) {
            return device.context.deviceID === deviceID;
        });
        return device || null; // safeguard
    }
};
