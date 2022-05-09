import { Service, PlatformAccessory } from 'homebridge';
import { JeeLinkPlugin } from '../platform';
import { LaCrosseDTAccessoryBase } from './LaCrosseDTAccessoryBase';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LaCrosseDTTAccessory extends LaCrosseDTAccessoryBase {

  private temperaturService2: Service;

  constructor( platform: JeeLinkPlugin, accessory: PlatformAccessory,
  ) {

    super( platform, accessory );

    this.temperaturService2 = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
                              this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.temperaturService2.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName + ' 2');

    this.temperaturService2.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({minValue: -50, maxValue: 100, unit: '°C'})
      .on('get', this.getCurrentDataValues.bind(this))
    ;
  }

  updateData( data, buf: Buffer ) {

    // LaCrosseDTT
    // write temperature values for LaCrosseDTT sensors
    if ( data.sensor_type === 2 ) {
      // temperature2 is the same as temperature1
      const temp = ((((buf.readUInt8(2))*256)+(buf.readUInt8(3))-1000)/10);
      data.temperature2 = temp;
      this.platform.log.debug('Temperature 2: ' + data.temperature2 );

      // prepare data for FakeGatoHistoryService
      data.fakeGato = { humidity: data.temperature2 || 0 };
    }

    super.updateData( data, buf );

    this.getCurrentSecondaryDataValues( (_foo, _temperature, _data) => {

      // TemperatureSensor
      this.temperaturService2
        .setCharacteristic(this.platform.Characteristic.CurrentTemperature, _temperature || 0)
        .setCharacteristic(this.platform.Characteristic.StatusLowBattery, _data.lowBat || 0)
      ;
    } );
  }

  /**
   * Override parent implementation to get the current temperature values
   * @param callback - (err, temperature, data)
   * @returns null
   */
  getCurrentDataValues( callback: ( _foo, _temperature, _data ) => void ) {

    const context = this.accessory.context;
    if ( context.data.sensor_type === 2 ) {
      return;
    }

    super.getCurrentDataValues( callback );
  }

  getCurrentSecondaryDataValues( callback: ( _foo, _temperature, _data ) => void ) {

    const context = this.accessory.context,
      temperature2 = Math.max(0, Math.min((context.data || {}).temperature2, 100) ), // ensure boundaries
      lowBat = (context.data || {}).lowBat;

    this.platform.log.debug('Getting values for', this.accessory.displayName,
      'Temperature 2:', temperature2,
      'Low Battery:', lowBat,
    );

    // In case something changed just here.
    context.data.temperature2 = temperature2;
    
    // characteristic CurrentTemperature is part of multiple services
    try {
      callback( null, temperature2, context.data );
    } catch(e) {
      this.platform.log.error('Error in getCurrentTemperature2DataValues:', e);
    }
  }
}
