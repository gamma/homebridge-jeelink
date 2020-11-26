import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { LaCrosseDTHParser } from './jeelink/LaCrosseDTH';
import { LaCrosseDTAccessoryBase } from './accessories/LaCrosseDTAccessoryBase';

import { LaCrosseDTHAccessory } from './accessories/LaCrosseDTHAccessory';

import SerialPort = require('serialport');
import ReadLineParser = require('@serialport/parser-readline');

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class JeeLinkPlugin implements DynamicPlatformPlugin {

  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  private readonly LaCrosseDTHParser = new LaCrosseDTHParser( this );

  private pipe: typeof SerialPort;

  // this is used to track restored cached accessories
  public readonly accessories: LaCrosseDTAccessoryBase[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform: ', PLATFORM_NAME);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });

    // This event is fired when the Homebridge service is going to be shut down.
    this.api.on('shutdown', () => {
      this.shutdown();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // this.log.info(JSON.stringify(accessory.context));

    if ( !accessory.context.deviceType ) {
      try {
        this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      } catch( e ) {
        this.log.debug( e );
      }
      return;
    }

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    const newInstance = this.createObjctForName( accessory.context.deviceType );
    if ( newInstance ) {
      this.accessories.push(new newInstance.constructor(this, accessory));
    }
  }

  createObjctForName( name: string ) {
    switch( name ) {
      case 'LaCrosseDTHAccessory':
        return Object.create( LaCrosseDTHAccessory.prototype );
      default:
        return null;
    }
  }

  parseData( data: Buffer ) {

    this.log.debug('received: ', data.toString());
    const tmp = data.toString().split(' ');

    if(tmp[0] === 'OK'){
      if (tmp[1] === '9'){ // 9 ist fix für LaCrosse
        this.LaCrosseDTHParser.parseValue( data );
        // TODO: this.logLaCrosseDTH.parseValue(data);
      } else if (tmp[1]=== 'WS'){ // derzeitig fix für superjee
      //*
        this.log.error('WS is not yet implemented!');
        return; // not yet implemented
      /*/
            this.logLaCrosseBMP180.parseValue(data);
      //*/
      } else {  // es wird auf beide log der Datenstrom geschickt und dann ausgewertet
      //*
        this.log.error('EMON is not yet implemented!');
        return; // not yet implemented
      /*/
        this.logemonTH.parseValue(data);
        this.logemonWater.parseValue(data);
      //*/
      }
    }
  }

  /**
   * The service is going to shut down.
   * Wee need to stop the serial port
   */
  shutdown() {
    this.pipe.close();
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {

    // Init parser
    this.pipe = new SerialPort(this.config.device, {
      baudRate: this.config.baudrate,
    });

    // Set up the device
    const pipe = this.pipe.pipe(new ReadLineParser({ delimiter: '\r\n' }));

    this.log.debug('Reading for ' + this.config.interval + 'ms');
    pipe.on('open', () => {
      return this.log.info('Serial port open');
    });

    pipe.on('data', (data) => {
      this.parseData(data);
    });

    pipe.on('close', () => {
      this.log.error('Serial port closed. Was that intentional?');
    });
  }

  getName( deviceID: string ) {
    const definedNames = this.config.definedNames as Array<Map<string, string>>;
    const device = (definedNames.find( device => deviceID === device['deviceType'] + '_' + device['deviceID'] ) || {});
    return device['displayName'] || deviceID;
  }

  getAccessory( deviceID: string ) {
    const uuid = this.api.hap.uuid.generate( deviceID );
    const accessory = this.getAccessoryWithId( uuid );
    return accessory;
  }

  createAccessory( instanceType: typeof LaCrosseDTAccessoryBase, deviceID: string ) {
    const uuid = this.api.hap.uuid.generate( deviceID );
    const displayName = this.getName( deviceID );

    if ( this.getAccessoryWithId( uuid ) || !(this.config.scanmode || displayName !== deviceID ) ) {
      return null;
    }

    const accessory = new this.api.platformAccessory( displayName, uuid);
    accessory.context = {};
    accessory.context.deviceType = instanceType.name;

    this.log.info('adding new accessory: ' + deviceID + ' ' + accessory.displayName + ' ' + accessory.context.deviceType);
    try {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    } catch( e ) {
      this.log.debug('accessory already existed');
    }

    const device = new instanceType( this, accessory );
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(device);

    return device;
  }

  getAccessoryWithId( uuid: string ) {
    return this.accessories.find(accessory => accessory.UUID === uuid) || null;
  }
}
