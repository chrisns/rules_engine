/*eslint no-console: "off"*/

const mqttWildcard = require('mqtt-wildcard')
const _ = require('lodash')
const AWS = require('aws-sdk')
const request = require('request-promise-native')
const uuid = require('uuid/v4')

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
  "domoticz/out",
  "owntracks/+/+/event",
  '$aws/things/alarm_status/shadow/update/documents',
  '$aws/things/alarm_zone_7/shadow/update/documents',
  '$aws/things/alarm_zone_4/shadow/get/accepted',
  `notify/out/${CHRIS_TELEGRAM_ID}`,
  `notify/out/${HANNAH_TELEGRAM_ID}`
]

awsMqttClient.on('connect', () => awsMqttClient.subscribe(awsTopics,
  {qos: 1},
  (err, granted) => console.log("aws", err, granted)
))

let current_alarm_state
let current_alarm_full_status

const get_alarm_state = () => iotdata.getThingShadow({thingName: "alarm_status"}).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.state)

const get_alarm_ready_status = () => iotdata.getThingShadow({thingName: "alarm_status"}).promise()
  .then(thing => JSON.parse(thing.payload).state.reported.ready_status)

const set_alarm_state = state => iotdata.updateThingShadow({
  thingName: "alarm_status",
  payload: JSON.stringify({state: {desired: {state: state}}})
}, (err, data) => console.log(err, data))

awsMqttClient.on('message', function (topic, message) {
  message = message_parser(message)

  if (mqttWildcard(topic, 'owntracks/+/+/event') !== null) {
    const t = mqttWildcard(topic, 'owntracks/+/+/event')
    const device_map = {cnsiphone: "Chris", hnsiphone: "Hannah"}
    const announce_map = {cnsiphone: "Daddy", hnsiphone: "Mummy"}
    say_helper("kitchen", `${announce_map[t[1]]} is home`)
    // say_helper("garage", `${announce_map[t[1]]} is home`)
    if (message._type === "transition" && message.desc === "Home" && device_map[t[1]]) {
      if (message.event === "enter") {
        get_alarm_state()
          .then(state => {
            if (state === "Disarm") {
              notify_helper(TL_MAP[device_map[t[1]].toLowerCase()], "You just got home, alarm is DISARMED")
              domoticz_helper(3, "Off")
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

  if (topic === '$aws/things/alarm_status/shadow/update/documents') {
    current_alarm_state = message.current.state.reported.state
    current_alarm_full_status = message.current.state.reported
    // alarm state has changed
    if (message.previous.state.reported.state !== message.current.state.reported.state) {
      console.log(`Alarm state changed to ${message.current.state.reported.state}, it was ${message.previous.state.reported.state}`)
      notify_helper(GROUP_TELEGRAM_ID, `Alarm state changed to ${message.current.state.reported.state}, it was ${message.previous.state.reported.state}`)

      if (message.current.state.reported.state === "Disarm") {
        say_helper("kitchen", `Alarm is now disarmed`)
        domoticz_helper(3, "Off")
        domoticz_helper(51, "On")
      }
    }
  }
  if (topic === '$aws/things/alarm_zone_7/shadow/update/documents' && is_alarm_device_open(message.previous.state.reported) !== is_alarm_device_open(message.current.state.reported)) {
    console.log(JSON.stringify(message))
    console.log("garage door state changed, announcing alarm status")
    say_helper("garage", `Alarm is currently ${current_alarm_state}`)
  }

  // react to chatbot commands
  if ((t = mqttWildcard(topic, 'notify/out/+')) && t !== null) {
    // send acknowledgement back to user
    notify_helper(t[0].toString(), "ACK", null, true)

    message = message.toLowerCase()
    console.log(`Telegram user ${t[0]} just sent:"${message}"`)

    if (message === messages.unlock_door.toLowerCase())
      domoticz_helper(3, "Off")

    if (message === messages.doorbell_off.toLowerCase())
      domoticz_helper(195, "Off")

    if (message === messages.doorbell_on.toLowerCase())
      domoticz_helper(195, "On")

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
      send_camera_to('camera_external_driveway', t[0])

    if (message === messages.cam_garden.toLowerCase())
      send_camera_to('camera_external_garden', t[0])

  }

  // if (topic === "domoticz/out")
  //   client.publish(`zwave/${message.stype.toLowerCase()}/${message.idx}`, JSON.stringify(message), {retain: true})

  // someone at the door
  if (topic === "domoticz/out" && message.stype === "Switch" && message.idx === 155 && message.nvalue === 1) {
    console.log("door bell!")

    if (current_alarm_state !== "Away") {
      _.times(4, () => domoticz_helper(79, "Toggle"))
      say_helper("kitchen", "Someone at the door")
    }

    notify_helper(GROUP_TELEGRAM_ID, `Someone at the door`, [messages.unlock_door])

    send_camera_to('camera_external_driveway', GROUP_TELEGRAM_ID)

  }

  // zwave low battery alert
  if (topic === "domoticz/out" && message.Battery && message.Battery < 15)
    notify_helper(CHRIS_TELEGRAM_ID, `zwave device ${message.idx} ${message.name} is low on battery`)

})

const send_camera_to = (camera, who) => {
  let inst_uuid = uuid()
  return iotdata.getThingShadow({thingName: camera}).promise()
    .then(thing => JSON.parse(thing.payload).state.reported.jpg)

    .then(camera_url => request({uri: camera_url, encoding: null}))
    .then(body => s3.putObject({
      Body: body,
      Key: `${inst_uuid}.jpg`,
      ContentType: "image/jpeg",
      Bucket: 'me.cns.p.cams'
    }).promise())
    .then(() => s3.getSignedUrl('getObject', {Bucket: 'me.cns.p.cams', Key: `${inst_uuid}.jpg`}))
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
  arm_alarm_home: "Arm alarm home",
  arm_alarm_away: "Arm alarm away",
  disarm_alarm: "Disarm alarm",
  doorbell_off: "Doorbell off",
  doorbell_on: "Doorbell on",
  cam_driveway: "Get driveway camera",
  cam_garden: "Get garden camera"
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

const domoticz_helper = (idx, state) =>
  awsMqttClient.publish('domoticz/in', JSON.stringify({
    command: "switchlight",
    idx: idx,
    switchcmd: state
  }), {qos: 0})

const say_helper = (where, what) =>
  awsMqttClient.publish(`sonos/say/${where}`, JSON.stringify([what, getSayVolume()]), {qos: 0})

const getSayVolume = () => _.inRange(new Date().getHours(), 6, 18) ? 40 : 5

awsMqttClient.on('connect', () => console.log("aws connected"))
awsMqttClient.on('error', (error) => console.error("aws", error))
awsMqttClient.on('close', () => console.error("aws connection close"))
awsMqttClient.on('offline', () => console.log("aws offline"))