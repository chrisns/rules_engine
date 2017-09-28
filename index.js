const mqttWildcard = require('mqtt-wildcard')
const mqtt = require('mqtt')
const _ = require('lodash')

const {USER, PASS, MQTT, HOSTNAME, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID} = process.env
const client = mqtt.connect(MQTT, {
  username: USER,
  password: PASS,
  clean: true,
  clientId: `rules_engine${HOSTNAME}`
})

const shared_prefix = process.env.NODE_ENV === "production" ? "$share/rules-engine/" : ""

const topics = _.map([
  "owntracks/+/+/event",
  "domoticz/out",
  "alarm/new-state",
  "presence/home/+",
  `notify/out/${CHRIS_TELEGRAM_ID}`,
  `notify/out/${HANNAH_TELEGRAM_ID}`,
  "zwave/switch/+"
], topic => shared_prefix + topic)

topics.push("alarm/zones/4")
topics.push("alarm/state")
topics.push("alarm/status")

client.on('connect', () => client.subscribe(topics,
  {qos: 1},
  (err, granted) => console.log(err, granted)
))

let current_alarm_state
let current_alarm_status
let conservatory_is_open

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
  if (topic === 'presence/home/enter') {
    console.log(`${message} just got home`)
    say_helper("kitchen", `${message} just arrived`)
    client.publish('alarm/set-state', 'disarm')
  }

  // if people leave without setting an alarm
  if (topic === 'presence/home/leave' && current_alarm_state === "Disarm") {
    console.log(`${message} left with disarmed alarm`)
    notify_helper(FB_MAP[message], "You have left home but not set the alarm", [messages.arm_alarm_away, messages.arm_alarm_home])
  }

  // if people arrive and the alarm is disarmed let them know
  if (topic === 'presence/home/arrive' && current_alarm_state === "Disarm") {
    console.log(`${message} arrived to a disarmed alarm`)
    notify_helper(FB_MAP[message], "You have arrived home the alarm is NOT armed")
  }

  // if people leave
  if (topic === 'presence/home/leave') {
    say_helper("kitchen", `${message} just left`)
  }

  // get the retained alarm state
  if (topic === 'alarm/state') {
    console.log(`Alarm state is ${message}`)
    current_alarm_state = message
  }

  // get the retained alarm state
  if (topic === 'alarm/status') {
    console.log(`Alarm status is ${message}`)
    current_alarm_status = message
  }

  if (topic === 'alarm/zones/4') {
    conservatory_is_open = message.troubles !== null
    console.log("conservatory open", conservatory_is_open)
  }

  // react to new alarm state changes
  if (topic === 'alarm/new-state') {
    console.log(`Alarm state changed to ${message}`)
    notify_helper(GROUP_TELEGRAM_ID, `Alarm state changed to ${message}`)

    if (message === "Disarm") {
      say_helper("kitchen", `Alarm is now disarmed`)
      domoticz_helper(3, "Off")
      domoticz_helper(51, "On")
    }
  }

  // zwave low battery alert
  if (topic === "domoticz/out" && message.Battery && message.Battery < 15) {
    console.log(`${message.idx} ${message.name} is low on battery`)
    notify_helper(CHRIS_TELEGRAM_ID, `zwave device ${message.idx} ${message.name} is low on battery`)
  }

  // if (topic === "domoticz/out") {
  //   client.publish(`zwave/${message.stype.toLowerCase()}/${message.idx}`, JSON.stringify(message), {retain: true})
  //   _.forEach(["Battery", "RSSI", "nvalue", "svalue1", "svalue2", "svalue3"], value => message[value] !== null && influx_helper(`${message.name}_${message.idx}`, value.toLowerCase(), message[value]))
  // }

  // react to facebook bot commands
  if ((t = mqttWildcard(topic, 'notify/out/+')) && t !== null) {
    // send acknowledgement back to user
    notify_helper(t[0].toString(), "ACK", null, false)

    message = message.toLowerCase()
    console.log(`FB user ${t[0]} just sent:"${message}:`)
    if (message === messages.unlock_door.toLowerCase())
      domoticz_helper(3, "Off")

    if (message === messages.arm_alarm_home.toLowerCase())
      client.publish('alarm/set-state', 'arm_home')

    if (message === messages.arm_alarm_away.toLowerCase())
      client.publish('alarm/set-state', 'arm_away')

    if (message === messages.disarm_alarm.toLowerCase())
      client.publish('alarm/set-state', 'disarm')

    if (message.startsWith("say")) {
      let split_message = /say\s(\w+)(.*)/gi.exec(message)
      say_helper(split_message[1], split_message[2])
    }

    if (message === messages.alarm.toLowerCase())
      notify_helper(t[0], `You can do these things`, [messages.arm_alarm_home, messages.arm_alarm_away, messages.disarm_alarm])

    if (message === messages.start)
      notify_helper(t[0], `You can do these things`, messages)
  }

  // someone at the door
  if (topic === "domoticz/out" && message.stype === "Switch" && topic === message.idx === 155 && message.nvalue === 1) {
    console.log("door bell!")
    _.times(4, () => domoticz_helper(79, "Toggle"))
    _.times(4, () => {
      lights_helper("Desk", "muchdimmer")
      lights_helper("Desk", "muchbrighter")
    })

    //@todo send photo
    notify_helper(GROUP_TELEGRAM_ID, "Someone at the door", [messages.unlock_door])

    say_helper("kitchen", "Someone at the door")
    // say_helper("conservatory", "Someone at the door")
    // say_helper("desk", "Someone at the door")
    if (conservatory_is_open === true && current_alarm_status === false) {
      // say_helper("garden", "Someone at the door")
    }
  }

})

const messages = {
  start: "/start",
  alarm: "Alarm",
  unlock_door: "Unlock the door",
  arm_alarm_home: "Arm alarm home",
  arm_alarm_away: "Arm alarm away",
  disarm_alarm: "Disarm alarm"
}

const FB_MAP = {
  Chris: CHRIS_TELEGRAM_ID,
  Hannah: HANNAH_TELEGRAM_ID
}

const lights_helper = (light, state) => client.publish(`lifx-lights/${light}`, state)

const float_helper = str => (str !== undefined && parseFloat(str) !== NaN) ? parseFloat(str) : str

const notify_helper = (who, message, actions, disableNotification) =>
  client.publish(`notify/in/${who}`, JSON.stringify({
    disableNotification: disableNotification,
    message: message,
    buttons: actions ? _.map(actions, action => {
      return {title: action, value: action}
    }) : null
  }))

const influx_helper = (device, what, value) =>
  client.publish('influx/in', JSON.stringify({
    device: device,
    what: what,
    value: float_helper(value)
  }), {qos: 0})

const domoticz_helper = (idx, state) =>
  client.publish('domoticz/in', JSON.stringify({
    command: "switchlight",
    idx: idx,
    switchcmd: state
  }), {qos: 0})

const say_helper = (where, what) =>
  client.publish(`sonos/say/${where}`, JSON.stringify([what, getSayVolume()]), {qos: 0})

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 40 : 15

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

client.on('connect', () => console.log("connected"))

client.on('error', (error) => console.error(error))

client.on('close', () => console.error("connection close"))

client.on('offline', () => console.log("offline"))
