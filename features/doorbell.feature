Feature: Doorbell

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    And a "doorbell notification" backoff of 5 seconds
    And the "Zwave eu controller" z-wave network is ready
    Then a message reading "someone at the door" is sent to "everyone" with a button to "Unlock the door, Get porch camera, Get front camera, Get driveway camera"

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    And the "Zwave eu controller" z-wave network is ready
    Then a screengrab of the "Front camera" is sent to "everyone"

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    And the "Zwave eu controller" z-wave network is ready
    Then a screengrab of the "Porch camera" is sent to "everyone"

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    And a "doorbell" backoff of 5 seconds
    And the "Zwave eu controller" z-wave network is ready
    Then the "Kitchen" speaker says "someone at the door"
    And the "Desk" speaker says "someone at the door"
    And the "Stairs" speaker says "someone at the door"
    And the "Loft" speaker says "someone at the door"


#    every 24hrs do { "desired": {"system": {"Refresh Date/Time": true}},
