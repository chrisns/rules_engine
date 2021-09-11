/*eslint no-console: "off"*/

const mqttWildcard = require("mqtt-wildcard")
const _ = require("lodash")
const AWS = require("aws-sdk")
const request = require("request-promise-native")
const { v4: uuid } = require('uuid')
const Date = require("sugar-date").Date
const memoize = require("memoizee")
const CronJob = require('cron').CronJob;


const { AWS_IOT_ENDPOINT_HOST, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID } = process.env
const { camera_map, messages } = require("./chatbot_messages")

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
  `$aws/things/${thing_lookup["Zwave eu controller"]}/shadow/update/documents`,
  `$aws/things/${thing_lookup["doorbell"]}/shadow/update/documents`,
  `$aws/things/${thing_lookup["Family bathroom lights"]}/shadow/update/documents`,
  `$aws/things/${thing_lookup["Nodeon remote"]}/shadow/update/documents`,
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

  if (message === messages.unlock_door.toLowerCase()) zwave_helper(thing_lookup["front door lock"], { user: { Locked: false } })

  if (message === messages.lock_quiet.toLowerCase()) zwave_helper(thing_lookup["front door lock"], { config: { "Audio Mode": "Silent" } })
  if (message === messages.lock_noisy.toLowerCase()) zwave_helper(thing_lookup["front door lock"], { config: { "Audio Mode": "High" } })

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

  if (message === messages.get_alarm_status.toLowerCase())
    get_alarm_state()
      .then(state => notify_helper(t[0], state))

})

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

const say_helper = (where, what, volume) => awsMqttClient.publish(`sonos/say/${where}`, JSON.stringify([what, volume ? volume : getSayVolume()]), { qos: 0 })

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 80 : 40

awsMqttClient.on("connect", () => console.log("aws connected"))
awsMqttClient.on("error", (error) => console.error("aws", error))
awsMqttClient.on("close", () => console.error("aws connection close"))
awsMqttClient.on("offline", () => console.log("aws offline"))

rulesAdd("the doorbell is pressed", (event) =>
  event.topic === `$aws/things/${thing_lookup["doorbell"]}/shadow/update/documents` &&
  event.message.current.state.reported.user["Home Security"] === "Tampering -  Cover Removed" &&
  event.message.previous.state.reported.user["Home Security"] === "Clear"
)

rulesAdd("the {string} speaker says {string}", (speaker, message) => say_helper(speaker, message))
rulesAdd("the {string} speaker whispers {string}", (speaker, message) => say_helper(speaker, message, 20))

rulesAdd("a screengrab of the {string} is sent to {string}", (camera, who) =>
  send_camera_to(Object.keys(camera_map).find(key => camera_map[key] === camera), TL_MAP[who.toLowerCase()]))

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

var cron_schedules = []

rulesAdd("cron {string}", (cron_schedule, event) => {
  if (!cron_schedules[cron_schedule])
    cron_schedules[cron_schedule] = new CronJob(cron_schedule, () => eventHandler({ topic: "cron", message: cron_schedule }), null, true)
  return event.topic === "cron" && event.message === cron_schedule
})


rulesAdd("the {string} is reporting {string} - {string} less than {int}", async (device, genre, label, value) =>
  await iotdata.getThingShadow({ thingName: thing_lookup[device] }).promise()
    .then(thing => parseFloat(JSON.parse(thing.payload).state.reported[genre.toLowerCase()][label])) < value
)

rulesAdd("the {string} is reporting {word} {string} not {string}", async (device, genre, label, value, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported[genre.toLowerCase()][label].toString() !== value.toString()
)

rulesAdd("the {string} is reporting {word} {string} {string}", async (device, genre, label, value, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported[genre.toLowerCase()][label].toString() === value.toString()
)

rulesAdd("the {string} button {int} is pushed", async (device, buttonid, event) =>
  event.topic === `$aws/things/${thing_lookup[device]}/shadow/update/documents` &&
  event.message.current.state.reported.user["Scene"] == buttonid &&
  event.message.previous.state.reported.user["Scene"] === 0 &&
  event.message.current.metadata.reported.user["Scene"].timestamp !== event.message.previous.metadata.reported.user["Scene"].timestamp
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


rulesAdd("the {string} speaker should {word}", (room, action) => awsMqttClient.publish(`sonos/${action.toLowerCase()}/${room}`, JSON.stringify({}), { qos: 0 }))

var backoff = {}
rulesAdd("a {string} backoff of {int} {word}", (backoffname, time, measure) => {
  if (backoff[backoffname])
    return false
  backoff[backoffname] = setTimeout(() => delete backoff[backoffname], calculate_time(time, measure))
  return true
})

rulesAdd("a message reading {string} is sent to {string} with a button to {string}", (message, who, button) =>
  notify_helper(TL_MAP[who.toLowerCase()], message, button.split(", "))
)

awsMqttClient.on("message", (topic, message) =>
  eventHandler({ topic: topic, message: message_parser(message) }))

console.log(gherkin)
pickleGherkin(gherkin)
