/*eslint no-console: "off"*/

const mqttWildcard = require("mqtt-wildcard")
const _ = require("lodash")
const AWS = require("aws-sdk")
const request = require("request-promise-native")
const uuid = require("uuid/v4")

const {AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, AWS_IOT_ENDPOINT_HOST, AWS_REGION, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID} = process.env
const {rulesAdd, eventHandler, pickleGherkin} = require("./rules")
const fs = require("fs")
const gherkin = fs.readdirSync("features").map(file => fs.readFileSync(`features/${file}`).toString()).join("\n").replace(/Feature:/ig, "#Feature:").substr(1)

const AWSMqtt = require("aws-mqtt-client").default

const awsMqttClient = new AWSMqtt({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  endpointAddress: AWS_IOT_ENDPOINT_HOST,
  region: AWS_REGION,
  logger: console
})

const iotdata = new AWS.IotData({
  endpoint: AWS_IOT_ENDPOINT_HOST,
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
  logger: console

})

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
})

const awsTopics = [
  "owntracks/+/+/event",
  "$aws/things/alarm_status/shadow/update/documents",
  "$aws/things/zwave_f2e55e6c_10/shadow/update/documents",
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
}, (err, data) => console.log(err, data))

awsMqttClient.on("message", function (topic, message) {
  message = message_parser(message)

  // react to chatbot commands
  if ((t = mqttWildcard(topic, "notify/out/+")) && t !== null) {
    // send acknowledgement back to user

    message = message.toLowerCase()
    console.log(`Telegram user ${t[0]} just sent:"${message}"`)

    if (message === messages.unlock_door.toLowerCase())
      iotdata.updateThingShadow({
        thingName: "zwave_f2e55e6c_4",
        payload: JSON.stringify({state: {desired: {user: {Locked: 0}}}})
      }, (err, data) => console.log(err, data))

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
      let split_message = /say\s(\w+)(.*)/gi.exec(message)
      say_helper(split_message[1], split_message[2])
    }

    if (message === messages.start.toLowerCase())
      notify_helper(t[0], `You can do these things`, messages)

    if (message === messages.cam_driveway.toLowerCase())
      send_camera_to("camera_external_driveway", t[0])

    if (message === messages.cam_garden.toLowerCase())
      send_camera_to("camera_external_garden", t[0])

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
  }

})

const random_number = () => Math.floor((Math.random() * 100000) + 1)

const send_camera_to = (camera, who) => {
  let inst_uuid = uuid()
  return iotdata.getThingShadow({thingName: camera}).promise()
    .then(thing => JSON.parse(thing.payload).state.reported.jpg)

    .then(camera_url => request({uri: camera_url, encoding: null}))
    .then(body => s3.putObject({
      Body: body,
      Key: `${inst_uuid}.jpg`,
      ContentType: "image/jpeg",
      Bucket: "me.cns.p.cams"
    }).promise())
    .then(() => s3.getSignedUrl("getObject", {Bucket: "me.cns.p.cams", Key: `${inst_uuid}.jpg`}))
    .then(signedurl => notify_helper(who, null, null, true, signedurl))
}

const reply_with_alarm_status = who => get_alarm_ready_status().then(ready_status => notify_helper(who, `Alarm is currently${ready_status ? " " : " not "}ready to arm`, null, true))

const messages = {
  start: "/start",
  unlock_door: "Unlock the door",
  disarm_alarm: "Disarm alarm",
  arm_alarm_home: "Arm alarm home",
  arm_alarm_away: "Arm alarm away",
  get_alarm_status: "Get alarm status",
  doorbell_off: "Doorbell off",
  doorbell_on: "Doorbell on",
  cam_driveway: "Get driveway camera",
  cam_garden: "Get garden camera",
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

rulesAdd("the {string} button is {string}", (thing, action, event) => {
  if (thing === "doorbell" &&
    event.topic === "$aws/things/zwave_f2e55e6c_10/shadow/update/documents" &&
    event.message.current.state.reported.basic.Basic !== event.message.previous.state.reported.basic.Basic)
    return true
  return false
})

rulesAdd("the alarm state changes to {string}", (state, event) =>
  event.topic === "$aws/things/alarm_status/shadow/update/documents" &&
  event.message.previous.state.reported.state !== event.message.current.state.reported.state &&
  event.message.previous.state.reported.state === "state"
)

rulesAdd("the alarm is not {string}", async state => {
  let current_state = await get_alarm_state()
  return current_state !== state
})

rulesAdd("the alarm is {string}", async state => {
  let current_state = await get_alarm_state()
  return current_state === state
})

rulesAdd("the {string} speaker says {string}", (speaker, message) =>
  say_helper(speaker, message)
)

rulesAdd("a screengrab of the {string} is sent to {string}", (camera, who) => {
  if (camera === "Driveway camera")
    camera = "camera_external_driveway"

  return send_camera_to(camera, TL_MAP[who.toLowerCase()])
})

rulesAdd("{string} {string} Home", (device, transition, event) => {
  const t = mqttWildcard(event.topic, "owntracks/+/+/event")
  return t !== null &&
    t[1] === device &&
    event.message._type === "transition" &&
    event.message.event === transition &&
    event.message.desc === "Home"
})

rulesAdd("the alarm state should be {string}", state => set_alarm_state(state.toLowerCase()))

rulesAdd("a message reading {string} is sent to {string}", (message, who) => notify_helper(TL_MAP[who.toLowerCase()], message))

rulesAdd("a zwave log message is received", event => event.topic === "zwave/log")

rulesAdd("the event is forwarded to {string}", (who, event) => notify_helper(TL_MAP[who.toLowerCase()], `zwave ${event.message.homeid} ${JSON.stringify(event.message.log)}`))

rulesAdd("a message reading {string} is sent to {string} with a button to {string}", (message, who, button) =>
  notify_helper(TL_MAP[who.toLowerCase()], message, [button])
)

awsMqttClient.on("message", (topic, message) =>
  eventHandler({topic: topic, message: message_parser(message)}))

// pickling needs to be done after adding all the rules
console.log(gherkin)
pickleGherkin(gherkin)
