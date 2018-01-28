const rewire = require("rewire")
const rules = rewire("../rules")
const chai = require("chai")
const sinon = require("sinon")
chai.use(require("sinon-chai"))
const expect = chai.expect

const validGherkinDoc = `Feature: Simple maths
  Scenario: Front door open
    Given The "front door" is opened
    And The alarm is "disarmed"
    Then The "Kitchen" speaker should say "door open"
`

const addRules = () => {
  rules.rulesAdd("The {string} is opened", console.log)
  rules.rulesAdd("The alarm is {string}", console.log)
  rules.rulesAdd("The {string} speaker should say {string}", console.log)
}

describe("rules engine", () => {
  beforeEach(() => {
    rules.__set__("functions", [])
  })

  describe("makePickles", () => {
    const pickles = rules.__get__("makePickles")(validGherkinDoc)
    it("produce parse the gherkin and get the first step text", () =>
      expect(pickles[0].steps[0].text).to.eql("The \"front door\" is opened")
    )
  })

  describe("rulesAdd", () => {
    beforeEach(() => {
      rules.rulesAdd("The alarm is {string}", "mymethod")
    })
    it("should add a method to the functions db", () =>
      expect(rules.__get__("functions")[0].func).to.eql("mymethod")
    )
    it("should add generate regex of the match", () =>
      expect(rules.__get__("functions")[0].match._treeRegexp._re).to.eql(/^The alarm is ("([^"\\]*(\\.[^"\\]*)*)"|'([^'\\]*(\\.[^'\\]*)*)')$/)
    )
  })

  describe("pickleGherkinWithMethods", () => {

    describe("undefined functions", () => {
      const pickles = rules.__get__("makePickles")(validGherkinDoc)
      it("should throw an exception trying to pickle without having a matching function", () =>
        expect(() => rules.__get__("pickleGherkinWithMethods")(pickles)).to.throw("No defined step for The \"front door\" is opened")
      )
    })

    describe("fully defined functions", () => {
      const pickles = rules.__get__("makePickles")(validGherkinDoc)
      addRules()
      const pickledmethods = rules.__get__("pickleGherkinWithMethods")(pickles)
      it("should add a mapped function to the pickled scenarios", () =>
        expect(pickledmethods[0].steps[0].func).to.be.a("function")
      )
    })
  })

  describe("eventHandler", () => {
    const event = {
      topic: "some/thing",
      message: "somepayload"
    }
    it("should trigger the first handler")
    describe("trigger the first handler", () => {
      rules.eventHandler(event)
      it("should call the first", () =>
        expect("f").to.have.been.calledWith("ff"))
    })
  })
})


/*
@TODO
should handle steps returning a promise
if a step returns false (or eventually returns false) then don't proceed further
if a step returns truthy (or eventually truthy) then pass event on to the next step

 */
