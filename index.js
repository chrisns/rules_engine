const express = require('express')
const app = express()
const cors = require('cors')
const Prowl = require('node-prowl')

app.use(cors())

const {SUBSCRIBE, USER, PASS, MQTT, PROWL_KEY} = process.env

const mqtt = require('mqtt')
const client = mqtt.connect(MQTT, {
  username: USER,
  password: PASS,

})

const prowl = Promise.promisifyAll(new Prowl(PROWL_KEY));

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
    }
  }

  console.log(message)
  response.push(message.toString())

})

app.get('/', (req, res) => res.json(response))

app.listen(3002)
