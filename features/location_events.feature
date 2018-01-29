Feature: Location based events


  Scenario: Chris leaves but does not set the alarm
    Given "cnsiphone" "leave" Home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Chris"

  Scenario: Hannah leaves but does not set the alarm
    Given "hnsiphone" "leave" Home
    When the alarm is "Disarm"
    Then a message reading "You left but did not set the alarm" is sent to "Hannah"

  Scenario: Chris arrives
    Given "cnsiphone" "enter" Home
    Then the "Kitchen" speaker says "Daddy is home"
    And the alarm state should be "Disarm"

  Scenario: Hannah arrives
    Given "hnsiphone" "enter" Home
    Then the "Kitchen" speaker says "Mummy is home"
    And the alarm state should be "Disarm"
