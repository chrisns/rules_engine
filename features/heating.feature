Feature: Heating schedule

  Scenario: Daytime setpoint
    Given a clock tic
    When the time is between "6am" and "5pm"
    And the alarm is not "Away"
    Then the underfloor "Hallway heating" should be 24°C
    And the underfloor "Kitchen heating" should be 24°C
    And the underfloor "Dining Room heating" should be 24°C

  Scenario: Evening setpoint
    Given a clock tic
    When the time is between "5pm" and "9pm"
    And the alarm is not "Away"
    Then the underfloor "Hallway heating" should be 26°C
    And the underfloor "Kitchen heating" should be 26°C
    And the underfloor "Dining Room heating" should be 28°C

  Scenario: Nighttime setpoint
    Given a clock tic
    When the time is between "9pm" and "11:59pm"
    And the alarm is not "Away"
    Then the underfloor "Hallway heating" should be 15°C
    And the underfloor "Kitchen heating" should be 16°C
    And the underfloor "Dining Room heating" should be 16°C

  Scenario: Away eco-mode
    Given the alarm state changes to "Away"
    Then the underfloor "Hallway heating" should be 10°C
    And the underfloor "Kitchen heating" should be 10°C
    And the underfloor "Dining Room heating" should be 10°C
    Then the underfloor "Loft en-suite heating" should be 10°C

  Scenario: Loft en-suite morning
    Given a clock tic
    When the time is between "5:30am" and "7am"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 35°C

  Scenario: Loft en-suite evening shower
    Given a clock tic
    When the time is between "4:30pm" and "6pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 35°C

  Scenario: Loft en-suite day
    Given a clock tic
    When the time is between "8am" and "1pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 14°C

  Scenario: Loft en-suite after evening shower
    Given a clock tic
    When the time is between "6pm" and "7pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 14°C

  Scenario: Loft en-suite bedtime
    Given a clock tic
    When the time is between "9pm" and "10pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 28°C

  Scenario: Loft en-suite after bedtime
    Given a clock tic
    When the time is between "10pm" and "11pm"
    And the alarm is not "Away"
    Then the underfloor "Loft en-suite heating" should be 16°C

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
