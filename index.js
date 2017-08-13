const express = require('express')
const app = express()
const cors = require('cors')

app.use(cors())

const {THRESHOLD, LATITUDE, LONGTITUDE, SUBSCRIBE, USER, PASS, MQTT} = process.env

const mqtt = require('mqtt')
const geolib = require("geolib")
const client = mqtt.connect(MQTT, {
  username: USER,
  password: PASS,

})

const home = {latitude: LATITUDE, longitude: LONGTITUDE}

client.on('connect', () => client.subscribe(SUBSCRIBE))

var response = {}

client.on('message', function (topic, message) {
  let payload = JSON.parse(message.toString())

  let device = topic.split("/")[2]
  response.push(payload)

})

app.get('/', (req, res) => res.json(response))

app.listen(3002)