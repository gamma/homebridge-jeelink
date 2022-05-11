import { PlatformAccessory } from 'homebridge';
import { JeeLinkPlugin } from '../platform';
import { LaCrosseDTAccessoryBase } from './LaCrosseDTAccessoryBase';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LaCrosseDTTAccessory extends LaCrosseDTAccessoryBase {

  constructor( platform: JeeLinkPlugin, accessory: PlatformAccessory,
  ) {
    super( platform, accessory );
  }

  updateData( data, buf: Buffer ) {
    if ( data.sensor_type === 2 ) {
      // This is only sensor type 2
      super.updateData(data, buf);
    }
  }
}
