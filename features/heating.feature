Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "6am" and "5pm"
    Then the underfloor "Hallway heating" should be 21°C
    And the underfloor "Kitchen heating" should be 23°C
    And the underfloor "Dining Room heating" should be 25°C

  Scenario: Evening setpoint
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "5pm" and "9pm"
    Then the underfloor "Hallway heating" should be 22°C
    And the underfloor "Kitchen heating" should be 26°C
    And the underfloor "Dining Room heating" should be 26°C

  Scenario: Nighttime setpoint
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "9pm" and "11:59pm"
    Then the underfloor "Hallway heating" should be 16°C
    And the underfloor "Kitchen heating" should be 16°C
    And the underfloor "Dining Room heating" should be 16°C

  Scenario: Away eco-mode
    Given a clock tic
    When the alarm is "Away"
    Then the underfloor "Hallway heating" should be 12°C
    And the underfloor "Kitchen heating" should be 12°C
    And the underfloor "Dining Room heating" should be 12°C
