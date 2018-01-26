const Gherkin = require("gherkin")
const EventEmitter = require("events")

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter()

const {CucumberExpression, ParameterTypeRegistry,} = require("cucumber-expressions")
const parameterTypeRegistry = new ParameterTypeRegistry()

const parser = new Gherkin.Parser()

const gherkindoc = `Feature: Simple maths
  Scenario: Front door open
    Given The "front door" is opened
    And The alarm is "disarmed"
    Then The "Kitchen" speaker should say "door open"
`

const gherkinDocument = parser.parse(gherkindoc)
const pickles = new Gherkin.Compiler().compile(gherkinDocument)

const functions = [
  {
    match: new CucumberExpression("The {string} is opened", parameterTypeRegistry),
    func: (vars, event) => {
      console.log("f", vars, event)
      return true
    }
  },
  {
    match: new CucumberExpression("The alarm is {string}", parameterTypeRegistry),
    func: (vars, context) => {
      console.log("foo", vars, context)
    }
  },
]

const rules_add = (match, func) => functions.push({
  match: new CucumberExpression(match, parameterTypeRegistry),
  func: func
})

rules_add("The {string} speaker should say {string}", (vars, event) => {
  console.log("f", vars, event)
})

const picked = pickles.map(scenario => {
    scenario.steps.forEach(step => {
        functions.some(func => {
          const result = func.match.match(step.text)
          if (result) {
            return step.func = (event) => func.func(...result.map(v => v.getValue(null)), event)
          }
        })
        if (!step.func)
          throw `No defined step for ${step.text}`
      }
    )
    scenario.entry = (event) => {

    }
    return scenario
  }
)

const event = {
  topic: "say/foo",
  message: "aaaa"
}

const event_handler = (event) => {
  pickles.forEach(pickle => {
    pickle.steps[0].func(event)

  })
}

event_handler(event)
/*
 Process:
 Given always sets up an event listener, everything else is an async event
 If a step returns FALSE, subsequent ones are not followed
 */

describe("rules engine", () => {
  it("can pickle the cucumber", () => {

  })
})
