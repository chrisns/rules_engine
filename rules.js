const Gherkin = require("gherkin")
const {CucumberExpression, ParameterTypeRegistry} = require("cucumber-expressions")
const parameterTypeRegistry = new ParameterTypeRegistry()
const parser = new Gherkin.Parser()

const functions = []
let pickedGherkin

const makePickles = gherkin => new Gherkin.Compiler().compile(parser.parse(gherkin))

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
    scenario.entry = async (...event) => {
      for (const step of scenario.steps)
        if (!await step.func(...event))
          break
    }
    return scenario
  }
)

const eventHandler = event => pickedGherkin.forEach(scenario => scenario.entry(event))

const pickleGherkin = gherkin => pickedGherkin = pickleGherkinWithMethods(makePickles(gherkin))

exports.rulesAdd = rulesAdd
exports.eventHandler = eventHandler
exports.pickleGherkin = pickleGherkin
