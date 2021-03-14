import { Service, PlatformAccessory } from 'homebridge';
import { JeeLinkPlugin } from '../platform';

import FakeGatoHistoryService from 'fakegato-history';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class LaCrosseDTAccessoryBase {

  public UUID: string;

  private temperaturService: Service;

  private FakeGatoHistoryServiceClass;

  protected fakeGatoHistoryService;

  constructor(
    protected readonly platform: JeeLinkPlugin,
    protected readonly accessory: PlatformAccessory,
  ) {

    this.UUID = accessory.UUID;
    this.FakeGatoHistoryServiceClass = FakeGatoHistoryService(this.platform.api);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LaCrosse')
      .setCharacteristic(this.platform.Characteristic.Model, 'LaCrosse')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID)
    ;

    this.temperaturService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
                              this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.temperaturService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.temperaturService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({minValue: -50})
      .on('get', this.getCurrentDataValues.bind(this))
    ;

    this.fakeGatoHistoryService = new this.FakeGatoHistoryServiceClass('weather', this.accessory, {
      storage: 'fs',
    });
  }

  updateData( data ) {

    this.accessory.context.data = data;
    this.accessory.context.lastUpdate = Date.now();

    this.platform.log.debug('Updating:', this.accessory.context.deviceType);

    this.getCurrentDataValues( (_foo, data) => {

      // TemperatureSensor
      this.temperaturService
        .setCharacteristic(this.platform.Characteristic.CurrentTemperature, data.temperature || 0)
        .setCharacteristic(this.platform.Characteristic.StatusLowBattery, data.lowBat)
      ;

      // Update history service
      this.fakeGatoHistoryService.addEntry(Object.assign({}, data.fakeGato || {}, {
        time: new Date().getTime() / 1000,
        temp: data.temperature || 0,
      }));
    });
  }

  getCurrentDataValues( callback: ( _foo, data ) => void ) {
    const context = this.accessory.context, temperature = (context.data || {}).temperature;
    this.platform.log.debug('Getting values for', this.accessory.displayName,
      'Temperature:', temperature,
    );
    
    // characteristic CurrentTemperature is part of multiple services
    try {
      callback(null, temperature); 
    } catch(e) {
      this.platform.log.error( e.message ); 
    }
  }
}
