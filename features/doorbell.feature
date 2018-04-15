Feature: Doorbell

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    Then a message reading "someone at the door" is sent to "everyone" with a button to "Unlock the door, Get porch camera, Get driveway camera"
    And  a screengrab of the "Porch camera" is sent to "everyone"
    And a screengrab of the "Driveway camera" is sent to "everyone"

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    Then the "Kitchen" speaker says "someone at the door"
    And the "Kitchen Front" speaker says "someone at the door"
    And the "Desk" speaker says "someone at the door"
    And the "Garage" speaker says "someone at the door"
    And the "Stairs" speaker says "someone at the door"
    And the "Loft" speaker says "someone at the door"
