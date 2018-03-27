/*eslint no-console: "off"*/

const mqttWildcard = require("mqtt-wildcard")
const _ = require("lodash")
const AWS = require("aws-sdk")
const request = require("request-promise-native")
const uuid = require("uuid/v4")
const Date = require("sugar-date").Date

const {AWS_IOT_ENDPOINT_HOST, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID} = process.env
const {rulesAdd, eventHandler, pickleGherkin} = require("./rules")
const fs = require("fs")
const gherkin = fs.readdirSync("features").map(file => fs.readFileSync(`features/${file}`).toString()).join("\n").replace(/Feature:/ig, "#Feature:").substr(1)

const AWSMqtt = require("aws-mqtt-client").default

const awsMqttClient = new AWSMqtt({
  endpointAddress: AWS_IOT_ENDPOINT_HOST,
  logger: console
})

const iotdata = new AWS.IotData({
  endpoint: AWS_IOT_ENDPOINT_HOST,
  logger: console
})

const rekognition = new AWS.Rekognition({
  logger: console
})

const s3 = new AWS.S3({
  logger: console
})

const awsTopics = [
  "owntracks/+/+/event",
  "$aws/things/alarm_status/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_10/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_17/shadow/update/documents",
  `notify/out/${CHRIS_TELEGRAM_ID}`,
  `notify/out/${HANNAH_TELEGRAM_ID}`
]

awsMqttClient.on("connect", () => awsMqttClient.subscribe(awsTopics,
  {qos: 1},
  (err, granted) => console.log("aws", err, granted)
))

const get_alarm_state = () => iotdata.getThingShadow({thingName: "alarm_status"}).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.state)

const get_alarm_ready_status = () => iotdata.getThingShadow({thingName: "alarm_status"}).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.ready_status)

const set_alarm_state = state => iotdata.updateThingShadow({
  thingName: "alarm_status",
  payload: JSON.stringify({state: {desired: {state: state}}})
}).promise()

// react to chatbot commands
awsMqttClient.on("message", (topic, raw_message, raw_msg, t = mqttWildcard(topic, "notify/out/+"), message = t ? message_parser(raw_message).toLowerCase() : null) => {
  if (t === null || message == null)
    return

  console.log(`Telegram user ${t[0]} just sent:"${message}"`)

  if (message === messages.unlock_door.toLowerCase())
    iotdata.updateThingShadow({
      thingName: "zwave_f2e55e6c_4",
      payload: JSON.stringify({state: {desired: {user: {Locked: 0}}}})
    }).promise()

  if (message === messages.arm_alarm_home.toLowerCase()) {
    reply_with_alarm_status(t[0].toString())
    set_alarm_state("arm_home")
  }

  if (message === messages.arm_alarm_away.toLowerCase()) {
    reply_with_alarm_status(t[0].toString())
    set_alarm_state("arm_away")
  }

  if (message === messages.disarm_alarm.toLowerCase())
    set_alarm_state("disarm")

  if (message.startsWith("say")) {
    let split_message = /say\s([\w|,]+)(.*)/gi.exec(message)
    say_helper(split_message[1].toLowerCase(), split_message[2])
  }

  if (message === messages.start.toLowerCase())
    notify_helper(t[0], `You can do these things`, messages)

  if (message === messages.cam_driveway.toLowerCase())
    send_camera_to("camera_external_driveway", t[0])

  if (message === messages.cam_garden.toLowerCase())
    send_camera_to("camera_external_garden", t[0])

  if (message === messages.cam_porch.toLowerCase())
    send_camera_to("camera_external_porch", t[0])

  if (message === messages.get_alarm_status.toLowerCase())
    get_alarm_state()
      .then(state => notify_helper(t[0], state))

  // zwave
  if (message === messages.zwave.toLowerCase())
    notify_helper(t[0], `You can do these zwave things`, zwave_messages)

  if (message === zwave_messages.zwave_secureadd.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {secureAddNode: random_number()})

  if (message === zwave_messages.zwave_add.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {addNode: random_number()})

  if (message === zwave_messages.zwave_cancel.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {cancelControllerCommand: random_number()})

  if (message === zwave_messages.zwave_remove.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {removeNode: random_number()})

  if (message === zwave_messages.zwave_heal.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {healNetwork: random_number()})

  if (message === zwave_messages.zwave_reset.toLowerCase())
    zwave_helper("zwave_f2e55e6c", {softReset: random_number()})

  if (message === zwave_messages.zwave_follow.toLowerCase()) {
    awsMqttClient.subscribe("zwave/log", {qos: 1},
      (err, granted) => console.log("aws", err, granted)
    )
    setTimeout(awsMqttClient.unsubscribe, 5 * 60 * 1000, "zwave/log")
  }

  if (message === messages.all_off.toLowerCase()) {
    zwave_helper(thing_lookup["Kitchen lights"], {user: {Level: 0}})
    zwave_helper(thing_lookup["Lounge lights"], {user: {Switch: 0}})
    zwave_helper(thing_lookup["Lounge lights"], {user: {"Switch-1": 0}})
    zwave_helper(thing_lookup["Lounge lights"], {user: {Switch: 0}})
    awsMqttClient.publish("sonos/pauseall/now", JSON.stringify({}))
    set_alarm_state("arm_home")
    notify_helper(t[0], "night night")
  }

})

const random_number = () => Math.floor((Math.random() * 100000) + 1)

const send_camera_to = (camera, who, inst_uuid = uuid(), imageBody = {}) =>
  iotdata.getThingShadow({thingName: camera}).promise()
    .then(thing => JSON.parse(thing.payload).state.reported.jpg)

    .then(camera_url => request({uri: camera_url, encoding: null}))
    .then(body => imageBody = body)
    .then(() => s3.putObject({
      Body: imageBody,
      Key: `${inst_uuid}.jpg`,
      ContentType: "image/jpeg",
      Bucket: "me.cns.p.cams"
    }).promise())
    .then(() => s3.getSignedUrl("getObject", {Bucket: "me.cns.p.cams", Key: `${inst_uuid}.jpg`}))
    .then(signedurl => notify_helper(who, null, null, true, signedurl))
    .then(() => rekognition.detectLabels({
      Image: {
        Bytes: imageBody,
      },
      MaxLabels: 20,
      MinConfidence: 70
    }).promise())
    .then(labels => labels.Labels.map(label => label.Name))
    .then(labels => notify_helper(who, `Possible contents: ${labels.join(", ")}`, null, true))

const reply_with_alarm_status = who => get_alarm_ready_status().then(ready_status => notify_helper(who, `Alarm is currently${ready_status ? " " : " not "}ready to arm`, null, true))

const messages = {
  start: "/start",
  unlock_door: "Unlock the door",
  disarm_alarm: "Disarm alarm",
  arm_alarm_home: "Arm alarm home",
  arm_alarm_away: "Arm alarm away",
  get_alarm_status: "Get alarm status",
  cam_driveway: "Get driveway camera",
  cam_garden: "Get garden camera",
  cam_porch: "Get porch camera",
  all_off: "Bedtime everything off + arm home",
  zwave: "Z-wave management"
}

const zwave_messages = {
  start: "/start",
  zwave_secureadd: "Securely add device",
  zwave_add: "Insecurely add device",
  zwave_cancel: "Cancel controller command",
  zwave_remove: "Remove device",
  zwave_heal: "Heal network",
  zwave_reset: "Soft reset controller",
  zwave_follow: "Follow events for 5 minutes"
}

const camera_map = {
  camera_external_driveway: "Driveway camera",
  camera_external_porch: "Porch camera",
  camera_external_garden: "Garden camera"
}

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

const zwave_helper = (thing, state) => iotdata.updateThingShadow({
    thingName: thing,
    payload: JSON.stringify({state: {desired: state}})
  }
).promise()

const notify_helper = (who, message, actions = null, disableNotification = false, image = null) =>
  awsMqttClient.publish(`notify/in/${who}`, JSON.stringify({
    disableNotification: disableNotification,
    message: message,
    image: image,
    buttons: actions ? _.map(actions, action => {
      return {title: action, value: action}
    }) : null
  }))

const say_helper = (where, what) => awsMqttClient.publish(`sonos/say/${where}`, JSON.stringify([what, getSayVolume()]), {qos: 0})

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 40 : 15

awsMqttClient.on("connect", () => console.log("aws connected"))
awsMqttClient.on("error", (error) => console.error("aws", error))
awsMqttClient.on("close", () => console.error("aws connection close"))
awsMqttClient.on("offline", () => console.log("aws offline"))

rulesAdd("the {string} button is {string}", (thing, action, event) =>
  thing === "doorbell" &&
  event.topic === "$aws/things/zwave_f2e55e6c_10/shadow/update/documents" &&
  event.message.current.state.reported.basic.Basic === 0 &&
  event.message.current.state.reported.basic.Basic !== event.message.previous.state.reported.basic.Basic
)

rulesAdd("the alarm state changes to {string}", (state, event) =>
  event.topic === "$aws/things/alarm_status/shadow/update/documents" &&
  event.message.previous.state.reported.state !== event.message.current.state.reported.state &&
  event.message.current.state.reported.state.toLowerCase() === state.toLowerCase()
)

rulesAdd("the alarm is not {string}", async state => await get_alarm_state() !== state)

rulesAdd("the alarm is {string}", async state => await get_alarm_state() === state)

rulesAdd("the {string} speaker says {string}", (speaker, message) => say_helper(speaker, message))

rulesAdd("a screengrab of the {string} is sent to {string}", (camera, who) => {
  if (camera === "Driveway camera")
    camera = "camera_external_driveway"

  if (camera === "Porch camera")
    camera = "camera_external_porch"
  return send_camera_to(camera, TL_MAP[who.toLowerCase()])
})

rulesAdd("{string} {string} Home", (device, transition, event, t = mqttWildcard(event.topic, "owntracks/+/+/event")) =>
  t !== null &&
  t[1].toLowerCase() === device.toLowerCase() &&
  event.message._type === "transition" &&
  event.message.event.toLowerCase() === transition.toLowerCase() &&
  event.message.desc.toLowerCase() === "home"
)

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

const clock_tic = setInterval(() => eventHandler({topic: "clock tic"}), calculate_time(15, "minutes"))

const thing_lookup = {
  "front door lock": "zwave_f2e55e6c_4",
  "Hallway heating": "zwave_f2e55e6c_11",
  "Kitchen heating": "zwave_f2e55e6c_12",
  "Dining Room heating": "zwave_f2e55e6c_13",
  "Master bedroom radiator": "zwave_f2e55e6c_14",
  "Kitchen multisensor": "zwave_f2e55e6c_17",
  "Kitchen lights": "zwave_f2e55e6c_16",
  "Lounge lights": "zwave_f2e55e6c_15",
}

rulesAdd("the {string} is reporting {string} - {string} less than {int}", async (device, genre, label, value) =>
  await iotdata.getThingShadow({thingName: thing_lookup[device]}).promise()
    .then(thing => JSON.parse(thing.payload).state.reported[genre.toLowerCase()][label]) < value
)

rulesAdd("a clock tic", event => event.topic === "clock tic")

rulesAdd("the {string} {word} {string} should be {string}", (device, genre, setting, value) => zwave_helper(thing_lookup[device], {[genre]: {[setting]: value}}))

rulesAdd("there is movement is detected on the {string}", (device, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported.user.Burglar === 8 &&
  event.message.current.state.reported.user.Burglar !== event.message.previous.state.reported.user.Burglar)

rulesAdd("the {string} speaker {word} should be {word}", (room, setting, state) => awsMqttClient.publish(`sonos/${setting.toLowerCase()}/${room}`, JSON.stringify([state]), {qos: 0}))

rulesAdd("the time is between {string} and {string}", (start, end) => new Date().isBetween(start, end).raw)

rulesAdd("the underfloor {string} should be {int}°C", (room, temp) => zwave_helper(thing_lookup[room], {user: {Heating: temp}}))

rulesAdd("a delay of {int} {word}", async (number, measure) =>
  new Promise(resolve => setTimeout(resolve, calculate_time(number, measure.toLowerCase()))))

rulesAdd("the alarm state should be {string}", state => set_alarm_state(state.toLowerCase()))

rulesAdd("a message reading {string} is sent to {string}", (message, who) => notify_helper(TL_MAP[who.toLowerCase()], message))

rulesAdd("a zwave log message is received", event => event.topic === "zwave/log")

rulesAdd("the event is forwarded to {string}", (who, event) => notify_helper(TL_MAP[who.toLowerCase()], `zwave ${event.message.homeid} ${JSON.stringify(event.message.log)}`))

rulesAdd("a message reading {string} is sent to {string} with a button to {string}", (message, who, button) =>
  notify_helper(TL_MAP[who.toLowerCase()], message, button.split(", "))
)

awsMqttClient.on("message", (topic, message) =>
  eventHandler({topic: topic, message: message_parser(message)}))

// pickling needs to be done after adding all the rules
console.log(gherkin)
pickleGherkin(gherkin)
