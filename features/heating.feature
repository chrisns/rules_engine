Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    And the time is between "6am" and "10pm"
    Then the "Hallway heating" should be 21°C
    And the underfloor "Kitchen heating" should be 22°C
    And the underfloor "Dining Room heating" should be 22°C

  Scenario: Nighttime setpoint
    Given a clock tic
    And the time is between "10pm" and "6am"
    Then the underfloor "Hallway heating" should be 16°C
    And the underfloor "Kitchen heating" should be 16°C
    And the underfloor "Dining Room heating" should be 16°C

  Scenario: Master bedroom daytime setpoint
    Given a clock tic
    And the time is between "8am" and "9pm"
    Then the "Master bedroom radiator" should be 16°C

  Scenario: Master bedroom nighttime setpoint
    Given a clock tic
    And the time is between "9pm" and "8am"
    Then the "Master bedroom radiator" should be 24°C
