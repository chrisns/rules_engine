Feature: Doorbell

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    And a "doorbell notification" backoff of 5 seconds
    Then a message reading "someone at the door" is sent to "everyone" with a button to "Unlock the door, Get porch camera, Get front camera, Get driveway camera"

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    Then a screengrab of the "Front camera" is sent to "everyone"

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    Then a screengrab of the "Porch camera" is sent to "everyone"

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    And a "doorbell" backoff of 5 seconds
    Then the "Utility room" speaker says "someone at the door"

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    And a "doorbell" backoff of 5 seconds
    Then the "Desk" speaker says "someone at the door"

  Scenario: Refresh the door look time
    Given cron "30 07 * * * *"
    Then the "front door lock" system "Refresh Date/Time" should be true
