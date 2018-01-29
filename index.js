/*eslint no-console: "off"*/

const mqttWildcard = require("mqtt-wildcard")
const _ = require("lodash")
const AWS = require("aws-sdk")
const request = require("request-promise-native")
const uuid = require("uuid/v4")

const {AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, AWS_IOT_ENDPOINT_HOST, AWS_REGION, CHRIS_TELEGRAM_ID, HANNAH_TELEGRAM_ID, GROUP_TELEGRAM_ID} = process.env

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

  if (mqttWildcard(topic, "owntracks/+/+/event") !== null) {
    const t = mqttWildcard(topic, "owntracks/+/+/event")
    const device_map = {cnsiphone: "Chris", hnsiphone: "Hannah"}
    const announce_map = {cnsiphone: "Daddy", hnsiphone: "Mummy"}
    // say_helper("garage", `${announce_map[t[1]]} is home`)
    if (message._type === "transition" && message.desc === "Home" && device_map[t[1]]) {
      if (message.event === "enter") {
        say_helper("kitchen", `${announce_map[t[1]]} is home`)
        get_alarm_state()
          .then(state => {
            if (state === "Disarm") {
              notify_helper(TL_MAP[device_map[t[1]].toLowerCase()], "You just got home, alarm is DISARMED")
            }
            else {
              notify_helper(TL_MAP[device_map[t[1]].toLowerCase()], `You just got home, alarm is ${state}, attempting to disarm`)
              set_alarm_state("disarm")
            }
          })
      }
      if (message.event === "leave") {
        say_helper("kitchen", `${device_map[t[1]]} just left`)
        say_helper("garage", `${device_map[t[1]]} just left`)
        get_alarm_state()
          .then(state => {
            if (state === "Disarm")
              notify_helper(TL_MAP[device_map[t[1]].toLowerCase()], `You just without setting the alarm`)
          })
      }
    }
  }

  if (topic === "$aws/things/alarm_status/shadow/update/documents") {
    // alarm state has changed
    if (message.previous.state.reported.state !== message.current.state.reported.state) {
      console.log(`Alarm state changed to ${message.current.state.reported.state}, it was ${message.previous.state.reported.state}`)
      notify_helper(GROUP_TELEGRAM_ID, `Alarm state changed to ${message.current.state.reported.state}, it was ${message.previous.state.reported.state}`)

      if (message.current.state.reported.state === "Disarm") {
        say_helper("kitchen", `Alarm is now disarmed`)
      }
    }
  }

  //zwave log
  if (topic === "zwave/log")
    notify_helper(CHRIS_TELEGRAM_ID, `zwave ${message.homeid} ${JSON.stringify(message.log)}`)

  // react to chatbot commands
  if ((t = mqttWildcard(topic, "notify/out/+")) && t !== null) {
    // send acknowledgement back to user
    // notify_helper(t[0].toString(), "ACK", null, true)

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

  // someone at the door
  if (topic === "$aws/things/zwave_f2e55e6c_10/shadow/update/documents"
    && message.current.state.reported.basic.Basic === 0
    && message.current.state.reported.basic.Basic !== message.previous.state.reported.basic.Basic) {
    console.log("door bell!")
    get_alarm_state()
      .then(state => {
        if (state !== "Away") {
          say_helper("kitchen", "Someone at the door")
          say_helper("garage", "Someone at the door")
        }
      })

    notify_helper(GROUP_TELEGRAM_ID, `Someone at the door`, [messages.unlock_door])

    send_camera_to("camera_external_driveway", GROUP_TELEGRAM_ID)

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

const is_alarm_device_open = device => {
  if (current_alarm_full_status && current_alarm_full_status.ready_status === true) {
    return false
  }
  return (device.troubles && device.troubles.includes("OPENED"))
}

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
  hannah: HANNAH_TELEGRAM_ID
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
},).promise()

const lights_helper = (light, state) => client.publish(`lifx-lights/${light}`, state)

const notify_helper = (who, message, actions = null, disableNotification = false, image = null) =>
  awsMqttClient.publish(`notify/in/${who}`, JSON.stringify({
    disableNotification: disableNotification,
    message: message,
    image: image,
    buttons: actions ? _.map(actions, action => {
      return {title: action, value: action}
    }) : null
  }))

const say_helper = (where, what) =>
  awsMqttClient.publish(`sonos/say/${where}`, JSON.stringify([what, getSayVolume()]), {qos: 0})

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 40 : 15

awsMqttClient.on("connect", () => console.log("aws connected"))
awsMqttClient.on("error", (error) => console.error("aws", error))
awsMqttClient.on("close", () => console.error("aws connection close"))
awsMqttClient.on("offline", () => console.log("aws offline"))
