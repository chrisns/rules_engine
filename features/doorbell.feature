Feature: Doorbell

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    And a "doorbell notification" backoff of 5 seconds
    Then a message reading "someone at the door" is sent to "everyone" with a button to "Unlock the door"

  Scenario: Someone rings the doorbell
    Given the doorbell is pressed
    And a "doorbell" backoff of 5 seconds
    Then the "Loft" speaker says "someone at the door"
    Then the "Kitchen" speaker says "someone at the door"
