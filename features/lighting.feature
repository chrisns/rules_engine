Feature: Lighting

  Scenario: Someone walks in to the kitchen and its dark
    Given there is movement is detected on the "Kitchen multisensor"
    And the "Kitchen multisensor" is reporting "user" - "Illuminance" less than 20
    And the "Kitchen lights" is reporting "user" - "Level" less than 25
    Then the "Kitchen lights" user "Level" should be "25"

  Scenario: Button is pushed on bathroom light switch once
    When the "Family bathroom lights" button 26 is pushed
    Then the "Bathroom leds" led strip should be toggled

  Scenario: noah button push
    Given the "Nodeon remote" is reporting user "Scene 2" "Pressed 1 Time"
    Then the "Kitchen" speaker says "Noah paging"
    Then the "Loft" speaker whispers "Noah paging"
