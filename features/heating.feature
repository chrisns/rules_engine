Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    And the time is between "6am" and "10pm"
    Then the "Hallway heating" should be 21°C
    And the "Kitchen heating" should be 22°C
    And the "Dining Room heating" should be 22°C

  Scenario: Nighttime setpoint
    Given a clock tic
    And the time is between "10pm" and "6am"
    Then the "Hallway heating" should be 16°C
    And the "Kitchen heating" should be 16°C
    And the "Dining Room heating" should be 16°C
