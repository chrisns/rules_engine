Feature: Doorbell

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    Then a screengrab of the "Driveway camera" is sent to "everyone"
    And  a screengrab of the "Porch camera" is sent to "everyone"
    And a message reading "someone at the door" is sent to "everyone" with a button to "Unlock the door"

  Scenario: Someone rings the doorbell
    Given the "doorbell" button is "pressed"
    When the alarm is not "Away"
    And the "Kitchen" speaker says "someone at the door"

  Scenario: Make the door lock temporarily noisy
    Given the "doorbell" button is "pressed"
    Then the "front door lock" config "Audio Mode" should be "High"
    Then a delay of 1 minutes
    Then the "front door lock" config "Audio Mode" should be "Silent"
