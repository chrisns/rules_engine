const Gherkin = require("gherkin")
// const EventEmitter = require("events")
//
// class MyEmitter extends EventEmitter {}

// const myEmitter = new MyEmitter()

const {CucumberExpression, ParameterTypeRegistry} = require("cucumber-expressions")
const parameterTypeRegistry = new ParameterTypeRegistry()

const parser = new Gherkin.Parser()

const makePickles = gherkin => new Gherkin.Compiler().compile(parser.parse(gherkin))

// const pickles = makePickles(gherkindoc)

const functions = []

const rulesAdd = (match, func) => functions.push({
  match: new CucumberExpression(match, parameterTypeRegistry),
  func: func
})

const pickleGherkinWithMethods = pickles => pickles.map(scenario => {
    scenario.steps.forEach(step => {
        functions.some(func => {
          const result = func.match.match(step.text)
          if (result)
            return step.func = (event) => func.func(...result.map(v => v.getValue(null)), event)
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

const eventHandler = event => {

}

// const event_handler = (event) =>
//   pickles.forEach(pickle =>
//     pickle.steps[0].func(event)
//   )

// event_handler(event)

// exports.pickleGherkinWithMethods = pickleGherkinWithMethods
exports.rulesAdd = rulesAdd
exports.eventHandler = eventHandler
