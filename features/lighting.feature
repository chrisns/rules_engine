Feature: Lighting

  Scenario: Someone walks in to the kitchen and its dark
    Given there is movement is detected on the "Kitchen multisensor"
    And the "Kitchen multisensor" is reporting "user" - "Luminance" less than 20
    And the "Kitchen lights" is reporting "user" - "Level" less than 1
    Then the "Kitchen lights" user "Level" should be "10"
