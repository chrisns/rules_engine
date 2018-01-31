Feature: Zwave Log forwarding

  Scenario: Log forward
    Given a zwave log message is received
    Then the event is forwarded to "Chris"
