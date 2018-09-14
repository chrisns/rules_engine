Feature: Flood alarms

  Scenario: Flooding in the family bathroom notify Chris
    When the "Family bathroom flood sensor" "Sensor" is turned on
    Then a message reading "FLOODING IN FAMILY BATHROOM" is sent to "Chris"

  Scenario: Flooding in the family bathroom notify Hannah
    When the "Family bathroom flood sensor" "Sensor" is turned on
    Then a message reading "FLOODING IN FAMILY BATHROOM" is sent to "Hannah"

  Scenario: Flooding in the family bathroom announce
    When the "Family bathroom flood sensor" "Sensor" is turned on
    Then the "Kitchen" speaker says "Warning flooding detected in family bathroom"
    Then the "Bathroom" speaker says "Warning flooding detected in family bathroom"
    Then the "Loft" speaker says "Warning flooding detected in family bathroom"
    Then the "Lounge" speaker says "Warning flooding detected in family bathroom"
