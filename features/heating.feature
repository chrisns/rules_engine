Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "6am" and "5pm"
    Then the underfloor "Hallway heating" should be 12°C
    And the underfloor "Kitchen heating" should be 20°C
    And the underfloor "Dining Room heating" should be 20°C

  Scenario: Nighttime setpoint
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "9pm" and "11:59pm"
    Then the underfloor "Hallway heating" should be 12°C
    And the underfloor "Kitchen heating" should be 12°C
    And the underfloor "Dining Room heating" should be 12°C

  Scenario: Away eco-mode
    Given a clock tic
    When the alarm is "Away"
    Then the underfloor "Hallway heating" should be 7°C
    And the underfloor "Kitchen heating" should be 7°C
    And the underfloor "Dining Room heating" should be 7°C
    Then the underfloor "Loft en-suite heating" should be 7°C

  Scenario: Loft en-suite morning
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "5:30am" and "9am"
    Then the underfloor "Loft en-suite heating" should be 30°C

  Scenario: Loft en-suite day
    Given a clock tic
    When the alarm is not "Away"
    And the time is between "9am" and "1pm"
    Then the underfloor "Loft en-suite heating" should be 7°C
