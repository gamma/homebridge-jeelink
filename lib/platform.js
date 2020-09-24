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
const Readline      = SerialPort.parsers.Readline;

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
    this.options.scanmode = this.config.scanmode || false;

    if (this.options.units !== CELSIUS_UNITS && this.options.units !== FAHRENHEIT_UNITS) {
      this.log('Bad temperature units : "' + this.units + '" (assuming Celsius).');
      this.options.units = CELSIUS_UNITS;
    }

/*
    var self = this;
    setTimeout(() => {self.JeeLinkParser.test();},1000);
/*/
    this.openPort();
//*/
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
        var pipe = port.pipe(new Readline({ delimiter: '\r\n' }));

        self.log.debug("Reading for " + self.interval + "ms" );
        pipe.on('open', function () {
           return self.log('Serial port open');
        });

        pipe.on('data', this.JeeLinkParser.parseValue.bind(this.JeeLinkParser));
            
        pipe.on('close', function() {
           self.log.error('Serial port closed. Was that intentional?'); 
        });
//*
/*/
        setTimeout(function(){
        	port.drain( () => { port.close();
        	setTimeout( () => { self.openPort(); }, self.interval );
        	self.log.debug("Waiting for " + self.interval + "ms" ); });
        }, self.interval);
//*/
    },

    getAccessoryWithId: function( UUID ) {
        return AccessoryList.find(function(accessory){
            return UUID === accessory.device.UUID;
        }) || null;
    },

    configureAccessory: function(accessory) {
        this.log.info("Configure Accessory:", accessory.displayName, accessory.UUID);

        if ( !this.getAccessoryWithId( accessory.UUID ) ) {
            var newAccessory = this.JeeLinkParser.configure( accessory );
            AccessoryList.push(newAccessory);
    
            this.api.updatePlatformAccessories( [ newAccessory.device ] );
        } else {
            this.log.debug( "Accessory already existed:", accessory.displayName );
        }
    },

    addAccessory: function( newAccessory ) {

        // Only once
        if ( this.getAccessoryWithId( newAccessory.device.UUID) ) {
            return;
        }

        this.log.info( "adding new accessory: " + newAccessory.device.context.deviceID );

        AccessoryList.push( newAccessory );
        this.api.registerPlatformAccessories("homebridge-jeelink", "JeeLink", [ newAccessory.device ]);
    },

    getName: function( deviceID ) {
        return this.options.definedNames[deviceID] || ( this.options.scanmode ? "" + deviceID : null );
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

            if ( !_self.options.scanmode && !_self.getName( deviceID ) ) {
                return false;
            }

            // _self.log.debug("Checking accessory filter: " + accessory.device.displayName );

            accessory.device.reachable = ( Date.now() - accessory.device.context.lastUpdate > 10 * _self.interval );
            if ( Date.now() - accessory.device.context.lastUpdate > 20 * _self.interval ) {
                _self.api.unregisterPlatformAccessories("homebridge-jeelink", "JeeLink", [ accessory.device ]);
                _self.log.error("Could not find accessory anymore. Removed: ", accessory.device.context);
                return false;
            }

            return true;
        });

        _self.log.debug("Returning requested device ('" + (device != null ? device.device.displayName : 'unknown') + "') for id: " + deviceID );

        return device;
    }
};
