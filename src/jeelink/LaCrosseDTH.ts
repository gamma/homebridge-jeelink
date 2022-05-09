/**
 * jeelink Platform Plugin for HomeBridge (https://github.com/nfarina/homebridge)
 *
 * Based up on the protocol implementation by: @foxthefox
 * https://github.com/foxthefox/ioBroker.jeelink / https://github.com/foxthefox/ioBroker.jeelink/blob/master/jeelink.js
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
import { LaCrosseDTTAccessory } from '../accessories/LaCrosseDTTAccessory';

/*
JeeLinkAccessory = require('../accessory').default(homebridge);
FakeGatoHistoryService = require("fakegato-history")(homebridge);
*/
export class LaCrosseDTHParser {

  private readonly Service: typeof Service = this.platform.api.hap.Service;
  private readonly Characteristic: typeof Characteristic = this.platform.api.hap.Characteristic;

  private readonly log = this.platform.log;
  private readonly type = 'LaCrosse Temperature Sensor';

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
      temperature2:   0,
      newBat:         0,
      lowBat:         0,
      humidity:       0,
      absHumidity:    0,
      dewPoint:       0,
    };

    const device = this.getOrCreateDevice( data.id, data.sensor_type );
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

    device.updateData( data, buf );
  }

  getOrCreateDevice ( id: number, type: number ) {

    // Check if the model exists in the current instance
    switch ( type ) {
      case 1:
        return this.platform.createAccessory( LaCrosseDTHAccessory, id, type );
      case 2:
        return this.platform.createAccessory( LaCrosseDTTAccessory, id, type );
      default:
        this.log.error('Unknown sensor type: ' + type );
    }
  
    // If the device is not defined, we're not in scan mode and do not know the device
    return null;
  }

  configure( accessory: PlatformAccessory ) {
    const returnDevice = new LaCrosseDTHAccessory( this.platform, accessory );
    this.platform.log.info('Done configuring LaCrosseDTH Accessory', accessory.displayName);
    return returnDevice;
  }
}
