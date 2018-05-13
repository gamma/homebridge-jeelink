# Homebridge JeeLink

A NodeJS plugin to enable the LaCrosse protocol using a JeeLink USB adapter in [Homebridge](https://github.com/nfarina/homebridge).

## State

This plugin is in early development.

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
