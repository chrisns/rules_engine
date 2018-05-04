Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    When the time is between "6am" and "5pm"
    And the alarm is not "Away"
    Then the underfloor "Hallway heating" should be 12°C
    And the underfloor "Kitchen heating" should be 20°C
    And the underfloor "Dining Room heating" should be 20°C

  Scenario: Nighttime setpoint
    Given a clock tic
    When the time is between "9pm" and "11:59pm"
    And the alarm is not "Away"
    Then the underfloor "Hallway heating" should be 12°C
    And the underfloor "Kitchen heating" should be 12°C
    And the underfloor "Dining Room heating" should be 12°C

  Scenario: Away eco-mode
    Given the alarm state changes to "Away"
    Then the underfloor "Hallway heating" should be 7°C
    And the underfloor "Kitchen heating" should be 7°C
    And the underfloor "Dining Room heating" should be 7°C
    Then the underfloor "Loft en-suite heating" should be 7°C

  Scenario: Loft en-suite morning
    Given a clock tic
    When the time is between "5am" and "9am"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 30°C

  Scenario: Loft en-suite day
    Given a clock tic
    When the time is between "9am" and "1pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 7°C

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
