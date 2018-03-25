Feature: Location based events

  Scenario: Chris leaves but does not set the alarm
    Given "cnsiphone" "leave" Home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Chris"

  Scenario: Hannah leaves but does not set the alarm
    Given "hnsiphone" "leave" Home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Hannah"

  Scenario: Announce Chris arrives
    Given "cnsiphone" "enter" Home
    When the alarm is not "Away"
    Then the "Desk" speaker says "Daddy's home"
    And the "Kitchen" speaker says "Daddy's home"

  Scenario: Announce Hannah arrives
    Given "hnsiphone" "enter" Home
    When the alarm is not "Away"
    Then the "Kitchen" speaker says "Mummy's home"
    And the "Kitchen" speaker says "Daddy's home"

  Scenario: Chris arrives disarm alarm
    Given "cnsiphone" "enter" Home
    When the alarm is not "Disarm"
    And the alarm state should be "Disarm"

  Scenario: Hannah arrives disarm alarm
    Given "hnsiphone" "enter" Home
    When the alarm is not "Disarm"
    And the alarm state should be "Disarm"
