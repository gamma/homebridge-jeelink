import { Service, PlatformAccessory } from 'homebridge';
import { JeeLinkPlugin } from '../platform';
import { LaCrosseDTAccessoryBase } from './LaCrosseDTAccessoryBase';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LaCrosseDTHAccessory extends LaCrosseDTAccessoryBase {

  private humidityService: Service;

  constructor( platform: JeeLinkPlugin, accessory: PlatformAccessory,
  ) {

    super( platform, accessory );

    this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor) ||
                              this.accessory.addService(this.platform.Service.HumiditySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .setProps({minValue: 0, maxValue: 100})
      .on('get', this.getCurrentHumidityDataValues.bind(this))
    ;
  }

  updateData( data ) {

    data.fakeGato = { humidity: data.humidity || 0 };
    super.updateData( data );

    this.getCurrentHumidityDataValues( (_foo, _humidity, _data) => {

      // TemperatureSensor
      this.humidityService
        .setCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, _humidity || 0)
        .setCharacteristic(this.platform.Characteristic.StatusLowBattery, _data.lowBat || 0)
      ;
    } );
  }

  getCurrentHumidityDataValues( callback: ( _foo, _humidity, _data ) => void ) {
    const context = this.accessory.context,
      humidity = Math.max(0, Math.min((context.data || {}).humidity, 100) ), // ensure boundaries
      lowBat = (context.data || {}).lowBat;

    this.platform.log.debug('Getting values for', this.accessory.displayName,
      'Humidity:', humidity,
      'Low Battery:', lowBat,
    );

    // In case something changed just here.
    context.data.humidity = humidity;
    
    // characteristic CurrentTemperature is part of multiple services
    try {
      callback( null, humidity, context.data );
    } catch(e) {
      this.platform.log.error('Error in getCurrentHumidityDataValues:', e);
    }
  }
}
