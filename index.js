const Prowl = require('node-prowl')
const mqttWildcard = require('mqtt-wildcard')
const request = require('request')
const mqtt = require('mqtt')
const _ = require('lodash')

const {USER, PASS, MQTT, CHRIS_PROWL_KEY, HANNAH_PROWL_KEY} = process.env
const client = mqtt.connect(MQTT, {
  username: USER,
  password: PASS,
  clean: true,
  clientId: "rules_engine"
})

let prowl = {
  Hannah: new Prowl(HANNAH_PROWL_KEY),
  Chris: new Prowl(CHRIS_PROWL_KEY),
  all: {
    push: (message) => {
      prowl_helper("Hannah", message)
      prowl_helper("Chris", message)
    }
  }
}

const shared_prefix = process.env.NODE_ENV === "production" ? "$share/rules-engine/" : ""

client.on('connect', () => client.subscribe(_.map([
    "owntracks/+/+/event",
    "domoticz/out",
    "alarm/state",
    "alarm/new-state",
    "presence/home/+",
    "zwave/switch/+"
  ], topic => shared_prefix + topic)
))

let current_alarm_state

client.on('message', function (topic, message) {
  try {
    message = JSON.parse(message.toString())
  }
  catch (e) {
    message = message.toString()
  }

  let t
  if ((t = mqttWildcard(topic, 'owntracks/+/+/event')) && t !== null) {
    let device_map = {cnsiphone: "Chris", hnsiphone: "Hannah"}
    if (message._type === "transition" && message.desc === "Home" && device_map[t[1]]) {
      client.publish(`presence/${message.desc.toLowerCase()}/${device_map[t[1]]}`, message.event === "enter" ? "true" : "false", {retain: true})
      client.publish(`presence/${message.desc.toLowerCase()}/${message.event}`, device_map[t[1]])
    }
  }

  // someone just got home
  if ((t = mqttWildcard(topic, 'presence/home/enter')) && t !== null) {
    console.log(`${message} just got home`)
    client.publish('alarm/set-state', 'disarm')
  }

  // if people leave without setting an alarm
  if ((t = mqttWildcard(topic, 'presence/home/leave')) && t !== null && current_alarm_state === "Disarm") {
    console.log(`${message} left with disarmed alarm`)
    prowl_helper(message, "You have left home but not set the alarm")
  }

  // get the retained alarm state
  if ((t = mqttWildcard(topic, 'alarm/state')) && t !== null) {
    console.log(`Alarm state is ${message}`)
    current_alarm_state = message
  }

  // react to new alarm state changes
  if ((t = mqttWildcard(topic, 'alarm/new-state')) && t !== null) {
    console.log(`Alarm state changed to ${message}`)
    prowl_helper("all", `Alarm state changed to ${message}`)
    if (message === "Disarm") {
      domoticz_helper(3, "Off")
      domoticz_helper(51, "On")
    }
  }

  // zwave low battery alert
  if (topic === "domoticz/out" && message.Battery && message.Battery < 15) {
    console.log(`${message.idx} ${message.name} is low on battery`)
    prowl_helper("Chris", `zwave device ${message.idx} ${message.name} is low on battery`)
  }

  if (topic === "domoticz/out") {
    message.svalue1 = float_helper(message.svalue1)
    message.svalue2 = float_helper(message.svalue2)
    message.svalue3 = float_helper(message.svalue3)
    client.publish(`zwave/${message.stype.toLowerCase()}/${message.idx}`, JSON.stringify(message), {retain: true})
  }

  // someone at the door
  if (topic === "zwave/switch/155" && message.nvalue === 1) {
    console.log("door bell!")
    domoticz_helper(79, "Toggle")
    domoticz_helper(79, "Toggle")
    prowl_helper("all", "Someone at the door")
    say_helper("kitchen", "Someone at the door")
  }

})

const float_helper = str => (str !== undefined && parseFloat(str) !== NaN) ? parseFloat(str) : str

const domoticz_helper = (idx, state) => client.publish('domoticz/in', JSON.stringify({
  command: "switchlight",
  idx: idx,
  switchcmd: state
}), {qos: 0})

const prowl_helper = (who, message) => prowl[who].push(message, 'Le Chateau Pink', {
  priority: 2,
}, (err, remaining) => {
  if (err) console.error(err)
  client.publish("prowl/remaining", remaining, {retain: true})
})

const say_helper = (where, what) => request.get(`http://192.168.0.3:5005/${where}/say/${what}`)

function clean_exit() {
  console.log("Closing connection (clean)")
  client.end(false, () => process.exit(0))
}

function unclean_exit() {
  console.log("Closing connection (unclean)")
  client.end(false, () => process.exit(1))
}

process.stdin.resume()
process.on('exit', clean_exit);
process.on('SIGINT', clean_exit);
process.on('unclean_exit', clean_exit);
