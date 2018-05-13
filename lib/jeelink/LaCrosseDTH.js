// OK 9 56 1   4   156 37   ID = 56 T: 18.0 H: 37 no NewBatt
// OK 9 49 1   4   182 54   ID = 49 T: 20.6 H: 54 no NewBatt
// OK 9 55 129 4   192 56   ID = 55 T: 21.6 H: 56 WITH NewBatt
// OK 9 ID XXX XXX XXX XXX
// |  | |  |   |   |   |
// |  | |  |   |   |   |-- [6]Humidity incl. WeakBatteryFlag
// |  | |  |   |   |------ [5]Temp * 10 + 1000 LSB
// |  | |  |   |---------- [4]Temp * 10 + 1000 MSB
// |  | |  |-------------- [3]Sensor type (1 or 2) +128 if NewBatteryFlag
// |  | |----------------- [2]Sensor ID
// |  |------------------- [1]fix "9"
// |---------------------- [0]fix "OK"

var Service, Homebridge, Characteristic, Accessory, UUIDGen;

module.exports = function( homebridge ) {
    Homebridge = homebridge;
    Characteristic = homebridge.hap.Characteristic;
    Service = homebridge.hap.Service;

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;
    UUIDGen = homebridge.hap.uuid;
    
    return LaCrosseDTH;
}

function LaCrosseDTH( log, platform ) {
    this.log = log;
    this.platform = platform;
};

function round(value, digits) //digits 1 for 1 digit after comma
{
    var factor = Math.pow(10, digits);
    value = Math.round(value*factor);
    return value/factor;
};

LaCrosseDTH.prototype = {
    parseValue: function( data ) {
        var tmp = data.split(' ');

        if(tmp[0]!=='OK') { return; }

        // Wenn ein Datensatz sauber gelesen wurde
        if(tmp[1]!=='9') { return; }

        // Protocol is reuired.
        if(tmp.length != 7 ) { return; }

        // Für jeden Datensatz mit dem fixen Eintrag 9
        var tmpp = tmp.splice(2,6);       // es werden die vorderen Blöcke (0,1,2) entfernt
        this.log.debug('splice       : '+ tmpp);
        var buf = new Buffer.from(tmpp);

         //absolute Feuchte und Taupunkt
        var temp = ((((buf.readIntLE(2))*256)+(buf.readIntLE(3))-1000)/10);
        var rel = (buf.readIntLE(4) & 0x7f);
        var vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
        var v = Math.log(vappress/6.1078) * Math.LOG10E;
        var dewp = (237.3 * v) / (7.5 - v);
        var habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );

        var data = {
            id:             (buf.readIntLE(0)),
            type:           ((buf.readIntLE(1) & 0x70) >> 4),
            newBat:         ((buf.readIntLE(1) & 0x80) >> 7),       // wenn "100000xx" dann NewBatt # xx = SensorType 1 oder 2
            lowBat:         ((buf.readIntLE(4) & 0x80) >> 7),       // Hier muss noch "incl. WeakBatteryFlag" ausgewertet 
            temperature:    temp,
            humidity:       (buf.readIntLE(4) & 0x7f),

            absHumidity:    round(habs, 1),
            dewPoint:       round(dewp, 1)
        };

        this.platform.addAccessory( new LaCrosseDTHSensor( this.platform, data ) );

        this.log.debug('Sensor ID    : ' + data.id );
        this.log.debug('Type         : ' + data.type );
        this.log.debug('NewBattery   : ' + data.newBat );
        this.log.debug('Temperatur   : ' + data.temperature );
        this.log.debug('Humidty      : ' + data.humidity );
        this.log.debug('LowBattery   : ' + data.lowBat );
        this.log.debug('AbsHumid     : ' + data.absHumidity );
        this.log.debug('DewPoint     : ' + data.dewPoint );
    }
};


var inherits = require('util').inherits;
var extend = require('extend');

function LaCrosseDTHSensor(platform, data ) {
    this.platform = platform;
    this.data = data;
    this.type = "temperature sensor";

    // fix duplicate UUID (https://github.com/andig/homebridge-fritz/issues/27)
    this.uuid_base = this.type + data.id;

    this.name = this.platform.getName( "LaCrosse_" + this.data.id);

    this.services = {
        AccessoryInformation: new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.SerialNumber, this.data.id),
        TemperatureSensor: new Service.TemperatureSensor(this.name)
    };

    this.services.TemperatureSensor.getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({minValue: -50})
        .on('get', this.getCurrentTemperature.bind(this))
    ;

    setInterval(this.update.bind(this), this.platform.interval);
/*
    // these characteristics will not be present for e.g. device groups
    if (this.device.manufacturer) {
        this.services.AccessoryInformation
            .setCharacteristic(Characteristic.Manufacturer, this.device.manufacturer);
    }
    if (this.device.productname) {
        this.services.AccessoryInformation
            .setCharacteristic(Characteristic.Model, this.device.productname);
    }
    if (this.device.fwversion) {
        this.services.AccessoryInformation
            .setCharacteristic(Characteristic.FirmwareRevision, this.device.fwversion);
    }
*/

  var uuid;
  uuid = UUIDGen.generate(this.name);

  var newAccessory = new Accessory(this.name, uuid);
  newAccessory.on('identify', function(paired, callback) {
    platform.log(newAccessory.displayName, "Identify!!!");
    callback();
  });
  return newAccessory;
}

LaCrosseDTHSensor.prototype.getServices = function() {
    return Object.keys(this.services).map(function(key) {
        return this.services[key];
    }.bind(this));
};

LaCrosseDTHSensor.prototype.getCurrentTemperature = function(callback) {
    this.platform.log(`Getting ${this.data.id} temperature`);
    this.platform.log( this.data );
    
    var device = this.platform.getDevice( this.data.id );
    if ( !device ) {
        this.platform.log.error( "Device not found: " + this.data.id);
        return;
    }

    // characteristic CurrentTemperature is part of multiple services
    callback(null, device.data.temperature);
/*
    this.platform.fritz('getTemperature', this.ain).then(function(temp) {
        service.fritzCurrentTemperature = temp;
        service.getCharacteristic(Characteristic.CurrentTemperature).setValue(temp, undefined, "JeeLink");
    });
*/
};


LaCrosseDTHSensor.prototype.update = function() {
    this.platform.log(`Updating ${this.type} ${this.ain}`);

    // TemperatureSensor
    this.getCurrentTemperature(function(foo, temp) {
        this.services.TemperatureSensor.getCharacteristic(Characteristic.CurrentTemperature).setValue(temp, undefined, "JeeLink");
    }.bind(this));
};
