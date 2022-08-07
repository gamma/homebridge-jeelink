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
      .setCharacteristic(this.platform.Characteristic.Model, this.getModel() )
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID)
    ;

    this.temperaturService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
                              this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.temperaturService.setCharacteristic(this.platform.Characteristic.Name, accessory.displayName);

    this.temperaturService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .setProps({minValue: -50, maxValue: 100, unit: '°C'})
      .on('get', this.getCurrentDataValues.bind(this))
    ;

    this.fakeGatoHistoryService = new this.FakeGatoHistoryServiceClass('weather', this.accessory, {
      storage: 'fs',
    });

    this.platform.log.info('Device registered:', accessory.displayName);
  }

  getModel() {
    return this.constructor.name;
  }

  protected round( value: number, precision: number ) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateData( data, buf: Buffer ) {

    this.accessory.context.data = data;
    this.accessory.context.lastUpdate = Date.now();

    this.platform.log.debug('Updating:', this.accessory.context.deviceType);

    this.getCurrentDataValues( (_foo, _temperature, _data) => {

      this.platform.log.info('Setting values on service:', this.accessory.displayName, _temperature);

      // TemperatureSensor
      this.temperaturService
        .setCharacteristic(this.platform.Characteristic.CurrentTemperature, _temperature || 0)
        .setCharacteristic(this.platform.Characteristic.StatusLowBattery, _data.lowBat || 0)
      ;

      // Update history service
      this.fakeGatoHistoryService.addEntry(Object.assign({}, _data.fakeGato || {}, {
        time: new Date().getTime() / 1000,
        temp: _data.temperature || 0,
      }));
    });
  }

  getCurrentDataValues( callback: ( _foo, _temperature, _data ) => void ) {

    const context = this.accessory.context,
      data = context.data || {},
      temperature = data.temperature || 0,
      lowBat = data.lowBat || 0;

    this.platform.log.debug('Getting values for', this.accessory.displayName,
      'Temperature:', temperature,
      'Low Battery:', lowBat,
    );
    
    // characteristic CurrentTemperature is part of multiple services
    try {
      callback(null, temperature, context.data);
    } catch(e) {
      this.platform.log.error('Error getting values for', this.accessory.displayName, e);
    }
  }
}
