const express = require('express')
const app = express()
const cors = require('cors')
const Prowl = require('node-prowl')
const rp = require('request-promise');

app.use(cors())

const {SUBSCRIBE, USER, PASS, MQTT, PROWL_KEY, VISONIC_URL, VISONIC_SECRET, DOOR_LOCK_URL} = process.env

const mqtt = require('mqtt')
const client = mqtt.connect(MQTT, {
  username: USER,
  password: PASS,

})

const prowl = new Prowl(PROWL_KEY);

client.on('connect', () => client.subscribe(SUBSCRIBE))

var response = []

client.on('message', function (topic, message) {
  const device = topic.split("/")[2]
  const payload = JSON.parse(message.toString())
  console.log(topic, payload)

  if (payload._type === "transition") {
    if (payload.desc === "Home") {
      prowl.push(`${device} just ${payload.event}`, 'Pinked', {
        priority: 2,
      }, (err, remaining) => {
        if (err) console.error(err)
      })
      if (payload.event === "enter") {
        rp({
          uri: `${VISONIC_URL}/disarm`,
          method: "POST",
          json: true,
          body: {
            secret: VISONIC_SECRET,
            partition: "P1"
          }
        })
        rp({
          uri: DOOR_LOCK_URL
        })
      }
    }
  }

  response.push(message.toString())

})

app.get('/', (req, res) => res.json(response))

app.listen(3002)