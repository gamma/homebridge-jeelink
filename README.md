# Homebridge JeeLink

A NodeJS plugin to enable the LaCrosse protocol using a JeeLink USB adapter in Homebridge.

## State

This plugin is in early development.

## Config

	{
	  "platforms": [
	    {
	      "platform": "JeeLink",
	      "name": "My JeeLink",
	      "device": "/dev/ttyUSB0",
	      "unit": "C",
	      "baudrate": 57600,
	      "interval": 60,
	      "debug": false
	    }
	  ]
	}
