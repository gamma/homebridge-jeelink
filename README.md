# Homebridge JeeLink
[![npm](https://img.shields.io/npm/v/homebridge-jeelink.svg?style=plastic)](https://www.npmjs.com/package/homebridge-jeelink)
[![npm](https://img.shields.io/npm/dt/homebridge-jeelink.svg?style=plastic)](https://www.npmjs.com/package/homebridge-jeelink)
[![GitHub last commit](https://img.shields.io/github/last-commit/gamma/homebridge-jeelink.svg?style=plastic)](https://github.com/gamma/homebridge-jeelink)
[![GitHub license](https://img.shields.io/github/license/gamma/homebridge-jeelink.svg?style=plastic)](https://github.com/gamma/homebridge-jeelink)

A NodeJS plugin to enable the LaCrosse protocol using a JeeLink USB adapter in [Homebridge](https://github.com/nfarina/homebridge). The plugin checks the JeeLink device for `options.interval` seconds and will then suspend for the same interval. The history is saved using the [FakeGato](https://github.com/simont77/fakegato-history/blob/master/README.md) module and can be accessed using the Elegato Eve app.

## State

This plugin is in early development. But it does work as of v0.2.0. Also: it should save a history of entries for the Elegato Eve app.

## Installation

The plugin can be installed using the `homebridge-ui-x` plugin or by running the following command in the homebridge home folder:

    npm install homebridge-jeelink

### Alpine

If you're (like me) running Homebridge in the Alpine docker container you'll probably have to add some additional packages as followed (you may skip the sudo if not applicable). See the `serialport` package for details: 

	# If you don't have node/npm already, add that first
	sudo apk add --no-cache nodejs

	# Add the necessary build and runtime dependencies
	sudo apk add --no-cache make gcc g++ python linux-headers udev

## Config

This is an example config - not all of the settings are working as of now.

	{
	  "platforms": [
	    {
	      "platform": "JeeLink",
	      "name": "My JeeLink",
	      "device": "/dev/ttyUSB0",
	      "unit": "C",
	      "baudrate": 57600,
	      "interval": 60,
	      "debug": false,
	      "definedNames": {
	          "21": "My Home",
	          "35": "Your Home"
	      }
	    }
	  ]
	}