Feature: Lighting

  Scenario: Button is pushed on bathroom light switch once
    When the "Family bathroom lights" button 26 is pushed
    Then the "Bathroom leds" led strip should be toggled

  Scenario: noah button push
    Given the "Nodeon remote" is reporting user "Scene 2" "Pressed 1 Time"
    Then the "Kitchen" speaker says "Noah paging"
    Then the "Loft" speaker whispers "Noah paging"
