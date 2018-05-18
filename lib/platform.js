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

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object
        this.api = api;
        
        // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories.
        this.api.on('didFinishLaunching', function() {
            log("DidFinishLaunching");
        }.bind(this));
    } else {
        return;
    }

    this.log = log;

    this.config = config || {};
    this.JeeLinkParser = new JeeLinkParser( this );

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

	this.openPort();
}

JeeLink.Context = 'JeeLink';

JeeLink.prototype = {

    // Read a new value
    openPort: function() {

		var self = this;

        // Init parser
        var port = new SerialPort(this.options.device, {
           baudRate: this.options.baudrate
        });

        // Set up the device
        var pipe = port.pipe(new Delimiter({ delimiter: '\r\n' }));
		
        self.log.debug("Reading for " + self.interval + "ms" );
        pipe.on('open', function () {
           return self.log('Serial port open');
        });

        pipe.on('data', this.JeeLinkParser.parseValue.bind(this.JeeLinkParser));
            
        pipe.on('close', function() {
           self.log.error('Serial port closed. Was that intentional?'); 
        });
        
        setTimeout(function(){
        	port.drain( () => { port.close();
        	setTimeout( () => { self.openPort(); }, self.interval );
        	self.log.debug("Waiting for " + self.interval + "ms" ); });
        }, self.interval);
    },

    configureAccessory: function(accessory) {
        this.log.info("Configure Accessory:", accessory.displayName, accessory.UUID);

        var _self = this;
        var devices = AccessoryList.filter(function(internalAccessory){
            // Is this the device we're looking for?
            return accessory.UUID === internalAccessory.device.UUID;
        });

        if ( devices.length == 0 ) {
            var newAccessory = this.JeeLinkParser.configure( accessory );
            AccessoryList.push(newAccessory);
    
            this.api.updatePlatformAccessories( [ newAccessory.device ] );
        } else {
            this.log.debug( "Accessory already existed:", accessory.displayName );
        }
    },

    addAccessory: function( newAccessory ) {

        var existing = AccessoryList.find(function(accessory){
            return accessory.device.UUID === newAccessory.device.UUID;
        }) || null;

        // Only once
        if ( existing !== null ) return;
        this.log.info( "adding new accessory: " + newAccessory.device.context.deviceID );

        AccessoryList.push( newAccessory );
        this.api.registerPlatformAccessories("homebridge-jeelink", "JeeLink", [ newAccessory.device ]);
    },

    getName: function( deviceID ) {
        return this.options.definedNames[deviceID] || deviceID;
    },

    getDevice: function( deviceID ) {

        var _self = this;
        var device = null;

        AccessoryList = AccessoryList.filter(function(accessory){

            // Is this the device we're looking for?
            if ( accessory.device.context.deviceID === deviceID ) {
                device = accessory;
                return true;
            }

            _self.log.debug("Checking accessory filter: " + accessory.device.displayName );

            accessory.device.reachable = ( Date.now() - accessory.device.context.lastUpdate > 5 * _self.interval );
            if ( Date.now() - accessory.device.context.lastUpdate > 10 * _self.interval ) {
                _self.api.unregisterPlatformAccessories("homebridge-jeelink", "JeeLink", [ accessory.device ]);
                _self.log.error("Could not find accessory anymore. Removed: ", accessory.device.context);
                return false;
            }
            return true;
        });

        _self.log.debug("Returning requested device for id: " + deviceID );

        return device;
    }
};
