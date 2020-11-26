/**
 * jeelink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * Based up on the protocol implementation by: @foxthefox
 * https://github.com/foxthefox/ioBroker.jeelink
 * 
 * @url https://github.com/gamma/homebridge-jeelink
 * @author Gerry Weißbach
 * @license MIT
 */

/* jslint node: true, laxcomma: true, esversion: 6 */
'use strict';

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

import { Service, Characteristic, PlatformAccessory } from 'homebridge';
import { JeeLinkPlugin } from '../platform';

import { LaCrosseDTHAccessory } from '../accessories/LaCrosseDTHAccessory';

/*
JeeLinkAccessory = require('../accessory').default(homebridge);
FakeGatoHistoryService = require("fakegato-history")(homebridge);
*/
export class LaCrosseDTHParser {

  private readonly Service: typeof Service = this.platform.api.hap.Service;
  private readonly Characteristic: typeof Characteristic = this.platform.api.hap.Characteristic;

  private readonly log = this.platform.log;
  private readonly type = 'LaCrosse Temperature Sensor';
  private readonly model = 'LaCrosseDTH';

  constructor( private readonly platform: JeeLinkPlugin ) {

  }

  parseValue( input: Buffer ) {

    const tmp = (''+input).split(' ');

    // if not OK return
    if(tmp[0]!=='OK') {
      return;
    }

    // Wenn ein Datensatz sauber gelesen wurde
    if(tmp[1]!=='9') {
      return;
    }

    // Protocol is required.
    if(tmp.length !== 7 ) {
      return;
    }

    // Für jeden Datensatz mit dem fixen Eintrag 9
    const tmpp = tmp.splice(2, 6);  // es werden die vorderen Blöcke (0,1,2) entfernt
    this.log.debug('splice       : '+ tmpp);

    const buf = Buffer.from( tmpp );

    const temp = ((((buf.readUInt8(2))*256)+(buf.readUInt8(3))-1000)/10);
    const data = {
      id:             (buf.readUInt8(0)),
      type:           ((buf.readUInt8(1) & 0x70) >> 4),
      sensor_type:    (buf.readUInt8(1) & 0x3),
      temperature:    temp,
      newBat:         0,
      lowBat:         0,
      humidity:       0,
      absHumidity:    0,
      dewPoint:       0,
    };

    const device = this.getOrCreateDevice( data.id );
    if ( device === null ) {
      this.log.debug('Device not configured with with ID: ' + data.id);
      return;
    }

    this.log.debug('Sensor ID    : ' + data.id );
    this.log.debug('Type         : ' + data.type );
    this.log.debug('Sensor Type  : ' + data.sensor_type );
    this.log.debug('Temperatur   : ' + data.temperature );

    if ( data.sensor_type === 1 ) {
      data.newBat = ((buf.readUInt8(1) & 0x80) >> 7);       // wenn "100000xx" dann NewBatt # xx = SensorType 1 oder 2
      data.lowBat = ((buf.readUInt8(4) & 0x80) >> 7);       // Hier muss noch "incl. WeakBatteryFlag" ausgewertet 

      this.log.debug('NewBattery   : ' + data.newBat );
      this.log.debug('LowBattery   : ' + data.lowBat );
    }

    if ( this.model === 'LaCrosseDTH' ) {
      // LaCrosseDTH
      //absolute Feuchte und Taupunkt
      const rel = (buf.readUInt8(4) & 0x7f);
      const vappress =rel/100 * 6.1078 * Math.exp(((7.5*temp)/(237.3+temp))/Math.LOG10E);
      const v = Math.log(vappress/6.1078) * Math.LOG10E;
      const dewp = (237.3 * v) / (7.5 - v);
      const habs = 1000 * 18.016 / 8314.3 * 100*vappress/(273.15 + temp );

      data.humidity = (buf.readUInt8(4) & 0x7f);
      data.absHumidity = this.round(habs, 1);
      data.dewPoint = this.round(dewp, 1);

      this.log.debug('Humidty      : ' + data.humidity );
      this.log.debug('AbsHumid     : ' + data.absHumidity );
      this.log.debug('DewPoint     : ' + data.dewPoint );
    }

    device.updateData( data );
  }

  private round( value: number, precision: number ) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }

  getOrCreateDevice ( id: number ) {

    // Check if the model exists in the current instance
    const deviceID = this.model + '_' + id;
    let accessory = this.platform.getAccessory( deviceID );

    if ( !accessory ) {
      accessory = this.platform.createAccessory( LaCrosseDTHAccessory, deviceID );
    }
  
    // If the device is not defined, we're not in scan mode and do not know the device
    return accessory;
  }

  configure( accessory: PlatformAccessory ) {
    const returnDevice = new LaCrosseDTHAccessory( this.platform, accessory );
    this.platform.log.info('Done configuring LaCrosseDTH Accessory', accessory.displayName);
    return returnDevice;
  }
}
