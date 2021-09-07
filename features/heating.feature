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

  Scenario: Away eco-mode
    Given the alarm state changes to "Away"
    Then the underfloor "Hallway heating" should be 10°C
    And the underfloor "Kitchen heating" should be 10°C
    And the underfloor "Dining Room heating" should be 10°C
    And the underfloor "Loft en-suite heating" should be 10°C
    And the underfloor "Family bathroom heating" should be 10°C

