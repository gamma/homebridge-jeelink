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
      .on('get', this.getCurrentDataValues.bind(this))
    ;
  }

  updateData( data ) {

    data.fakeGato = { humidity: data.humidity || 0 };
    super.updateData( data );

    this.getCurrentDataValues( (_foo, data) => {

      // TemperatureSensor
      this.humidityService
        .setCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, data.humidity || 0)
        .setCharacteristic(this.platform.Characteristic.StatusLowBattery, data.lowBat)
      ;
    } );
  }
}
