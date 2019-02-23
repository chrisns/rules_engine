/*eslint no-console: "off"*/

const mqttWildcard = require("mqtt-wildcard")
const _ = require("lodash")
const AWS = require("aws-sdk")
const request = require("request-promise-native")
const uuid = require("uuid/v4")
const Date = require("sugar-date").Date
const memoize = require("memoizee")

const { AWS_IOT_ENDPOINT_HOST, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID } = process.env
const { camera_map, light_messages, velux_messages, zwave_messages, messages } = require("./chatbot_messages")

const { rulesAdd, eventHandler, pickleGherkin } = require("./rules")
const fs = require("fs")
const gherkin = fs.readdirSync("features").map(file => fs.readFileSync(`features/${file}`).toString()).join("\n").replace(/Feature:/ig, "#Feature:").substr(1)
const thing_lookup = require("./things")

const AWSMqtt = require("aws-mqtt-client").default

const awsMqttClient = new AWSMqtt({
  endpointAddress: AWS_IOT_ENDPOINT_HOST,
  // logger: console
})

const iotdata = new AWS.IotData({
  endpoint: AWS_IOT_ENDPOINT_HOST,
  // logger: console
})

const s3 = new AWS.S3({
  logger: console
})

const awsTopics = [
  "owntracks/+/+/event",
  "$aws/things/alarm_status/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_10/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_17/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_23/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_25/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_39/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_41/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_47/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_49/shadow/update/documents",
  "$aws/things/zwave_eb2bd207_2/shadow/update/documents",
  `notify/out/${CHRIS_TELEGRAM_ID}`,
  `notify/out/${HANNAH_TELEGRAM_ID}`
]

awsMqttClient.on("connect", () => {
  for (i = 0; i < awsTopics.length; i += 8) {
    awsMqttClient.subscribe(awsTopics.slice(i, i + 8),
      { qos: 1 },
      (err, granted) => console.log("aws subscribe", err, granted)
    )
  }
})

const get_alarm_state = memoize(() => iotdata.getThingShadow({ thingName: "alarm_status" }).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.state), { maxAge: 1000, length: 0, promise: true })

const get_alarm_ready_status = () => iotdata.getThingShadow({ thingName: "alarm_status" }).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.ready_status)

const set_alarm_state = state => iotdata.updateThingShadow({
  thingName: "alarm_status",
  payload: JSON.stringify({ state: { desired: { state: state } } })
}).promise()

// react to chatbot commands
awsMqttClient.on("message", (topic, raw_message, raw_msg, t = mqttWildcard(topic, "notify/out/+"), message = t ? message_parser(raw_message).toLowerCase() : null) => {
  if (t === null || message == null)
    return

  console.log(`Telegram user ${t[0]} just sent:"${message}"`)

  if (message === messages.unlock_door.toLowerCase()) zwave_helper("zwave_f2e55e6c_4", { user: { Locked: false } })

  if (message === messages.unlock_garage.toLowerCase()) zwave_helper("zwave_eb2bd207_2", { user: { Locked: false } })

  if (message === messages.lock_garage.toLowerCase()) zwave_helper("zwave_eb2bd207_2", { user: { Locked: true } })

  if (message === messages.arm_alarm_home.toLowerCase()) {
    reply_with_alarm_status(t[0].toString())
    set_alarm_state("arm_home")
  }

  if (message === messages.arm_alarm_away.toLowerCase()) {
    reply_with_alarm_status(t[0].toString())
    set_alarm_state("arm_away")
  }

  if (message === messages.disarm_alarm.toLowerCase()) set_alarm_state("disarm")

  if (message.startsWith("say")) {
    let split_message = /say\s([\w|,]+)(.*)/gi.exec(message)
    say_helper(split_message[1].toLowerCase(), split_message[2])
  }

  if (message === messages.start.toLowerCase()) notify_helper(t[0], `You can do these things`, messages)

  if (message === messages.cam_back.toLowerCase()) send_camera_to("camera_external_back", t[0])

  if (message === messages.cam_front.toLowerCase()) send_camera_to("camera_external_front", t[0])

  if (message === messages.cam_driveway.toLowerCase()) send_camera_to("camera_external_driveway", t[0])

  if (message === messages.cam_garden.toLowerCase()) send_camera_to("camera_external_garden", t[0])

  if (message === messages.cam_porch.toLowerCase()) send_camera_to("camera_external_porch", t[0])

  if (message === messages.get_alarm_status.toLowerCase())
    get_alarm_state()
      .then(state => notify_helper(t[0], state))

  // vacuum
  if (message === messages.vacuum_start.toLowerCase())
    vacuum_helper('start')
  if (message === messages.vacuum_stop.toLowerCase())
    vacuum_helper('stop')

  // velux
  if (message === messages.velux_messages.toLowerCase()) notify_helper(t[0], `You can do these velux things`, velux_messages)
  if (message === velux_messages.velux_blind_100.toLowerCase()) awsMqttClient.publish('velux', 'Loft Blind 100', { qos: 0 })
  if (message === velux_messages.velux_blind_0.toLowerCase()) awsMqttClient.publish('velux', 'Loft Blind 0', { qos: 0 })
  if (message === velux_messages.velux_window_25.toLowerCase()) awsMqttClient.publish('velux', 'Loft Window 25', { qos: 0 })
  if (message === velux_messages.velux_window_50.toLowerCase()) awsMqttClient.publish('velux', 'Loft Window 50', { qos: 0 })
  if (message === velux_messages.velux_window_75.toLowerCase()) awsMqttClient.publish('velux', 'Loft Window 75', { qos: 0 })
  if (message === velux_messages.velux_window_100.toLowerCase()) awsMqttClient.publish('velux', 'Loft Window 100', { qos: 0 })
  if (message === velux_messages.velux_window_vent.toLowerCase()) awsMqttClient.publish('velux', 'Loft Window vent', { qos: 0 })

  // zwave
  if (message === messages.zwave.toLowerCase()) notify_helper(t[0], `You can do these zwave things`, zwave_messages)
  if (message === zwave_messages.zwave_secureadd.toLowerCase()) zwave_helper("zwave_f2e55e6c", { secureAddNode: random_number() })
  if (message === zwave_messages.zwave_add.toLowerCase()) zwave_helper("zwave_f2e55e6c", { addNode: random_number() })
  if (message === zwave_messages.zwave_cancel.toLowerCase()) zwave_helper("zwave_f2e55e6c", { cancelControllerCommand: random_number() })
  if (message === zwave_messages.zwave_remove.toLowerCase()) zwave_helper("zwave_f2e55e6c", { removeNode: random_number() })
  if (message === zwave_messages.zwave_heal.toLowerCase()) zwave_helper("zwave_f2e55e6c", { healNetwork: random_number() })
  if (message === zwave_messages.zwave_reset.toLowerCase()) zwave_helper("zwave_f2e55e6c", { softReset: random_number() })

  // lights
  if (message === messages.lights.toLowerCase()) notify_helper(t[0], `You can do these light things`, light_messages)

  if (message === light_messages.lounge_1_on.toLowerCase()) zwave_helper(thing_lookup["Lounge lights"], { user: { Switch: true } })
  if (message === light_messages.lounge_2_on.toLowerCase()) zwave_helper(thing_lookup["Lounge lights"], { user: { "Switch-1": true } })
  if (message === light_messages.kitchen_1_on.toLowerCase()) zwave_helper(thing_lookup["Kitchen lights"], { user: { Level: 99 } })
  if (message === light_messages.kitchen_2_on.toLowerCase()) zwave_helper(thing_lookup["Kitchen counter lights"], { user: { Switch: true } })
  if (message === light_messages.kitchen_3_on.toLowerCase()) zwave_helper(thing_lookup["Kitchen counter lights"], { user: { "Switch-1": true } })
  if (message === light_messages.kitchen_4_on.toLowerCase()) zwave_helper(thing_lookup["Dining lights"], { user: { Switch: true } })
  if (message === light_messages.garden_on.toLowerCase()) zwave_helper(thing_lookup["Dining lights"], { user: { "Switch-1": true } })
  if (message === light_messages.garage_1_on.toLowerCase()) zwave_helper(thing_lookup["Garage lights"], { user: { "Switch": true } })
  if (message === light_messages.garage_2_on.toLowerCase()) zwave_helper(thing_lookup["Garage lights"], { user: { "Switch-1": true } })
  if (message === light_messages.entry_light_1_on.toLowerCase()) zwave_helper(thing_lookup["Entry lighting"], { user: { Switch: true } })
  if (message === light_messages.entry_light_2_on.toLowerCase()) zwave_helper(thing_lookup["Entry lighting"], { user: { "Switch-1": true } })
  if (message === light_messages.fairy_garden_on.toLowerCase()) zwave_helper(thing_lookup["Fairy garden lights"], { user: { "Switch": true } })
  if (message === light_messages.noah_light_on.toLowerCase()) zwave_helper(thing_lookup["Noah lighting"], { user: { "Switch": true } })

  if (message === light_messages.lounge_1_off.toLowerCase()) zwave_helper(thing_lookup["Lounge lights"], { user: { Switch: false } })
  if (message === light_messages.lounge_2_off.toLowerCase()) zwave_helper(thing_lookup["Lounge lights"], { user: { "Switch-1": false } })
  if (message === light_messages.kitchen_1_off.toLowerCase()) zwave_helper(thing_lookup["Kitchen lights"], { user: { Level: 0 } })
  if (message === light_messages.kitchen_2_off.toLowerCase()) zwave_helper(thing_lookup["Kitchen counter lights"], { user: { Switch: false } })
  if (message === light_messages.kitchen_3_off.toLowerCase()) zwave_helper(thing_lookup["Kitchen counter lights"], { user: { "Switch-1": false } })
  if (message === light_messages.kitchen_4_off.toLowerCase()) zwave_helper(thing_lookup["Dining lights"], { user: { Switch: false } })
  if (message === light_messages.garden_off.toLowerCase()) zwave_helper(thing_lookup["Dining lights"], { user: { "Switch-1": false } })
  if (message === light_messages.garage_1_off.toLowerCase()) zwave_helper(thing_lookup["Garage lights"], { user: { "Switch": false } })
  if (message === light_messages.garage_2_off.toLowerCase()) zwave_helper(thing_lookup["Garage lights"], { user: { "Switch-1": false } })
  if (message === light_messages.entry_light_1_off.toLowerCase()) zwave_helper(thing_lookup["Entry lighting"], { user: { Switch: false } })
  if (message === light_messages.entry_light_2_off.toLowerCase()) zwave_helper(thing_lookup["Entry lighting"], { user: { "Switch-1": false } })
  if (message === light_messages.fairy_garden_off.toLowerCase()) zwave_helper(thing_lookup["Fairy garden lights"], { user: { "Switch": false } })
  if (message === light_messages.noah_light_off.toLowerCase()) zwave_helper(thing_lookup["Noah lighting"], { user: { "Switch": false } })

  if (message === light_messages.kitchen_1_on_25.toLowerCase()) zwave_helper(thing_lookup["Kitchen lights"], { user: { Level: 25 } })
  if (message === light_messages.kitchen_1_on_50.toLowerCase()) zwave_helper(thing_lookup["Kitchen lights"], { user: { Level: 50 } })
  if (message === light_messages.kitchen_1_on_75.toLowerCase()) zwave_helper(thing_lookup["Kitchen lights"], { user: { Level: 75 } })

  //all off
  if (message === messages.all_off.toLowerCase()) {
    all_off()
    reply_with_alarm_status(t[0])
    set_alarm_state("arm_home")
    notify_helper(t[0], "night night")
  }
})

const all_off = () => {
  zwave_helper("zwave_f2e55e6c", { switchAllOff: random_number() })
  zwave_helper("magichome_600194AA6CAA", { on: false })
  awsMqttClient.publish("sonos/pauseall/now", JSON.stringify({}))
}

const random_number = () => Math.floor((Math.random() * 100000) + 1)

const send_camera_to = (camera, who, inst_uuid = uuid(), imageBody = {}) =>
  iotdata.getThingShadow({ thingName: camera }).promise()
    .then(thing => JSON.parse(thing.payload).state.reported.jpg)

    .then(camera_url => request({ uri: camera_url, encoding: null }))
    .then(body => imageBody = body)
    .then(() => s3.putObject({
      Body: imageBody,
      Key: `${inst_uuid}.jpg`,
      ContentType: "image/jpeg",
      Bucket: "me.cns.p.cams"
    }).promise())
    .then(() => s3.getSignedUrl("getObject", { Bucket: "me.cns.p.cams", Key: `${inst_uuid}.jpg` }))
    .then(signedurl => notify_helper(who, null, null, true, signedurl))

const reply_with_alarm_status = who => get_alarm_ready_status().then(ready_status => notify_helper(who, `Alarm is currently${ready_status ? " " : " not "}ready to arm`, null, true))

const TL_MAP = {
  chris: CHRIS_TELEGRAM_ID,
  hannah: HANNAH_TELEGRAM_ID,
  everyone: GROUP_TELEGRAM_ID
}

const message_parser = message => {
  try {
    return JSON.parse(message.toString())
  }
  catch (e) {
    return message.toString()
  }
}

const vacuum_helper = action => awsMqttClient.publish(`ifttt-out/vacuum_${action}`, JSON.stringify({}), { qos: 0 })

const zwave_helper = (thing, state) => iotdata.updateThingShadow({
  thingName: thing,
  payload: JSON.stringify({ state: { desired: state } })
}
).promise()

const notify_helper = (who, message, actions = null, disableNotification = false, image = null) =>
  awsMqttClient.publish(`notify/in/${who}`, JSON.stringify({
    disableNotification: disableNotification,
    message: message,
    image: image,
    buttons: actions ? _.map(actions, action => {
      return { title: action, value: action }
    }) : null
  }))

const say_helper = (where, what) => awsMqttClient.publish(`sonos/say/${where}`, JSON.stringify([what, getSayVolume()]), { qos: 0 })

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 80 : 40

awsMqttClient.on("connect", () => console.log("aws connected"))
awsMqttClient.on("error", (error) => console.error("aws", error))
awsMqttClient.on("close", () => console.error("aws connection close"))
awsMqttClient.on("offline", () => console.log("aws offline"))

rulesAdd("the {string} button is {string}", (thing, action, event) =>
  thing === "doorbell" &&
  event.topic === `$aws/things/${thing_lookup["doorbell"]}/shadow/update/documents` &&
  event.message.current.state.reported.basic.Basic >= 1 &&
  event.message.current.state.reported.basic.Basic !== event.message.previous.state.reported.basic.Basic
)

rulesAdd("the alarm state changes to {string}", (state, event) =>
  event.topic === "$aws/things/alarm_status/shadow/update/documents" &&
  event.message.previous.state.reported.state !== event.message.current.state.reported.state &&
  event.message.current.state.reported.state.toLowerCase() === state.toLowerCase()
)

rulesAdd("the alarm is not {string}", async state => await get_alarm_state() !== state)

rulesAdd("the alarm readiness is {string}", async state => await get_alarm_ready_status() === (state.toLowerCase() === "ready"))

rulesAdd("the alarm is {string}", async state => await get_alarm_state() === state)

rulesAdd("the {string} speaker says {string}", (speaker, message) => say_helper(speaker, message))

rulesAdd("a screengrab of the {string} is sent to {string}", (camera, who) =>
  send_camera_to(Object.keys(camera_map).find(key => camera_map[key] === camera), TL_MAP[who.toLowerCase()]))

rulesAdd("{word} leaves home", (device, event, t = mqttWildcard(event.topic, "owntracks/+/+/event")) =>
  t !== null &&
  t[1].toLowerCase() === device.toLowerCase() &&
  event.message.event.toLowerCase() === "leave" &&
  event.message.desc.toLowerCase() === "home")

rulesAdd("{word} arrives home", (device, event, t = mqttWildcard(event.topic, "owntracks/+/+/event")) =>
  t !== null &&
  t[1].toLowerCase() === device.toLowerCase() &&
  event.message.event.toLowerCase() === "enter" &&
  event.message.desc.toLowerCase() === "home")

const calculate_time = (number, measure) => {
  switch (measure) {
    case "milliseconds":
    case "millisecond":
      return number
    case "seconds":
    case "second":
      return calculate_time(number * 1000, "milliseconds")
    case "minutes":
    case "minute":
      return calculate_time(number * 60, "seconds")
    case "hours":
    case "hour":
      return calculate_time(number * 60, "minutes")
    default:
      throw `unknown time measure: ${measure}`
  }
}

const clock_tic = setInterval(() => eventHandler({ topic: "clock tic" }), calculate_time(5, process.env.NODE_ENV === "production" ? "minutes" : "seconds"))

rulesAdd("the {string} is reporting {string} - {string} less than {int}", async (device, genre, label, value) =>
  await iotdata.getThingShadow({ thingName: thing_lookup[device] }).promise()
    .then(thing => JSON.parse(thing.payload).state.reported[genre.toLowerCase()][label]) < value
)

rulesAdd("the current time is {word} sun{word}", async (ba, sunstate, event) =>
  await iotdata.getThingShadow({ thingName: 'weather_daily' }).promise()
    .then(thing => new Date()[`is${_.upperFirst(ba)}`](JSON.parse(thing.payload).state.reported.data[0][`sun${sunstate}Time`] * 1000))
)

rulesAdd("the {string} is reporting {word} {string} not {string}", async (device, genre, label, value, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported[genre.toLowerCase()][label].toString() !== value.toString()
)

rulesAdd("the {string} is reporting {word} {string} {string}", async (device, genre, label, value, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported[genre.toLowerCase()][label].toString() === value.toString()
)

rulesAdd("the {string} {word} {string} changes", async (device, genre, label, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported[genre.toLowerCase()][label].toString() !== event.message.previous.state.reported[genre.toLowerCase()][label].toString()
)

rulesAdd("the {string} button {int} is pushed", async (device, buttonid, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported.user["Scene ID"] == buttonid &&
  event.message.current.metadata.reported.user["Scene ID"].timestamp !== event.message.previous.metadata.reported.user["Scene ID"].timestamp
)

rulesAdd("the alarm readiness changes to {string}", async (readiness, event) =>
  event.topic === `$aws/things/alarm_status/shadow/update/documents` &&
  event.message.previous.state.reported.ready_status !== event.message.current.state.reported.ready_status &&
  event.message.current.state.reported.ready_status === (readiness === "ready")
)

rulesAdd("the {string} {string} is turned {word}", async (device, field, state, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported.user[field] === (state === "on")
)

rulesAdd("the {string} led strip should be {word}", async (device, action) => {
  if (action.toLowerCase() === "toggled") {
    action = await iotdata.getThingShadow({ thingName: thing_lookup[device] }).promise()
      .then(current_shadow => !JSON.parse(current_shadow.payload).state.reported.on)
  } else {
    action = action.toLowerCase() === "on"
  }
  return zwave_helper(thing_lookup[device], { "on": action })
})

rulesAdd("a clock tic", event => event.topic === "clock tic")

rulesAdd("the {string} {word} {string} should be {string}", (device, genre, setting, value) => zwave_helper(thing_lookup[device], { [genre]: { [setting]: value } }))

rulesAdd("the {string} {word} {string} should be {word}", async (device, genre, setting, action) => {
  if (action.toLowerCase() === "toggled") {
    action = await iotdata.getThingShadow({ thingName: thing_lookup[device] }).promise()
      .then(current_shadow => !JSON.parse(current_shadow.payload).state.reported[genre][setting])
  } else {
    action = action.toLowerCase() === "on"
  }
  return zwave_helper(thing_lookup[device], { [genre]: { [setting]: action } })
})

rulesAdd("there is movement is detected on the {string}", (device, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported.user.Burglar === 8 &&
  event.message.current.state.reported.user.Burglar !== event.message.previous.state.reported.user.Burglar)

rulesAdd("the {string} speaker {word} should be {word}", (room, setting, state) => awsMqttClient.publish(`sonos/${setting.toLowerCase()}/${room}`, JSON.stringify([state]), { qos: 0 }))

rulesAdd("the vacuum should {word}", vacuum_helper)

rulesAdd("the velux scene {string} is activated", (scene) => awsMqttClient.publish('velux', scene, { qos: 0 }))

rulesAdd("the time is between {string} and {string}", (start, end) => new Date().isBetween(start, end).raw)

rulesAdd("the underfloor {string} should be {int}°C", (room, temp) => zwave_helper(thing_lookup[room], { user: { Heating: temp } }))

rulesAdd("a delay of {int} {word}", async (number, measure) =>
  new Promise(resolve => setTimeout(resolve, calculate_time(number, measure.toLowerCase()))))

rulesAdd("the alarm state should be {string}", state => set_alarm_state(state.toLowerCase()))


rulesAdd("turn everything off", () => all_off())

rulesAdd("a message reading {string} is sent to {string}", (message, who) => notify_helper(TL_MAP[who.toLowerCase()], message))

rulesAdd("the event is forwarded to {string}", (who, event) => notify_helper(TL_MAP[who.toLowerCase()], `zwave ${event.message.homeid} ${JSON.stringify(event.message.log)}`))

rulesAdd("a message reading {string} is sent to {string} with a button to {string}", (message, who, button) =>
  notify_helper(TL_MAP[who.toLowerCase()], message, button.split(", "))
)

rulesAdd("the nest thermostat mode is set to {word}", mode => awsMqttClient.publish(`$aws/things/nest_MPT2taEp8tFu5JgGyioUj34RpkkCHQzJ/shadow/update`, JSON.stringify({ state: { desired: { hvac_mode: mode } } }), { qos: 0 }))

rulesAdd("the front door is unlocked", event => iotdata.updateThingShadow({
  thingName: thing_lookup["front door lock"],
  payload: JSON.stringify({ state: { desired: { user: { Locked: 0 } } } })
}).promise())

awsMqttClient.on("message", (topic, message) =>
  eventHandler({ topic: topic, message: message_parser(message) }))

// pickling needs to be done after adding all the rules
console.log(gherkin)
pickleGherkin(gherkin)
