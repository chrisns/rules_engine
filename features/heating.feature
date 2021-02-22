Feature: Heating schedule

  Scenario: Daytime setpoint
    Given cron "* 5-15 * * *"
    And the alarm is not "Away"
    And the alarm readiness is "ready"
    Then the underfloor "Hallway heating" should be 20°C
    And the underfloor "Kitchen heating" should be 24°C
    And the underfloor "Dining Room heating" should be 24°C

  Scenario: Evening setpoint
    Given cron "* 16-19 * * *"
    And the alarm is not "Away"
    And the alarm readiness is "ready"
    Then the underfloor "Hallway heating" should be 23°C
    And the underfloor "Kitchen heating" should be 26°C
    And the underfloor "Dining Room heating" should be 26°C

  Scenario: Nighttime setpoint
    Given cron "* 20-23 * * *"
    And the alarm is not "Away"
    And the alarm readiness is "ready"
    Then the underfloor "Hallway heating" should be 15°C
    And the underfloor "Kitchen heating" should be 16°C
    And the underfloor "Dining Room heating" should be 16°C

  Scenario: Open door eco-mode
    Given the alarm readiness changes to "not-ready"
    Then the underfloor "Hallway heating" should be 10°C
    And the underfloor "Kitchen heating" should be 10°C
    And the underfloor "Dining Room heating" should be 10°C
    And the nest thermostat mode is set to "off"

  Scenario: Away eco-mode
    Given the alarm state changes to "Away"
    Then the underfloor "Hallway heating" should be 10°C
    And the underfloor "Kitchen heating" should be 10°C
    And the underfloor "Dining Room heating" should be 10°C
    And the underfloor "Loft en-suite heating" should be 10°C
    And the underfloor "Family bathroom heating" should be 10°C
    And the nest thermostat mode is set to "off"

  Scenario: Normal Nest mode setting
    Given a clock tic
    And the alarm is not "Away"
    And the alarm readiness is "ready"
    Then the nest thermostat mode is set to "heat"

  Scenario: Loft en-suite morning week
    Given cron "* 5-8 * * 1-5"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 35°C

  Scenario: Loft en-suite morning weekend
    Given cron "* 8-10 * * 6,0"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 35°C

  Scenario: Loft en-suite day week
    Given cron "* 10-13 * * 1-5"
    Then the underfloor "Loft en-suite heating" should be 10°C

  Scenario: Loft en-suite day weekend
    Given cron "* 11-13 * * 6,0"
    Then the underfloor "Loft en-suite heating" should be 10°C

  Scenario: Loft en-suite bedtime
    Given cron "* 20-21 * * *"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 30°C

  Scenario: Loft en-suite after bedtime
    Given cron "* 22-23 * * *"
    Then the underfloor "Loft en-suite heating" should be 16°C

  Scenario: Family bathroom evening baths
    Given cron "* 15-17 * * *"
    And the alarm is not "Away"
    Then the underfloor "Family bathroom heating" should be 35°C
    And the "Family bathroom towel rail" user "Switch" should be on

  Scenario: Family bathroom nighttime
    Given cron "* 18-23 * * *"
    Then the underfloor "Family bathroom heating" should be 10°C
    And the "Family bathroom towel rail" user "Switch" should be off

  Scenario: Remind Hallway underfloor heating to use floor sensors
    Given the "Hallway heating" is reporting config "Temperature sensor" not "F  - Floor mode"
    Then the "Hallway heating" config "Temperature sensor" should be "F  - Floor mode"

  Scenario: Remind Kitchen underfloor heating to use floor sensors
    Given the "Kitchen heating" is reporting config "Temperature sensor" not "F  - Floor mode"
    Then the "Kitchen heating" config "Temperature sensor" should be "F  - Floor mode"

  Scenario: Remind Dining Room underfloor heating to use floor sensors
    Given the "Dining Room heating" is reporting config "Temperature sensor" not "F  - Floor mode"
    Then the "Dining Room heating" config "Temperature sensor" should be "F  - Floor mode"

  Scenario: Remind Loft en-suite underfloor heating to use floor sensors
    Given the "Loft en-suite heating" is reporting config "Temperature sensor" not "F  - Floor mode"
    Then the "Loft en-suite heating" config "Temperature sensor" should be "F  - Floor mode"

  Scenario: Remind Family bathroom heating underfloor heating to use floor sensors
    Given the "Family bathroom heating" is reporting config "Temperature sensor" not "F  - Floor mode"
    Then the "Family bathroom heating" config "Temperature sensor" should be "F  - Floor mode"
