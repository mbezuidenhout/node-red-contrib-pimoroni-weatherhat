/*
  weather.mjs

  A Node-red module for reading data from the Pimoroni Weather HAT.
*/

'use strict';

const IoExpander = require('@bezuidenhout/pimoroni-weatherhat/ioe.js');
const { WindVane, WindSpeed, Rain } = require('@bezuidenhout/pimoroni-weatherhat');

module.exports = function(RED) {
  class WeatherHAT {

    constructor(config) {
      RED.nodes.createNode(this, config);

      let node = this;

      node.bus = parseInt(config.bus) || 1;
      node.addr = parseInt(config.address, 16) || 0x12;
      node.topic = config.topic || "";

      node.initialized = false;
      node.init_errors = 0;
      node.status({ fill: "grey", shape: "ring", text: "Init..." });
      
      node.log("Initializing on bus" + node.bus + " addr:" + node.addr);
      node.ioe = new IoExpander({i2c_addr: node.addr, smbus_id: node.bus});

      node.ioe.reset().then(() => {
        node.initialized = true;
        node.status({ fill: "green", shape: "dot", text: node.type + " ready" });
        node.windVane = new WindVane({ioe: node.ioe});
        node.windSpeed = new WindSpeed({ioe: node.ioe});
        node.rainfall = new Rain({ioe: node.ioe});

        // Handle input message
        node.on('input', node.onInput.bind(this));
      }).catch((err) => {
        node.init_errors++;
        node.status({ fill: "red", shape: "ring", text: `Init failed: ${err}` });
      });
    }

    // Method to handle input messages
    onInput(msg) {
      let node = this;

      // Access the input message
      let inputPayload = msg.payload;

      // Process or modify the payload
      //msg.payload = `Received: ${inputPayload}`;


      msg.payload = { 
        Wind: {
          Direction: node.windVane.getWindDirShortCardinal(),
          CurrentSpeed: node.windSpeed.getWindSpeed().toFixed(1) + ` m/s`,
          Average1Min: node.windSpeed.getWindSpeed1MinAvg().toFixed(1) + ` m/s`,
        },
        Rain: {
          Total: node.rainfall.getRainfallTotal() + ` mm`,
          LastMinute: node.rainfall.getRainfall() + ` mm`,
          Today: node.rainfall.getRainfallToday() + ` mm`
        }
      };
      //node.log("Received wind dir: " + dir);

      // Send the message to the next node in the flow
      node.send(msg);
      //return out;
    }

    // Method to handle node shutdown
    onClose() {
        // Perform cleanup if necessary
        let node = this;
        node.ioe.close();
    }

  }
  RED.nodes.registerType('weatherhat', WeatherHAT);
}

