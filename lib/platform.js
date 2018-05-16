/**
 * JeeLink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
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

// Keep them global
var AccessoryList = [];

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

    this.config = config || {};
    this.JeeLinkParser = new JeeLinkParser( _this );

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

    MAY_READ_SERIAL: true,

    setValue: function(value) {

        if ( !this.MAY_READ_SERIAL ) { return; }
        
        // Checking the timer, running for this.interval ms and stopping for the same time then.
        this.log.debug("Timer State:", (Date.now() - this.lastStartToRead), value.toString() );
        if ( Date.now() - this.lastStartToRead < this.interval || this.options.debug ) {
            this.JeeLinkParser.parseValue(value); // value is a buffer

        } else if ( !this.options.debug ) {

            var _self = this;
            _self.MAY_READ_SERIAL = false;
            _self.log.debug("Waitung for " + _self.interval + "ms" );

            setTimeout( function(){
                _self.log.debug("Reading for " + _self.interval + "ms" );
                _self.lastStartToRead = Date.now();
                _self.MAY_READ_SERIAL = true;
            }, this.interval);
        }

    },

    configureAccessory: function(accessory) {
        this.log.info("Configure Accessory:", accessory.displayName, accessory.UUID);

        var _self = this;
        var devices = AccessoryList.filter(function(internalAccessory){
            // Is this the device we're looking for?
            return accessory.UUID === internalAccessory.UUID;
        });

        if ( devices.length == 0 ) {
            var newAccessory = this.JeeLinkParser.configure( accessory );
            AccessoryList.push(newAccessory);
    
            this.api.updatePlatformAccessories( [ newAccessory ] );
        } else {
            this.log.debug( "Accessory already existed:", accessory.displayName );
        }
    },

    addAccessory: function( newAccessory ) {

        var existing = AccessoryList.find(function(accessory){
            return accessory.UUID === newAccessory.UUID;
        }) || null;

        // Only once
        if ( existing !== null ) return;
        this.log.info( "adding new accessory: " + newAccessory.context.deviceID );

        AccessoryList.push(newAccessory);
        this.api.registerPlatformAccessories("homebridge-jeelink", "JeeLink", [ newAccessory ]);
    },

    getName: function( deviceID ) {
        return this.options.definedNames[deviceID] || deviceID;
    },

    getDevice: function( deviceID ) {

        var _self = this;
        var device = null;

        AccessoryList = AccessoryList.filter(function(accessory){

            // Is this the device we're looking for?
            if ( accessory.context.deviceID === deviceID ) {
                device = accessory;
                return true;
            }

            _self.log.debug("Checking accessory filter: " + accessory.displayName );

            accessory.reachable = ( Date.now() - accessory.context.lastUpdate > 5 * _self.interval );
            if ( Date.now() - accessory.context.lastUpdate > 10 * _self.interval ) {
                _self.api.unregisterPlatformAccessories("homebridge-jeelink", "JeeLink", [ accessory ]);
                _self.log.error("Could not find accessory anymore. Removed: ", accessory.context);
                return false;
            }
            return true;
        });

        _self.log.debug("Returning requested device for id: " + deviceID );

        return device;
    }
};
