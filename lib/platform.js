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

    log.debug( this.options );
    log.debug( this.config );
    log.debug( JeeLinkParser );

    this.options = this.config.options || {};
    this.interval = 1000 * (this.config.interval || 60);  // 1 minute
    this.options.debug = this.config.debug === "true";

    this.learningPhase = 1000 * (this.config.learningPhase || (this.options.debug ? 15 : 60));  // 1 minute
    this.options.definedNames = this.config.definedNames || [];

    // device
    this.options.device = this.config.device || '/dev/ttyUSB0';
    this.options.baudrate = this.config.baudrate || 56700;
    this.options.units = this.config.temperatur || CELSIUS_UNITS;

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
/*
    accessories: function(callback) {
        var _self = this;
        this.log.debug("Fetching accessories. Learning for " + this.learningPhase + "ms" );

        setTimeout( function() {
            callback( _self.JeeLinkParser.getAccessories( _self ) );
        }, this.learningPhase );
    },
*/

    configureAccessory: function(accessory) {
        this.log(accessory.displayName, "Configure Accessory");
        var platform = this;
        
        // Set the accessory to reachable if plugin can currently process the accessory,
        // otherwise set to false and update the reachability later by invoking 
        // accessory.updateReachability()
        accessory.reachable = true;
        
        accessory.on('identify', function(paired, callback) {
            platform.log(accessory.displayName, "Identify!!!");
            callback();
        });

        this.accessories.push(accessory);
    },

    addAccessory: function( newAccessory ) {

        var existing = this.accessories.find(function(accessory){
            return accessory.uuid === newAccessory.uuid;
        }) || null;

        // Only once
        if ( existing !== null ) return;
        this.log.debug( "adding accessory" );

        this.accessories.push(newAccessory);
        this.api.registerPlatformAccessories("homebridge-jeelink", "JeeLink", [newAccessory]);
    },

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

    getName: function( id ) {
        return this.options.definedNames[id] || id;
    },

    getDevice: function( id ) {
        var device = this.accessories.find(function(device) {
            return device.data.id == id;
        });
        return device || null; // safeguard
    }
};
